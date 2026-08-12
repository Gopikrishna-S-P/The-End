import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Screen, Text, Card, TextField, Button, LoadingView } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import { useToast } from '@/context/ToastContext';
import { grievanceOfficersApi, type GrievanceOfficerResponse } from '@/api/grievanceOfficersApi';

export default function GrievanceOfficerSettingsScreen() {
  const { colors, spacing } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [officer, setOfficer] = useState<GrievanceOfficerResponse | null>(null);

  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await grievanceOfficersApi.get();
      setOfficer(res);
      if (res) {
        setName(res.name);
        setDesignation(res.designation);
        setEmail(res.email);
        setPhone(res.phone);
        setAddress(res.address || '');
      }
    } catch (err) {
      showToast('Failed to load settings', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!name || !designation || !email || !phone) {
      showToast('Please fill out all required fields', { type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const updated = await grievanceOfficersApi.upsert({
        name: name.trim(),
        designation: designation.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
      });
      setOfficer(updated);
      showToast('Grievance officer updated successfully', { type: 'success' });
    } catch (err) {
      showToast('Failed to save settings', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView label="Loading officer details…" />;

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Grievance Officer</Text>
          <Text variant="caption" color="secondary">Configure redressal contact info for borrower complaints</Text>
        </View>

        <Card style={{ gap: spacing.s4 }}>
          <TextField
            label="Officer Name"
            required
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
          />
          <TextField
            label="Designation"
            required
            value={designation}
            onChangeText={setDesignation}
            placeholder="e.g. Head of Compliance"
          />
          <TextField
            label="Email Address"
            required
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="officer@company.com"
          />
          <TextField
            label="Phone Number"
            required
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
          />
          <TextField
            label="Correspondence Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Office correspondence address"
            multiline
          />
          <Button
            label="Save Settings"
            onPress={handleSave}
            loading={saving}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({});
