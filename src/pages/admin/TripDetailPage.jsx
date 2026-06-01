import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTripById, updateTrip } from '../../lib/database';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonText } from '../../components/ui/SkeletonLoader';
import { ArrowLeft, Play, Flag, CheckCircle, XCircle, Loader } from 'lucide-react';
import CapacityTracker from '../../components/ui/CapacityTracker';

const TripDetailPage = () => {
  const { id } = useParams(); const navigate = useNavigate();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [confirmAction, setConfirmAction] = useState(null); // { status, title, message, variant }

  useEffect(() => {
    let isMounted = true;
    load(isMounted);
    return () => { isMounted = false; };
  }, [id]);

  const load = async (isMounted = true) => {
    setError(null);
    setLoading(true);
    try {
      const result = await getTripById(id);
      if (isMounted) setData(result);
    } catch(e) {
      setError(e.message || 'Failed to load trip details.');
      if (isMounted) setError(e.message || 'Failed to load trip.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleStatus = async (status) => {
    setSaving(true); setMsg({ text: '', type: 'success' });
    try { await updateTrip(id, { status }); await load(); setMsg({ text: `Trip updated to ${status}`, type: 'success' }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); }
    catch(e) { setMsg({ text: e.message, type: 'error' }); } finally { setSaving(false); setConfirmAction(null); }
  };

  const openConfirm = (status, title, message, variant = 'warning') => {
    setConfirmAction({ status, title, message, variant });
  };

  if (loading) return (
    <div className="page-transition">
      <div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: 16 }} />
      <div className="skeleton skeleton-text" style={{ width: '200px', height: 28, marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '250px', marginBottom: 20 }} />
      <div className="card" style={{ marginBottom: 16 }}><div className="card-body"><SkeletonText lines={2} /></div></div>
      <div className="card" style={{ marginBottom: 16 }}><div className="card-body"><SkeletonText lines={3} /></div></div>
    </div>
  );
  if (error) return (
    <div className="page-transition">
      <div className="card text-center" style={{ padding: 40, color: '#EF4444' }}>
        <h3>Error Loading Trip</h3>
        <p style={{ margin: '8px 0 20px' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => load()}>Retry</button>
      </div>
    </div>
  );
  if (!data) return <div className="empty-state"><h3>Trip not found</h3></div>;
  const { trip, orders, current_weight } = data;
  const capPct = trip.capacity > 0 ? Math.min(100, (current_weight / trip.capacity) * 100) : 0;

  return (
    <div className="page-transition">
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{marginBottom:16}}><ArrowLeft size={18}/> Back</button>
      <div className="flex items-center justify-between" style={{marginBottom:20}}>
        <div><h1 style={{fontWeight:800}}>{trip.trip_number}</h1><p className="text-sm text-secondary">{trip.origin} → {trip.destination}</p></div>
        <StatusBadge status={trip.status}/>
      </div>

      {/* Message Banner */}
      {msg.text && (
        <div className={`alert-banner ${msg.type === 'error' ? 'alert-banner-error' : 'alert-banner-success'}`}>
          {msg.text}
        </div>
      )}

      {/* Actions */}
      <div className="card stagger-item" style={{marginBottom:16, animationDelay: '60ms'}}><div className="card-body" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {trip.status==='scheduled' && <button className="btn btn-primary" onClick={()=>openConfirm('in_progress', 'Start Trip', `Start trip ${trip.trip_number}? This will mark it as in progress.`, 'info')} disabled={saving}><Play size={16}/> Start Trip</button>}
        {trip.status==='in_progress' && <button className="btn btn-success" onClick={()=>openConfirm('arrived', 'Mark Arrived', `Mark trip ${trip.trip_number} as arrived at destination?`, 'success')} disabled={saving}><Flag size={16}/> Mark Arrived</button>}
        {trip.status==='arrived' && <button className="btn btn-primary" onClick={()=>openConfirm('completed', 'Complete Trip', `Complete trip ${trip.trip_number}? All orders should be delivered.`, 'success')} disabled={saving}><CheckCircle size={16}/> Complete</button>}
        {!['completed','cancelled'].includes(trip.status) && <button className="btn btn-danger btn-sm" onClick={()=>openConfirm('cancelled', 'Cancel Trip', `Cancel trip ${trip.trip_number}? This action cannot be undone.`, 'danger')} disabled={saving}><XCircle size={16}/> Cancel</button>}
        {saving && <Loader size={18} className="animate-spin"/>}
      </div></div>

      {/* Capacity */}
      <div className="card stagger-item" style={{marginBottom:16, animationDelay: '120ms'}}>
        <div className="card-body">
          <CapacityTracker 
            currentWeight={current_weight} 
            maxCapacity={trip.capacity} 
            tripNumber={trip.trip_number} 
          />
        </div>
      </div>

      {/* Orders */}
      <div className="card stagger-item" style={{ animationDelay: '180ms' }}>
        <div className="card-header"><h3>Assigned Orders ({orders.length})</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Tracking</th><th>Sender</th><th>Receiver</th><th>Weight</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}><td data-label="Tracking" style={{fontWeight:600}}>{o.tracking_number}</td><td data-label="Sender">{o.sender_name}</td><td data-label="Receiver">{o.receiver_name}</td>
                <td data-label="Weight">{o.actual_weight||o.package_weight} kg</td><td data-label="Status"><StatusBadge status={o.status} size="sm"/></td></tr>
              ))}
              {orders.length===0&&<tr><td colSpan={5} className="text-center text-secondary" style={{padding:30}}>No orders assigned</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleStatus(confirmAction.status)}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant={confirmAction?.variant || 'warning'}
        loading={saving}
      />
    </div>
  );
};
export default TripDetailPage;
