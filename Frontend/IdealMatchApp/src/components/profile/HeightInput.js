import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const HeightInput = ({ label, value, onChangeText, error }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label || '키 (cm)'}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={value}
          onChangeText={onChangeText}
          placeholder="예: 170"
          keyboardType="number-pad"
          maxLength={3}
        />
        <Text style={styles.unit}>cm</Text>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  unit: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
});

export default HeightInput;
