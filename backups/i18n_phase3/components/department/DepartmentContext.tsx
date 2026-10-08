
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Department } from '@/types';

interface DepartmentContextType {
  activeDepartment: Department | null;
  isMultiDepartment: boolean;
  departmentCount: number;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const useDepartmentContext = () => {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartmentContext must be used within a DepartmentProvider');
  }
  return context;
};

interface DepartmentProviderProps {
  children: ReactNode;
}

export const DepartmentProvider: React.FC<DepartmentProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();

  const activeDepartment = currentUser?.activeDepartment || null;
  const isMultiDepartment = (currentUser?.departments?.length || 0) > 1;
  const departmentCount = currentUser?.departments?.length || 0;

  return (
    <DepartmentContext.Provider
      value={{
        activeDepartment,
        isMultiDepartment,
        departmentCount,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};
