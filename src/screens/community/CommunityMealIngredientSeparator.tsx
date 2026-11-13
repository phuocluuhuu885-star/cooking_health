import React from 'react';
import { StyleSheet, View } from 'react-native';

const CommunityMealIngredientSeparator = () => (
  <View style={styles.separator} />
);

export default CommunityMealIngredientSeparator;

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E9EEEA',
  },
});
