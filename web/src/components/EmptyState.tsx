import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  sub?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({
  message = 'No data found',
  sub,
  icon,
  action,
}: EmptyStateProps) => (
  <div className="ds-empty">
    <div className="ds-empty-icon" aria-hidden="true">
      {icon ?? <Inbox size={20} />}
    </div>
    <p className="ds-empty-title">{message}</p>
    {sub && <p className="ds-empty-sub">{sub}</p>}
    {action && <div className="ds-empty-actions">{action}</div>}
  </div>
);
