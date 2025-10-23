// screens/PreferenceQuestionnaire.js
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { availableItems, availableRestaurants } from '../data/mockData';

// --- Small selectable chip component ---
function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// --- Combined, scrollable questionnaire ---
export const PreferenceQuestionnaire = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    selectedDiet: preDiet = [],
    selectedCuisine: preCuisine = [],
    selectedMood: preMood = [],
    selectedPrice: prePrice = [],
    onComplete,
  } = route?.params || {};

  const dietOptions = useMemo(
    () => Array.from(new Set(availableItems.map(i => i.type))),
    []
  );
  const cuisineOptions = useMemo(
    () => Array.from(new Set(availableItems.map(i => i.cuisine))),
    []
  );
  const moodOptions = useMemo(
    () =>
      Array.from(
        new Set((availableRestaurants || []).flatMap(r => r.ambience || []))
      ),
    []
  );
  const priceOptions = ['RM0-RM10', 'RM11-RM20', 'RM21-RM30', 'RM31+'];

  const [selectedDiet, setSelectedDiet] = useState(preDiet);
  const [selectedCuisine, setSelectedCuisine] = useState(preCuisine);
  const [selectedMood, setSelectedMood] = useState(preMood);
  const [selectedPrice, setSelectedPrice] = useState(prePrice);

  const toggle = (setter, list, value) => {
    setter(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  };

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}>
        {/* --- Type --- */}
        <Text style={styles.subheading}>Type</Text>
        <View style={styles.chipsWrap}>
          {dietOptions.map(opt => (
            <Chip
              key={opt}
              label={opt}
              selected={selectedDiet.includes(opt)}
              onPress={() => toggle(setSelectedDiet, selectedDiet, opt)}
            />
          ))}
        </View>

        {/* --- Cuisine --- */}
        <Text style={styles.subheading}>Cuisines</Text>
        <View style={styles.chipsWrap}>
          {cuisineOptions.map(opt => (
            <Chip
              key={opt}
              label={opt}
              selected={selectedCuisine.includes(opt)}
              onPress={() => toggle(setSelectedCuisine, selectedCuisine, opt)}
            />
          ))}
        </View>

        {/* --- Mood --- */}
        <Text style={styles.subheading}>Mood</Text>
        <View style={styles.chipsWrap}>
          {moodOptions.map(opt => (
            <Chip
              key={opt}
              label={opt}
              selected={selectedMood.includes(opt)}
              onPress={() => toggle(setSelectedMood, selectedMood, opt)}
            />
          ))}
        </View>

        {/* --- Budget --- */}
        <Text style={styles.subheading}>Budget</Text>
        <View style={styles.chipsWrap}>
          {priceOptions.map(opt => (
            <Chip
              key={opt}
              label={opt}
              selected={selectedPrice.includes(opt)}
              onPress={() => toggle(setSelectedPrice, selectedPrice, opt)}
            />
          ))}
        </View>
      </ScrollView>

      {/* --- Fixed Bottom Buttons --- */}
      <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom + 4 }]}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={clearAll}>
          <Text style={styles.secondaryBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleApply}>
          <Text style={styles.primaryBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Legacy step components (kept for compatibility)
export const PreferenceQuestionnaireStep2 = props => <PreferenceQuestionnaire {...props} />;
export const PreferenceQuestionnaireStep3 = props => <PreferenceQuestionnaire {...props} />;
export const PreferenceQuestionnaireStep4 = props => <PreferenceQuestionnaire {...props} />;

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#FF4D00',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 10,
    color: '#fff',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 10,
    color: '#fff',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: '#ffffffaa',
  },
  chipSelected: {
    backgroundColor: '#000',
    borderColor: '#007AFF',
  },
  chipText: {
    color: '#333',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
