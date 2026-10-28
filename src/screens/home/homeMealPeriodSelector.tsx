import React, { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { HomeMealPeriodSelectorProps } from '../../utils/types';
import type { MealPeriodOption } from '../../utils/types';
import HomeMealPeriodButton from './homeMealPeriodButton';

const MEAL_PERIODS: MealPeriodOption[] = [
  { id: 'LUNCH', label: 'Bữa trưa' },
  { id: 'DINNER', label: 'Bữa tối' },
];

const HomeMealPeriodSelector = memo(
  ({ selectedPeriod, periodPlans, onSelect }: HomeMealPeriodSelectorProps) => {
    return (
      <ScrollView
        accessibilityRole="tablist"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {MEAL_PERIODS.map(period => {
          const selected = selectedPeriod === period.id;
          const plan = periodPlans[period.id];
          return (
            <HomeMealPeriodButton
              key={period.id}
              period={period}
              itemCount={plan?.itemCount ?? 0}
              completed={plan?.isCompleted ?? false}
              selected={selected}
              onSelect={onSelect}
            />
          );
        })}
      </ScrollView>
    );
  },
);

export default HomeMealPeriodSelector;

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingBottom: 10,
  },
});
