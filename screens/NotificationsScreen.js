// screens/NotificationsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { sampleInviteFoodlist } from '../data/mockData';
import { getFoodlists, updateFoodlists } from '../state/foodlistsStore';

const BRAND = {
  primary: '#FF4D00',
  accent: '#FDAA48',
  bg: '#FFF5ED',
  card: '#FFFFFF',
  line: '#FFE3C6',
  ink: '#1F2937',
  inkMuted: '#6B7280',
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      type: 'invite',
      title: 'Foodlist Invite',
      body: `Aida wants to share a foodlist with you: '${sampleInviteFoodlist.name}'`,
      read: false,
      time: '2m ago',
      payload: { list: sampleInviteFoodlist, inviter: 'Aida' },
    },
    {
      id: 'n2',
      type: 'system',
      title: 'Welcome to Eatoo',
      body: 'Thanks for trying the app!',
      read: true,
      time: 'Yesterday',
    },
  ]);

  const markRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => setNotifications([]);

  const acceptInvite = (note) => {
    const list = note?.payload?.list;
    const inviter = note?.payload?.inviter;
    if (!list) return;

    const current = getFoodlists();
    const already = current.some((l) => l.name === list.name);
    const baseCollaborators = Array.isArray(list.collaborators) ? list.collaborators : [];
    const collaborators =
      inviter &&
      !baseCollaborators.some(
        (m) => String(m).toLowerCase() === String(inviter).toLowerCase()
      )
        ? [...baseCollaborators, inviter]
        : baseCollaborators;

    const newList = { ...list, id: String(Date.now()), collaborators };
    if (!already) updateFoodlists((prev) => [...prev, newList]);
    setNotifications((prev) => prev.filter((n) => n.id !== note.id));
  };

  const declineInvite = (note) =>
    setNotifications((prev) => prev.filter((n) => n.id !== note.id));

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BRAND.bg }}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            Stay up to date with invites, updates, and announcements.
          </Text>
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        {notifications.length === 0 ? (
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
              item.type === 'invite' ? (
                <InviteCard
                  note={item}
                  onAccept={() => acceptInvite(item)}
                  onDecline={() => declineInvite(item)}
                />
              ) : (
                <SystemCard note={item} onPress={() => markRead(item.id)} />
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#FFEBD8', fontSize: 14, lineHeight: 20 },
  clearBtn: {
    backgroundColor: '#FFEFE2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFC9A3',
  },
  clearText: { color: BRAND.primary, fontWeight: '700', fontSize: 13 },
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: { color: BRAND.ink, fontWeight: '800', fontSize: 16 },
  emptyBody: { color: BRAND.inkMuted, textAlign: 'center', lineHeight: 20 },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: BRAND.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  inviteTitle: { color: BRAND.ink, fontWeight: '800', fontSize: 15 },
  inviteBody: { color: BRAND.inkMuted, marginTop: 6, lineHeight: 20, fontSize: 13 },
  timeText: { color: '#9CA3AF', marginTop: 8, fontSize: 12 },
  actionRow: { gap: 10 },
  declineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFB4A6',
    backgroundColor: '#FFF5F4',
  },
  declineText: { color: '#D73717', fontWeight: '700', fontSize: 12 },
  acceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#60D39A',
    backgroundColor: '#E6FFF2',
  },
  acceptText: { color: '#0F9158', fontWeight: '700', fontSize: 12 },
  systemCard: {
    backgroundColor: BRAND.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  systemTitle: { color: BRAND.ink, fontWeight: '800', fontSize: 15 },
  systemBody: { color: BRAND.inkMuted, marginTop: 6, lineHeight: 20, fontSize: 13 },
});
