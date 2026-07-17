import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 28,
  padding: '0 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-surface)',
  color: disabled ? 'var(--text-placeholder)' : 'var(--text-secondary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 550,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background var(--dur-fast), border-color var(--dur-fast)',
  opacity: disabled ? 0.5 : 1,
});

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}: PaginationProps) => {
  const prevDisabled = currentPage === 0 || isLoading;
  const nextDisabled = currentPage >= totalPages - 1 || isLoading;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
        Page {currentPage + 1} of {totalPages}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={prevDisabled}
          style={btnStyle(prevDisabled)}
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
          Prev
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={nextDisabled}
          style={btnStyle(nextDisabled)}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};
