import { useState } from 'react';
import SystemPromptAdminPage from './SystemPromptAdminPage';
import RagDocumentsPage from './RagDocumentsPage';
import './Dashboard.css';

type Tab = 'prompts' | 'rag';

export default function LucienAdminPage() {
  const [tab, setTab] = useState<Tab>('prompts');

  const toggle = (
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
  );

  return tab === 'prompts'
    ? <SystemPromptAdminPage headerExtra={toggle} />
    : <RagDocumentsPage headerExtra={toggle} />;
}
