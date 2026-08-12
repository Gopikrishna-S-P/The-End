import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text } from '@/components/ui';

const LAST_UPDATED = 'May 18, 2026';

interface Section {
  num: string;
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    num: '01',
    title: 'Information we collect',
    body: 'We collect information you provide directly, information generated when you use the platform, and information your organisation uploads on behalf of its loan book.\n\nStaff and user account data. When an organisation administrator creates an account for you, we store your full name, work email address, assigned role, and organisation membership. We also record login timestamps, failed login attempts, account lockout events, and — for users who enable it — a TOTP secret for multi-factor authentication.\n\nBorrower and case data. Lenders and agencies upload loan account records to the platform. This includes borrower name, phone number, email address, postal address, and a CKYC reference number. This data belongs to and is controlled by your organisation; Recoverpro processes it as a data processor on your behalf.\n\nLocation data (field officers only). Field officers who start a shift send GPS coordinates to the platform during that shift. Location data is collected only while a shift is active; no background tracking occurs outside active shifts.\n\nAI assistant (FRIDAY) conversations. When users interact with the built-in AI assistant, their messages and responses are stored to support conversation history. Chat sessions are automatically purged after 90 days.',
  },
  {
    num: '02',
    title: 'How we use information',
    body: 'We use the information described above to operate the platform and deliver contracted services — including account allocation, field team management, outbound communications, payment tracking, and reporting.\n\nWe authenticate users, enforce role-based access control, and detect or block suspicious login attempts. We enforce calling hours (08:00–19:00 IST, Monday–Saturday) and contact frequency limits per RBI Digital Lending Guidelines 2022.\n\nWe maintain tamper-evident audit trails, process grievances within SLA, and support DPDP Act 2023 consent management and right-to-erasure requests.\n\nWe do not sell personal data. We do not use borrower data to train general-purpose AI models.',
  },
  {
    num: '03',
    title: 'Sharing & disclosure',
    body: 'Recoverpro shares data only with parties that have a clear, contracted purpose.\n\nWithin your organisation: Authorised users see only the data permitted by their assigned role. Seven built-in roles each carry predefined access boundaries enforced at every API endpoint.\n\nCommunication providers: When your organisation sends outbound messages, the relevant borrower contact is transmitted to the configured delivery provider (SMS, WhatsApp, RCS, email, or IVR) via HMAC-authenticated webhooks.\n\nInfrastructure sub-processors: Vetted cloud infrastructure providers operating under written data-processing terms.\n\nLegal and regulatory: When required by law, court order, or to protect rights, safety, or property.\n\nWe do not share borrower data with advertisers or third-party marketers.',
  },
  {
    num: '04',
    title: 'Data retention',
    body: 'Personal and case data is retained for the duration of your organisation\'s subscription, plus any period required by applicable law. Records linked to financial transactions are typically retained for seven (7) to ten (10) years after the underlying loan account closes, in line with RBI record-keeping requirements.\n\nAudit-log events are retained as an append-only chain for the lifetime of the account and cannot be deleted by platform users.\n\nFRIDAY AI chat sessions are automatically purged after 90 days of inactivity under our data-minimisation practice under the DPDP Act 2023.',
  },
  {
    num: '05',
    title: 'Consent',
    body: 'Recoverpro implements DPDP Act 2023 §6 consent management at the platform level. When borrower consent is required, a consent artifact is created that records: the exact purpose and scope, the full text and version of the consent notice presented, a SHA-256 tamper-evidence hash, and the timestamp when consent was granted or revoked.\n\nConsent artifacts are immutable once created. A revocation creates a new record rather than modifying the original, preserving the full history.\n\nBorrowers may withdraw consent by contacting their lender or writing to us at support@recoverpro.in.',
  },
  {
    num: '06',
    title: 'Your rights',
    body: 'Under the Digital Personal Data Protection Act, 2023, you have the right to:\n\n• Access — obtain a summary of the personal data we hold about you.\n• Correction — request that inaccurate or incomplete personal data be corrected.\n• Erasure — request deletion of your personal data within the statutory period.\n• Grievance redressal — file a complaint with our Grievance Officer. Acknowledgement within 24 hours; resolution within 30 days.\n• Nomination — nominate another individual to exercise your rights in the event of death or incapacity.',
  },
  {
    num: '07',
    title: 'Security',
    body: 'Borrower PII is encrypted using AES-256-GCM. All traffic is served over HTTPS with HSTS enforced. Passwords are hashed with bcrypt (cost factor 12). Access tokens expire after 15 minutes; refresh tokens after 7 days.\n\nMFA is enforced for Platform Admin and Org Admin roles. Each organisation\'s data is isolated at every API boundary. Every action on the platform is logged in an append-only audit chain that cannot be modified or deleted.\n\nIn the event of a personal data breach, we will notify your organisation\'s primary contact without undue delay.',
  },
  {
    num: '08',
    title: 'Cookies & sessions',
    body: 'Recoverpro uses a JWT-based authentication model. There are no server-side sessions. We do not use cross-site tracking cookies or advertising cookies. We do not embed third-party analytics scripts that track you across websites.',
  },
  {
    num: '09',
    title: 'International transfers',
    body: 'Customer data is hosted in the India (Mumbai) AWS region (ap-south-1) by default. The platform enforces a boot-time data-localisation check. Where data is transferred outside India, we rely on contractual safeguards and the cross-border transfer rules notified under the DPDP Act 2023.',
  },
  {
    num: '10',
    title: 'Children\'s privacy',
    body: 'Recoverpro is a workplace platform for financial institutions and recovery agencies. Accounts are not provisioned for individuals under 18. We do not knowingly collect personal data from children.',
  },
  {
    num: '11',
    title: 'Changes to this policy',
    body: 'When we change this policy in a material way, we will update the "last updated" date at the top of this page and notify your organisation\'s primary administrator. Continued use of Recoverpro after a change takes effect constitutes acceptance of the revised policy.',
  },
  {
    num: '12',
    title: 'Grievance officer',
    body: 'In line with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, you may write to our Grievance Officer for any concern relating to your personal data:\n\nEmail: support@recoverpro.in\nResponse time: Acknowledgement within 24 hours; resolution within 30 days.',
  },
];

export default function PrivacyPolicyScreen() {
  const { colors, spacing } = useTheme();

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.s8 }}>
        {/* Hero */}
        <View style={[styles.hero, { borderBottomColor: colors.border }]}>
          <Text variant="caption" style={{ color: colors.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.s1 }}>
            Legal · Privacy Policy
          </Text>
          <Text variant="title" style={{ fontSize: 26, lineHeight: 32, marginBottom: spacing.s2 }}>
            Privacy at Recoverpro.
          </Text>
          <Text variant="caption" color="secondary">Last updated · {LAST_UPDATED}</Text>
          <Text variant="body" color="secondary" style={{ marginTop: spacing.s2, lineHeight: 22 }}>
            This policy explains what data Recoverpro collects when lenders, recovery agencies, and their authorised users operate the platform — and the choices you have over that data.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <View key={s.num} style={[styles.section, { borderBottomColor: colors.border, paddingHorizontal: spacing.s4 }]}>
            <Text variant="caption" style={{ color: colors.accent, fontWeight: '700', fontFamily: 'monospace', marginBottom: 4 }}>
              {s.num}
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1, marginBottom: spacing.s2, fontSize: 16 }}>
              {s.title}
            </Text>
            <Text variant="body" color="secondary" style={{ lineHeight: 22 }}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 24,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  section: {
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
});
