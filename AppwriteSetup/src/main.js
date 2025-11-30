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

const { Client, Databases, ID } = require('node-appwrite');

const FINAL_STATUSES = new Set(['approved', 'rejected']);

const parseJson = (value) => {
  if (!value) return {};
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
    APPWRITE_NOTIFICATIONS_COLLECTION = 'notifications',
  } = process.env;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY || !APPWRITE_DB_ID) {
    res.json({ ok: false, error: 'Missing Appwrite env vars.' });
    return;
  }

  const event = String(req.headers['x-appwrite-event'] || '').toLowerCase();
  const payload = parseJson(req.payload || req.body);

  // Only handle DB document events
  if (!event || !payload?.$id) {
    res.json({ ok: true, skipped: 'non-db event' });
    return;
  }

  const collectionId = payload.$collectionId || payload.$collection || '';
  const status = String(payload.status || '').toLowerCase();
  const restaurantName =
    payload.businessName || payload.name || payload.restaurantName || 'your restaurant';
  const userId = payload.$createdBy || payload.userId || payload.ownerId || null;

  if (!FINAL_STATUSES.has(status)) {
    res.json({ ok: true, skipped: 'status not final' });
    return;
  }

  // Decide notification type based on collection
  let type = null;
  if (collectionId === APPWRITE_SUBMISSIONS_COLLECTION) {
    type = 'user_submission';
  } else if (collectionId === APPWRITE_REQUESTS_COLLECTION) {
    type = 'restaurant_request';
  } else {
    res.json({ ok: true, skipped: 'other collection' });
    return;
  }

  if (!userId) {
    res.json({ ok: false, error: 'No userId/$createdBy on document.' });
    return;
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

  const db = new Databases(client);

  // Use deterministic ID per status to avoid duplicate notifications for repeated updates
  const deterministicId = `${payload.$id}_${status}`;

  try {
    await db.createDocument(APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_COLLECTION, deterministicId, {
      userId,
      type,
      payload: JSON.stringify({
        status,
        restaurantName,
        submissionId: type === 'user_submission' ? payload.$id : undefined,
        requestId: type === 'restaurant_request' ? payload.$id : undefined,
      }),
      read: false,
      createdAt: new Date().toISOString(),
    });
    res.json({ ok: true, created: deterministicId, type, userId, status });
  } catch (err) {
    // Ignore conflict if the deterministic doc already exists
    const code = err?.code || err?.response?.code;
    if (code === 409) {
      res.json({ ok: true, skipped: 'notification already exists', id: deterministicId });
      return;
    }
    console.error('Failed creating notification', err?.message || err);
    res.json({ ok: false, error: err?.message || 'Unknown error' });
  }
};
