import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Logo, Footer } from "./components";
import { AppPreviewFrame } from "./components/AppPreviewFrame";
import {
  FeatureLedger,
  SupportSection,
} from "./components/landing";
import { useScrollReveal } from "./hooks/public-motion";
// NOTE: not importing `useRipple` from public-motion — LandingPage has its
// own ripple handler bound to the CTA's onClick. Importing the global
// installer would double-fire.
import { getUserCache } from "./api";
import "./styles/LandingPage.css";
import "./styles/public-motion.css";

// ── Ripple ───────────────────────────────────────────────────────────────────

function useRipple() {
  return useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const el = document.createElement("span");
    el.className = "landing-ripple";
    el.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }, []);
}

// ── Data ─────────────────────────────────────────────────────────────────────

const GUARANTEES = [
  "CALLING HOURS 08:00–19:00",
  "CONTACT LIMITS PER CHANNEL",
  "DPDP CONSENT ON RECORD",
  "DUAL-CONTROL APPROVALS",
  "AES-256 AT REST",
  "TAMPER-PROOF AUDIT",
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const ripple = useRipple();

  useScrollReveal();

  useEffect(() => {
    // SEO Meta Tags
    document.title = "RecoverPro | Run Recovery Better";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Allocate accounts, dispatch your field team, log every visit, and reconcile every rupee — on one platform that keeps you inside RBI rules by default.");
  }, []);

  useEffect(() => {
    const userStr = getUserCache();
    if (userStr) { try { JSON.parse(userStr); setIsAuthenticated(true); } catch { /* ignore */ } }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const h = doc.scrollHeight - doc.clientHeight;
      setScrollProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaLabel = isAuthenticated ? "Go to Dashboard" : "Get in Touch";

  const handleCta = (e: React.MouseEvent<HTMLButtonElement>) => {
    ripple(e);
    if (isAuthenticated) {
      setTimeout(() => navigate("/app/dashboard"), 160);
    } else {
      setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 160);
    }
  };

  return (
    <div className="landing">
      <div className="landing-progress" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <Logo height={40} />
        <div className="landing-nav-links">
          <Link to="/privacy"  className="landing-nav-link">Privacy</Link>
          <Link to="/terms"    className="landing-nav-link">Terms</Link>
          <Link to="/download" className="landing-nav-link">Download</Link>
          {isAuthenticated
            ? <Link to="/app/dashboard" className="landing-nav-cta">Go to Dashboard <ArrowRight size={14} /></Link>
            : <Link to="/login"         className="landing-nav-cta">Sign In</Link>
          }
        </div>
      </nav>

      {/* ── Hero — centered ── */}
      <section className="landing-hero">
        <span className="landing-eyebrow">
          Recovery operations platform · RBI-aligned
        </span>

        <h1 className="landing-headline">
          Run Recovery <em>Better.</em>
        </h1>

        <p className="landing-subhead">
          Allocate accounts, dispatch your field team, log every visit, and
          reconcile every rupee — on one platform that keeps you inside RBI
          rules by default.
        </p>

        <div className="landing-cta-row">
          <button className="landing-btn-primary pm-press pm-focus-ring" onClick={handleCta}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {ctaLabel} <ArrowRight size={16} />
            </span>
          </button>
          {isAuthenticated
            ? <Link to="/download" className="landing-btn-ghost pm-focus-ring">Get the App</Link>
            : <Link to="/login"    className="landing-btn-ghost pm-focus-ring">Sign In</Link>
          }
        </div>

        {/* ── Product frame — real app preview ── */}
        <AppPreviewFrame />
      </section>

      {/* ── 02 · Features ── */}
      <section className="landing-section landing-section-alt" id="features">
        <div className="landing-section-head">
          <div>
            <p className="landing-section-label">What's inside</p>
            <h2 className="landing-section-title">Everything your recovery team needs.</h2>
          </div>
        </div>
        <FeatureLedger />
      </section>

      {/* ── Compliance band — inverted statement ── */}
      <section className="landing-compliance" id="compliance">
        <h2 className="landing-compliance-title">
          Compliance isn't a feature here.<br /><em>It's the floor.</em>
        </h2>
        <p className="landing-compliance-sub">
          Calling windows, contact limits, consent, dual approvals — enforced
          before anything goes out. Not settings someone can switch off.
        </p>
        <div className="landing-compliance-chips">
          {GUARANTEES.map((g) => <span className="landing-compliance-chip" key={g}>{g}</span>)}
        </div>
      </section>


      {/* ── CTA banner ── */}
      <section className="landing-cta-banner">
        <h2 className="landing-cta-banner-title">
          Your field team is ready.<br /><em>Is your platform?</em>
        </h2>
        <p className="landing-cta-banner-sub">
          Give your ops lead a dashboard that actually tells them what's happening — not a spreadsheet that's already wrong.
        </p>
        <button className="landing-btn-primary pm-press pm-focus-ring" onClick={handleCta}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {ctaLabel} <ArrowRight size={16} />
          </span>
        </button>
        <p className="landing-cta-banner-micro">No commitment required · setup in a day</p>
      </section>

      {/* ── Support ── */}
      <SupportSection />

      <Footer />
    </div>
  );
}
