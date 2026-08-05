import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldX, ArrowLeft, Link2 } from 'lucide-react';
import { Logo } from './Logo';
import './AccessDenied.css';

interface AccessDeniedProps {
  reason?: string;
}

export default function AccessDenied({ reason }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return createPortal(
    <div className="access-denied-backdrop" role="alert" aria-live="assertive">
      <div className="access-denied-dialog">
        <div className="access-denied-logo">
          <Logo height={40} />
        </div>

        <div className="access-denied-icon" aria-hidden="true">
          <ShieldX size={20} />
        </div>
        <h1 className="access-denied-title">Access denied</h1>
        <p className="access-denied-sub">
          {reason || 'You do not have permission to access this page. Contact your administrator if you think this is a mistake.'}
        </p>

        <div className="access-denied-route-chip">
          <Link2 size={13} aria-hidden="true" />
          <code>{pathname}</code>
        </div>

        <div className="access-denied-actions">
          <button type="button" className="access-denied-btn-primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Go back
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
