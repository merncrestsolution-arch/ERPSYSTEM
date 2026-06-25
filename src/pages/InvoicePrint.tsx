import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Capacitor } from '@capacitor/core';
import { Printer, ArrowLeft } from 'lucide-react';

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadSaleDetails(id);
    }
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

  // react-to-print uses a hidden iframe which does not print in the Android
  // WebView. On native we call the system print dialog directly; the @media
  // print rules below hide everything except the bill.
  const handlePrint = () => {
    if (Capacitor.isNativePlatform()) {
      window.print();
    } else {
      reactPrint();
    }
  };

  if (!sale) return <div className="p-8">Loading invoice details...</div>;

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center py-8 overflow-auto print:bg-white print:p-0 print:overflow-visible">
      {/* Non-printable controls */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-6 print:hidden px-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm font-medium transition-colors"
        >
          <Printer size={18} /> Print Invoice
        </button>
      </div>

      {/* Printable Area (A4 proportions) */}
      <div id="bill-print-area" ref={billRef} className="bill-container shadow-xl border border-slate-200 print:shadow-none print:border-none">
        <div className="bill-header">
          <div className="bill-company-info">
            <h2>DMS Wholesale Pvt Ltd</h2>
            <p>123 Logistics Avenue, Colombo 03</p>
            <p>Tel: +94 11 234 5678 | Email: sales@dms.lk</p>
          </div>
          <div className="bill-invoice-meta">
            <h3>INVOICE</h3>
            <p><strong>Invoice #:</strong> {sale.invoice_number}</p>
            <p><strong>Date:</strong> {new Date(sale.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="bill-customer">
          <p><strong>Bill To:</strong></p>
          <p>{sale.customer_name}</p>
          <p>{sale.address}</p>
          <p>{sale.contact_number}</p>
        </div>

        <table className="bill-items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item: any, i: number) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.product_name}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>Rs {item.selling_price.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>Rs {item.total_price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-totals">
          <div className="bill-totals-row">
            <span>Subtotal</span>
            <span>Rs {sale.total_amount.toFixed(2)}</span>
          </div>
          <div className="bill-totals-row">
            <span>Discount</span>
            <span>- Rs {sale.discount.toFixed(2)}</span>
          </div>
          <div className="bill-totals-row bill-grand-total">
            <span><strong>TOTAL</strong></span>
            <span><strong>Rs {sale.net_amount.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="bill-footer">
          <p>Thank you for your business!</p>
        </div>
      </div>

      <style>{`
        .bill-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
          background: white;
          color: #111;
          font-family: Arial, sans-serif;
          font-size: 14px;
        }
        .bill-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #333;
        }
        .bill-invoice-meta {
          text-align: right;
        }
        .bill-customer {
          margin-bottom: 20px;
        }
        .bill-items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .bill-items-table th,
        .bill-items-table td {
          border: 1px solid #ccc;
          padding: 8px 12px;
          text-align: left;
        }
        .bill-items-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .bill-items-table tbody tr:nth-child(even) {
          background-color: #fafafa;
        }
        .bill-totals {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          margin-bottom: 24px;
        }
        .bill-totals-row {
          display: flex;
          gap: 48px;
          justify-content: flex-end;
          min-width: 280px;
        }
        .bill-grand-total {
          border-top: 2px solid #333;
          padding-top: 6px;
          font-size: 16px;
        }
        .bill-footer {
          text-align: center;
          color: #555;
          font-size: 12px;
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #ddd;
        }
        @media print {
          .bill-container {
            padding: 0;
            max-width: 100%;
          }
          .bill-items-table th {
            background-color: #e0e0e0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
