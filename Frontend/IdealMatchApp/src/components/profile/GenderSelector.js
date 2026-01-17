import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const GENDER_OPTIONS = [
  { id: 'M', label: '남성' },
  { id: 'F', label: '여성' },
];

const GenderSelector = ({ selectedGenders = [], onSelect }) => {
  const toggleGender = (id) => {
    const genders = selectedGenders || [];
    if (genders.includes(id)) {
      onSelect(genders.filter((g) => g !== id));
    } else {
      onSelect([...genders, id]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {GENDER_OPTIONS.map((gender) => (
          <TouchableOpacity
            key={gender.id}
            style={[
              styles.item,
              (selectedGenders || []).includes(gender.id) && styles.selected,
            ]}
            onPress={() => toggleGender(gender.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                (selectedGenders || []).includes(gender.id) && styles.selectedLabel,
              ]}
            >
              {gender.label}
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

export default GenderSelector;
