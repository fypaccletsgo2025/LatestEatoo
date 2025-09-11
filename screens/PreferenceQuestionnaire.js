// screens/PreferenceQuestionnaire.js
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { availableItems, availableRestaurants } from '../data/mockData';

// Small selectable chip
function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Combined, scrollable questionnaire (all sections stacked)
export const PreferenceQuestionnaire = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    selectedDiet: preDiet = [],
    selectedCuisine: preCuisine = [],
    selectedMood: preMood = [],
    selectedPrice: prePrice = [],
    onComplete,
  } = route?.params || {};

  const dietOptions = useMemo(() => Array.from(new Set(availableItems.map(i => i.type))), []);
  const cuisineOptions = useMemo(() => Array.from(new Set(availableItems.map(i => i.cuisine))), []);
  const moodOptions = useMemo(
    () => Array.from(new Set((availableRestaurants || []).flatMap(r => r.ambience || []))),
    []
  );
  const priceOptions = ['RM0-RM10', 'RM11-RM20', 'RM21-RM30', 'RM31+'];

  const [selectedDiet, setSelectedDiet] = useState(preDiet);
  const [selectedCuisine, setSelectedCuisine] = useState(preCuisine);
  const [selectedMood, setSelectedMood] = useState(preMood);
  const [selectedPrice, setSelectedPrice] = useState(prePrice);

  const toggle = (setter, list, v) => setter(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const handleApply = () => {
    const payload = { selectedDiet, selectedCuisine, selectedMood, selectedPrice };
    if (onComplete) {
      onComplete(payload);
    } else if (navigation?.navigate) {
      navigation.navigate('PreferenceMainPage', payload);
    }
  };

  const clearAll = () => {
    setSelectedDiet([]);
    setSelectedCuisine([]);
    setSelectedMood([]);
    setSelectedPrice([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Tailor your recommendations</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 24 + 56) }}>
        {/* Diet/Type */}
        <Text style={styles.subheading}>Type</Text>
        <View style={styles.chipsWrap}>
          {dietOptions.map(opt => (
            <Chip key={opt} label={opt} selected={selectedDiet.includes(opt)} onPress={() => toggle(setSelectedDiet, selectedDiet, opt)} />
          ))}
        </View>

        {/* Cuisine */}
        <Text style={styles.subheading}>Cuisines</Text>
        <View style={styles.chipsWrap}>
          {cuisineOptions.map(opt => (
            <Chip key={opt} label={opt} selected={selectedCuisine.includes(opt)} onPress={() => toggle(setSelectedCuisine, selectedCuisine, opt)} />
          ))}
        </View>

        {/* Mood */}
        <Text style={styles.subheading}>Mood</Text>
        <View style={styles.chipsWrap}>
          {moodOptions.map(opt => (
            <Chip key={opt} label={opt} selected={selectedMood.includes(opt)} onPress={() => toggle(setSelectedMood, selectedMood, opt)} />
          ))}
        </View>

        {/* Price */}
        <Text style={styles.subheading}>Budget</Text>
        <View style={styles.chipsWrap}>
          {priceOptions.map(opt => (
            <Chip key={opt} label={opt} selected={selectedPrice.includes(opt)} onPress={() => toggle(setSelectedPrice, selectedPrice, opt)} />
          ))}
        </View>

        <View style={[styles.row, { marginTop: 20 }]}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={clearAll}>
            <Text style={styles.secondaryBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleApply}>
            <Text style={styles.primaryBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Preserve the step components (legacy) for compatibility; not used in new flow.
export const PreferenceQuestionnaireStep2 = (props) => <PreferenceQuestionnaire {...props} />;
export const PreferenceQuestionnaireStep3 = (props) => <PreferenceQuestionnaire {...props} />;
export const PreferenceQuestionnaireStep4 = (props) => <PreferenceQuestionnaire {...props} />;

// ---- Styles ----
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  subheading: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 6 },
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
