import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { INTERESTS } from '../../constants/interests';
import { COLORS } from '../../constants/colors';

const InterestSelector = ({ selectedInterests, onSelect }) => {
  const toggleInterest = (id) => {
    if (selectedInterests.includes(id)) {
      onSelect(selectedInterests.filter((i) => i !== id));
    } else {
      onSelect([...selectedInterests, id]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>관심사 (다중 선택 가능)</Text>
      <View style={styles.grid}>
        {INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.item,
              selectedInterests.includes(interest.id) && styles.selected,
            ]}
            onPress={() => toggleInterest(interest.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{interest.icon}</Text>
            <Text
              style={[
                styles.label,
                selectedInterests.includes(interest.id) && styles.selectedLabel,
              ]}
            >
              {interest.label}
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
    width: '30%',
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.gray,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: COLORS.text,
  },
  selectedLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default InterestSelector;
