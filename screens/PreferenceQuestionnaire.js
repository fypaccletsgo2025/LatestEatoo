// screens/PreferenceQuestionnaire.js
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { availableItems, availableRestaurants } from '../data/mockData';

// Small selectable chip
function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Step 1 - Diet/type
export const PreferenceQuestionnaire = ({ route, navigation }) => {
  const { selectedDiet: preDiet = [] } = route?.params || {};
  const dietOptions = useMemo(() => {
    // derive unique types from data (e.g., meal, drink, dessert, pastry, snacks)
    return Array.from(new Set(availableItems.map(i => i.type)));
  }, []);
  const [selectedDiet, setSelectedDiet] = useState(preDiet);

  const toggle = (v) => {
    setSelectedDiet((prev) => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Step 1: What are you looking for?</Text>
      <ScrollView contentContainerStyle={styles.chipsWrap}>
        {dietOptions.map(opt => (
          <Chip key={opt} label={opt} selected={selectedDiet.includes(opt)} onPress={() => toggle(opt)} />
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('PreferenceQuestionnaireStep2', { selectedDiet })}
      >
        <Text style={styles.primaryBtnText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

// Step 2 - Cuisine
export const PreferenceQuestionnaireStep2 = ({ route, navigation }) => {
  const { selectedDiet = [] } = route.params || {};
  const cuisineOptions = useMemo(() => Array.from(new Set(availableItems.map(i => i.cuisine))), []);
  const [selectedCuisine, setSelectedCuisine] = useState(route?.params?.selectedCuisine ?? []);
  const toggle = (v) => setSelectedCuisine(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Step 2: Pick cuisines</Text>
      <ScrollView contentContainerStyle={styles.chipsWrap}>
        {cuisineOptions.map(opt => (
          <Chip key={opt} label={opt} selected={selectedCuisine.includes(opt)} onPress={() => toggle(opt)} />
        ))}
      </ScrollView>
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('PreferenceQuestionnaireStep3', { selectedDiet, selectedCuisine })}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Step 3 - Mood
export const PreferenceQuestionnaireStep3 = ({ route, navigation }) => {
  const { selectedDiet = [], selectedCuisine = [] } = route.params || {};
  // Gather unique ambience tags from restaurants
  const moodOptions = useMemo(
    () => Array.from(new Set((availableRestaurants || []).flatMap(r => r.ambience || []))),
    []
  );
  const [selectedMood, setSelectedMood] = useState(route?.params?.selectedMood ?? []);
  const toggle = (v) => setSelectedMood(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Step 3: What's the vibe?</Text>
      <ScrollView contentContainerStyle={styles.chipsWrap}>
        {moodOptions.map(opt => (
          <Chip key={opt} label={opt} selected={selectedMood.includes(opt)} onPress={() => toggle(opt)} />
        ))}
      </ScrollView>
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('PreferenceQuestionnaireStep4', { selectedDiet, selectedCuisine, selectedMood })}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Step 4 - Price
export const PreferenceQuestionnaireStep4 = ({ route, navigation }) => {
  const { selectedDiet = [], selectedCuisine = [], selectedMood = [] } = route.params || {};
  // Note: using strings that the filtering screen expects
  const priceOptions = [
    'RM0-RM10',
    'RM11-RM20',
    'RM21-RM30',
    'RM31+',
  ];
  const [selectedPrice, setSelectedPrice] = useState(route?.params?.selectedPrice ?? []);
  const toggle = (v) => setSelectedPrice(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Step 4: Budget range</Text>
      <ScrollView contentContainerStyle={styles.chipsWrap}>
        {priceOptions.map(opt => (
          <Chip key={opt} label={opt} selected={selectedPrice.includes(opt)} onPress={() => toggle(opt)} />
        ))}
      </ScrollView>
      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            {
              const onComplete = route?.params?.onComplete;
              if (onComplete) {
                onComplete({ selectedDiet, selectedCuisine, selectedMood, selectedPrice });
              } else {
                navigation.navigate('PreferenceMainPage', {
                  selectedDiet,
                  selectedCuisine,
                  selectedMood,
                  selectedPrice,
                });
              }
            }
          }
        >
          <Text style={styles.primaryBtnText}>See Recommendations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---- Styles ----
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333' },
  chipTextSelected: { color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  primaryBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold' },
  secondaryBtn: {
    backgroundColor: '#eee',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryBtnText: { color: '#333', fontWeight: 'bold' },
});
