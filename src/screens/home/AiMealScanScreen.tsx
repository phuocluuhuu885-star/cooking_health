import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { invalidateCachedConsumptionReports } from '../../reduxs/reduces/appData';
import { useAppDispatch } from '../../reduxs/store';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { getVietnamDateKey } from '../../utils/dateUtils';
import { updateMealScanComponent } from '../../utils/mealScanUtils';
import type {
  AddScannedConsumedMealResponse,
  AiMealScanNutrition,
  AiMealScanResponse,
  AiMealScanResult,
  MealPeriod,
} from '../../utils/types';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import ScreenHeader from '../component/ScreenHeader';
import { useFullscreenAdOnFocus } from '../component/FullscreenAdProvider';

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

const ComponentAmountEditor = ({
  component,
  index,
  disabled,
  onChangeWeight,
  onChangeQuantity,
}: {
  component: AiMealScanResult['components'][number];
  index: number;
  disabled: boolean;
  onChangeWeight: (index: number, weightG: number) => void;
  onChangeQuantity: (index: number, quantity: number) => void;
}) => {
  const [weightDraft, setWeightDraft] = useState(
    component.estimatedWeightG === null
      ? ''
      : String(Math.round(component.estimatedWeightG)),
  );
  const [quantityDraft, setQuantityDraft] = useState(
    component.estimatedQuantity === null
      ? ''
      : String(component.estimatedQuantity),
  );

  React.useEffect(() => {
    setWeightDraft(
      component.estimatedWeightG === null
        ? ''
        : String(Math.round(component.estimatedWeightG)),
    );
    setQuantityDraft(
      component.estimatedQuantity === null
        ? ''
        : String(component.estimatedQuantity),
    );
  }, [component.estimatedQuantity, component.estimatedWeightG]);

  const handleDecreaseWeight = useCallback(() => {
    if (component.estimatedWeightG === null) return;
    const weightG = Math.max(10, Math.round(component.estimatedWeightG) - 10);
    onChangeWeight(index, weightG);
  }, [component.estimatedWeightG, index, onChangeWeight]);
  const handleIncreaseWeight = useCallback(() => {
    if (component.estimatedWeightG === null) return;
    onChangeWeight(index, Math.round(component.estimatedWeightG) + 10);
  }, [component.estimatedWeightG, index, onChangeWeight]);
  const handleSubmitWeight = useCallback(() => {
    const weightG = Number(weightDraft.replace(',', '.'));
    if (Number.isFinite(weightG) && weightG >= 10) {
      onChangeWeight(index, weightG);
      return;
    }
    setWeightDraft(
      component.estimatedWeightG === null
        ? ''
        : String(Math.round(component.estimatedWeightG)),
    );
  }, [component.estimatedWeightG, index, onChangeWeight, weightDraft]);
  const handleDecreaseQuantity = useCallback(() => {
    if (component.estimatedQuantity === null) return;
    onChangeQuantity(
      index,
      Math.max(1, component.estimatedQuantity - 1),
    );
  }, [component.estimatedQuantity, index, onChangeQuantity]);
  const handleIncreaseQuantity = useCallback(() => {
    if (component.estimatedQuantity === null) return;
    onChangeQuantity(index, component.estimatedQuantity + 1);
  }, [component.estimatedQuantity, index, onChangeQuantity]);
  const handleSubmitQuantity = useCallback(() => {
    const quantity = Number(quantityDraft.replace(',', '.'));
    if (Number.isFinite(quantity) && quantity >= 1) {
      onChangeQuantity(index, quantity);
      return;
    }
    setQuantityDraft(
      component.estimatedQuantity === null
        ? ''
        : String(component.estimatedQuantity),
    );
  }, [component.estimatedQuantity, index, onChangeQuantity, quantityDraft]);

  return (
    <View style={styles.component}>
      <View style={styles.componentHeading}>
        <View style={styles.componentCopy}>
          <Text style={styles.componentName}>{component.name}</Text>
          <Text style={styles.componentDescription}>
            {component.estimatedQuantity !== null
              ? `${component.estimatedQuantity} ${
                  component.quantityUnit || 'phần'
                }`
              : component.estimatedAmount}
            {component.estimatedWeightG !== null
              ? ` · khoảng ${Math.round(component.estimatedWeightG)} g`
              : ''}
          </Text>
        </View>
        <Text style={styles.confidence}>
          Độ tin cậy {confidenceLabel[component.confidence]}
        </Text>
      </View>

      {component.estimatedQuantity !== null ? (
        <View style={styles.amountControlRow}>
          <Text style={styles.amountControlLabel}>Số lượng</Text>
          <View style={styles.amountControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Giảm số lượng ${component.name} một đơn vị`}
              disabled={
                disabled ||
                component.estimatedQuantity <= 1
              }
              onPress={handleDecreaseQuantity}
              style={[
                styles.amountStepButton,
                (disabled || component.estimatedQuantity <= 1) &&
                  styles.amountStepButtonDisabled,
              ]}
            >
              <Text style={styles.amountStepText}>−</Text>
            </Pressable>
            <TextInput
              accessibilityLabel={`Số lượng ${component.name}`}
              editable={!disabled}
              keyboardType="decimal-pad"
              onChangeText={setQuantityDraft}
              onEndEditing={handleSubmitQuantity}
              selectTextOnFocus
              style={styles.amountValueInput}
              value={quantityDraft}
            />
            <Text style={styles.amountUnit}>
              {component.quantityUnit || 'phần'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tăng số lượng ${component.name} một đơn vị`}
              disabled={disabled}
              onPress={handleIncreaseQuantity}
              style={[
                styles.amountStepButton,
                disabled && styles.amountStepButtonDisabled,
              ]}
            >
              <Text style={styles.amountStepText}>+</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {component.estimatedWeightG !== null ? (
        <View style={styles.amountControlRow}>
          <Text style={styles.amountControlLabel}>Khối lượng</Text>
          <View style={styles.amountControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Giảm khối lượng ${component.name} 10 gram`}
              disabled={disabled || component.estimatedWeightG <= 10}
              onPress={handleDecreaseWeight}
              style={[
                styles.amountStepButton,
                (disabled || component.estimatedWeightG <= 10) &&
                  styles.amountStepButtonDisabled,
              ]}
            >
              <Text style={styles.amountStepText}>−</Text>
            </Pressable>
            <TextInput
              accessibilityLabel={`Khối lượng ${component.name} tính bằng gram`}
              editable={!disabled}
              keyboardType="number-pad"
              onChangeText={setWeightDraft}
              onEndEditing={handleSubmitWeight}
              selectTextOnFocus
              style={styles.amountValueInput}
              value={weightDraft}
            />
            <Text style={styles.amountUnit}>g</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tăng khối lượng ${component.name} 10 gram`}
              disabled={disabled}
              onPress={handleIncreaseWeight}
              style={[
                styles.amountStepButton,
                disabled && styles.amountStepButtonDisabled,
              ]}
            >
              <Text style={styles.amountStepText}>+</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <NutritionList nutrition={component.nutrition} />
    </View>
  );
};

const AiMealScanScreen = () => {
  useFullscreenAdOnFocus();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [result, setResult] = useState<AiMealScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingConsumed, setSavingConsumed] = useState(false);
  const [consumedEntrySaved, setConsumedEntrySaved] = useState(false);
  const [error, setError] = useState('');

  const chooseImage = useCallback(async (source: 'camera' | 'library') => {
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
    setConsumedEntrySaved(false);
  }, []);

  const onConfirmScanAI = useCallback(async () => {
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
      setConsumedEntrySaved(false);
    } catch (requestError) {
      setError(getNutritionError(requestError));
    } finally {
      setLoading(false);
    }
  }, [loading, selectedImage, user]);

  const handleChooseCamera = useCallback(() => chooseImage('camera'), [
    chooseImage,
  ]);
  const handleChooseLibrary = useCallback(() => chooseImage('library'), [
    chooseImage,
  ]);

  const openImageSourceOptions = useCallback(() => {
    if (loading || savingConsumed) return;
    Alert.alert('Thêm ảnh món ăn', 'Chọn cách thêm ảnh:', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chụp ảnh', onPress: handleChooseCamera },
      { text: 'Chọn ảnh từ thư viện', onPress: handleChooseLibrary },
    ]);
  }, [handleChooseCamera, handleChooseLibrary, loading, savingConsumed]);

  const saveScannedMealAsConsumed = useCallback(async (mealPeriod: MealPeriod) => {
    if (
      !result?.recognized ||
      !result.dishName ||
      !user?.id ||
      !user.accessToken
    ) {
      Alert.alert(
        'Không thể lưu món',
        'Đăng nhập để lưu món đã ăn vào nhật ký dinh dưỡng.',
      );
      return;
    }

    setSavingConsumed(true);
    setError('');
    setSyncUser(user);
    try {
      const response = (await syncApi(apiConst.addScannedConsumedMeal, {
        mealPeriod,
        scanResult: result,
      })) as AddScannedConsumedMealResponse;
      if (!response?.success) {
        throw new Error(
          response?.message ||
            response?.ErrorMessage ||
            'Không thể lưu món đã ăn.',
        );
      }
      setConsumedEntrySaved(true);
      dispatch(invalidateCachedConsumptionReports({ userId: user.id }));
      Alert.alert(
        'Đã lưu món ăn',
        `${result.dishName} đã được thêm vào nhật ký bữa ${
          mealPeriod === 'LUNCH' ? 'trưa' : 'tối'
        } ngày ${getVietnamDateKey()}. Dinh dưỡng dựa trên số lượng và khối lượng đã chỉnh sửa (nếu có).`,
      );
    } catch (saveError) {
      Alert.alert('Không thể lưu món', getNutritionError(saveError));
    } finally {
      setSavingConsumed(false);
    }
  }, [dispatch, result, user]);

  const handleSaveLunch = useCallback(
    () => saveScannedMealAsConsumed('LUNCH'),
    [saveScannedMealAsConsumed],
  );
  const handleSaveDinner = useCallback(
    () => saveScannedMealAsConsumed('DINNER'),
    [saveScannedMealAsConsumed],
  );
  const handleChangeComponentWeight = useCallback(
    (index: number, weightG: number) => {
      setResult(current =>
        current ? updateMealScanComponent(current, index, { weightG }) : current,
      );
    },
    [],
  );
  const handleChangeComponentQuantity = useCallback(
    (index: number, quantity: number) => {
      setResult(current =>
        current
          ? updateMealScanComponent(current, index, { quantity })
          : current,
      );
    },
    [],
  );

  const handleMarkAsEaten = useCallback(() => {
    if (savingConsumed || consumedEntrySaved) return;
    Alert.alert(
      'Ghi nhận món đã ăn',
      'Chọn bữa để lưu món và dinh dưỡng ước tính vào nhật ký cá nhân.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bữa trưa',
          onPress: handleSaveLunch,
        },
        {
          text: 'Bữa tối',
          onPress: handleSaveDinner,
        },
      ],
    );
  }, [consumedEntrySaved, handleSaveDinner, handleSaveLunch, savingConsumed]);

  const analyzeImage = useCallback(() => {
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
  }, [onConfirmScanAI]);

  const getAnalyzeButtonStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.analyzeButton,
      (!selectedImage || loading) && styles.disabledButton,
      pressed && styles.pressed,
    ],
    [loading, selectedImage],
  );

  const renderComponent = useCallback(
    (component: AiMealScanResult['components'][number], index: number) => (
      <ComponentAmountEditor
        key={`${component.name}-${index}`}
        component={component}
        index={index}
        disabled={savingConsumed || consumedEntrySaved}
        onChangeWeight={handleChangeComponentWeight}
        onChangeQuantity={handleChangeComponentQuantity}
      />
    ),
    [
      consumedEntrySaved,
      handleChangeComponentQuantity,
      handleChangeComponentWeight,
      savingConsumed,
    ],
  );

  function renderNote(note: string, index: number) {
    return (
      <Text key={`${note}-${index}`} style={styles.note}>
        • {note}
      </Text>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="HEALTH AI COACH"
        title="Quét món ăn"
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            selectedImage ? 'Đổi ảnh món ăn' : 'Chụp hoặc chọn ảnh món ăn'
          }
          disabled={loading || savingConsumed}
          onPress={openImageSourceOptions}
          style={selectedImage ? styles.preview : styles.imagePlaceholder}
        >
          {selectedImage ? (
            <Image
              accessibilityLabel="Ảnh món ăn đã chọn"
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
            />
          ) : (
            <>
              <Text style={styles.placeholderIcon}>＋</Text>
              <Text style={styles.placeholderText}>
                Chạm để chụp ảnh hoặc chọn từ thư viện
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!selectedImage || loading}
          onPress={analyzeImage}
          style={getAnalyzeButtonStyle}
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
                    <Text style={styles.adjustmentHint}>
                      Chỉnh số lượng hoặc khối lượng; dinh dưỡng sẽ cập nhật
                      ngay theo tỷ lệ ước tính.
                    </Text>
                    {result.components.map(renderComponent)}
                  </View>
                ) : null}
              </>
            )}

            {result.notes.map(renderNote)}
            <Text style={styles.disclaimer}>
              Giá trị dinh dưỡng do AI ước tính từ ảnh, không phải dữ liệu cân
              đo hoặc phân tích phòng thí nghiệm.
            </Text>
            {result.recognized && result.dishName ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  consumedEntrySaved
                    ? 'Món ăn đã được lưu vào nhật ký'
                    : 'Ghi nhận món đã ăn'
                }
                disabled={savingConsumed || consumedEntrySaved}
                onPress={handleMarkAsEaten}
                style={[
                  styles.consumedButton,
                  (savingConsumed || consumedEntrySaved) && styles.disabledButton,
                ]}
              >
                {savingConsumed ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.consumedButtonText}>
                    {consumedEntrySaved ? 'Đã lưu vào nhật ký' : 'Đã ăn'}
                  </Text>
                )}
              </Pressable>
            ) : null}
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
  },
  content: { gap: 14, paddingTop: 8, paddingHorizontal: 16 },
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
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: COLORS.border,
  },
  previewImage: { width: '100%', height: '100%' },
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
  adjustmentHint: {
    marginTop: -2,
    marginBottom: 8,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
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
  amountControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  amountControlLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  amountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  amountStepButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.lightGreen,
  },
  amountStepButtonDisabled: {
    opacity: 0.4,
  },
  amountStepText: {
    color: COLORS.green,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '700',
  },
  amountValueInput: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountUnit: {
    maxWidth: 54,
    color: COLORS.secondary,
    fontSize: 10,
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
  consumedButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  consumedButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
