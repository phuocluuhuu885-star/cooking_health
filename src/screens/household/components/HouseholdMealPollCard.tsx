import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from '../../../components/LinearGradient';
import type { HouseholdMealPoll, MealPeriod } from '../../../utils/types';
import { createStateSetter } from '../../../utils/stateUtils';
import HouseholdMealPollOptionRow from './HouseholdMealPollOptionRow';
import styles from './styles';

type Props = {
  poll: HouseholdMealPoll;
  mealPeriod: MealPeriod;
  votingOptionKey: string;
  onVote: (mealPeriod: MealPeriod, mealId: string, agrees: boolean) => void;
  onViewIngredients: () => void;
};

function isAcceptedOption(option: HouseholdMealPoll['options'][number]) {
  return option.outcome === 'ACCEPTED';
}

function isProposedOption(option: HouseholdMealPoll['options'][number]) {
  return option.outcome !== 'ACCEPTED';
}

const HouseholdMealPollCard = ({
  poll,
  mealPeriod,
  votingOptionKey,
  onVote,
  onViewIngredients,
}: Props) => {
  const [state, setState] = useState({ expanded: !poll.closedAt });
  const { expanded } = state;
  const setExpanded = useMemo(
    () => createStateSetter(setState, 'expanded'),
    [setState],
  );
  const proposedOptions = poll.closedAt
    ? poll.options.filter(isProposedOption)
    : poll.options;
  const acceptedMeals = poll.options.filter(isAcceptedOption);
  const toggleExpanded = useCallback(() => {
    setExpanded(current => !current);
  }, [setExpanded]);
  function renderOption(option: (typeof proposedOptions)[number]) {
    return (
      <HouseholdMealPollOptionRow
        key={option.id}
        option={option}
        mealPeriod={mealPeriod}
        voting={votingOptionKey === `${mealPeriod}:${option.mealId}`}
        pollClosed={Boolean(poll.closedAt)}
        onVote={onVote}
      />
    );
  }

  const optionRows = proposedOptions.map(renderOption);

  if (!poll.closedAt) {
    return (
      <View style={styles.pollOptions}>
        {optionRows.length ? (
          optionRows
        ) : (
          <Text style={styles.emptyMeals}>Chưa có món nào được đề xuất.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.pollCard}>
      <LinearGradient
        colors={['#FFFFFF', '#F3FAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Danh sách món đề xuất"
        accessibilityState={{ expanded }}
        onPress={toggleExpanded}
        style={styles.pollHeader}
      >
        <View style={styles.pollHeaderCopy}>
          <Text style={styles.pollTitle}>Danh sách món đề xuất</Text>
          <Text style={styles.pollHeaderHint}>
            {proposedOptions.length
              ? `${proposedOptions.length} món đề xuất`
              : 'Không có món đề xuất thêm'}
          </Text>
        </View>
        <Text style={styles.pollToggle}>⌃</Text>
      </Pressable>
      {expanded ? (
        <>
          {optionRows.length ? (
            optionRows
          ) : (
            <Text style={styles.emptyMeals}>Không có món đề xuất thêm.</Text>
          )}
          {acceptedMeals.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={onViewIngredients}
              style={styles.ingredientSummaryButton}
            >
              <Text style={styles.ingredientSummaryButtonText}>
                Xem nguyên liệu các món được chọn
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

export default HouseholdMealPollCard;
