import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="rp-footer" role="contentinfo">
      <div className="rp-footer-inner">
        <div className="rp-footer-top">
          <div className="rp-footer-brand-col">
            <Logo height={28} className="rp-footer-logo" />
            <p className="rp-footer-tagline">Recovery operations platform · RBI-aligned</p>
          </div>

          <nav className="rp-footer-col" aria-label="Product links">
            <span className="rp-footer-col-title">Product</span>
            <Link to="/download" className="rp-footer-link">Download App</Link>
            <Link to="/login"    className="rp-footer-link">Sign In</Link>
          </nav>

          <nav className="rp-footer-col" aria-label="Company links">
            <span className="rp-footer-col-title">Company</span>
            <Link to="/privacy" className="rp-footer-link">Privacy Policy</Link>
            <Link to="/terms"   className="rp-footer-link">Terms of Service</Link>
          </nav>

          <nav className="rp-footer-col" aria-label="Contact links">
            <span className="rp-footer-col-title">Contact</span>
            <a href="tel:+919945914234"               className="rp-footer-link">+91 99459 14234</a>
            <a href="mailto:hello@recoverpro.in" className="rp-footer-link">hello@recoverpro.in</a>
          </nav>
        </div>

        <div className="rp-footer-bottom">
          <span className="rp-footer-copy">© {new Date().getFullYear()} RecoverPro. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
