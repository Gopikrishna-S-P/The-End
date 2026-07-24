// The four numbered rows are the recovery day in the order it actually runs —
// allocate, dispatch, collect, report. The assistant isn't a stage, so it gets
// no number: it sits above the run because it's available at every step.
// Compliance is deliberately absent here — the section that follows this one
// carries it in full.

const ASSIST = {
  label: "Assist",
  title: "Ask. Get the answer.",
  desc: "Field staff and callers ask about any case, policy, or next step and receive immediate, accurate guidance — no guessing, no calling the manager.",
};

const STAGES = [
  { n: "01", label: "Allocate", title: "Allocation in minutes, not meetings.",
    desc: "Distribute accounts across teams, areas, and priorities. Reassign on the fly. Every move is logged — nothing falls through." },
  { n: "02", label: "Dispatch", title: "Your field team, on a live map.",
    desc: "Know where every officer is and what they've done — visit notes, photos, alerts. Works offline; syncs when the signal returns." },
  { n: "03", label: "Collect", title: "Every promise, tracked to the rupee.",
    desc: "Log a promise to pay, raise a settlement, restructure an EMI plan. The borrower confirms, the right person approves — all of it on record." },
  { n: "04", label: "Report", title: "Reports your board can read.",
    desc: "Live dashboards for the team, clean summaries for the board, and a full trail if the regulator ever asks." },
];

export function FeatureLedger() {
  return (
    <div className="landing-ledger">
      <div className="landing-ledger-rows pm-stagger">

        <div className="landing-ledger-row is-assist pm-reveal">
          <div className="landing-ledger-marker">
            <span className="landing-ledger-label">{ASSIST.label}</span>
          </div>
          <div className="landing-ledger-body">
            <h3 className="landing-ledger-title">{ASSIST.title}</h3>
            <p className="landing-ledger-desc">{ASSIST.desc}</p>
          </div>
        </div>

        {STAGES.map((s) => (
          <div className="landing-ledger-row pm-reveal" key={s.n}>
            <div className="landing-ledger-marker">
              <span className="landing-ledger-n">{s.n}</span>
              <span className="landing-ledger-label">{s.label}</span>
            </div>
            <div className="landing-ledger-body">
              <h3 className="landing-ledger-title">{s.title}</h3>
              <p className="landing-ledger-desc">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
