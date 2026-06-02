import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCustomers, withTimeout } from '../../lib/database';
import { SkeletonTableRow } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { Search, Users } from 'lucide-react';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  
  useEffect(() => { loadCustomers(); }, []);
  const loadCustomers = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await withTimeout(getCustomers());
      setCustomers(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };
  const filtered = customers.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-transition">
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.5rem' }}>Customers</h1>
        <span className="badge badge-info">{customers.length} total</span>
      </div>
      <div className="search-box" style={{ marginBottom: 16 }}>
        <Search size={16} className="search-icon" />
        <input aria-label="Search customers" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="card animate-fade-in">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Province</th><th>Joined</th></tr></thead>
              <tbody>
                {Array.from({ length: 5 }, (_, i) => <SkeletonTableRow key={i} cols={5} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? (
        <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary mt-md" onClick={loadCustomers}>Retry</button>
        </div>
      ) : (
        <div className="card animate-fade-in">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Province</th><th>Joined</th></tr></thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="stagger-item" style={{ animationDelay: `${i * 30}ms` }}>
                    <td data-label="Name"><Link to={`/admin/customers/${c.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{c.name}</Link></td>
                    <td data-label="Email" className="text-sm">{c.email}</td><td data-label="Phone" className="text-sm">{c.phone || '—'}</td>
                    <td data-label="Province" className="text-sm">{c.address_province || '—'}</td>
                    <td data-label="Joined" className="text-xs text-secondary">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                      <EmptyState
                        icon={Users}
                        title="No customers found"
                        description="Try adjusting your search criteria."
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
export default CustomersPage;
