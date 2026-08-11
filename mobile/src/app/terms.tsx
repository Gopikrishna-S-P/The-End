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
    title: 'Acceptance of terms',
    body: 'By accessing or using Recoverpro, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use the platform.\n\nThese terms form a binding legal agreement between you (and the organisation you represent) and Recoverpro. Your organisation\'s administrator accepted these terms on behalf of your organisation when the account was created.',
  },
  {
    num: '02',
    title: 'Eligibility & accounts',
    body: 'Recoverpro is a workplace platform for financial institutions, lenders, and recovery agencies operating in India. Accounts are provisioned exclusively for organisations that have entered into a valid subscription agreement.\n\nYou must be 18 years or older to use this platform. You are responsible for maintaining the confidentiality of your credentials and for all activities conducted under your account. You must immediately notify your Org Admin or us at support@recoverpro.in if you suspect any unauthorised use of your account.',
  },
  {
    num: '03',
    title: 'Subscription & fees',
    body: 'Access to Recoverpro is provided on a subscription basis. The applicable plan, pricing, and billing terms are set out in your organisation\'s Order Form or as displayed in the platform\'s Subscription settings.\n\nSubscription fees are due in advance and are non-refundable except as required by applicable law or expressly stated in your Order Form. We reserve the right to suspend access if fees remain unpaid after the due date. Price changes will be notified at least 30 days in advance.',
  },
  {
    num: '04',
    title: 'Customer data',
    body: 'You retain all rights, title, and interest in the data your organisation uploads to Recoverpro ("Customer Data"). You grant us a limited licence to process Customer Data solely to provide the services.\n\nYou are responsible for ensuring that your use of Customer Data — including borrower records, contact information, and case data — complies with applicable law, including the Digital Personal Data Protection Act 2023 and the RBI Digital Lending Guidelines 2022.\n\nWe process Customer Data as a data processor acting on your instructions. Our Privacy Policy describes in detail how we handle this data.',
  },
  {
    num: '05',
    title: 'Acceptable use',
    body: 'You agree to use Recoverpro only for lawful purposes and in accordance with these terms. You must not:\n\n• Use the platform to harass, threaten, or abuse any person, including borrowers.\n• Attempt to circumvent calling-hour restrictions, contact frequency limits, or any other RBI-mandated controls enforced by the platform.\n• Attempt to gain unauthorised access to any part of the platform or any other user\'s account.\n• Upload malicious code, files, or content that could harm the platform or other users.\n• Use the platform in any way that violates applicable law, including data protection and consumer protection legislation.\n\nWe reserve the right to suspend or terminate accounts that violate these terms without prior notice.',
  },
  {
    num: '06',
    title: 'Platform-enforced controls',
    body: 'Recoverpro enforces several controls mandated by the RBI Digital Lending Guidelines 2022 and the Recovery Agent Code of Conduct. These include:\n\n• Calling hours: outbound calls are restricted to 08:00–19:00 IST, Monday to Saturday.\n• Contact frequency limits: per-channel limits on the number of contacts per borrower per period.\n• Borrower consent: consent management in line with DPDP Act 2023 §6.\n• Grievance handling: SLA-tracked complaint workflows with mandatory acknowledgement and resolution deadlines.\n\nYou acknowledge that these controls are legally required and agree not to attempt to circumvent them.',
  },
  {
    num: '07',
    title: 'Service availability',
    body: 'We aim to provide high availability but do not guarantee that the platform will be uninterrupted or error-free. Planned maintenance will be communicated in advance where possible.\n\nWe are not liable for service interruptions caused by third-party providers (including cloud infrastructure, SMS gateways, or payment processors), force majeure events, or your own network or device failures.',
  },
  {
    num: '08',
    title: 'Intellectual property',
    body: 'Recoverpro and all underlying technology, software, designs, trademarks, and content (excluding Customer Data) are the exclusive property of Recoverpro and its licensors. These terms do not grant you any right to use our trademarks, logos, or branding.\n\nYou may not copy, modify, distribute, sell, or create derivative works of the platform or any part of it without our prior written consent.',
  },
  {
    num: '09',
    title: 'Confidentiality',
    body: 'Each party agrees to keep the other\'s confidential information — including pricing, product roadmap, and non-public technical details — confidential and to use it only for the purpose of this agreement. This obligation does not apply to information that is or becomes publicly available through no breach of this agreement, or that is required to be disclosed by law.',
  },
  {
    num: '10',
    title: 'Warranties & disclaimers',
    body: 'We warrant that we will provide the services with reasonable care and skill. To the extent permitted by law, all other warranties — express or implied, including fitness for a particular purpose and non-infringement — are excluded.\n\nThe platform is not a substitute for legal, financial, or compliance advice. You are responsible for ensuring that your use of the platform meets your regulatory obligations.',
  },
  {
    num: '11',
    title: 'Limitation of liability',
    body: 'To the maximum extent permitted by applicable law, our aggregate liability to you for any claims arising out of or related to these terms or the services shall not exceed the total fees paid by you in the twelve (12) months preceding the claim.\n\nIn no event shall we be liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, even if we have been advised of the possibility of such damages.',
  },
  {
    num: '12',
    title: 'Indemnification',
    body: 'You agree to indemnify and hold harmless Recoverpro and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses — including reasonable legal fees — arising out of or related to your use of the platform, your violation of these terms, or your violation of any applicable law.',
  },
  {
    num: '13',
    title: 'Termination',
    body: 'Either party may terminate these terms by providing written notice if the other party materially breaches any provision and fails to cure the breach within 30 days of written notice.\n\nWe may suspend or terminate your access immediately if we believe your use poses a security risk, violates applicable law, or harms other users. On termination, your licence to use the platform ends immediately. We will provide your Customer Data for export on request, after which it will be deleted in accordance with our data deletion procedure.',
  },
  {
    num: '14',
    title: 'Governing law & disputes',
    body: 'These terms are governed by the laws of India. Any dispute arising out of or related to these terms shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra, India.\n\nBefore commencing legal proceedings, the parties agree to attempt to resolve any dispute informally by escalating to senior representatives within 30 days of a written notice of dispute.',
  },
  {
    num: '15',
    title: 'Changes to these terms',
    body: 'We reserve the right to modify these terms at any time. Material changes will be communicated to your organisation\'s primary administrator at least 30 days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the revised terms.',
  },
  {
    num: '16',
    title: 'Contact',
    body: 'If you have any questions about these Terms of Service, please contact us:\n\nEmail: support@recoverpro.in\nResponse time: We aim to respond to legal enquiries within 5 business days.',
  },
];

export default function TermsScreen() {
  const { colors, spacing } = useTheme();

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.s8 }}>
        {/* Hero */}
        <View style={[styles.hero, { borderBottomColor: colors.border }]}>
          <Text variant="caption" style={{ color: colors.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.s1 }}>
            Legal · Terms of Service
          </Text>
          <Text variant="title" style={{ fontSize: 26, lineHeight: 32, marginBottom: spacing.s2 }}>
            Terms of Service.
          </Text>
          <Text variant="caption" color="secondary">Last updated · {LAST_UPDATED}</Text>
          <Text variant="body" color="secondary" style={{ marginTop: spacing.s2, lineHeight: 22 }}>
            These terms govern your access to and use of the Recoverpro platform. By using the platform you agree to be bound by them.
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
