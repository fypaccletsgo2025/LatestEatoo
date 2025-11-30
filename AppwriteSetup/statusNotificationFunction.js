/**
 * Appwrite Function: Create a notification when a submission/request is approved or rejected.
 *
 * Deploy with:
 * - Runtime: Node 18+
 * - Triggers: database.* for user_submissions + restaurant_requests (update/create)
 *   e.g. databases.[DB_ID].collections.user_submissions.documents.*.update
 *        databases.[DB_ID].collections.restaurant_requests.documents.*.update
 * - Environment variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_API_KEY, APPWRITE_DB_ID
 *   Optional overrides: APPWRITE_SUBMISSIONS_COLLECTION, APPWRITE_REQUESTS_COLLECTION, APPWRITE_NOTIFICATIONS_COLLECTION
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');

const FINAL_STATUSES = new Set(['approved', 'rejected']);

const parseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return {};
  }
};

module.exports = async function (req, res) {
  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT,
    APPWRITE_API_KEY,
    APPWRITE_DB_ID,
    APPWRITE_SUBMISSIONS_COLLECTION = 'user_submissions',
    APPWRITE_REQUESTS_COLLECTION = 'restaurant_requests',
    APPWRITE_RESTAURANTS_COLLECTION = 'restaurants',
    APPWRITE_NOTIFICATIONS_COLLECTION = 'notifications',
  } = process.env;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY || !APPWRITE_DB_ID) {
    res.json({ ok: false, error: 'Missing Appwrite env vars.' });
    return;
  }

  const headers = (req && req.headers) || {};
  const eventHeader = headers['x-appwrite-event'] || headers['X-Appwrite-Event'] || '';
  const event = String(eventHeader || '').toLowerCase();
  const rawPayload = req?.payload ?? req?.body ?? {};
  const payload = parseJson(rawPayload);

  // Only handle DB document events
  if (!event || !payload?.$id) {
    res.json({ ok: true, skipped: 'non-db event' });
    return;
  }

  const collectionId = payload.$collectionId || payload.$collection || '';
  const status = String(payload.status || payload.state || '').toLowerCase();
  const restaurantName =
    payload.businessName || payload.name || payload.restaurantName || 'your restaurant';
  const reason =
    payload.reason || payload.rejectionReason || payload.rejection_reason || payload.note || '';
  // Capture submitter and owner separately; user submissions only notify the submitter
  const submitterId =
    payload.$createdBy ||
    payload.createdBy ||
    payload.created_by ||
    payload.userId ||
    payload.user_id ||
    payload.user?.$id ||
    payload.user?.id ||
    null;
  const ownerId = payload.ownerId || payload.owner_id || payload.owner || null;

  // Decide notification type based on collection
  let type = null;
  let effectiveStatus = status;

  if (collectionId === APPWRITE_SUBMISSIONS_COLLECTION || payload.type === 'user') {
    type = 'user_submission';
  } else if (collectionId === APPWRITE_REQUESTS_COLLECTION) {
    type = 'restaurant_request';
  } else if (collectionId === APPWRITE_RESTAURANTS_COLLECTION) {
    // If the doc is already moved into restaurants, assume approved
    type = 'restaurant_request';
    effectiveStatus = status || 'approved';
  } else if (payload.type === 'restaurant' || payload.type === 'owner') {
    type = 'restaurant_request';
  } else {
    res.json({ ok: true, skipped: 'other collection' });
    return;
  }

  if (!FINAL_STATUSES.has(effectiveStatus)) {
    res.json({ ok: true, skipped: 'status not final' });
    return;
  }

  // Build recipients:
  // - user_submission: notify submitter only (appreciation)
  // - restaurant_request: notify owner if provided, otherwise submitter
  const recipients = [];
  if (type === 'user_submission') {
    if (submitterId) recipients.push(submitterId);
  } else {
    if (ownerId) recipients.push(ownerId);
    else if (submitterId) recipients.push(submitterId);
  }

  const uniqueRecipients = Array.from(new Set(recipients.filter(Boolean)));

  if (!uniqueRecipients.length) {
    res.json({ ok: false, error: 'No userId/$createdBy on document.' });
    return;
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

  const db = new Databases(client);

  const approvedMessage =
    type === 'user_submission'
      ? `Thanks for recommending '${restaurantName}' — it's now live on Eatoo.`
      : 'Head to your Business Profile to start setting up your menu.';

  const message =
    effectiveStatus === 'approved'
      ? approvedMessage
      : `We apologize, but your request for '${restaurantName}' was rejected${
          reason ? `: ${reason}` : '.'
        }`;

  try {
    const created = [];

    for (const recipient of uniqueRecipients) {
      // Use deterministic ID per recipient+status to avoid duplicates
      const deterministicId = `${payload.$id}_${effectiveStatus}_${recipient}`;

      const permissions = [
        Permission.read(Role.user(recipient)),
        Permission.update(Role.user(recipient)),
        Permission.delete(Role.user(recipient)),
      ];

      const doc = await db.createDocument(
        APPWRITE_DB_ID,
        APPWRITE_NOTIFICATIONS_COLLECTION,
        deterministicId,
        {
          userId: recipient,
          type,
          payload: JSON.stringify({
            status: effectiveStatus,
            restaurantName,
            submissionId: type === 'user_submission' ? payload.$id : undefined,
            requestId: type === 'restaurant_request' ? payload.$id : undefined,
            reason,
            message,
            submittedBy: submitterId || undefined,
            ownerId: type === 'restaurant_request' ? ownerId || submitterId || undefined : undefined,
          }),
          read: false,
          createdAt: new Date().toISOString(),
        },
        permissions
      );
      created.push(deterministicId);
    }

    res.json({ ok: true, created, type, recipients: uniqueRecipients, status });
  } catch (err) {
    // Ignore conflict if the deterministic doc already exists
    const code = err?.code || err?.response?.code;
    if (code === 409) {
      res.json({ ok: true, skipped: 'notification already exists' });
      return;
    }
    console.error('Failed creating notification', err?.message || err);
    res.json({ ok: false, error: err?.message || 'Unknown error' });
  }
};
