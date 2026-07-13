import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';

export type PdfOptions = {
  filename?: string;
  /** Landscape when content is wide */
  landscape?: boolean;
  /** Extra top margin in mm */
  marginMm?: number;
};

/**
 * Capture an HTML element and download it as a multi-page PDF.
 */
export async function downloadElementAsPdf(
  element: HTMLElement | null,
  options: PdfOptions = {}
): Promise<void> {
  if (!element) throw new Error('Nothing to export');

  const filename = options.filename || `erp-document-${Date.now()}.pdf`;
  const margin = options.marginMm ?? 10;

  // Temporarily ensure white background for capture
  const prevBg = element.style.backgroundColor;
  element.style.backgroundColor = '#ffffff';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const orientation = options.landscape ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(filename);
  } finally {
    element.style.backgroundColor = prevBg;
  }
}

/**
 * Open the system print dialog for an element (user can choose "Save as PDF").
 * Prefers a dedicated print window so surrounding chrome is excluded.
 */
export function printElement(element: HTMLElement | null, title = 'ERP Document'): void {
  if (!element) throw new Error('Nothing to print');

  if (Capacitor.isNativePlatform()) {
    // Native WebView: print whole page; caller should use print:hidden on chrome.
    window.print();
    return;
  }

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!win) {
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join('\n');

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  ${styles}
  <style>
    @page { margin: 12mm; }
    body { margin: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
    .print-root { padding: 8px; }
    .no-print, button, .print\\:hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="print-root">${element.innerHTML}</div>
</body>
</html>`);
  win.document.close();
  win.focus();

  // Wait for images (QR) to load before printing
  const imgs = Array.from(win.document.images);
  const wait = imgs.length
    ? Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) resolve();
              else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            })
        )
      )
    : Promise.resolve();

  wait.then(() => {
    setTimeout(() => {
      win.print();
      // Keep window open briefly so print preview can render
      setTimeout(() => win.close(), 500);
    }, 250);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convenience: download PDF by element id */
export async function downloadById(id: string, filename: string, opts?: PdfOptions) {
  const el = document.getElementById(id);
  await downloadElementAsPdf(el, { ...opts, filename });
}

/** Convenience: print by element id */
export function printById(id: string, title?: string) {
  printElement(document.getElementById(id), title);
}
