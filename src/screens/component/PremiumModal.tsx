import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from '../../components/LinearGradient';

type PremiumPlan = 'MONTHLY' | 'YEARLY';

type PremiumModalProps = {
  visible: boolean;
  onClose: () => void;
};

const BENEFITS = [
  'Gợi ý thực đơn phù hợp mục tiêu sức khỏe',
  'Theo dõi dinh dưỡng và kế hoạch bữa ăn thuận tiện',
  'Khám phá thêm công cụ chăm sóc sức khỏe',
];

const BenefitRow = ({ title }: { title: string }) => (
  <View style={styles.benefitRow}>
    <View style={styles.benefitCheck}>
      <Text style={styles.benefitCheckText}>✓</Text>
    </View>
    <Text style={styles.benefitText}>{title}</Text>
  </View>
);

const PlanOption = ({
  plan,
  selected,
  onSelect,
}: {
  plan: PremiumPlan;
  selected: boolean;
  onSelect: (plan: PremiumPlan) => void;
}) => {
  const isYearly = plan === 'YEARLY';
  const handlePress = useCallback(() => {
    onSelect(plan);
  }, [onSelect, plan]);
  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.planOption,
      selected && (isYearly ? styles.yearlyPlanSelected : styles.planOptionSelected),
      pressed && styles.pressed,
    ],
    [isYearly, selected],
  );

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={handlePress}
      style={getStyle}
    >
      {selected && isYearly ? (
        <LinearGradient
          colors={['#145D3E', '#0D4931']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.planTopRow}>
        <View
          style={[
            styles.planBadge,
            selected && isYearly && styles.planBadgeFeatured,
            selected && !isYearly && styles.planBadgeSelected,
          ]}
        >
          <Text
            style={[
              styles.planBadgeIcon,
              selected && isYearly && styles.planBadgeIconFeatured,
            ]}
          >
            {isYearly ? '✦' : '✧'}
          </Text>
          <Text
            style={[
              styles.planBadgeText,
              selected && isYearly && styles.planBadgeTextFeatured,
              selected && !isYearly && styles.planBadgeTextSelected,
            ]}
          >
            {isYearly ? 'LỰA CHỌN NỔI BẬT' : 'LINH HOẠT'}
          </Text>
        </View>
        <View
          style={[
            styles.radio,
            selected && styles.radioSelected,
            selected && isYearly && styles.radioFeatured,
          ]}
        >
          {selected ? (
            <View
              style={[
                styles.radioDot,
                selected && isYearly && styles.radioDotFeatured,
              ]}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.planBottomRow}>
        <View style={styles.planCopy}>
          <Text
            style={[
              styles.planTitle,
              selected && isYearly && styles.planTitleFeatured,
            ]}
          >
            {isYearly ? 'Gói 12 tháng' : 'Gói 1 tháng'}
          </Text>
          <Text
            style={[
              styles.planDescription,
              selected && isYearly && styles.planDescriptionFeatured,
            ]}
          >
            {isYearly ? 'Đồng hành trọn vẹn cả năm' : 'Trải nghiệm theo tháng'}
          </Text>
        </View>
        <Text
          style={[
            styles.planPrice,
            selected && isYearly && styles.planPriceFeatured,
          ]}
        >
          Sắp ra mắt
        </Text>
      </View>
    </Pressable>
  );
};

const PremiumModal = ({ visible, onClose }: PremiumModalProps) => {
  const { height } = useWindowDimensions();
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan>('YEARLY');
  const maxHeight = Math.min(height * 0.9, 760);

  const handleContinue = useCallback(() => {
    Alert.alert(
      'Premium sắp ra mắt',
      'Thanh toán chưa được tích hợp. Bạn sẽ không bị tính phí khi chọn gói.',
    );
  }, []);

  const renderBenefit = useCallback(
    (benefit: string) => <BenefitRow key={benefit} title={benefit} />,
    [],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight }]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={['#145D3E', '#168653', '#2CA36D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng giới thiệu Premium"
                hitSlop={10}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
              <View style={styles.premiumMark}>
                <Text style={styles.premiumMarkText}>✦</Text>
              </View>
              <Text style={styles.eyebrow}>HEALTHANDCOOK</Text>
              <Text style={styles.title}>Nâng tầm hành trình khỏe mạnh</Text>
              <Text style={styles.subtitle}>
                Khám phá trải nghiệm Premium dành riêng cho bạn.
              </Text>
            </LinearGradient>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Premium có gì?</Text>
              <View style={styles.benefits}>{BENEFITS.map(renderBenefit)}</View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn gói phù hợp</Text>
              <View style={styles.plans}>
                <PlanOption
                  plan="YEARLY"
                  selected={selectedPlan === 'YEARLY'}
                  onSelect={setSelectedPlan}
                />
                <PlanOption
                  plan="MONTHLY"
                  selected={selectedPlan === 'MONTHLY'}
                  onSelect={setSelectedPlan}
                />
              </View>
              <Text style={styles.priceNote}>
                Giá và thông tin thanh toán sẽ được cập nhật khi Premium ra mắt.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleContinue}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Tiếp tục</Text>
              <Text style={styles.primaryButtonArrow}>→</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.laterButton}
            >
              <Text style={styles.laterText}>Để sau</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default PremiumModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(17, 35, 27, 0.58)',
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 12,
  },
  hero: {
    minHeight: 224,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 25,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeText: {
    marginTop: -2,
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '300',
  },
  premiumMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  premiumMarkText: {
    color: '#FCE7A2',
    fontSize: 27,
  },
  eyebrow: {
    color: '#C8F0D8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    maxWidth: 320,
    marginTop: 7,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 7,
    color: '#E4F6EB',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 19,
  },
  sectionTitle: {
    color: '#172B23',
    fontSize: 15,
    fontWeight: '800',
  },
  benefits: {
    gap: 12,
    marginTop: 13,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitCheck: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#E7F4EC',
  },
  benefitCheckText: {
    color: '#168653',
    fontSize: 13,
    fontWeight: '800',
  },
  benefitText: {
    flex: 1,
    color: '#40554A',
    fontSize: 12,
    lineHeight: 17,
  },
  plans: {
    gap: 9,
    marginTop: 12,
  },
  planOption: {
    minHeight: 104,
    justifyContent: 'center',
    gap: 11,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  planOptionSelected: {
    borderColor: '#168653',
    backgroundColor: '#F1FAF4',
  },
  yearlyPlanSelected: {
    borderColor: '#D8B75A',
    backgroundColor: '#145D3E',
    shadowColor: '#A47C21',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 4,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planBadge: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: '#F3F5F4',
  },
  planBadgeFeatured: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  planBadgeSelected: {
    backgroundColor: '#E4F4EA',
  },
  planBadgeIcon: {
    color: '#A47C21',
    fontSize: 12,
  },
  planBadgeIconFeatured: {
    color: '#F4D783',
  },
  planBadgeText: {
    color: '#718078',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  planBadgeTextFeatured: {
    color: '#F4D783',
  },
  planBadgeTextSelected: {
    color: '#168653',
  },
  planBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#B8C6BE',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  radioSelected: {
    borderColor: '#168653',
  },
  radioFeatured: {
    borderColor: '#F4D783',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#168653',
  },
  radioDotFeatured: {
    backgroundColor: '#F4D783',
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
  },
  planTitle: {
    color: '#263A31',
    fontSize: 15,
    fontWeight: '800',
  },
  planTitleFeatured: {
    color: '#FFFFFF',
  },
  planDescription: {
    marginTop: 3,
    color: '#879A90',
    fontSize: 11,
  },
  planDescriptionFeatured: {
    color: '#D3E8DC',
  },
  planPrice: {
    maxWidth: 88,
    color: '#168653',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'right',
  },
  planPriceFeatured: {
    color: '#F4D783',
  },
  priceNote: {
    marginTop: 9,
    color: '#879A90',
    fontSize: 10,
    lineHeight: 15,
  },
  primaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginHorizontal: 20,
    marginTop: 19,
    borderRadius: 8,
    backgroundColor: '#168653',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 20,
  },
  laterButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  laterText: {
    color: '#66756D',
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
