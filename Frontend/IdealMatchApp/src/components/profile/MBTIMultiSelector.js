import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MBTI_TYPES } from '../../constants/mbti';
import { COLORS } from '../../constants/colors';

const MBTIMultiSelector = ({ selectedMBTIs, onSelect }) => {
  const toggleMBTI = (mbti) => {
    if (selectedMBTIs.includes(mbti)) {
      onSelect(selectedMBTIs.filter((m) => m !== mbti));
    } else {
      onSelect([...selectedMBTIs, mbti]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>선호 MBTI (다중 선택 가능)</Text>
      <View style={styles.grid}>
        {MBTI_TYPES.map((mbti) => (
          <TouchableOpacity
            key={mbti}
            style={[
              styles.item,
              selectedMBTIs.includes(mbti) && styles.selected,
            ]}
            onPress={() => toggleMBTI(mbti)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                selectedMBTIs.includes(mbti) && styles.selectedLabel,
              ]}
            >
              {mbti}
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
    gap: 8,
  },
  item: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  selectedLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MBTIMultiSelector;
