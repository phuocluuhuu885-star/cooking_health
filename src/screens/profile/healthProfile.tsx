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
import Svg, { Path } from 'react-native-svg';
import LinearGradient from '../../components/LinearGradient';
import { syncApi } from '../../utils/syncUtils';
import { onHideLoading, onShowLoading } from '../../components/loading';
import apiConst from '../../abase/constant/apiConst';
import InputComponent from '../../abase/component/InputBox';
import { colors } from '../../abase/constant';
import { useAppDispatch } from '../../reduxs/store';
import { selectUserInfo, updateHealthProfile } from '../../reduxs/reduces/user';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStateSetter } from '../../utils/stateUtils';
import type { HealthProfile as HealthProfileData } from '../../type/user';

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

const OptionRow = <T extends string>({
  option,
  selectedValue,
  onSelect,
}: {
  option: Option<T>;
  selectedValue: T | null;
  onSelect: (value: T) => void;
}) => {
  const isSelected = selectedValue === option.value;
  const handleSelect = useCallback(() => {
    onSelect(option.value);
  }, [onSelect, option.value]);

  return (
    <TouchableOpacity
      key={option.value}
      activeOpacity={0.8}
      style={[styles.option, isSelected && styles.optionSelected]}
      onPress={handleSelect}
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
};

type FormState = {
  age: string;
  heightCm: string;
  weightKg: string;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  allowFamilyHealthManagement: boolean;
  errorMsg: Record<string, string>;
  isLoading: boolean;
};

type HealthProfileProps = {
  visible: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  memberUserId?: string;
  memberName?: string;
  initialProfile?: HealthProfileData | null;
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

const HealthProfile = ({
  visible,
  onClose,
  onUpdated,
  memberUserId,
  memberName,
  initialProfile,
}: HealthProfileProps) => {
  const { height } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const ownProfile = useSelector(selectUserInfo)?.healthProfile;
  const profile = memberUserId ? initialProfile : ownProfile;
  const [state, setState] = useState<FormState>({
    age: '',
    heightCm: '',
    weightKg: '',
    gender: null,
    activityLevel: null,
    goal: null,
    allowFamilyHealthManagement: false,
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
      allowFamilyHealthManagement:
        profile?.allowFamilyHealthManagement ?? false,
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

  const toggleFamilyHealthManagement = useCallback(() => {
    onChangeField(
      'allowFamilyHealthManagement',
      !state.allowFamilyHealthManagement,
    );
  }, [onChangeField, state.allowFamilyHealthManagement]);

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

      const requestApi = memberUserId
        ? apiConst.updateHouseholdMemberHealth
        : apiConst.updateHealthProfile;
      const res = await syncApi(requestApi, {
        ...(memberUserId ? { memberId: memberUserId } : {}),
        age: Number(state.age),
        heightCm: Number(state.heightCm),
        weightKg: Number(state.weightKg),
        gender: state.gender,
        activityLevel: state.activityLevel,
        goal: state.goal,
        ...(!memberUserId
          ? {
              allowFamilyHealthManagement:
                state.allowFamilyHealthManagement,
            }
          : {}),
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

      if (!memberUserId) {
        dispatch(updateHealthProfile(res.data?.healthProfile ?? res.data));
      }
      onUpdated?.();

      Alert.alert(
        'Thông báo',
        memberUserId
          ? `Đã cập nhật hồ sơ sức khỏe cho ${memberName || 'thành viên'}.`
          : 'Cập nhật thông tin tình trạng sức khỏe thành công\nHãy theo dõi lượng calo trong hồ sơ cá nhân của bạn',
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
  }, [
    dispatch,
    memberName,
    memberUserId,
    onClose,
    onUpdated,
    setIsLoading,
    state,
    validate,
  ]);

  const renderGenderOption = (option: Option<Gender>) =>
    <OptionRow option={option} selectedValue={state.gender} onSelect={onSelectGender} />;
  const renderActivityOption = (option: Option<ActivityLevel>) =>
    <OptionRow option={option} selectedValue={state.activityLevel} onSelect={onSelectActivityLevel} />;
  const renderGoalOption = (option: Option<Goal>) =>
    <OptionRow option={option} selectedValue={state.goal} onSelect={onSelectGoal} />;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              styles.modal,
              {
                maxHeight: modalMaxHeight,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F3FAF5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.dragHandleArea}>
              <View style={styles.dragHandle} />
            </View>
            <View style={styles.modalHeader}>
              <View style={styles.headerIcon}>
                <Svg width={25} height={25} viewBox="0 0 24 24">
                  <Path
                    d="M20.8 8.8c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10A4.4 4.4 0 0 1 12 6.4a4.4 4.4 0 0 1 8.8 2.4ZM6.5 12h3l1.5-2.5 2.1 5 1.5-2.5h3.9"
                    fill="none"
                    stroke={colors.Green.g400}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.6}
                  />
                </Svg>
              </View>

              <View style={styles.headerContent}>
                <Text style={styles.title}>Hồ sơ sức khỏe</Text>

                <Text style={styles.description}>
                  Nhập thông tin cơ thể, mức vận động và mục tiêu để cá nhân hóa
                  nhu cầu dinh dưỡng của bạn.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng hồ sơ sức khỏe"
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
                      keyboardType="number-pad"
                      onTextChange={onAgeChange}
                      errMsg={state.errorMsg.age}
                      variant="health"
                    />
                  </View>

                  <View style={styles.inputItem}>
                    <InputComponent
                      title="Chiều cao"
                      isRequire
                      value={state.heightCm}
                      inputKey="heightCm"
                      keyboardType="decimal-pad"
                      onTextChange={onHeightChange}
                      errMsg={state.errorMsg.heightCm}
                      variant="health"
                    />
                  </View>
                </View>

                <InputComponent
                  title="Cân nặng"
                  isRequire
                  value={state.weightKg}
                  inputKey="weightKg"
                  keyboardType="decimal-pad"
                  onTextChange={onWeightChange}
                  errMsg={state.errorMsg.weightKg}
                  variant="health"
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
                  {GENDER_OPTIONS.map(renderGenderOption)}
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
                  {ACTIVITY_OPTIONS.map(renderActivityOption)}
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
                  {GOAL_OPTIONS.map(renderGoalOption)}
                </View>

                {!!state.errorMsg.goal && (
                  <Text style={styles.errorText}>{state.errorMsg.goal}</Text>
                )}
              </View>

              <View style={styles.card}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {!memberUserId ? (
                  <>
                    <Text style={styles.sectionTitle}>
                      Chia sẻ với gia đình
                    </Text>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: state.allowFamilyHealthManagement,
                      }}
                      onPress={toggleFamilyHealthManagement}
                      style={styles.sharingRow}
                    >
                      <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>
                          Cho quản trị viên gia đình theo dõi sức khỏe
                        </Text>
                        <Text style={styles.optionDescription}>
                          Cho phép xem hồ sơ, cân nặng, dinh dưỡng, nước uống
                          và hoạt động; đồng thời cập nhật hồ sơ sức khỏe cho
                          bạn. Bạn có thể tắt quyền này bất cứ lúc nào.
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          state.allowFamilyHealthManagement &&
                            styles.checkboxSelected,
                        ]}
                      >
                        {state.allowFamilyHealthManagement ? (
                          <Text style={styles.checkboxMark}>✓</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  </>
                ) : null}
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
    backgroundColor: colors.BaseWhite,
  },

  keyboardContainer: {
    flex: 1,
    width: '100%',
    maxHeight: '100%',
  },

  modal: {
    overflow: 'hidden',
    flex: 1,
  },

  dragHandleArea: {
    alignItems: 'center',
    paddingTop: 9,
    paddingBottom: 2,
  },

  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.Gray.g300,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
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
    borderRadius: 17,
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
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 20,
  },

  card: {
    borderRadius: 10,
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
    borderRadius: 8,
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
  sharingRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.Gray.g300,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.Gray.g300,
    borderRadius: 6,
  },
  checkboxSelected: {
    borderColor: colors.Green.g400,
    backgroundColor: colors.Green.g400,
  },
  checkboxMark: { color: 'white', fontSize: 14, fontWeight: '800' },

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
    borderRadius: 8,
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
