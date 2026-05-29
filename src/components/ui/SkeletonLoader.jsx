import React from 'react';

/**
 * SkeletonText — Renders multiple skeleton text lines.
 * @param {number} lines - Number of skeleton lines (default 3)
 * @param {string} width - Width of the skeleton lines (default '100%')
 */
export const SkeletonText = ({ lines = 3, width = '100%' }) => (
  <div className="skeleton-text-group">
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className="skeleton skeleton-text"
        style={{
          width: i === lines - 1 && lines > 1 ? '60%' : width,
          animationDelay: `${i * 80}ms`,
        }}
      />
    ))}
  </div>
);

/**
 * SkeletonAvatar — Renders a circular skeleton avatar.
 * @param {number} size - Diameter in pixels (default 40)
 */
export const SkeletonAvatar = ({ size = 40 }) => (
  <div
    className="skeleton skeleton-avatar"
    style={{ width: size, height: size }}
  />
);

/**
 * SkeletonCard — Full card skeleton with avatar, text lines, and action area.
 */
export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-card-header">
      <SkeletonAvatar size={44} />
      <div className="skeleton-card-header-text">
        <div className="skeleton skeleton-text" style={{ width: '55%' }} />
        <div className="skeleton skeleton-text" style={{ width: '35%' }} />
      </div>
    </div>
    <div className="skeleton-card-body">
      <SkeletonText lines={3} />
    </div>
    <div className="skeleton-card-actions">
      <div className="skeleton skeleton-button" style={{ width: '80px' }} />
      <div className="skeleton skeleton-button" style={{ width: '100px' }} />
    </div>
  </div>
);

/**
 * SkeletonTableRow — Renders a table row of skeleton cells.
 * @param {number} cols - Number of columns (default 5)
 */
export const SkeletonTableRow = ({ cols = 5 }) => (
  <tr className="skeleton-table-row">
    {Array.from({ length: cols }, (_, i) => (
      <td key={i} className="skeleton-table-cell">
        <div
          className="skeleton skeleton-text"
          style={{
            width: `${60 + Math.sin(i * 1.8) * 25}%`,
            animationDelay: `${i * 60}ms`,
          }}
        />
      </td>
    ))}
  </tr>
);

/**
 * SkeletonStatCard — Renders a stat card skeleton for dashboard widgets.
 */
export const SkeletonStatCard = () => (
  <div className="skeleton-stat-card">
    <div className="skeleton-stat-card-header">
      <div className="skeleton skeleton-text" style={{ width: '50%' }} />
      <div className="skeleton skeleton-icon" />
    </div>
    <div className="skeleton skeleton-text skeleton-stat-value" style={{ width: '40%' }} />
    <div className="skeleton skeleton-text" style={{ width: '65%' }} />
  </div>
);

/**
 * SkeletonOrderCard — Renders an order card skeleton.
 */
export const SkeletonOrderCard = () => (
  <div className="skeleton-order-card">
    <div className="skeleton-order-card-top">
      <div className="skeleton skeleton-badge" style={{ width: '90px' }} />
      <div className="skeleton skeleton-badge" style={{ width: '70px' }} />
    </div>
    <div className="skeleton-order-card-body">
      <div className="skeleton skeleton-text" style={{ width: '75%' }} />
      <div className="skeleton skeleton-text" style={{ width: '50%' }} />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
    </div>
    <div className="skeleton-order-card-footer">
      <div className="skeleton skeleton-text" style={{ width: '30%' }} />
      <div className="skeleton skeleton-button" style={{ width: '100px' }} />
    </div>
  </div>
);

const SkeletonLoader = {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
  TableRow: SkeletonTableRow,
  StatCard: SkeletonStatCard,
  OrderCard: SkeletonOrderCard,
};

export default SkeletonLoader;
