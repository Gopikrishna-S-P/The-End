import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { tour, useTour, type TourStep, type TourPlacement } from '../utils/tour';
import './TourOverlay.css';

interface Rect { left: number; top: number; width: number; height: number; }

function computeTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function computeTooltipPosition(rect: Rect | null, placement: TourPlacement): React.CSSProperties {
  if (!rect) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }
  const gap = 12;
  const cardW = 400; // matches min(400px, 90vw) in CSS exactly
  const cardH = 280; // safe max height for content blocks
  
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  let left = rect.left + rect.width / 2 - cardW / 2;
  let top = rect.top + rect.height + gap;

  // Vertical placement adjustments
  if (placement === 'top') {
    top = rect.top - cardH - gap;
    if (top < 16) {
      top = rect.top + rect.height + gap; // fallback to bottom
    }
  } else if (placement === 'bottom') {
    if (top + cardH > vh - 16) {
      top = rect.top - cardH - gap; // fallback to top
    }
  } else if (placement === 'left') {
    left = rect.left - cardW - gap;
    top = rect.top + rect.height / 2 - cardH / 2;
    if (left < 16) {
      left = rect.left + rect.width + gap; // fallback to right
    }
  } else if (placement === 'right') {
    left = rect.left + rect.width + gap;
    top = rect.top + rect.height / 2 - cardH / 2;
    if (left + cardW > vw - 16) {
      left = rect.left - cardW - gap; // fallback to left
    }
  }

  // Handle center fallback
  if (placement === 'center') {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  // Securely clamp the card to screen boundaries with a 16px safety margin
  const safeLeft = Math.max(16, Math.min(left, vw - cardW - 16));
  const safeTop = Math.max(16, Math.min(top, vh - cardH - 16));

  return {
    position: 'fixed',
    left: `${safeLeft}px`,
    top: `${safeTop}px`,
    transform: 'none',
  };
}

export default function TourOverlay() {
  const { active, stepIndex, steps } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);

  const step: TourStep | null = active ? steps[stepIndex] ?? null : null;

  useEffect(() => {
    if (!step) return;
    const update = () => setRect(computeTargetRect(step.selector));
    update();
    /* If the target appears later (e.g. lazy mount), retry briefly. */
    let tries = 0;
    const retry = window.setInterval(() => {
      if (rect || tries > 12) { window.clearInterval(retry); return; }
      tries++;
      const r = computeTargetRect(step.selector);
      if (r) { setRect(r); window.clearInterval(retry); }
    }, 100);

    window.addEventListener('resize', update);
    document.addEventListener('scroll', update, true);
    return () => {
      window.clearInterval(retry);
      window.removeEventListener('resize', update);
      document.removeEventListener('scroll', update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.selector]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      tour.skip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') tour.next();
      else if (e.key === 'ArrowLeft') tour.prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);

  if (!active || !step) return null;

  const isLast = stepIndex === steps.length - 1;
  const tooltipStyle = computeTooltipPosition(rect, step.placement ?? 'bottom');
  const spotlightStyle: React.CSSProperties | undefined = rect
    ? {
        left:   `${rect.left - 6}px`,
        top:    `${rect.top - 6}px`,
        width:  `${rect.width + 12}px`,
        height: `${rect.height + 12}px`,
      }
    : undefined;

  return createPortal(
    <div className="app-tour" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className={`app-tour-backdrop${rect ? ' has-spotlight' : ''}`} onClick={() => tour.skip()} />
      {rect && <div className="app-tour-spotlight" style={spotlightStyle} aria-hidden="true" />}
      <div
        className={`app-tour-tooltip placement-${step.placement ?? 'bottom'}`}
        style={tooltipStyle}
      >
        <div className="app-tour-progress">
          <span>{stepIndex + 1} / {steps.length}</span>
        </div>
        <h3 className="app-tour-title">{step.title}</h3>
        <p className="app-tour-body">{step.body}</p>
        <div className="app-tour-actions">
          {stepIndex > 0 && (
            <button
              type="button"
              className="app-tour-prev"
              onClick={() => tour.prev()}
            >
              <ChevronLeft size={11} aria-hidden="true" />
              Back
            </button>
          )}
          <button
            type="button"
            className="app-tour-next"
            onClick={() => tour.next()}
          >
            {isLast ? <Check size={11} aria-hidden="true" /> : null}
            {isLast ? 'Finish' : 'Next'}
            {!isLast && <ChevronRight size={11} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
