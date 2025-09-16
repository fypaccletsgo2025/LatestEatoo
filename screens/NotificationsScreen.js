// screens/NotificationsScreen.js

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { sampleInviteFoodlist } from '../data/mockData';
import { getFoodlists, updateFoodlists } from '../state/foodlistsStore';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([
    { id: 'n1', type: 'invite', title: 'Foodlist invite', body: `Aida wants to share a foodlist with you: '${sampleInviteFoodlist.name}'`, read: false, time: '2m ago', payload: { list: sampleInviteFoodlist, inviter: 'Aida' } },
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
    if (!already) {
      updateFoodlists((prev) => [...prev, newList]);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== note.id));
  };

  const declineInvite = (note) => {
    setNotifications((prev) => prev.filter((n) => n.id !== note.id));
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#d1ccc7' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={{ backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      {notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#6b7280' }}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            item.type === 'invite' ? (
              <View
                style={{
                  padding: 14,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontWeight: '700' }}>{item.title}</Text>
                    <Text style={{ color: '#374151', marginTop: 4 }}>{item.body}</Text>
                    <Text style={{ color: '#6b7280', marginTop: 6, fontSize: 12 }}>{item.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => declineInvite(item)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                      <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 18 }}>❌</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => acceptInvite(item)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 18 }}>✅</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => markRead(item.id)}
                style={{
                  padding: 14,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                  opacity: item.read ? 0.7 : 1,
                }}
              >
                <Text style={{ fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#374151', marginTop: 4 }}>{item.body}</Text>
                <Text style={{ color: '#6b7280', marginTop: 6, fontSize: 12 }}>{item.time}</Text>
              </TouchableOpacity>
            )
          )}
        />
      )}
    </View>
  );
}
