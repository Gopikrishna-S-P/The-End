import type { CSSProperties } from 'react';
import { Logo } from '../components';

export function LoginBrandPanel() {
  return (
    <section className="left" aria-label="Brand">
      <a href="/" className="logo" aria-label="Recoverpro home">
        <Logo height={40} />
      </a>

      <div className="hero" style={{ position: 'relative', zIndex: 2 }}>
        <div className="eyebrow" style={{ '--pm-i': 0 } as CSSProperties}>
          Recovery operations platform · RBI-aligned
        </div>
        <h1 className="headline" style={{ '--pm-i': 1 } as CSSProperties}>
          Run Recovery <em>Better.</em>
        </h1>
        <p className="subhead" style={{ '--pm-i': 2 } as CSSProperties}>
          Allocate accounts, dispatch your field team, log every visit, and reconcile every rupee — on one platform that keeps you inside RBI rules by default.
        </p>
      </div>

      <div className="trust-strip">
        <div className="status-bar" role="list" aria-label="Platform highlights">
          <div className="status-item" role="listitem">AI ASSISTANT BUILT-IN</div>
          <div className="status-item" role="listitem">LIVE FIELD TRACKING</div>
          <div className="status-item" role="listitem">OFFICE + FIELD</div>
        </div>
      </div>

      <footer aria-label="Version info">
        <span className="left-footer-meta">© {new Date().getFullYear()} Recoverpro</span>
      </footer>
    </section>
  );
}
