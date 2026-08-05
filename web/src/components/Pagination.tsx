import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const prevDisabled = currentPage === 0 || isLoading;
  const nextDisabled = currentPage >= totalPages - 1 || isLoading;

  const start = Math.max(0, currentPage - Math.floor(PAGE_WINDOW / 2));
  const adjustedStart = Math.min(start, Math.max(0, totalPages - PAGE_WINDOW));
  const count = Math.min(PAGE_WINDOW, totalPages - adjustedStart);
  const pageNumbers = Array.from({ length: count }, (_, i) => adjustedStart + i);

  return (
    <div className={`up-pagination${embedded ? ' is-embedded' : ''}`}>
      <span className="up-page-meta">
        Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
        {totalElements != null && (
          <> · <strong>{totalElements.toLocaleString('en-IN')}</strong> {itemLabel}</>
        )}
      </span>

      <div className="up-page-numbers">
        <button
          type="button"
          className="up-page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={prevDisabled}
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
        </button>

        {adjustedStart > 0 && <span className="up-page-meta" aria-hidden="true">…</span>}

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

        {adjustedStart + count < totalPages && <span className="up-page-meta" aria-hidden="true">…</span>}

        <button
          type="button"
          className="up-page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={nextDisabled}
          aria-label="Next page"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};
