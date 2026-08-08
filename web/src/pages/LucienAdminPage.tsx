import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SystemPromptAdminPage from './SystemPromptAdminPage';
import RagDocumentsPage from './RagDocumentsPage';
import './Dashboard.css';

type Tab = 'prompts' | 'rag';

export default function LucienAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'prompts';

  return tab === 'prompts'
    ? <SystemPromptAdminPage />
    : <RagDocumentsPage />;
}
