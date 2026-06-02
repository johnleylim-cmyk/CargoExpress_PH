import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getOrders } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonOrderCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import PageTransition, { StaggerItem } from '../../components/ui/PageTransition';
import ResponsiveFilterControls from '../../components/ui/ResponsiveFilterControls';
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
    <PageTransition>
      <h2 className="fw-800 mb-20">My Orders</h2>
      <StaggerItem className="search-box mb-16" delay={0}>
        <Search size={16} className="search-icon" />
        <input
          aria-label="Search tracking number"
          placeholder="Search tracking number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </StaggerItem>
      <StaggerItem className="mb-16" delay={60}>
        <ResponsiveFilterControls
          options={tabs.map(t => ({ value: t, label: t }))}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Order status filters"
          label="Status"
          desktopClassName="tabs customer-order-tabs"
        />
      </StaggerItem>
      {loading ? (
        <div>
          {[0, 1, 2].map(i => (
            <StaggerItem key={i} delay={(i + 2) * 60} className="mb-12">
              <SkeletonOrderCard />
            </StaggerItem>
          ))}
        </div>
      ) : error ? (
        <div className="card animate-scale-in text-center" style={{ padding: 40 }}>
          <div className="flex items-center justify-center mx-auto mb-16" style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2' }}>
            <AlertCircle size={28} color="#EF4444" />
          </div>
          <h3 className="mb-8" style={{ color: '#DC2626' }}>Error Loading Orders</h3>
          <p className="text-secondary text-sm mb-20">{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => loadOrders()}>Retry</button>
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
          <StaggerItem key={order.id} delay={(index + 2) * 60} className="mb-12">
            <Link to={`/customer/orders/${order.id}`} className="card card-interactive block text-no-underline" style={{ color: 'inherit' }}>
              <div className="card-body p-16">
                <div className="flex items-center justify-between mb-6">
                  <span className="fw-700 text-accent">{order.tracking_number}</span>
                  <StatusBadge status={order.status} size="sm" />
                </div>
                <div className="text-sm text-secondary">{order.origin} → {order.destination}</div>
                <div className="flex items-center justify-between mt-8">
                  <span className="text-xs text-tertiary">To: {order.receiver_name}</span>
                  <span className="text-sm font-bold">₱{parseFloat(order.shipping_cost || 0).toFixed(2)}</span>
                </div>
              </div>
            </Link>
          </StaggerItem>
        ))
      )}
    </PageTransition>
  );
};

export default OrdersPage;
