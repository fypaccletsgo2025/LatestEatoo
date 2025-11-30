// screens/NotificationsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Query } from 'appwrite';
import BackButton from '../components/BackButton';
import { getFoodlists, updateFoodlists } from '../state/foodlistsStore';
import { client, db, DB_ID, COL, account, ensureSession } from '../appwrite';
import { formatTimeAgo } from '../utils/timeUtils';
import { createNotification } from '../services/notificationsService';

const BRAND = {
  primary: '#FF4D00',
  accent: '#FDAA48',
  bg: '#FFF5ED',
  card: '#FFFFFF',
  line: '#FFE3C6',
  ink: '#1F2937',
  inkMuted: '#6B7280',
};

const COLLECTION_ID = 'notifications';
const NOTIF_SOURCES = {
  APPWRITE: 'appwrite',
  USER_SUBMISSION: 'user_submission',
  RESTAURANT_REQUEST: 'restaurant_request',
};
const FINAL_STATUSES = new Set(['approved', 'rejected']);
const getOwnerId = (doc = {}) =>
  doc.$createdBy ||
  doc.userId ||
  doc.user_id ||
  doc.user?.$id ||
  doc.user?.id ||
  doc.ownerId ||
  doc.owner_id ||
  null;
const getSubmitterId = (doc = {}) =>
  doc.submittedBy ||
  doc.submitted_by ||
  doc.submitterId ||
  doc.submitter_id ||
  doc.recommenderId ||
  doc.recommender_id ||
  doc.userId ||
  doc.user_id ||
  doc.$createdBy ||
  doc.user?.$id ||
  doc.user?.id ||
  null;
const shouldNotifyUser = (doc, userId) => {
  if (!userId) return false;
  const owner = getOwnerId(doc);
  const submitter = getSubmitterId(doc);
  return owner === userId || submitter === userId;
};

// Helper to generate notification title
const generateTitle = (doc) => {
  const status = String(doc?.payload?.status || '').toLowerCase();
  if (doc.type === 'invite') return 'Foodlist Invite';
  if (doc.type === 'invite_response') return 'Invite Response';
  if (doc.type === 'member_update') return 'Foodlist Update';
  if (doc.type === 'user_submission') {
    if (status === 'approved') return 'The restaurant you submitted is now on Eatoo';
    return 'Your Recommendation Status';
  }
  if (doc.type === 'restaurant_request') {
    if (status === 'approved') return 'Your restaurant is now live with Eatoo';
    return 'Restaurant Request Status';
  }
  return 'Notification';
};

// Helper to generate notification body
const parseNotificationPayload = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return {};
};

const generateBody = (doc) => {
  const payload = parseNotificationPayload(doc.payload);
  if (doc.type === 'invite') {
    const listName = payload.list?.name || 'this foodlist';
    const inviter = payload.inviter || 'Someone';
    return `${inviter} wants to share a foodlist with you: '${listName}'`;
  }
  if (doc.type === 'invite_response') {
    const listName = payload.list?.name || 'your foodlist';
    const responder = payload.responderName || 'Someone';
    const status = payload.status || 'responded';
    return `${responder} ${status} your invite for '${listName}'.`;
  }
  if (doc.type === 'member_update') {
    const listName = payload.list?.name || 'the foodlist';
    const memberName = payload.memberName || 'A member';
    const wasKicked = payload.action === 'kicked';
    const actor =
      payload.actorName && wasKicked ? ` by ${payload.actorName}` : '';
    const verb = wasKicked ? 'was removed from a foodlist' : 'left a foodlist';
    return `${memberName} ${verb} '${listName}'${actor}.`;
  }
  if (doc.type === 'user_submission') {
    if (payload.message) return payload.message;
    if (String(payload.status || '').toLowerCase() === 'approved') {
      return `Thanks for recommending '${payload.restaurantName}' — it's now live on Eatoo.`;
    }
    return `Your recommendation for '${payload.restaurantName}' was ${payload.status}.`;
  }
  if (doc.type === 'restaurant_request') {
    if (payload.message) return payload.message;
    if (String(payload.status || '').toLowerCase() === 'approved') {
      return 'Head to your Business Profile to start setting up your menu.';
    }
    return `Your restaurant request '${payload.restaurantName}' was ${payload.status}.`;
  }
  return '';
};

const sortNotificationsDesc = (entries) =>
  [...entries].sort((a, b) => {
    const timeA = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
    const timeB = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
    return timeB - timeA;
  });

const buildNotificationEntry = ({
  id,
  documentId,
  source,
  type,
  payload,
  read = false,
  timestamp,
}) => {
  const createdAt = timestamp || new Date().toISOString();
  const baseDoc = { type, payload };
  return {
    id,
    documentId,
    source,
    type,
    payload,
    read,
    createdAt,
    updatedAt: createdAt,
    time: formatTimeAgo(createdAt),
    title: generateTitle(baseDoc),
    body: generateBody(baseDoc),
  };
};

const mapAppwriteNotification = (doc) => {
  const payload = parseNotificationPayload(doc?.payload);
  const status = String(payload?.status || '').toLowerCase();
  if (doc.type === 'invite' && status && status !== 'pending') {
    return null;
  }
  return buildNotificationEntry({
    id: `${NOTIF_SOURCES.APPWRITE}:${doc.$id}`,
    documentId: doc.$id,
    source: NOTIF_SOURCES.APPWRITE,
    type: doc.type || 'system',
    payload,
    read: Boolean(doc.read),
    timestamp: doc.createdAt || doc.$createdAt || doc.$updatedAt,
  });
};

const mapSubmissionNotification = (doc) => {
  const status = String(doc.status || doc.state || '').toLowerCase();
  if (!FINAL_STATUSES.has(status)) return null;
  const restaurantName = doc.name || doc.restaurantName || doc.businessName || 'your restaurant';
  return buildNotificationEntry({
    id: `${NOTIF_SOURCES.USER_SUBMISSION}:${doc.$id}`,
    documentId: doc.$id,
    source: NOTIF_SOURCES.USER_SUBMISSION,
    type: 'user_submission',
    payload: {
      restaurantName,
      status,
      submissionId: doc.$id,
    },
    read: false,
    timestamp: doc.$updatedAt || doc.$createdAt || doc.createdAt,
  });
};

const mapRestaurantRequestNotification = (doc) => {
  const status = String(doc.status || doc.state || '').toLowerCase();
  if (!FINAL_STATUSES.has(status)) return null;
  const restaurantName = doc.businessName || doc.name || doc.restaurantName || 'your request';
  return buildNotificationEntry({
    id: `${NOTIF_SOURCES.RESTAURANT_REQUEST}:${doc.$id}`,
    documentId: doc.$id,
    source: NOTIF_SOURCES.RESTAURANT_REQUEST,
    type: 'restaurant_request',
    payload: {
      restaurantName,
      status,
      requestId: doc.$id,
    },
    read: false,
    timestamp: doc.$updatedAt || doc.$createdAt || doc.createdAt,
  });
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userReady, setUserReady] = useState(false);

  const currentUserId = currentUser?.$id || null;

  // Load account info
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        await ensureSession();
        const profile = await account.get();
        if (!cancelled) {
          setCurrentUser(profile);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setUserReady(true);
        }
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const mergeNotification = (entry) => {
    if (!entry) return;
    setNotifications((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id);
      return sortNotificationsDesc([entry, ...filtered]);
    });
  };

  const removeNotificationById = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  // Fetch initial notifications
  useEffect(() => {
    if (!userReady || !currentUserId) return;
    let cancelled = false;
    async function loadNotifications() {
      try {
        setLoading(true);
        setLoadError('');
        await ensureSession();
        const notificationQueries = [Query.orderDesc('$createdAt'), Query.limit(50)];
        const [docs, submissions, requests] = await Promise.all([
          db.listDocuments(DB_ID, COLLECTION_ID, notificationQueries),
          db.listDocuments(DB_ID, COL.userSubmissions, [Query.orderDesc('$updatedAt'), Query.limit(50)]),
          db.listDocuments(DB_ID, COL.restaurantRequests, [Query.orderDesc('$updatedAt'), Query.limit(50)]),
        ]);

        if (cancelled) return;

        const unreadDocs = docs.documents.filter((doc) => !doc.read);
        if (unreadDocs.length) {
          try {
            await Promise.all(
              unreadDocs.map((doc) =>
                db.updateDocument(DB_ID, COLLECTION_ID, doc.$id, { read: true })
              )
            );
          } catch (markErr) {
            console.warn('Failed to auto-mark notifications as read', markErr?.message || markErr);
          }
        }

        const inviteEntries = docs.documents
          .filter((doc) => !doc.userId || doc.userId === currentUserId)
          .map(mapAppwriteNotification)
          .filter(Boolean);
        const submissionEntries = submissions.documents
          .filter((doc) => shouldNotifyUser(doc, currentUserId))
          .map(mapSubmissionNotification)
          .filter(Boolean);
        const requestEntries = requests.documents
          .filter((doc) => shouldNotifyUser(doc, currentUserId))
          .map(mapRestaurantRequestNotification)
          .filter(Boolean);
        setNotifications(sortNotificationsDesc([...inviteEntries, ...submissionEntries, ...requestEntries]));
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        if (!cancelled) {
          setLoadError(err?.message || 'Failed to load notifications.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, userReady]);

  // Real-time subscription
  useEffect(() => {
    if (!userReady || !currentUserId) return () => {};
    const unsubscribeNotifications = client.subscribe(
      `databases.${DB_ID}.collections.${COLLECTION_ID}.documents`,
      (response) => {
        const doc = response.payload;
        if (!doc?.$id) return;
        if (doc.userId && doc.userId !== currentUserId) return;
        const events = response.events || [];
        const entryId = `${NOTIF_SOURCES.APPWRITE}:${doc.$id}`;
        if (events.some((evt) => evt.endsWith('.delete'))) {
          removeNotificationById(entryId);
          return;
        }
        const mapped = mapAppwriteNotification(doc);
        if (!mapped) {
          removeNotificationById(entryId);
          return;
        }
        mergeNotification(mapped);
      }
    );

    const unsubs = [unsubscribeNotifications];

    if (currentUserId) {
      unsubs.push(
        client.subscribe(
          `databases.${DB_ID}.collections.${COL.userSubmissions}.documents`,
          (response) => {
            const doc = response.payload;
            if (!doc?.$id) return;
            if (!shouldNotifyUser(doc, currentUserId)) return;
            const events = response.events || [];
            const entryId = `${NOTIF_SOURCES.USER_SUBMISSION}:${doc.$id}`;
            if (events.some((evt) => evt.endsWith('.delete'))) {
              removeNotificationById(entryId);
              return;
            }
            const mapped = mapSubmissionNotification(doc);
            if (!mapped) {
              removeNotificationById(entryId);
              return;
            }
            mergeNotification(mapped);
          }
        )
      );

      unsubs.push(
        client.subscribe(
          `databases.${DB_ID}.collections.${COL.restaurantRequests}.documents`,
          (response) => {
            const doc = response.payload;
            if (!doc?.$id) return;
            if (!shouldNotifyUser(doc, currentUserId)) return;
            const events = response.events || [];
            const entryId = `${NOTIF_SOURCES.RESTAURANT_REQUEST}:${doc.$id}`;
            if (events.some((evt) => evt.endsWith('.delete'))) {
              removeNotificationById(entryId);
              return;
            }
            const mapped = mapRestaurantRequestNotification(doc);
            if (!mapped) {
              removeNotificationById(entryId);
              return;
            }
            mergeNotification(mapped);
          }
        )
      );
    }

    return () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          /* noop */
        }
      });
    };
  }, [currentUserId, userReady]);

  // Mark as read
  const markRead = async (note) => {
    if (!note) return;
    if (note.source !== NOTIF_SOURCES.APPWRITE) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, read: true } : n))
      );
      return;
    }
    try {
      await db.updateDocument(DB_ID, COLLECTION_ID, note.documentId, { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  // Accept invite
  const acceptInvite = async (note) => {
    if (!note || note.source !== NOTIF_SOURCES.APPWRITE) return;
    const payload = note.payload || {};
    const listId = payload.list?.id;
    if (!listId || !currentUserId) return;

    try {
      await ensureSession();
      const listDoc = await db.getDocument(DB_ID, COL.foodlists, listId);
      const collaborators = Array.isArray(listDoc.collaborators)
        ? listDoc.collaborators.filter(Boolean)
        : [];
      if (!collaborators.includes(currentUserId)) {
        collaborators.push(currentUserId);
        await db.updateDocument(DB_ID, COL.foodlists, listId, {
          collaborators,
        });
      }
      updateFoodlists((prev) =>
        prev.some((item) => (item.$id || item.id) === listId)
          ? prev.map((item) =>
              (item.$id || item.id) === listId
                ? { ...item, collaborators }
                : item
            )
          : [{ ...listDoc, collaborators }, ...prev]
      );

      await db.updateDocument(DB_ID, COLLECTION_ID, note.documentId, {
        payload: JSON.stringify({ ...payload, status: 'accepted' }),
        read: true,
      });
      setNotifications((prev) => prev.filter((n) => n.id !== note.id));
      const ownerTargetId = payload.ownerId || payload.inviterId || null;
      if (ownerTargetId) {
        const responderName =
          currentUser?.name ||
          currentUser?.prefs?.displayName ||
          currentUser?.email ||
          'Someone';
        try {
          await createNotification({
            userId: ownerTargetId,
            type: 'invite_response',
            payload: {
              list: payload.list,
              status: 'accepted',
              responderId: currentUserId,
              responderName,
            },
            read: false,
          });
        } catch (notifyErr) {
          console.warn(
            'Failed to notify owner about acceptance',
            notifyErr?.message || notifyErr
          );
        }
      }
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  };

  // Decline invite
  const declineInvite = async (note) => {
    if (!note || note.source !== NOTIF_SOURCES.APPWRITE) return;
    const payload = note.payload || {};
    try {
      await db.updateDocument(DB_ID, COLLECTION_ID, note.documentId, {
        payload: JSON.stringify({ ...payload, status: 'declined' }),
        read: true,
      });
      setNotifications((prev) => prev.filter((n) => n.id !== note.id));
      const ownerTargetId = payload.ownerId || payload.inviterId || null;
      if (ownerTargetId) {
        const responderName =
          currentUser?.name ||
          currentUser?.prefs?.displayName ||
          currentUser?.email ||
          'Someone';
        try {
          await createNotification({
            userId: ownerTargetId,
            type: 'invite_response',
            payload: {
              list: payload.list,
              status: 'declined',
              responderId: currentUserId,
              responderName,
            },
            read: false,
          });
        } catch (notifyErr) {
          console.warn(
            'Failed to notify owner about decline',
            notifyErr?.message || notifyErr
          );
        }
      }
    } catch (err) {
      console.error('Failed to decline invite:', err);
    }
  };

  const clearableCount = useMemo(
    () => notifications.length,
    [notifications]
  );

  // Clear invite notifications (mark read remotely)
  const clearAll = async () => {
    if (!notifications.length) return;
    const appwriteNotes = notifications.filter((note) => note.source === NOTIF_SOURCES.APPWRITE);
    setNotifications([]);
    try {
      await Promise.all(
        appwriteNotes.map((note) =>
          db.deleteDocument(DB_ID, COLLECTION_ID, note.documentId)
        )
      );
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bg }} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            Stay up to date with invites, restaurant approvals, and announcements.
          </Text>
        </View>
        {clearableCount > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        {loadError ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Unable to load notifications</Text>
            <Text style={styles.emptyBody}>{loadError}</Text>
          </View>
        ) : loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={BRAND.primary} size="small" />
            <Text style={styles.emptyBody}>Loading the latest activity...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptyBody}>
              We'll let you know when there's something new.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 20, gap: 14 }}
            renderItem={({ item }) =>
              item.type === 'invite' && item.source === NOTIF_SOURCES.APPWRITE ? (
                <InviteCard
                  note={item}
                  onAccept={() => acceptInvite(item)}
                  onDecline={() => declineInvite(item)}
                />
              ) : (
                <SystemCard note={item} onPress={() => markRead(item)} />
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// InviteCard
function InviteCard({ note, onAccept, onDecline }) {
  return (
    <View style={styles.inviteCard}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.inviteTitle}>{note.title}</Text>
        <Text style={styles.inviteBody}>{note.body}</Text>
        <Text style={styles.timeText}>{note.time}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onDecline} style={styles.declineBtn}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAccept} style={styles.acceptBtn}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// SystemCard
function SystemCard({ note, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.systemCard, note.read && { opacity: 0.7 }]}
    >
      <Text style={styles.systemTitle}>{note.title}</Text>
      <Text style={styles.systemBody}>{note.body}</Text>
      <Text style={styles.timeText}>{note.time}</Text>
    </TouchableOpacity>
  );
}

// Styles (same as before)
const styles = StyleSheet.create({
  header: { backgroundColor: BRAND.primary, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 26, flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#FFEBD8', fontSize: 14, lineHeight: 20 },
  clearBtn: { backgroundColor: '#FFEFE2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#FFC9A3' },
  clearText: { color: BRAND.primary, fontWeight: '700', fontSize: 13 },
  container: { flex: 1, backgroundColor: BRAND.bg, paddingHorizontal: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { color: BRAND.ink, fontWeight: '800', fontSize: 16 },
  emptyBody: { color: BRAND.inkMuted, textAlign: 'center', lineHeight: 20 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: BRAND.card, borderRadius: 18, borderWidth: 1, borderColor: BRAND.line, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 12 },
  inviteTitle: { color: BRAND.ink, fontWeight: '800', fontSize: 15 },
  inviteBody: { color: BRAND.inkMuted, marginTop: 6, lineHeight: 20, fontSize: 13 },
  timeText: { color: '#9CA3AF', marginTop: 8, fontSize: 12 },
  actionRow: { gap: 10 },
  declineBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#FFB4A6', backgroundColor: '#FFF5F4' },
  declineText: { color: '#D73717', fontWeight: '700', fontSize: 12 },
  acceptBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#60D39A', backgroundColor: '#E6FFF2' },
  acceptText: { color: '#0F9158', fontWeight: '700', fontSize: 12 },
  systemCard: { backgroundColor: BRAND.card, borderRadius: 18, borderWidth: 1, borderColor: BRAND.line, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  systemTitle: { color: BRAND.ink, fontWeight: '800', fontSize: 15 },
  systemBody: { color: BRAND.inkMuted, marginTop: 6, lineHeight: 20, fontSize: 13 },
});
