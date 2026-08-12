import { useState } from 'react';
import { Pagination } from '../components/Pagination';

export default function PaginationPreview() {
  const [page, setPage] = useState(3);
  const [dark, setDark] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#0C0A09' : '#F9FAFB', padding: 40 }} className={dark ? 'dark' : ''}>
      <button onClick={() => setDark(d => !d)} style={{ marginBottom: 24, padding: '6px 12px' }}>
        Toggle {dark ? 'Light' : 'Dark'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <Pagination currentPage={page} totalPages={128} onPageChange={setPage} totalElements={3482} itemLabel="loans" />
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
          <div>Embedded variant (in a toolbar):</div>
          <Pagination embedded currentPage={page} totalPages={128} onPageChange={setPage} totalElements={3482} itemLabel="loans" />
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{padding: 8}}>Small totalPages (3):</div>
          <Pagination currentPage={0} totalPages={3} onPageChange={() => {}} totalElements={42} itemLabel="records" />
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{padding: 8}}>Loading state:</div>
          <Pagination currentPage={page} totalPages={128} onPageChange={setPage} totalElements={3482} itemLabel="loans" isLoading />
        </div>
      </div>
    </div>
  );
}
