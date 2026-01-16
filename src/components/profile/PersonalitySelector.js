import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PERSONALITY_TYPES } from '../../constants/personality';
import { COLORS } from '../../constants/colors';

const PersonalitySelector = ({ selectedPersonalities, onSelect }) => {
  const togglePersonality = (id) => {
    if (selectedPersonalities.includes(id)) {
      onSelect(selectedPersonalities.filter((p) => p !== id));
    } else {
      onSelect([...selectedPersonalities, id]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>성격 (다중 선택 가능)</Text>
      <View style={styles.grid}>
        {PERSONALITY_TYPES.map((personality) => (
          <TouchableOpacity
            key={personality.id}
            style={[
              styles.item,
              selectedPersonalities.includes(personality.id) && styles.selected,
            ]}
            onPress={() => togglePersonality(personality.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                selectedPersonalities.includes(personality.id) && styles.selectedLabel,
              ]}
            >
              {personality.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray,
    backgroundColor: '#fff',
  },
  selected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PersonalitySelector;
