import { useState, useEffect, useCallback } from 'react';

interface UseScrollToTopOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
}

export const useScrollToTop = ({ 
  threshold = 100, 
  behavior = 'smooth' 
}: UseScrollToTopOptions = {}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button immediately when user starts scrolling
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsVisible(scrollTop > threshold);
    };

    // Check initial scroll position
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior,
    });
  }, [behavior]);

  return { isVisible, scrollToTop };
};