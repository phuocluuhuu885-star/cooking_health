import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { syncApi } from '../../utils/syncUtils';
import { onHideLoading, onShowLoading } from '../../components/loading';
import apiConst from '../../abase/constant/apiConst';
import InputComponent from '../../abase/component/InputBox';
import { colors } from '../../abase/constant';
import { useAppDispatch } from '../../reduxs/store';
import {
  selectUserInfo,
  updateHealthProfile,
} from '../../reduxs/reduces/user';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStateSetter } from '../../utils/stateUtils';

type Gender = 'MALE' | 'FEMALE';

type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'ACTIVE'
  | 'VERY_ACTIVE';

type Goal = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';

type Option<T extends string> = {
  value: T;
  title: string;
  description?: string;
};

type FormState = {
  age: string;
  heightCm: string;
  weightKg: string;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  errorMsg: Record<string, string>;
  isLoading: boolean;
};

type HealthProfileProps = {
  visible: boolean;
  onClose: () => void;
};

const GENDER_OPTIONS: Option<Gender>[] = [
  {
    value: 'MALE',
    title: 'Nam',
  },
  {
    value: 'FEMALE',
    title: 'Nữ',
  },
];

const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  {
    value: 'SEDENTARY',
    title: 'Ít vận động',
    description: 'Hầu như không tập luyện',
  },
  {
    value: 'LIGHT',
    title: 'Vận động nhẹ',
    description: 'Tập luyện 1–3 ngày/tuần',
  },
  {
    value: 'MODERATE',
    title: 'Vận động vừa',
    description: 'Tập luyện 3–5 ngày/tuần',
  },
  {
    value: 'ACTIVE',
    title: 'Năng động',
    description: 'Tập luyện 6–7 ngày/tuần',
  },
  {
    value: 'VERY_ACTIVE',
    title: 'Rất năng động',
    description: 'Vận động cường độ cao mỗi ngày',
  },
];

const GOAL_OPTIONS: Option<Goal>[] = [
  {
    value: 'LOSE_WEIGHT',
    title: 'Giảm cân',
    description: 'Kiểm soát calories để giảm cân',
  },
  {
    value: 'MAINTAIN',
    title: 'Duy trì cân nặng',
    description: 'Giữ cân nặng hiện tại',
  },
  {
    value: 'GAIN_MUSCLE',
    title: 'Tăng cơ',
    description: 'Ưu tiên phát triển cơ bắp',
  },
];

const HealthProfile = ({ visible, onClose }: HealthProfileProps) => {
  const { height } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const profile = useSelector(selectUserInfo)?.healthProfile;
  const [state, setState] = useState<FormState>({
    age: '',
    heightCm: '',
    weightKg: '',
    gender: null,
    activityLevel: null,
    goal: null,
    errorMsg: {},
    isLoading: false,
  });
  const { isLoading } = state;
  const setIsLoading = useMemo(
    () => createStateSetter(setState, 'isLoading'),
    [setState],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setState(previous => ({
      ...previous,
      age: profile ? `${profile.age}` : '',
      heightCm: profile ? `${profile.heightCm}` : '',
      weightKg: profile ? `${profile.weightKg}` : '',
      gender: profile?.gender ?? null,
      activityLevel: profile?.activityLevel ?? null,
      goal: profile?.goal ?? null,
      errorMsg: {},
    }));
  }, [profile, visible]);

  const modalMaxHeight = useMemo(() => Math.min(height, 800), [height]);

  const onChangeField = useCallback(
    <K extends keyof Omit<FormState, 'errorMsg'>>(
      key: K,
      value: FormState[K],
    ) => {
      setState(prev => ({
        ...prev,
        [key]: value,
        errorMsg: {
          ...prev.errorMsg,
          [key]: '',
        },
      }));
    },
    [],
  );

  const onAgeChange = useCallback(
    (value: string) => {
      onChangeField('age', value.replace(/[^0-9]/g, ''));
    },
    [onChangeField],
  );

  const onHeightChange = useCallback(
    (value: string) => {
      onChangeField('heightCm', value.replace(/[^0-9.]/g, ''));
    },
    [onChangeField],
  );

  const onWeightChange = useCallback(
    (value: string) => {
      onChangeField('weightKg', value.replace(/[^0-9.]/g, ''));
    },
    [onChangeField],
  );

  const onSelectGender = useCallback(
    (value: Gender) => {
      onChangeField('gender', value);
    },
    [onChangeField],
  );

  const onSelectActivityLevel = useCallback(
    (value: ActivityLevel) => {
      onChangeField('activityLevel', value);
    },
    [onChangeField],
  );

  const onSelectGoal = useCallback(
    (value: Goal) => {
      onChangeField('goal', value);
    },
    [onChangeField],
  );

  const validate = useCallback(() => {
    const errorMsg: Record<string, string> = {};

    const age = Number(state.age);
    const heightCm = Number(state.heightCm);
    const weightKg = Number(state.weightKg);

    if (!state.age.trim()) {
      errorMsg.age = 'Tuổi không được để trống';
    } else if (!Number.isFinite(age) || age < 13 || age > 100) {
      errorMsg.age = 'Tuổi phải từ 13 đến 100';
    }

    if (!state.heightCm.trim()) {
      errorMsg.heightCm = 'Chiều cao không được để trống';
    } else if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
      errorMsg.heightCm = 'Chiều cao phải từ 100 đến 250 cm';
    }

    if (!state.weightKg.trim()) {
      errorMsg.weightKg = 'Cân nặng không được để trống';
    } else if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300) {
      errorMsg.weightKg = 'Cân nặng phải từ 25 đến 300 kg';
    }

    if (!state.gender) {
      errorMsg.gender = 'Vui lòng chọn giới tính';
    }

    if (!state.activityLevel) {
      errorMsg.activityLevel = 'Vui lòng chọn mức độ vận động';
    }

    if (!state.goal) {
      errorMsg.goal = 'Vui lòng chọn mục tiêu';
    }

    setState(prev => ({
      ...prev,
      errorMsg,
    }));

    return Object.keys(errorMsg).length === 0;
  }, [state]);

  const onSubmit = useCallback(async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsLoading(true);
      onShowLoading();

      const res = await syncApi(apiConst.updateHealthProfile, {
        age: Number(state.age),
        heightCm: Number(state.heightCm),
        weightKg: Number(state.weightKg),
        gender: state.gender,
        activityLevel: state.activityLevel,
        goal: state.goal,
      });

      if (!res?.success) {
        setState(prev => ({
          ...prev,
          errorMsg: {
            ...prev.errorMsg,
            submit: res?.message || 'Không thể cập nhật thông tin sức khỏe',
          },
        }));
        return;
      }

      dispatch(updateHealthProfile(res.data?.healthProfile ?? res.data));

      Alert.alert(
        'Thông báo',
        'Cập nhật thông tin tình trạng sức khỏe thành công\nHãy theo dõi lượng calo trong hồ sơ cá nhân của bạn',
        [
          {
            text: 'Đồng ý',
            onPress: onClose,
          },
        ],
      );
    } catch (error) {
      console.log('Update health profile error:', error);

      setState(prev => ({
        ...prev,
        errorMsg: {
          ...prev.errorMsg,
          submit: 'Không thể cập nhật thông tin sức khỏe',
        },
      }));
    } finally {
      setIsLoading(false);
      onHideLoading();
    }
  }, [dispatch, onClose, setIsLoading, state, validate]);

  const renderOption = useCallback(
    <T extends string>(
      option: Option<T>,
      selectedValue: T | null,
      onSelect: (value: T) => void,
    ) => {
      const isSelected = selectedValue === option.value;

      return (
        <TouchableOpacity
          key={option.value}
          activeOpacity={0.8}
          style={[styles.option, isSelected && styles.optionSelected]}
          onPress={() => onSelect(option.value)}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{option.title}</Text>

            {option.description ? (
              <Text style={styles.optionDescription}>{option.description}</Text>
            ) : null}
          </View>

          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected ? <View style={styles.radioInner} /> : null}
          </View>
        </TouchableOpacity>
      );
    },
    [],
  );

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modal,
              {
                maxHeight: modalMaxHeight,
                paddingBottom: insets.bottom
              },
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F3FAF5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.modalHeader}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>🥗</Text>
              </View>

              <View style={styles.headerContent}>
                <Text style={styles.title}>Thông tin cá nhân</Text>

                <Text style={styles.description}>
                  Hãy cho NutriCart biết một chút về bạn để xây dựng chế độ dinh
                  dưỡng phù hợp.
                </Text>
              </View>

              <Pressable
                hitSlop={10}
                disabled={isLoading}
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.card}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.sectionTitle}>Thông tin cơ thể</Text>

                <View style={styles.inputRow}>
                  <View style={styles.inputItem}>
                    <InputComponent
                      title="Tuổi"
                      isRequire
                      value={state.age}
                      inputKey="age"
                      onTextChange={onAgeChange}
                      errMsg={state.errorMsg.age}
                    />
                  </View>

                  <View style={styles.inputItem}>
                    <InputComponent
                      title="Chiều cao"
                      isRequire
                      value={state.heightCm}
                      inputKey="heightCm"
                      onTextChange={onHeightChange}
                      errMsg={state.errorMsg.heightCm}
                    />
                  </View>
                </View>

                <InputComponent
                  title="Cân nặng"
                  isRequire
                  value={state.weightKg}
                  inputKey="weightKg"
                  onTextChange={onWeightChange}
                  errMsg={state.errorMsg.weightKg}
                />

                <Text style={styles.hint}>
                  Chiều cao tính bằng cm và cân nặng tính bằng kg.
                </Text>
              </View>

              <View style={styles.card}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.sectionTitle}>Giới tính</Text>

                <View style={styles.optionContainer}>
                  {GENDER_OPTIONS.map(option =>
                    renderOption(option, state.gender, onSelectGender),
                  )}
                </View>

                {!!state.errorMsg.gender && (
                  <Text style={styles.errorText}>{state.errorMsg.gender}</Text>
                )}
              </View>

              <View style={styles.card}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.sectionTitle}>Mức độ vận động</Text>

                <View style={styles.optionContainer}>
                  {ACTIVITY_OPTIONS.map(option =>
                    renderOption(
                      option,
                      state.activityLevel,
                      onSelectActivityLevel,
                    ),
                  )}
                </View>

                {!!state.errorMsg.activityLevel && (
                  <Text style={styles.errorText}>
                    {state.errorMsg.activityLevel}
                  </Text>
                )}
              </View>

              <View style={styles.card}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.sectionTitle}>Mục tiêu của bạn</Text>

                <View style={styles.optionContainer}>
                  {GOAL_OPTIONS.map(option =>
                    renderOption(option, state.goal, onSelectGoal),
                  )}
                </View>

                {!!state.errorMsg.goal && (
                  <Text style={styles.errorText}>{state.errorMsg.goal}</Text>
                )}
              </View>

              {!!state.errorMsg.submit && (
                <Text style={styles.submitError}>{state.errorMsg.submit}</Text>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isLoading}
                style={[
                  styles.submitButton,
                  isLoading && styles.submitButtonDisabled,
                ]}
                onPress={onSubmit}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Lưu thông tin</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.footerText}>
                Thông tin này giúp NutriCart tính toán nhu cầu calories và xây
                dựng thực đơn phù hợp với bạn.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default HealthProfile;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  keyboardContainer: {
    width: '100%',
    maxHeight: '92%',
  },

  modal: {
    overflow: 'hidden',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.Gray.g200,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.Green.g400,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerIconText: {
    fontSize: 22,
  },

  headerContent: {
    flex: 1,
    gap: 3,
  },

  title: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: colors.BaseBlack,
  },

  description: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.Gray.g700,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.Gray.g100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  closeText: {
    fontSize: 27,
    lineHeight: 28,
    fontWeight: '300',
    color: colors.Gray.g700,
    marginTop: -2,
  },

  scrollView: {
    flexGrow: 0,
  },

  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 20,
  },

  card: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.Gray.g200,
    gap: 14,
  },

  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: colors.BaseBlack,
  },

  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },

  inputItem: {
    flex: 1,
  },

  hint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.Gray.g600,
  },

  optionContainer: {
    gap: 9,
  },

  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.Gray.g300,
    borderRadius: 12,
    backgroundColor: 'white',
  },

  optionSelected: {
    borderColor: colors.Green.g400,
    backgroundColor: '#F0FDF4',
  },

  optionContent: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },

  optionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.BaseBlack,
  },

  optionDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.Gray.g700,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.Gray.g300,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: colors.Green.g400,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 12,
    backgroundColor: colors.Green.g400,
  },

  errorText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#D92D20',
  },

  submitError: {
    fontSize: 12,
    lineHeight: 18,
    color: '#D92D20',
    textAlign: 'center',
  },

  submitButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.Green.g400,
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  footerText: {
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: colors.Gray.g600,
  },
});
