import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo, Footer } from "../components";
import { useScrollReveal, useScrollProgress } from "../hooks/public-motion";
import "../styles/LegalPage.css";
import "../styles/public-motion.css";

const LAST_UPDATED = "May 18, 2026";

const SECTIONS = [
  { id: "acceptance",   title: "Acceptance of terms" },
  { id: "accounts",     title: "Eligibility & accounts" },
  { id: "subscription", title: "Subscription & fees" },
  { id: "data",         title: "Customer data" },
  { id: "use",          title: "Acceptable use" },
  { id: "compliance",   title: "Platform-enforced controls" },
  { id: "availability", title: "Service availability" },
  { id: "ip",           title: "Intellectual property" },
  { id: "confidential", title: "Confidentiality" },
  { id: "warranties",   title: "Warranties & disclaimers" },
  { id: "liability",    title: "Limitation of liability" },
  { id: "indemnity",    title: "Indemnification" },
  { id: "termination",  title: "Termination" },
  { id: "governing",    title: "Governing law & disputes" },
  { id: "changes",      title: "Changes to these terms" },
  { id: "contact",      title: "Contact" },
];

export default function TermsPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollReveal();
  useScrollProgress(scrollRef);
  return (
    <div className="legal-page pm-page-enter">

      <header className="topbar">
        <a href="/" className="topbar-logo" aria-label="Recoverpro home">
          <Logo height={28} />
        </a>
        <a href="/" className="topbar-back" aria-label="Back to home">
          <ArrowLeft size={16} /> Home
        </a>
      </header>

      <div className="scroll-region" ref={scrollRef}>
      <main className="shell">

        <aside className="sidebar">
          <div className="sidebar-label">On this page</div>
          <ul className="sidebar-list">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a className="sidebar-link" href={`#${s.id}`}>
                  <span className="sidebar-num">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="content">

          <section className="hero">
            <div className="eyebrow">Legal · Terms of Service</div>
            <h1 className="headline">Terms of <em>service.</em></h1>
            <p className="subhead">
              <span className="last-updated">Last updated · {LAST_UPDATED}</span>
              These terms govern access to and use of the Recoverpro platform by your organisation and its authorised users. By signing in, you accept them on behalf of yourself and the organisation that provisioned your account.
            </p>
          </section>

          <nav className="toc" aria-label="Table of contents">
            <div className="toc-label">On this page</div>
            <ul className="toc-list">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a className="toc-link" href={`#${s.id}`}>
                    <span className="toc-num">{String(i + 1).padStart(2, "0")}</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <section id="acceptance" className="section">
            <div className="section-label">01</div>
            <h2 className="section-title">Acceptance of terms</h2>
            <div className="section-body">
              <p>These Terms of Service form a binding agreement between Recoverpro ("Recoverpro", "we", "us") and the lender, recovery agency, or other organisation that has subscribed to the platform ("Customer", "you").</p>
              <p>By accessing or using the platform, you confirm that you are authorised to enter this agreement on behalf of the Customer and that you have read, understood, and accepted these terms together with the <a href="/privacy">Privacy Policy</a> and any order form, addendum, or data-processing agreement signed between us.</p>
            </div>
          </section>

          <section id="accounts" className="section">
            <div className="section-label">02</div>
            <h2 className="section-title">Eligibility &amp; accounts</h2>
            <div className="section-body">
              <p>Accounts are provisioned only to legal entities that are authorised to undertake loan recovery activities under applicable Indian law. Each end-user must be at least 18 years old and operate as an authorised representative of the Customer.</p>
              <p>The platform supports seven built-in roles — Platform Admin, Org Admin, Manager, Team Lead, Field Officer, Caller, and Tracer — each with predefined permissions. Multi-factor authentication is required for Platform Admin and Org Admin roles.</p>
              <p>You are responsible for:</p>
              <ul>
                <li>Maintaining the confidentiality of credentials and TOTP MFA secrets.</li>
                <li>All activity that occurs under your accounts, whether authorised or not.</li>
                <li>Promptly disabling accounts of users who leave or change roles.</li>
                <li>Notifying Recoverpro of any suspected unauthorised access without delay.</li>
              </ul>
            </div>
          </section>

          <section id="subscription" className="section">
            <div className="section-label">03</div>
            <h2 className="section-title">Subscription &amp; fees</h2>
            <div className="section-body">
              <p>Access is granted on a subscription basis as described in the order form between Recoverpro and the Customer. Unless stated otherwise, fees are payable in advance, are non-refundable, and exclude applicable taxes (including GST).</p>
              <p>If an invoice is overdue by more than thirty (30) days, Recoverpro may suspend access after giving reasonable notice. Suspension does not relieve the Customer of payment obligations for the affected period.</p>
            </div>
          </section>

          <section id="data" className="section">
            <div className="section-label">04</div>
            <h2 className="section-title">Customer data</h2>
            <div className="section-body">
              <p>The Customer retains ownership of all data uploaded to or generated within Recoverpro on its behalf — including loan account allocations, borrower records, visit logs, promise-to-pay (PTP) records, settlement offers, communication logs, payment intents, consent artifacts, and audit events ("Customer Data").</p>
              <p>Recoverpro acts as a data processor for Customer Data and processes it only on documented instructions from the Customer, except where required by law. Our handling of personal data within Customer Data is described in the <a href="/privacy">Privacy Policy</a>.</p>
              <p>The Customer is responsible for the accuracy, lawfulness, and disclosure consents associated with the data it provides. Spreadsheet uploads are limited to 50,000 rows per batch and supported formats (CSV, XLS, XLSX). Uploaded files are scanned for malware before processing.</p>
            </div>
          </section>

          <section id="use" className="section">
            <div className="section-label">05</div>
            <h2 className="section-title">Acceptable use</h2>
            <div className="section-body">
              <p>You agree not to, and not to allow any user to:</p>
              <ul>
                <li>Use the platform for any activity that violates the RBI Fair Practices Code for Lenders, the RBI Recovery Agent Code of Conduct, the RBI Digital Lending Guidelines 2022, the Digital Personal Data Protection Act 2023, or any other applicable law.</li>
                <li>Harass, threaten, intimidate, or use deceptive tactics against borrowers or any third party.</li>
                <li>Attempt to bypass platform-enforced controls (calling hours, contact frequency limits, consent gates, dual-approval workflows).</li>
                <li>Reverse engineer, decompile, or attempt to derive source code from the platform.</li>
                <li>Probe, scan, or test the vulnerability of the platform without prior written consent.</li>
                <li>Interfere with the integrity or performance of the service or attempt to gain unauthorised access to systems or data of other organisations.</li>
                <li>Use the platform to transmit malware, spam, or unsolicited commercial communication.</li>
              </ul>
              <div className="callout">
                <div className="callout-label">Field conduct</div>
                <p className="callout-body">All field interactions logged through Recoverpro must comply with the RBI's directions on conduct, hours of contact, and recording. Recoverpro reserves the right to suspend access where credible evidence of borrower harassment is found.</p>
              </div>
            </div>
          </section>

          <section id="compliance" className="section">
            <div className="section-label">06</div>
            <h2 className="section-title">Platform-enforced controls</h2>
            <div className="section-body">
              <p>The following controls are enforced by the platform and cannot be disabled by individual users:</p>
              <ul>
                <li><strong>Calling hours.</strong> Outbound communications are restricted to 08:00–19:00 IST, Monday through Saturday. Attempts to send messages or initiate calls outside this window are blocked at the platform level.</li>
                <li><strong>Contact frequency caps.</strong> Per-borrower daily caps are enforced across channels — SMS, WhatsApp, RCS, email, IVR, and voice agent calls. These caps align with RBI guidance on borrower contact frequency.</li>
                <li><strong>Consent gates.</strong> Where DPDP-aligned consent is required for a processing purpose, the platform will not permit the action without a valid, active consent artifact.</li>
                <li><strong>Dual-control approvals.</strong> Sensitive workflows — settlement offers above the configured threshold, restructuring proposals, data erasure execution, and certain visit submissions — require a second approver.</li>
                <li><strong>Shift-gated field activity.</strong> Field officer location pings and SOS audio are accepted only during an active shift. No background tracking occurs outside shifts.</li>
                <li><strong>Append-only audit.</strong> Every action is recorded in a tamper-evident audit log. No user — including administrators — can delete or modify an audit entry.</li>
                <li><strong>Tenant isolation.</strong> Organisation membership is derived from the signed JWT. The platform structurally prevents cross-tenant access.</li>
              </ul>
              <p>The Customer acknowledges that these controls are part of the service and may not be circumvented through configuration requests, support tickets, or any other means.</p>
            </div>
          </section>

          <section id="availability" className="section">
            <div className="section-label">07</div>
            <h2 className="section-title">Service availability</h2>
            <div className="section-body">
              <p>Recoverpro is operated as a hosted SaaS platform with continuous monitoring. Specific uptime commitments, scheduled maintenance windows, and incident response targets are defined in the order form or a separate Service Level Agreement signed between the parties.</p>
              <p>In the absence of a signed SLA, the platform is provided on a commercially reasonable best-efforts basis. Planned maintenance is announced to the Customer's primary administrator in advance where practicable.</p>
            </div>
          </section>

          <section id="ip" className="section">
            <div className="section-label">08</div>
            <h2 className="section-title">Intellectual property</h2>
            <div className="section-body">
              <p>Recoverpro, the platform, and all related technology — including software, the FRIDAY AI assistant, dashboards, reports, documentation, and trademarks — are and remain the property of Recoverpro and its licensors. Subject to these terms, we grant the Customer a non-exclusive, non-transferable right to access and use the platform during the subscription term.</p>
              <p>Feedback, suggestions, and ideas you provide may be used by Recoverpro without obligation, provided we do not identify you as the source. We do not use Customer Data to train general-purpose AI models.</p>
            </div>
          </section>

          <section id="confidential" className="section">
            <div className="section-label">09</div>
            <h2 className="section-title">Confidentiality</h2>
            <div className="section-body">
              <p>Each party agrees to protect the other party's confidential information with at least the same degree of care it uses for its own confidential information of like importance — and in no event less than reasonable care. Confidential information may be used only for purposes consistent with this agreement.</p>
              <p>This obligation does not apply to information that is publicly available, independently developed, or rightfully received from a third party without a duty of confidentiality.</p>
            </div>
          </section>

          <section id="warranties" className="section">
            <div className="section-label">10</div>
            <h2 className="section-title">Warranties &amp; disclaimers</h2>
            <div className="section-body">
              <p>Recoverpro warrants that the platform will materially perform in accordance with the documentation provided in the order form. Except as expressly stated, the platform is provided <strong>"as is"</strong> and Recoverpro disclaims all other warranties, whether express, implied, statutory, or otherwise.</p>
              <p>Recoverpro does not warrant that operation will be uninterrupted or error-free, that AI-generated responses from the FRIDAY assistant will be free of errors or omissions, or that the platform will satisfy any specific recovery, collection, or compliance outcome. The Customer is responsible for the final review and lawful use of any output produced by the platform.</p>
            </div>
          </section>

          <section id="liability" className="section">
            <div className="section-label">11</div>
            <h2 className="section-title">Limitation of liability</h2>
            <div className="section-body">
              <p>To the maximum extent permitted by law, neither party will be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages — including loss of profits, revenue, goodwill, or data — even if advised of the possibility of such damages.</p>
              <p>Each party's aggregate liability under or in connection with this agreement will not exceed the fees paid or payable by the Customer to Recoverpro during the twelve (12) months immediately preceding the event giving rise to the claim.</p>
              <p>These limitations do not apply to liability for breach of confidentiality, indemnification obligations, gross negligence, fraud, or wilful misconduct.</p>
            </div>
          </section>

          <section id="indemnity" className="section">
            <div className="section-label">12</div>
            <h2 className="section-title">Indemnification</h2>
            <div className="section-body">
              <p>The Customer will defend, indemnify, and hold Recoverpro harmless from any third-party claim arising out of (i) the Customer Data, (ii) the Customer's breach of these terms or applicable law, or (iii) any field, recovery, or borrower-engagement activity carried out by the Customer or its personnel.</p>
              <p>Recoverpro will defend, indemnify, and hold the Customer harmless from any third-party claim alleging that the platform, when used as permitted, infringes a valid Indian intellectual property right.</p>
            </div>
          </section>

          <section id="termination" className="section">
            <div className="section-label">13</div>
            <h2 className="section-title">Termination</h2>
            <div className="section-body">
              <p>Either party may terminate this agreement for material breach if the breach is not cured within thirty (30) days after written notice. Recoverpro may terminate or suspend access immediately if the Customer's use of the platform creates a risk to the platform, other customers, or any borrower.</p>
              <p>On termination, the Customer's right to use the platform ends. Customer Data is exported on request and then deleted in accordance with our data-deletion procedure described in the Privacy Policy. Audit logs and records subject to regulatory retention obligations are retained for the period required by law.</p>
            </div>
          </section>

          <section id="governing" className="section">
            <div className="section-label">14</div>
            <h2 className="section-title">Governing law &amp; disputes</h2>
            <div className="section-body">
              <p>This agreement is governed by the laws of India. Any dispute arising out of or relating to this agreement will be resolved by arbitration seated in Bengaluru, in accordance with the Arbitration and Conciliation Act, 1996, by a sole arbitrator mutually appointed by the parties. The language of the proceedings will be English.</p>
              <p>Subject to the arbitration clause, the courts at Bengaluru will have exclusive jurisdiction over any matters not capable of resolution by arbitration.</p>
            </div>
          </section>

          <section id="changes" className="section">
            <div className="section-label">15</div>
            <h2 className="section-title">Changes to these terms</h2>
            <div className="section-body">
              <p>We may amend these terms from time to time. Material changes will be notified to your organisation's primary administrator at least thirty (30) days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the revised terms.</p>
            </div>
          </section>

          <section id="contact" className="section">
            <div className="section-label">16</div>
            <h2 className="section-title">Contact</h2>
            <div className="section-body">
              <p>For questions about these terms or the platform, please reach out:</p>
              <div className="callout">
                <div className="callout-label">Recoverpro</div>
                <p className="callout-body">
                  <strong>Email:</strong> <a href="mailto:hello@recoverpro.in">hello@recoverpro.in</a>
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
      </div>

    </div>
  );
}
