import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { loadingSplash } from '../utils/loadingSplash';
import './LoadingSplash.css';

export default function LoadingSplash() {
  const [state, setState] = useState({ visible: false, message: 'Signing you in' });

  useEffect(() => loadingSplash.subscribe((v, m) => setState({ visible: v, message: m || 'Signing you in' })), []);

  if (!state.visible) return null;

  return createPortal(
    <div
      className="app-loading-splash"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="app-loading-splash-glow" aria-hidden="true" />
      <div className="app-loading-splash-grid" aria-hidden="true" />
      <div className="app-loading-splash-content">
        <div className="app-loading-splash-logo">
          <Logo height={56} />
        </div>
        <div className="app-loading-splash-bar" aria-hidden="true">
          <div className="app-loading-splash-bar-fill" />
        </div>
        <p className="app-loading-splash-text">
          <Loader2 size={14} className="app-loading-splash-spin" aria-hidden="true" />
          <span>{state.message}</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
