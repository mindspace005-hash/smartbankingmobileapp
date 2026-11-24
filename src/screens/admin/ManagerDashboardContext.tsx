import React, { createContext, useContext } from 'react';
import {
  CollectionRecord,
  ManagerBranchId,
  ManagerCommandPayload,
} from '../../types';

export interface ManagerDashboardContextValue {
  selectedBranchId: ManagerBranchId;
  setSelectedBranchId: (branchId: ManagerBranchId) => void;
  refreshing: boolean;
  reloadData: () => Promise<void>;
  data: ManagerCommandPayload | null;
  pendingApprovalsCount: number;
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

const ManagerDashboardContext = createContext<ManagerDashboardContextValue | undefined>(undefined);

export const ManagerDashboardProvider: React.FC<{
  value: ManagerDashboardContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <ManagerDashboardContext.Provider value={value}>
    {children}
  </ManagerDashboardContext.Provider>
);

export const useManagerDashboard = (): ManagerDashboardContextValue => {
  const ctx = useContext(ManagerDashboardContext);
  if (!ctx) {
    throw new Error('useManagerDashboard must be used within ManagerDashboardProvider');
  }
  return ctx;
};

export const formatCompactInr = (value: number): string => {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
};
