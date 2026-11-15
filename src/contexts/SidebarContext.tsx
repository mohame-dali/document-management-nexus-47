
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarContextType {
  isOpen: boolean;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsOpen((prev) => !prev);
    }
  }, [isMobile]);

  const open = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(true);
    } else {
      setIsOpen(true);
    }
  }, [isMobile]);

  const close = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    } else {
      setIsOpen(false);
    }
  }, [isMobile]);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isMobileOpen,
        setIsMobileOpen,
        toggle,
        open,
        close,
        openMobile,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
