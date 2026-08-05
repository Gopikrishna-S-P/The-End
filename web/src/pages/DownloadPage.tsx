import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Smartphone, ArrowLeft, Download, ExternalLink,
  Check, X, Globe, MapPin, WifiOff, Camera,
  ShieldAlert, FileCheck, ChevronDown,
} from "lucide-react";
import { Logo, Footer } from "../components";
import { useScrollReveal, useScrollProgress } from "../hooks/public-motion";
import "../styles/DownloadPage.css";
import "../styles/public-motion.css";

// Served from the app's own domain (see build-apk.yml upload step). The GitHub
// repo is private, so a releases/latest/download/... link would 404 for the
// public — we host the APK on recoverpro.in instead.
const ANDROID_RELEASE_URL = "https://recoverpro.in/download/recoverpro.apk";

const STATS = [
  { value: "Android 8.0+", label: "Minimum version" },
  { value: "Offline-first", label: "Works without signal" },
  { value: "GPS + photos", label: "Evidence on the spot" },
  { value: "Auto-sync",     label: "When signal returns" },
];

const FEATURES = [
  {
    icon: MapPin,
    title: "Live field tracking",
    desc: "GPS location logged on every visit. Managers see the field team on a live map during active shifts.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    desc: "Log visits, notes, and PTPs without a signal. Everything syncs automatically when connectivity returns.",
  },
  {
    icon: Camera,
    title: "Photo evidence",
    desc: "Capture photos and attach them to a visit record on the spot. Timestamped and tamper-evident.",
  },
  {
    icon: FileCheck,
    title: "Promise to pay",
    desc: "Record a PTP, set a follow-up date, and get borrower confirmation — all from the field.",
  },
  {
    icon: ShieldAlert,
    title: "SOS alert",
    desc: "One tap sends an emergency alert with your live location to your manager and team lead.",
  },
  {
    icon: Smartphone,
    title: "All your cases",
    desc: "See every account assigned to you, case history, contact details, and compliance rules — in one place.",
  },
];

const STEPS = [
  "Tap Download APK below",
  'Enable "Install from unknown sources" if prompted',
  "Open the downloaded file to install",
  "Sign in with your Recoverpro credentials",
];

const FAQS = [
  {
    q: "Why isn't Recoverpro on the Play Store?",
    a: "Recoverpro is a workplace platform deployed for specific financial institutions. Distribution via direct APK lets your organisation control which version is installed and roll updates on their schedule.",
  },
  {
    q: "Is it safe to install from an APK?",
    a: "Yes — the APK is signed and published directly from our verified GitHub releases. Android will ask you to allow installation from unknown sources once; you can disable it again after.",
  },
  {
    q: "What does the app need permission for?",
    a: "Location (GPS during active shifts only), Camera (photo evidence on visits), and Storage (offline data). No permissions are requested outside active use.",
  },
  {
    q: "I'm a manager or admin — do I need the app?",
    a: "No. Managers, team leads, and admins use the full web platform on desktop. The mobile app is built specifically for field officers and callers working on the go.",
  },
];

type ToastItem = { id: number; message: string; type: "success" | "error" | "info" };

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, show };
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`dl-faq-item${open ? " is-open" : ""}`}>
      <button className="dl-faq-q" onClick={() => setOpen(v => !v)}>
        {q}
        <ChevronDown size={16} className="dl-faq-chevron" />
      </button>
      <div className="dl-faq-a-wrap">
        <div className="dl-faq-a-inner">
          <p className="dl-faq-a">{a}</p>
        </div>
      </div>
    </div>
  );
}

class DownloadErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="download-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: "24px" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 13, color: "var(--ink-secondary)", marginBottom: 24 }}>Please refresh the page to try again.</p>
            <button className="download-btn" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function DownloadPageInner() {
  const { toasts, show } = useToast();
  useScrollReveal();
  useScrollProgress();

  return (
    <div className="download-page dw-page-enter">

      {/* ── Navbar ── */}
      <nav className="download-nav">
        <Logo height={40} />
        <Link to="/" className="download-nav-back" aria-label="Back to home">
          <ArrowLeft size={16} /> Home
        </Link>
      </nav>

      {/* ── Hero ── */}
      <header className="download-header">
        <span className="download-eyebrow">Distribution</span>
        <h1 className="download-title">App <em>Downloads</em></h1>
        <p className="download-subtitle">Get RecoverPro on your device</p>
      </header>

      {/* ── Stats strip ── */}
      <div className="download-stats">
        {STATS.map(s => (
          <div className="download-stat" key={s.label}>
            <div className="download-stat-value">{s.value}</div>
            <div className="download-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <section className="download-features">
        <div className="download-section-head">
          <p className="download-section-label">What you get</p>
          <h2 className="download-section-title">Built for the field.</h2>
        </div>
        <div className="download-fgrid">
          {FEATURES.map(f => (
            <div className="download-fgrid-card" key={f.title}>
              <span className="download-fgrid-icon"><f.icon size={20} strokeWidth={1.8} /></span>
              <h3 className="download-fgrid-title">{f.title}</h3>
              <p className="download-fgrid-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Download + Desktop ── */}
      <section className="download-get">

        <article className="download-card">
          <div className="download-card-top">
            <div className="download-card-icon"><Smartphone size={24} strokeWidth={1.8} /></div>
            <span className="download-badge download-badge--green">Latest release</span>
          </div>
          <h2 className="download-card-name">Android APK</h2>
          <p className="download-card-desc">Download and install directly on your device. No app store required.</p>

          <ol className="download-steps">
            {STEPS.map((s, i) => (
              <li key={i} className="download-step">
                <span className="download-step-num">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          <div className="download-card-footer">
            <span className="download-note">Requires Android 8.0+</span>
            <a
              href={ANDROID_RELEASE_URL}
              download
              className="download-btn"
              rel="noopener noreferrer"
              onClick={() => show("Android download started", "success")}
            >
              <Download size={14} />
              <span>Download APK</span>
            </a>
          </div>
        </article>

        <aside className="download-desktop-callout">
          <div className="download-desktop-callout-icon"><Globe size={18} /></div>
          <div className="download-desktop-callout-text">
            <strong>On a desktop?</strong> Managers and admins sign in directly via browser — no install needed. Full allocation, dispatch, reporting, and compliance controls available on the web.
          </div>
          <Link to="/login" className="download-desktop-callout-link">
            <ExternalLink size={13} /> Open web app
          </Link>
        </aside>

      </section>

      {/* ── FAQ ── */}
      <section className="download-faq-section">
        <div className="download-section-head">
          <p className="download-section-label">Questions</p>
          <h2 className="download-section-title">Common questions about the app.</h2>
        </div>
        <div className="download-faq-list">
          {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      <Footer />

      <div className="dw-toast-container" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`dw-toast is-${t.type}`}>
            {t.type === "success" && <Check size={14} />}
            {t.type === "error"   && <X    size={14} />}
            {t.message}
          </div>
        ))}
      </div>

    </div>
  );
}

export default function DownloadPage() {
  return (
    <DownloadErrorBoundary>
      <DownloadPageInner />
    </DownloadErrorBoundary>
  );
}
