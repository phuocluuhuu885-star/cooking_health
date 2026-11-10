import { Alert } from 'react-native';
import { localStorage } from './storage';

export const requestAiRecommendationConsent = (onAccept: () => void) => {
  Alert.alert(
    'Đồng ý dùng gợi ý AI?',
    'Nếu tiếp tục, Health&Cook sẽ gửi mục tiêu kcal và dinh dưỡng, tổng món đã ăn hôm nay cùng thông tin các món phù hợp đến Google Gemini để xếp hạng. Không gửi tên, email, mã tài khoản, tuổi, giới tính, chiều cao, cân nặng hoặc BMI. Bạn có thể từ chối và vẫn xem gợi ý món thông thường.',
    [
      { text: 'Để sau', style: 'cancel' },
      {
        text: 'Đồng ý và tiếp tục',
        onPress: onAccept,
      },
    ],
  );
};

const getConsentKey = (userId: string) =>
  `ai-meal-recommendation-consent:${userId}`;

export const hasAiRecommendationConsent = (userId: string) =>
  localStorage.getBoolean(getConsentKey(userId)) === true;

export const saveAiRecommendationConsent = (
  userId: string,
  accepted: boolean,
) => {
  localStorage.set(getConsentKey(userId), accepted);
};
