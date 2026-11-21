import React, { createContext, useContext } from 'react';
import { CollectionRecord, PigmiAccount } from '../../types';

export interface AgentDashboardContextValue {
  myAssignedAccounts: PigmiAccount[];
  todayCollections: CollectionRecord[];
  pendingSyncCount: number;
  isSyncing: boolean;
  handleSyncNow: () => Promise<void>;
  handleSelectCustomer: (acc: PigmiAccount) => Promise<void>;
  openAccountPassbook: (acc: PigmiAccount) => Promise<void>;
  openCreateCustomer: () => void;
  onSelectReceipt: (rec: CollectionRecord) => void;
  isAccCollectedToday: (acc: PigmiAccount) => boolean;
}

const AgentDashboardContext = createContext<AgentDashboardContextValue | undefined>(undefined);

export const AgentDashboardProvider = AgentDashboardContext.Provider;

export const useAgentDashboard = () => {
  const ctx = useContext(AgentDashboardContext);
  if (!ctx) {
    throw new Error('useAgentDashboard must be used within AgentDashboardProvider');
  }
  return ctx;
};
