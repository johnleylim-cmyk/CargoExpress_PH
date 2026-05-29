import { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, withTimeout } from '../../lib/database';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { Plus, Trash2, Megaphone, Loader } from 'lucide-react';

const AnnouncementsPage = () => {
  const [items, setItems] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false); 
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [deleteTarget, setDeleteTarget] = useState(null); // id to delete
  const [deleting, setDeleting] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => { 
    setLoading(true);
    setError(null);
    try { 
      const data = await withTimeout(getAnnouncements());
      setItems(data || []); 
    } catch(e) {
      setError(e.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    } 
  };

  const handleCreate = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    setCreateError('');
    try { 
      await withTimeout(createAnnouncement(form)); 
      setForm({title:'',content:''}); 
      setShowForm(false); 
      await load(); 
    } catch(e) {
      setCreateError(e.message || 'Failed to create announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteAnnouncement(deleteTarget); setDeleteTarget(null); await load(); } catch(e){ setError(e.message || 'Failed to delete.'); } finally { setDeleting(false); }
  };

  return (
    <div className="page-transition">
      <div className="flex items-center justify-between" style={{marginBottom:24}}>
        <h1 style={{fontWeight:800,fontSize:'1.5rem'}}>Announcements</h1>
        <button className="btn btn-primary" onClick={()=>setShowForm(!showForm)}><Plus size={16}/> New</button>
      </div>
      {showForm && (
        <div className="card animate-scale-in" style={{marginBottom:16}}><div className="card-body">
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Content</label><textarea className="form-textarea" value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))}/></div>
          {createError && (
            <div className="alert-banner alert-banner-error" style={{ marginBottom: 12 }}>
              <span>⚠</span> {createError}
            </div>
          )}
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving?<Loader size={16} className="animate-spin"/>:'Publish'}</button>
            <button className="btn btn-ghost" onClick={()=>{setShowForm(false);setCreateError('');}}>Cancel</button>
          </div>
        </div></div>
      )}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary mt-md" onClick={load}>Retry</button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Create your first announcement to keep customers informed."
          actionLabel="Create Announcement"
          onAction={() => setShowForm(true)}
        />
      ) : (
        items.map((a, i) => (
          <div key={a.id} className="card stagger-item" style={{marginBottom:12, animationDelay: `${i * 60}ms`}}>
            <div className="card-body" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <h3 style={{fontWeight:700}}>{a.title}</h3>
                <button className="btn btn-ghost btn-sm" onClick={()=>setDeleteTarget(a.id)}><Trash2 size={14} color="#EF4444"/></button>
              </div>
              <p className="text-sm text-secondary">{a.content}</p>
              <div className="text-xs text-tertiary" style={{marginTop:8}}>by {a.profiles?.name||'Admin'} • {new Date(a.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        ))
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
export default AnnouncementsPage;
