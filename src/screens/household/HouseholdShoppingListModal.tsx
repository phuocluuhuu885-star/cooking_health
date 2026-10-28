import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HouseholdShoppingItem, MealPeriod } from '../../utils/types';
import {
  fetchHouseholdShoppingList,
  updateHouseholdShoppingItem,
} from '../../utils/householdShoppingApi';
import { createStateSetter } from '../../utils/stateUtils';
import { formatHouseholdShoppingAmount } from '../../utils/householdScreenUtils';

type Props = {
  visible: boolean;
  token?: string;
  date: string;
  mealPeriod: MealPeriod;
  disabled: boolean;
  householdName: string;
  onClose: () => void;
};

const HouseholdShoppingListModal = ({
  visible,
  token,
  date,
  mealPeriod,
  disabled,
  householdName,
  onClose,
}: Props) => {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<{
    items: HouseholdShoppingItem[];
    loading: boolean;
    error: string;
    savingKey: string | null;
  }>({
    items: [],
    loading: false,
    error: '',
    savingKey: null,
  });
  const { items, loading, error, savingKey } = state;
  const setItems = useMemo(
    () => createStateSetter(setState, 'items'),
    [setState],
  );
  const setLoading = useMemo(
    () => createStateSetter(setState, 'loading'),
    [setState],
  );
  const setError = useMemo(
    () => createStateSetter(setState, 'error'),
    [setState],
  );
  const setSavingKey = useMemo(
    () => createStateSetter(setState, 'savingKey'),
    [setState],
  );
  const refs = useRef({ listRequestVersion: 0 });

  const loadList = useCallback(
    async (active: () => boolean = () => true) => {
      const requestVersion = ++refs.current.listRequestVersion;
      const isCurrentRequest = () =>
        active() && requestVersion === refs.current.listRequestVersion;
      if (!token) {
        if (isCurrentRequest()) {
          setError('Vui lòng đăng nhập để xem danh sách đi chợ.');
          setLoading(false);
        }
        return;
      }
      try {
        const result = await fetchHouseholdShoppingList(
          token,
          date,
          mealPeriod,
        );
        if (isCurrentRequest()) {
          setItems(result);
          setError('');
        }
      } catch (loadError) {
        console.error('Failed to load household shopping list', loadError);
        if (isCurrentRequest()) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải danh sách đi chợ.',
          );
        }
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    },
    [date, mealPeriod, setError, setItems, setLoading, token],
  );

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    let active = true;
    setLoading(true);
    loadList(() => active);
    const interval = setInterval(() => {
      loadList(() => active);
    }, 20_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loadList, setLoading, visible]);

  const togglePurchased = useCallback(
    async (item: HouseholdShoppingItem) => {
      if (!token || savingKey || disabled) {
        return;
      }
      setSavingKey(item.ingredientKey);
      setError('');
      refs.current.listRequestVersion += 1;
      try {
        const updated = await updateHouseholdShoppingItem(
          token,
          date,
          mealPeriod,
          item.ingredientKey,
          !item.purchasedAt,
        );
        refs.current.listRequestVersion += 1;
        setItems(previous =>
          previous.map(current =>
            current.ingredientKey === updated.ingredientKey ? updated : current,
          ),
        );
      } catch (updateError) {
        console.error('Failed to update household shopping item', updateError);
        setError(
          updateError instanceof Error
            ? updateError.message
            : 'Không thể cập nhật nguyên liệu đã mua.',
        );
      } finally {
        setSavingKey(null);
      }
    },
    [
      date,
      disabled,
      mealPeriod,
      savingKey,
      setError,
      setItems,
      setSavingKey,
      token,
    ],
  );

  const purchasedCount = items.filter(item => item.purchasedAt).length;
  const dateLabel = new Date(`${date}T00:00:00.000Z`).toLocaleDateString(
    'vi-VN',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CHUẨN BỊ THỰC ĐƠN</Text>
            <Text style={styles.title}>Danh sách đi chợ</Text>
            <Text style={styles.subtitle}>
              {householdName} · {dateLabel}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng danh sách đi chợ"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>Đóng</Text>
          </Pressable>
        </View>

        {items.length > 0 ? (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {mealPeriod === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'} ·{' '}
              {purchasedCount} / {items.length} nguyên liệu đã mua
            </Text>
          </View>
        ) : null}

        {disabled ? (
          <View style={styles.completedNotice}>
            <Text style={styles.completedText}>
              Bữa ăn đã được xác nhận hoàn thành. Danh sách đi chợ hiện không
              khả dụng.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                loadList();
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && items.length === 0 ? (
          <View style={styles.status}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.statusText}>Đang tổng hợp nguyên liệu…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.emptyTitle}>Chưa có nguyên liệu</Text>
                <Text style={styles.statusText}>
                  Nguyên liệu sẽ được tổng hợp từ các món đã chốt trong thực đơn
                  gia đình.
                </Text>
              </View>
            ) : (
              items.map(item => {
                const purchased = Boolean(item.purchasedAt);
                return (
                  <Pressable
                    key={item.ingredientKey}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: purchased,
                      disabled: disabled || savingKey !== null,
                    }}
                    disabled={disabled || savingKey !== null}
                    onPress={() => togglePurchased(item)}
                    style={({ pressed }) => [
                      styles.item,
                      purchased && styles.itemPurchased,
                      disabled && styles.disabledItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        purchased && styles.checkboxChecked,
                      ]}
                    >
                      {savingKey === item.ingredientKey ? (
                        <ActivityIndicator
                          size="small"
                          color={purchased ? COLORS.white : COLORS.green}
                        />
                      ) : purchased ? (
                        <Text style={styles.checkmark}>✓</Text>
                      ) : null}
                    </View>
                    <View style={styles.itemCopy}>
                      <Text
                        style={[
                          styles.itemName,
                          purchased && styles.itemNamePurchased,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.mealNames} numberOfLines={2}>
                        Dùng cho: {item.mealNames.join(', ')}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.amount,
                        purchased && styles.itemNamePurchased,
                      ]}
                    >
                      {formatHouseholdShoppingAmount(item.amountG)}
                    </Text>
                  </Pressable>
                );
              })
            )}
            <Text style={styles.note}>
              Nguyên liệu trùng tên được gộp và định lượng theo khẩu phần trong
              thực đơn. Danh sách được chia sẻ với các thành viên gia đình.
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default HouseholdShoppingListModal;

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 11,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  closeText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  summary: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  summaryText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 9,
  },
  item: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  itemPurchased: {
    borderColor: '#D5E7DB',
    backgroundColor: '#F4FAF6',
  },
  pressed: {
    opacity: 0.78,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#A8B7AE',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  itemCopy: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  itemNamePurchased: {
    color: '#85938A',
    textDecorationLine: 'line-through',
  },
  mealNames: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  amount: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  status: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyTitle: {
    marginBottom: 7,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  completedNotice: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EEF1EF',
  },
  completedText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  disabledItem: {
    opacity: 0.55,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  retryText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  note: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
