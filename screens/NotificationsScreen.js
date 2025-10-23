// screens/NotificationsScreen.js

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { sampleInviteFoodlist } from '../data/mockData';
import { getFoodlists, updateFoodlists } from '../state/foodlistsStore';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([
    { id: 'n1', type: 'invite', title: 'Foodlist Invite', body: `Aida wants to share a foodlist with you: '${sampleInviteFoodlist.name}'`, read: false, time: '2m ago', payload: { list: sampleInviteFoodlist, inviter: 'Aida' } },
    { id: 'n2', type: 'system', title: 'Welcome to Eatoo', body: 'Thanks for trying the app!', read: true, time: 'Yesterday' },
  ]);

  const markRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAll = () => setNotifications([]);

  const acceptInvite = (note) => {
    const list = note?.payload?.list;
    const inviter = note?.payload?.inviter;
    if (!list) return;
    const current = getFoodlists();
    const already = current.some((l) => l.name === list.name);
    const baseMembers = Array.isArray(list.members) ? list.members : [];
    const members = inviter && !baseMembers.some(m => String(m).toLowerCase() === String(inviter).toLowerCase())
      ? [...baseMembers, inviter]
      : baseMembers;
    const newList = { ...list, id: String(Date.now()), members };
    if (!already) updateFoodlists(prev => [...prev, newList]);
    setNotifications((prev) => prev.filter((n) => n.id !== note.id));
  };

  const declineInvite = (note) => setNotifications(prev => prev.filter(n => n.id !== note.id));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* No notifications */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            item.type === 'invite' ? (
              <View style={styles.inviteCard}>
                <View style={styles.inviteRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.inviteTitle}>{item.title}</Text>
                    <Text style={styles.inviteBody}>{item.body}</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => declineInvite(item)} style={styles.declineBtn}>
                      <Text style={styles.declineIcon}>X</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => acceptInvite(item)} style={styles.acceptBtn}>
                      <Text style={styles.acceptIcon}>✓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => markRead(item.id)}
                style={[styles.systemCard, item.read && { opacity: 0.7 }]}
              >
                <Text style={styles.systemTitle}>{item.title}</Text>
                <Text style={styles.systemBody}>{item.body}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </TouchableOpacity>
            )
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffffff', padding: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: { fontSize: 22, fontWeight: '800', color: '#FF4D00' },
  clearBtn: {
    backgroundColor: '#FF4D00',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  clearText: { color: '#fff', fontWeight: '700' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },

  // Card base
  inviteCard: {
    backgroundColor: '#FF4D00',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inviteTitle: { fontWeight: '700', fontSize: 16, color: '#fff' },
  inviteBody: { color: '#ffffff', marginTop: 6, fontSize: 14 },
  timeText: { color: '#f9fafb', marginTop: 6, fontSize: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  declineBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  acceptBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center',
  },
  declineIcon: { color: '#ef4444', fontWeight: '800', fontSize: 18 },
  acceptIcon: { color: '#10b981', fontWeight: '800', fontSize: 18 },

  // System notifications
  systemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  systemTitle: { fontWeight: '700', fontSize: 16, color: '#111827' },
  systemBody: { color: '#374151', marginTop: 4, fontSize: 14 },
});
