import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Capacitor } from '@capacitor/core';
import { Printer, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { downloadElementAsPdf } from '../lib/pdfExport';
import { COMPANY } from '../lib/companyProfile';
import BrandLogo from '../components/BrandLogo';

function money(n: number | null | undefined) {
  return `Rs ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadSaleDetails(id);
  }, [id]);

  const loadSaleDetails = async (saleId: string) => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const data = await window.electronAPI.getSaleDetails(parseInt(saleId));
        setSale(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reactPrint = useReactToPrint({
    contentRef: billRef,
    documentTitle: sale ? `Invoice-${sale.invoice_number}` : 'Invoice',
  });

  const handlePrint = () => {
    if (Capacitor.isNativePlatform()) {
      window.print();
    } else {
      reactPrint();
    }
  };

  const handleDownloadPdf = async () => {
    if (!billRef.current || !sale) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(billRef.current, {
        filename: `Invoice-${sale.invoice_number || id}.pdf`,
      });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'PDF download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (!sale) return <div className="p-8">Loading invoice details...</div>;

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center py-8 overflow-auto print:bg-white print:p-0 print:overflow-visible">
      <div className="w-full max-w-3xl flex flex-wrap justify-between items-center gap-3 mb-6 print:hidden px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2 rounded-md shadow-sm font-medium transition-colors"
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm font-medium transition-colors"
          >
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div id="bill-print-area" ref={billRef} className="bill-container shadow-xl border border-slate-200 print:shadow-none print:border-none">
        {/* Brand bar */}
        <div className="bill-brand">
          <BrandLogo variant="full" imgClassName="h-16 w-auto mb-2" />
          <div className="bill-brand-name">{COMPANY.legalName}</div>
          <div className="bill-brand-trade">{COMPANY.tradingAs}</div>
        </div>

        {/* Header: company contact + invoice meta (no overlap) */}
        <div className="bill-header">
          <div className="bill-company-info">
            <p className="bill-label">From</p>
            <p>{COMPANY.address}</p>
            <p>{COMPANY.phone}</p>
            <p>{COMPANY.email}</p>
          </div>
          <div className="bill-invoice-meta">
            <h3>INVOICE</h3>
            <table className="bill-meta-table">
              <tbody>
                <tr>
                  <td>Invoice #</td>
                  <td>{sale.invoice_number}</td>
                </tr>
                <tr>
                  <td>Date</td>
                  <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                </tr>
                {sale.sale_type && (
                  <tr>
                    <td>Type</td>
                    <td>{sale.sale_type}</td>
                  </tr>
                )}
                {sale.status && (
                  <tr>
                    <td>Status</td>
                    <td>{sale.status}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill To */}
        <div className="bill-customer">
          <p className="bill-label">Bill To</p>
          <p className="bill-customer-name">{sale.customer_name}</p>
          {sale.address && <p>{sale.address}</p>}
          {sale.contact_number && <p>{sale.contact_number}</p>}
        </div>

        <table className="bill-items-table">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>#</th>
              <th style={{ width: '42%' }}>Description</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Qty</th>
              <th style={{ width: '19%', textAlign: 'right' }}>Unit Price</th>
              <th style={{ width: '19%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item: any, i: number) => (
              <tr key={item.id || i}>
                <td>{i + 1}</td>
                <td>{item.product_name}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{money(item.selling_price)}</td>
                <td style={{ textAlign: 'right' }}>{money(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-totals">
          <div className="bill-totals-box">
            <div className="bill-totals-row">
              <span>Subtotal</span>
              <span>{money(sale.total_amount)}</span>
            </div>
            <div className="bill-totals-row">
              <span>Discount</span>
              <span>- {money(sale.discount)}</span>
            </div>
            <div className="bill-totals-row bill-grand-total">
              <span>TOTAL</span>
              <span>{money(sale.net_amount)}</span>
            </div>
          </div>
        </div>

        <div className="bill-footer">
          <p>Thank you for your business!</p>
          <p className="bill-footer-fine">{COMPANY.displayName} · {COMPANY.phone}</p>
        </div>
      </div>

      <style>{`
        .bill-container {
          width: 100%;
          max-width: 794px;
          margin: 0 auto;
          padding: 28px 32px;
          background: white;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          line-height: 1.45;
          box-sizing: border-box;
        }
        .bill-brand {
          margin-bottom: 18px;
        }
        .bill-brand-name {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
          word-wrap: break-word;
        }
        .bill-brand-trade {
          font-size: 13px;
          font-weight: 600;
          color: #1d4ed8;
          margin-top: 2px;
          letter-spacing: 0.02em;
        }
        .bill-header {
          display: grid;
          grid-template-columns: 1fr minmax(200px, 240px);
          gap: 20px 28px;
          align-items: start;
          margin-bottom: 22px;
          padding-bottom: 16px;
          border-bottom: 2px solid #1e293b;
        }
        .bill-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          margin: 0 0 6px 0;
        }
        .bill-company-info p {
          margin: 0 0 2px 0;
          color: #334155;
          word-wrap: break-word;
        }
        .bill-invoice-meta {
          text-align: left;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 14px;
        }
        .bill-invoice-meta h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #0f172a;
        }
        .bill-meta-table {
          width: 100%;
          border-collapse: collapse;
        }
        .bill-meta-table td {
          padding: 3px 0;
          vertical-align: top;
          font-size: 12px;
        }
        .bill-meta-table td:first-child {
          color: #64748b;
          width: 42%;
          padding-right: 8px;
        }
        .bill-meta-table td:last-child {
          font-weight: 600;
          color: #0f172a;
          text-align: right;
          word-break: break-all;
        }
        .bill-customer {
          margin-bottom: 22px;
          padding: 12px 14px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .bill-customer p {
          margin: 0 0 2px 0;
          color: #334155;
        }
        .bill-customer-name {
          font-size: 15px !important;
          font-weight: 700 !important;
          color: #0f172a !important;
          margin-bottom: 4px !important;
        }
        .bill-items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          table-layout: fixed;
        }
        .bill-items-table th,
        .bill-items-table td {
          border: 1px solid #cbd5e1;
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
        }
        .bill-items-table th {
          background-color: #e2e8f0;
          font-weight: 700;
          font-size: 12px;
          color: #0f172a;
        }
        .bill-items-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .bill-totals {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 28px;
        }
        .bill-totals-box {
          width: 280px;
          max-width: 100%;
        }
        .bill-totals-row {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding: 5px 0;
          color: #334155;
        }
        .bill-grand-total {
          border-top: 2px solid #0f172a;
          margin-top: 6px;
          padding-top: 10px;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }
        .bill-footer {
          text-align: center;
          color: #64748b;
          font-size: 12px;
          margin-top: 8px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }
        .bill-footer p {
          margin: 0 0 4px 0;
        }
        .bill-footer-fine {
          font-size: 10px;
          color: #94a3b8;
        }
        @media (max-width: 640px) {
          .bill-container {
            padding: 16px;
          }
          .bill-header {
            grid-template-columns: 1fr;
          }
        }
        @media print {
          .bill-container {
            padding: 0;
            max-width: 100%;
            box-shadow: none !important;
            border: none !important;
          }
          .bill-items-table th,
          .bill-invoice-meta,
          .bill-customer {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
