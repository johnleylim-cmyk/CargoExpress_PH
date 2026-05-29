import { Truck } from 'lucide-react';

const CapacityTracker = ({ currentWeight = 0, maxCapacity = 1000, tripNumber = '', showLabel = true }) => {
  const percent = maxCapacity > 0 ? (currentWeight / maxCapacity) * 100 : 0;
  // Ensure the progress bar doesn't overflow visually, but keep the actual percent for text display
  const barPercent = Math.min(100, percent);
  const remaining = Math.max(0, maxCapacity - currentWeight);

  let status, statusColor, barColor;
  
  if (percent >= 91) {
    status = 'CRITICAL'; 
    statusColor = '#EF4444'; // Red
    barColor = '#EF4444';
  } else if (percent >= 76) {
    status = 'HIGH'; 
    statusColor = '#F97316'; // Orange
    barColor = '#F97316';
  } else if (percent >= 51) {
    status = 'MEDIUM'; 
    statusColor = '#F59E0B'; // Yellow
    barColor = '#F59E0B';
  } else {
    status = 'SAFE'; 
    statusColor = '#10B981'; // Green
    barColor = '#10B981';
  }

  return (
    <div className="capacity-tracker">
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Truck size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
              Van Capacity
            </span>
            {tripNumber && (
              <span style={{
                fontSize: '0.6875rem', color: 'var(--text-tertiary)',
                background: 'var(--bg-secondary)', padding: '2px 8px',
                borderRadius: 'var(--radius-full)', fontWeight: 600,
              }}>
                {tripNumber}
              </span>
            )}
          </div>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700, padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
            color: statusColor,
            letterSpacing: '0.05em',
          }}>
            {status}
          </span>
        </div>
      )}

      <div className="capacity-bar" style={{ height: 14, borderRadius: 7, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div
          className="capacity-fill"
          style={{ width: `${barPercent}%`, height: '100%', background: barColor, transition: 'width 0.5s ease-out, background-color 0.5s ease-out' }}
        />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 8,
        fontSize: '0.75rem', color: 'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{currentWeight.toFixed(1)} kg loaded</span>
          <span>{percent.toFixed(1)}% Usage</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{maxCapacity} kg max</span>
          <span>{remaining.toFixed(1)} kg remaining</span>
        </div>
      </div>
    </div>
  );
};

export default CapacityTracker;
