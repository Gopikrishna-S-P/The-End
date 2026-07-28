// Ported verbatim from web/src/pages/MyCasesPage.tsx — AllocationResponse has
// no canonical DPD/outstanding-amount field for uploaded-file cases; these
// scan dynamicData the same way the web app does, so figures match exactly
// between mobile and web for the same case.
import type { AllocationResponse } from '@/types/domain';

export function resolveAmount(c: AllocationResponse): number | null {
  if (typeof c.outstandingAmount === 'number') return c.outstandingAmount;
  if (typeof c.totalDue === 'number') return c.totalDue;
  const dd = c.dynamicData || {};
  const key = Object.keys(dd).find((k) => {
    const kl = k.toLowerCase();
    return kl.includes('outstanding') || kl.includes('pos') || kl.includes('balance')
      || (kl.includes('total') && kl.includes('due'));
  });
  if (key != null) {
    const num = Number(String(dd[key]).replace(/[^0-9.\-]/g, ''));
    if (!Number.isNaN(num) && num !== 0) return num;
  }
  return null;
}

export function resolveDPD(c: AllocationResponse): number | null {
  const dd = c.dynamicData || {};
  const key = Object.keys(dd).find((k) => {
    const kl = k.toLowerCase().replace(/[\s_-]/g, '');
    return kl === 'dpd' || kl === 'dayspastdue' || kl === 'daysoverdue'
      || kl === 'overduedays' || kl === 'dpddays' || kl === 'dpdcount';
  });
  if (key != null) {
    const num = Number(String(dd[key]).replace(/[^0-9]/g, ''));
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

export type DpdTone = 'critical' | 'high' | 'warn' | 'neutral';

export function dpdTone(dpd: number): DpdTone {
  if (dpd <= 30) return 'neutral';
  if (dpd <= 60) return 'warn';
  if (dpd <= 90) return 'high';
  return 'critical';
}

/** Best-effort borrower phone number lookup from uploaded dynamicData — not a canonical field. */
export function resolvePhone(c: AllocationResponse): string | null {
  const dd = c.dynamicData || {};
  const key = Object.keys(dd).find((k) => {
    const kl = k.toLowerCase().replace(/[\s_-]/g, '');
    return kl.includes('phone') || kl.includes('mobile') || kl.includes('contactno') || kl.includes('contactnumber');
  });
  if (key == null) return null;
  const digits = String(dd[key]).replace(/[^0-9+]/g, '');
  return digits.length >= 10 ? digits : null;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
