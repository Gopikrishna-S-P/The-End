import type { ReactNode } from 'react';
import { createElement } from 'react';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
  /** Server refused this turn on safety grounds — rendered as a notice, not a reply. */
  blocked?: boolean;
  blockReason?: string;
}

export interface Session {
  sessionId: string;
  agentId: string;
  agentFirstName: string;
  active: boolean;
  totalMessages: number;
  createdAt: string;
  updatedAt: string;
}

export const SAMPLE_PROMPTS = [
  'How should I approach a borrower who avoids calls?',
  'What negotiation scripts work for partial payments?',
  'Help me draft a follow-up message for a broken PTP.',
  "What should I say when a borrower claims financial hardship?",
];

export function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const result: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(createElement('ul', { key: key++, style: { paddingLeft: 18, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 3 } }, ...listItems));
      listItems = [];
    }
  };

  const formatInline = (s: string): ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return createElement('strong', { key: i, style: { fontWeight: 700 } }, part.slice(2, -2));
      if (part.startsWith('`') && part.endsWith('`'))
        return createElement('code', { key: i, style: { fontFamily: 'var(--mono)', fontSize: 12, background: 'rgba(0,0,0,.08)', padding: '1px 5px', borderRadius: 4 } }, part.slice(1, -1));
      if (part.startsWith('*') && part.endsWith('*'))
        return createElement('em', { key: i }, part.slice(1, -1));
      return part;
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed)) {
      listItems.push(createElement('li', { key: key++, style: { listStyle: 'disc' } }, formatInline(trimmed.replace(/^[-*•]\s+/, ''))));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(createElement('li', { key: key++, style: { listStyle: 'decimal' } }, formatInline(trimmed.replace(/^\d+\.\s+/, ''))));
    } else {
      flushList();
      if (trimmed === '') {
        result.push(createElement('div', { key: key++, style: { height: 6 } }));
      } else if (trimmed.startsWith('###')) {
        result.push(createElement('div', { key: key++, style: { fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 2 } }, formatInline(trimmed.slice(3).trim())));
      } else if (trimmed.startsWith('##')) {
        result.push(createElement('div', { key: key++, style: { fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 } }, formatInline(trimmed.slice(2).trim())));
      } else {
        result.push(createElement('p', { key: key++, style: { margin: 0 } }, formatInline(trimmed)));
      }
    }
  }
  flushList();
  return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } }, ...result);
}
