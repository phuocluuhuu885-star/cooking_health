import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HomeMealPeriodProps } from '../../utils/types';
import HomeMealItem from './homeMealItem';

const HomeMealPeriod = memo(
  ({ title, items, onPress }: HomeMealPeriodProps) => {
    function renderItem(item: (typeof items)[number]) {
      return <HomeMealItem key={item.id} item={item} onPress={onPress} />;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {items.map(renderItem)}
        {items.length === 0 ? (
          <Text style={styles.empty}>Chưa có món nào được lên lịch.</Text>
        ) : null}
      </View>
    );
  },
);

export default HomeMealPeriod;

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
  },
  title: {
    paddingTop: 8,
    paddingBottom: 5,
    color: '#168653',
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    paddingVertical: 8,
    color: '#66756D',
    fontSize: 12,
  },
});
