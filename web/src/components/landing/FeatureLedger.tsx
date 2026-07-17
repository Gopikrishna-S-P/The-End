import { Sparkles, FileCheck2, MapPin, Shield, CheckCircle, BarChart3 } from "lucide-react";
import type React from "react";

interface Row { icon: React.ElementType; title: string; desc: string }

const ROWS: Row[] = [
  { icon: Sparkles,    title: "Ask. Get the answer.",
    desc: "Field staff and callers ask about any case, policy, or next step and receive immediate, accurate guidance — no guessing, no calling the manager." },
  { icon: FileCheck2,  title: "Allocation in minutes, not meetings.",
    desc: "Distribute accounts across teams, areas, and priorities. Reassign on the fly. Every move is logged — nothing falls through." },
  { icon: MapPin,      title: "Your field team, on a live map.",
    desc: "Know where every officer is and what they've done — visit notes, photos, alerts. Works offline; syncs when the signal returns." },
  { icon: Shield,      title: "Compliance that runs itself.",
    desc: "Calling hours, contact limits, consent, complaints, dual approvals — handled before anything goes out. Your team stays clean without trying." },
  { icon: CheckCircle, title: "Every promise, tracked to the rupee.",
    desc: "Log a promise to pay, raise a settlement, restructure an EMI plan. The borrower confirms, the right person approves — all of it on record." },
  { icon: BarChart3,   title: "Reports your board can read.",
    desc: "Live dashboards for the team, clean summaries for the board, and a full trail if the regulator ever asks." },
];

export function FeatureLedger() {
  return (
    <div className="landing-fgrid">
      {ROWS.map((r) => (
        <div className="landing-fgrid-card" key={r.title}>
          <span className="landing-fgrid-icon"><r.icon size={20} strokeWidth={1.8} /></span>
          <h3 className="landing-fgrid-title">{r.title}</h3>
          <p className="landing-fgrid-desc">{r.desc}</p>
        </div>
      ))}
    </div>
  );
}
