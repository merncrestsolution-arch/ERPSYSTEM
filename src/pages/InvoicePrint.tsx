import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);

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

  const handlePrint = () => {
    window.print();
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
      <div className="bg-white w-full max-w-3xl shadow-xl border border-slate-200 min-h-[1056px] p-12 print:shadow-none print:border-none print:m-0 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">INVOICE</h1>
            <p className="text-slate-500 font-medium">{sale.invoice_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-blue-600 mb-1">DMS Wholesale Pvt Ltd</h2>
            <p className="text-sm text-slate-600">123 Logistics Avenue, Colombo 03</p>
            <p className="text-sm text-slate-600">Tel: +94 11 234 5678 | Email: sales@dms.lk</p>
          </div>
        </div>

        {/* Info Blocks */}
        <div className="flex flex-col sm:flex-row sm:justify-between mb-12 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
            <p className="font-bold text-slate-800 text-lg">{sale.customer_name}</p>
            <p className="text-slate-600">{sale.address}</p>
            <p className="text-slate-600">{sale.contact_number}</p>
          </div>
          <div className="sm:text-right">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Date</h3>
              <p className="font-medium text-slate-800">{new Date(sale.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Term</h3>
              <p className="font-medium text-slate-800">{sale.sale_type}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-300">
                <th className="py-3 px-4 font-bold text-slate-800 w-12 text-center">#</th>
                <th className="py-3 px-4 font-bold text-slate-800">Description</th>
                <th className="py-3 px-4 font-bold text-slate-800 text-right">Qty</th>
                <th className="py-3 px-4 font-bold text-slate-800 text-right">Unit Price</th>
                <th className="py-3 px-4 font-bold text-slate-800 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item: any, i: number) => (
                <tr key={item.id}>
                  <td className="py-4 px-4 text-center text-slate-500">{i + 1}</td>
                  <td className="py-4 px-4 font-medium text-slate-800">{item.product_name}</td>
                  <td className="py-4 px-4 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-4 px-4 text-right text-slate-600">{item.selling_price.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right font-medium text-slate-800">{item.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t-2 border-slate-800 pt-6">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{sale.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span>-{sale.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-slate-900 border-t border-slate-200 pt-3">
              <span>Total (LKR)</span>
              <span>{sale.net_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
          <p className="mb-2">Thank you for your business!</p>
          <p>Please make cheques payable to <strong>DMS Wholesale Pvt Ltd</strong>.</p>
          <div className="mt-16 flex justify-between px-16">
            <div className="border-t border-slate-400 pt-2 w-48">Customer Signature</div>
            <div className="border-t border-slate-400 pt-2 w-48">Authorized Signature</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: auto; margin: 0mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white;}
          #root { height: auto; }
        }
      `}</style>
    </div>
  );
}
