// screens/PreferenceQuestionnaire.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, PanResponder } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalogData } from '../hooks/useCatalogData';
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

const normalizeValue = (v) => String(v ?? '').trim();
const normalizeKey = (v) => normalizeValue(v).toLowerCase();

const buildOptionList = (values = []) => {
  const seen = new Set();
  const out = [];
  values.forEach((valRaw) => {
    const val = normalizeValue(valRaw);
    const key = normalizeKey(val);
    if (!val || seen.has(key)) return;
    seen.add(key);
    out.push(val);
  });
  return out.sort((a, b) => a.localeCompare(b));
};

const topOptionsByFrequency = (values = [], limit = 6) => {
  const counts = values.reduce((acc, raw) => {
    const val = normalizeValue(raw);
    const key = normalizeKey(val);
    if (!val) return acc;
    acc[key] = acc[key] || { label: val, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});
  return Object.values(counts)
    .sort((a, b) => {
      if (b.count === a.count) return a.label.localeCompare(b.label);
      return b.count - a.count;
    })
    .slice(0, limit)
    .map((entry) => entry.label);
};

const PRICE_MIN = 0;
const PRICE_MAX = 100;
const THUMB_WIDTH = 44;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const parsePriceSelection = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) {
    return { min: PRICE_MIN, max: PRICE_MAX };
  }
  const first = String(list[0]);
  const nums = first.match(/(\d+(\.\d+)?)/g)?.map((n) => Number(n)) || [];
  if (nums.length === 0) return { min: PRICE_MIN, max: PRICE_MAX };
  const min = clamp(nums[0], PRICE_MIN, PRICE_MAX);
  const max = clamp(nums[1] ?? PRICE_MAX, PRICE_MIN, PRICE_MAX);
  return { min: Math.min(min, max), max: Math.max(min, max) };
};

export const PreferenceQuestionnaire = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    restaurants: availableRestaurants,
    items: availableItems,
    loading: catalogLoading,
    error: catalogError,
  } = useCatalogData();
  const {
    selectedDiet: preDiet = [],
    selectedCuisine: preCuisine = [],
    selectedMood: preMood = [],
    selectedPrice: prePrice = [],
    onComplete,
  } = route?.params || {};

  const dietOptions = useMemo(
    () => topOptionsByFrequency((availableItems || []).map((i) => i.type)),
    [availableItems]
  );
  const cuisineOptions = useMemo(
    () => topOptionsByFrequency((availableItems || []).map((i) => i.cuisine)),
    [availableItems]
  );
  const moodOptions = useMemo(
    () => topOptionsByFrequency((availableRestaurants || []).flatMap((r) => r.ambience || [])),
    [availableRestaurants]
  );
  const priceOptions = ['RM0-RM10', 'RM11-RM20', 'RM21-RM30', 'RM31+'];

  const [selectedDiet, setSelectedDiet] = useState(preDiet);
  const [selectedCuisine, setSelectedCuisine] = useState(preCuisine);
  const [selectedMood, setSelectedMood] = useState(preMood);
  const [selectedPrice, setSelectedPrice] = useState(prePrice);
  const [priceRange, setPriceRange] = useState(parsePriceSelection(prePrice));
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragState, setDragState] = useState({ active: null, startX: 0, startVal: 0 });

  useEffect(() => {
    setSelectedDiet(preDiet);
    setSelectedCuisine(preCuisine);
    setSelectedMood(preMood);
    setSelectedPrice(prePrice);
    setPriceRange(parsePriceSelection(prePrice));
  }, [preDiet, preCuisine, preMood, prePrice]);

  useEffect(() => {
    const token =
      priceRange.min <= PRICE_MIN && priceRange.max >= PRICE_MAX
        ? []
        : [`${priceRange.min}-${priceRange.max}`];
    setSelectedPrice(token);
  }, [priceRange]);

  const allSelections = useMemo(
    () => [...selectedDiet, ...selectedCuisine, ...selectedMood, ...selectedPrice],
    [selectedCuisine, selectedDiet, selectedMood, selectedPrice]
  );
  const limitedSelections = useMemo(() => allSelections.slice(0, 3), [allSelections]);

  const toggle = (setter, list, value) => {
    const key = normalizeKey(value);
    setter(
      list.some((x) => normalizeKey(x) === key)
        ? list.filter((x) => normalizeKey(x) !== key)
        : [...list, value]
    );
  };

  const valueToPosition = (val) => {
    if (!trackWidth) return 0;
    const ratio = (val - PRICE_MIN) / (PRICE_MAX - PRICE_MIN);
    return clamp(ratio * trackWidth, 0, trackWidth);
  };

  const positionToValue = (pos) => {
    if (!trackWidth) return PRICE_MIN;
    const ratio = clamp(pos / trackWidth, 0, 1);
    return Math.round(PRICE_MIN + ratio * (PRICE_MAX - PRICE_MIN));
  };

  const minPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (_, g) => {
          setDragState({ active: 'min', startX: g.x0, startVal: priceRange.min });
        },
        onPanResponderMove: (_, g) => {
          if (!trackWidth) return;
          const delta = g.dx;
          const startPos = valueToPosition(dragState.startVal);
          const nextPos = clamp(startPos + delta, 0, valueToPosition(priceRange.max) - 10);
          const nextVal = positionToValue(nextPos);
          setPriceRange((prev) => ({ ...prev, min: Math.min(nextVal, prev.max) }));
        },
        onPanResponderRelease: () => {
          setDragState({ active: null, startX: 0, startVal: 0 });
        },
      }),
    [dragState.startVal, priceRange.max, trackWidth],
  );

  const maxPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (_, g) => {
          setDragState({ active: 'max', startX: g.x0, startVal: priceRange.max });
        },
        onPanResponderMove: (_, g) => {
          if (!trackWidth) return;
          const delta = g.dx;
          const startPos = valueToPosition(dragState.startVal);
          const nextPos = clamp(startPos + delta, valueToPosition(priceRange.min) + 10, trackWidth);
          const nextVal = positionToValue(nextPos);
          setPriceRange((prev) => ({ ...prev, max: Math.max(nextVal, prev.min) }));
        },
        onPanResponderRelease: () => {
          setDragState({ active: null, startX: 0, startVal: 0 });
        },
      }),
    [dragState.startVal, priceRange.min, trackWidth],
  );

  const sliderLabel = `RM${priceRange.min} - RM${priceRange.max}`;

  const handleApply = () => {
    const priceSelection =
      priceRange.min <= PRICE_MIN && priceRange.max >= PRICE_MAX
        ? []
        : [`${priceRange.min}-${priceRange.max}`];
    const payload = {
      selectedDiet,
      selectedCuisine,
      selectedMood,
      selectedPrice: priceSelection,
    };
    replacePreferenceSelections(payload);
    if (onComplete) onComplete(payload);
    else if (navigation?.navigate) navigation.navigate('PreferenceMainPage', payload);
  };

  const clearAll = () => {
    setSelectedDiet([]);
    setSelectedCuisine([]);
    setSelectedMood([]);
    setSelectedPrice([]);
    setPriceRange({ min: PRICE_MIN, max: PRICE_MAX });
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
        {catalogLoading ? (
          <Text style={styles.loadingText}>Loading the latest menu data...</Text>
        ) : null}
        {catalogError ? <Text style={styles.errorText}>{catalogError}</Text> : null}
        <SectionCard icon="coffee" title="Type" description="Pick what you're vibing with">
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

        <SectionCard icon="tag" title="Budget" description="Slide to set your min/max spend">
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>{sliderLabel}</Text>
          </View>
          <View
            style={styles.sliderTrackWrap}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          >
            <View style={styles.sliderTrack} />
            <View
              style={[
                styles.sliderRange,
                {
                  left: valueToPosition(priceRange.min),
                  right: trackWidth - valueToPosition(priceRange.max),
                },
              ]}
            />
            <View
              style={[
                styles.sliderThumb,
                { left: valueToPosition(priceRange.min) - THUMB_WIDTH / 2, width: THUMB_WIDTH },
              ]}
              {...minPan.panHandlers}
            >
              <Text style={styles.sliderThumbText}>Min</Text>
            </View>
            <View
              style={[
                styles.sliderThumb,
                { left: valueToPosition(priceRange.max) - THUMB_WIDTH / 2, width: THUMB_WIDTH },
              ]}
              {...maxPan.panHandlers}
            >
              <Text style={styles.sliderThumbText}>Max</Text>
            </View>
          </View>
          <View style={styles.sliderFooter}>
            <Text style={styles.sliderTick}>RM{PRICE_MIN}</Text>
            <Text style={styles.sliderTick}>RM{PRICE_MAX}</Text>
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
  loadingText: { color: '#6B4A3F', marginBottom: 8, fontStyle: 'italic' },
  errorText: { color: '#B91C1C', marginBottom: 12, fontWeight: '700' },

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

  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { fontWeight: '800', color: '#FF4D00', fontSize: 16 },
  sliderTrackWrap: {
    marginTop: 12,
    height: 48,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '90%',
    maxWidth: 240,
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#FFE8D2',
  },
  sliderRange: {
    position: 'absolute',
    height: 6,
    borderRadius: 4,
    backgroundColor: '#FF4D00',
  },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_WIDTH,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF4D00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4D00',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  sliderThumbText: { color: '#FF4D00', fontWeight: '700', fontSize: 12 },
  sliderFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderTick: { color: '#6B4A3F', fontWeight: '600' },

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
