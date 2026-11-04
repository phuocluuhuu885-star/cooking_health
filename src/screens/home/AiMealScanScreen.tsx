import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import LinearGradient from '../../components/LinearGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import type {
  AiMealScanNutrition,
  AiMealScanResponse,
  AiMealScanResult,
} from '../../utils/types';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import ScreenHeader from '../component/ScreenHeader';

type SelectedImage = {
  uri: string;
  base64: string;
  mimeType: string;
};

const MAX_IMAGE_BYTES = 512 * 1024;

type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

const detectImageType = (base64: string): SupportedImageType | null => {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return null;
};

const getImageSizeBytes = (base64: string) => {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const getNutritionError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    const response = error as { message?: unknown; ErrorMessage?: unknown };
    if (typeof response.message === 'string') return response.message;
    if (typeof response.ErrorMessage === 'string') return response.ErrorMessage;
  }
  return 'Không thể phân tích ảnh lúc này. Vui lòng thử lại.';
};

const confidenceLabel: Record<
  AiMealScanResult['components'][number]['confidence'],
  string
> = {
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

const NutritionRow = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) => (
  <View style={styles.nutritionRow}>
    <Text style={styles.nutritionLabel}>{label}</Text>
    <Text style={styles.nutritionValue}>
      {value === null
        ? 'Chưa ước tính'
        : `${Math.round(value * 10) / 10} ${unit}`}
    </Text>
  </View>
);

const NutritionList = ({ nutrition }: { nutrition: AiMealScanNutrition }) => (
  <View style={styles.nutritionList}>
    <NutritionRow
      label="Năng lượng"
      value={nutrition.caloriesKcal}
      unit="kcal"
    />
    <NutritionRow label="Protein" value={nutrition.proteinG} unit="g" />
    <NutritionRow
      label="Carbohydrate"
      value={nutrition.carbohydratesG}
      unit="g"
    />
    <NutritionRow label="Chất béo" value={nutrition.fatG} unit="g" />
    <NutritionRow label="Chất xơ" value={nutrition.fiberG} unit="g" />
  </View>
);

const AiMealScanScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [result, setResult] = useState<AiMealScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chooseImage = async (source: 'camera' | 'library') => {
    setError('');
    const pickerOptions = {
      mediaType: 'photo' as const,
      selectionLimit: 1,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.7 as const,
      includeBase64: true,
      assetRepresentationMode: 'compatible' as const,
    };
    let response: ImagePickerResponse;
    try {
      response =
        source === 'camera'
          ? await launchCamera(pickerOptions)
          : await launchImageLibrary(pickerOptions);
    } catch (pickerError) {
      setError(getNutritionError(pickerError));
      return;
    }

    if (response.didCancel) return;
    if (response.errorCode) {
      setError(
        response.errorMessage || 'Không thể mở camera hoặc thư viện ảnh.',
      );
      return;
    }

    const asset: Asset | undefined = response.assets?.[0];
    if (!asset?.uri || !asset.base64) {
      setError('Không đọc được ảnh. Vui lòng chọn hoặc chụp ảnh khác.');
      return;
    }
    const detectedType = detectImageType(asset.base64);
    if (!detectedType) {
      setError('Ảnh cần ở định dạng JPEG, PNG hoặc WebP.');
      return;
    }
    if (getImageSizeBytes(asset.base64) > MAX_IMAGE_BYTES) {
      setError('Ảnh sau khi nén vượt quá 512 KB. Hãy chọn ảnh khác.');
      return;
    }

    setSelectedImage({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: detectedType,
    });
    setResult(null);
  };

  const onConfirmScanAI = async () => {
    if (!selectedImage || loading) return;
    if (!user?.id || !user.accessToken) {
      setError('Đăng nhập để phân tích món ăn bằng AI.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSyncUser(user);
    try {
      const response = (await syncApi(apiConst.postAiMealScan, {
        imageBase64: selectedImage.base64,
        mimeType: selectedImage.mimeType,
        consent: true,
      })) as AiMealScanResponse;
      if (!response?.success || !response.data) {
        throw new Error(
          response?.message ||
            response?.ErrorMessage ||
            'Không nhận được kết quả phân tích.',
        );
      }
      setResult(response.data);
    } catch (requestError) {
      setError(getNutritionError(requestError));
    } finally {
      setLoading(false);
    }
  };
  const analyzeImage = () => {
    Alert.alert(
      'Đồng ý phân tích ảnh?',
      'Ảnh món ăn sẽ được gửi đến Google Gemini để nhận diện và ước tính thành phần, khẩu phần cùng dinh dưỡng. Ảnh không được lưu vào nhật ký HealthAndCook. Kết quả chỉ mang tính tham khảo và có thể không chính xác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý và phân tích',
          onPress: onConfirmScanAI,
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="HEALTH AI COACH"
        title="Quét món ăn"
        subtitle="Ước tính thành phần và dinh dưỡng từ ảnh"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Kết quả là ước tính</Text>
          <Text style={styles.noticeText}>
            Ảnh không cho biết chính xác nguyên liệu, khối lượng hay cách chế
            biến. Hãy dùng kết quả để tham khảo, không thay thế dữ liệu cân đo
            hoặc tư vấn y tế.
          </Text>
        </View>

        {selectedImage ? (
          <Image
            accessibilityLabel="Ảnh món ăn đã chọn"
            source={{ uri: selectedImage.uri }}
            style={styles.preview}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>＋</Text>
            <Text style={styles.placeholderText}>
              Chụp món ăn hoặc chọn ảnh từ thư viện
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => chooseImage('camera')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Chụp ảnh</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => chooseImage('library')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Chọn ảnh</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!selectedImage || loading}
          onPress={analyzeImage}
          style={({ pressed }) => [
            styles.analyzeButton,
            (!selectedImage || loading) && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.analyzeButtonText}>Phân tích món ăn</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result ? (
          <View style={styles.resultArea}>
            {!result.recognized ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Chưa nhận diện được món</Text>
                <Text style={styles.resultDescription}>
                  Hãy thử chụp ảnh rõ hơn, đủ sáng và tập trung vào món ăn.
                </Text>
              </View>
            ) : (
              <>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  style={styles.resultCard}
                >
                  <Text style={styles.sectionEyebrow}>MÓN ĂN NHẬN DIỆN</Text>
                  <Text style={styles.resultTitle}>
                    {result.dishName || 'Món ăn'}
                  </Text>
                  <Text style={styles.sectionTitle}>
                    Tổng dinh dưỡng ước tính
                  </Text>
                  <NutritionList nutrition={result.totalNutrition} />
                </LinearGradient>

                {result.components.length ? (
                  <View style={styles.resultCard}>
                    <Text style={styles.sectionTitle}>
                      Thành phần nhìn thấy
                    </Text>
                    {result.components.map((component, index) => (
                      <View
                        key={`${component.name}-${index}`}
                        style={styles.component}
                      >
                        <View style={styles.componentHeading}>
                          <View style={styles.componentCopy}>
                            <Text style={styles.componentName}>
                              {component.name}
                            </Text>
                            <Text style={styles.componentDescription}>
                              {component.estimatedAmount}
                              {component.estimatedWeightG !== null
                                ? ` · khoảng ${Math.round(
                                    component.estimatedWeightG,
                                  )} g`
                                : ''}
                            </Text>
                          </View>
                          <Text style={styles.confidence}>
                            Độ tin cậy {confidenceLabel[component.confidence]}
                          </Text>
                        </View>
                        <NutritionList nutrition={component.nutrition} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            )}

            {result.notes.map((note, index) => (
              <Text key={`${note}-${index}`} style={styles.note}>
                • {note}
              </Text>
            ))}
            <Text style={styles.disclaimer}>
              Giá trị dinh dưỡng do AI ước tính từ ảnh, không phải dữ liệu cân
              đo hoặc phân tích phòng thí nghiệm.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default AiMealScanScreen;

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
  content: { gap: 14, paddingTop: 8 },
  notice: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  noticeTitle: { color: COLORS.green, fontSize: 13, fontWeight: '800' },
  noticeText: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  preview: {
    width: '100%',
    height: 245,
    borderRadius: 14,
    backgroundColor: COLORS.border,
  },
  imagePlaceholder: {
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B8C7BE',
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  placeholderIcon: { color: COLORS.green, fontSize: 34, fontWeight: '400' },
  placeholderText: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 13,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  analyzeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  analyzeButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  resultArea: { gap: 12, paddingBottom: 8 },
  resultCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  sectionEyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  resultTitle: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  resultDescription: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  nutritionList: { gap: 7 },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  nutritionLabel: { color: COLORS.secondary, fontSize: 12 },
  nutritionValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  component: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  componentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  componentCopy: { flex: 1 },
  componentName: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  componentDescription: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 11,
  },
  confidence: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
  note: { color: COLORS.secondary, fontSize: 11, lineHeight: 16 },
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
