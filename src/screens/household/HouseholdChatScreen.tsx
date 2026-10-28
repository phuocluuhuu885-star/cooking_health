import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { StackScreenProps } from '@react-navigation/stack';
import { goBack } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import type { RootStackParamList } from '../../utils/types/navigation';
import type { HouseholdChatMessage } from '../../utils/types';
import { selectUserInfo } from '../../reduxs/reduces/user';
import {
  fetchHouseholdChatMessages,
  markHouseholdChatRead,
} from '../../utils/householdChatApi';
import {
  createHouseholdChatSocket,
  type ChatSocket,
} from '../../utils/householdChatSocket';
import { createStateSetter } from '../../utils/stateUtils';
import {
  formatHouseholdChatTime,
  mergeHouseholdMessages,
} from '../../utils/householdScreenUtils';
import { getAvatarUri } from '../../utils/avatarImageUtils';
import { getInitials } from '../../utils/stringUtils';

type Props = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.HOUSEHOLD_CHAT
>;

const PAGE_SIZE = 30;
const MAX_MESSAGE_LENGTH = 2000;
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

const ChatAvatar = ({
  avatar,
  name,
}: {
  avatar: string | null | undefined;
  name: string;
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = getAvatarUri(avatar);

  return (
    <View style={styles.avatar}>
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          style={styles.avatarImage}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={styles.avatarText}>{getInitials(name) || 'M'}</Text>
      )}
    </View>
  );
};

const HouseholdChatScreen = ({ route }: Props) => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const { householdId, householdName } = route.params;
  const [state, setState] = useState<{
    messages: HouseholdChatMessage[];
    draft: string;
    loading: boolean;
    loadingOlder: boolean;
    sending: boolean;
    connected: boolean;
    keyboardVisible: boolean;
    hasMore: boolean;
    error: string;
  }>({
    messages: [],
    draft: '',
    loading: true,
    loadingOlder: false,
    sending: false,
    connected: false,
    keyboardVisible: false,
    hasMore: false,
    error: '',
  });
  const {
    messages,
    draft,
    loading,
    loadingOlder,
    sending,
    connected,
    keyboardVisible,
    hasMore,
    error,
  } = state;
  const setMessages = useMemo(
    () => createStateSetter(setState, 'messages'),
    [setState],
  );
  const setDraft = useMemo(
    () => createStateSetter(setState, 'draft'),
    [setState],
  );
  const setLoading = useMemo(
    () => createStateSetter(setState, 'loading'),
    [setState],
  );
  const setLoadingOlder = useMemo(
    () => createStateSetter(setState, 'loadingOlder'),
    [setState],
  );
  const setSending = useMemo(
    () => createStateSetter(setState, 'sending'),
    [setState],
  );
  const setConnected = useMemo(
    () => createStateSetter(setState, 'connected'),
    [setState],
  );
  const setKeyboardVisible = useMemo(
    () => createStateSetter(setState, 'keyboardVisible'),
    [setState],
  );
  const setHasMore = useMemo(
    () => createStateSetter(setState, 'hasMore'),
    [setState],
  );
  const setError = useMemo(
    () => createStateSetter(setState, 'error'),
    [setState],
  );
  const refs = useRef<{
    socket: ChatSocket | null;
    loadingOlder: boolean;
    readTimer: ReturnType<typeof setTimeout> | null;
  }>({
    socket: null,
    loadingOlder: false,
    readTimer: null,
  });
  const composerInsetStyle = useMemo(
    () => ({
      paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 10),
    }),
    [insets.bottom, keyboardVisible],
  );

  useEffect(() => {
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
  }, [setKeyboardVisible]);

  const markRead = useCallback(
    async (token: string) => {
      try {
        await markHouseholdChatRead(token);
      } catch (readError) {
        console.error('Failed to mark household chat as read', readError);
        setError(
          readError instanceof Error
            ? readError.message
            : 'Không thể cập nhật trạng thái đã đọc.',
        );
      }
    },
    [setError],
  );

  const loadLatest = useCallback(
    async (token: string) => {
      try {
        const page = await fetchHouseholdChatMessages(token, {
          limit: PAGE_SIZE,
        });
        setMessages(previous =>
          mergeHouseholdMessages(page.messages.slice().reverse(), previous),
        );
        setHasMore(page.hasMore);
        setError('');
        await markRead(token);
      } catch (loadError) {
        console.error('Failed to load household chat messages', loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải tin nhắn gia đình.',
        );
      } finally {
        setLoading(false);
      }
    },
    [markRead, setError, setHasMore, setLoading, setMessages],
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.accessToken) {
        setLoading(false);
        setError('Vui lòng đăng nhập để sử dụng tin nhắn gia đình.');
        return undefined;
      }

      let active = true;
      const token = user.accessToken;
      const socket = createHouseholdChatSocket(token);
      refs.current.socket = socket;
      setLoading(true);
      setError('');
      setConnected(false);
      loadLatest(token);

      socket.on('connect', () => {
        socket.emit('chat:join', { householdId }, response => {
          if (!active) {
            return;
          }
          if (!response.success) {
            setError(response.message);
            socket.disconnect();
            return;
          }
          setConnected(true);
          loadLatest(token);
        });
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', connectError => {
        setConnected(false);
        setError(connectError.message || 'Không thể kết nối phòng chat.');
      });
      socket.on('chat:message', message => {
        if (message.householdId !== householdId) {
          return;
        }
        setMessages(previous => mergeHouseholdMessages([message], previous));
        if (message.senderUserId !== user.id) {
          if (refs.current.readTimer) {
            clearTimeout(refs.current.readTimer);
          }
          refs.current.readTimer = setTimeout(() => {
            markRead(token);
          }, 350);
        }
      });
      socket.connect();

      return () => {
        active = false;
        if (refs.current.readTimer) {
          clearTimeout(refs.current.readTimer);
          refs.current.readTimer = null;
        }
        socket.emit('chat:leave');
        socket.disconnect();
        refs.current.socket = null;
        setConnected(false);
      };
    }, [
      householdId,
      loadLatest,
      markRead,
      setConnected,
      setError,
      setLoading,
      setMessages,
      user?.accessToken,
      user?.id,
    ]),
  );

  const handleLoadOlder = useCallback(async () => {
    if (
      !user?.accessToken ||
      !hasMore ||
      refs.current.loadingOlder ||
      messages.length === 0
    ) {
      return;
    }
    refs.current.loadingOlder = true;
    setLoadingOlder(true);
    const oldestMessage = messages[messages.length - 1];
    try {
      const page = await fetchHouseholdChatMessages(user.accessToken, {
        before: oldestMessage.createdAt,
        beforeId: oldestMessage.id,
        limit: PAGE_SIZE,
      });
      setMessages(previous =>
        mergeHouseholdMessages(page.messages.slice().reverse(), previous),
      );
      setHasMore(page.hasMore);
    } catch (loadError) {
      console.error('Failed to load older household chat messages', loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải tin nhắn cũ hơn.',
      );
    } finally {
      refs.current.loadingOlder = false;
      setLoadingOlder(false);
    }
  }, [
    hasMore,
    messages,
    setError,
    setHasMore,
    setLoadingOlder,
    setMessages,
    user?.accessToken,
  ]);

  const handleSend = useCallback(() => {
    const content = draft.trim();
    const socket = refs.current.socket;
    if (!content || content.length > MAX_MESSAGE_LENGTH || !socket?.connected) {
      return;
    }
    setSending(true);
    socket
      .timeout(10000)
      .emit('chat:send', { content }, (timeoutError, response) => {
        setSending(false);
        if (timeoutError) {
          setError('Gửi tin nhắn quá thời gian. Vui lòng thử lại.');
          return;
        }
        if (!response.success) {
          setError(response.message);
          return;
        }
        setMessages(previous =>
          mergeHouseholdMessages([response.data], previous),
        );
        setDraft('');
        setError('');
      });
  }, [draft, setDraft, setError, setMessages, setSending]);

  const renderMessage = useCallback(
    ({ item, index }: { item: HouseholdChatMessage; index: number }) => {
      const mine = item.senderUserId === user?.id;
      const senderName = mine
        ? 'Bạn'
        : item.sender?.fullName?.trim() || 'Thành viên';
      const previousMessage = messages[index + 1];
      const groupedWithPrevious =
        Boolean(item.senderUserId) &&
        previousMessage?.senderUserId === item.senderUserId &&
        Math.abs(
          new Date(item.createdAt).getTime() -
            new Date(previousMessage.createdAt).getTime(),
        ) <=
          60 * 1000;
      const avatar = mine ? user?.avatar : item.sender?.avatarUrl;
      const avatarName = mine ? user?.fullName?.trim() || 'Bạn' : senderName;
      return (
        <View style={[styles.messageRow, mine && styles.messageRowMine]}>
          {mine ? null : (
            <View style={styles.avatarSlot}>
              {!groupedWithPrevious ? (
                <ChatAvatar
                  key={avatar || avatarName}
                  avatar={avatar}
                  name={avatarName}
                />
              ) : null}
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              mine ? styles.messageBubbleMine : styles.messageBubbleOther,
            ]}
          >
            {!mine ? (
              <LinearGradient
                colors={['#FFFFFF', '#F3FAF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {!mine && !groupedWithPrevious ? (
              <Text style={styles.senderName}>{senderName}</Text>
            ) : null}
            <Text style={[styles.messageText, mine && styles.messageTextMine]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
              {formatHouseholdChatTime(item.createdAt)}
            </Text>
          </View>
          {mine ? (
            <View style={styles.avatarSlot}>
              {!groupedWithPrevious ? (
                <ChatAvatar
                  key={avatar || avatarName}
                  avatar={avatar}
                  name={avatarName}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      );
    },
    [messages, user?.avatar, user?.fullName, user?.id],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={goBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {householdName}
          </Text>
          <Text style={styles.connectionStatus}>
            {connected ? 'Đang kết nối' : 'Đang kết nối lại…'}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && messages.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.green} />
          <Text style={styles.loadingText}>Đang tải tin nhắn…</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyTitle}>Bắt đầu trò chuyện</Text>
              <Text style={styles.emptyText}>
                Gửi tin nhắn đầu tiên cho gia đình.
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                accessibilityRole="button"
                disabled={loadingOlder}
                onPress={handleLoadOlder}
                style={styles.loadOlderButton}
              >
                {loadingOlder ? (
                  <ActivityIndicator color={COLORS.green} size="small" />
                ) : (
                  <Text style={styles.loadOlderText}>Tải tin nhắn cũ hơn</Text>
                )}
              </Pressable>
            ) : undefined
          }
        />
      )}

      <View style={[styles.composer, composerInsetStyle]}>
        <TextInput
          accessibilityLabel="Nội dung tin nhắn"
          editable={connected && !sending}
          maxLength={MAX_MESSAGE_LENGTH}
          multiline
          onChangeText={setDraft}
          placeholder="Nhắn tin cho gia đình…"
          placeholderTextColor={COLORS.secondary}
          style={styles.messageInput}
          value={draft}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi tin nhắn"
          disabled={
            !connected ||
            sending ||
            draft.trim().length === 0 ||
            draft.trim().length > MAX_MESSAGE_LENGTH
          }
          onPress={handleSend}
          style={[
            styles.sendButton,
            (!connected || sending || !draft.trim()) && styles.sendDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.sendText}>Gửi</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default HouseholdChatScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 42,
    justifyContent: 'center',
  },
  backText: { color: COLORS.green, fontSize: 34, lineHeight: 38 },
  headerCopy: { flex: 1 },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  connectionStatus: { color: COLORS.secondary, fontSize: 11, marginTop: 3 },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FEF3F2',
  },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 17 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: COLORS.secondary, fontSize: 12 },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 4,
  },
  messageRowMine: { justifyContent: 'flex-end' },
  avatarSlot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: COLORS.lightGreen,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageBubbleOther: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageBubbleMine: {
    backgroundColor: COLORS.green,
    borderBottomRightRadius: 4,
  },
  senderName: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  messageText: { color: COLORS.text, fontSize: 14, lineHeight: 19 },
  messageTextMine: { color: COLORS.white },
  messageTime: {
    color: COLORS.secondary,
    fontSize: 9,
    textAlign: 'right',
    marginTop: 5,
  },
  messageTimeMine: { color: '#DDF5E6' },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  emptyText: {
    color: COLORS.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  loadOlderButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  loadOlderText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  messageInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: COLORS.background,
  },
  sendButton: {
    minWidth: 56,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
});
