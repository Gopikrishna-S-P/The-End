import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import "./Footer.css";

// Section links use plain hrefs rather than <Link>: the footer also renders on
// /download, where a router-only hash never scrolls. `/#features` is a same-
// document fragment jump on the landing page and a normal navigation elsewhere.

const CONTACT_EMAIL = "hello@recoverpro.in";

export function Footer() {
  return (
    <footer className="rp-footer" role="contentinfo">
      <div className="rp-footer-inner">
        <div className="rp-footer-top">

          <div className="rp-footer-brand-col">
            <Logo height={28} className="rp-footer-logo" />
            <p className="rp-footer-tagline">Recovery operations platform · RBI-aligned</p>
            <div className="rp-footer-contact">
              <a href={`mailto:${CONTACT_EMAIL}`} className="rp-footer-link">{CONTACT_EMAIL}</a>
            </div>
          </div>

          <nav className="rp-footer-col" aria-label="Product links">
            <span className="rp-footer-col-title">Product</span>
            <Link to="/" className="rp-footer-link">Overview</Link>
            <a href="/#features" className="rp-footer-link">What's inside</a>
            <a href="/#compliance" className="rp-footer-link">Compliance</a>
            <Link to="/download" className="rp-footer-link">Field app</Link>
          </nav>

          <nav className="rp-footer-col" aria-label="Support links">
            <span className="rp-footer-col-title">Support</span>
            <a href="/#contact" className="rp-footer-link">Contact us</a>
            <a href="/#contact" className="rp-footer-link">FAQs</a>
            <Link to="/forgot-password" className="rp-footer-link">Reset password</Link>
          </nav>

          <nav className="rp-footer-col" aria-label="Account links">
            <span className="rp-footer-col-title">Account</span>
            <Link to="/login" className="rp-footer-link">Sign in</Link>
            <Link to="/download" className="rp-footer-link">Download app</Link>
          </nav>
        </div>

        <div className="rp-footer-bottom">
          <span className="rp-footer-copy">
            © {new Date().getFullYear()} RecoverPro. All rights reserved.
          </span>
          <nav className="rp-footer-legal" aria-label="Legal links">
            <Link to="/privacy" className="rp-footer-legal-link">Privacy</Link>
            <span className="rp-footer-legal-sep" aria-hidden="true">·</span>
            <Link to="/terms" className="rp-footer-legal-link">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
