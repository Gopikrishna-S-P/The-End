const SIZE = 32;
const BADGE_RADIUS = 9;
const BADGE_FILL = '#EF4444';
const BADGE_TEXT = '#FFFFFF';

let originalHref: string | null = null;
let originalLink: HTMLLinkElement | null = null;
let lastCount = -1;
let pendingFrame = 0;

function findLink(): HTMLLinkElement | null {
  return (
    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]')
  );
}

function paintBadge(img: HTMLImageElement, count: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  /* Slightly offset to avoid clipping into edges */
  const cx = SIZE - BADGE_RADIUS;
  const cy = BADGE_RADIUS;

  ctx.beginPath();
  ctx.arc(cx, cy, BADGE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = BADGE_FILL;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();

  const label = count > 9 ? '9+' : String(count);
  ctx.fillStyle = BADGE_TEXT;
  ctx.font = `bold ${label.length > 1 ? 9 : 11}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 0.5);

  return canvas.toDataURL('image/png');
}

export function setFaviconUnreadBadge(count: number): void {
  if (count === lastCount) return;
  lastCount = count;

  if (pendingFrame) cancelAnimationFrame(pendingFrame);
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = 0;
    const link = findLink();
    if (!link) return;
    if (!originalLink) originalLink = link;
    if (originalHref === null) originalHref = link.href;

    if (count <= 0) {
      if (originalHref) link.href = originalHref;
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const next = paintBadge(img, count);
        link.href = next;
      } catch { /* tainted canvas or other — leave favicon alone */ }
    };
    img.onerror = () => { /* swallow */ };
    /* SVGs load via Image; cross-origin not needed since src is same-origin */
    img.src = originalHref!;
  });
}
