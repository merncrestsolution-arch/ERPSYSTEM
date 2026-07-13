import { useState } from 'react';
import type { RefObject } from 'react';
import { Download, Printer, Loader2 } from 'lucide-react';
import { downloadElementAsPdf, printElement } from '../lib/pdfExport';

type Props = {
  /** Element to capture / print */
  targetRef?: RefObject<HTMLElement | null>;
  /** Or lookup by DOM id */
  targetId?: string;
  filename: string;
  printTitle?: string;
  landscape?: boolean;
  className?: string;
  size?: 'sm' | 'md';
};

export default function PdfActions({
  targetRef,
  targetId,
  filename,
  printTitle,
  landscape,
  className = '',
  size = 'md',
}: Props) {
  const [busy, setBusy] = useState<'pdf' | 'print' | null>(null);

  const resolveEl = (): HTMLElement | null => {
    if (targetRef?.current) return targetRef.current;
    if (targetId) return document.getElementById(targetId);
    return null;
  };

  const onDownload = async () => {
    const el = resolveEl();
    if (!el) {
      alert('Document not ready yet');
      return;
    }
    setBusy('pdf');
    try {
      await downloadElementAsPdf(el, { filename, landscape });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'PDF download failed');
    } finally {
      setBusy(null);
    }
  };

  const onPrint = () => {
    const el = resolveEl();
    if (!el) {
      alert('Document not ready yet');
      return;
    }
    setBusy('print');
    try {
      printElement(el, printTitle || filename);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Print failed');
    } finally {
      setTimeout(() => setBusy(null), 400);
    }
  };

  const btn =
    size === 'sm'
      ? 'px-3 py-1.5 text-sm rounded-md font-medium flex items-center gap-1.5'
      : 'px-4 py-2 rounded-md font-medium flex items-center gap-2';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={onDownload}
        disabled={!!busy}
        className={`${btn} bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white`}
      >
        {busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Download PDF
      </button>
      <button
        type="button"
        onClick={onPrint}
        disabled={!!busy}
        className={`${btn} bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white`}
      >
        {busy === 'print' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
        Print
      </button>
    </div>
  );
}
