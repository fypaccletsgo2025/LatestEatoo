// components/PreferenceQuestionnaireSheet.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RightSheet from './RightSheet';
import { PreferenceQuestionnaire } from '../screens/PreferenceQuestionnaire';

export default function PreferenceQuestionnaireSheet({
  open,
  onClose,
  onApply,
  initialSelections = { selectedDiet: [], selectedCuisine: [], selectedMood: [], selectedPrice: [] },
}) {
  const [sel, setSel] = useState(initialSelections);

  useEffect(() => {
    if (open) {
      // Reset to initial when opening
      setSel(initialSelections);
    }
  }, [open]);

  return (
    <RightSheet open={open} onClose={onClose} widthPct={0.92} testID="PreferenceQuestionnaireSheet">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
            <Text style={styles.headerClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <PreferenceQuestionnaire
            route={{ params: { ...sel, onComplete: (finalSel) => onApply?.(finalSel) } }}
            navigation={{}}
          />
        </View>
      </SafeAreaView>
    </RightSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerClose: { fontSize: 20, paddingHorizontal: 8, paddingVertical: 4 },
});
