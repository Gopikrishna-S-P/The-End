const FEATURES: { text: string; kind: "compliance" | "ops" | "field" }[] = [
  { text: "Calling hours enforced · 08:00–19:00 Mon–Sat",   kind: "compliance" },
  { text: "Offline-first field app · auto-syncs on signal",  kind: "field"      },
  { text: "AES-256 encryption at rest",                      kind: "compliance" },
  { text: "Live GPS tracking for every field officer",       kind: "field"      },
  { text: "Tamper-proof audit trail on every action",        kind: "compliance" },
  { text: "Dual-control approval for settlements",           kind: "ops"        },
  { text: "DPDP borrower consent on record",                 kind: "compliance" },
  { text: "UTR-matched bank reconciliation",                 kind: "ops"        },
  { text: "Role-based access · 7 built-in roles",            kind: "ops"        },
  { text: "Per-channel contact frequency limits",            kind: "compliance" },
  { text: "Visit notes · photos · GPS — logged on the spot", kind: "field"      },
  { text: "Custom column schema · up to 50,000 rows",        kind: "ops"        },
];

function TickerRun() {
  return (
    <div className="landing-ticker-run" aria-hidden="true">
      {FEATURES.map((f, i) => (
        <span key={i} className={`landing-ticker-item is-${f.kind}`}>
          <span className="landing-ticker-dot" />
          {f.text}
        </span>
      ))}
    </div>
  );
}

export function RecoveryTicker() {
  return (
    <div className="landing-ticker" role="presentation">
      <span className="landing-ticker-label">PLATFORM</span>
      <div className="landing-ticker-mask">
        <div className="landing-ticker-track">
          <TickerRun />
          <TickerRun />
        </div>
      </div>
    </div>
  );
}
