import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CommunityMealNutrition } from '../../utils/types/communityMeal';

type CommunityNutritionSummaryProps = {
  nutrition: CommunityMealNutrition;
};

const CommunityNutritionSummary = ({
  nutrition,
}: CommunityNutritionSummaryProps) => (
  <View style={styles.panel}>
    <Text style={styles.title}>Dinh dưỡng ước tính / khẩu phần</Text>
    <View style={styles.row}>
      <Text style={styles.label}>Năng lượng</Text>
      <Text style={styles.value}>
        {Math.round(nutrition.caloriesKcal)} kcal
      </Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.label}>Protein</Text>
      <Text style={styles.value}>{nutrition.proteinG.toFixed(1)} g</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.label}>Carbohydrate</Text>
      <Text style={styles.value}>{nutrition.carbohydratesG.toFixed(1)} g</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.label}>Chất béo</Text>
      <Text style={styles.value}>{nutrition.fatG.toFixed(1)} g</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.label}>Chất xơ</Text>
      <Text style={styles.value}>
        {nutrition.fiberG === null
          ? 'Chưa ước tính'
          : `${nutrition.fiberG.toFixed(1)} g`}
      </Text>
    </View>
    <Text style={styles.confidence}>
      Độ tin cậy:{' '}
      {nutrition.confidence === 'HIGH'
        ? 'cao'
        : nutrition.confidence === 'MEDIUM'
          ? 'trung bình'
          : 'thấp'}
    </Text>
    {nutrition.notes.length > 0 ? (
      <Text style={styles.note}>{nutrition.notes.join(' ')}</Text>
    ) : null}
    <Text style={styles.disclaimer}>
      Đây là ước tính tham khảo, không thay thế tư vấn dinh dưỡng chuyên môn.
    </Text>
  </View>
);

export default CommunityNutritionSummary;

const styles = StyleSheet.create({
  panel: {
    gap: 9,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#F0F7F1',
    borderWidth: 1,
    borderColor: '#DBE9DD',
  },
  title: {
    marginBottom: 2,
    color: '#172B23',
    fontSize: 15,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D5E2D8',
  },
  label: {
    color: '#66756D',
    fontSize: 13,
  },
  value: {
    color: '#244C36',
    fontSize: 13,
    fontWeight: '700',
  },
  confidence: {
    color: '#567362',
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    color: '#66756D',
    fontSize: 12,
    lineHeight: 17,
  },
  disclaimer: {
    color: '#829087',
    fontSize: 11,
    lineHeight: 15,
  },
});
