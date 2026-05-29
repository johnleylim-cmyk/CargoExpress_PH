import { STATUS_TIMELINE } from '../../constants/status';
import { Check, Package, ClipboardCheck, Truck, Building2, Bike, PartyPopper } from 'lucide-react';

const STEP_ICONS = {
  'Pending': ClipboardCheck,
  'Assigned': Package,
  'Picked Up': Package,
  'In Transit': Truck,
  'Arrived at Hub': Building2,
  'Out for Delivery': Bike,
  'Delivered': PartyPopper,
};

const TrackingTimeline = ({ currentStatus }) => {
  const currentIdx = STATUS_TIMELINE.indexOf(currentStatus);
  const isCancelled = currentStatus === 'Cancelled';

  return (
    <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 16, paddingTop: 8 }}>
      <div style={{
        display: 'flex', minWidth: 600, alignItems: 'flex-start',
        justifyContent: 'space-between', position: 'relative',
      }}>
        {STATUS_TIMELINE.map((status, index) => {
          const isCompleted = index < currentIdx;
          const isActive = index === currentIdx;
          const StepIcon = STEP_ICONS[status] || Package;

          let color = 'var(--text-tertiary)';
          if (isCancelled) color = 'var(--error)';
          else if (isCompleted) color = 'var(--success)';
          else if (isActive) color = 'var(--primary)';

          return (
            <div key={status} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              flex: 1, position: 'relative',
            }}>
              {/* Connecting Line */}
              {index < STATUS_TIMELINE.length - 1 && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  width: '100%',
                  height: 3,
                  background: isCancelled ? 'var(--error-bg)' : (isCompleted ? 'var(--success)' : 'var(--border)'),
                  zIndex: 1,
                  transition: 'background 0.5s ease',
                }} />
              )}

              {/* Node Circle */}
              <div style={{
                width: isActive ? 34 : 30,
                height: isActive ? 34 : 30,
                borderRadius: '50%',
                background: (isCompleted || isActive) ? color : 'var(--border-light)',
                border: (!isCompleted && !isActive) ? '2px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (isCompleted || isActive) ? 'white' : 'var(--text-tertiary)',
                zIndex: 2,
                boxShadow: isActive ? `0 0 0 4px ${isCancelled ? 'var(--error-glow)' : 'var(--primary-glow)'}` : 'none',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: 10,
                animation: isActive && !isCancelled ? 'breathe 2s ease-in-out infinite' : 'none',
              }}>
                {isCompleted ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <StepIcon size={isActive ? 16 : 13} strokeWidth={isActive ? 2.5 : 2} />
                )}
              </div>

              {/* Label */}
              <div style={{
                color: color,
                fontWeight: isActive ? 800 : isCompleted ? 600 : 500,
                fontSize: isActive ? '0.8125rem' : '0.75rem',
                textAlign: 'center',
                lineHeight: 1.2,
                maxWidth: 80,
                transition: 'all 0.3s ease',
              }}>
                {status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackingTimeline;
