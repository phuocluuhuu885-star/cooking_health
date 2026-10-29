import React, { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type LoginRequiredModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const LoginRequiredModal = ({
  visible,
  onClose,
  onConfirm,
}: LoginRequiredModalProps) => {
  const confirmLogin = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng yêu cầu đăng nhập"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dialog}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>⌑</Text>
          </View>
          <Text style={styles.title}>Đăng nhập để thêm món</Text>
          <Text style={styles.message}>
            Đăng nhập hoặc tạo tài khoản để lưu món ăn vào thực đơn cá nhân hay
            thực đơn gia đình.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={confirmLogin}
            style={styles.confirmButton}
          >
            <Text style={styles.confirmText}>Đăng nhập / Tạo tài khoản</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Để sau</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default LoginRequiredModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(17, 35, 26, 0.48)',
  },
  dialog: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#EAF6EE',
  },
  iconText: {
    color: '#168653',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    marginTop: 16,
    color: '#172B23',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: '#66756D',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  confirmButton: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: '#168653',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 18,
  },
  cancelText: {
    color: '#66756D',
    fontSize: 13,
    fontWeight: '700',
  },
});
