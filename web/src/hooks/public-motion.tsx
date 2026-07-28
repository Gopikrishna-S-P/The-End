import { useEffect, useRef } from 'react';
import type { CSSProperties, RefObject } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useScrollReveal(rootRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef?.current ?? document;
    if (prefersReducedMotion()) {
      root.querySelectorAll('.pm-reveal').forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    root.querySelectorAll<HTMLElement>('.pm-stagger').forEach((group) => {
      let i = 0;
      group.querySelectorAll<HTMLElement>(':scope > .pm-reveal').forEach((child) => {
        child.style.setProperty('--pm-i', String(i++));
      });
    });
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); } } },
      { root: null, threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    root.querySelectorAll('.pm-reveal:not(.is-revealed), .legal-page .section:not(.is-revealed)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

export function useScrollProgress(scrollRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const scroller = scrollRef?.current;
    const bar = document.createElement('div');
    bar.className = 'pm-scroll-progress';
    document.body.appendChild(bar);
    let raf = 0;
    const update = () => {
      raf = 0;
      const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
      const max = scroller
        ? scroller.scrollHeight - scroller.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--pm-scroll', `${max > 0 ? (scrollTop / max) * 100 : 0}%`);
    };
    const onScroll = () => { if (raf === 0) raf = window.requestAnimationFrame(update); };
    const target: EventTarget = scroller ?? window;
    update();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (raf) window.cancelAnimationFrame(raf);
      bar.remove();
    };
  }, [scrollRef]);
}

export function useMagnetic(strength = 8) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia?.('(hover: none)').matches) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.pm-magnetic'));
    if (targets.length === 0) return;
    const cleanups: Array<() => void> = [];
    for (const el of targets) {
      const target = el.querySelector<HTMLElement>('.pm-magnetic-target') ?? el;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        target.style.setProperty('--pm-mx', `${dx * strength}px`);
        target.style.setProperty('--pm-my', `${dy * strength}px`);
      };
      const onLeave = () => { target.style.setProperty('--pm-mx', '0px'); target.style.setProperty('--pm-my', '0px'); };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      cleanups.push(() => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); });
    }
    return () => { for (const c of cleanups) c(); };
  }, [strength]);
}

export function useRipple() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.pm-ripple'));
    if (targets.length === 0) return;
    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      const el = e.currentTarget as HTMLElement;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 1.2;
      const wave = document.createElement('span');
      wave.className = 'pm-ripple-wave';
      wave.style.width = `${size}px`; wave.style.height = `${size}px`;
      wave.style.left = `${me.clientX - r.left - size / 2}px`;
      wave.style.top  = `${me.clientY - r.top  - size / 2}px`;
      el.appendChild(wave);
      window.setTimeout(() => wave.remove(), 600);
    };
    for (const el of targets) el.addEventListener('click', onClick);
    return () => { for (const el of targets) el.removeEventListener('click', onClick); };
  }, []);
}

export function useAmbientCursor() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia?.('(hover: none)').matches) return;
    if (window.matchMedia?.('(pointer: coarse)').matches) return;
    const cursor = document.createElement('div');
    cursor.className = 'pm-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    let raf = 0, tx = -100, ty = -100;
    const update = () => { raf = 0; cursor.style.setProperty('--pm-cx', `${tx}px`); cursor.style.setProperty('--pm-cy', `${ty}px`); };
    const onMove = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; if (raf === 0) raf = window.requestAnimationFrame(update); };
    const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, [contenteditable]';
    const onOver = (e: Event) => { if ((e.target as HTMLElement).closest(INTERACTIVE)) cursor.classList.add('is-grow'); };
    const onOut  = (e: Event) => { if ((e.target as HTMLElement).closest(INTERACTIVE)) cursor.classList.remove('is-grow'); };
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout',  onOut,  true);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout',  onOut,  true);
      if (raf) window.cancelAnimationFrame(raf);
      cursor.remove();
    };
  }, []);
}

export function useParallax() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    if (targets.length === 0) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const sy = window.scrollY;
      for (const el of targets) el.style.transform = `translate3d(0, ${sy * -parseFloat(el.dataset.parallax ?? '0.2')}px, 0)`;
    };
    const onScroll = () => { if (raf === 0) raf = window.requestAnimationFrame(apply); };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) window.cancelAnimationFrame(raf); for (const el of targets) el.style.transform = ''; };
  }, []);
}

export function usePublicPageMotion(opts: { cursor?: boolean; progress?: boolean; magnetic?: boolean; ripple?: boolean; parallax?: boolean; reveal?: boolean } = {}) {
  const { cursor = false, progress = true, magnetic = true, ripple = true, parallax = true, reveal = true } = opts;
  /* eslint-disable react-hooks/rules-of-hooks */
  if (reveal)   useScrollReveal();
  if (progress) useScrollProgress();
  if (magnetic) useMagnetic();
  if (ripple)   useRipple();
  if (parallax) useParallax();
  if (cursor)   useAmbientCursor();
  /* eslint-enable react-hooks/rules-of-hooks */
}

export function splitWords(text: string) {
  return text.split(/(\s+)/).map((tok, i) => {
    if (tok.trim() === '') return tok;
    return <span key={i} className="pm-word" style={{ '--pm-i': i } as CSSProperties}>{tok}</span>;
  });
}
