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

// Helper to generate notification title
const generateTitle = (doc) => {
  if (doc.type === 'invite') return 'Foodlist Invite';
  if (doc.type === 'user_submission') return 'Your Recommendation Status';
  if (doc.type === 'restaurant_request') return 'Restaurant Request Status';
  return 'Notification';
};

// Helper to generate notification body
const generateBody = (doc) => {
  const payload = doc.payload || {};
  if (doc.type === 'invite') return `${payload.inviter} wants to share a foodlist with you: '${payload.list?.name}'`;
  if (doc.type === 'user_submission') return `Your recommendation for '${payload.restaurantName}' was ${payload.status}.`;
  if (doc.type === 'restaurant_request') return `Your restaurant request '${payload.restaurantName}' was ${payload.status}.`;
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

const mapAppwriteNotification = (doc) =>
  buildNotificationEntry({
    id: `${NOTIF_SOURCES.APPWRITE}:${doc.$id}`,
    documentId: doc.$id,
    source: NOTIF_SOURCES.APPWRITE,
    type: doc.type || 'system',
    payload: doc.payload || {},
    read: Boolean(doc.read),
    timestamp: doc.createdAt || doc.$createdAt || doc.$updatedAt,
  });

const mapSubmissionNotification = (doc) => {
  const status = String(doc.status || '').toLowerCase();
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
  const status = String(doc.status || '').toLowerCase();
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
    if (!userReady) return;
    let cancelled = false;
    async function loadNotifications() {
      try {
        setLoading(true);
        setLoadError('');
        await ensureSession();
        const [docs, submissions, requests] = await Promise.all([
          db.listDocuments(DB_ID, COLLECTION_ID, [Query.orderDesc('$createdAt'), Query.limit(50)]),
          db.listDocuments(DB_ID, COL.userSubmissions, [Query.orderDesc('$updatedAt'), Query.limit(50)]),
          db.listDocuments(DB_ID, COL.restaurantRequests, [Query.orderDesc('$updatedAt'), Query.limit(50)]),
        ]);

        if (cancelled) return;

        const inviteEntries = docs.documents.map(mapAppwriteNotification).filter(Boolean);
        const submissionEntries = currentUserId
          ? submissions.documents
              .filter((doc) => doc.$createdBy === currentUserId)
              .map(mapSubmissionNotification)
              .filter(Boolean)
          : [];
        const requestEntries = currentUserId
          ? requests.documents
              .filter((doc) => doc.$createdBy === currentUserId)
              .map(mapRestaurantRequestNotification)
              .filter(Boolean)
          : [];
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
    if (!userReady) return () => {};
    const unsubscribeNotifications = client.subscribe(
      `databases.${DB_ID}.collections.${COLLECTION_ID}.documents`,
      (response) => {
        const doc = response.payload;
        if (!doc?.$id) return;
        const events = response.events || [];
        const entryId = `${NOTIF_SOURCES.APPWRITE}:${doc.$id}`;
        if (events.some((evt) => evt.endsWith('.delete'))) {
          removeNotificationById(entryId);
          return;
        }
        mergeNotification(mapAppwriteNotification(doc));
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
            if (doc.$createdBy !== currentUserId) return;
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
            if (doc.$createdBy !== currentUserId) return;
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
    const list = note.payload?.list;
    const inviter = note.payload?.inviter;
    if (!list) return;

    try {
      await db.updateDocument(DB_ID, COLLECTION_ID, note.documentId, {
        payload: { ...note.payload, status: 'accepted' },
      });

      const current = getFoodlists();
      const already = current.some((l) => l.name === list.name);
      const collaborators = inviter && !list.collaborators?.includes(inviter)
        ? [...(list.collaborators || []), inviter]
        : list.collaborators;

      if (!already) updateFoodlists((prev) => [...prev, { ...list, id: String(Date.now()), collaborators }]);
      setNotifications((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  };

  // Decline invite
  const declineInvite = async (note) => {
    if (!note || note.source !== NOTIF_SOURCES.APPWRITE) return;
    try {
      await db.updateDocument(DB_ID, COLLECTION_ID, note.documentId, {
        payload: { ...note.payload, status: 'declined' },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      console.error('Failed to decline invite:', err);
    }
  };

  const clearableCount = useMemo(
    () => notifications.filter((note) => note.source === NOTIF_SOURCES.APPWRITE).length,
    [notifications]
  );

  // Clear invite notifications (mark read remotely)
  const clearAll = async () => {
    const inviteNotes = notifications.filter((note) => note.source === NOTIF_SOURCES.APPWRITE);
    if (!inviteNotes.length) return;
    setNotifications((prev) => prev.filter((note) => note.source !== NOTIF_SOURCES.APPWRITE));
    try {
      await Promise.all(
        inviteNotes.map((note) =>
          db.updateDocument(DB_ID, COLLECTION_ID, note.documentId, { read: true })
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
