// screens/PreferenceQuestionnaire.js
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { availableItems, availableRestaurants } from '../data/mockData';
import { replacePreferenceSelections } from '../state/preferenceSelectionsStore';

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionCard({ icon, title, description, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {icon ? (
          <View style={styles.sectionIconWrap}>
            <Icon name={icon} size={18} color="#FF4D00" />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
        </View>
      </View>
      <View style={styles.sectionDivider} />
      {children}
    </View>
  );
}

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

  const allSelections = useMemo(
    () => [...selectedDiet, ...selectedCuisine, ...selectedMood, ...selectedPrice],
    [selectedCuisine, selectedDiet, selectedMood, selectedPrice]
  );
  const limitedSelections = useMemo(() => allSelections.slice(0, 3), [allSelections]);

  const toggle = (setter, list, value) => {
    setter(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  };

  const handleApply = () => {
    const payload = { selectedDiet, selectedCuisine, selectedMood, selectedPrice };
    replacePreferenceSelections(payload);
    if (onComplete) onComplete(payload);
    else if (navigation?.navigate) navigation.navigate('PreferenceMainPage', payload);
  };

  const clearAll = () => {
    setSelectedDiet([]);
    setSelectedCuisine([]);
    setSelectedMood([]);
    setSelectedPrice([]);
  };

  const selectionSubtitle = allSelections.length
    ? `${allSelections.length} active ${allSelections.length === 1 ? 'preference' : 'preferences'}`
    : 'Tune recommendations to your taste';

  return (
    <View style={styles.container}>
      {/* ORANGE HEADER */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerBar}>
          {/* Right spacer to keep title centered */}
          <View style={[styles.iconBtn, { opacity: 0 }]} />
        </View>

        {/* Hero content inside header (no white card, no extra space) */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Icon name="sliders" size={20} color="#FF4D00" />
            <Text style={styles.heroBadgeText}>Personalise</Text>
          </View>

          <Text style={styles.heroSubtitle}>
            {allSelections.length
              ? 'Refine or add more to sharpen your picks.'
              : 'Craving something new? Choose the flavors, vibes, and budgets that suit your mood today'}
          </Text>

          {limitedSelections.length ? (
            <View style={styles.heroPills}>
              {limitedSelections.map(tag => (
                <View key={tag} style={styles.heroTag}>
                  <Text style={styles.heroTagText}>{tag}</Text>
                </View>
              ))}
              {allSelections.length > limitedSelections.length ? (
                <View style={styles.heroTag}>
                  <Text style={styles.heroTagText}>
                    +{allSelections.length - limitedSelections.length} more
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
      >
        <SectionCard icon="coffee" title="Type" description="Pick what you’re vibing with">
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
        </SectionCard>

        <SectionCard icon="globe" title="Cuisines" description="Travel the world through tastes">
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
        </SectionCard>

        <SectionCard icon="smile" title="Mood" description="Set the scene">
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
        </SectionCard>

        <SectionCard icon="tag" title="Budget" description="Find what fits your wallet">
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
        </SectionCard>
      </ScrollView>

      {/* FIXED BOTTOM BUTTONS */}
      <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={clearAll}>
          <Text style={styles.secondaryBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={handleApply}>
          <Text style={styles.primaryBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const PreferenceQuestionnaireStep2 = props => <PreferenceQuestionnaire {...props} />;
export const PreferenceQuestionnaireStep3 = props => <PreferenceQuestionnaire {...props} />;
export const PreferenceQuestionnaireStep4 = props => <PreferenceQuestionnaire {...props} />;

const styles = StyleSheet.create({
  // Base
  container: { flex: 1, backgroundColor: '#FFF5ED' },

  // ORANGE header
  headerWrap: {
    paddingBottom: 5,
    backgroundColor: '#FF4D00',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#FF4D00',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero section (no white background)
  heroCard: {
    marginHorizontal: 0,
    marginTop: -90,
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8D2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 12,
    gap: 6,
  },
  heroBadgeText: { color: '#FF4D00', fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },
  heroSubtitle: { marginTop: 2, fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 8 },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroTagText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },

  // Scroll content
  scrollContent: { paddingTop: 18, paddingHorizontal: 16, gap: 18 },

  // Section cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    shadowColor: '#FF4D00',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    gap: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE8D2',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FF4D00' },
  sectionDescription: { marginTop: 4, color: '#6B4A3F', fontSize: 13 },
  sectionDivider: { height: 1, backgroundColor: '#FFE8D2', borderRadius: 1 },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#FF4D00',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  chipSelected: {
    backgroundColor: '#FF4D00',
    borderColor: '#FF4D00',
    shadowColor: '#FF4D00',
    shadowOpacity: 0.2,
  },
  chipText: { color: '#5B4034', fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: '#FFFFFF' },

  // Bottom actions
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FF4D00',
    borderTopWidth: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE8D2',
  },
  primaryBtnText: { color: '#FF4D00', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
