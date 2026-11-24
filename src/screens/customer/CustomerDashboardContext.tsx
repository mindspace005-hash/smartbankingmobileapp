import React, { createContext, useContext } from 'react';
import {
  CustomerFullPortalPayload,
  CustomerPortalAccountItem,
  CustomerServiceRequestType,
} from '../../types';

export interface ServiceModalPrefill {
  type: CustomerServiceRequestType;
  title?: string;
  amount?: string;
  subtitle?: string;
}

export interface CustomerDashboardContextValue {
  data: CustomerFullPortalPayload | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reloadData: () => Promise<void>;
  hideBalances: boolean;
  toggleHideBalances: () => void;
  maskInr: (amount: number) => string;
  openPassbook: (productType: string, accountId: number) => Promise<void>;
  openFdCertificate: (fd: CustomerPortalAccountItem) => void;
  openLoanSchedule: (loan: CustomerPortalAccountItem) => Promise<void>;
  serviceModalPrefill: ServiceModalPrefill | null;
  triggerServiceModal: (prefill: ServiceModalPrefill) => void;
  clearServiceModalPrefill: () => void;
}

const CustomerDashboardContext = createContext<CustomerDashboardContextValue | undefined>(undefined);

export const CustomerDashboardProvider: React.FC<{
  value: CustomerDashboardContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <CustomerDashboardContext.Provider value={value}>
    {children}
  </CustomerDashboardContext.Provider>
);

export const useCustomerDashboard = (): CustomerDashboardContextValue => {
  const ctx = useContext(CustomerDashboardContext);
  if (!ctx) {
    throw new Error('useCustomerDashboard must be used within CustomerDashboardProvider');
  }
  return ctx;
};
