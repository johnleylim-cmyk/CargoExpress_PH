import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomerById } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import { SkeletonStatCard, SkeletonText } from '../../components/ui/SkeletonLoader';
import { ArrowLeft, User, Mail, Phone, MapPin, Package, DollarSign } from 'lucide-react';

const CustomerDetailPage = () => {
  const { id } = useParams(); const navigate = useNavigate();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    load(isMounted);
    return () => { isMounted = false; };
  }, [id]);

  const load = async (isMounted = true) => {
    setError(null);
    setLoading(true);
    try {
      const result = await getCustomerById(id);
      if (isMounted) setData(result);
    } catch(e) {
      setError(e.message || 'Failed to load customer data.');
      if (isMounted) setError(e.message || 'Failed to load customer.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  if (loading) return (
    <div className="page-transition">
      <div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: 16 }} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-body"><SkeletonText lines={3} /></div></div>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        {Array.from({ length: 4 }, (_, i) => <SkeletonStatCard key={i} />)}
      </div>
    </div>
  );
  if (error) return (
    <div className="page-transition">
      <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
        <h3>Error Loading Customer</h3>
        <p style={{ margin: '8px 0 20px' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => load()}>Retry</button>
      </div>
    </div>
  );
  if (!data) return <div className="empty-state"><h3>Customer not found</h3></div>;
  const { customer, orders, summary } = data;

  return (
    <div className="page-transition">
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{marginBottom:16}}><ArrowLeft size={18}/> Back</button>
      <div className="card stagger-item" style={{marginBottom:16,overflow:'visible', animationDelay: '0ms'}}>
        <div style={{background:'linear-gradient(135deg, var(--accent), var(--primary))',height:60,borderRadius:'12px 12px 0 0'}}/>
        <div style={{padding:'0 24px 24px',marginTop:-30}}>
          <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary),var(--primary-light))',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'1.25rem',fontWeight:800,border:'3px solid white'}}>{(customer.name||'U')[0].toUpperCase()}</div>
          <h2 style={{fontWeight:800,marginTop:8}}>{customer.name}</h2>
          <div className="text-sm text-secondary">{customer.email} • {customer.phone || '—'}</div>
          <div className="text-xs text-tertiary" style={{marginTop:4}}>{[customer.address_province,customer.address_city].filter(Boolean).join(', ')||'No address'}</div>
        </div>
      </div>
      <div className="grid grid-4" style={{marginBottom:16}}>
        {[
          {l:'Total Orders', v:summary.totalOrders, g:'linear-gradient(135deg,#3B82F6,#60A5FA)', isNum: true},
          {l:'Completed', v:summary.completedOrders, g:'linear-gradient(135deg,#10B981,#34D399)', isNum: true},
          {l:'Pending', v:summary.pendingOrders, g:'linear-gradient(135deg,#F59E0B,#FBBF24)', isNum: true},
          {l:'Total Spent', v:summary.totalSpent, g:'linear-gradient(135deg,var(--primary),var(--primary-light))', isNum: true, prefix: '₱', decimals: 0}
        ].map((s,i)=>(
          <div key={i} className="stat-card stagger-item" style={{background:s.g, animationDelay: `${(i + 1) * 60}ms`}}>
            <div className="stat-value">
              <AnimatedCounter value={typeof s.v === 'number' ? s.v : 0} prefix={s.prefix || ''} decimals={s.decimals || 0} duration={1200} />
            </div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="card stagger-item" style={{ animationDelay: '360ms' }}>
        <div className="card-header"><h3>Order History</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Tracking</th><th>Route</th><th>Cost</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}><td data-label="Tracking" style={{fontWeight:600}}>{o.tracking_number}</td><td data-label="Route" className="text-sm">{o.origin} → {o.destination}</td>
                <td data-label="Cost">₱{parseFloat(o.shipping_cost||0).toFixed(2)}</td><td data-label="Status"><StatusBadge status={o.status} size="sm"/></td>
                <td data-label="Date" className="text-xs text-secondary">{new Date(o.created_at).toLocaleDateString()}</td></tr>
              ))}
              {orders.length===0&&<tr><td colSpan={5} className="text-center text-secondary" style={{padding:30}}>No orders</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default CustomerDetailPage;
