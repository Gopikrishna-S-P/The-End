interface Props {
  onClose: () => void;
}

export function LoginContactModal({ onClose }: Props) {
  return (
    <div className="contact-overlay" role="dialog" aria-modal="true" aria-label="Contact us" onClick={onClose}>
      <div className="contact-modal" onClick={e => e.stopPropagation()}>
        <button className="contact-close" aria-label="Close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="contact-eyebrow">
          Get in touch
        </div>
        <h2 className="contact-title">Request access</h2>
        <p className="contact-body">
          Recoverpro is invite-only. Reach out and we'll get you onboarded.
        </p>
        <div className="contact-items">
          <a href="mailto:recoverpro.offl@gmail.com" className="contact-item">
            <span className="contact-item-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 5l6.5 4.5L14.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
            <span>recoverpro.offl@gmail.com</span>
          </a>
          <a href="tel:+919945914234" className="contact-item">
            <span className="contact-item-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 2h3l1.5 3.5-2 1.2A9 9 0 009.3 10.5l1.2-2L14 10v3a1 1 0 01-1 1C6.4 14 2 9.6 2 3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>+91 99459 14234</span>
          </a>
        </div>
      </div>
    </div>
  );
}
