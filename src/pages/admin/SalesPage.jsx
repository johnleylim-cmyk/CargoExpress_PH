import { useState, useEffect } from 'react';
import { getSalesData, withTimeout } from '../../lib/database';
import { SkeletonStatCard, SkeletonText } from '../../components/ui/SkeletonLoader';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import { BarChart3, DollarSign, TrendingUp, CreditCard } from 'lucide-react';

const SalesPage = () => {
  const [data, setData] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadSales(); }, []);
  const loadSales = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await withTimeout(getSalesData());
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load sales data.');
    } finally {
      setLoading(false);
    }
  };

  if (error) return (
    <div className="page-transition">
      <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
        <h3>Error</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-primary mt-md" onClick={loadSales}>Retry</button>
      </div>
    </div>
  );

  const s = data?.summary || {};

  // Compute max for payment method bar chart
  const paymentMethods = [
    {l:'Cash', v:s.cashTotal || 0, c:'#10B981'},
    {l:'GCash', v:s.gcashTotal || 0, c:'#3B82F6'},
    {l:'Pay Later', v:s.paylaterTotal || 0, c:'#F59E0B'}
  ];
  const maxPayment = Math.max(...paymentMethods.map(m => m.v), 1);

  // Compute max for monthly revenue bars
  const monthlySales = data?.monthlySales || [];
  const maxMonthly = Math.max(...monthlySales.map(m => m.total_revenue), 1);

  return (
    <div className="page-transition">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Sales & Revenue</h1>
          <p className="admin-page-subtitle">Revenue, collection health, and payment method performance.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4" style={{marginBottom:24}}>
        {loading ? (
          Array.from({ length: 4 }, (_, i) => <SkeletonStatCard key={i} />)
        ) : (
          [
            {l:'Total Revenue', v:s.totalRevenue||0, g:'linear-gradient(135deg,var(--primary),var(--primary-light))', prefix:'₱'},
            {l:'Collected', v:s.paidTotal||0, g:'linear-gradient(135deg,#10B981,#34D399)', prefix:'₱'},
            {l:'Outstanding', v:s.unpaidTotal||0, g:'linear-gradient(135deg,#EF4444,#F87171)', prefix:'₱'},
            {l:'Unpaid Orders', v:s.unpaidCount||0, g:'linear-gradient(135deg,#F59E0B,#FBBF24)', prefix:''}
          ].map((c,i)=>(
            <div key={i} className="stat-card stagger-item" style={{background:c.g, animationDelay: `${i * 60}ms`}}>
              <div className="stat-value">
                <AnimatedCounter value={c.v} prefix={c.prefix} decimals={0} duration={1200} />
              </div>
              <div className="stat-label">{c.l}</div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-2" style={{marginBottom:24}}>
        {/* Payment Methods */}
        <div className="card admin-section-card stagger-item" style={{ animationDelay: '240ms' }}>
          <div className="card-header"><h3>Payment Methods</h3></div>
          <div className="card-body">
            {loading ? <SkeletonText lines={3} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {paymentMethods.map((m,i)=>(
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.c, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{m.l}</span>
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        ₱{(m.v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 8,
                      background: '#F1F5F9',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.max(2, (m.v / maxPayment) * 100)}%`,
                        height: '100%',
                        background: m.c,
                        borderRadius: 4,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="card admin-section-card stagger-item" style={{ animationDelay: '300ms' }}>
          <div className="card-header"><h3>Monthly Revenue</h3></div>
          <div className="card-body">
            {loading ? <SkeletonText lines={4} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {monthlySales.slice(0,6).map((m,i)=>(
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {new Date(m.month + '-01').toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                          ₱{m.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          collected: ₱{m.collected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 6,
                      background: '#F1F5F9',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.max(2, (m.total_revenue / maxMonthly) * 100)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                        borderRadius: 3,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                ))}
                {monthlySales.length===0&&<div className="text-center text-secondary" style={{padding:20}}>No sales data</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SalesPage;
