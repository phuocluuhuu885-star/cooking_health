import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from '../../../components/LinearGradient';
import type {
  HouseholdMealPoll,
  HouseholdMealPeriodPlan,
  HouseholdPlannedMeal,
} from '../../../utils/types';
import { formatEstimatedPrice } from '../../../utils/priceUtils';
import { formatPollDeadline, getFinalizedMeals } from '../../../utils/householdScreenUtils';
import { COLORS } from './styles';
import styles from './styles';

type Props = {
  label: string;
  items: HouseholdMealPeriodPlan['items'];
  nutrition: HouseholdMealPeriodPlan['nutritionSummary'] | null;
  estimatedPrice?: HouseholdMealPeriodPlan['estimatedPrice'];
  unavailableNutritionItems: number;
  renderMeal: (meal: HouseholdPlannedMeal) => React.ReactNode;
  completed: boolean;
  locked: boolean;
  poll: HouseholdMealPoll | null;
  completing: boolean;
  onComplete: () => void;
};

const HouseholdMealPeriodCard = ({
  label,
  items,
  nutrition,
  estimatedPrice,
  unavailableNutritionItems,
  renderMeal,
  completed,
  locked,
  poll,
  completing,
  onComplete,
}: Props) => {
  const finalizedItems =
    poll && !poll.closedAt ? [] : getFinalizedMeals(items, poll);

  return (
    <View style={styles.mealPeriod}>
      <View style={styles.mealPeriodHeader}>
        <Text style={styles.mealPeriodTitle}>{label}</Text>
        {completed ? (
          <Text style={styles.mealCompletedLabel}>Bạn đã hoàn thành</Text>
        ) : null}
      </View>
      {finalizedItems.length > 0 ? (
        <View style={styles.periodNutrition}>
          <LinearGradient
            colors={['#FFFFFF', '#EAF6EE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.periodNutritionCalories}>
            {nutrition && nutrition.calories > 0
              ? `${Math.round(nutrition.calories)} kcal dự kiến`
              : 'Chưa có dữ liệu calo'}
          </Text>
          {nutrition && nutrition.calories > 0 ? (
            <Text style={styles.periodNutritionMacros}>
              Đạm {nutrition.proteinG.toFixed(1)} g · Carb{' '}
              {nutrition.carbsG.toFixed(1)} g · Béo {nutrition.fatG.toFixed(1)}{' '}
              g
            </Text>
          ) : null}
          <Text style={styles.periodNutritionMacros}>
            Chi phí ước tính: {formatEstimatedPrice(estimatedPrice)}
          </Text>
          {unavailableNutritionItems > 0 ? (
            <Text style={styles.periodNutritionNote}>
              {unavailableNutritionItems} món thiếu dữ liệu dinh dưỡng.
            </Text>
          ) : null}
        </View>
      ) : null}
      {finalizedItems.length > 0 ? (
        finalizedItems.map(renderMeal)
      ) : poll?.closedAt && poll.options.length > 0 ? (
        <Text style={styles.emptyMeals}>
          Không có món nào được chấp nhận. Hãy đề xuất món khác cho bữa này.
        </Text>
      ) : !poll?.options.length ? (
        <Text style={styles.emptyMeals}>
          Chưa có món trong bữa này. Hãy chọn món từ mục Công thức để cả nhà
          cùng bình chọn.
        </Text>
      ) : null}
      {locked && !completed ? (
        <Text style={styles.lockedMessage}>
          Thực đơn đã được cố định bởi một thành viên. Bạn vẫn có thể xác nhận
          phần ăn của mình.
        </Text>
      ) : null}
      {!completed && finalizedItems.length > 0 && poll && !poll.closedAt ? (
        <Text style={styles.waitingForPoll}>
          Có thể xác nhận đã ăn sau khi bình chọn đóng lúc{' '}
          {formatPollDeadline(poll.closesAt)}.
        </Text>
      ) : null}
      {!completed && finalizedItems.length > 0 && (!poll || poll.closedAt) ? (
        <Pressable
          accessibilityRole="button"
          disabled={completing}
          onPress={onComplete}
          style={[styles.completeButton, completing && styles.disabledButton]}
        >
          {completing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.completeButtonText}>
              Xác nhận đã ăn bữa này
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
};

export default HouseholdMealPeriodCard;
