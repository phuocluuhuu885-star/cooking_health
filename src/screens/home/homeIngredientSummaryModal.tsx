import React, { memo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeIngredientSummaryModalProps } from '../../utils/types';
import {
  formatLocalizedNumber,
  formatLocalizedWeight,
} from '../../utils/numberUtils';

const HomeIngredientSummaryModal = memo(
  (props: HomeIngredientSummaryModalProps) => {
    const insets = useSafeAreaInsets();
    const {
      visible,
      selectedMeals,
      ingredients,
      loading,
      error,
      onClose,
      onRetry,
    } = props;
    const totalServings = selectedMeals.reduce(
      (total, meal) => total + meal.servings,
      0,
    );
    const totalAmountG = ingredients.reduce(
      (total, ingredient) => total + ingredient.amountG,
      0,
    );

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View
            style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}
          >
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>CHUẨN BỊ BỮA ĂN</Text>
              <Text style={styles.title}>Danh sách nguyên liệu</Text>
              <Text style={styles.subtitle}>
                {selectedMeals.length} món ·{' '}
                {formatLocalizedNumber(totalServings)} khẩu
                phần
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng danh sách nguyên liệu"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F2F8F4']}
              style={styles.mealsCard}
            >
              <View style={styles.cardHeading}>
                <View style={styles.headingCopy}>
                  <Text style={styles.sectionTitle}>Món trong bữa</Text>
                  <Text style={styles.sectionSubtitle}>
                    Định lượng được tính theo khẩu phần đã chọn
                  </Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {selectedMeals.length}
                  </Text>
                </View>
              </View>
              {selectedMeals.map((meal, index) => (
                <View
                  key={meal.id}
                  style={[styles.mealRow, index === 0 && styles.firstMealRow]}
                >
                  <View style={styles.mealNumber}>
                    <Text style={styles.mealNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealServings}>
                    {formatLocalizedNumber(meal.servings)} phần
                  </Text>
                </View>
              ))}
            </LinearGradient>

            <LinearGradient
              colors={['#FFFFFF', '#F2F8F4']}
              style={styles.ingredientsCard}
            >
              <View style={styles.cardHeading}>
                <View style={styles.headingCopy}>
                  <Text style={styles.sectionTitle}>Cần chuẩn bị</Text>
                  <Text style={styles.sectionSubtitle}>
                    Nguyên liệu trùng tên đã được gộp
                  </Text>
                </View>
                {!loading && !error && ingredients.length > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {ingredients.length}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!loading && !error && ingredients.length > 0 ? (
                <LinearGradient
                  colors={['#F2F8F4', '#E7F4EC']}
                  style={styles.summaryStats}
                >
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{ingredients.length}</Text>
                    <Text style={styles.statLabel}>loại nguyên liệu</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>
                      {formatLocalizedWeight(totalAmountG)}
                    </Text>
                    <Text style={styles.statLabel}>tổng khối lượng</Text>
                  </View>
                </LinearGradient>
              ) : null}

              {loading ? (
                <View style={styles.status}>
                  <ActivityIndicator color="#168653" />
                  <Text style={styles.statusText}>
                    Đang tính định lượng nguyên liệu...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.errorState}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Thử tải lại</Text>
                  </Pressable>
                </View>
              ) : ingredients.length > 0 ? (
                <View style={styles.ingredientList}>
                  {ingredients.map((ingredient, index) => (
                    <View
                      key={ingredient.name}
                      accessible
                      accessibilityLabel={`${
                        ingredient.name
                      }, ${formatLocalizedWeight(
                        ingredient.amountG,
                      )}`}
                      style={[
                        styles.ingredientRow,
                        index === 0 && styles.firstIngredientRow,
                      ]}
                    >
                      <View style={styles.ingredientNumber}>
                        <Text style={styles.ingredientNumberText}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={styles.ingredientName}>
                        {ingredient.name}
                      </Text>
                      <View style={styles.amountBadge}>
                        <Text style={styles.ingredientAmount}>
                          {formatLocalizedWeight(ingredient.amountG)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Chưa có định lượng</Text>
                  <Text style={styles.statusText}>
                    Món đã chọn chưa có dữ liệu nguyên liệu để tổng hợp.
                  </Text>
                </View>
              )}
            </LinearGradient>
            <Text style={styles.note}>
              Khối lượng chỉ mang tính tham khảo và thay đổi theo khẩu phần từng
              món.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  },
);

export default HomeIngredientSummaryModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5EBE7',
    backgroundColor: '#FFFFFF',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    marginBottom: 5,
    color: '#168653',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#172B23',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 5,
    color: '#66756D',
    fontSize: 11,
    lineHeight: 16,
  },
  closeButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  closeText: {
    color: '#168653',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mealsCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    overflow: 'hidden',
  },
  ingredientsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    overflow: 'hidden',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headingCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: '#172B23',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: '#66756D',
    fontSize: 12,
    lineHeight: 18,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  countBadgeText: {
    color: '#168653',
    fontSize: 14,
    fontWeight: '800',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5EBE7',
  },
  firstMealRow: {
    borderTopWidth: 0,
  },
  mealNumber: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: '#F0F5F1',
  },
  mealNumberText: {
    color: '#66756D',
    fontSize: 14,
    fontWeight: '700',
  },
  mealName: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 8,
    color: '#35463D',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  mealServings: {
    color: '#66756D',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  statValue: {
    color: '#168653',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 4,
    color: '#66756D',
    fontSize: 14,
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: '#D8E4DC',
  },
  ingredientList: {
    marginTop: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5EBE7',
  },
  firstIngredientRow: {
    borderTopWidth: 0,
  },
  ingredientNumber: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: '#F5F7F5',
  },
  ingredientNumberText: {
    color: '#7A8580',
    fontSize: 14,
    fontWeight: '700',
  },
  ingredientName: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
    color: '#35463D',
    fontSize: 12,
    lineHeight: 18,
  },
  amountBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  ingredientAmount: {
    color: '#168653',
    fontSize: 12,
    fontWeight: '800',
  },
  status: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  statusText: {
    color: '#66756D',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorState: {
    paddingTop: 12,
  },
  errorText: {
    color: '#B23B36',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    marginBottom: 6,
    color: '#35463D',
    fontSize: 14,
    fontWeight: '700',
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  retryText: {
    color: '#168653',
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    marginTop: 14,
    paddingHorizontal: 4,
    color: '#66756D',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
});
