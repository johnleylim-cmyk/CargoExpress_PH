import React from 'react';

/**
 * PageTransition — Wrapper component for smooth page entrance animations.
 *
 * @param {ReactNode} children  - Content to animate in
 * @param {string}    className - Additional CSS classes
 * @param {number}    delay     - Animation delay in milliseconds (default 0)
 */
const PageTransition = ({ children, className = '', delay = 0 }) => (
  <div
    className={`page-transition ${className}`}
    style={delay ? { animationDelay: `${delay}ms` } : undefined}
  >
    {children}
  </div>
);

/**
 * StaggerItem — Child wrapper for staggered entrance animations.
 * Each item animates in sequence based on its index.
 *
 * @param {ReactNode} children  - Content to animate in
 * @param {number}    index     - Position index for stagger delay calculation
 * @param {string}    className - Additional CSS classes
 */
export const StaggerItem = ({ children, index = 0, className = '' }) => (
  <div
    className={`stagger-item ${className}`}
    style={{ animationDelay: `${index * 60}ms` }}
  >
    {children}
  </div>
);

export default PageTransition;
