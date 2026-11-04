import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { COLORS } from './styles';

type Props = {
  visible: boolean;
  mealVotingEnabled: boolean;
  saving: boolean;
  onClose: () => void;
  onVotingChange: (enabled: boolean) => void;
};

const HouseholdSettingsModal = ({
  visible,
  mealVotingEnabled,
  saving,
  onClose,
  onVotingChange,
}: Props) => (
  <Modal
    animationType="fade"
    transparent
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <Text style={styles.title}>Cài đặt gia đình</Text>
        <Text style={styles.description}>
          Quản lý các tùy chọn áp dụng cho thực đơn chung của gia đình.
        </Text>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Bình chọn món</Text>
            <Text style={styles.settingDescription}>
              {mealVotingEnabled
                ? 'Thành viên có thể đề xuất và bình chọn món ăn.'
                : 'Bình chọn đang tắt; món ăn được thêm trực tiếp vào thực đơn.'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Bật hoặc tắt bình chọn món cho gia đình"
            disabled={saving}
            onValueChange={onVotingChange}
            thumbColor={mealVotingEnabled ? COLORS.green : '#F4F3F4'}
            trackColor={{
              false: COLORS.border,
              true: COLORS.lightGreen,
            }}
            value={mealVotingEnabled}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={onClose}
          style={[styles.closeButton, saving && styles.disabled]}
        >
          <Text style={styles.closeText}>Đóng</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(17, 35, 26, 0.42)',
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  title: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },
  description: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  settingDescription: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  closeButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: COLORS.lightGreen,
  },
  closeText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
});

export default HouseholdSettingsModal;
