import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send, Check, X, ShieldAlert, Plus } from 'lucide-react-native';
import { Screen, Text, Card, Button, LoadingView, EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { lucienApi, type ChatMessageResponse } from '@/api/lucienApi';
import { useTheme } from '@/theme/useTheme';
import { useToast } from '@/context/ToastContext';

export default function LucienChatScreen() {
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const { showToast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(true);
  const [pendingConfirm, setPendingConfirm] = useState<{
    actionId: string;
    summary: string;
    toolName?: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    startNewChat();
  }, []);

  const startNewChat = async () => {
    if (!user) return;
    setStarting(true);
    setPendingConfirm(null);
    try {
      const session = await lucienApi.startSession({
        agentId: user.id,
        agentFirstName: user.firstName,
      });
      setSessionId(session.sessionId);
      setMessages([]);
    } catch (err) {
      showToast('Lucien is unavailable right now.', { type: 'error' });
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || sending || pendingConfirm) return;

    setInput('');
    const tempId = `u-${Date.now()}`;
    const userMsg: ChatMessageResponse = {
      id: tempId,
      role: 'USER',
      content: text,
      wasBlocked: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const resp = await lucienApi.sendMessage({ sessionId, message: text });
      const assistantMsg: ChatMessageResponse = {
        id: resp.messageId || `a-${Date.now()}`,
        role: 'ASSISTANT',
        content: resp.blocked ? (resp.blockReason || 'Message blocked.') : (resp.reply || ''),
        wasBlocked: resp.blocked,
        createdAt: resp.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (resp.confirmationRequired && resp.pendingActionId) {
        setPendingConfirm({
          actionId: resp.pendingActionId,
          summary: resp.pendingActionSummary || 'Action requires confirmation.',
          toolName: resp.pendingToolName,
        });
      }
    } catch (err) {
      showToast('Failed to send message.', { type: 'error' });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!sessionId || !pendingConfirm) return;
    setConfirming(true);
    try {
      const resp = await lucienApi.confirmAction(sessionId, {
        actionId: pendingConfirm.actionId,
        confirmed,
      });
      const assistantMsg: ChatMessageResponse = {
        id: resp.messageId || `a-${Date.now()}`,
        role: 'ASSISTANT',
        content: resp.reply || (confirmed ? 'Action confirmed.' : 'Action cancelled.'),
        wasBlocked: false,
        createdAt: resp.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setPendingConfirm(null);
    } catch (err) {
      showToast('Failed to confirm action.', { type: 'error' });
    } finally {
      setConfirming(false);
    }
  };

  if (starting) {
    return <LoadingView label="Connecting to Lucien…" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={{ flex: 1 }}
    >
      <Screen scroll={false} padded={false}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text variant="bodyMedium" color="secondary">
            Your intelligent recovery advisor
          </Text>
          <TouchableOpacity onPress={startNewChat} style={styles.newChatBtn}>
            <Plus size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>New Chat</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ padding: spacing.s4, gap: spacing.s3 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <EmptyState
              title="Ask Lucien Anything"
              message="I can analyze accounts, draft communications, and suggest recovery strategies."
            />
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'USER';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.assistantRow,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isUser ? colors.accent : colors.surface,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <Text style={{ color: isUser ? '#fff' : colors.ink1 }}>{m.content}</Text>
                  </View>
                </View>
              );
            })
          )}

          {sending && (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}

          {pendingConfirm && (
            <Card style={[styles.confirmCard, { backgroundColor: colors.warnBg, borderColor: colors.warnBorder }]}>
              <View style={{ flexDirection: 'row', gap: spacing.s2, alignItems: 'center' }}>
                <ShieldAlert size={16} color={colors.warnBorder} />
                <Text style={{ fontWeight: '600', color: colors.warnInk }}>Confirmation Required</Text>
              </View>
              <Text variant="caption" color="secondary">{pendingConfirm.summary}</Text>
              <View style={styles.confirmActions}>
                <Button
                  label="Cancel"
                  onPress={() => handleConfirm(false)}
                  variant="outline"
                  size="md"
                  disabled={confirming}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Confirm"
                  onPress={() => handleConfirm(true)}
                  variant="primary"
                  size="md"
                  loading={confirming}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.subtle, borderTopColor: colors.border }]}>
          <TextInput
            placeholder={pendingConfirm ? 'Resolve confirmation above' : 'Ask Lucien…'}
            placeholderTextColor={colors.ink3}
            value={input}
            onChangeText={setInput}
            editable={!sending && !pendingConfirm}
            style={[styles.input, { color: colors.ink1, backgroundColor: colors.surface, borderRadius: radius.sm, borderColor: colors.border }]}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending || !!pendingConfirm}
            style={[styles.sendBtn, { backgroundColor: colors.accent, borderRadius: radius.sm }]}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  loaderRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmCard: {
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  sendBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
