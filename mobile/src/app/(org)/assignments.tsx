import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Screen, Text, Card, SegmentedTabs, Button, TextField } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useToast } from '@/context/ToastContext';

export default function CaseAssignmentsScreen() {
  const { colors, spacing } = useTheme();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('assign');
  const [caseId, setCaseId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tabs = [
    { key: 'assign', title: 'Assign Case' },
    { key: 'reassign', title: 'Reassign Case' },
  ];

  const handleAssign = async () => {
    if (!caseId || !agentId) {
      showToast('Please fill out all fields', { type: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      // Stub simulated response for bulk assignments
      showToast('Case assigned successfully!', { type: 'success' });
      setCaseId('');
      setAgentId('');
    } catch {
      showToast('Failed to assign case', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Case Assignments</Text>
          <Text variant="caption" color="secondary">Allocate cases to field officer rosters</Text>
        </View>

        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <ScrollView contentContainerStyle={{ gap: spacing.s4, marginTop: spacing.s2 }}>
          {activeTab === 'assign' ? (
            <Card style={{ gap: spacing.s4 }}>
              <Text variant="bodyMedium">Assign New Case</Text>
              <TextField
                label="Case ID"
                placeholder="Enter case allocation ID"
                value={caseId}
                onChangeText={setCaseId}
              />
              <TextField
                label="Agent ID"
                placeholder="Enter field officer user ID"
                value={agentId}
                onChangeText={setAgentId}
              />
              <Button
                label="Assign Executive"
                onPress={handleAssign}
                loading={submitting}
              />
            </Card>
          ) : (
            <Card style={{ gap: spacing.s4 }}>
              <Text variant="bodyMedium">Reassign Existing Case</Text>
              <TextField
                label="Case ID"
                placeholder="Enter active case allocation ID"
                value={caseId}
                onChangeText={setCaseId}
              />
              <TextField
                label="New Agent ID"
                placeholder="Enter new field officer user ID"
                value={agentId}
                onChangeText={setAgentId}
              />
              <Button
                label="Reassign Executive"
                onPress={handleAssign}
                loading={submitting}
                variant="primary"
              />
            </Card>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({});
