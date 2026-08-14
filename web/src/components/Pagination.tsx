import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  /** Total row count across all pages — shown as "· N total" when provided. */
  totalElements?: number;
  /** Noun for the totalElements count, e.g. "loans", "records". Defaults to "records". */
  itemLabel?: string;
  /** Use when this pagination sits inside a card header / toolbar instead of
   *  as its own bordered footer strip. */
  embedded?: boolean;
}

const PAGE_WINDOW = 5;

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  totalElements,
  itemLabel = 'records',
  embedded = false,
}: PaginationProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const jumpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      jumpInputRef.current?.focus();
      jumpInputRef.current?.select();
    }
  }, [isEditing]);

  const atFirst = currentPage === 0;
  const atLast = currentPage >= totalPages - 1;
  const prevDisabled = atFirst || isLoading;
  const nextDisabled = atLast || isLoading;
  const canJump = !isLoading && totalPages > 1;

  const start = Math.max(0, currentPage - Math.floor(PAGE_WINDOW / 2));
  const adjustedStart = Math.min(start, Math.max(0, totalPages - PAGE_WINDOW));
  const count = Math.min(PAGE_WINDOW, totalPages - adjustedStart);
  const pageNumbers = Array.from({ length: count }, (_, i) => adjustedStart + i);
  const digits = String(totalPages).length;

  const openJump = () => {
    if (!canJump) return;
    setDraft(String(currentPage + 1));
    setIsEditing(true);
  };

  const commitJump = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) {
      onPageChange(n - 1);
    }
    setIsEditing(false);
  };

  return (
    <div className={`up-pagination${embedded ? ' is-embedded' : ''}`}>
      <span className="up-page-meta">
        Page{' '}
        {isEditing ? (
          <input
            ref={jumpInputRef}
            type="text"
            inputMode="numeric"
            className="up-page-jump"
            style={{ width: `${digits + 1}ch` }}
            value={draft}
            onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => {
              if (e.key === 'Enter') commitJump();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onBlur={commitJump}
            aria-label={`Jump to page, 1 to ${totalPages}`}
          />
        ) : (
          <button
            type="button"
            className="up-page-num-btn"
            onClick={openJump}
            disabled={!canJump}
            aria-label="Jump to page"
          >
            {currentPage + 1}
          </button>
        )}
        {' '}of <strong>{totalPages}</strong>
        {totalElements != null && (
          <><span style={{ margin: '0 8px' }}>|</span><strong>{totalElements.toLocaleString('en-IN')}</strong> {itemLabel}</>
        )}
      </span>

      <div className="up-page-track">
        <button
          type="button"
          className="up-page-btn"
          onClick={() => onPageChange(0)}
          disabled={prevDisabled}
          aria-label="First page"
        >
          <ChevronsLeft size={13} />
        </button>
        <button
          type="button"
          className="up-page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={prevDisabled}
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
        </button>

        <div className="up-page-numbers">
          {pageNumbers.map(p => (
            <button
              key={p}
              type="button"
              className={`up-page-btn${p === currentPage ? ' is-active' : ''}`}
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              aria-label={`Page ${p + 1}`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p + 1}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="up-page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={nextDisabled}
          aria-label="Next page"
        >
          <ChevronRight size={13} />
        </button>
        <button
          type="button"
          className="up-page-btn"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={nextDisabled}
          aria-label="Last page"
        >
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  );
};
