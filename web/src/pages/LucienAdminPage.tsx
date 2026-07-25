import { useState } from 'react';
import SystemPromptAdminPage from './SystemPromptAdminPage';
import RagDocumentsPage from './RagDocumentsPage';
import './Dashboard.css';

type Tab = 'prompts' | 'rag';

export default function LucienAdminPage() {
  const [tab, setTab] = useState<Tab>('prompts');

  return (
    <>
      <div style={{ padding: '16px 24px 0' }}>
        <div className="db-kpi-toggle" role="tablist" aria-label="Lucien admin view">
          <button type="button" onClick={() => setTab('prompts')}
            className={`db-kpi-toggle-btn${tab === 'prompts' ? ' is-active' : ''}`}
            role="tab" aria-selected={tab === 'prompts'}>
            Prompts
          </button>
          <button type="button" onClick={() => setTab('rag')}
            className={`db-kpi-toggle-btn${tab === 'rag' ? ' is-active' : ''}`}
            role="tab" aria-selected={tab === 'rag'}>
            Knowledge Base
          </button>
        </div>
      </div>
      {tab === 'prompts' ? <SystemPromptAdminPage /> : <RagDocumentsPage />}
    </>
  );
}
