import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from '../../components/LinearGradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = {
  onMealSuggestions: () => void;
  onWeeklyPlan: () => void;
  onProgressAnalysis: () => void;
  onSmartShopping: () => void;
  onAiChat: () => void;
  onMealScan: () => void;
};

const FEATURES = [
  {
    icon: 'meal',
    title: 'Gợi ý bữa ăn',
    subtitle: 'Dựa trên dinh dưỡng còn thiếu',
  },
  {
    icon: 'calendar',
    title: 'Lên thực đơn',
    subtitle: 'Kế hoạch ăn uống 7 ngày',
  },
  {
    icon: 'chart',
    title: 'Phân tích tiến độ',
    subtitle: 'Hiểu thói quen ăn uống',
  },
  {
    icon: 'cart',
    title: 'Đi chợ thông minh',
    subtitle: 'Tổng hợp nguyên liệu',
  },
  {
    icon: 'chat',
    title: 'Hỏi đáp AI',
    subtitle: 'Hỏi về thực đơn và dinh dưỡng',
  },
  {
    icon: 'scan',
    title: 'Quét món ăn',
    subtitle: 'Ước tính thành phần và calo',
  },
] as const;

const FeatureIcon = ({ kind }: { kind: (typeof FEATURES)[number]['icon'] }) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={COLORS.green}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {kind === 'scan' ? (
      <>
        <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
        <Path d="M8 12h8M12 8v8" />
      </>
    ) : kind === 'meal' ? (
      <Path d="M5 3v7M8 3v7M11 3v7M5 7h6M8 10v11M17 3v18M17 3c3 2 3 6 0 8" />
    ) : kind === 'calendar' ? (
      <>
        <Rect x="3" y="5" width="18" height="16" rx="2" />
        <Path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01" />
      </>
    ) : kind === 'chart' ? (
      <Path d="M3 20h18M5 16v-4M10 16V9M15 16v-6M20 16V4M4 10l5-4 4 2 6-5" />
    ) : kind === 'cart' ? (
      <>
        <Path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.4L22 9H6" />
        <Circle cx="10" cy="20" r="1" />
        <Circle cx="18" cy="20" r="1" />
      </>
    ) : (
      <>
        <Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-6.5A2.5 2.5 0 0 1 4 11z" />
        <Path d="M8 8h8M8 11h5" />
      </>
    )}
  </Svg>
);

const AICoachBox = ({
  onMealSuggestions,
  onWeeklyPlan,
  onProgressAnalysis,
  onSmartShopping,
  onAiChat,
  onMealScan,
}: Props) => {
  const actions = [
    onMealSuggestions,
    onWeeklyPlan,
    onProgressAnalysis,
    onSmartShopping,
    onAiChat,
    onMealScan,
  ];

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F3FAF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.box}
    >
      <View style={styles.heading}>
        <View style={styles.sparkle}>
          <Text style={styles.sparkleText}>✧</Text>
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>HEALTH AI Coach</Text>
          <Text style={styles.subtitle}>Trợ lý dinh dưỡng cá nhân của bạn</Text>
        </View>
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>Premium</Text>
        </View>
      </View>

      <Text style={styles.prompt}>Hôm nay bạn cần hỗ trợ gì?</Text>
      <View style={styles.grid}>
        {FEATURES.map((feature, index) => (
          <Pressable
            key={feature.title}
            accessibilityRole="button"
            accessibilityLabel={`${feature.title}. ${feature.subtitle}`}
            onPress={actions[index]}
            style={({ pressed }) => [
              styles.feature,
              pressed && styles.featurePressed,
            ]}
          >
            <FeatureIcon kind={feature.icon} />
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text numberOfLines={2} style={styles.featureSubtitle}>
              {feature.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.disclaimer}>
        Gợi ý dựa trên dữ liệu dinh dưỡng và món ăn có trong Health&Cook chỉ mang
        tính tham khảo, không thay thế tư vấn y tế.
      </Text>
    </LinearGradient>
  );
};

export default memo(AICoachBox);

const COLORS = {
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
};

const styles = StyleSheet.create({
  box: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sparkle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.lightGreen,
  },
  sparkleText: { color: COLORS.green, fontSize: 24, lineHeight: 27 },
  headingCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  subtitle: { marginTop: 2, color: COLORS.secondary, fontSize: 11 },
  premiumBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
  },
  premiumText: { color: COLORS.green, fontSize: 10, fontWeight: '800' },
  prompt: {
    marginTop: 14,
    marginBottom: 9,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feature: {
    width: '48.5%',
    minHeight: 100,
    justifyContent: 'center',
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  featurePressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  featureTitle: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  featureSubtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  disclaimer: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
});
