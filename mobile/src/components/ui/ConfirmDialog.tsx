import React from 'react';
import { Modal, View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme/useTheme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialog, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.s5 }]}>
              <Text style={[styles.title, { color: colors.ink1 }]}>{title}</Text>
              <Text style={[styles.message, { color: colors.ink2, marginBottom: spacing.s5 }]}>
                {message}
              </Text>
              <View style={[styles.actions, { gap: spacing.s3 }]}>
                <Button
                  label={cancelLabel}
                  onPress={onCancel}
                  variant="outline"
                  fullWidth={false}
                  style={styles.btn}
                />
                <Button
                  label={confirmLabel}
                  onPress={onConfirm}
                  variant={isDestructive ? 'danger' : 'primary'}
                  fullWidth={false}
                  style={styles.btn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btn: {
    flex: 1,
  },
});
