import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  className?: string;
  threshold?: number;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ 
  className, 
  threshold = 20 // Show as soon as user scrolls even a little
}) => {
  const { isVisible, scrollToTop } = useScrollToTop({ threshold });

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full shadow-lg",
        "bg-gradient-to-r from-blue-500 to-blue-600",
        "hover:from-blue-600 hover:to-blue-700",
        "transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-4",
        className
      )}
      aria-label="Scroll to top"
    >
      <ChevronUp className="h-5 w-5 text-white" />
    </Button>
  );
};

export default ScrollToTop;