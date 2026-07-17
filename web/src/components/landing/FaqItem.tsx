import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`landing-faq-item${open ? " is-open" : ""}`}>
      <button className="landing-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={15} className="landing-faq-chevron" />
      </button>
      <div className="landing-faq-a-wrap">
        <div className="landing-faq-a-inner">
          <p className="landing-faq-a">{a}</p>
        </div>
      </div>
    </div>
  );
}
