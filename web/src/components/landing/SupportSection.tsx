import { useState } from "react";
import { ArrowRight, CheckCircle, Phone, Mail, Loader2 } from "lucide-react";
import { FaqItem } from "./FaqItem";

const CONTACT_EMAIL = "recoverpro.offl@gmail.com";
const CONTACT_PHONE = "+91 99459 14234";

const FAQS = [
  { q: "Is RecoverPro RBI compliant?",
    a: "Yes. Calling hours (08:00–19:00, Mon–Sat), per-channel contact frequency limits, borrower consent under DPDP, grievance redressal with SLA tracking, and dual-control approvals are all enforced at the platform level — not as optional settings." },
  { q: "Is our borrower data secure?",
    a: "Borrower PII — phone numbers, email, address — is encrypted at rest using AES-256. Role-based access ensures staff only see what their role permits. Every action across the platform is logged in a tamper-proof audit trail." },
  { q: "Does it work on mobile?",
    a: "Yes. Field officers use a dedicated mobile app that works offline — visit notes, photos, and location pings are queued and synced automatically when connectivity returns. Managers and admins access the full platform via browser." },
  { q: "Can we upload our existing loan book?",
    a: "Yes. Upload your accounts as a spreadsheet file (up to 50,000 rows per batch). The platform supports custom column schemas so your existing data format maps cleanly without manual reformatting." },
  { q: "Can multiple branches or teams use it?",
    a: "Yes. The platform is multi-tenant by design. Each organisation has its own isolated workspace, user roles, and data. Teams, branches, or LSPs operate independently within the same platform." },
  { q: "What roles and access levels are available?",
    a: "Seven built-in roles: Platform Admin, Org Admin, Manager, Team Lead, Field Officer, Caller, and Tracer. Each role has predefined permissions, and additional granular permissions can be assigned per user." },
  { q: "How does offline sync work?",
    a: "The field officer app caches their assigned cases locally before they leave. Any action taken without connectivity — visit logs, photos, GPS pings, PTP recordings — is stored on-device and pushed to the server the moment a network connection is detected. Nothing is lost." },
  { q: "How is pricing structured?",
    a: "Pricing is per active user per month, with no per-case or per-transaction fees. Field officers, callers, and tracers are billed at a lower seat rate than admin roles. Volume discounts apply for larger teams. Contact us for a quote tailored to your headcount and loan book size." },
  { q: "How long does onboarding take?",
    a: "Most teams are operational within one business day. Upload your loan book, invite your staff, and the first dispatch can go out the same afternoon. We provide a dedicated onboarding call to walk through column schema mapping, role assignment, and your first dispatch run." },
];

export function SupportSection() {
  const [form, setForm]           = useState({ name: "", company: "", email: "", message: "" });
  const [sent, setSent]           = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed]       = useState(false);

  const handleContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFailed(false);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="landing-support" id="contact">
      <div className="landing-section-head">
        <div>
          <p className="landing-section-label">Support</p>
          <h2 className="landing-section-title">Here to help.</h2>
        </div>
      </div>

      <div className="landing-support-grid">
        <div className="landing-support-faq">
          <p className="landing-support-col-title">Common questions</p>
          <div className="landing-faq-list">
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>

        <div className="landing-support-contact">
          <p className="landing-support-col-title">Get in touch</p>
          <p className="landing-support-contact-hint">We'll respond within one business day.</p>

          <form className="landing-contact-form" onSubmit={handleContact}>
            {sent ? (
              <div className="landing-contact-thanks">
                <CheckCircle size={28} strokeWidth={1.5} className="landing-contact-thanks-icon" />
                <p className="landing-contact-thanks-title">Message received</p>
                <p className="landing-contact-thanks-sub">We'll get back to you shortly.</p>
                <button type="button" className="landing-contact-reset" onClick={() => { setSent(false); setForm({ name: "", company: "", email: "", message: "" }); }}>
                  Send another
                </button>
              </div>
            ) : (
              <>
                <div className="landing-contact-field">
                  <label>Name</label>
                  <input type="text" placeholder="Your name" required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="landing-contact-field">
                  <label>Company</label>
                  <input type="text" placeholder="Organisation name"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                </div>
                <div className="landing-contact-field">
                  <label>Email</label>
                  <input type="email" placeholder="you@company.com" required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="landing-contact-field">
                  <label>Message</label>
                  <textarea placeholder="How can we help?" rows={3}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                {failed && (
                  <p className="landing-contact-error">
                    Something went wrong. Email us directly at {CONTACT_EMAIL}.
                  </p>
                )}
                <button
                  type="submit"
                  className="landing-btn-primary landing-contact-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? <Loader2 size={16} className="landing-submit-spinner" />
                    : <><span>Send Message</span><ArrowRight size={16} /></>
                  }
                </button>
              </>
            )}
          </form>

          <div className="landing-support-contact-details">
            <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="landing-contact-detail">
              <Phone size={13} strokeWidth={1.8} />{CONTACT_PHONE}
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="landing-contact-detail">
              <Mail size={13} strokeWidth={1.8} />{CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
