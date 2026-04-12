import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal wrapper that uses Intersection Observer to trigger entrance animations.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component to reveal
 * @param {string} props.animation - CSS animation class (default: 'fade-up')
 * @param {number} props.delay - Animation delay in ms
 * @param {number} props.threshold - Intersection threshold (0 to 1)
 */
const ScrollReveal = ({ 
  children, 
  animation = 'fade-up', 
  delay = 0, 
  threshold = 0.1,
  className = "" 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(domRef.current);
        }
      });
    }, { threshold });

    const currentRef = domRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return (
    <div
      ref={domRef}
      className={`reveal-wrapper ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{ 
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className={`reveal-content ${isVisible ? animation : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default ScrollReveal;
