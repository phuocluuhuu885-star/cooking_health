import React, { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import type { Nutrition } from '../../utils/types';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';

const COLORS = {
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  protein: '#4384D8',
  carbs: '#E9A400',
  fat: '#E26B61',
};

const MACROS: Array<{
  id: 'proteinG' | 'carbsG' | 'fatG';
  label: string;
  marker: string;
  color: string;
}> = [
  { id: 'proteinG', label: 'Đạm', marker: 'P', color: COLORS.protein },
  { id: 'carbsG', label: 'Tinh bột', marker: 'C', color: COLORS.carbs },
  { id: 'fatG', label: 'Chất béo', marker: 'F', color: COLORS.fat },
];

type HomeNutritionCardProps = {
  loading: boolean;
  error: string;
  isLoggedIn: boolean;
  calorieTarget?: number;
  macroTargets: Partial<Pick<Nutrition, 'proteinG' | 'carbsG' | 'fatG'>>;
  nutrition: Nutrition | null;
  unavailableNutritionItems: number;
  onRetry: () => void;
};

const MacroProgressRow = memo(
  ({
    label,
    marker,
    value,
    target,
    percentage,
    color,
  }: {
    label: string;
    marker: string;
    value: number;
    target: number | null;
    percentage: number | null;
    color: string;
  }) => (
    <View style={styles.macroRow}>
      <View style={[styles.macroMarker, { backgroundColor: `${color}1A` }]}>
        <Text style={[styles.macroMarkerText, { color }]}>{marker}</Text>
      </View>
      <View style={styles.macroDetails}>
        <View style={styles.macroHeading}>
          <Text numberOfLines={1} style={styles.macroLabel}>
            {label}
          </Text>
          <View style={styles.macroValues}>
            <Text style={[styles.macroAmount, { color }]}>
              {formatNumberWithOptionalDecimal(value)}
              {target != null
                ? ` / ${formatNumberWithOptionalDecimal(target)} g`
                : ' g'}
            </Text>
            <Text style={styles.macroPercentage}>
              {percentage == null ? '—' : `${percentage}%`}
            </Text>
          </View>
        </View>
        <View
          accessibilityLabel={`${label}: ${
            percentage == null ? 'chưa có mục tiêu' : `${percentage}% mục tiêu`
          }`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: target ?? 100,
            now: target == null ? 0 : Math.min(value, target),
          }}
          style={styles.macroTrack}
        >
          <View
            style={[
              styles.macroFill,
              {
                width: `${Math.min(percentage ?? 0, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  ),
);

const HomeNutritionCard = ({
  loading,
  error,
  isLoggedIn,
  calorieTarget,
  macroTargets,
  nutrition,
  unavailableNutritionItems,
  onRetry,
}: HomeNutritionCardProps) => {
  const hasCalorieTarget = calorieTarget != null && calorieTarget > 0;
  const caloriesRemaining =
    hasCalorieTarget && nutrition
      ? Math.max(calorieTarget - nutrition.calories, 0)
      : null;
  const calorieRingProgress = hasCalorieTarget
    ? Math.min((nutrition?.calories ?? 0) / calorieTarget, 1)
    : 0;
  const calorieRingSize = 76;
  const calorieRingRadius = 32;
  const calorieRingCircumference = 2 * Math.PI * calorieRingRadius;

  return (
    <LinearGradient colors={['#FFFFFF', '#F2F8F4']} style={styles.card}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.cardTitle}>Dinh dưỡng hôm nay</Text>
          <Text style={styles.cardSubtitle}>
            Tính từ các món đã xác nhận đã ăn
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color={COLORS.green} size="small" />
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{error}</Text>
          {isLoggedIn ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.nutritionSummary}>
            <View
              accessibilityLabel={`Đã tiêu thụ ${formatNumberWithOptionalDecimal(
                nutrition?.calories ?? 0,
              )} kilocalo${
                hasCalorieTarget
                  ? `, ${Math.round(
                      calorieRingProgress * 100,
                    )} phần trăm mục tiêu`
                  : ''
              }`}
              style={styles.calorieRing}
            >
              <Svg
                width={calorieRingSize}
                height={calorieRingSize}
                viewBox={`0 0 ${calorieRingSize} ${calorieRingSize}`}
              >
                <Circle
                  cx={calorieRingSize / 2}
                  cy={calorieRingSize / 2}
                  r={calorieRingRadius}
                  stroke="#E8EEE9"
                  strokeWidth={5}
                  fill="none"
                />
                <Circle
                  cx={calorieRingSize / 2}
                  cy={calorieRingSize / 2}
                  r={calorieRingRadius}
                  stroke={COLORS.green}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={`${calorieRingCircumference} ${calorieRingCircumference}`}
                  strokeDashoffset={
                    calorieRingCircumference * (1 - calorieRingProgress)
                  }
                  rotation={-90}
                  origin={`${calorieRingSize / 2}, ${calorieRingSize / 2}`}
                  fill="none"
                />
              </Svg>
              <View style={styles.calorieRingText}>
                <Text numberOfLines={1} style={styles.calorieRingValue}>
                  {formatNumberWithOptionalDecimal(nutrition?.calories ?? 0)}
                </Text>
                <Text style={styles.calorieRingLabel}>kcal</Text>
              </View>
            </View>
            <View style={styles.macroList}>
              {MACROS.map(macro => {
                const target = macroTargets[macro.id] ?? null;
                const value = nutrition?.[macro.id] ?? 0;
                const percentage =
                  target != null && target > 0
                    ? Math.round((value / target) * 100)
                    : null;
                return (
                  <MacroProgressRow
                    key={macro.id}
                    label={macro.label}
                    value={value}
                    marker={macro.marker}
                    target={target}
                    percentage={percentage}
                    color={macro.color}
                  />
                );
              })}
            </View>
          </View>
          {hasCalorieTarget ? (
            <Text style={styles.calorieTargetCaption}>
              Mục tiêu {formatNumberWithOptionalDecimal(calorieTarget)} kcal/ngày
              {caloriesRemaining === 0
                ? ' · Đã đạt mục tiêu'
                : ` · Còn ${formatNumberWithOptionalDecimal(
                    caloriesRemaining ?? 0,
                  )} kcal`}
            </Text>
          ) : (
            <Text style={styles.helperText}>
              Cập nhật hồ sơ sức khỏe để đặt mục tiêu calo cá nhân.
            </Text>
          )}
          {unavailableNutritionItems ? (
            <Text style={styles.helperText}>
              {unavailableNutritionItems} món đã ăn thiếu dữ liệu dinh dưỡng
              nên chưa được cộng vào tổng.
            </Text>
          ) : null}
        </>
      )}
    </LinearGradient>
  );
};

export default memo(HomeNutritionCard);

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    overflow: 'hidden',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
  },
  nutritionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  calorieRing: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieRingText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 56,
  },
  calorieRingValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  calorieRingLabel: {
    marginTop: 1,
    color: COLORS.secondary,
    fontSize: 8,
  },
  macroList: {
    flex: 1,
    gap: 9,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroMarker: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  macroMarkerText: {
    fontSize: 9,
    fontWeight: '800',
  },
  macroDetails: {
    flex: 1,
    gap: 3,
  },
  macroHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  macroLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '600',
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  macroAmount: {
    fontSize: 9,
    fontWeight: '700',
  },
  macroPercentage: {
    minWidth: 24,
    color: COLORS.secondary,
    fontSize: 8,
    textAlign: 'right',
  },
  macroTrack: {
    height: 4,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#EEF1EF',
  },
  macroFill: {
    height: '100%',
    borderRadius: 12,
  },
  calorieTargetCaption: {
    marginTop: 9,
    color: COLORS.secondary,
    fontSize: 9,
    textAlign: 'center',
  },
  helperText: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  messageBox: {
    paddingVertical: 10,
  },
  messageText: {
    color: '#A43C36',
    fontSize: 11,
    lineHeight: 16,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
  },
  retryText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
});
