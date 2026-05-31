import { useState, useEffect } from 'react';
import { getContactInquiries, updateContactInquiry } from '../../lib/database';
import { SkeletonTableRow } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import {
  Mail, Phone, Clock, CheckCircle, Eye,
  Loader, MessageSquare, AlertCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  new: { label: 'New', className: 'badge-warning' },
  read: { label: 'Read', className: 'badge-info' },
  resolved: { label: 'Resolved', className: 'badge-success' },
};

const ContactInquiriesPage = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadInquiries(); }, []);

  const loadInquiries = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getContactInquiries();
      setInquiries(data);
    } catch (e) {
      setError(e.message || 'Failed to load contact inquiries.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id);
    try {
      await updateContactInquiry(id, { status: newStatus });
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(prev => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleView = (inquiry) => {
    setSelectedInquiry(inquiry);
    if (inquiry.status === 'new') {
      handleStatusChange(inquiry.id, 'read');
    }
  };

  const filtered = filter === 'all'
    ? inquiries
    : inquiries.filter(i => i.status === filter);

  const newCount = inquiries.filter(i => i.status === 'new').length;

  if (error && !loading && inquiries.length === 0) {
    return (
      <div className="page-transition">
        <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
          <AlertCircle size={32} style={{ marginBottom: 8 }} />
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-md" onClick={loadInquiries}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={24} color="var(--primary)" />
            Contact Inquiries
            {newCount > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                {newCount} new
              </span>
            )}
          </h1>
          <p className="text-secondary text-sm">Messages from the public contact form</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadInquiries} disabled={loading}>
          {loading ? <Loader size={14} className="animate-spin" /> : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'new', 'read', 'resolved'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f === 'all' ? `All (${inquiries.length})` : `${f} (${inquiries.filter(i => i.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => <SkeletonTableRow key={i} cols={6} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40 }}>
                    <EmptyState
                      icon={Mail}
                      title="No Inquiries"
                      description={filter !== 'all' ? `No ${filter} inquiries found.` : 'No contact inquiries have been submitted yet.'}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(inq => {
                  const cfg = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
                  return (
                    <tr
                      key={inq.id}
                      style={{
                        cursor: 'pointer',
                        background: inq.status === 'new' ? 'rgba(245, 158, 11, 0.04)' : undefined,
                      }}
                      onClick={() => handleView(inq)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="sidebar-user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>
                            {(inq.name || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: inq.status === 'new' ? 700 : 500 }}>
                            {inq.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-sm text-secondary">
                        {inq.phone || '—'}
                      </td>
                      <td>
                        <div
                          className="text-sm"
                          style={{
                            maxWidth: 280,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: inq.status === 'new' ? 600 : 400,
                          }}
                        >
                          {inq.message}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${cfg.className}`}>{cfg.label}</span>
                      </td>
                      <td className="text-sm text-secondary">
                        {new Date(inq.created_at).toLocaleDateString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button
                            className="btn-icon btn-ghost"
                            title="View"
                            onClick={() => handleView(inq)}
                          >
                            <Eye size={16} />
                          </button>
                          {inq.status !== 'resolved' && (
                            <button
                              className="btn-icon btn-ghost"
                              title="Mark as Resolved"
                              disabled={updating === inq.id}
                              onClick={() => handleStatusChange(inq.id, 'resolved')}
                            >
                              {updating === inq.id
                                ? <Loader size={14} className="animate-spin" />
                                : <CheckCircle size={16} color="#10B981" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedInquiry && (
        <div className="modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} />
                Inquiry Details
              </h3>
              <button className="btn-icon btn-ghost" onClick={() => setSelectedInquiry(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{
                background: '#F8FAFC', borderRadius: 10, padding: 16, marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div className="sidebar-user-avatar" style={{ width: 44, height: 44, fontSize: '1rem', flexShrink: 0 }}>
                  {(selectedInquiry.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedInquiry.name}</div>
                  {selectedInquiry.phone && (
                    <div className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Phone size={12} /> {selectedInquiry.phone}
                    </div>
                  )}
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className={`badge ${(STATUS_CONFIG[selectedInquiry.status] || STATUS_CONFIG.new).className}`}>
                    {(STATUS_CONFIG[selectedInquiry.status] || STATUS_CONFIG.new).label}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="text-xs text-tertiary font-bold" style={{ marginBottom: 6, textTransform: 'uppercase' }}>
                  Message
                </div>
                <div style={{
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
                  padding: 16, fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-wrap',
                }}>
                  {selectedInquiry.message}
                </div>
              </div>

              <div className="text-xs text-tertiary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                Submitted {new Date(selectedInquiry.created_at).toLocaleString('en-PH', {
                  month: 'long', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })}
              </div>
            </div>
            <div className="modal-footer">
              {selectedInquiry.status !== 'resolved' ? (
                <button
                  className="btn btn-primary"
                  onClick={() => { handleStatusChange(selectedInquiry.id, 'resolved'); }}
                  disabled={updating === selectedInquiry.id}
                >
                  {updating === selectedInquiry.id
                    ? <Loader size={16} className="animate-spin" />
                    : <CheckCircle size={16} />}
                  Mark as Resolved
                </button>
              ) : (
                <span className="text-sm text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} color="#10B981" /> Resolved
                </span>
              )}
              <button className="btn btn-outline" onClick={() => setSelectedInquiry(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInquiriesPage;
