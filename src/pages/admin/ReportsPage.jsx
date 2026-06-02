import { useState, useEffect, useRef } from 'react';
import { getReportData } from '../../lib/database';
import { SkeletonStatCard, SkeletonText } from '../../components/ui/SkeletonLoader';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import {
  FileText, Printer, Calendar, Package, CheckCircle,
  DollarSign, TrendingUp, Truck, MapPin, BarChart3,
  Filter, RefreshCw, Clock, CreditCard, Loader, AlertTriangle
} from 'lucide-react';

const PERIODS = [
  { key: 'daily', label: 'Daily', icon: Clock },
  { key: 'weekly', label: 'Weekly', icon: Calendar },
  { key: 'monthly', label: 'Monthly', icon: Calendar },
  { key: 'yearly', label: 'Yearly', icon: BarChart3 },
  { key: 'custom', label: 'Custom', icon: Filter },
];

const formatCurrency = (val) => `₱${(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatWeight = (val) => `${(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
const formatDate = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDateTime = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

const STATUS_ORDER = ['Pending', 'Assigned', 'Picked Up', 'In Transit', 'Arrived at Hub', 'Out for Delivery', 'Delivered', 'Cancelled'];

const ReportsPage = () => {
  const [period, setPeriod] = useState('daily');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  const loadReport = async () => {
    if (period === 'custom' && (!customStart || !customEnd)) {
      setError('Please select both start and end dates for custom range.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getReportData(
        period,
        period === 'custom' ? customStart : null,
        period === 'custom' ? customEnd : null
      );
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom') loadReport();
  }, [period]);

  const handlePrint = () => {
    window.print();
  };

  const s = data?.summary || {};
  const hasData = data && data.orders && data.orders.length > 0;

  return (
    <div className="page-transition">
      {/* ── Screen-only controls ── */}
      <div className="report-controls no-print">
        <div>
          <h1 className="admin-page-title">
            <FileText size={24} className="text-primary" />
            Reports & Analytics
          </h1>
          <p className="admin-page-subtitle">
            Generate, view, and print detailed business reports
          </p>
        </div>
        <div className="flex gap-8">
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadReport} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {hasData && (
            <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={16} />
              Print Report
            </button>
          )}
        </div>
      </div>

      {/* ── Period Tabs ── */}
      <div className="report-period-tabs no-print" role="tablist" aria-label="Report period">
        {PERIODS.map(p => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={period === p.key}
            className={`report-period-tab ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            <p.icon size={14} />
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Custom Date Range ── */}
      {period === 'custom' && (
        <div className="report-custom-range no-print stagger-item">
          <div className="report-date-inputs">
            <div className="form-group">
              <label className="form-label" htmlFor="report-start-date">Start Date</label>
              <input
                id="report-start-date"
                type="date"
                className="form-input"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="report-end-date">End Date</label>
              <input
                id="report-end-date"
                type="date"
                className="form-input"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={loadReport}
            disabled={!customStart || !customEnd || loading}
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            Generate Report
          </button>
        </div>
      )}

      {/* ── Error State ── */}
      {error && (
        <div className="card p-24 text-center text-error mt-16">
          <AlertTriangle size={32} className="mb-8" />
          <p>{error}</p>
          <button type="button" className="btn btn-primary btn-sm mt-12" onClick={loadReport}>Retry</button>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div className="mt-20">
          <div className="grid grid-4 mb-20">
            {[0, 1, 2, 3].map(i => <SkeletonStatCard key={i} />)}
          </div>
          <div className="card card-body"><SkeletonText lines={8} /></div>
        </div>
      )}

      {/* ── Report Content (Printable) ── */}
      {!loading && data && (
        <div id="printable-report" ref={printRef}>

          {/* Print-only header */}
          <div className="print-report-header">
            <div className="print-brand">
              <div className="print-brand-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8722A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl fw-800 m-0">
                  <span style={{ color: '#1B3A5C' }}>CARGO</span><span style={{ color: '#E8722A' }}>EXPRESS</span>
                  <span className="text-tertiary fw-400 text-sm ml-8">PH</span>
                </h1>
                <p className="text-xs text-secondary m-0">Cargo Delivery & Logistics</p>
              </div>
            </div>
            <div className="print-report-meta">
              <h2 className="text-lg fw-700 m-0 mb-4" style={{ color: '#0F172A' }}>
                {period === 'custom' ? 'Custom Period Report' : `${period.charAt(0).toUpperCase() + period.slice(1)} Report`}
              </h2>
              <p className="text-secondary m-0" style={{ fontSize: '0.8rem' }}>{data.periodLabel}</p>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '2px 0 0 0' }}>Generated: {formatDateTime(data.generatedAt)}</p>
            </div>
          </div>

          {/* No Data */}
          {!hasData && (
            <EmptyState
              icon={FileText}
              title="No Orders Found"
              description={`No orders found for the selected period: ${data.periodLabel}`}
            />
          )}

          {hasData && (
            <>
              {/* ── Summary Cards ── */}
              <div className="grid grid-4 report-summary-cards mb-20 mt-16">
                {[
                  { label: 'Total Orders', value: s.totalOrders, icon: Package, gradient: 'linear-gradient(135deg, var(--primary), var(--primary-light))', prefix: '', decimals: 0 },
                  { label: 'Delivered', value: s.deliveredCount, icon: CheckCircle, gradient: 'linear-gradient(135deg, #10B981, #34D399)', prefix: '', decimals: 0 },
                  { label: 'Total Revenue', value: s.totalRevenue, icon: DollarSign, gradient: 'linear-gradient(135deg, var(--accent), var(--accent-light))', prefix: '₱', decimals: 0 },
                  { label: 'Collected', value: s.totalCollected, icon: TrendingUp, gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', prefix: '₱', decimals: 0 },
                ].map((card, i) => (
                  <div key={i} className="stat-card stagger-item" style={{ background: card.gradient, animationDelay: `${i * 60}ms` }}>
                    <div className="stat-value">
                      <AnimatedCounter value={card.value} prefix={card.prefix} decimals={card.decimals} duration={1000} />
                    </div>
                    <div className="stat-label">{card.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Two Column: Status + Financial ── */}
              <div className="grid grid-2 mb-20">
                {/* Status Breakdown */}
                <div className="card stagger-item" style={{ animationDelay: '240ms' }}>
                  <div className="card-header">
                    <h3 className="flex items-center gap-8">
                      <Package size={18} className="text-primary" />
                      Order Status Breakdown
                    </h3>
                  </div>
                  <div className="card-body">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th className="text-center">Count</th>
                          <th className="text-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STATUS_ORDER.filter(st => data.statusBreakdown[st]).map(st => (
                          <tr key={st}>
                            <td data-label="Status"><StatusBadge status={st} /></td>
                            <td data-label="Count" className="text-center fw-600">{data.statusBreakdown[st]}</td>
                            <td data-label="Percentage" className="text-right text-secondary">
                              {s.totalOrders > 0 ? ((data.statusBreakdown[st] / s.totalOrders) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="card stagger-item" style={{ animationDelay: '300ms' }}>
                  <div className="card-header">
                    <h3 className="flex items-center gap-8">
                      <CreditCard size={18} className="text-primary" />
                      Financial Summary
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="report-financial-grid">
                      <div className="report-financial-item">
                        <span className="report-financial-label">Total Revenue</span>
                        <span className="report-financial-value">{formatCurrency(s.totalRevenue)}</span>
                      </div>
                      <div className="report-financial-item">
                        <span className="report-financial-label">Total Collected</span>
                        <span className="report-financial-value text-success">{formatCurrency(s.totalCollected)}</span>
                      </div>
                      <div className="report-financial-item">
                        <span className="report-financial-label">Outstanding Balance</span>
                        <span className="report-financial-value text-error">{formatCurrency(s.totalOutstanding)}</span>
                      </div>
                      <div className="report-financial-item">
                        <span className="report-financial-label">Total Weight Shipped</span>
                        <span className="report-financial-value">{formatWeight(s.totalWeight)}</span>
                      </div>
                    </div>

                    <div className="mt-16 mb-16" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div className="fw-700 text-secondary mb-12 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>Payment Methods</div>
                      {[
                        { label: 'Cash', count: s.cashCount, total: s.cashTotal, color: '#10B981' },
                        { label: 'GCash', count: s.gcashCount, total: s.gcashTotal, color: '#3B82F6' },
                        { label: 'Pay Later', count: s.paylaterCount, total: s.paylaterTotal, color: '#F59E0B' },
                      ].map((pm, i) => (
                        <div key={i} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border-light)' : 'none' }}>
                          <div className="flex items-center gap-8">
                            <div className="w-8 h-8 rounded-full" style={{ background: pm.color }} />
                            <span className="text-sm">{pm.label}</span>
                            <span className="badge text-secondary" style={{ background: 'var(--bg-secondary)', fontSize: '0.7rem' }}>{pm.count} orders</span>
                          </div>
                          <span className="fw-700 text-sm">{formatCurrency(pm.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Route Performance ── */}
              {data.routeBreakdown.length > 0 && (
                <div className="card stagger-item mb-20" style={{ animationDelay: '360ms' }}>
                  <div className="card-header">
                    <h3 className="flex items-center gap-8">
                      <MapPin size={18} className="text-primary" />
                      Route Performance
                    </h3>
                  </div>
                  <div className="card-body">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Route</th>
                            <th className="text-center">Orders</th>
                            <th className="text-right">Revenue</th>
                            <th className="text-right">Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.routeBreakdown.map((r, i) => (
                            <tr key={i}>
                              <td data-label="Route" className="fw-600">
                                <div className="flex items-center gap-6">
                                  <Truck size={14} className="text-primary flex-shrink-0" />
                                  {r.route}
                                </div>
                              </td>
                              <td data-label="Orders" className="text-center">{r.count}</td>
                              <td data-label="Revenue" className="text-right fw-600">{formatCurrency(r.revenue)}</td>
                              <td data-label="Weight" className="text-right text-secondary">{formatWeight(r.weight)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Detailed Order List ── */}
              <div className="card stagger-item mb-20" style={{ animationDelay: '420ms' }}>
                <div className="card-header flex justify-between items-center">
                  <h3 className="flex items-center gap-8">
                    <FileText size={18} className="text-primary" />
                    Detailed Order List
                  </h3>
                  <span className="badge text-primary" style={{ background: 'var(--primary-bg)' }}>
                    {data.orders.length} orders
                  </span>
                </div>
                <div className="card-body p-0">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="report-table report-table-striped">
                      <thead>
                        <tr>
                          <th>Tracking #</th>
                          <th>Customer</th>
                          <th>Route</th>
                          <th>Status</th>
                          <th className="text-right">Weight</th>
                          <th className="text-right">Amount</th>
                          <th>Payment</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.orders.map((order) => (
                          <tr key={order.id}>
                            <td data-label="Tracking #" className="fw-600 text-primary" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {order.tracking_number}
                            </td>
                            <td data-label="Customer">
                              <div className="fw-500" style={{ fontSize: '0.85rem' }}>{order.sender_name || order.profiles?.name || '—'}</div>
                            </td>
                            <td data-label="Route" className="text-secondary" style={{ fontSize: '0.8rem' }}>
                              {order.origin || '—'} → {order.destination || '—'}
                            </td>
                            <td data-label="Status"><StatusBadge status={order.status} /></td>
                            <td data-label="Weight" className="text-right" style={{ fontSize: '0.85rem' }}>
                              {formatWeight(parseFloat(order.actual_weight || order.package_weight || 0))}
                            </td>
                            <td data-label="Amount" className="text-right fw-600" style={{ fontSize: '0.85rem' }}>
                              {formatCurrency(parseFloat(order.shipping_cost || 0))}
                            </td>
                            <td data-label="Payment">
                              <span className="badge text-capitalize" style={{
                                background: order.payment_method === 'cash' ? '#ECFDF5' : order.payment_method === 'gcash' ? '#EFF6FF' : '#FFFBEB',
                                color: order.payment_method === 'cash' ? '#059669' : order.payment_method === 'gcash' ? '#2563EB' : '#D97706',
                                fontSize: '0.7rem'
                              }}>
                                {order.payment_method || '—'}
                              </span>
                            </td>
                            <td data-label="Date" className="text-secondary" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {formatDate(order.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── Print Footer ── */}
              <div className="print-report-footer">
                <div className="mt-24" style={{ borderTop: '2px solid #E2E8F0', paddingTop: 16 }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs fw-600" style={{ color: '#0F172A', margin: '0 0 2px 0' }}>CargoExpress PH</p>
                      <p className="text-tertiary m-0" style={{ fontSize: '0.65rem' }}>Cargo Delivery & Logistics Services</p>
                    </div>
                    <div className="text-right">
                      <p className="text-tertiary" style={{ fontSize: '0.65rem', margin: '0 0 2px 0' }}>This is a system-generated report.</p>
                      <p className="text-tertiary m-0" style={{ fontSize: '0.65rem' }}>Generated on {formatDateTime(data.generatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
