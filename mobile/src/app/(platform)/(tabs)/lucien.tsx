import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  WifiOff, Sparkles, FileText, Save, CheckCircle, Clock, AlertTriangle, XCircle, Ban,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Badge } from '@/components/ui';
import { systemPromptApi, type SystemPromptResponse } from '@/api/systemPromptApi';
import { ragApi, type RagDocumentResponse } from '@/api/ragApi';
import { formatDate } from '@/utils/date';

type Tab = 'prompts' | 'rag';

const SUGGESTED_KEYS = ['lucien.system', 'lucien.coach', 'lucien.summarise', 'lucien.classify'];

function ragStatusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'ACTIVE':     return 'success';
    case 'PROCESSING': return 'warning';
    case 'FAILED':     return 'error';
    default:           return 'neutral';
  }
}

function RagStatusIcon({ status }: { status: string }) {
  const { colors } = useTheme();
  const sz = 14;
  switch (status) {
    case 'ACTIVE':     return <CheckCircle size={sz} color={colors.success} />;
    case 'PROCESSING': return <Clock size={sz} color={colors.warnBorder} />;
    case 'FAILED':     return <AlertTriangle size={sz} color={colors.error} />;
    case 'SUPERSEDED': return <XCircle size={sz} color={colors.ink3} />;
    default:           return <Ban size={sz} color={colors.ink3} />;
  }
}

// ── Prompt editor row ────────────────────────────────────────────────────────
function PromptRow({ promptKey }: { promptKey: string }) {
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<SystemPromptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const prompt = await systemPromptApi.get(promptKey);
      setData(prompt);
      setEditText(prompt.promptTemplate);
    } catch {
      // prompt not configured yet — show empty editor
      setEditText('');
    } finally {
      setLoading(false);
    }
  }, [promptKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    if (editText.trim().length < 10) {
      Alert.alert('Too short', 'Prompt template must be at least 10 characters.');
      return;
    }
    setSaving(true);
    try {
      const updated = await systemPromptApi.update(promptKey, { promptTemplate: editText.trim() });
      setData(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Save failed', 'Could not save prompt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ marginBottom: spacing.s2 }}>
      <TouchableOpacity
        style={{ padding: spacing.s3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>{promptKey}</Text>
          {data ? (
            <Text variant="caption" color="secondary">v{data.version} · {formatDate(data.updatedAt)}</Text>
          ) : loading ? (
            <Text variant="caption" color="secondary">Loading…</Text>
          ) : (
            <Text variant="caption" style={{ color: colors.warnInk }}>Not configured</Text>
          )}
        </View>
        {saved && <CheckCircle size={16} color={colors.success} />}
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: spacing.s3, paddingBottom: spacing.s3, gap: spacing.s2 }}>
          <TextInput
            value={editText}
            onChangeText={setEditText}
            multiline
            numberOfLines={6}
            placeholder="Enter system prompt template…"
            placeholderTextColor={colors.ink3}
            style={[styles.textarea, {
              borderColor: colors.border,
              color: colors.ink1,
              backgroundColor: colors.subtle,
              fontFamily: 'monospace',
            }]}
          />
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
            style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
          >
            <Save size={14} color={colors.canvas} />
            <Text variant="label" style={{ color: colors.canvas, fontWeight: '600', marginLeft: 6 }}>
              {saving ? 'Saving…' : 'Save prompt'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

// ── RAG doc card ─────────────────────────────────────────────────────────────
function RagDocCard({ doc, onSupersede }: { doc: RagDocumentResponse; onSupersede: (id: string) => void }) {
  const { colors, spacing } = useTheme();
  return (
    <Card style={{ padding: spacing.s3, marginBottom: spacing.s2 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, marginRight: spacing.s2 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }} numberOfLines={1}>
            {doc.title}
          </Text>
          {doc.description ? (
            <Text variant="caption" color="secondary" numberOfLines={2}>{doc.description}</Text>
          ) : null}
          <Text variant="caption" color="secondary">{formatDate(doc.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <RagStatusIcon status={doc.status} />
          <Badge tone={ragStatusTone(doc.status)} label={doc.status} />
        </View>
      </View>
      {doc.status === 'ACTIVE' && (
        <TouchableOpacity
          onPress={() => Alert.alert(
            'Supersede document',
            `Mark "${doc.title}" as superseded? This will deactivate it from the RAG index.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Supersede', style: 'destructive', onPress: () => onSupersede(doc.id) },
            ]
          )}
          style={[styles.supersedeBtn, { borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <XCircle size={12} color={colors.ink3} />
          <Text variant="caption" color="secondary" style={{ marginLeft: 4 }}>Supersede</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function LucienAdminScreen() {
  const { colors, spacing } = useTheme();
  const [tab, setTab] = useState<Tab>('prompts');
  const [docs, setDocs] = useState<RagDocumentResponse[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(false);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const list = await ragApi.list();
      setDocs(list ?? []);
      setDocsError(false);
    } catch {
      setDocsError(true);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (tab === 'rag') loadDocs();
  }, [tab, loadDocs]));

  const handleSupersede = useCallback(async (id: string) => {
    try {
      await ragApi.supersede(id);
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, status: 'SUPERSEDED' } : d));
    } catch {
      Alert.alert('Error', 'Could not supersede document. Please try again.');
    }
  }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'prompts', label: 'System Prompts' },
    { key: 'rag', label: 'RAG Library' },
  ];

  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s2 }}>
          <Text variant="title">Lucien Admin</Text>
          <Text variant="caption" color="secondary">Manage AI system prompts and RAG document library</Text>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { marginHorizontal: spacing.s4, marginBottom: spacing.s3, borderColor: colors.border }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, { backgroundColor: active ? colors.accent : 'transparent' }]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Text variant="caption" style={{ fontWeight: '600', color: active ? colors.canvas : colors.ink2 }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'prompts' ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 }}>
            <Text variant="caption" color="secondary" style={{ marginBottom: spacing.s2 }}>
              Tap a key to expand and edit the prompt template. Changes are versioned server-side.
            </Text>
            {SUGGESTED_KEYS.map((key) => (
              <PromptRow key={key} promptKey={key} />
            ))}
          </ScrollView>
        ) : docsLoading ? (
          <LoadingView label="Loading RAG documents…" />
        ) : docsError ? (
          <EmptyState
            icon={WifiOff}
            title="RAG library unavailable"
            message="Could not load documents. Check your connection."
          />
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No RAG documents"
            message="No documents have been uploaded to the knowledge library yet."
          />
        ) : (
          <FlatList
            data={docs}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <RagDocCard doc={item} onSupersede={handleSupersede} />
            )}
            contentContainerStyle={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 13,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supersedeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 6,
  },
});
