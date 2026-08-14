import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SystemPromptAdminPage from './SystemPromptAdminPage';
import RagDocumentsPage from './RagDocumentsPage';
import './Dashboard.css';

type Tab = 'prompts' | 'rag';

export default function LucienAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'prompts';

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setSearchParams({ tab: 'prompts' })}
        style={{
          background: tab === 'prompts' ? 'var(--brand)' : 'transparent',
          color: tab === 'prompts' ? 'var(--text-on-solid, #fff)' : 'var(--ink-secondary)',
          border: tab === 'prompts' ? '1px solid var(--brand)' : '1px solid var(--border-color)',
          borderRadius: 6,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: tab === 'prompts' ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        System prompt
      </button>
      <button
        type="button"
        onClick={() => setSearchParams({ tab: 'rag' })}
        style={{
          background: tab === 'rag' ? 'var(--brand)' : 'transparent',
          color: tab === 'rag' ? 'var(--text-on-solid, #fff)' : 'var(--ink-secondary)',
          border: tab === 'rag' ? '1px solid var(--brand)' : '1px solid var(--border-color)',
          borderRadius: 6,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: tab === 'rag' ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        RAG documents
      </button>
    </div>
  );

  return (
    <>
      {tab === 'prompts' ? (
        <SystemPromptAdminPage headerExtra={renderTabs()} />
      ) : (
        <RagDocumentsPage headerExtra={renderTabs()} />
      )}
    </>
  );
}
