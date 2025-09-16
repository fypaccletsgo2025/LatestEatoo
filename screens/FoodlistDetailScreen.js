// screens/FoodlistDetailScreen.js

import React, { useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { availableItems, mockUsers } from '../data/mockData';

export default function FoodlistDetailScreen({ route, navigation }) {
  const { foodlist, setFoodlists } = route.params; // passed from main screen

  // Defensive: ensure items array has no undefined entries
  const [currentList, setCurrentList] = useState({
    ...foodlist,
    items: (foodlist?.items ?? []).filter(Boolean),
    members: Array.isArray(foodlist?.members) ? [...foodlist.members] : [],
  });
  const [addingItems, setAddingItems] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [contributorsOpen, setContributorsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2000);
  };

  // Toggle item selection for adding
  const toggleAdd = (item) => {
    setSelectedToAdd((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  // Toggle item selection for removing (long press)
  const toggleRemove = (item) => {
    setSelectedToRemove((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  // Confirm removing selected items
  const confirmRemove = () => {
    if (selectedToRemove.length === 0) return;

    Alert.alert(
      'Remove Items',
      `Are you sure you want to remove ${selectedToRemove.length} item(s) from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedItems = currentList.items.filter(
              (item) => !selectedToRemove.find((i) => i.id === item.id)
            );
            const updatedList = { ...currentList, items: updatedItems };
            setCurrentList(updatedList);
            setFoodlists((prev) =>
              prev.map((f) => (f.id === currentList.id ? updatedList : f))
            );
            setSelectedToRemove([]);
          },
        },
      ]
    );
  };

  // Confirm adding selected items
  const confirmAdd = () => {
    const updatedItems = [...currentList.items, ...selectedToAdd];
    const updatedList = { ...currentList, items: updatedItems };
    setCurrentList(updatedList);
    setFoodlists((prev) =>
      prev.map((f) => (f.id === currentList.id ? updatedList : f))
    );
    setSelectedToAdd([]);
    setAddingItems(false);
  };

  // Delete entire list with confirmation popup
  const deleteList = () => {
    Alert.alert(
      'Delete Foodlist',
      'Are you sure you want to permanently delete this foodlist? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setFoodlists((prev) => prev.filter((f) => f.id !== currentList.id));
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Items available to add
  const itemsAvailableToAdd = availableItems.filter(
    (item) => !currentList.items.find((i) => i.id === item.id)
  );

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#d1ccc7' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>{currentList.name}</Text>
        <View style={{ flexDirection: 'row' }}>
          {currentList.members?.length > 0 && (
            <TouchableOpacity
              accessibilityLabel="View contributors"
              onPress={() => setContributorsOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#374151',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, lineHeight: 18 }}>👥</Text>
              <Text style={{ color: '#fff', marginLeft: 6 }}>{currentList.members.length}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityLabel="Invite collaborators"
            onPress={() => setInviteOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#111827',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, lineHeight: 18 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Invite Modal */}
      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '75%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Invite collaborators</Text>
            <TextInput
              placeholder="Search username"
              value={inviteQuery}
              onChangeText={setInviteQuery}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
              }}
            />
            <FlatList
              data={mockUsers.filter(u => !currentList.members?.some(m => String(m).toLowerCase() === u.name.toLowerCase()) && u.name.toLowerCase().includes(inviteQuery.toLowerCase()))}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    const updated = { ...currentList, members: [...(currentList.members || []), item.name] };
                    setCurrentList(updated);
                    setFoodlists((prev) => prev.map((f) => (f.id === currentList.id ? updated : f)));
                    showToast('Invitation sent');
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#c7d2fe', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>{item.name.split(/\s+/).map(p => p[0]?.toUpperCase()).slice(0,2).join('')}</Text>
                    </View>
                    <Text style={{ fontSize: 16 }}>{item.name}</Text>
                  </View>
                  <Text style={{ color: '#10b981', fontWeight: '700' }}>Invite</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ paddingVertical: 20, color: '#6b7280' }}>No users found</Text>}
            />
            <TouchableOpacity onPress={() => setInviteOpen(false)} style={{ marginTop: 12, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* Contributors Modal */}
      <Modal visible={contributorsOpen} transparent animationType="fade" onRequestClose={() => setContributorsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Contributors</Text>
            <FlatList
              data={(currentList.members || []).map((m, idx) => ({ id: `${idx}-${m}`, name: m }))}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#c7d2fe', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>{item.name.split(/\s+/).map(p => p[0]?.toUpperCase()).slice(0,2).join('')}</Text>
                  </View>
                  <Text style={{ fontSize: 16 }}>{item.name}</Text>
                </View>
              )}
              ListEmptyComponent={null}
            />
            <TouchableOpacity onPress={() => setContributorsOpen(false)} style={{ marginTop: 12, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!addingItems ? (
        <>
          <FlatList
            data={currentList.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('FoodItemDetail', { item })
                }
                onLongPress={() => toggleRemove(item)}
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
                  borderWidth: selectedToRemove.find((i) => i.id === item.id) ? 2 : 0,
                  borderColor: selectedToRemove.find((i) => i.id === item.id) ? '#fca5a5' : 'transparent',
                }}
              >
                <Text style={{ fontWeight: '700' }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />

          {selectedToRemove.length > 0 && (
            <TouchableOpacity onPress={confirmRemove} style={{ backgroundColor: '#fb923c', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{`Remove Selected Item${selectedToRemove.length > 1 ? 's' : ''}`}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setAddingItems(true)} style={{ backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteList} style={{ backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Delete Foodlist</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 8 }}>Select items to add:</Text>
          <FlatList
            data={itemsAvailableToAdd}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggleAdd(item)}
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
                  borderWidth: selectedToAdd.find((i) => i.id === item.id) ? 2 : 0,
                  borderColor: selectedToAdd.find((i) => i.id === item.id) ? '#86efac' : 'transparent',
                }}
              >
                <Text style={{ fontWeight: '700' }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={confirmAdd} style={{ backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddingItems(false)} style={{ backgroundColor: '#6b7280', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
      {/* Toast Modal: always above everything, including other modals */}
      <Modal
        visible={!!toastMessage}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
          <View style={{ backgroundColor: 'rgba(17,24,39,0.95)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{toastMessage}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
