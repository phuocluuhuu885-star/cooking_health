import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectUserInfo } from '../../reduxs/reduces/user';
import {
  analyzeCommunityMealNutrition,
  shareCommunityMeal,
} from '../../utils/communityMealApi';
import { navigate, goBack } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import CommunityNutritionSummary from './CommunityNutritionSummary';
import ScreenHeader from '../component/ScreenHeader';
import LoginRequiredModal from '../component/LoginRequiredModal';
import type { CommunityMealNutrition } from '../../utils/types/communityMeal';

type SelectedMealImage = {
  uri: string;
  base64: string;
};

const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_INGREDIENTS = 50;
const MAX_COOKING_STEPS = 50;
const MAX_INSTRUCTIONS_LENGTH = 10_000;

const detectImageType = (base64: string) => {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return null;
};

const getImageSizeBytes = (base64: string) => {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'Không thể thực hiện thao tác. Vui lòng thử lại.';

type IngredientInputValue = {
  id: number;
  name: string;
  weight: string;
};

type CookingStepInputValue = {
  id: number;
  instruction: string;
};

type IngredientInputRowProps = {
  item: IngredientInputValue;
  onChangeName: (id: number, value: string) => void;
  onChangeWeight: (id: number, value: string) => void;
  onRemove: (id: number) => void;
};

const IngredientInputRow = memo(
  ({
    item,
    onChangeName,
    onChangeWeight,
    onRemove,
  }: IngredientInputRowProps) => {
    const handleNameChange = useCallback(
      (value: string) => onChangeName(item.id, value),
      [item.id, onChangeName],
    );
    const handleWeightChange = useCallback(
      (value: string) => onChangeWeight(item.id, value),
      [item.id, onChangeWeight],
    );
    const handleRemove = useCallback(
      () => onRemove(item.id),
      [item.id, onRemove],
    );

    return (
      <View style={styles.dynamicRow}>
        <TextInput
          value={item.name}
          onChangeText={handleNameChange}
          maxLength={180}
          placeholder="Tên nguyên liệu"
          placeholderTextColor="#8A9790"
          style={[styles.input, styles.ingredientNameInput]}
          returnKeyType="next"
        />
        <TextInput
          value={item.weight}
          onChangeText={handleWeightChange}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="Trọng lượng"
          placeholderTextColor="#8A9790"
          style={[styles.input, styles.ingredientWeightInput]}
          accessibilityLabel="Trọng lượng nguyên liệu tính bằng gram"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa nguyên liệu ${item.name || ''}`}
          onPress={handleRemove}
          hitSlop={8}
          style={styles.removeRowButton}
        >
          <Text style={styles.removeRowButtonText}>×</Text>
        </Pressable>
      </View>
    );
  },
);

type CookingStepInputRowProps = {
  item: CookingStepInputValue;
  stepNumber: number;
  onChange: (id: number, value: string) => void;
  onRemove: (id: number) => void;
};

const CookingStepInputRow = memo(
  ({ item, stepNumber, onChange, onRemove }: CookingStepInputRowProps) => {
    const handleChange = useCallback(
      (value: string) => onChange(item.id, value),
      [item.id, onChange],
    );
    const handleRemove = useCallback(
      () => onRemove(item.id),
      [item.id, onRemove],
    );

    return (
      <View style={styles.dynamicRow}>
        <Text style={styles.stepNumber}>Bước {stepNumber}:</Text>
        <TextInput
          value={item.instruction}
          onChangeText={handleChange}
          multiline
          maxLength={2000}
          placeholder="Mô tả cách sơ chế hoặc nấu"
          placeholderTextColor="#8A9790"
          style={[styles.input, styles.stepInput]}
          textAlignVertical="top"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa bước ${stepNumber}`}
          onPress={handleRemove}
          hitSlop={8}
          style={styles.removeRowButton}
        >
          <Text style={styles.removeRowButtonText}>×</Text>
        </Pressable>
      </View>
    );
  },
);

const ShareCommunityMealScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredientRows, setIngredientRows] = useState<IngredientInputValue[]>([
    { id: 1, name: '', weight: '' },
  ]);
  const [cookingStepRows, setCookingStepRows] = useState<
    CookingStepInputValue[]
  >([{ id: 2, instruction: '' }]);
  const nextRowId = useRef(3);
  const [servingsText, setServingsText] = useState('1');
  const [image, setImage] = useState<SelectedMealImage | null>(null);
  const [nutrition, setNutrition] = useState<CommunityMealNutrition | null>(
    null,
  );
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const ingredients = useMemo(
    () =>
      ingredientRows
        .map(({ name: ingredientName, weight }) => {
          const trimmedName = ingredientName.trim();
          const trimmedWeight = weight.trim();
          return trimmedName && trimmedWeight
            ? `${trimmedName} - ${trimmedWeight} g`
            : '';
        })
        .filter(Boolean),
    [ingredientRows],
  );
  const instructions = useMemo(
    () =>
      cookingStepRows
        .map((step, index) => {
          const text = step.instruction.trim();
          return text ? `Bước ${index + 1}: ${text}` : '';
        })
        .filter(Boolean)
        .join('\n'),
    [cookingStepRows],
  );

  const invalidateAnalysis = useCallback(() => {
    setNutrition(null);
  }, []);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      invalidateAnalysis();
    },
    [invalidateAnalysis],
  );

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
  }, []);

  const handleIngredientNameChange = useCallback(
    (id: number, value: string) => {
      setIngredientRows(rows =>
        rows.map(row => (row.id === id ? { ...row, name: value } : row)),
      );
      invalidateAnalysis();
    },
    [invalidateAnalysis],
  );

  const handleIngredientWeightChange = useCallback(
    (id: number, value: string) => {
      setIngredientRows(rows =>
        rows.map(row =>
          row.id === id ? { ...row, weight: value.replace(/[^0-9]/g, '') } : row,
        ),
      );
      invalidateAnalysis();
    },
    [invalidateAnalysis],
  );

  const handleAddIngredient = useCallback(() => {
    const id = nextRowId.current++;
    setIngredientRows(rows => [...rows, { id, name: '', weight: '' }]);
  }, []);

  const handleRemoveIngredient = useCallback((id: number) => {
    setIngredientRows(rows => rows.filter(row => row.id !== id));
    invalidateAnalysis();
  }, [invalidateAnalysis]);

  const handleStepChange = useCallback(
    (id: number, value: string) => {
      setCookingStepRows(rows =>
        rows.map(row =>
          row.id === id ? { ...row, instruction: value } : row,
        ),
      );
      invalidateAnalysis();
    },
    [invalidateAnalysis],
  );

  const handleAddCookingStep = useCallback(() => {
    const id = nextRowId.current++;
    setCookingStepRows(rows => [...rows, { id, instruction: '' }]);
  }, []);

  const handleRemoveCookingStep = useCallback(
    (id: number) => {
      setCookingStepRows(rows => rows.filter(row => row.id !== id));
      invalidateAnalysis();
    },
    [invalidateAnalysis],
  );

  const renderIngredientRow = useCallback(
    (item: IngredientInputValue) => (
      <IngredientInputRow
        key={item.id}
        item={item}
        onChangeName={handleIngredientNameChange}
        onChangeWeight={handleIngredientWeightChange}
        onRemove={handleRemoveIngredient}
      />
    ),
    [
      handleIngredientNameChange,
      handleIngredientWeightChange,
      handleRemoveIngredient,
    ],
  );

  const renderCookingStepRow = useCallback(
    (item: CookingStepInputValue, index: number) => (
      <CookingStepInputRow
        key={item.id}
        item={item}
        stepNumber={index + 1}
        onChange={handleStepChange}
        onRemove={handleRemoveCookingStep}
      />
    ),
    [handleRemoveCookingStep, handleStepChange],
  );

  const handleServingsChange = useCallback(
    (value: string) => {
      setServingsText(value.replace(/[^0-9]/g, ''));
      invalidateAnalysis();
    },
    [invalidateAnalysis],
  );

  const chooseImage = useCallback(async (source: 'camera' | 'library') => {
    setError('');
    const options = {
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
          ? await launchCamera(options)
          : await launchImageLibrary(options);
    } catch (pickerError) {
      setError(getErrorMessage(pickerError));
      return;
    }

    if (response.didCancel) return;
    if (response.errorCode) {
      setError(response.errorMessage || 'Không thể mở thư viện ảnh.');
      return;
    }
    const asset: Asset | undefined = response.assets?.[0];
    if (!asset?.uri || !asset.base64) {
      setError('Không đọc được ảnh. Vui lòng chọn ảnh khác.');
      return;
    }
    if (!detectImageType(asset.base64)) {
      setError('Ảnh cần ở định dạng JPEG, PNG hoặc WebP.');
      return;
    }
    if (getImageSizeBytes(asset.base64) > MAX_IMAGE_BYTES) {
      setError('Ảnh sau khi nén vượt quá 512 KB. Hãy chọn ảnh khác.');
      return;
    }
    setImage({ uri: asset.uri, base64: asset.base64 });
  }, []);

  const handleChooseCamera = useCallback(() => chooseImage('camera'), [
    chooseImage,
  ]);
  const handleChooseLibrary = useCallback(() => chooseImage('library'), [
    chooseImage,
  ]);

  const openImageOptions = useCallback(() => {
    Alert.alert('Ảnh món ăn', 'Chọn cách thêm ảnh:', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chụp ảnh', onPress: handleChooseCamera },
      { text: 'Chọn từ thư viện', onPress: handleChooseLibrary },
    ]);
  }, [handleChooseCamera, handleChooseLibrary]);

  const validateRecipe = useCallback(() => {
    const servings = Number(servingsText);
    if (!user?.accessToken) {
      setError('Đăng nhập để chia sẻ món ăn.');
      return null;
    }
    if (name.trim().length < 2) {
      setError('Tên món cần có ít nhất 2 ký tự.');
      return null;
    }
    if (!image) {
      setError('Thêm ảnh món ăn trước khi tiếp tục.');
      return null;
    }
    if (
      ingredientRows.length === 0 ||
      ingredientRows.some(
        ingredient =>
          !ingredient.name.trim() ||
          !ingredient.weight ||
          Number(ingredient.weight) <= 0,
      )
    ) {
      setError('Nhập tên và trọng lượng hợp lệ cho từng nguyên liệu.');
      return null;
    }
    if (
      cookingStepRows.length === 0 ||
      cookingStepRows.some(step => !step.instruction.trim())
    ) {
      setError('Nhập nội dung cho từng bước nấu.');
      return null;
    }
    if (
      cookingStepRows.reduce(
        (length, step) => length + step.instruction.trim().length,
        0,
      ) < 10
    ) {
      setError('Cách nấu cần có ít nhất 10 ký tự.');
      return null;
    }
    if (
      ingredientRows.length > MAX_INGREDIENTS ||
      cookingStepRows.length > MAX_COOKING_STEPS ||
      instructions.length > MAX_INSTRUCTIONS_LENGTH
    ) {
      setError('Công thức vượt quá giới hạn số nguyên liệu hoặc độ dài cách nấu.');
      return null;
    }
    if (!Number.isSafeInteger(servings) || servings < 1 || servings > 30) {
      setError('Số khẩu phần phải từ 1 đến 30.');
      return null;
    }
    setError('');
    return servings;
  }, [
    cookingStepRows,
    image,
    ingredientRows,
    instructions,
    name,
    servingsText,
    user,
  ]);

  const requestNutritionAnalysis = useCallback(async () => {
    if (analyzing) return;
    const servings = validateRecipe();
    if (servings === null || !user) return;
    setAnalyzing(true);
    setNutrition(null);
    try {
      const response = await analyzeCommunityMealNutrition(user, {
        name: name.trim(),
        ingredients,
        instructions: instructions.trim(),
        servings,
        consent: true,
      });
      if (!response?.success || !response.data) {
        throw new Error(
          response?.message || 'Không nhận được kết quả phân tích dinh dưỡng.',
        );
      }
      setNutrition(response.data);
      setError('');
    } catch (analysisError) {
      setError(getErrorMessage(analysisError));
    } finally {
      setAnalyzing(false);
    }
  }, [
    analyzing,
    ingredients,
    instructions,
    name,
    user,
    validateRecipe,
  ]);

  const handleRequestNutritionAnalysis = useCallback(() => {
    Alert.alert(
      'Phân tích dinh dưỡng bằng AI',
      'Tên món, nguyên liệu và cách nấu sẽ được gửi đến Google Gemini để ước tính dinh dưỡng cho mỗi khẩu phần. Không nhập thông tin cá nhân vào công thức.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý và phân tích', onPress: requestNutritionAnalysis },
      ],
    );
  }, [requestNutritionAnalysis]);

  const handleReturnToCommunity = useCallback(() => {
    goBack();
  }, []);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    const servings = validateRecipe();
    if (servings === null) return;
    if (!user || !image) return;
    if (!nutrition) {
      setError('Phân tích dinh dưỡng bằng AI trước khi chia sẻ món.');
      return;
    }

    setSharing(true);
    setError('');
    try {
      const response = await shareCommunityMeal(user, {
        name: name.trim(),
        description: description.trim(),
        ingredients,
        instructions: instructions.trim(),
        servings,
        nutrition,
        imageBase64: image.base64,
      });
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể chia sẻ món ăn.');
      }
      Alert.alert(
        response.data?.status === 'APPROVED'
          ? 'Món ăn đã được duyệt'
          : response.data?.status === 'REJECTED'
            ? 'Món ăn chưa được duyệt'
            : 'Đã gửi món ăn chờ duyệt',
        response.data?.status === 'APPROVED'
          ? `${response.data.name || name.trim()} hiện đã xuất hiện trong cộng đồng.`
          : response.data?.status === 'REJECTED'
            ? response.data.moderationReason ||
                'Bài đăng không đáp ứng tiêu chí của cộng đồng.'
            : 'Món ăn sẽ hiển thị sau khi quản trị viên duyệt.',
        [{ text: 'Xem cộng đồng', onPress: handleReturnToCommunity }],
      );
    } catch (shareError) {
      setError(getErrorMessage(shareError));
    } finally {
      setSharing(false);
    }
  }, [
    description,
    handleReturnToCommunity,
    image,
    ingredients,
    instructions,
    name,
    nutrition,
    sharing,
    user,
    validateRecipe,
  ]);

  const handleConfirmLogin = useCallback(() => {
    navigate(ScreenKeys.LOGIN);
  }, []);

  const renderImage = image ? (
    <Image source={{ uri: image.uri }} style={styles.photoPreview} />
  ) : (
    <View style={styles.photoPlaceholder}>
      <Text style={styles.photoIcon}>＋</Text>
      <Text style={styles.photoText}>Thêm ảnh món ăn</Text>
      <Text style={styles.photoHint}>JPEG, PNG hoặc WebP • tối đa 512 KB</Text>
    </View>
  );

  const analyzeButtonLabel = analyzing
    ? 'Đang phân tích...'
    : nutrition
      ? 'Phân tích lại dinh dưỡng'
      : 'Phân tích dinh dưỡng bằng AI';

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="CHIA SẺ CÔNG THỨC"
        title="Món ăn của bạn"
        style={{ paddingTop: insets.top + 20 }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Thêm ảnh, nguyên liệu và cách nấu.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn hoặc chụp ảnh món ăn"
            onPress={openImageOptions}
            style={styles.photoButton}
          >
            {renderImage}
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>Tên món *</Text>
            <TextInput
              value={name}
              onChangeText={handleNameChange}
              maxLength={120}
              placeholder="Ví dụ: Cơm gà nướng sả"
              placeholderTextColor="#8A9790"
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              value={description}
              onChangeText={handleDescriptionChange}
              maxLength={500}
              placeholder="Điều gì làm món ăn này đặc biệt?"
              placeholderTextColor="#8A9790"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.listHeading}>
              <Text style={styles.label}>Nguyên liệu *</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thêm nguyên liệu"
                accessibilityState={{
                  disabled: ingredientRows.length >= MAX_INGREDIENTS,
                }}
                disabled={ingredientRows.length >= MAX_INGREDIENTS}
                onPress={handleAddIngredient}
                style={[
                  styles.addRowButton,
                  ingredientRows.length >= MAX_INGREDIENTS &&
                    styles.buttonDisabled,
                ]}
              >
                <Text style={styles.addRowButtonText}>＋</Text>
              </Pressable>
            </View>
            <View style={styles.dynamicRows}>
              {ingredientRows.map(renderIngredientRow)}
            </View>
            <Text style={styles.fieldHint}>
              Nhập trọng lượng theo gram để AI ước tính dinh dưỡng chính xác hơn.
            </Text>
          </View>

          <View style={styles.field}>
            <View style={styles.listHeading}>
              <Text style={styles.label}>Các bước nấu *</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thêm bước nấu"
                accessibilityState={{
                  disabled: cookingStepRows.length >= MAX_COOKING_STEPS,
                }}
                disabled={cookingStepRows.length >= MAX_COOKING_STEPS}
                onPress={handleAddCookingStep}
                style={[
                  styles.addRowButton,
                  cookingStepRows.length >= MAX_COOKING_STEPS &&
                    styles.buttonDisabled,
                ]}
              >
                <Text style={styles.addRowButtonText}>＋</Text>
              </Pressable>
            </View>
            <View style={styles.dynamicRows}>
              {cookingStepRows.map(renderCookingStepRow)}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Số khẩu phần</Text>
            <TextInput
              value={servingsText}
              onChangeText={handleServingsChange}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.servingsInput}
            />
          </View>

          <View style={styles.privacyNotice}>
            <Text style={styles.privacyTitle}>Thông tin được chia sẻ</Text>
            <Text style={styles.privacyText}>
              Ảnh, tên món, mô tả, nguyên liệu, cách nấu và dinh dưỡng sẽ hiển
              thị công khai cho thành viên cộng đồng.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={analyzing || sharing}
            onPress={handleRequestNutritionAnalysis}
            style={[
              styles.secondaryButton,
              (analyzing || sharing) && styles.buttonDisabled,
            ]}
          >
            {analyzing ? (
              <ActivityIndicator color="#168653" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {analyzeButtonLabel}
              </Text>
            )}
          </Pressable>

          {nutrition ? (
            <CommunityNutritionSummary nutrition={nutrition} />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={sharing || analyzing}
            onPress={handleShare}
            style={[
              styles.primaryButton,
              (sharing || analyzing) && styles.buttonDisabled,
            ]}
          >
            {sharing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Chia sẻ món ăn</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoginRequiredModal
        visible={!user?.accessToken}
        onClose={goBack}
        onConfirm={handleConfirmLogin}
        title="Đăng nhập để chia sẻ món"
        message="Đăng nhập để đăng công thức và ảnh món ăn của bạn."
      />
    </View>
  );
};

export default ShareCommunityMealScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 36,
  },
  intro: {
    color: '#66756D',
    fontSize: 13,
    lineHeight: 19,
  },
  photoButton: {
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE7DE',
    backgroundColor: '#FFFFFF',
  },
  photoPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#EAF2EC',
  },
  photoPlaceholder: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3EC',
  },
  photoIcon: {
    color: '#168653',
    fontSize: 30,
    fontWeight: '600',
  },
  photoText: {
    marginTop: 6,
    color: '#244C36',
    fontSize: 14,
    fontWeight: '800',
  },
  photoHint: {
    marginTop: 3,
    color: '#7A887F',
    fontSize: 11,
  },
  field: {
    gap: 6,
  },
  listHeading: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#172B23',
    fontSize: 13,
    fontWeight: '800',
  },
  dynamicRows: {
    gap: 9,
  },
  dynamicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#DCE6DE',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#172B23',
    fontSize: 14,
  },
  ingredientNameInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
  },
  ingredientWeightInput: {
    width: 96,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  stepNumber: {
    width: 58,
    color: '#345A45',
    fontSize: 12,
    fontWeight: '700',
  },
  stepInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  addRowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  addRowButtonText: {
    color: '#168653',
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 26,
  },
  removeRowButton: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FEF0EF',
  },
  removeRowButtonText: {
    color: '#B43C35',
    fontSize: 23,
    fontWeight: '500',
    lineHeight: 26,
  },
  fieldHint: {
    color: '#7A887F',
    fontSize: 11,
  },
  servingsInput: {
    width: 90,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DCE6DE',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#172B23',
    fontSize: 14,
  },
  privacyNotice: {
    gap: 4,
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#EEF4EF',
  },
  privacyTitle: {
    color: '#345A45',
    fontSize: 12,
    fontWeight: '800',
  },
  privacyText: {
    color: '#66756D',
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#168653',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#168653',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#168653',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  error: {
    color: '#B43C35',
    fontSize: 13,
    lineHeight: 18,
  },
});
