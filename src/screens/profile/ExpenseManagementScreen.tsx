import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Svg, { Path } from 'react-native-svg';
import { Calendar } from 'react-native-calendars';
import type { CalendarProps, DateData } from 'react-native-calendars';
import LinearGradient from '../../components/LinearGradient';
import apiConst from '../../abase/constant/apiConst';
import {
  cacheMealCatalog,
  selectCurrentHousehold,
  selectMealCatalog,
  selectMealCatalogLoaded,
} from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import {
  createExpense,
  createIncome,
  deleteExpense,
  deleteIncome,
  deleteMealBudget,
  fetchExpenses,
  fetchIncomes,
  fetchMealBudgets,
  saveMealBudget,
  updateExpense,
  updateIncome,
} from '../../utils/expenseApi';
import type {
  Expense,
  ExpenseCategory,
  ExpenseMonthData,
  ExpenseScope,
  Income,
  IncomeCategory,
  IncomeMonthData,
  MealBudget,
  BackendMeal,
  MealsResponse,
} from '../../utils/types';
import ScreenHeader from '../component/ScreenHeader';
import '../../utils/calendarLocale';

const CATEGORIES: Array<{
  id: ExpenseCategory;
  label: string;
  icon: string;
}> = [
  { id: 'FOOD', label: 'Ăn uống', icon: '🍽️' },
  { id: 'SHOPPING', label: 'Mua sắm', icon: '🛍️' },
  { id: 'TRANSPORT', label: 'Đi lại', icon: '🚗' },
  { id: 'HOUSEHOLD', label: 'Gia đình', icon: '🏠' },
  { id: 'HEALTH', label: 'Sức khỏe', icon: '❤️' },
  { id: 'ENTERTAINMENT', label: 'Giải trí', icon: '🎬' },
  { id: 'OTHER', label: 'Khác', icon: '•••' },
];

const INCOME_CATEGORIES: Array<{
  id: IncomeCategory;
  label: string;
  icon: string;
}> = [
  { id: 'SALARY', label: 'Lương', icon: '💰' },
  { id: 'BUSINESS', label: 'Kinh doanh', icon: '📈' },
  { id: 'INVESTMENT', label: 'Đầu tư', icon: '📊' },
  { id: 'GIFT', label: 'Quà tặng', icon: '🎁' },
  { id: 'OTHER', label: 'Khác', icon: '•••' },
];

const COLORS = {
  background: '#F5F8F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
};

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

const currentMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatMoney = (amount: number) => {
  const compact = (value: number) => value.toFixed(1).replace(/\.0$/, '');
  if (amount >= 1_000_000) return `${compact(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `${compact(amount / 1_000)}K`;
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
};

const categoryLabel = (category: ExpenseCategory) =>
  CATEGORIES.find(item => item.id === category)?.label ?? 'Khác';

const ExpenseCalendarTotalsContext = React.createContext<
  Record<string, number>
>({});

const ExpenseCalendarDay = ({
  date,
  state,
}: {
  date?: DateData;
  state?: string;
}) => {
  const dailyTotals = useContext(ExpenseCalendarTotalsContext);
  if (!date) return <View style={styles.calendarCell} />;
  const dayTotal = dailyTotals[date.dateString] ?? 0;
  const isToday = date.dateString === localDateKey(new Date());
  return (
    <View
      accessibilityLabel={`${date.day}, ${formatMoney(dayTotal)} đã chi`}
      style={[
        styles.calendarCell,
        isToday && styles.calendarToday,
        dayTotal > 0 && styles.calendarCellSpent,
      ]}
    >
      <Text
        style={[
          styles.calendarDate,
          state === 'disabled' && styles.calendarDateDisabled,
          dayTotal > 0 && styles.calendarDateSpent,
        ]}
      >
        {date.day}
      </Text>
      {dayTotal > 0 ? (
        <Text style={styles.calendarAmount} numberOfLines={1}>
          {formatMoney(dayTotal)}
        </Text>
      ) : null}
    </View>
  );
};

type ExpenseForm = {
  title: string;
  amount: string;
  date: string;
  category: ExpenseCategory;
  note: string;
  mealId: string | null;
};

type IncomeForm = {
  title: string;
  amount: string;
  date: string;
  category: IncomeCategory;
  note: string;
};

const emptyForm = (): ExpenseForm => ({
  title: '',
  amount: '',
  date: localDateKey(new Date()),
  category: 'FOOD',
  note: '',
  mealId: null,
});

const emptyIncomeForm = (): IncomeForm => ({
  title: '',
  amount: '',
  date: localDateKey(new Date()),
  category: 'SALARY',
  note: '',
});

const ExpenseManagementScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const meals = useSelector(selectMealCatalog);
  const mealsLoaded = useSelector(selectMealCatalogLoaded);
  const loadRequestId = useRef(0);
  const [scope, setScope] = useState<ExpenseScope>('PERSONAL');
  const [month, setMonth] = useState(currentMonthKey(new Date()));
  const [items, setItems] = useState<Expense[]>([]);
  const [incomeItems, setIncomeItems] = useState<Income[]>([]);
  const [total, setTotal] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [budgets, setBudgets] = useState<
    Partial<Record<'LUNCH' | 'DINNER', number>>
  >({});
  const [budgetDraft, setBudgetDraft] = useState({ LUNCH: '', DINNER: '' });
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [incomeForm, setIncomeForm] = useState<IncomeForm>(emptyIncomeForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [incomeFormVisible, setIncomeFormVisible] = useState(false);
  const [transactionsVisible, setTransactionsVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [mealSearch, setMealSearch] = useState('');
  const [mealPickerVisible, setMealPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingBudget, setSavingBudget] = useState<'LUNCH' | 'DINNER' | null>(
    null,
  );
  const [error, setError] = useState('');
  const [mealLoadError, setMealLoadError] = useState('');

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    if (!user?.accessToken || !user.id) {
      setItems([]);
      setIncomeItems([]);
      setTotal(0);
      setIncomeTotal(0);
      setBudgets({});
      setLoading(false);
      setError('Đăng nhập để quản lý khoản chi.');
      return;
    }
    setSyncUser(user);
    setLoading(true);
    setError('');
    try {
      const incomeRequest =
        scope === 'PERSONAL'
          ? fetchIncomes(user, month)
          : Promise.resolve(null);
      const [expenseResponse, budgetResponse, incomeResponse] =
        await Promise.all([
          fetchExpenses(user, scope, month),
          fetchMealBudgets(user, scope),
          incomeRequest,
        ]);
      if (requestId !== loadRequestId.current) return;
      if (!expenseResponse.success || !expenseResponse.data) {
        throw new Error(
          expenseResponse.message || 'Không thể tải danh sách khoản chi.',
        );
      }
      if (!budgetResponse.success || !budgetResponse.data) {
        throw new Error(
          budgetResponse.message || 'Không thể tải ngân sách các bữa ăn.',
        );
      }
      if (
        scope === 'PERSONAL' &&
        incomeResponse &&
        (!incomeResponse.success || !incomeResponse.data)
      ) {
        throw new Error(
          incomeResponse.message || 'Không thể tải danh sách khoản thu.',
        );
      }
      const monthData: ExpenseMonthData = expenseResponse.data;
      const budgetMap = Object.fromEntries(
        budgetResponse.data.map((budget: MealBudget) => [
          budget.mealPeriod,
          budget.limitVnd,
        ]),
      ) as Partial<Record<'LUNCH' | 'DINNER', number>>;
      const incomeMonthData =
        scope === 'PERSONAL'
          ? (incomeResponse?.data as IncomeMonthData | undefined)
          : undefined;
      setItems(monthData.items);
      setTotal(monthData.totalAmountVnd);
      setIncomeItems(incomeMonthData?.items ?? []);
      setIncomeTotal(incomeMonthData?.totalAmountVnd ?? 0);
      setBudgets(budgetMap);
      setBudgetDraft({
        LUNCH: budgetMap.LUNCH ? String(budgetMap.LUNCH) : '',
        DINNER: budgetMap.DINNER ? String(budgetMap.DINNER) : '',
      });
    } catch (loadError) {
      if (requestId === loadRequestId.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải dữ liệu chi tiêu.',
        );
      }
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [month, scope, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        loadRequestId.current += 1;
      };
    }, [loadData]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.accessToken || mealsLoaded) return undefined;
      let active = true;
      setSyncUser(user);
      syncApi(apiConst.getAllMeal, { page: 1, limit: 100 })
        .then((response: MealsResponse) => {
          if (!active) return;
          if (!response?.success || !response.data) {
            setMealLoadError(
              response?.message || 'Không thể tải món ăn trong thư viện.',
            );
            return;
          }
          dispatch(
            cacheMealCatalog({
              userId: user.id,
              meals: response.data,
            }),
          );
          setMealLoadError('');
        })
        .catch(loadError => {
          if (active) {
            setMealLoadError(
              loadError instanceof Error
                ? loadError.message
                : 'Không thể tải món ăn trong thư viện.',
            );
          }
        });
      return () => {
        active = false;
      };
    }, [dispatch, mealsLoaded, user]),
  );

  const matchingMeals = useMemo(() => {
    const query = mealSearch.trim().toLocaleLowerCase('vi');
    return meals
      .filter(
        meal =>
          meal.category === 'LUNCH' ||
          meal.category === 'DINNER' ||
          meal.category === 'BREAKFAST' ||
          meal.category === 'SNACK',
      )
      .filter(
        meal => !query || meal.name.toLocaleLowerCase('vi').includes(query),
      )
      .slice(0, 8);
  }, [mealSearch, meals]);
  const dailyTotals = useMemo(
    () =>
      items.reduce<Record<string, number>>((totals, item) => {
        totals[item.expenseDate] =
          (totals[item.expenseDate] ?? 0) + item.amountVnd;
        return totals;
      }, {}),
    [items],
  );
  const handleCalendarMonthChange = useCallback(
    ({ year, month: selectedMonth }: DateData) => {
      setMonth(`${year}-${String(selectedMonth).padStart(2, '0')}`);
    },
    [],
  );
  const toggleTransactions = useCallback(() => {
    setTransactionsVisible(value => !value);
  }, []);
  const changeScope = useCallback((nextScope: ExpenseScope) => {
    setScope(nextScope);
    setFormVisible(false);
    setEditingId(null);
    setForm(emptyForm());
    setMealPickerVisible(false);
  }, []);

  const startNewExpense = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setFormVisible(true);
    setMealPickerVisible(false);
    setMealSearch('');
  }, []);

  const editExpense = useCallback((item: Expense) => {
    setForm({
      title: item.title,
      amount: String(item.amountVnd),
      date: item.expenseDate,
      category: item.category,
      note: item.note ?? '',
      mealId: item.mealId,
    });
    setEditingId(item.id);
    setFormVisible(true);
    setMealPickerVisible(false);
    setMealSearch('');
  }, []);

  const saveExpense = useCallback(async () => {
    const title = form.title.trim();
    const amountVnd = Number(form.amount.replace(/[,\s]/g, ''));
    if (!title) {
      Alert.alert('Thiếu nội dung', 'Nhập tên khoản chi trước khi lưu.');
      return;
    }
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Nhập số tiền thực tế lớn hơn 0.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      Alert.alert('Ngày không hợp lệ', 'Nhập ngày theo định dạng YYYY-MM-DD.');
      return;
    }
    if (!user?.accessToken || !user.id) {
      Alert.alert('Cần đăng nhập', 'Đăng nhập để lưu khoản chi.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        scope,
        title,
        amountVnd,
        expenseDate: form.date,
        category: form.category,
        note: form.note.trim() || null,
        mealId: form.mealId,
      };
      const response = editingId
        ? await updateExpense(user, editingId, payload)
        : await createExpense(user, payload);
      if (!response.success) {
        throw new Error(response.message || 'Không thể lưu khoản chi.');
      }
      setFormVisible(false);
      setEditingId(null);
      setForm(emptyForm());
      const newMonth = form.date.slice(0, 7);
      if (newMonth !== month) {
        setMonth(newMonth);
      } else {
        await loadData();
      }
    } catch (saveError) {
      Alert.alert(
        'Không thể lưu khoản chi',
        saveError instanceof Error ? saveError.message : 'Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  }, [editingId, form, loadData, month, scope, user]);

  const removeExpense = useCallback(
    (item: Expense) => {
      Alert.alert('Xóa khoản chi?', `Bạn có muốn xóa “${item.title}” không?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            if (!user?.accessToken) return;
            try {
              const response = await deleteExpense(user, item.id, scope);
              if (!response.success) {
                throw new Error(response.message || 'Không thể xóa khoản chi.');
              }
              await loadData();
            } catch (removeError) {
              Alert.alert(
                'Không thể xóa khoản chi',
                removeError instanceof Error
                  ? removeError.message
                  : 'Vui lòng thử lại.',
              );
            }
          },
        },
      ]);
    },
    [loadData, scope, user],
  );

  const startNewIncome = useCallback(() => {
    setIncomeForm(emptyIncomeForm());
    setEditingIncomeId(null);
    setIncomeFormVisible(true);
  }, []);

  const editIncome = useCallback((item: Income) => {
    setIncomeForm({
      title: item.title,
      amount: String(item.amountVnd),
      date: item.incomeDate,
      category: item.category,
      note: item.note ?? '',
    });
    setEditingIncomeId(item.id);
    setIncomeFormVisible(true);
  }, []);

  const saveIncome = useCallback(async () => {
    const title = incomeForm.title.trim();
    const amountVnd = Number(incomeForm.amount.replace(/[,.\s]/g, ''));
    if (!title) {
      Alert.alert('Thiếu nội dung', 'Nhập tên khoản thu trước khi lưu.');
      return;
    }
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Nhập số tiền thực tế lớn hơn 0.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incomeForm.date)) {
      Alert.alert('Ngày không hợp lệ', 'Nhập ngày theo định dạng YYYY-MM-DD.');
      return;
    }
    if (!user?.accessToken || !user.id) {
      Alert.alert('Cần đăng nhập', 'Đăng nhập để lưu khoản thu.');
      return;
    }
    setSavingIncome(true);
    try {
      const payload = {
        title,
        amountVnd,
        incomeDate: incomeForm.date,
        category: incomeForm.category,
        note: incomeForm.note.trim() || null,
      };
      const response = editingIncomeId
        ? await updateIncome(user, editingIncomeId, payload)
        : await createIncome(user, payload);
      if (!response.success) {
        throw new Error(response.message || 'Không thể lưu khoản thu.');
      }
      setIncomeFormVisible(false);
      setEditingIncomeId(null);
      setIncomeForm(emptyIncomeForm());
      const newMonth = incomeForm.date.slice(0, 7);
      if (newMonth !== month) {
        setMonth(newMonth);
      } else {
        await loadData();
      }
    } catch (saveError) {
      Alert.alert(
        'Không thể lưu khoản thu',
        saveError instanceof Error ? saveError.message : 'Vui lòng thử lại.',
      );
    } finally {
      setSavingIncome(false);
    }
  }, [editingIncomeId, incomeForm, loadData, month, user]);

  const removeIncome = useCallback(
    (item: Income) => {
      Alert.alert('Xóa khoản thu?', `Bạn có muốn xóa “${item.title}” không?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            if (!user?.accessToken) return;
            try {
              const response = await deleteIncome(user, item.id);
              if (!response.success) {
                throw new Error(response.message || 'Không thể xóa khoản thu.');
              }
              await loadData();
            } catch (removeError) {
              Alert.alert(
                'Không thể xóa khoản thu',
                removeError instanceof Error
                  ? removeError.message
                  : 'Vui lòng thử lại.',
              );
            }
          },
        },
      ]);
    },
    [loadData, user],
  );

  const saveBudget = useCallback(
    async (period: 'LUNCH' | 'DINNER') => {
      const limitVnd = Number(budgetDraft[period].replace(/[,\s]/g, ''));
      if (!Number.isSafeInteger(limitVnd) || limitVnd <= 0) {
        Alert.alert('Ngân sách không hợp lệ', 'Nhập số tiền lớn hơn 0.');
        return;
      }
      if (!user?.accessToken) {
        Alert.alert('Cần đăng nhập', 'Đăng nhập để lưu ngân sách.');
        return;
      }
      setSavingBudget(period);
      try {
        const response = await saveMealBudget(user, scope, period, limitVnd);
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Không thể lưu ngân sách.');
        }
        setBudgets(previous => ({ ...previous, [period]: limitVnd }));
      } catch (saveError) {
        Alert.alert(
          'Không thể lưu ngân sách',
          saveError instanceof Error ? saveError.message : 'Vui lòng thử lại.',
        );
      } finally {
        setSavingBudget(null);
      }
    },
    [budgetDraft, scope, user],
  );
  const updateBudgetDraft = useCallback(
    (period: 'LUNCH' | 'DINNER', value: string) => {
      setBudgetDraft(previous => ({
        ...previous,
        [period]: value.replace(/[^\d]/g, ''),
      }));
    },
    [],
  );
  const clearBudget = useCallback(
    async (period: 'LUNCH' | 'DINNER') => {
      if (!user?.accessToken) return;
      setSavingBudget(period);
      try {
        const response = await deleteMealBudget(user, scope, period);
        if (!response.success) {
          throw new Error(response.message || 'Không thể xóa ngân sách.');
        }
        setBudgets(previous => {
          const next = { ...previous };
          delete next[period];
          return next;
        });
        setBudgetDraft(previous => ({ ...previous, [period]: '' }));
      } catch (clearError) {
        Alert.alert(
          'Không thể xóa ngân sách',
          clearError instanceof Error
            ? clearError.message
            : 'Vui lòng thử lại.',
        );
      } finally {
        setSavingBudget(null);
      }
    },
    [scope, user],
  );

  const selectMeal = useCallback((meal: BackendMeal) => {
    setForm(previous => ({
      ...previous,
      title: meal.name,
      mealId: meal.id,
      category: 'FOOD',
    }));
    setMealPickerVisible(false);
    setMealSearch('');
  }, []);

  const cancelForm = useCallback(() => {
    setFormVisible(false);
    setEditingId(null);
    setForm(emptyForm());
    setMealPickerVisible(false);
    setDatePickerVisible(false);
  }, []);

  const selectExpenseDate = useCallback((date: DateData) => {
    setForm(previous => ({ ...previous, date: date.dateString }));
    setDatePickerVisible(false);
  }, []);

  const cancelIncomeForm = useCallback(() => {
    setIncomeFormVisible(false);
    setEditingIncomeId(null);
    setIncomeForm(emptyIncomeForm());
  }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="CHI TIÊU"
        title="Quản lý chi tiêu"
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thêm khoản chi"
            onPress={startNewExpense}
            style={styles.headerAddButton}
          >
            <Text style={styles.headerAddButtonText}>+ Thêm</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scopeRow}>
          <ScopeButton
            label="Cá nhân"
            selected={scope === 'PERSONAL'}
            onPress={() => changeScope('PERSONAL')}
          />
          {household ? (
            <ScopeButton
              label={`Hộ ${household.name}`}
              selected={scope === 'HOUSEHOLD'}
              onPress={() => changeScope('HOUSEHOLD')}
            />
          ) : null}
        </View>

        <LinearGradient
          colors={['#FFFFFF', '#F3FAF5']}
          style={styles.summaryCard}
        >
          <Text style={styles.cardEyebrow}>TỔNG CHI TRONG THÁNG</Text>
          <Text style={styles.total}>{formatMoney(total)}</Text>
          <Text style={styles.secondaryText}>
            {items.length} khoản chi ·{' '}
            {scope === 'PERSONAL' ? 'Cá nhân' : 'Dùng chung trong hộ'}
          </Text>
          <View style={styles.calendar}>
            <ExpenseCalendarTotalsContext.Provider value={dailyTotals}>
              <Calendar
                current={`${month}-01`}
                enableSwipeMonths
                hideExtraDays
                onMonthChange={handleCalendarMonthChange}
                dayComponent={ExpenseCalendarDay}
                theme={{
                  calendarBackground: COLORS.white,
                  textSectionTitleColor: COLORS.secondary,
                  monthTextColor: COLORS.text,
                  arrowColor: COLORS.green,
                  textMonthFontWeight: '700',
                  textDayHeaderFontSize: 10,
                  textDayHeaderFontWeight: '700',
                }}
              />
            </ExpenseCalendarTotalsContext.Provider>
          </View>
        </LinearGradient>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Ngân sách bữa ăn</Text>
          </View>
        </View>
        <View style={styles.budgetList}>
          <MealBudgetCard
            period="LUNCH"
            title="Ngân sách bữa trưa"
            currentBudget={budgets.LUNCH}
            draft={budgetDraft.LUNCH}
            saving={savingBudget === 'LUNCH'}
            disabled={savingBudget !== null}
            onChange={updateBudgetDraft}
            onSave={saveBudget}
            onRemove={clearBudget}
          />
          <MealBudgetCard
            period="DINNER"
            title="Ngân sách bữa tối"
            currentBudget={budgets.DINNER}
            draft={budgetDraft.DINNER}
            saving={savingBudget === 'DINNER'}
            disabled={savingBudget !== null}
            onChange={updateBudgetDraft}
            onSave={saveBudget}
            onRemove={clearBudget}
          />
        </View>

        <View style={styles.transactionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Giao dịch tháng này</Text>
            <Text style={styles.sectionHint}>
              {items.length} khoản chi
              {scope === 'PERSONAL' ? ` · ${incomeItems.length} khoản thu` : ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: transactionsVisible }}
            onPress={toggleTransactions}
            style={styles.transactionToggle}
          >
            <Text style={styles.transactionToggleText}>
              {transactionsVisible ? 'Ẩn' : 'Xem'}
            </Text>
          </Pressable>
        </View>

        {transactionsVisible && scope === 'PERSONAL' ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Thu nhập cá nhân</Text>
                <Text style={styles.sectionHint}>
                  Tổng thu tháng này: {formatMoney(incomeTotal)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thêm khoản thu"
                onPress={startNewIncome}
                style={styles.headerAddButton}
              >
                <Text style={styles.headerAddButtonText}>+ Thêm</Text>
              </Pressable>
            </View>
            {incomeItems.length ? (
              <View style={styles.expenseList}>
                {incomeItems.map(item => (
                  <View key={item.id} style={styles.expenseCard}>
                    <View style={styles.expenseMeta}>
                      <View style={styles.tagWrap}>
                        <Text style={styles.tagIcon}>
                          {INCOME_CATEGORIES.find(
                            category => category.id === item.category,
                          )?.icon ?? '💵'}
                        </Text>
                        <Text style={styles.tagText}>
                          {INCOME_CATEGORIES.find(
                            category => category.id === item.category,
                          )?.label ?? 'Khác'}
                        </Text>
                      </View>
                      <Text style={styles.expenseDate}>{item.incomeDate}</Text>
                    </View>
                    <View style={styles.expenseTitleRow}>
                      <Text style={styles.expenseTitle}>{item.title}</Text>
                      {item.note ? (
                        <Text style={styles.expenseNote} numberOfLines={1}>
                          {item.note}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.expenseAmountWrap}>
                      <Text style={styles.incomeAmount}>
                        {formatMoney(item.amountVnd)}
                      </Text>
                      <View style={styles.rowActions}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => editIncome(item)}
                          style={styles.rowIconButton}
                          hitSlop={8}
                        >
                          <Svg width={17} height={17} viewBox="0 0 24 24">
                            <Path
                              d="m14 5 5 5M4 20l4.5-1 10.2-10.2a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"
                              fill="none"
                              stroke={COLORS.green}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                            />
                          </Svg>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => removeIncome(item)}
                          style={styles.rowIconButton}
                          hitSlop={8}
                        >
                          <Svg width={17} height={17} viewBox="0 0 24 24">
                            <Path
                              d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
                              fill="none"
                              stroke={COLORS.danger}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                            />
                          </Svg>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  Chưa có khoản thu trong tháng
                </Text>
                <Text style={styles.emptyText}>
                  Lưu khoản thu cá nhân để theo dõi thu nhập của bạn.
                </Text>
              </View>
            )}
          </>
        ) : null}

        {transactionsVisible ? (
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Khoản chi</Text>
              <Text style={styles.sectionHint}>
                Thêm khoản chi bên ngoài hoặc ghi từ món trong app.
              </Text>
            </View>
          </View>
        ) : null}

        <Modal
          animationType="slide"
          onRequestClose={cancelForm}
          transparent
          visible={formVisible}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { paddingBottom: insets.bottom + 12 },
              ]}
            >
              <View style={styles.modalTitleRow}>
                <Text style={styles.formTitle}>
                  {editingId ? 'Sửa khoản chi' : 'Thêm khoản chi'}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Đóng biểu mẫu"
                  disabled={saving}
                  onPress={cancelForm}
                  style={styles.modalCloseButton}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path
                      d="m6 6 12 12M18 6 6 18"
                      fill="none"
                      stroke={COLORS.green}
                      strokeLinecap="round"
                      strokeWidth={2}
                    />
                  </Svg>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>Tên khoản chi</Text>
                  <TextInput
                    accessibilityLabel="Tên khoản chi"
                    onChangeText={title =>
                      setForm(previous => ({ ...previous, title }))
                    }
                    placeholder="Ví dụ: Đi chợ, ăn trưa..."
                    placeholderTextColor="#97A59D"
                    value={form.title}
                    style={styles.input}
                  />
                  <Text style={styles.inputLabel}>
                    Số tiền thực tế đã chi (VND)
                  </Text>
                  <TextInput
                    accessibilityLabel="Số tiền thực tế"
                    keyboardType="number-pad"
                    onChangeText={amount =>
                      setForm(previous => ({
                        ...previous,
                        amount: amount.replace(/[^\d]/g, ''),
                      }))
                    }
                    placeholder="Nhập số tiền đã thanh toán"
                    placeholderTextColor="#97A59D"
                    value={form.amount}
                    style={styles.input}
                  />
                  <Text style={styles.inputLabel}>Ngày chi</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ngày chi ${form.date}. Chạm để chọn ngày`}
                    accessibilityHint="Mở lịch chọn ngày chi"
                    onPress={() => setDatePickerVisible(value => !value)}
                    style={styles.dateButton}
                  >
                    <Text style={styles.dateButtonText}>{form.date}</Text>
                    <Text style={styles.dateButtonAction}>Chọn ngày</Text>
                  </Pressable>
                  {datePickerVisible ? (
                    <View style={styles.calendarPicker}>
                      <Calendar
                        current={form.date}
                        enableSwipeMonths
                        markedDates={
                          {
                            [form.date]: {
                              selected: true,
                              selectedColor: COLORS.green,
                              selectedTextColor: COLORS.white,
                            },
                          } satisfies NonNullable<CalendarProps['markedDates']>
                        }
                        onDayPress={selectExpenseDate}
                        theme={{
                          calendarBackground: COLORS.white,
                          textSectionTitleColor: COLORS.secondary,
                          selectedDayBackgroundColor: COLORS.green,
                          selectedDayTextColor: COLORS.white,
                          todayTextColor: COLORS.green,
                          dayTextColor: COLORS.text,
                          textDisabledColor: '#C5CEC9',
                          monthTextColor: COLORS.text,
                          arrowColor: COLORS.green,
                          textMonthFontWeight: '700',
                          textDayFontSize: 13,
                          textMonthFontSize: 15,
                          textDayHeaderFontSize: 11,
                        }}
                      />
                    </View>
                  ) : null}
                  <Text style={styles.inputLabel}>Danh mục</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.map(category => (
                      <Pressable
                        key={category.id}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: form.category === category.id,
                        }}
                        onPress={() => {
                          setForm(previous => ({
                            ...previous,
                            category: category.id,
                            ...(category.id === 'FOOD' ? {} : { mealId: null }),
                          }));
                          if (category.id !== 'FOOD') {
                            setMealPickerVisible(false);
                            setMealSearch('');
                          }
                        }}
                        style={[
                          styles.categoryChip,
                          form.category === category.id &&
                            styles.categoryChipSelected,
                        ]}
                      >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text
                          style={[
                            styles.categoryText,
                            form.category === category.id &&
                              styles.categoryTextSelected,
                          ]}
                        >
                          {category.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {form.category === 'FOOD' ? (
                    <>
                      <Text style={styles.inputLabel}>
                        Món trong app (không bắt buộc)
                      </Text>
                      {form.mealId ? (
                        <View style={styles.selectedMeal}>
                          <Text style={styles.selectedMealText}>
                            {meals.find(meal => meal.id === form.mealId)
                              ?.name ?? form.title}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                              setForm(previous => ({
                                ...previous,
                                mealId: null,
                              }))
                            }
                          >
                            <Text style={styles.removeMealText}>Bỏ chọn</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setMealPickerVisible(value => !value)}
                          style={styles.mealPickerButton}
                        >
                          <Text style={styles.mealPickerText}>
                            {mealPickerVisible
                              ? 'Đóng danh sách món'
                              : 'Chọn món để liên kết'}
                          </Text>
                        </Pressable>
                      )}
                      {mealPickerVisible ? (
                        <View style={styles.mealPicker}>
                          <TextInput
                            accessibilityLabel="Tìm món trong thư viện"
                            onChangeText={setMealSearch}
                            placeholder="Tìm món..."
                            placeholderTextColor="#97A59D"
                            value={mealSearch}
                            style={styles.input}
                          />
                          {mealLoadError ? (
                            <Text style={styles.errorText}>
                              {mealLoadError}
                            </Text>
                          ) : matchingMeals.length ? (
                            matchingMeals.map(meal => (
                              <Pressable
                                key={meal.id}
                                accessibilityRole="button"
                                onPress={() => selectMeal(meal)}
                                style={styles.mealOption}
                              >
                                <Text style={styles.mealOptionName}>
                                  {meal.name}
                                </Text>
                                <Text style={styles.mealOptionCategory}>
                                  {meal.category === 'LUNCH'
                                    ? 'Bữa trưa'
                                    : meal.category === 'DINNER'
                                    ? 'Bữa tối'
                                    : meal.category === 'BREAKFAST'
                                    ? 'Bữa sáng'
                                    : 'Ăn nhẹ'}
                                </Text>
                              </Pressable>
                            ))
                          ) : (
                            <Text style={styles.emptyText}>
                              Không tìm thấy món phù hợp.
                            </Text>
                          )}
                        </View>
                      ) : null}
                    </>
                  ) : null}
                  <Text style={styles.inputLabel}>
                    Ghi chú (không bắt buộc)
                  </Text>
                  <TextInput
                    accessibilityLabel="Ghi chú khoản chi"
                    multiline
                    onChangeText={note =>
                      setForm(previous => ({ ...previous, note }))
                    }
                    placeholder="Thêm ghi chú..."
                    placeholderTextColor="#97A59D"
                    value={form.note}
                    style={[styles.input, styles.noteInput]}
                  />
                  {form.mealId ? (
                    <Text style={styles.actualPriceHint}>
                      Giá món chỉ được liên kết với giao dịch; hãy nhập số tiền
                      thực tế bạn đã trả.
                    </Text>
                  ) : null}
                  <View style={styles.formActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={cancelForm}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={saveExpense}
                      style={[styles.primaryButton, saving && styles.disabled]}
                    >
                      {saving ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          Lưu khoản chi
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          onRequestClose={cancelIncomeForm}
          transparent
          visible={incomeFormVisible}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { paddingBottom: insets.bottom + 12 },
              ]}
            >
              <View style={styles.modalTitleRow}>
                <Text style={styles.formTitle}>
                  {editingIncomeId ? 'Sửa khoản thu' : 'Thêm khoản thu'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đóng biểu mẫu thu nhập"
                  disabled={savingIncome}
                  onPress={cancelIncomeForm}
                  style={styles.modalCloseButton}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path
                      d="m6 6 12 12M18 6 6 18"
                      fill="none"
                      stroke={COLORS.green}
                      strokeLinecap="round"
                      strokeWidth={2}
                    />
                  </Svg>
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>Tên khoản thu</Text>
                  <TextInput
                    accessibilityLabel="Tên khoản thu"
                    onChangeText={title =>
                      setIncomeForm(previous => ({ ...previous, title }))
                    }
                    placeholder="Ví dụ: Lương tháng, doán hợp đồng..."
                    placeholderTextColor="#97A59D"
                    value={incomeForm.title}
                    style={styles.input}
                  />
                  <Text style={styles.inputLabel}>Số tiền nhận (VND)</Text>
                  <TextInput
                    accessibilityLabel="Số tiền nhận"
                    keyboardType="number-pad"
                    onChangeText={amount =>
                      setIncomeForm(previous => ({
                        ...previous,
                        amount: amount.replace(/[^\d]/g, ''),
                      }))
                    }
                    placeholder="Nhập số tiền đã nhận"
                    placeholderTextColor="#97A59D"
                    value={incomeForm.amount}
                    style={styles.input}
                  />
                  <Text style={styles.inputLabel}>Ngày thu</Text>
                  <TextInput
                    accessibilityLabel="Ngày thu"
                    onChangeText={date =>
                      setIncomeForm(previous => ({
                        ...previous,
                        date: date.slice(0, 10),
                      }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#97A59D"
                    value={incomeForm.date}
                    style={styles.input}
                  />
                  <Text style={styles.inputLabel}>Danh mục</Text>
                  <View style={styles.categoryGrid}>
                    {INCOME_CATEGORIES.map(category => (
                      <Pressable
                        key={category.id}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: incomeForm.category === category.id,
                        }}
                        onPress={() =>
                          setIncomeForm(previous => ({
                            ...previous,
                            category: category.id,
                          }))
                        }
                        style={[
                          styles.categoryChip,
                          incomeForm.category === category.id &&
                            styles.categoryChipSelected,
                        ]}
                      >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text
                          style={[
                            styles.categoryText,
                            incomeForm.category === category.id &&
                              styles.categoryTextSelected,
                          ]}
                        >
                          {category.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>
                    Ghi chú (không bắt buộc)
                  </Text>
                  <TextInput
                    accessibilityLabel="Ghi chú khoản thu"
                    multiline
                    onChangeText={note =>
                      setIncomeForm(previous => ({ ...previous, note }))
                    }
                    placeholder="Thêm ghi chú..."
                    placeholderTextColor="#97A59D"
                    value={incomeForm.note}
                    style={[styles.input, styles.noteInput]}
                  />
                  <View style={styles.formActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingIncome}
                      onPress={cancelIncomeForm}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingIncome}
                      onPress={saveIncome}
                      style={[
                        styles.primaryButton,
                        savingIncome && styles.disabled,
                      ]}
                    >
                      {savingIncome ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          Lưu khoản thu
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={loadData}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : transactionsVisible && items.length ? (
          <View style={styles.expenseList}>
            {items.map(item => (
              <View key={item.id} style={styles.expenseRow}>
                <View style={styles.expenseIcon}>
                  <Text style={styles.expenseIconText}>
                    {item.source === 'MEAL' ? '🍽' : '₫'}
                  </Text>
                </View>
                <View style={styles.expenseCopy}>
                  <Text style={styles.expenseTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.expenseMeta}>
                    {categoryLabel(item.category)} · {item.expenseDate}
                    {item.source === 'MEAL' ? ' · Món trong app' : ''}
                  </Text>
                  {item.note ? (
                    <Text style={styles.expenseNote} numberOfLines={1}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.expenseAmountWrap}>
                  <Text style={styles.expenseAmount}>
                    {formatMoney(item.amountVnd)}
                  </Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Sửa ${item.title}`}
                      onPress={() => editExpense(item)}
                      style={styles.rowIconButton}
                      hitSlop={8}
                    >
                      <Svg width={17} height={17} viewBox="0 0 24 24">
                        <Path
                          d="m14 5 5 5M4 20l4.5-1 10.2-10.2a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"
                          fill="none"
                          stroke={COLORS.green}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                        />
                      </Svg>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ${item.title}`}
                      onPress={() => removeExpense(item)}
                      style={styles.rowIconButton}
                      hitSlop={8}
                    >
                      <Svg width={17} height={17} viewBox="0 0 24 24">
                        <Path
                          d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
                          fill="none"
                          stroke={COLORS.danger}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                        />
                      </Svg>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : transactionsVisible ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có khoản chi trong tháng</Text>
            <Text style={styles.emptyText}>
              Thêm khoản chi bên ngoài hoặc liên kết giao dịch với món ăn trong
              app.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const ScopeButton = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[styles.scopeButton, selected && styles.scopeButtonSelected]}
  >
    <Text
      style={[
        styles.scopeButtonText,
        selected && styles.scopeButtonTextSelected,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const MealBudgetCard = ({
  period,
  title,
  currentBudget,
  draft,
  saving,
  disabled,
  onChange,
  onSave,
  onRemove,
}: {
  period: 'LUNCH' | 'DINNER';
  title: string;
  currentBudget?: number;
  draft: string;
  saving: boolean;
  disabled: boolean;
  onChange: (period: 'LUNCH' | 'DINNER', value: string) => void;
  onSave: (period: 'LUNCH' | 'DINNER') => void;
  onRemove: (period: 'LUNCH' | 'DINNER') => void;
}) => {
  const handleChange = useCallback(
    (value: string) => onChange(period, value),
    [onChange, period],
  );
  const handleSave = useCallback(() => onSave(period), [onSave, period]);
  const handleRemove = useCallback(() => onRemove(period), [onRemove, period]);

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetTitle}>{title}</Text>
        <Text style={styles.budgetCurrent}>
          {currentBudget
            ? `Đang áp dụng ${formatMoney(currentBudget)}`
            : 'Chưa thiết lập'}
        </Text>
      </View>
      <View style={styles.budgetInputRow}>
        <TextInput
          accessibilityLabel={`${title}, số tiền giới hạn`}
          keyboardType="number-pad"
          onChangeText={handleChange}
          placeholder="Nhập số tiền (VND)"
          placeholderTextColor="#97A59D"
          value={draft}
          style={styles.budgetInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Lưu ${title}`}
          disabled={disabled}
          onPress={handleSave}
          style={[styles.budgetSaveButton, disabled && styles.disabled]}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.budgetSaveButtonText}>Lưu</Text>
          )}
        </Pressable>
      </View>
      {currentBudget ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Gỡ ${title}`}
          disabled={disabled}
          onPress={handleRemove}
          style={styles.budgetRemoveButton}
        >
          <Text style={styles.budgetRemoveText}>Gỡ ngân sách</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default ExpenseManagementScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  content: { paddingTop: 8, gap: 16 },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scopeButton: {
    borderRadius: 18,
    borderColor: COLORS.border,
    borderWidth: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  scopeButtonSelected: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  scopeButtonText: { color: COLORS.secondary, fontSize: 13, fontWeight: '700' },
  scopeButtonTextSelected: { color: COLORS.white },
  summaryCard: {
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardEyebrow: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  total: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  secondaryText: {
    color: COLORS.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  calendar: {
    marginTop: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  calendarCell: {
    width: '100%',
    minHeight: 38,
    paddingHorizontal: 3,
    paddingTop: 2,
    alignItems: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  calendarToday: {
    backgroundColor: '#EFF8F2',
  },
  calendarCellSpent: {
    backgroundColor: '#EAF6EE',
  },
  calendarDate: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  calendarDateSpent: {
    color: COLORS.green,
  },
  calendarAmount: {
    color: COLORS.secondary,
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 2,
  },
  calendarDateDisabled: {
    color: '#C5CEC9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  sectionHint: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  transactionToggle: {
    minWidth: 64,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 12,
  },
  transactionToggleText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  budgetList: { gap: 10 },
  budgetCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  budgetTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  budgetCurrent: {
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'right',
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  budgetInput: {
    flex: 1,
    minWidth: 0,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: 11,
    fontSize: 12,
  },
  budgetSaveButton: {
    minWidth: 72,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
  },
  budgetSaveButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  budgetRemoveButton: {
    alignSelf: 'flex-end',
    minHeight: 28,
    justifyContent: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  budgetRemoveText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  disabled: { opacity: 0.6 },
  headerAddButton: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 8,
  },
  headerAddButtonText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 35, 28, 0.45)',
  },
  modalContent: {
    maxHeight: '85%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: COLORS.lightGreen,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  inputLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  input: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    color: COLORS.text,
    fontSize: 13,
  },
  dateButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    backgroundColor: COLORS.white,
  },
  dateButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dateButtonAction: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },
  calendarPicker: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  noteInput: { minHeight: 74, paddingTop: 10, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  categoryIcon: { fontSize: 14 },
  categoryChipSelected: {
    backgroundColor: COLORS.lightGreen,
    borderColor: COLORS.green,
  },
  categoryText: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },
  categoryTextSelected: { color: COLORS.green },
  mealPickerButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 11,
  },
  mealPickerText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  selectedMeal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.lightGreen,
    padding: 11,
  },
  selectedMealText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  removeMealText: { color: COLORS.danger, fontSize: 11, fontWeight: '700' },
  mealPicker: {
    borderRadius: 8,
    backgroundColor: '#F7FAF8',
    padding: 9,
    gap: 6,
  },
  mealOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mealOptionName: { color: COLORS.text, fontSize: 12, flex: 1 },
  mealOptionCategory: { color: COLORS.secondary, fontSize: 10, marginLeft: 8 },
  actualPriceHint: { color: COLORS.secondary, fontSize: 11, lineHeight: 16 },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 8,
  },
  cancelButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cancelButtonText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 40,
    minWidth: 120,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  errorCard: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#FFF5F4',
    borderColor: '#F0D8D5',
    borderWidth: 1,
  },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  loadingCard: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  expenseList: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  expenseCard: {
    paddingVertical: 13,
    gap: 8,
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 10,
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expenseIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconText: { color: COLORS.green, fontSize: 15, fontWeight: '800' },
  expenseCopy: { flex: 1 },
  expenseTitle: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  expenseTitleRow: { gap: 4 },
  expenseMeta: { color: COLORS.secondary, fontSize: 10, marginTop: 3 },
  expenseDate: { color: COLORS.secondary, fontSize: 10, marginTop: 3 },
  expenseNote: { color: COLORS.secondary, fontSize: 10, marginTop: 3 },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.lightGreen,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  tagIcon: { fontSize: 11 },
  tagText: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
  expenseAmountWrap: { alignItems: 'flex-end', gap: 6 },
  expenseAmount: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  incomeAmount: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  rowActions: { flexDirection: 'row', gap: 7 },
  rowIconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  emptyText: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 7,
  },
});
