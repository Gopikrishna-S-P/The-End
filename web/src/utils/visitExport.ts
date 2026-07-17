import * as XLSX from 'xlsx';
import type { VisitLogResponse } from '../types';

type DynCol = { header: string; keys: string[]; check?: (dyn: Record<string, unknown>) => string };

// Legal case check — "Yes" if any known legal-stage field is non-empty.
const legalCaseCheck = (dyn: Record<string, unknown>): string => {
  const lower = Object.fromEntries(
    Object.entries(dyn).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
  const legalKeys = ['sarfaesi process stage', 'sec 138 cc stage', 'legal status', 'legal_status'];
  const blank = new Set(['', 'nil', 'none', 'na', 'n/a', '-']);
  return legalKeys.some(k => {
    const v = lower[k];
    return v != null && !blank.has(String(v).trim().toLowerCase());
  }) ? 'Yes' : '';
};

// Primary keys are the exact column headers confirmed in the DB.
const ALLOC_DYN_COLS: DynCol[] = [
  { header: 'DISBURSED AMOUNT (IN CR)', keys: ['DISBURSED AMOUNT (IN CR)', 'DISBURSED AMOUNT(IN CR)', 'DISBURSED AMOUNT', 'Disbursed Amount', 'disbursed_amount'] },
  { header: 'DISBURSED DATE',           keys: ['DISBURSED DATE', 'DISBURED DATE', 'Disbursed Date', 'disbursed_date'] },
  { header: 'POS (IN CR)',              keys: ['POS (IN CR)', 'POS(IN CR)', 'POS IN CR', 'pos_in_cr', 'pos'] },
  { header: 'POS AMT',                 keys: ['POS Amt', 'POS AMT', 'POS AMOUNT', 'pos_amount', 'pos_amt'] },
  { header: 'EMI',                     keys: ['EMI', 'emi'] },
  { header: 'EMI START DATE',          keys: ['EMI START DATE', 'EMI Start Date', 'emi_start_date', 'EMI STRT DATE'] },
  { header: 'OPENING BKT',             keys: ['OPENING BKT', 'Opening Bkt', 'opening_bkt', 'OPEN BKT'] },
  { header: 'BKT TAG',                 keys: ['BKT TAG', 'Bkt Tag', 'bkt_tag', 'BKT'] },
  { header: 'DPD',                     keys: ['DPD', 'dpd'] },
  { header: 'SECURITIZATION',          keys: ['SECURITIZATION', 'Securitization', 'securitization'] },
  { header: 'MAIN APPLICANT MOBILE NO',keys: ['Main_Applicant_Mobile_No', 'MAIN APPLICANT MOBILE NO', 'main_applicant_mobile_no', 'MAIN MOBILE NO', 'Mobile No'] },
  { header: 'CO APPLICANT NAME',       keys: ['Co_Applicant1_Name', 'CO APPLICANT NAME', 'co_applicant1_name', 'CO APPLICANT 1 NAME'] },
  { header: 'CO APPLICANT MOBILE NO',  keys: ['Co_Applicant1_Mobile_No', 'CO APPLICANT MOBILE NO', 'co_applicant1_mobile_no', 'CO APPLICANT 1 MOBILE NO'] },
  { header: 'LEGAL CASE FILED',        keys: [], check: legalCaseCheck },
];

function dynGet(dyn: Record<string, unknown>, candidates: string[]): string {
  const lower = Object.fromEntries(
    Object.entries(dyn).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
  for (const key of candidates) {
    const v = lower[key.toLowerCase().trim()];
    if (v != null) return String(v);
  }
  return '';
}

export function buildExportRows(visits: VisitLogResponse[]): (string | number | boolean)[][] {

  const headers: string[] = [
    'LOAN NUMBER', 'CUSTOMER NAME',
    ...ALLOC_DYN_COLS.map(c => c.header),
    'Visit ID', 'Agent Name', 'Visit Date', 'Visit Time',
    'Contactability', 'Contact Person', 'Contact Number',
    'Disposition', 'Classification Code', 'Reason For Default',
    'Amount Collected', 'Payment Mode',
    'Approval Status', 'Approval Remarks', 'Approved By', 'Approved At',
    'Visit Status', 'Residence Status', 'Office Status', 'Customer Profile',
    'Visit Notes', 'Created At',
  ];

  const rows = visits.map(v => {
    const dyn: Record<string, unknown> = v.allocationDynamicData ?? {};

    const allocCells = [
      v.loanNumber ?? '',
      v.borrowerName ?? '',
      ...ALLOC_DYN_COLS.map(col => col.check ? col.check(dyn) : dynGet(dyn, col.keys)),
    ];

    const visitCells = [
      v.id ?? '',
      v.agentName ?? '',
      v.visitDate ?? '',
      v.visitTime ?? '',
      v.contactability ?? '',
      v.contactPerson ?? '',
      v.contactNumber ?? '',
      v.disp ?? '',
      v.classificationCode ?? '',
      v.reasonForDefault ?? '',
      v.amountCollected != null ? v.amountCollected : '',
      v.paymentMode ?? '',
      v.approvalStatus ?? '',
      v.approvalRemarks ?? '',
      v.approvedBy ?? '',
      v.approvedAt ?? '',
      v.visitStatus ?? '',
      v.residenceStatus ?? '',
      v.officeStatus ?? '',
      v.customerProfile ?? '',
      v.visitNotes ?? '',
      v.createdAt ?? '',
    ];

    return [...allocCells, ...visitCells];
  });

  return [headers, ...rows];
}

export function triggerCsvDownload(rows: (string | number | boolean)[][], filename: string) {
  const content = rows
    .map(row =>
      row
        .map(cell => {
          const s = cell == null ? '' : String(cell);
          return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(','),
    )
    .join('\r\n');
  trigger(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function triggerXlsxDownload(rows: (string | number | boolean)[][], filename: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = (rows[0] as string[]).map(h => ({ wch: Math.max(String(h).length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Visit Logs');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  trigger(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  );
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
