import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo, Footer } from "../components";
import { useScrollReveal, useScrollProgress } from "../hooks/public-motion";
import "../styles/LegalPage.css";
import "../styles/public-motion.css";

const LAST_UPDATED = "May 18, 2026";

const SECTIONS = [
  { id: "information",  title: "Information we collect" },
  { id: "use",          title: "How we use information" },
  { id: "sharing",      title: "Sharing & disclosure" },
  { id: "retention",    title: "Data retention" },
  { id: "consent",      title: "Consent" },
  { id: "rights",       title: "Your rights" },
  { id: "security",     title: "Security" },
  { id: "cookies",      title: "Cookies & sessions" },
  { id: "transfers",    title: "International transfers" },
  { id: "children",     title: "Children's privacy" },
  { id: "changes",      title: "Changes to this policy" },
  { id: "grievance",    title: "Grievance officer" },
];

export default function PrivacyPolicyPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollReveal();
  useScrollProgress(scrollRef);

  return (
    <div className="legal-page pm-page-enter">

      <header className="topbar">
        <a href="/" className="topbar-logo" aria-label="Recoverpro home">
          <Logo height={40} />
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
            <div className="eyebrow">Legal · Privacy Policy</div>
            <h1 className="headline">Privacy at <em>Recoverpro.</em></h1>
            <p className="subhead">
              <span className="last-updated">Last updated · {LAST_UPDATED}</span>
              This policy explains what data Recoverpro collects when lenders, recovery agencies, and their authorised users operate the platform — and the choices you have over that data.
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

          <section id="information" className="section">
            <div className="section-label">01</div>
            <h2 className="section-title">Information we collect</h2>
            <div className="section-body">
              <p>We collect information you provide directly, information generated when you use the platform, and information your organisation uploads on behalf of its loan book.</p>

              <p><strong>Staff and user account data.</strong> When an organisation administrator creates an account for you, we store your full name, work email address, assigned role, and organisation membership. We also record login timestamps, failed login attempts, account lockout events, and — for users who enable it — a TOTP secret for multi-factor authentication.</p>

              <p><strong>Borrower and case data.</strong> Lenders and agencies upload loan account records to the platform. This includes borrower name, phone number, email address, postal address, and a CKYC reference number. Where recorded, nominee details (name, relationship, contact) are stored alongside the borrower record. This data belongs to and is controlled by your organisation; Recoverpro processes it as a data processor on your behalf.</p>

              <p><strong>Grievance and complaint data.</strong> When a borrower complaint is logged — whether by a borrower directly or by a staff member — we store the complainant's name, phone, email, the category and description of the complaint, and any evidence attachments. SLA tracking timestamps (acknowledgement and resolution deadlines) are recorded to meet RBI requirements.</p>

              <p><strong>Location data (field officers only).</strong> Field officers who start a shift send GPS coordinates to the platform during that shift. Location data is collected only while a shift is active; no background tracking occurs outside active shifts. SOS audio is similarly gated to active shifts.</p>

              <p><strong>Operational and security logs.</strong> Every action on the platform — logins, allocation changes, visit submissions, approvals — is recorded in an audit log with the user ID, action type, timestamp, and relevant details. IP addresses and device information are logged at authentication to detect unusual access patterns.</p>

              <p><strong>AI assistant (FRIDAY) conversations.</strong> When users interact with the built-in AI assistant, their messages and the assistant's responses are stored to support the conversation history and to let the model access relevant case context. Chat sessions are automatically purged after 90 days.</p>
            </div>
          </section>

          <section id="use" className="section">
            <div className="section-label">02</div>
            <h2 className="section-title">How we use information</h2>
            <div className="section-body">
              <p>We use the information described above to:</p>
              <ul>
                <li>Operate the platform and deliver the services your organisation has contracted for — including account allocation, field team management, outbound communications, payment tracking, and reporting.</li>
                <li>Authenticate users, enforce role-based access control, and detect or block suspicious login attempts (including impossible-travel detection).</li>
                <li>Enforce calling hours (08:00–19:00 IST, Monday to Saturday), per-channel contact frequency limits, and other controls required under the RBI Digital Lending Guidelines 2022 and the Recovery Agent Code of Conduct.</li>
                <li>Maintain tamper-evident audit trails for your organisation and for regulators.</li>
                <li>Track field officer activity and location during active shifts.</li>
                <li>Process grievances and track resolution within the SLA required by your organisation and applicable regulations.</li>
                <li>Support DPDP Act 2023 consent management and right-to-erasure requests.</li>
                <li>Provide customer support and diagnose platform incidents.</li>
                <li>Communicate security notices and material changes to the service.</li>
                <li>Comply with legal obligations and respond to lawful requests from competent authorities.</li>
              </ul>
              <p>We do not sell personal data. We do not use borrower data to train general-purpose AI models. The FRIDAY AI assistant runs on a locally hosted model; borrower data passed as context does not leave the infrastructure your organisation's data is hosted on.</p>
            </div>
          </section>

          <section id="sharing" className="section">
            <div className="section-label">03</div>
            <h2 className="section-title">Sharing &amp; disclosure</h2>
            <div className="section-body">
              <p>Recoverpro shares data only with parties that have a clear, contracted purpose:</p>
              <ul>
                <li><strong>Within your organisation.</strong> Authorised users see only the data permitted by their assigned role. Seven built-in roles (Platform Admin, Org Admin, Manager, Team Lead, Field Officer, Caller, Tracer) each carry predefined access boundaries enforced at every API endpoint.</li>
                <li><strong>Communication providers.</strong> When your organisation sends outbound messages, the relevant borrower contact (phone, email) is transmitted to the configured delivery provider (SMS, WhatsApp, RCS, email, or IVR) via HMAC-authenticated webhooks. Delivery receipt callbacks are validated before updating communication logs.</li>
                <li><strong>Infrastructure sub-processors.</strong> Vetted cloud infrastructure and storage providers that operate under written data-processing terms. A current list is available on request.</li>
                <li><strong>Legal and regulatory.</strong> When required by law, court order, or to protect the rights, safety, or property of Recoverpro, our customers, or the public.</li>
              </ul>
              <p>We do not share borrower data with advertisers or third-party marketers.</p>
            </div>
          </section>

          <section id="retention" className="section">
            <div className="section-label">04</div>
            <h2 className="section-title">Data retention</h2>
            <div className="section-body">
              <p>Personal and case data is retained for the duration of your organisation's subscription, plus any period required by applicable law, regulation, audit, or tax obligations. Records linked to financial transactions are typically retained for <strong>seven (7) to ten (10) years</strong> after the underlying loan account closes, in line with RBI record-keeping requirements.</p>
              <p>Audit-log events are retained as an append-only chain for the lifetime of the account and cannot be deleted by platform users.</p>
              <p>FRIDAY AI chat sessions are automatically purged after <strong>90 days</strong> of inactivity as part of our data-minimisation practice under the DPDP Act 2023.</p>
              <p>When a right-to-erasure request is received, we process it within the statutory period. Where regulatory retention obligations prevent full deletion, the record is flagged and the unretainable portions are deleted; the compliance override is recorded and auditable.</p>
              <p>On contract termination, customer data is provided to your organisation on request and then deleted in accordance with our data-deletion procedure.</p>
            </div>
          </section>

          <section id="consent" className="section">
            <div className="section-label">05</div>
            <h2 className="section-title">Consent</h2>
            <div className="section-body">
              <p>Recoverpro implements DPDP Act 2023 §6 consent management at the platform level. When borrower consent is required — for example before processing personal data for a purpose beyond loan servicing — a consent artifact is created that records:</p>
              <ul>
                <li>The exact purpose and scope of the consent.</li>
                <li>The full text of the consent notice presented, the version, and a SHA-256 tamper-evidence hash.</li>
                <li>The timestamp when consent was granted and, where applicable, when it expires.</li>
                <li>Any revocation, with the reason and timestamp recorded.</li>
              </ul>
              <p>Consent artifacts are immutable once created. A revocation creates a new record rather than modifying the original, preserving the full history. Organisations can view and export consent records for a borrower at any time.</p>
              <p>Borrowers may withdraw consent by contacting their lender or by writing to us at <a href="mailto:support@recoverpro.in">support@recoverpro.in</a>. Withdrawal of consent does not affect the lawfulness of processing carried out before withdrawal, and does not override retention obligations mandated by RBI or other regulators.</p>
            </div>
          </section>

          <section id="rights" className="section">
            <div className="section-label">06</div>
            <h2 className="section-title">Your rights</h2>
            <div className="section-body">
              <p>Under the Digital Personal Data Protection Act, 2023, you have the right to:</p>
              <ul>
                <li><strong>Access.</strong> Obtain a summary of the personal data we hold about you and how it is being processed.</li>
                <li><strong>Correction.</strong> Request that inaccurate or incomplete personal data be corrected or completed.</li>
                <li><strong>Erasure.</strong> Request deletion of your personal data. We will process this within the statutory period. Where RBI or other regulatory retention obligations apply, we will delete what we can, document what we cannot, and notify you of the reason.</li>
                <li><strong>Grievance redressal.</strong> File a complaint with our Grievance Officer (see Section 12). Acknowledgement within 24 hours; resolution within 30 days.</li>
                <li><strong>Nomination.</strong> Nominate another individual to exercise your rights in the event of death or incapacity, in line with DPDP Act 2023 §14.</li>
              </ul>
              <p>Staff members exercise most rights through their employing organisation's Org Admin. Borrowers may approach their lender or write directly to us at <a href="mailto:support@recoverpro.in">support@recoverpro.in</a>.</p>
            </div>
          </section>

          <section id="security" className="section">
            <div className="section-label">07</div>
            <h2 className="section-title">Security</h2>
            <div className="section-body">
              <p>We apply the following technical and organisational controls:</p>
              <ul>
                <li><strong>Encryption at rest.</strong> Borrower PII — name, phone, email, address, and nominee details — is encrypted using AES-256-GCM. Searchable columns (phone, email) use a separate HMAC-SHA-256 keyed hash so that lookups work without decrypting the full record.</li>
                <li><strong>Encryption in transit.</strong> All traffic between clients and the platform is served over HTTPS. HSTS (HTTP Strict Transport Security) is enforced with a one-year max-age and includeSubDomains.</li>
                <li><strong>Authentication.</strong> Passwords are hashed with bcrypt (cost factor 12). Access tokens expire after 15 minutes; refresh tokens after 7 days. Accounts are locked after repeated failed login attempts.</li>
                <li><strong>Multi-factor authentication.</strong> TOTP-based MFA is enforced for Platform Admin and Org Admin roles.</li>
                <li><strong>Tenant isolation.</strong> Each organisation's data is isolated at every API boundary. Organisation membership is derived from the signed JWT, never from a request parameter.</li>
                <li><strong>Role-based access control.</strong> Seven roles with predefined permissions; additional per-user permissions can be granted. Every API endpoint validates both role and permission before returning data.</li>
                <li><strong>Audit trail.</strong> Every action on the platform — including logins, data changes, allocations, approvals, and exports — is logged in an append-only audit chain. Audit logs cannot be modified or deleted by any user, including administrators.</li>
                <li><strong>Impossible-travel detection.</strong> Logins from geographically inconsistent locations within a 30-minute window trigger a security alert.</li>
                <li><strong>File scanning.</strong> Uploaded files are scanned for malware before processing.</li>
              </ul>
              <div className="callout">
                <div className="callout-label">Incident notification</div>
                <p className="callout-body">In the event of a personal data breach affecting your organisation, we will notify your organisation's primary contact without undue delay and provide details sufficient to assess impact and meet your own regulatory reporting obligations.</p>
              </div>
            </div>
          </section>

          <section id="cookies" className="section">
            <div className="section-label">08</div>
            <h2 className="section-title">Cookies &amp; sessions</h2>
            <div className="section-body">
              <p>Recoverpro uses a JWT-based authentication model. There are no server-side sessions. Access tokens and refresh tokens are stored in your browser's session storage or local storage depending on your "Remember me" selection at sign-in.</p>
              <p>We do not use cross-site tracking cookies or advertising cookies. We do not embed third-party analytics scripts that track you across websites.</p>
              <p>A small number of strictly necessary functional items may be stored in browser storage to preserve UI preferences (such as theme selection). These are not transmitted to third parties.</p>
            </div>
          </section>

          <section id="transfers" className="section">
            <div className="section-label">09</div>
            <h2 className="section-title">International transfers</h2>
            <div className="section-body">
              <p>Customer data is hosted in the India (Mumbai) AWS region (<code>ap-south-1</code>) by default. The platform enforces a boot-time data-localisation check; if the deployment region does not match the configured expected region, the service will not start.</p>
              <p>Where data is transferred outside India — for example for support engineering or via a configured sub-processor — we rely on contractual safeguards and the cross-border transfer rules notified under the DPDP Act 2023.</p>
            </div>
          </section>

          <section id="children" className="section">
            <div className="section-label">10</div>
            <h2 className="section-title">Children's privacy</h2>
            <div className="section-body">
              <p>Recoverpro is a workplace platform for financial institutions and recovery agencies. Accounts are not provisioned for individuals under 18. We do not knowingly collect personal data from children. If you believe a minor has been incorrectly registered, please contact us immediately so we can remove the account.</p>
            </div>
          </section>

          <section id="changes" className="section">
            <div className="section-label">11</div>
            <h2 className="section-title">Changes to this policy</h2>
            <div className="section-body">
              <p>When we change this policy in a material way, we will update the "last updated" date at the top of this page and notify your organisation's primary administrator. Continued use of Recoverpro after a change takes effect constitutes acceptance of the revised policy.</p>
            </div>
          </section>

          <section id="grievance" className="section">
            <div className="section-label">12</div>
            <h2 className="section-title">Grievance officer</h2>
            <div className="section-body">
              <p>In line with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, you may write to our Grievance Officer for any concern relating to your personal data:</p>
              <div className="callout">
                <div className="callout-label">Grievance Officer · Recoverpro</div>
                <p className="callout-body">
                  <strong>Email:</strong> <a href="mailto:support@recoverpro.in">support@recoverpro.in</a><br />
                  <strong>Response time:</strong> Acknowledgement within 24 hours; resolution within 30 days.
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
