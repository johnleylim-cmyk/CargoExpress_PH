import { useRef, useEffect, useState } from 'react';

/**
 * ScrollReveal — Lightweight scroll-triggered animation wrapper.
 * Uses IntersectionObserver to add the 'revealed' class when the element
 * scrolls into the viewport, triggering the CSS transition defined in index.css.
 *
 * @param {string} className - Additional classes to apply.
 * @param {number} delay - Delay index (0-4) for staggered reveals.
 * @param {number} threshold - Intersection threshold (0-1). Default 0.15.
 * @param {boolean} once - If true (default), only animate once.
 * @param {string} as - HTML element type. Default 'div'.
 * @param {object} style - Inline styles.
 */
const ScrollReveal = ({
  children,
  className = '',
  delay = 0,
  threshold = 0.15,
  once = true,
  as: Tag = 'div',
  style,
  ...props
}) => {
  const ref = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver is not supported, just show immediately
    if (!('IntersectionObserver' in window)) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsRevealed(false);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const delayClass = delay > 0 ? ` reveal-delay-${Math.min(delay, 4)}` : '';

  return (
    <Tag
      ref={ref}
      className={`reveal${isRevealed ? ' revealed' : ''}${delayClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default ScrollReveal;
