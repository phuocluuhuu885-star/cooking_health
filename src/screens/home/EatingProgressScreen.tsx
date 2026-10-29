import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import ScreenHeader from '../component/ScreenHeader';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { getUtcDateKey } from '../../utils/dateUtils';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';
import type { ConsumptionReportData } from '../../utils/types';

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const EatingProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const requestId = useRef(0);
  const [report, setReport] = useState<ConsumptionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken) {
      setLoading(false);
      setError('Đăng nhập để xem tiến độ dinh dưỡng của bạn.');
      return;
    }
    setSyncUser(user);
    setLoading(true);
    setError('');
    try {
      const response = await syncApi(apiConst.getConsumptionReport, {
        period: 'MONTH',
        date: getUtcDateKey(new Date()),
      });
      if (currentRequestId !== requestId.current) return;
      if (!response?.success || !response.data) {
        setError(response?.message || 'Không thể tải báo cáo dinh dưỡng.');
        return;
      }
      setReport(response.data);
    } catch (loadError) {
      if (currentRequestId !== requestId.current) return;
      console.error('Failed to load eating progress report', loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể kết nối để tải báo cáo.',
      );
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
      return () => {
        requestId.current += 1;
      };
    }, [loadReport]),
  );

  const analysis = useMemo(() => {
    const activeDays =
      report?.days.filter(
        day =>
          day.consumedItems > 0 &&
          day.unavailableNutritionItems === 0 &&
          day.nutrition.calories > 0,
      ) ?? [];
    const recentDays = activeDays.slice(-7);
    const target = user?.healthProfile?.dailyCaloriesTarget ?? 0;
    const averageCalories = recentDays.length
      ? recentDays.reduce((sum, day) => sum + day.nutrition.calories, 0) /
        recentDays.length
      : 0;
    const inTargetDays =
      target > 0
        ? recentDays.filter(
            day =>
              day.nutrition.calories >= target * 0.9 &&
              day.nutrition.calories <= target * 1.1,
          ).length
        : 0;
    const first = recentDays[0];
    const last = recentDays[recentDays.length - 1];
    const calorieChange =
      first && last && first.date !== last.date
        ? last.nutrition.calories - first.nutrition.calories
        : null;
    return {
      activeDays,
      recentDays,
      target,
      averageCalories,
      inTargetDays,
      calorieChange,
    };
  }, [report, user?.healthProfile?.dailyCaloriesTarget]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="MEALCRAFT AI COACH"
        title="Tiến độ ăn uống"
        subtitle="Tổng quan 7 ngày gần nhất"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : error ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={loadReport} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử tải lại</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <>
            <LinearGradient
              colors={['#FFFFFF', '#EAF6EE']}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>
                TRUNG BÌNH KHI CÓ GHI NHẬN
              </Text>
              <Text style={styles.average}>
                {formatNumberWithOptionalDecimal(analysis.averageCalories)}
                <Text style={styles.unit}> kcal/ngày</Text>
              </Text>
              <Text style={styles.summaryHint}>
                Tính trên {analysis.recentDays.length} ngày có dữ liệu đầy đủ
                trong 7 ngày gần nhất.
              </Text>
              {analysis.target > 0 ? (
                <View style={styles.targetRow}>
                  <Text style={styles.targetText}>
                    Mục tiêu {analysis.target} kcal/ngày
                  </Text>
                  <Text style={styles.targetText}>
                    {analysis.inTargetDays}/{analysis.recentDays.length} ngày
                    trong khoảng ±10%
                  </Text>
                </View>
              ) : null}
            </LinearGradient>

            <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
              <Text style={styles.cardTitle}>Lượng calo theo ngày</Text>
              {analysis.recentDays.length ? (
                analysis.recentDays.map(day => {
                  const progress =
                    analysis.target > 0
                      ? Math.min(day.nutrition.calories / analysis.target, 1)
                      : 0;
                  return (
                    <View key={day.date} style={styles.dayRow}>
                      <Text style={styles.dayLabel}>
                        {formatDate(day.date)}
                      </Text>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.bar,
                            { width: `${Math.max(progress * 100, 2)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.dayCalories}>
                        {Math.round(day.nutrition.calories)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.empty}>
                  Chưa có đủ dữ liệu để phân tích. Ghi nhận món đã ăn để bắt đầu
                  theo dõi.
                </Text>
              )}
              {analysis.calorieChange !== null ? (
                <Text style={styles.change}>
                  So với ngày đầu trong khoảng này:{' '}
                  {analysis.calorieChange > 0 ? '+' : ''}
                  {Math.round(analysis.calorieChange)} kcal.
                </Text>
              ) : null}
            </LinearGradient>

            <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
              <Text style={styles.cardTitle}>Trung bình dinh dưỡng</Text>
              {analysis.recentDays.length ? (
                <View style={styles.macros}>
                  {(
                    [
                      ['Đạm', 'proteinG'],
                      ['Tinh bột', 'carbsG'],
                      ['Chất béo', 'fatG'],
                    ] as const
                  ).map(([label, key]) => {
                    const average =
                      analysis.recentDays.reduce(
                        (sum, day) => sum + day.nutrition[key],
                        0,
                      ) / analysis.recentDays.length;
                    return (
                      <View key={key} style={styles.macro}>
                        <Text style={styles.macroLabel}>{label}</Text>
                        <Text style={styles.macroValue}>
                          {formatNumberWithOptionalDecimal(average)} g
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.empty}>
                  Chưa có dữ liệu dinh dưỡng để tổng hợp.
                </Text>
              )}
            </LinearGradient>
            {report?.days.some(day => day.unavailableNutritionItems > 0) ? (
              <Text style={styles.note}>
                Ngày có món thiếu dữ liệu dinh dưỡng không được dùng để tính
                trung bình.
              </Text>
            ) : null}
          </>
        )}
        <Text style={styles.disclaimer}>
          Thống kê phản ánh những gì bạn đã ghi nhận, không phải chẩn đoán hay
          tư vấn y tế.
        </Text>
      </ScrollView>
    </View>
  );
};

export default EatingProgressScreen;

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 42,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  backText: {
    color: COLORS.green,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { marginTop: 2, color: COLORS.text, fontSize: 19, fontWeight: '800' },
  subtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 11 },
  content: { paddingTop: 8 },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    padding: 17,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  average: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '900',
  },
  unit: { fontSize: 13, fontWeight: '700' },
  summaryHint: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  targetText: {
    flexShrink: 1,
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    padding: 15,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    marginBottom: 12,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 11,
  },
  dayLabel: { width: 64, color: COLORS.secondary, fontSize: 10 },
  track: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#EAF0EC',
  },
  bar: { height: '100%', borderRadius: 8, backgroundColor: COLORS.green },
  dayCalories: {
    width: 40,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  change: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  macros: { flexDirection: 'row', gap: 6 },
  macro: {
    flex: 1,
    padding: 9,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
  },
  macroLabel: { color: COLORS.secondary, fontSize: 10 },
  macroValue: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  empty: { color: COLORS.secondary, fontSize: 11, lineHeight: 17 },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 9 },
  retryText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  note: {
    marginBottom: 10,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  disclaimer: {
    paddingVertical: 8,
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
