import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from '../../components/LinearGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { hasAiChatConsent, saveAiChatConsent } from '../../utils/aiChatConsent';
import { getVietnamDateKey } from '../../utils/dateUtils';
import { invalidateCachedMealPlan } from '../../reduxs/reduces/appData';
import { useAppDispatch } from '../../reduxs/store';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  AiMealChatResponse,
  AiMealChatSuggestion,
  MealPeriod,
} from '../../utils/types';
import ScreenHeader from '../component/ScreenHeader';

type Message = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  suggestions?: AiMealChatSuggestion[];
};

const getChatErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error !== 'object' || error === null) {
    return 'Không thể kết nối để gửi câu hỏi.';
  }
  const response = error as {
    message?: unknown;
    ErrorMessage?: unknown;
    error?: unknown;
  };
  for (const candidate of [
    response.message,
    response.ErrorMessage,
    response.error,
  ]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return 'Không thể kết nối để gửi câu hỏi.';
};

const QUICK_QUESTIONS = [
  'Hôm nay bữa trưa tôi nên ăn gì?',
  'Tôi đã tiêu thụ bao nhiêu calo hôm nay?',
  'Bữa tối còn món nào trong thực đơn?',
];

const formatNutrition = (value: number | null, unit: string) =>
  value === null ? `Chưa có ${unit}` : `${Math.round(value * 10) / 10} ${unit}`;

const AiMealChatScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const nextMessageId = useRef(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      text: 'Xin chào! Mình có thể giúp bạn xem thực đơn, món ăn trong Health&Cook và lượng dinh dưỡng đã ghi nhận hôm nay.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [addingMealId, setAddingMealId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const composerPaddingStyle = useMemo(
    () => ({
      paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 10),
    }),
    [insets.bottom, keyboardVisible],
  );

  React.useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const sendMessage = useCallback(
    async (rawMessage: string, consent: boolean) => {
      const message = rawMessage.trim();
      if (!message || sending) return;
      if (!user?.id || !user.accessToken) {
        setError('Đăng nhập để sử dụng tính năng hỏi đáp bằng AI.');
        return;
      }

      setSyncUser(user);
      setDraft('');
      setError('');
      setSending(true);
      setMessages(previous => [
        ...previous,
        { id: nextMessageId.current++, role: 'user', text: message },
      ]);
      try {
        const response = (await syncApi(apiConst.postAiMealChatMessage, {
          message,
          consent,
        })) as AiMealChatResponse;
        if (!response?.success || !response.data?.answer) {
          throw new Error(
            response?.message ||
              response?.ErrorMessage ||
              'Không thể trả lời câu hỏi lúc này.',
          );
        }
        setMessages(previous => [
          ...previous,
          {
            id: nextMessageId.current++,
            role: 'assistant',
            text: response.data!.answer,
            suggestions: response.data!.suggestions,
          },
        ]);
      } catch (requestError) {
        setError(getChatErrorMessage(requestError));
      } finally {
        setSending(false);
      }
    },
    [sending, user],
  );

  const handleSendQuestion = useCallback(
    (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || sending) return;
      const hasConsent = Boolean(user?.id && hasAiChatConsent(user.id));
      if (hasConsent) {
        sendMessage(message, true);
        return;
      }

      Alert.alert(
        'Đồng ý dùng Hỏi đáp AI?',
        'Với câu hỏi trong phạm vi Health&Cook, nội dung câu hỏi cùng dữ liệu thực đơn và dinh dưỡng liên quan sẽ được gửi đến Google Gemini để trả lời. Câu hỏi ngoài phạm vi sẽ bị từ chối trước khi gửi đến Gemini. Không gửi tên, email, mã tài khoản, tuổi, giới tính, chiều cao, cân nặng hoặc BMI. Bạn có thể từ chối và vẫn sử dụng ứng dụng bình thường.',
        [
          { text: 'Để sau', style: 'cancel' },
          {
            text: 'Đồng ý và tiếp tục',
            onPress: () => {
              if (user?.id) saveAiChatConsent(user.id, true);
              sendMessage(message, true);
            },
          },
        ],
      );
    },
    [sendMessage, sending, user],
  );

  const handleSend = useCallback(() => {
    handleSendQuestion(draft);
  }, [draft, handleSendQuestion]);

  const sendQuickQuestion = useCallback(
    (question: string) => {
      setDraft(question);
      handleSendQuestion(question);
    },
    [handleSendQuestion],
  );

  const addSuggestionToMealPlan = useCallback(
    async (suggestion: AiMealChatSuggestion, mealPeriod: MealPeriod) => {
      if (!user?.id || !user.accessToken || addingMealId) return;
      const date = getVietnamDateKey();
      setAddingMealId(suggestion.mealId);
      setSyncUser(user);
      try {
        const response = await syncApi(apiConst.addMealToPlan, {
          mealId: suggestion.mealId,
          date,
          mealPeriod,
          servings: 1,
        });
        if (!response?.success) {
          throw new Error(
            response?.message ||
              response?.ErrorMessage ||
              'Không thể thêm món vào thực đơn.',
          );
        }
        dispatch(invalidateCachedMealPlan({ userId: user.id, date }));
        Alert.alert(
          'Đã thêm món',
          `Đã thêm ${suggestion.name} vào thực đơn bữa ${
            mealPeriod === 'LUNCH' ? 'trưa' : 'tối'
          } hôm nay.`,
        );
      } catch (requestError) {
        Alert.alert('Không thể thêm món', getChatErrorMessage(requestError));
      } finally {
        setAddingMealId(null);
      }
    },
    [addingMealId, dispatch, user],
  );

  const chooseMealPeriod = useCallback(
    (suggestion: AiMealChatSuggestion) => {
      Alert.alert(
        'Chọn bữa muốn thêm',
        `Thêm ${suggestion.name} vào thực đơn hôm nay:`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Bữa trưa',
            onPress: () => addSuggestionToMealPlan(suggestion, 'LUNCH'),
          },
          {
            text: 'Bữa tối',
            onPress: () => addSuggestionToMealPlan(suggestion, 'DINNER'),
          },
        ],
      );
    },
    [addSuggestionToMealPlan],
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="HEALTH AI COACH" title="Hỏi đáp dinh dưỡng" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
        >
          {messages.map(item => (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                item.role === 'user' && styles.userMessageRow,
              ]}
            >
              <LinearGradient
                colors={
                  item.role === 'user'
                    ? ['#168653', '#117246']
                    : ['#FFFFFF', '#F3FAF5']
                }
                style={[
                  styles.messageBubble,
                  item.role === 'user'
                    ? styles.userMessageBubble
                    : styles.assistantMessageBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.role === 'user' && styles.userMessageText,
                  ]}
                >
                  {item.text}
                </Text>
                {item.suggestions?.map(suggestion => (
                  <View key={suggestion.mealId} style={styles.suggestionCard}>
                    <Text style={styles.suggestionName}>{suggestion.name}</Text>
                    <Text style={styles.suggestionNutrition}>
                      {formatNutrition(suggestion.nutrition.calories, 'kcal')} ·{' '}
                      Đạm {formatNutrition(suggestion.nutrition.proteinG, 'g')}{' '}
                      · Carb {formatNutrition(suggestion.nutrition.carbsG, 'g')}{' '}
                      · Béo {formatNutrition(suggestion.nutrition.fatG, 'g')} /
                      khẩu phần
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Thêm ${suggestion.name} vào thực đơn`}
                      disabled={addingMealId !== null}
                      onPress={() => chooseMealPeriod(suggestion)}
                      style={[
                        styles.addSuggestionButton,
                        addingMealId !== null && styles.disabledButton,
                      ]}
                    >
                      {addingMealId === suggestion.mealId ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <Text style={styles.addSuggestionButtonText}>
                          Thêm vào thực đơn hôm nay
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ))}
              </LinearGradient>
            </View>
          ))}
          {sending ? (
            <View style={styles.thinking}>
              <ActivityIndicator color={COLORS.green} size="small" />
              <Text style={styles.thinkingText}>
                Đang đối chiếu dữ liệu Health&Cook...
              </Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {messages.length === 1 ? (
            <View style={styles.quickQuestions}>
              {QUICK_QUESTIONS.map(question => (
                <Pressable
                  key={question}
                  accessibilityRole="button"
                  disabled={sending}
                  onPress={() => sendQuickQuestion(question)}
                  style={styles.quickQuestion}
                >
                  <Text style={styles.quickQuestionText}>{question}</Text>
                  <Text style={styles.quickArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <View style={[styles.composer, composerPaddingStyle]}>
          <TextInput
            accessibilityLabel="Nhập câu hỏi về Health&Cook"
            editable={!sending}
            maxLength={500}
            multiline
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            placeholder="Hỏi về thực đơn, món ăn, dinh dưỡng..."
            placeholderTextColor={COLORS.secondary}
            returnKeyType="send"
            style={styles.input}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi câu hỏi"
            disabled={!draft.trim() || sending}
            onPress={handleSend}
            style={[
              styles.sendButton,
              (!draft.trim() || sending) && styles.sendButtonDisabled,
            ]}
          >
            <Text style={styles.sendButtonText}>Gửi</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AiMealChatScreen;

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
  keyboardArea: { flex: 1 },
  messages: { flexGrow: 1, gap: 12, paddingTop: 8, paddingBottom: 16 },
  scopeNotice: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.lightGreen,
  },
  scopeTitle: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  scopeText: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  messageRow: { alignItems: 'flex-start' },
  userMessageRow: { alignItems: 'flex-end' },
  messageBubble: {
    maxWidth: '88%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },
  assistantMessageBubble: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userMessageBubble: {},
  messageText: { color: COLORS.text, fontSize: 13, lineHeight: 19 },
  userMessageText: { color: COLORS.white },
  suggestionCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  suggestionName: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  suggestionNutrition: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  addSuggestionButton: {
    minHeight: 36,
    marginTop: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  addSuggestionButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  disabledButton: { opacity: 0.6 },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  thinkingText: { color: COLORS.secondary, fontSize: 11 },
  error: { color: COLORS.danger, fontSize: 11, lineHeight: 16 },
  quickQuestions: { gap: 8, marginTop: 4 },
  quickTitle: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  quickQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  quickQuestionText: { flex: 1, color: COLORS.green, fontSize: 11 },
  quickArrow: { marginLeft: 8, color: COLORS.green, fontSize: 20 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    fontSize: 13,
  },
  sendButton: {
    minWidth: 56,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
});
