import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getOrders } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonOrderCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { Search, Package, AlertCircle } from 'lucide-react';

const tabs = ['All', 'Pending', 'In Transit', 'Delivered', 'Cancelled'];

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    loadOrders(isMounted);
    return () => { isMounted = false; };
  }, [user]);

  const loadOrders = async (isMounted = true) => {
    setError(null);
    setLoading(true);
    try {
      const data = await getOrders(user.id, false);
      if (isMounted) setOrders(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
      if (isMounted) setError(err.message || 'Failed to load orders.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const filtered = orders.filter(o => {
    if (activeTab !== 'All' && o.status !== activeTab) return false;
    if (search && !o.tracking_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-transition">
      <h2 style={{ fontWeight: 800, marginBottom: 20 }}>My Orders</h2>
      <div className="search-box stagger-item" style={{ marginBottom: 16, animationDelay: '0ms' }}>
        <Search size={16} className="search-icon" />
        <input placeholder="Search tracking number..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="tabs stagger-item" style={{ overflowX: 'auto', animationDelay: '60ms' }}>
        {tabs.map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>
      {loading ? (
        <div>
          {[0, 1, 2].map(i => (
            <div key={i} className="stagger-item" style={{ animationDelay: `${(i + 2) * 60}ms`, marginBottom: 12 }}>
              <SkeletonOrderCard />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card animate-scale-in text-center" style={{ padding: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} color="#EF4444" />
          </div>
          <h3 style={{ color: '#DC2626', marginBottom: 8 }}>Error Loading Orders</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: 20 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => loadOrders()}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-scale-in">
          <EmptyState
            icon={Package}
            title={search || activeTab !== 'All' ? 'No orders found' : 'No Orders Yet'}
            description={search || activeTab !== 'All' ? 'Try adjusting your search or filter criteria.' : 'Book your first shipment to get started!'}
            actionLabel={!search && activeTab === 'All' ? 'Book Shipment' : undefined}
            onAction={!search && activeTab === 'All' ? () => navigate('/customer/book') : undefined}
          />
        </div>
      ) : (
        filtered.map((order, index) => (
          <Link key={order.id} to={`/customer/orders/${order.id}`} className="card card-interactive stagger-item" style={{ display: 'block', marginBottom: 12, textDecoration: 'none', color: 'inherit', animationDelay: `${(index + 2) * 60}ms` }}>
            <div className="card-body" style={{ padding: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{order.tracking_number}</span>
                <StatusBadge status={order.status} size="sm" />
              </div>
              <div className="text-sm text-secondary">{order.origin} → {order.destination}</div>
              <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
                <span className="text-xs text-tertiary">To: {order.receiver_name}</span>
                <span className="text-sm font-bold">₱{parseFloat(order.shipping_cost || 0).toFixed(2)}</span>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
};

export default OrdersPage;
