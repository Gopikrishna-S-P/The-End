import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './AccessDenied.css';

interface AccessDeniedProps {
  reason?: string;
}

export default function AccessDenied({ reason }: AccessDeniedProps) {
  return createPortal(
    <div className="access-denied-page" role="alert" aria-live="assertive">
      <div className="access-denied-icon-circle" aria-hidden="true">
        <span className="access-denied-icon-shake">
          <X size={56} strokeWidth={3} />
        </span>
      </div>

      <h1 className="access-denied-title">Access Denied</h1>
      <p className="access-denied-sub">
        {reason || 'You do not have permission to view this page.'}
      </p>
      <p className="access-denied-sub">
        Please check your credentials and try again.
      </p>
    </div>,
    document.body,
  );
}
