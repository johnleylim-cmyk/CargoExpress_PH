import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, withTimeout } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { Search, Package, Filter } from 'lucide-react';

const tabs = ['All', 'Pending', 'Assigned', 'Picked Up', 'In Transit', 'Arrived at Hub', 'Out for Delivery', 'Delivered', 'Cancelled'];

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => { loadOrders(); }, []);
  const loadOrders = async () => {
    setError(null);
    setLoading(true);
    try { 
      const data = await withTimeout(getOrders(null, true));
      setOrders(data || []); 
    } catch (e) { 
      setError(e.message || 'Failed to load orders.');
    } finally { 
      setLoading(false); 
    }
  };

  const filtered = orders.filter(o => {
    if (activeTab !== 'All' && o.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return o.tracking_number?.toLowerCase().includes(s) || o.sender_name?.toLowerCase().includes(s) || o.receiver_name?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="page-transition">
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Orders</h1>
        <span className="badge badge-info">{orders.length} total</span>
      </div>
      <div className="search-box" style={{ marginBottom: 16 }}>
        <Search size={16} className="search-icon" />
        <input placeholder="Search tracking, sender, or receiver..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="tabs" style={{ overflowX: 'auto', marginBottom: 16 }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            className={`tab stagger-item ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {t} {t !== 'All' ? `(${orders.filter(o => o.status === t).length})` : ''}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="card animate-fade-in">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Tracking</th><th>Customer</th><th>Route</th><th>Weight</th><th>Cost</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {Array.from({ length: 6 }, (_, i) => <SkeletonTableRow key={i} cols={7} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? (
        <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-md" onClick={loadOrders}>Retry</button>
        </div>
      ) : (
        <div className="card animate-fade-in">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Tracking</th><th>Customer</th><th>Route</th><th>Weight</th><th>Cost</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id} className="stagger-item" style={{ animationDelay: `${i * 30}ms` }}>
                    <td><Link to={`/admin/orders/${o.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{o.tracking_number}</Link></td>
                    <td>{o.profiles?.name || o.sender_name}</td>
                    <td className="text-sm">{o.origin} → {o.destination}</td>
                    <td>{o.actual_weight || o.package_weight} kg</td>
                    <td style={{ fontWeight: 600 }}>₱{parseFloat(o.shipping_cost || 0).toFixed(2)}</td>
                    <td><StatusBadge status={o.status} size="sm" /></td>
                    <td className="text-xs text-secondary">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                      <EmptyState
                        icon={Package}
                        title="No orders found"
                        description="Try adjusting your search or filter criteria."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
