import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface ApprovalItem {
  id: number;
  type: string;
  reference: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function ApprovalCenter() {
  const { user } = useAuth();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const data = await window.electronAPI.getPendingApprovals();
        // Filter based on role logic
        let filtered = data;
        
        // Items are created with a single 'Pending Approval' status (sales over
        // credit limit, plus pending GRN/GRTN). Final authorizers (Director/Admin)
        // sign these off. Staged statuses are matched too for forward compatibility.
        if (user?.role === 'Accountant') {
          filtered = data.filter((item: any) => item.status === 'Pending Accountant');
        } else if (user?.role === 'Director') {
          filtered = data.filter((item: any) =>
            item.status === 'Pending Director' ||
            item.status === 'Pending' ||
            item.status === 'Pending Approval'
          );
        } else if (user?.role === 'Store Manager') {
          filtered = data.filter((item: any) => item.status === 'Pending Store Manager');
        } else if (user?.role === 'Admin') {
          // Admin sees everything
          filtered = data;
        } else {
          filtered = [];
        }

        setItems(filtered);
      }
    } catch (error) {
      console.error('Failed to load approvals', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [user]);

  const handleAction = async (item: ApprovalItem, action: 'Approve' | 'Reject') => {
    let newStatus = '';
    
    if (action === 'Reject') {
      newStatus = 'Rejected';
    } else {
      // Logic to move to next stage based on current role
      if (user?.role === 'Store Manager') {
        newStatus = 'Pending Accountant';
      } else if (user?.role === 'Accountant') {
        newStatus = 'Pending Director';
      } else if (user?.role === 'Director' || user?.role === 'Admin') {
        newStatus = 'Approved';
      }
    }

    try {
      // @ts-ignore
      await window.electronAPI.approveItem({ id: item.id, type: item.type, newStatus });
      fetchApprovals(); // refresh list
    } catch (e) {
      alert('Failed to process approval');
    }
  };

  if (loading) return <div className="p-8">Loading approvals...</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Approval Center</h1>
          <p className="text-slate-500">Review and authorize pending transactions</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" /> 
            Pending Your Authorization ({items.length})
          </h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No pending items require your approval at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-medium whitespace-nowrap">Type</th>
                  <th className="p-4 font-medium whitespace-nowrap">Reference No.</th>
                  <th className="p-4 font-medium whitespace-nowrap">Amount</th>
                  <th className="p-4 font-medium whitespace-nowrap">Current Status</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold
                        ${item.type === 'GRN' ? 'bg-blue-100 text-blue-700' : ''}
                        ${item.type === 'GRTN' ? 'bg-orange-100 text-orange-700' : ''}
                        ${item.type === 'Cheque' ? 'bg-purple-100 text-purple-700' : ''}
                        ${item.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : ''}
                      `}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{item.reference}</td>
                    <td className="p-4 whitespace-nowrap">Rs {item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-amber-600 text-sm font-medium flex items-center gap-1">
                        <Clock size={14} /> {item.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2 justify-end whitespace-nowrap">
                      <button 
                        onClick={() => handleAction(item, 'Reject')}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Reject"
                      >
                        <XCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleAction(item, 'Approve')}
                        className="p-2 text-green-500 hover:bg-green-50 rounded transition-colors"
                        title="Approve / Forward to Next Stage"
                      >
                        <CheckCircle size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
