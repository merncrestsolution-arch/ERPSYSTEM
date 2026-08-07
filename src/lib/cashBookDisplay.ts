/** Cash book display helpers — collection metadata + legacy description parsing. */

export const COLLECTION_TYPES = ['New Sale', 'Previous Invoice', 'Cheque RTN'] as const;
export type CollectionType = (typeof COLLECTION_TYPES)[number];

export type CashBookEntry = {
  id?: number;
  entry_type?: string;
  category?: string | null;
  description?: string | null;
  amount?: number;
  entry_date?: string;
  payment_method?: string | null;
  collection_type?: string | null;
  invoice_number?: string | null;
  receipt_number?: string | null;
  cheque_id?: number | null;
  cheque_reference?: string | null;
  sale_id?: number | null;
  receipt_id?: number | null;
};

/** Parse legacy descriptions like "Cash — INV-406430" or "Payment from customer #7". */
export function enrichCashBookEntry(entry: CashBookEntry): CashBookEntry {
  const desc = String(entry.description || '').trim();
  let payment_method = entry.payment_method || null;
  let invoice_number = entry.invoice_number || null;
  let receipt_number = entry.receipt_number || null;
  let collection_type = entry.collection_type || null;
  let cheque_reference = entry.cheque_reference || null;

  if (!payment_method || !invoice_number) {
    // "Cash — INV-406430" / "Cheque — INV-123"
    const m = desc.match(/^(Cash|Cheque|Transfer|Card)\s*[—\-–]\s*(INV[-\s]?\w+)/i);
    if (m) {
      payment_method = payment_method || m[1];
      invoice_number = invoice_number || m[2].replace(/\s+/g, '').toUpperCase().replace(/^INV/i, 'INV-').replace('INV--', 'INV-');
      if (invoice_number && !/^INV-/i.test(invoice_number)) {
        invoice_number = `INV-${invoice_number.replace(/^INV/i, '')}`;
      }
    }
  }

  if (!invoice_number) {
    const inv = desc.match(/\b(INV-[\w-]+)\b/i);
    if (inv) invoice_number = inv[1].toUpperCase();
  }

  if (!receipt_number) {
    const rcpt = desc.match(/\b(RCP|RCPT|REC|RECEIPT)[-#:\s]*([\w-]+)\b/i);
    if (rcpt) receipt_number = `${rcpt[1].toUpperCase()}-${rcpt[2]}`;
  }

  if (!cheque_reference) {
    const chq = desc.match(/\b(?:CHQ|CHEQUE)[-#:\s]*([\w-]+)\b/i);
    if (chq) cheque_reference = chq[1];
  }

  if (!collection_type && entry.entry_type === 'Income') {
    if (/cheque\s*rtn|returned|bounce/i.test(desc) || /Cheque RTN/i.test(String(entry.category || ''))) {
      collection_type = 'Cheque RTN';
    } else if (invoice_number || /INV-/i.test(desc)) {
      collection_type = /new\s*sale/i.test(desc) ? 'New Sale' : 'Previous Invoice';
    } else if (entry.category === 'Customer Payment' || /Payment from customer/i.test(desc)) {
      collection_type = 'Previous Invoice';
    }
  }

  if (!payment_method && entry.entry_type === 'Income') {
    if (/cheque/i.test(desc) || cheque_reference) payment_method = 'Cheque';
    else if (/transfer|bank/i.test(desc)) payment_method = 'Transfer';
    else if (/card/i.test(desc)) payment_method = 'Card';
    else if (/cash/i.test(desc) || entry.category === 'Customer Payment') payment_method = 'Cash';
  }

  return {
    ...entry,
    payment_method,
    collection_type,
    invoice_number,
    receipt_number,
    cheque_reference,
  };
}

export function enrichCashBookEntries(entries: CashBookEntry[]): CashBookEntry[] {
  return (entries || []).map(enrichCashBookEntry);
}
