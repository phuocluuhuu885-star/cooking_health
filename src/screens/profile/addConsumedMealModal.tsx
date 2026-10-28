import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import apiConst from '../../abase/constant/apiConst';
import type { UserInfo } from '../../type/user';
import type { MealPeriod } from '../../utils/types';
import type { BackendMeal, MealsResponse } from '../../utils/types/recipe';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type { AddConsumedMealResponse } from '../../utils/types';
import { createStateSetter } from '../../utils/stateUtils';

type Props = {
  visible: boolean;
  user: UserInfo | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const AddConsumedMealModal = ({ visible, user, onClose, onSaved }: Props) => {
  const [state, setState] = useState<{
    query: string;
    results: BackendMeal[];
    selectedMeal: BackendMeal | null;
    servings: string;
    mealPeriod: MealPeriod;
    searching: boolean;
    saving: boolean;
    error: string;
  }>({
    query: '',
    results: [],
    selectedMeal: null,
    servings: '1',
    mealPeriod: new Date().getHours() < 14 ? 'LUNCH' : 'DINNER',
    searching: false,
    saving: false,
    error: '',
  });
  const {
    query,
    results,
    selectedMeal,
    servings,
    mealPeriod,
    searching,
    saving,
    error,
  } = state;
  const setQuery = useMemo(() => createStateSetter(setState, 'query'), [setState]);
  const setResults = useMemo(
    () => createStateSetter(setState, 'results'),
    [setState],
  );
  const setSelectedMeal = useMemo(
    () => createStateSetter(setState, 'selectedMeal'),
    [setState],
  );
  const setServings = useMemo(
    () => createStateSetter(setState, 'servings'),
    [setState],
  );
  const setMealPeriod = useMemo(
    () => createStateSetter(setState, 'mealPeriod'),
    [setState],
  );
  const setSearching = useMemo(
    () => createStateSetter(setState, 'searching'),
    [setState],
  );
  const setSaving = useMemo(
    () => createStateSetter(setState, 'saving'),
    [setState],
  );
  const setError = useMemo(
    () => createStateSetter(setState, 'error'),
    [setState],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSyncUser(user);
    const keyword = query.trim();
    if (keyword.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const response = (await syncApi(apiConst.searchMeals, {
          q: keyword,
          page: 1,
          limit: 20,
        })) as MealsResponse;
        if (!active) {
          return;
        }
        if (!response?.success || !Array.isArray(response.data)) {
          setResults([]);
          setError(response?.message || 'Không thể tìm món ăn.');
        } else {
          setResults(response.data);
          setError('');
        }
      } catch {
        if (active) {
          setResults([]);
          setError('Không thể kết nối để tìm món ăn.');
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    query,
    setError,
    setResults,
    setSearching,
    user,
    visible,
  ]);

  const close = (force = false) => {
    if (saving && !force) {
      return;
    }
    setQuery('');
    setResults([]);
    setSelectedMeal(null);
    setServings('1');
    setError('');
    onClose();
  };
  const handleClose = () => close();

  const save = async () => {
    const servingCount = Number(servings.replace(',', '.'));
    if (!selectedMeal) {
      setError('Hãy chọn món bạn đã ăn.');
      return;
    }
    if (!Number.isFinite(servingCount) || servingCount <= 0 || servingCount > 100) {
      setError('Khẩu phần phải lớn hơn 0 và không quá 100.');
      return;
    }

    setSaving(true);
    setError('');
    setSyncUser(user);
    try {
      const response = (await syncApi(apiConst.addConsumedMeal, {
        mealId: selectedMeal.id,
        mealPeriod,
        servings: servingCount,
      })) as AddConsumedMealResponse;
      if (!response?.success || !response.data) {
        setError(response?.message || 'Không thể ghi nhận món đã ăn.');
        return;
      }
      await onSaved();
      close(true);
    } catch {
      setError('Không thể kết nối để ghi nhận món đã ăn.');
    } finally {
      setSaving(false);
    }
  };

  const renderMeal = ({ item }: { item: BackendMeal }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected: selectedMeal?.id === item.id,
        disabled: !item.nutritionSummary,
      }}
      disabled={!item.nutritionSummary}
      onPress={() => {
        setSelectedMeal(item);
        setError('');
      }}
      style={[
        styles.mealOption,
        selectedMeal?.id === item.id && styles.mealOptionSelected,
        !item.nutritionSummary && styles.mealOptionDisabled,
      ]}
    >
      <View style={styles.mealCopy}>
        <Text numberOfLines={1} style={styles.mealName}>
          {item.name}
        </Text>
        {item.description ? (
          <Text numberOfLines={1} style={styles.mealDescription}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <Text style={styles.mealCalories}>
        {item.nutritionSummary
          ? `${Math.round(item.nutritionSummary.perServing.calories)} kcal/phần`
          : 'Chưa có dữ liệu'}
      </Text>
    </Pressable>
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Ghi nhận món đã ăn</Text>
              <Text style={styles.subtitle}>
                Chọn món trong thư viện để tính dinh dưỡng tự động.
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={handleClose}>
              <Text style={styles.close}>Đóng</Text>
            </Pressable>
          </View>

          <TextInput
            autoCapitalize="none"
            onChangeText={value => {
              setQuery(value);
              setSelectedMeal(null);
            }}
            placeholder="Tìm món ăn hoặc nguyên liệu"
            placeholderTextColor={COLORS.secondary}
            style={styles.searchInput}
            value={query}
          />

          <View style={styles.results}>
            {searching ? (
              <ActivityIndicator color={COLORS.green} style={styles.loader} />
            ) : query.trim().length === 0 ? (
              <Text style={styles.helper}>
                Nhập tên món ăn để tìm trong thư viện.
              </Text>
            ) : results.length === 0 ? (
              <Text style={styles.helper}>Không tìm thấy món phù hợp.</Text>
            ) : (
              <FlatList
                data={results}
                keyboardShouldPersistTaps="handled"
                keyExtractor={item => item.id}
                renderItem={renderMeal}
              />
            )}
          </View>

          <Text style={styles.fieldLabel}>Bữa ăn</Text>
          <View style={styles.periodRow}>
            {([
              ['LUNCH', 'Bữa trưa'],
              ['DINNER', 'Bữa tối'],
            ] as const).map(([period, label]) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mealPeriod === period }}
                key={period}
                onPress={() => setMealPeriod(period)}
                style={[
                  styles.periodButton,
                  mealPeriod === period && styles.periodButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    mealPeriod === period && styles.periodTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Số khẩu phần đã ăn</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setServings}
            placeholder="Ví dụ: 1 hoặc 0,5"
            placeholderTextColor={COLORS.secondary}
            style={styles.servingsInput}
            value={servings}
          />
          {selectedMeal?.nutritionSummary ? (
            <Text style={styles.calorieEstimate}>
              Ước tính {Math.round(
                selectedMeal.nutritionSummary.perServing.calories *
                  (Number(servings.replace(',', '.')) || 0),
              )}{' '}
              kcal · Backend sẽ tính và lưu dinh dưỡng cho khẩu phần này.
            </Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={saving || !selectedMeal}
            onPress={save}
            style={[
              styles.saveButton,
              (saving || !selectedMeal) && styles.saveButtonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveText}>Lưu món đã ăn</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default memo(AddConsumedMealModal);

const COLORS = {
  green: '#168653',
  text: '#172B23',
  secondary: '#66756D',
  border: '#E5EBE7',
  white: '#FFFFFF',
  background: '#F5F7F5',
  lightGreen: '#E7F4EC',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '92%',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  subtitle: { color: COLORS.secondary, fontSize: 12, marginTop: 4 },
  close: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  searchInput: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    color: COLORS.text,
  },
  results: { minHeight: 64, maxHeight: 210, marginTop: 8 },
  loader: { marginTop: 20 },
  helper: { color: COLORS.secondary, fontSize: 12, paddingVertical: 18 },
  mealOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  mealOptionSelected: {
    borderRadius: 12,
    borderBottomColor: COLORS.lightGreen,
    backgroundColor: COLORS.lightGreen,
  },
  mealOptionDisabled: { opacity: 0.55 },
  mealCopy: { flex: 1 },
  mealName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  mealDescription: { color: COLORS.secondary, fontSize: 12, marginTop: 3 },
  mealCalories: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 7,
  },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.lightGreen,
  },
  periodText: { color: COLORS.secondary, fontSize: 12, fontWeight: '600' },
  periodTextSelected: { color: COLORS.green },
  servingsInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    color: COLORS.text,
  },
  calorieEstimate: { color: COLORS.green, fontSize: 12, lineHeight: 16, marginTop: 7 },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 8 },
  saveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
