import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, withTimeout } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonTableRow } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import PageTransition from '../../components/ui/PageTransition';
import { motion } from 'framer-motion';
import { Search, Package } from 'lucide-react';

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
    <PageTransition>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Orders</h1>
          <p className="admin-page-subtitle">Search, review, and advance every cargo order.</p>
        </div>
        <div className="admin-page-meta">
          <span className="badge badge-info">{filtered.length} shown</span>
          <span className="badge">{orders.length} total</span>
        </div>
      </div>
      <div className="admin-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            aria-label="Search orders"
            placeholder="Search tracking, sender, or receiver..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="tabs admin-mobile-tabs" role="tablist" aria-label="Order status filters" style={{ marginBottom: 16 }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={activeTab === t}
            className={`tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
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
        <div className="card admin-error-card">
          <h3>Error</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary mt-md" onClick={loadOrders}>Retry</button>
        </div>
      ) : (
        <div className="card admin-section-card admin-table-card animate-fade-in">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Tracking</th><th>Customer</th><th>Route</th><th>Weight</th><th>Cost</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {filtered.map((o, i) => (
                  <motion.tr 
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, type: 'spring', stiffness: 260, damping: 24 }}
                  >
                    <td data-label="Tracking"><Link to={`/admin/orders/${o.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{o.tracking_number}</Link></td>
                    <td data-label="Customer">{o.profiles?.name || o.sender_name}</td>
                    <td data-label="Route" className="text-sm">{o.origin} → {o.destination}</td>
                    <td data-label="Weight">{o.actual_weight || o.package_weight} kg</td>
                    <td data-label="Cost" style={{ fontWeight: 600 }}>₱{parseFloat(o.shipping_cost || 0).toFixed(2)}</td>
                    <td data-label="Status"><StatusBadge status={o.status} size="sm" /></td>
                    <td data-label="Date" className="text-xs text-secondary">{new Date(o.created_at).toLocaleDateString()}</td>
                  </motion.tr>
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
    </PageTransition>
  );
};

export default AdminOrdersPage;
