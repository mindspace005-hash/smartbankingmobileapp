import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { 
  UserRole, User, CollectionRecord, PigmiAccount, AgentSummary,
  DashboardSummary, RemittanceStatus, PassbookStatement, CollectionReport, CommissionReport,
  PassbookTransaction, CollectionReportItem, PigmyScheme, DropdownOptions, AgentCustomerRequest,
  AgentCustomer, ProductType, CustomerDoorstepProfile,
  ManagerBranchId, ManagerCommandPayload, ManagerApprovalItem, ManagerApprovalStatus,
  ManagerAgentControlItem, ManagerEodChecklistItem
} from '../types';
import { apiClient, setInMemoryAuthToken, registerUnauthorizedHandler } from '../config';
import {
  DEMO_USERS,
  DEMO_AGENTS,
  DEMO_PIGMI_ACCOUNTS,
  DEMO_AGENT_CUSTOMERS,
  DEMO_DOORSTEP_PROFILES,
  DEMO_CUSTOMER_PORTAL_DATA,
  DEMO_CUSTOMER_PASSBOOKS,
  DEMO_SCHEMES,
  DEMO_BRANCHES,
  DEMO_BRANCH_SEEDS,
  DEMO_MANAGER_APPROVALS,
  DEMO_MANAGER_AGENTS,
  DEMO_OVERDUE_LOANS,
  DEMO_MATURITY_ITEMS,
  buildInitialDemoCollections,
  DemoCustomerPassbook,
} from '../data/mockData';

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: 'AGENT',
};

interface AuthContextType {
  isAuthenticated: boolean;
  isDemoMode: boolean;
  currentRole: UserRole;
  currentUser: User;
  login: (username?: string, password?: string, role?: UserRole, credential?: any) => Promise<void>;
  loginDemo: (role: UserRole, customIdentifier?: string) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  accounts: PigmiAccount[];
  collections: CollectionRecord[];
  agents: AgentSummary[];
  agentCustomers: AgentCustomer[];
  managerApprovals: ManagerApprovalItem[];
  managerAgents: ManagerAgentControlItem[];
  fetchManagerCommandData: (branchId?: ManagerBranchId) => Promise<ManagerCommandPayload>;
  updateManagerApproval: (id: string, status: ManagerApprovalStatus, remarks?: string) => Promise<void>;
  toggleManagerAgentLock: (agentId: string) => Promise<void>;
  acceptManagerAgentRemittance: (agentId: string, amount: number) => Promise<void>;
  fetchAgentProfile: (agentId: string | number) => Promise<any>;
  fetchAgentAccounts: (agentId: string | number) => Promise<PigmiAccount[]>;
  fetchAgentCustomers: (agentId: string | number) => Promise<AgentCustomer[]>;
  addCollectionRecord: (
    accountId: string,
    amount: number,
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER',
    notes?: string
  ) => Promise<CollectionRecord>;
  lastCreatedReceipt: CollectionRecord | null;
  clearLastReceipt: () => void;

  // Agent & Report Endpoints
  getDashboardSummary: () => DashboardSummary;
  fetchDashboardSummary: (agentIdInput?: string | number) => Promise<DashboardSummary>;
  checkLockStatus: () => RemittanceStatus;
  createCustomer: (data: Partial<AgentCustomerRequest>) => Promise<any>;
  fetchPigmySchemes: () => Promise<PigmyScheme[]>;
  fetchDropdowns: () => Promise<DropdownOptions>;
  bulkSyncCollections: (items?: any[]) => Promise<any>;
  getPassbookStatement: (accountId: string, fromDate?: string, toDate?: string) => PassbookStatement;
  fetchPassbookStatement: (accountId: string, fromDate?: string, toDate?: string) => Promise<PassbookStatement>;
  getCollectionReport: (fromDate: string, toDate: string) => CollectionReport;
  fetchCollectionReport: (fromDate?: string, toDate?: string) => Promise<CollectionReport>;
  getCommissionReport: (fromDate: string, toDate: string) => CommissionReport;
  fetchCommissionReport: (fromDate?: string, toDate?: string) => Promise<CommissionReport>;
  fetchPigmyBookReport: (filter: 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH') => Promise<{
    totalCollection: number;
    dailyRecords: { date: string; customers: number; amount: number }[];
  }>;
  fetchAdminSummary: () => Promise<{
    totalBalance: number;
    todaysCollection: number;
    todaysReceiptsCount: number;
    activeAccountsCount: number;
    activeAgentsCount: number;
  } | null>;
  activateCustomerTempPin: (mobileNo: string, cifNo: string, newPin: string) => Promise<void>;
  fetchCustomerPortalOverview: () => Promise<{
    summary: {
      customerId: number;
      cifNo: string;
      customerName: string;
      mobileNo: string;
      branchName: string;
      totalSavingsAndDeposits: number;
      totalLoanOutstanding: number;
      counts: { pigmy: number; saving: number; rd: number; fd: number; loan: number };
    };
    accounts: {
      pigmyAccounts: any[];
      savingAccounts: any[];
      rdAccounts: any[];
      fdAccounts: any[];
      loanAccounts: any[];
    };
  }>;
  fetchCustomerAccountPassbook: (productType: string, accountId: number) => Promise<{
    productType: string;
    accountNo: string;
    currentBalance: number;
    transactions: {
      id: number;
      date: string;
      type: string;
      crAmount: number;
      drAmount: number;
      balance: number;
      narration: string;
      reference: string;
    }[];
  }>;
  authToken: string;
  isLoadingAccounts: boolean;
  refreshAgentData: () => Promise<void>;
  fetchCustomerDoorstepProfile: (customerId: string | number, hintAccount?: PigmiAccount) => Promise<CustomerDoorstepProfile>;
  collectMultiProduct: (params: {
    productType: ProductType;
    accountId: number | string;
    accountNo: string;
    oldAccountNo?: string;
    customerName: string;
    amount: number;
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER';
    remarks?: string;
    latitude?: string;
    longitude?: string;
  }) => Promise<CollectionRecord>;
}

const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

const parsePositiveId = (value?: string | number | null): number | null => {
  if (value === undefined || value === null) return null;
  const parsed = parseInt(String(value).replace(/^[a-z_]+/i, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('AGENT');
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);
  const [accounts, setAccounts] = useState<PigmiAccount[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentCustomers, setAgentCustomers] = useState<AgentCustomer[]>([]);
  const [lastCreatedReceipt, setLastCreatedReceipt] = useState<CollectionRecord | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [serverLockStatus, setServerLockStatus] = useState<RemittanceStatus | null>(null);
  const [serverDashboardSummary, setServerDashboardSummary] = useState<DashboardSummary | null>(null);

  // Shared In-Memory Demo Store (synchronized across Agent, Manager & Customer demos)
  const demoInitializedRef = useRef(false);
  const [demoProfiles, setDemoProfiles] = useState<Record<string, CustomerDoorstepProfile>>(() =>
    deepClone(DEMO_DOORSTEP_PROFILES)
  );
  const [demoPortalAccounts, setDemoPortalAccounts] = useState(() =>
    deepClone(DEMO_CUSTOMER_PORTAL_DATA.accounts)
  );
  const [demoPassbooks, setDemoPassbooks] = useState<Record<string, DemoCustomerPassbook>>(() =>
    deepClone(DEMO_CUSTOMER_PASSBOOKS)
  );
  const [managerApprovals, setManagerApprovals] = useState<ManagerApprovalItem[]>(() =>
    deepClone(DEMO_MANAGER_APPROVALS)
  );
  const [managerAgents, setManagerAgents] = useState<ManagerAgentControlItem[]>(() =>
    deepClone(DEMO_MANAGER_AGENTS)
  );
  const [managerRemittedCashByBranch, setManagerRemittedCashByBranch] = useState<Record<number, number>>({});

  const ensureDemoStoreInitialized = (forceReset = false) => {
    if (demoInitializedRef.current && !forceReset) return;
    demoInitializedRef.current = true;
    setAccounts(deepClone(DEMO_PIGMI_ACCOUNTS));
    setAgentCustomers(deepClone(DEMO_AGENT_CUSTOMERS));
    setAgents(deepClone(DEMO_AGENTS));
    setCollections(buildInitialDemoCollections());
    setDemoProfiles(deepClone(DEMO_DOORSTEP_PROFILES));
    setDemoPortalAccounts(deepClone(DEMO_CUSTOMER_PORTAL_DATA.accounts));
    setDemoPassbooks(deepClone(DEMO_CUSTOMER_PASSBOOKS));
    setManagerApprovals(deepClone(DEMO_MANAGER_APPROVALS));
    setManagerAgents(deepClone(DEMO_MANAGER_AGENTS));
    setManagerRemittedCashByBranch({});
    setServerLockStatus(null);
    setServerDashboardSummary(null);
  };

  const fetchLockStatus = async (agentIdInput?: string | number): Promise<RemittanceStatus | null> => {
    if (isDemoMode) {
      return {
        agentId: agentIdInput || currentUser.agentId || '2',
        collect_Pigmi: 1,
        is_pending: 0,
        status: 'ALLOWED',
        message: 'डेमो मोड सक्रिय — वसुलीसाठी एजंट अधिकृत आहे.',
        previousDaysCollectionDetails: [],
      };
    }
    const rawId = parsePositiveId(agentIdInput ?? currentUser.agentId ?? (await AsyncStorage.getItem('AGENT_ID')));
    if (!rawId) return null;
    try {
      const res = await apiClient.get(`/api/PigmyApp/CollectionStatus?agentId=` + rawId);
      if (res.data) {
        const data: RemittanceStatus = {
          agentId: res.data.agentId ?? rawId,
          collect_Pigmi: res.data.collect_Pigmi ?? (res.data.status === 'LOCKED' ? 0 : 1),
          is_pending: res.data.is_pending ?? (res.data.status === 'LOCKED' ? 1 : 0),
          status: res.data.status === 'LOCKED' ? 'LOCKED' : 'ALLOWED',
          message: res.data.message || (res.data.status === 'LOCKED' ? 'एजंट लॉक आहे. कृपया बँकेत रक्कम भरा.' : 'कमिशन व पिग्मी कलेक्शनसाठी एजंट अधिकृत आहे.'),
          previousDaysCollectionDetails: res.data.previousDaysCollectionDetails || []
        };
        setServerLockStatus(data);
        return data;
      }
    } catch (err: any) {
      console.warn('Failed to fetch remittance lock status from server:', err?.message);
    }
    return null;
  };

  const fetchAndReconcileTodaysCollections = async (agentIdInput: string | number): Promise<CollectionRecord[]> => {
    const rawAgentId = agentIdInput.toString().replace('agt_', '');
    
    // 1. Read phone memory (both historical synced and offline pending)
    let localHistory: CollectionRecord[] = [];
    let localPending: CollectionRecord[] = [];
    try {
      const historyRaw = await AsyncStorage.getItem('TODAYS_COLLECTIONS_HISTORY');
      const pendingRaw = await AsyncStorage.getItem('PENDING_COLLECTIONS');
      if (historyRaw) localHistory = JSON.parse(historyRaw);
      if (pendingRaw) localPending = JSON.parse(pendingRaw);
    } catch (e) {
      console.warn('Error reading local collections from memory:', e);
    }

    // 2. Fetch today's collections from Server API
    let serverCollections: CollectionRecord[] = [];
    try {
      const res = await apiClient.get(`/api/PigmyApp/CollectionReport?agentId=${rawAgentId}`);
      const data = res.data;
      const list = data?.collections || (Array.isArray(data) ? data : []);
      if (Array.isArray(list)) {
        serverCollections = list.map((c: any) => {
          const recNo = c.receiptNo || c.ReceiptNo || `RC-SRV-${c.collectionId}`;
          const rawDate = c.collectionDate || c.CollectionDate || c.date || c.Date || new Date();
          const recDate = new Date(rawDate);
          const dateStr = !isNaN(recDate.getTime()) 
            ? `${recDate.toLocaleDateString()} ${recDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : new Date().toLocaleDateString();
          
          const rawAccId = String(c.pigmyAccountId || c.PigmyAccountId || c.accountId || '').replace('acc_', '');
          const targetAcc = accounts.find(a => 
            a.id.replace('acc_', '') === rawAccId || 
            (c.accountNo && a.accountNumber === c.accountNo) ||
            (c.accountNo && a.oldAccountNo === c.accountNo)
          );
          const effectiveAccId = targetAcc?.id || (rawAccId ? `acc_${rawAccId}` : 'acc_12');
          return {
            id: `srv_${c.collectionId || recNo}`,
            transactionId: `srv_txn_${c.collectionId || recNo}`,
            syncReferenceId: recNo,
            receiptNo: recNo,
            accountId: effectiveAccId,
            accountNumber: c.accountNo || c.AccountNo || targetAcc?.accountNumber || '',
            oldAccountNo: targetAcc?.oldAccountNo || c.oldAccountNo || '',
            customerName: c.customerName || c.CustomerName || c.memberName || targetAcc?.customerName || '',
            agentId: `agt_${rawAgentId}`,
            agentName: currentUser.name || 'Agent',
            amount: Number(c.amount || c.CollectionAmount || 0),
            productType: 'PIGMY' as ProductType,
            productTitle: 'पिग्मी ठेव',
            paymentMode: 'CASH' as const,
            timestamp: dateStr,
            status: 'VERIFIED' as const,
            syncStatus: 'SYNCED' as const,
            notes: 'सर्व्हरवरील अधिकृत संकलन'
          };
        });
      }
    } catch (serverErr: any) {
      console.warn('Could not fetch server collections, using local memory only:', serverErr?.message);
    }

    // 3. Compare & Reconcile:
    const serverReceiptKeys = new Set<string>();
    for (const sc of serverCollections) {
      if (sc.receiptNo) serverReceiptKeys.add(sc.receiptNo.trim().toUpperCase());
      if (sc.syncReferenceId) serverReceiptKeys.add(sc.syncReferenceId.trim().toUpperCase());
    }

    // Identify pending items that are already confirmed on server
    const remainingPending: CollectionRecord[] = [];
    for (const p of localPending) {
      const pKey1 = (p.receiptNo || '').trim().toUpperCase();
      const pKey2 = (p.syncReferenceId || '').trim().toUpperCase();
      if ((pKey1 && serverReceiptKeys.has(pKey1)) || (pKey2 && serverReceiptKeys.has(pKey2))) {
        // Already synced to server
      } else {
        remainingPending.push(p);
      }
    }
    if (remainingPending.length !== localPending.length) {
      await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(remainingPending)).catch(() => {});
    }

    // Merge: Server collections (guaranteed SYNCED) + Local Pending (offline SYNC_PENDING) + Local History
    const seenMap = new Map<string, CollectionRecord>();

    for (const sc of serverCollections) {
      const key = (sc.receiptNo || sc.syncReferenceId || sc.id).trim().toUpperCase();
      seenMap.set(key, sc);
    }

    for (const pc of remainingPending) {
      const key = (pc.receiptNo || pc.syncReferenceId || pc.id).trim().toUpperCase();
      if (!seenMap.has(key)) {
        seenMap.set(key, pc);
      }
    }

    for (const hc of localHistory) {
      const key = (hc.receiptNo || hc.syncReferenceId || hc.id).trim().toUpperCase();
      if (!seenMap.has(key)) {
        seenMap.set(key, hc);
      }
    }

    const mergedCollections = Array.from(seenMap.values());

    setCollections(mergedCollections);
    await AsyncStorage.setItem('TODAYS_COLLECTIONS_HISTORY', JSON.stringify(mergedCollections)).catch(() => {});

    return mergedCollections;
  };
  const refreshAgentData = async () => {
    if (isDemoMode) return;
    const resolvedAgentId = parsePositiveId(currentUser.agentId || (await AsyncStorage.getItem('AGENT_ID')));
    if (!resolvedAgentId) return;
    const rawAgentId = String(resolvedAgentId);
    setIsLoadingAccounts(true);
    try {
      await Promise.allSettled([
        fetchAgentAccounts(rawAgentId),
        fetchAgentCustomers(rawAgentId),
        fetchLockStatus(rawAgentId),
        fetchDashboardSummary(rawAgentId),
        fetchAndReconcileTodaysCollections(rawAgentId)
      ]);
    } catch (e) {
      console.error('Error refreshing agent data', e);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchAgentProfile = async (agentIdInput: string | number): Promise<any> => {
    const rawId = agentIdInput.toString().replace('agt_', '');
    try {
      const res = await apiClient.get(`/api/PigmyAgents/${rawId}`);
      return res.data;
    } catch (error) {
      console.error('Error fetching PigmyAgent profile:', error);
      return null;
    }
  };

  const fetchAgentAccounts = async (agentIdInput: string | number): Promise<PigmiAccount[]> => {
    const rawId = agentIdInput.toString().replace('agt_', '');
    setIsLoadingAccounts(true);
    try {
      let response;
      try {
        response = await apiClient.get(`/api/PigmyAccounts/Agent/${rawId}`);
      } catch (primaryErr: any) {
        console.warn('GET /api/PigmyAccounts/Agent failed, attempting fallback to /api/PigmyApp/customers:', primaryErr?.message);
        response = await apiClient.get(`/api/PigmyApp/customers?agentId=${rawId}`);
      }
      const data = response.data;
      const apiAccounts = Array.isArray(data) ? data : (data.value || data.data || []);
      if (Array.isArray(apiAccounts)) {
        const mappedAccounts: PigmiAccount[] = apiAccounts.map((acc: any) => {
          const directCustId = acc.customerId || acc.customerID || acc.memberId || acc.MemberId || acc.member?.id || acc.member?.memberId || acc.member?.customerId || acc.member?.CustomerID;
          const directCif = (acc.cifNo || acc.CifNo || acc.cif || acc.Cif || acc.member?.cifNo || acc.member?.CifNo || '').toString().trim();

          return {
            id: `acc_${acc.pigmyAccountId || acc.pigmyAccountID || acc.accountId || Math.random()}`,
            customerId: directCustId,
            accountNumber: acc.accountNo || `PGM-${acc.pigmyAccountId || acc.pigmyAccountID}`,
            cifNo: directCif,
          oldAccountNo: (
            acc.oldAccountNo ?? 
            acc.OldAccountNo ?? 
            acc.oldNo ?? 
            acc.OldNo ?? 
            acc.oldAccNo ?? 
            acc.OldAccNo ?? 
            acc.oldAccountNumber ?? 
            acc.OldAccountNumber ?? 
            acc.manualAccountNo ?? 
            acc.ManualAccountNo ?? 
            acc.manualNo ?? 
            acc.ManualNo ?? 
            acc.oldPassbookNo ?? 
            acc.OldPassbookNo ?? 
            acc.passbookNo ?? 
            acc.PassbookNo ?? 
            acc.oldAccountID ??
            acc.OldAccountID ??
            acc.oldPigmyAccountID ??
            acc.OldPigmyAccountID ??
            acc.member?.oldNo ?? 
            acc.member?.OldNo ?? 
            acc.member?.oldAccountNo ?? 
            acc.member?.OldAccountNo ?? 
            ''
          ).toString().trim(),
          customerName: acc.member ? [acc.member.firstName || acc.member.FirstName, acc.member.middleName || acc.member.MiddleName, acc.member.lastName || acc.member.LastName].filter(Boolean).join(' ') : (acc.customerName || acc.CustomerName || acc.memberName || acc.MemberName || 'Unknown Customer'),
          customerPhone: acc.member?.mobileNo || acc.mobileNo || '',
          customerAddress: acc.member?.address || acc.address || '',
          agentId: `agt_${rawId}`,
          agentName: currentUser.name,
          dailyTargetAmount: acc.dailyTargetAmount || acc.dailyDepositAmount || 100,
          currentBalance: acc.currentBalance ?? acc.totalDepositedAmount ?? acc.openingBalance ?? 0,
          totalCollected: acc.totalDepositedAmount || 0,
          startDate: acc.openingDate || new Date().toISOString().split('T')[0],
          maturityDate: acc.maturityDate || '2027-12-31',
          interestRatePercentage: acc.interestRate || 7.5,
          status: acc.status === 'Active' ? 'ACTIVE' : 'CLOSED',
        };
      });
        const finalAccounts = mappedAccounts.length > 0 ? mappedAccounts : [];
        setAccounts(finalAccounts);
        AsyncStorage.setItem('OFFLINE_ACCOUNTS', JSON.stringify(finalAccounts)).catch(() => {});
        return mappedAccounts;
      }
      setAccounts([]);
      return [];
    } catch (err: any) {
      console.error('Error fetching PigmyAccounts/Agent:', err);
      const cached = await AsyncStorage.getItem('OFFLINE_ACCOUNTS');
      if (cached) {
        const parsed = JSON.parse(cached);
        setAccounts(parsed);
        return parsed;
      }
      setAccounts([]);
      return [];
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchAgentCustomers = async (agentIdInput: string | number): Promise<AgentCustomer[]> => {
    const rawId = agentIdInput.toString().replace('agt_', '');
    try {
      let res;
      try {
        res = await apiClient.get(`/api/PigmyApp/customers?agentId=${rawId}`);
      } catch (e) {
        res = await apiClient.get(`/api/PigmyAgents/${rawId}/customers`);
      }
      const data = res.data;
      const custList = Array.isArray(data) ? data : (data.value || data.data || []);
      if (Array.isArray(custList)) {
        const mapped: AgentCustomer[] = custList.map((c: any) => ({
          customerId: c.customerId || c.customerID || c.id,
          cifNo: c.cifNo || '',
          oldAccountNo: (c.oldAccountNo ?? c.OldAccountNo ?? c.oldNo ?? c.OldNo ?? '').toString().trim(),
          customerName: c.customerName || c.name || [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ') || 'Customer',
          mobileNo: c.mobileNo || c.phone || '',
          address: c.address || '',
          totalAccounts: c.totalAccounts || c.accountCount || 1,
          totalBalance: c.totalBalance || c.currentBalance || 0,
          accounts: c.accounts || [],
        }));
        setAgentCustomers(mapped);
        AsyncStorage.setItem('OFFLINE_CUSTOMERS', JSON.stringify(mapped)).catch(() => {});
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('Error fetching Agent Customers:', err);
      const cached = await AsyncStorage.getItem('OFFLINE_CUSTOMERS');
      if (cached) {
        const parsed = JSON.parse(cached);
        setAgentCustomers(parsed);
        return parsed;
      }
      return [];
    }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        await AsyncStorage.removeItem('AUTH_TOKEN');
        const savedDemoMode = await AsyncStorage.getItem('DEMO_MODE');
        const savedRole = (await AsyncStorage.getItem('CURRENT_ROLE')) as UserRole | null;
        if (savedDemoMode === 'true') {
          const demoRole: UserRole =
            savedRole === 'ADMIN' || savedRole === 'CUSTOMER' ? savedRole : 'AGENT';
          ensureDemoStoreInitialized(true);
          setIsDemoMode(true);
          setCurrentRole(demoRole);
          setCurrentUser(DEMO_USERS[demoRole]);
          setIsAuthenticated(true);
          return;
        }
        let credentials: any = false;
        try {
          credentials = await Keychain.getGenericPassword({
            authenticationPrompt: {
              title: 'Authentication Required',
              subtitle: 'Please verify to unlock your session'
            }
          });
        } catch {
          credentials = await Keychain.getGenericPassword();
        }
        const savedAgentId = await AsyncStorage.getItem('AGENT_ID');
        if (credentials && credentials.password) {
          const token = credentials.password;
          setInMemoryAuthToken(token);
          setAuthToken('Bearer ' + token);

          const cachedUserStr = await AsyncStorage.getItem('CURRENT_USER');
          if (cachedUserStr) {
            setCurrentUser(JSON.parse(cachedUserStr));
          }

          if (savedRole === 'ADMIN') {
            setCurrentRole('ADMIN');
            setIsAuthenticated(true);
            fetchAdminSummary().catch(() => {});
          } else if (savedRole === 'CUSTOMER') {
            setCurrentRole('CUSTOMER');
            setIsAuthenticated(true);
          } else {
            setCurrentRole('AGENT');
            setIsAuthenticated(true);
            if (savedAgentId) {
              await Promise.allSettled([
                fetchAgentAccounts(savedAgentId),
                fetchAgentCustomers(savedAgentId),
                fetchLockStatus(savedAgentId),
                fetchDashboardSummary(savedAgentId),
                fetchAndReconcileTodaysCollections(savedAgentId),
              ]);
              fetchAgentProfile(savedAgentId).then(profile => {
                if (profile) {
                  setCurrentUser(prev => ({
                    ...prev,
                    name: profile.agentName || prev.name,
                    phone: profile.mobileNo || profile.phone || prev.phone,
                    limit: profile.limit || profile.dailyLimit,
                    username: profile.userName || prev.username,
                    agentId: `agt_${savedAgentId}`,
                  }));
                }
              }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error('Failed to load token', e);
      }
    };
    
    const loadPendingCollections = async () => {
      try {
        if ((await AsyncStorage.getItem('DEMO_MODE')) === 'true') return;
        const historyRaw = await AsyncStorage.getItem('TODAYS_COLLECTIONS_HISTORY');
        const pendingRaw = await AsyncStorage.getItem('PENDING_COLLECTIONS');
        let queue: CollectionRecord[] = [];
        
        if (historyRaw) queue = [...queue, ...JSON.parse(historyRaw)];
        if (pendingRaw) queue = [...queue, ...JSON.parse(pendingRaw)];
        
        if (queue.length > 0) {
          // Internal deduplication by unique key (receiptNo or id or syncReferenceId)
          const seenKeys = new Set<string>();
          const dedupedQueue: CollectionRecord[] = [];
          for (const item of queue) {
            const key = item.syncReferenceId || item.receiptNo || item.id;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              dedupedQueue.push(item);
            }
          }

          setCollections(prev => {
            const existingKeys = new Set(prev.map(c => c.syncReferenceId || c.receiptNo || c.id));
            const newCollections = dedupedQueue.filter(c => !existingKeys.has(c.syncReferenceId || c.receiptNo || c.id));
            return [...newCollections, ...prev];
          });
        }
      } catch (e) {
        console.log('Error loading collections history', e);
      }
    };

    bootstrapAsync();
    loadPendingCollections();
  }, []);

  const agentId = currentUser.agentId || '';

  const persistSessionToken = async (identifier: string, token: string) => {
    try {
      await Keychain.setGenericPassword(identifier, token, {
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
      });
    } catch {
      await Keychain.setGenericPassword(identifier, token);
    }
    await AsyncStorage.removeItem('AUTH_TOKEN');
    setInMemoryAuthToken(token);
    setAuthToken('Bearer ' + token);
  };

  const establishCustomerSession = async (data: any, fallbackIdentifier: string) => {
    const token: string = data?.token || data?.access_token || '';
    if (!token) {
      throw new Error('सर्व्हरकडून वैध लॉगिन टोकन मिळाले नाही.');
    }
    await persistSessionToken(fallbackIdentifier, token);
    await AsyncStorage.removeItem('AGENT_ID');
    await AsyncStorage.setItem('CURRENT_ROLE', 'CUSTOMER');

    const custId = String(data?.customerId ?? data?.id ?? '');
    const custUser: User = {
      id: `cst_${custId}`,
      name: data?.username || data?.customerName || fallbackIdentifier,
      email: '',
      phone: data?.mobileNo || '',
      role: 'CUSTOMER',
      accountNumber: data?.cifNo || '',
      username: data?.cifNo || data?.mobileNo || fallbackIdentifier,
    };

    await AsyncStorage.setItem('CURRENT_USER', JSON.stringify(custUser));
    setCurrentUser(custUser);
    setCurrentRole('CUSTOMER');
    setIsAuthenticated(true);
  };

  const activateCustomerTempPin = async (mobileNo: string, cifNo: string, newPin: string) => {
    const res = await apiClient.post('/api/Auth/customer/activate-temp-pin', {
      mobileNo: mobileNo.trim(),
      cifNo: cifNo.trim(),
      newPin: newPin.trim(),
    });
    await establishCustomerSession(res.data, mobileNo.trim());
  };

  const loginDemo = async (role: UserRole, _customIdentifier?: string) => {
    ensureDemoStoreInitialized(!isDemoMode);
    setInMemoryAuthToken('');
    setAuthToken('');
    setIsDemoMode(true);
    setCurrentRole(role);
    setCurrentUser(DEMO_USERS[role]);
    setIsAuthenticated(true);
    await AsyncStorage.setItem('DEMO_MODE', 'true').catch(() => {});
    await AsyncStorage.setItem('CURRENT_ROLE', role).catch(() => {});
  };

  const switchDemoRole = (role: UserRole) => {
    if (!isDemoMode) return;
    ensureDemoStoreInitialized(false);
    setCurrentRole(role);
    setCurrentUser(DEMO_USERS[role]);
    AsyncStorage.setItem('CURRENT_ROLE', role).catch(() => {});
  };

  const login = async (username?: string, password?: string, role?: UserRole, _credential?: any) => {
    setIsDemoMode(false);
    demoInitializedRef.current = false;
    await AsyncStorage.removeItem('DEMO_MODE').catch(() => {});
    const cleanUsername = (username || '').trim();
    const cleanPassword = password || '';

    if (!cleanUsername || !cleanPassword) {
      throw new Error('युजरनेम आणि पासवर्ड आवश्यक आहे.');
    }

    const response = await apiClient.post('/api/Auth/login', {
      username: cleanUsername,
      password: cleanPassword,
      ...(role === 'CUSTOMER' ? { loginAs: 'CUSTOMER' } : {}),
    });

    const token: string = response.data?.token || response.data?.access_token || '';
    if (!token) {
      throw new Error('सर्व्हरकडून वैध लॉगिन टोकन मिळाले नाही.');
    }

    const rawServerRole = String(response.data?.role || '').trim();
    const serverRoleUpper = rawServerRole.toUpperCase();

    if (serverRoleUpper === 'CUSTOMER') {
      await establishCustomerSession(response.data, cleanUsername);
      return;
    }

    await persistSessionToken(cleanUsername, token);

    let targetRole: UserRole = 'AGENT';
    let loggedInUser: User = EMPTY_USER;

    if (serverRoleUpper === 'AGENT') {
      targetRole = 'AGENT';
      const extractedAgentId = (
        response.data?.agentId ??
        response.data?.pigmyAgentID ??
        response.data?.id ??
        response.data?.userId ??
        response.data?.user?.id ??
        response.data?.agent?.agentId ??
        ''
      );
      const rawAgentId = String(extractedAgentId).replace('agt_', '').trim();
      if (!rawAgentId) {
        throw new Error('एजंट प्रोफाइल आयडी सर्व्हरकडून मिळाला नाही.');
      }

      await AsyncStorage.setItem('AGENT_ID', rawAgentId);
      await AsyncStorage.setItem('CURRENT_ROLE', 'AGENT');

      let agentDetails: any = null;
      try {
        agentDetails = await fetchAgentProfile(rawAgentId);
      } catch (e) {
        console.log('Error fetching agent details:', e);
      }

      loggedInUser = {
        id: `usr_${rawAgentId}`,
        name: agentDetails?.agentName || response.data?.name || response.data?.agentName || response.data?.username || cleanUsername,
        email: '',
        phone: agentDetails?.mobileNo || agentDetails?.phone || response.data?.mobileNo || response.data?.phone || '',
        role: 'AGENT',
        agentId: `agt_${rawAgentId}`,
        limit: agentDetails?.limit || agentDetails?.dailyLimit || response.data?.limit,
        username: agentDetails?.userName || response.data?.username || cleanUsername,
      };

      await AsyncStorage.setItem('CURRENT_USER', JSON.stringify(loggedInUser));
      setCurrentUser(loggedInUser);
      setCurrentRole('AGENT');
      setIsAuthenticated(true);

      await Promise.allSettled([
        fetchAgentAccounts(rawAgentId),
        fetchAgentCustomers(rawAgentId),
        fetchLockStatus(rawAgentId),
        fetchDashboardSummary(rawAgentId),
        fetchAndReconcileTodaysCollections(rawAgentId),
      ]);
      return;
    }

    // Staff / Manager / Admin roles
    targetRole = 'ADMIN';
    await AsyncStorage.removeItem('AGENT_ID');
    await AsyncStorage.setItem('CURRENT_ROLE', 'ADMIN');

    const staffName = response.data?.branchName
      ? `${response.data?.username || cleanUsername} (${response.data.branchName})`
      : (response.data?.name || response.data?.username || cleanUsername);

    loggedInUser = {
      id: `usr_staff_${response.data?.username || cleanUsername}`,
      name: staffName,
      email: '',
      phone: response.data?.mobileNo || '',
      role: 'ADMIN',
      username: response.data?.username || cleanUsername,
    };

    await AsyncStorage.setItem('CURRENT_USER', JSON.stringify(loggedInUser));
    setCurrentUser(loggedInUser);
    setCurrentRole(targetRole);
    setIsAuthenticated(true);
    fetchAdminSummary().catch(() => {});
  };

  const logout = async () => {
    try {
      await Keychain.resetGenericPassword();
    } catch {}
    await AsyncStorage.multiRemove([
      'DEMO_MODE',
      'AGENT_ID',
      'AUTH_TOKEN',
      'CURRENT_ROLE',
      'CURRENT_USER',
      'CACHED_DASHBOARD_SUMMARY',
      'PENDING_COLLECTIONS',
      'TODAYS_COLLECTIONS_HISTORY',
      'OFFLINE_ACCOUNTS',
      'OFFLINE_CUSTOMERS'
    ]);
    demoInitializedRef.current = false;
    setIsDemoMode(false);
    setInMemoryAuthToken('');
    setAuthToken('');
    setAgentCustomers([]);
    setAccounts([]);
    setCollections([]);
    setAgents([]);
    setDemoProfiles(deepClone(DEMO_DOORSTEP_PROFILES));
    setDemoPortalAccounts(deepClone(DEMO_CUSTOMER_PORTAL_DATA.accounts));
    setDemoPassbooks(deepClone(DEMO_CUSTOMER_PASSBOOKS));
    setManagerApprovals(deepClone(DEMO_MANAGER_APPROVALS));
    setManagerAgents(deepClone(DEMO_MANAGER_AGENTS));
    setManagerRemittedCashByBranch({});
    setServerDashboardSummary(null);
    setServerLockStatus(null);
    setCurrentUser(EMPTY_USER);
    setCurrentRole('AGENT');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout();
    });
    return () => registerUnauthorizedHandler(null);
  }, []);

  const addCollectionRecord = async (
    accountId: string,
    amount: number,
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER',
    notes?: string
  ): Promise<CollectionRecord> => {
    const lockStatus = checkLockStatus();
    if (lockStatus.status === 'LOCKED') {
      throw new Error(lockStatus.message);
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new Error('Account not found');

    const rawAccountId = parsePositiveId(accountId);
    const rawAgentId = parsePositiveId(agentId || currentUser.agentId || (await AsyncStorage.getItem('AGENT_ID')));
    if (!rawAccountId) throw new Error('वैध खाते क्रमांक (Account ID) आढळला नाही.');
    if (!rawAgentId) throw new Error('एजंट आयडी उपलब्ध नाही. कृपया पुन्हा लॉगिन करा.');

    const now = new Date();
    const timestampStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const receiptNo = `RC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const newRecord: CollectionRecord = {
      id: `rec_${Date.now()}`,
      transactionId: `txn_${Math.random().toString(36).substring(2, 15)}`, 
      receiptNo,
      accountId: account.id,
      accountNumber: account.accountNumber,
      oldAccountNo: account.oldAccountNo || '',
      customerName: account.customerName,
      agentId,
      agentName: currentUser.name,
      amount,
      paymentMode,
      timestamp: timestampStr,
      collectionTimestamp: now.toISOString(),
      status: 'VERIFIED',
      syncStatus: 'SYNC_PENDING',
      notes,
    };

    // 1. Optimistic UI Update (Save to Local State)
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              currentBalance: acc.currentBalance + amount,
              totalCollected: acc.totalCollected + amount,
            }
          : acc
      )
    );

    setAgents((prevAgents) =>
      prevAgents.map((agt) =>
        agt.id === agentId
          ? { ...agt, todayCollectedAmount: agt.todayCollectedAmount + amount }
          : agt
      )
    );

    if (isDemoMode) {
      const syncedRecord: CollectionRecord = {
        ...newRecord,
        syncStatus: 'SYNCED',
        newBalance: account.currentBalance + amount,
      };
      setCollections((prev) => [syncedRecord, ...prev]);
      setLastCreatedReceipt(syncedRecord);
      return syncedRecord;
    }

    setCollections((prev) => [newRecord, ...prev]);
    setLastCreatedReceipt(newRecord);

    // 2. Persist to AsyncStorage (Pending Queue)
    try {
      const pendingRaw = await AsyncStorage.getItem('PENDING_COLLECTIONS');
      const pendingQueue = pendingRaw ? JSON.parse(pendingRaw) : [];
      pendingQueue.push(newRecord);
      await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(pendingQueue));
    } catch (e) {
      console.error('Failed to save to pending queue', e);
    }

    // 3. Try to sync immediately
    try {
      await apiClient.post('/api/collections', {
        accountId: rawAccountId,
        pigmyAccountId: rawAccountId,
        accountNo: account.accountNumber,
        oldAccountNo: account.oldAccountNo || '',
        amount,
        timestamp: now.toISOString(),
        collectionDate: now.toISOString(),
        transactionId: newRecord.transactionId,
        offlineSync: false,
        agentId: rawAgentId,
        paymentMode
      });

      fetchDashboardSummary(rawAgentId).catch(() => {});
      
      // If success, update local status to SYNCED
      setCollections((prev) => prev.map(c => c.id === newRecord.id ? { ...c, syncStatus: 'SYNCED' } : c));
      
      // Remove from pending queue
      const pendingRaw2 = await AsyncStorage.getItem('PENDING_COLLECTIONS');
      if (pendingRaw2) {
        const pendingQueue2 = JSON.parse(pendingRaw2).filter((c: CollectionRecord) => c.id !== newRecord.id);
        await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(pendingQueue2));
      }
      
    } catch (err: any) {
      console.warn('Network error or API failed, keeping as SYNC_PENDING. Will sync later.', err.message);
      // We don't throw an error here anymore! The UI is already updated optimistically.
    }

    return newRecord;
  };

  const fetchCustomerDoorstepProfile = async (
    customerIdInput: string | number,
    hintAccount?: PigmiAccount
  ): Promise<CustomerDoorstepProfile> => {
    if (isDemoMode) {
      const cleanIn = String(customerIdInput ?? '').replace(/^cst_/i, '').replace(/^acc_/i, '').trim();
      const hintCustId = hintAccount?.customerId ? String(hintAccount.customerId).replace(/^cst_/i, '') : '';
      const directProfile =
        (hintCustId && demoProfiles[hintCustId]) ||
        (cleanIn && demoProfiles[cleanIn]) ||
        Object.values(demoProfiles).find(
          (p) =>
            (hintAccount?.cifNo && p.cifNo.toUpperCase() === hintAccount.cifNo.toUpperCase()) ||
            (hintAccount?.accountNumber &&
              p.pigmyAccounts.some((pa) => pa.accountNo === hintAccount.accountNumber)) ||
            p.pigmyAccounts.some((pa) => String(pa.accountId) === cleanIn)
        );
      if (directProfile) {
        return deepClone(directProfile);
      }
      if (hintAccount) {
        const parsedAccId = parsePositiveId(hintAccount.id) || 999;
        return {
          customerId: hintAccount.customerId || parsedAccId,
          cifNo: hintAccount.cifNo || `CIF-${parsedAccId}`,
          customerName: hintAccount.customerName,
          mobileNo: hintAccount.customerPhone || '',
          address: hintAccount.customerAddress || '',
          pigmyAccounts: [
            {
              accountId: parsedAccId,
              accountNo: hintAccount.accountNumber,
              oldAccountNo: hintAccount.oldAccountNo,
              productType: 'PIGMY',
              productTitle: 'दैनिक ठेव (Pigmy)',
              schemeName: 'दैनंदिन पिग्मी योजना',
              currentBalance: hintAccount.currentBalance,
              targetAmount: hintAccount.dailyTargetAmount || 100,
              isAgentAllowed: true,
              status: 'Active',
            },
          ],
          loanAccounts: [],
          savingAccounts: [],
          rdAccounts: [],
          totalPermittedAccounts: 1,
        };
      }
    }
    const resolvedAgentId = parsePositiveId(currentUser.agentId || (await AsyncStorage.getItem('AGENT_ID')));
    const rawAgentId = resolvedAgentId ? String(resolvedAgentId) : '';
    const inputStr = (customerIdInput ?? '').toString();

    // 1. Resolve actual CustomerID
    let cleanCustId = '';
    let targetCustomer = agentCustomers.find(c => String(c.customerId) === inputStr || (c.cifNo && c.cifNo === inputStr));

    // If input is an account ID (starts with "acc_") or hintAccount is provided, do NOT treat pigmyAccountId as customerId!
    const effectiveAcc = hintAccount || (inputStr.startsWith('acc_') ? accounts.find(a => a.id === inputStr) : undefined);
    if (effectiveAcc) {
      if (effectiveAcc.customerId) {
        cleanCustId = effectiveAcc.customerId.toString().replace('cst_', '');
      } else if (effectiveAcc.cifNo) {
        const foundCust = agentCustomers.find(c => c.cifNo && c.cifNo.trim().toUpperCase() === effectiveAcc.cifNo?.trim().toUpperCase());
        if (foundCust?.customerId) {
          cleanCustId = foundCust.customerId.toString().replace('cst_', '');
          targetCustomer = foundCust;
        }
      }
    }

    if (!cleanCustId) {
      cleanCustId = inputStr.replace('cst_', '').replace('acc_', '');
    }

    // 2. Try API call with resolved customerId
    try {
      if (rawAgentId && cleanCustId && cleanCustId !== '0') {
        const res = await apiClient.get(`/api/PigmyApp/customers/${cleanCustId}/doorstep-profile?agentId=${rawAgentId}`);
        if (res.data && (res.data.pigmyAccounts || res.data.loanAccounts || res.data.savingAccounts || res.data.rdAccounts)) {
          // Safety guard: If we have an expected CIF, verify match to prevent loading wrong customer
          const expectedCif = targetCustomer?.cifNo || effectiveAcc?.cifNo;
          const returnedCif = res.data.cifNo;
          if (expectedCif && returnedCif && expectedCif.trim().toUpperCase() !== returnedCif.trim().toUpperCase()) {
            console.warn('Safety guard: blocked mismatched profile! Expected CIF:', expectedCif, 'Returned CIF:', returnedCif);
          } else {
            // Ensure effectiveAcc is included in pigmyAccounts if not already there
            if (effectiveAcc) {
              const effectiveAccIdNum = parseInt(effectiveAcc.id.replace('acc_', ''), 10);
              const exists = res.data.pigmyAccounts?.some((p: any) => 
                p.accountId === effectiveAccIdNum || p.accountNo === effectiveAcc.accountNumber
              );
              if (!exists && res.data.pigmyAccounts && Number.isFinite(effectiveAccIdNum) && effectiveAccIdNum > 0) {
                res.data.pigmyAccounts.unshift({
                  accountId: effectiveAccIdNum,
                  accountNo: effectiveAcc.accountNumber,
                  productType: 'PIGMY',
                  productTitle: 'दैनिक ठेव (Pigmy)',
                  schemeName: 'दैनंदिन पिग्मी योजना',
                  currentBalance: effectiveAcc.currentBalance,
                  targetAmount: effectiveAcc.dailyTargetAmount || 100,
                  isAgentAllowed: true,
                  oldAccountNo: effectiveAcc.oldAccountNo,
                  status: effectiveAcc.status
                });
              }
            }
            return res.data;
          }
        }
      }
    } catch (e: any) {
      console.warn('doorstep-profile API request failed, creating fallback profile', e?.message);
    }

    // 3. Fallback profile: guaranteed to use the correct customer & account
    const matchedPigmy = effectiveAcc ? [effectiveAcc] : accounts.filter(a => 
      a.id === `acc_${cleanCustId}` || 
      a.accountNumber === cleanCustId || 
      a.cifNo === cleanCustId ||
      (a.customerId && String(a.customerId) === String(cleanCustId)) ||
      a.customerName.toLowerCase().includes(cleanCustId.toLowerCase())
    );

    const fallbackCustomer = targetCustomer || agentCustomers.find(c => String(c.customerId) === String(cleanCustId));
    const mobileNo = fallbackCustomer?.mobileNo || (matchedPigmy[0] as any)?.customerPhone || '';
    const address = fallbackCustomer?.address || (matchedPigmy[0] as any)?.customerAddress || '';

    return {
      customerId: cleanCustId || targetCustomer?.customerId || '',
      cifNo: fallbackCustomer?.cifNo || matchedPigmy[0]?.cifNo || `CIF-${cleanCustId}`,
      customerName: fallbackCustomer?.customerName || matchedPigmy[0]?.customerName || 'ग्राहक (Customer)',
      mobileNo,
      address,
      pigmyAccounts: matchedPigmy
        .map(p => ({ p, parsedId: parsePositiveId(p.id) }))
        .filter((entry): entry is { p: PigmiAccount; parsedId: number } => entry.parsedId !== null)
        .map(({ p, parsedId }) => ({
          accountId: parsedId,
          accountNo: p.accountNumber,
          productType: 'PIGMY',
          productTitle: 'दैनिक ठेव (Pigmy)',
          schemeName: 'दैनंदिन पिग्मी योजना',
          currentBalance: p.currentBalance,
          targetAmount: p.dailyTargetAmount || 100,
        isAgentAllowed: true,
        oldAccountNo: p.oldAccountNo,
        status: p.status
      })),
      loanAccounts: [],
      savingAccounts: [],
      rdAccounts: [],
      totalPermittedAccounts: matchedPigmy.length
    };
  };

  const collectMultiProduct = async (params: {
    productType: ProductType;
    accountId: number | string;
    accountNo: string;
    oldAccountNo?: string;
    customerName: string;
    amount: number;
    paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER';
    remarks?: string;
    latitude?: string;
    longitude?: string;
  }): Promise<CollectionRecord> => {
    const lockStatus = checkLockStatus();
    if (lockStatus.status === 'LOCKED') {
      throw new Error(lockStatus.message);
    }

    const {
      productType,
      accountId,
      accountNo,
      oldAccountNo,
      customerName,
      amount,
      paymentMode,
      remarks,
      latitude,
      longitude
    } = params;

    const rawAgentId = parsePositiveId(currentUser.agentId || (await AsyncStorage.getItem('AGENT_ID')));
    const rawAccountId = parsePositiveId(accountId);
    if (!rawAgentId) {
      throw new Error('एजंट आयडी उपलब्ध नाही. कृपया पुन्हा लॉगिन करा.');
    }
    if (!rawAccountId) {
      throw new Error('वैध खाते क्रमांक (Account ID) आढळला नाही.');
    }

    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const now = new Date();
    const timestampStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ymd = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

    let prefix = 'PG';
    let productTitle = 'दैनिक ठेव (Pigmy)';
    if (productType === 'LOAN') { prefix = 'LN'; productTitle = 'कर्ज हप्ता (Loan EMI)'; }
    else if (productType === 'SAVING') { prefix = 'SB'; productTitle = 'बचत ठेव (Saving)'; }
    else if (productType === 'RD') { prefix = 'RD'; productTitle = 'आवर्ती ठेव (RD)'; }

    const defaultReceiptNo = `${prefix}-AGT-${rawAgentId}-${ymd}${timeStr}`;

    let newRecord: CollectionRecord = {
      id: `rec_${Date.now()}`,
      transactionId: `txn_${Math.random().toString(36).substring(2, 15)}`,
      syncReferenceId: uuid,
      receiptNo: defaultReceiptNo,
      accountId,
      accountNumber: accountNo,
      oldAccountNo: oldAccountNo || '',
      customerName,
      agentId: currentUser.agentId || `agt_${rawAgentId}`,
      agentName: currentUser.name,
      amount,
      productType,
      productTitle,
      paymentMode,
      timestamp: timestampStr,
      collectionTimestamp: now.toISOString(),
      status: 'VERIFIED',
      syncStatus: 'SYNC_PENDING',
      notes: remarks || '',
      remarks: remarks || '',
    };

    // 1. Optimistic Local State Update
    if (productType === 'PIGMY') {
      setAccounts(prevAccounts =>
        prevAccounts.map(acc =>
          acc.id === String(accountId) || acc.id === `acc_${accountId}` || acc.accountNumber === accountNo
            ? {
                ...acc,
                currentBalance: acc.currentBalance + amount,
                totalCollected: acc.totalCollected + amount,
              }
            : acc
        )
      );
    }

    setAgents(prevAgents =>
      prevAgents.map(agt =>
        agt.id === agentId
          ? { ...agt, todayCollectedAmount: agt.todayCollectedAmount + amount }
          : agt
      )
    );

    if (isDemoMode) {
      const syncedRecord: CollectionRecord = {
        ...newRecord,
        syncStatus: 'SYNCED',
      };

      const interestPart = productType === 'LOAN' ? Math.round(amount * 0.25) : 0;
      const principalPart = productType === 'LOAN' ? Math.max(0, amount - interestPart) : 0;
      if (productType === 'LOAN') {
        syncedRecord.overdueInterestCollected = 0;
        syncedRecord.regularInterestCollected = interestPart;
        syncedRecord.principalCollected = principalPart;
      }

      // Compute updated balance synchronously from current demoProfiles snapshot
      let updatedBalance: number | undefined;
      for (const prof of Object.values(demoProfiles)) {
        if (productType === 'PIGMY') {
          const pAcc = prof.pigmyAccounts.find(
            (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
          );
          if (pAcc) {
            updatedBalance = pAcc.currentBalance + amount;
            break;
          }
        } else if (productType === 'SAVING') {
          const sAcc = prof.savingAccounts.find(
            (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
          );
          if (sAcc) {
            updatedBalance = sAcc.currentBalance + amount;
            break;
          }
        } else if (productType === 'RD') {
          const rAcc = prof.rdAccounts.find(
            (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
          );
          if (rAcc) {
            updatedBalance = rAcc.currentBalance + amount;
            syncedRecord.paidInstallments = (rAcc.paidInstallments || 0) + 1;
            syncedRecord.totalDepositedAmount = updatedBalance;
            break;
          }
        } else if (productType === 'LOAN') {
          const lAcc = prof.loanAccounts.find(
            (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
          );
          if (lAcc) {
            updatedBalance = Math.max(0, lAcc.currentBalance - principalPart);
            syncedRecord.newPrincipalBalance = updatedBalance;
            break;
          }
        }
      }

      // 1. Update Demo Doorstep Profiles
      setDemoProfiles((prev) => {
        const next = deepClone(prev);
        for (const key of Object.keys(next)) {
          const prof = next[key];
          if (productType === 'PIGMY') {
            const pAcc = prof.pigmyAccounts.find(
              (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
            );
            if (pAcc) pAcc.currentBalance += amount;
          } else if (productType === 'SAVING') {
            const sAcc = prof.savingAccounts.find(
              (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
            );
            if (sAcc) sAcc.currentBalance += amount;
          } else if (productType === 'RD') {
            const rAcc = prof.rdAccounts.find(
              (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
            );
            if (rAcc) {
              rAcc.currentBalance += amount;
              rAcc.paidInstallments = (rAcc.paidInstallments || 0) + 1;
            }
          } else if (productType === 'LOAN') {
            const lAcc = prof.loanAccounts.find(
              (a) => String(a.accountId) === String(rawAccountId) || a.accountNo === accountNo
            );
            if (lAcc) {
              lAcc.currentBalance = Math.max(0, lAcc.currentBalance - principalPart);
            }
          }
        }
        return next;
      });

      // 2. Sync matching Customer Portal Account Balance
      setDemoPortalAccounts((prev) => {
        const next = deepClone(prev);
        const listKey =
          productType === 'PIGMY'
            ? 'pigmyAccounts'
            : productType === 'SAVING'
            ? 'savingAccounts'
            : productType === 'RD'
            ? 'rdAccounts'
            : 'loanAccounts';
        const match = next[listKey].find(
          (a) => Number(a.accountId) === Number(rawAccountId) || a.accountNo === accountNo
        );
        if (match) {
          if (productType === 'LOAN') {
            match.balance = Math.max(0, match.balance - principalPart);
          } else {
            match.balance += amount;
          }
        }
        return next;
      });

      // 3. Prepend transaction to Customer Passbook
      const pbKey = `${productType}_${rawAccountId}`;
      setDemoPassbooks((prev) => {
        const next = deepClone(prev);
        const existing = next[pbKey] || {
          productType,
          accountNo,
          currentBalance: updatedBalance ?? amount,
          transactions: [],
        };
        const newBal =
          productType === 'LOAN'
            ? Math.max(0, existing.currentBalance - principalPart)
            : existing.currentBalance + amount;
        existing.currentBalance = newBal;
        existing.transactions.unshift({
          id: Date.now(),
          date: timestampStr,
          type: productType === 'LOAN' ? 'EMI_PAYMENT' : productType === 'RD' ? 'INSTALLMENT' : 'DEPOSIT',
          crAmount: amount,
          drAmount: 0,
          balance: newBal,
          narration: `${remarks || productTitle} (${paymentMode}) • एजंट: ${currentUser.name}`,
          reference: defaultReceiptNo,
        });
        next[pbKey] = existing;
        return next;
      });

      // 4. Sync Manager Field Agent Control metrics (Cash-in-hand / Cash vs UPI split)
      setManagerAgents((prev) =>
        prev.map((ma) => {
          if (ma.id !== (currentUser.agentId || 'agt_2')) return ma;
          const isCash = paymentMode === 'CASH';
          return {
            ...ma,
            todayCollectedAmount: ma.todayCollectedAmount + amount,
            todayCashAmount: ma.todayCashAmount + (isCash ? amount : 0),
            todayUpiAmount: ma.todayUpiAmount + (isCash ? 0 : amount),
            cashInHand: ma.cashInHand + (isCash ? amount : 0),
          };
        })
      );

      if (updatedBalance !== undefined && productType !== 'LOAN') {
        syncedRecord.newBalance = updatedBalance;
      }

      setCollections((prev) => [syncedRecord, ...prev]);
      setLastCreatedReceipt(syncedRecord);
      return syncedRecord;
    }

    setCollections(prev => [newRecord, ...prev]);
    setLastCreatedReceipt(newRecord);

    // 2. Persist to AsyncStorage (Pending Queue)
    try {
      const pendingRaw = await AsyncStorage.getItem('PENDING_COLLECTIONS');
      const pendingQueue = pendingRaw ? JSON.parse(pendingRaw) : [];
      pendingQueue.push(newRecord);
      await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(pendingQueue));
    } catch (e) {
      console.error('Failed to save to pending queue', e);
    }

    // 3. API Dispatch per Product
    try {
      let response: any = null;
      if (productType === 'LOAN') {
        response = await apiClient.post('/api/PigmyApp/collect-loan-emi', {
          agentId: rawAgentId,
          loanAccountId: rawAccountId,
          amount,
          paymentMode,
          syncReferenceId: uuid,
          receiptNo: defaultReceiptNo,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          collectionDate: now.toISOString(),
          remarks: remarks || 'हप्ता वसुली'
        });

        if (response?.data) {
          const d = response.data;
          newRecord.receiptNo = d.receiptNo || newRecord.receiptNo;
          newRecord.overdueInterestCollected = d.overdueInterestCollected ?? 0;
          newRecord.regularInterestCollected = d.regularInterestCollected ?? 0;
          newRecord.principalCollected = d.principalCollected ?? (amount - (d.regularInterestCollected || 0));
          newRecord.newPrincipalBalance = d.newPrincipalBalance;
        }
      } else if (productType === 'SAVING') {
        response = await apiClient.post('/api/PigmyApp/collect-saving', {
          agentId: rawAgentId,
          savingAccountId: rawAccountId,
          amount,
          paymentMode,
          syncReferenceId: uuid,
          receiptNo: defaultReceiptNo,
          remarks: remarks || 'बचत ठेव'
        });

        if (response?.data) {
          const d = response.data;
          newRecord.voucherNo = d.voucherNo;
          newRecord.receiptNo = d.voucherNo || newRecord.receiptNo;
          newRecord.newBalance = d.newBalance;
        }
      } else if (productType === 'RD') {
        response = await apiClient.post('/api/PigmyApp/collect-rd', {
          agentId: rawAgentId,
          rdAccountId: rawAccountId,
          amount,
          paymentMode,
          syncReferenceId: uuid,
          receiptNo: defaultReceiptNo,
          remarks: remarks || 'आरडी हप्ता'
        });

        if (response?.data) {
          const d = response.data;
          newRecord.paidInstallments = d.paidInstallments;
          newRecord.totalDepositedAmount = d.totalDepositedAmount;
        }
      } else {
        // PIGMY
        try {
          response = await apiClient.post('/api/PigmyApp/collect', {
            agentId: rawAgentId,
            pigmyAccountId: rawAccountId,
            amount,
            paymentMode,
            syncReferenceId: uuid,
            receiptNo: defaultReceiptNo,
            remarks: remarks || 'दैनिक ठेव'
          });
        } catch (pigmyErr: any) {
          // Fallback to existing collections endpoint
          response = await apiClient.post('/api/collections', {
            accountId: rawAccountId,
            pigmyAccountId: rawAccountId,
            accountNo,
            oldAccountNo: oldAccountNo || '',
            amount,
            timestamp: now.toISOString(),
            transactionId: newRecord.transactionId,
            syncReferenceId: uuid,
            receiptNo: defaultReceiptNo,
            offlineSync: false,
            agentId: rawAgentId,
            paymentMode
          });
        }

        if (response?.data) {
          if (response.data.receiptNo) newRecord.receiptNo = response.data.receiptNo;
          if (response.data.currentBalance !== undefined) newRecord.newBalance = response.data.currentBalance;
        }
      }

      // Mark as SYNCED
      newRecord.syncStatus = 'SYNCED';
      setCollections(prev => prev.map(c => c.id === newRecord.id ? { ...newRecord, syncStatus: 'SYNCED' } : c));
      setLastCreatedReceipt({ ...newRecord, syncStatus: 'SYNCED' });

      // Remove from pending queue
      const pendingRaw2 = await AsyncStorage.getItem('PENDING_COLLECTIONS');
      if (pendingRaw2) {
        const pendingQueue2 = JSON.parse(pendingRaw2).filter((c: CollectionRecord) => c.id !== newRecord.id);
        await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(pendingQueue2));
      }

      fetchDashboardSummary(rawAgentId).catch(() => {});

    } catch (err: any) {
      if (err.response && (err.response.status === 400 || err.response.status === 409) && err.response.data && err.response.data.message) {
        const pendingRaw2 = await AsyncStorage.getItem('PENDING_COLLECTIONS');
        if (pendingRaw2) {
          const pendingQueue2 = JSON.parse(pendingRaw2).filter((c: CollectionRecord) => c.id !== newRecord.id);
          await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(pendingQueue2));
        }
        setCollections(prev => prev.filter(c => c.id !== newRecord.id));

        if (err.response.data.status === 'LOCKED' || (err.response.data.message && err.response.data.message.includes('लॉक'))) {
          setServerLockStatus({
            agentId: rawAgentId,
            collect_Pigmi: 0,
            is_pending: 1,
            status: 'LOCKED',
            message: err.response.data.message,
            previousDaysCollectionDetails: []
          });
        }
        throw new Error(err.response.data.message);
      } else {
        console.warn('Network error or API failed, keeping as SYNC_PENDING. Will sync later.', err.message);
      }
    }

    return newRecord;
  };

  const clearLastReceipt = () => setLastCreatedReceipt(null);

  const fetchDashboardSummary = async (agentIdInput?: string | number): Promise<DashboardSummary> => {
    if (isDemoMode) {
      return getDashboardSummary();
    }
    const rawId = (agentIdInput || currentUser.agentId || (await AsyncStorage.getItem('AGENT_ID')) || '').toString().replace('agt_', '');
    try {
      const res = await apiClient.get('/api/dashboard/summary', {
        params: rawId ? { agentId: rawId } : undefined,
      });
      const d = res.data || {};
      const summary: DashboardSummary = {
        date: d.date || new Date().toISOString().split('T')[0],
        openingBalance: Number(d.openingBalance ?? 0),
        todaysCollection: Number(d.todaysCollection ?? 0),
        todaysRemittance: Number(d.todaysRemittance ?? 0),
        totalReceipts: Number(d.totalReceipts ?? 0),
        closingBalance: Number(d.closingBalance ?? d.pendingCashInHand ?? 0),
        pendingCashInHand: Number(d.pendingCashInHand ?? d.closingBalance ?? 0),
        lockStatus: d.lockStatus,
        isLocked: Boolean(d.isLocked),
      };
      setServerDashboardSummary(summary);
      AsyncStorage.setItem('CACHED_DASHBOARD_SUMMARY', JSON.stringify(summary)).catch(() => {});
      return summary;
    } catch (err: any) {
      console.warn('Failed to fetch dashboard summary from server:', err?.message);
      const cachedRaw = await AsyncStorage.getItem('CACHED_DASHBOARD_SUMMARY').catch(() => null);
      if (cachedRaw) {
        const parsed: DashboardSummary = JSON.parse(cachedRaw);
        setServerDashboardSummary(parsed);
        return parsed;
      }
      return getDashboardSummary();
    }
  };

  const getDashboardSummary = (): DashboardSummary => {
    const rawId = (currentUser.agentId || agentId || '').toString().replace('agt_', '');
    const pendingLocal = collections.filter(c =>
      c.syncStatus === 'SYNC_PENDING' &&
      (!rawId || !c.agentId || c.agentId === `agt_${rawId}` || c.agentId === rawId || c.agentId.replace('agt_', '') === rawId)
    );
    const pendingSum = pendingLocal.reduce((sum, c) => sum + c.amount, 0);

    if (serverDashboardSummary) {
      const opening = serverDashboardSummary.openingBalance || 0;
      const todaysCollection = (serverDashboardSummary.todaysCollection || 0) + pendingSum;
      const todaysRemittance = serverDashboardSummary.todaysRemittance || 0;
      return {
        ...serverDashboardSummary,
        openingBalance: opening,
        todaysCollection,
        totalReceipts: (serverDashboardSummary.totalReceipts || 0) + pendingLocal.length,
        closingBalance: Math.max(0, opening + todaysCollection - todaysRemittance),
      };
    }

    const myCollections = collections.filter(c =>
      !rawId || !c.agentId || c.agentId === `agt_${rawId}` || c.agentId === rawId || c.agentId.replace('agt_', '') === rawId
    );
    const todaysCollection = myCollections.reduce((sum, c) => sum + c.amount, 0);
    return {
      date: new Date().toISOString().split('T')[0],
      openingBalance: 0,
      todaysCollection,
      todaysRemittance: 0,
      totalReceipts: myCollections.length,
      closingBalance: todaysCollection,
    };
  };

  const checkLockStatus = (): RemittanceStatus => {
    if (isDemoMode) {
      return {
        agentId: agentId || 'agt_2',
        collect_Pigmi: 1,
        is_pending: 0,
        status: 'ALLOWED',
        message: 'डेमो मोड सक्रिय — वसुलीसाठी एजंट अधिकृत आहे.',
        previousDaysCollectionDetails: []
      };
    }
    if (serverLockStatus) {
      return serverLockStatus;
    }

    return {
      agentId,
      collect_Pigmi: 1,
      is_pending: 0,
      status: 'ALLOWED',
      message: 'कमिशन व पिग्मी कलेक्शनसाठी एजंट अधिकृत आहे.',
      previousDaysCollectionDetails: []
    };
  };

  const createCustomer = async (data: Partial<AgentCustomerRequest>): Promise<any> => {
    if (isDemoMode) {
      const fName = (data.firstName || '').trim() || 'नवीन ग्राहक';
      const mName = (data.middleName || '').trim();
      const lName = (data.lastName || '').trim();
      const fullName = [fName, mName, lName && lName !== fName ? lName : ''].filter(Boolean).join(' ').trim();
      const nextNum = 700 + accounts.length + 1;
      const newCustId = 100 + accounts.length + 1;
      const newCif = `CIF0${newCustId}`;
      const newAccNo = `00130100000${nextNum}`;
      const dailyAmt = Number(data.dailyDepositAmount) > 0 ? Number(data.dailyDepositAmount) : 100;
      const phone = (data.mobileNo || '').trim() || '9800000000';
      const address = (data.address || '').trim() || 'कोल्हापूर';
      const todayIso = new Date().toISOString().split('T')[0];

      const newPigmyAccount: PigmiAccount = {
        id: `acc_${nextNum}`,
        customerId: newCustId,
        accountNumber: newAccNo,
        cifNo: newCif,
        oldAccountNo: (data.oldAccountNo || '').trim() || String(20150 + accounts.length),
        customerName: fullName,
        customerPhone: phone,
        customerAddress: address,
        agentId: currentUser.agentId || 'agt_2',
        agentName: currentUser.name || DEMO_USERS.AGENT.name,
        dailyTargetAmount: dailyAmt,
        currentBalance: 0,
        totalCollected: 0,
        startDate: todayIso,
        maturityDate: '2027-12-31',
        interestRatePercentage: 7.5,
        status: 'ACTIVE',
      };

      const newCustomerRow: AgentCustomer = {
        customerId: newCustId,
        cifNo: newCif,
        oldAccountNo: newPigmyAccount.oldAccountNo,
        customerName: fullName,
        mobileNo: phone,
        address,
        totalAccounts: 1,
        totalBalance: 0,
      };

      const newProfile: CustomerDoorstepProfile = {
        customerId: newCustId,
        cifNo: newCif,
        customerName: fullName,
        mobileNo: phone,
        address,
        agentId: 2,
        pigmyAccounts: [
          {
            accountId: nextNum,
            accountNo: newAccNo,
            oldAccountNo: newPigmyAccount.oldAccountNo,
            productType: 'PIGMY',
            productTitle: 'दैनिक ठेव (Pigmy)',
            schemeName: 'दैनंदिन पिग्मी योजना',
            currentBalance: 0,
            targetAmount: dailyAmt,
            isAgentAllowed: true,
            status: 'Active',
          },
        ],
        loanAccounts: [],
        savingAccounts: [],
        rdAccounts: [],
        totalPermittedAccounts: 1,
      };

      setAccounts((prev) => [newPigmyAccount, ...prev]);
      setAgentCustomers((prev) => [newCustomerRow, ...prev]);
      setDemoProfiles((prev) => ({ ...prev, [String(newCustId)]: newProfile }));
      setManagerApprovals((prev) => [
        {
          id: `apr_kyc_live_${Date.now()}`,
          category: 'CUSTOMER_KYC',
          title: fullName,
          subtitle: 'एजंटकडून नवीन ग्राहक व पिग्मी खाते अर्ज',
          amount: dailyAmt,
          requestedBy: `${currentUser.name || DEMO_USERS.AGENT.name} (एजंट)`,
          requestedAt: 'आत्ताच',
          branchId: 1,
          branchName: 'मुख्य शाखा, कोल्हापूर',
          status: 'PENDING',
          details: [
            { label: 'खाते क्र.', value: newAccNo },
            { label: 'मोबाईल क्र.', value: phone },
            { label: 'दैनिक ठेव', value: `₹${dailyAmt} / दिवस` },
            { label: 'पत्ता', value: address },
          ],
        },
        ...prev,
      ]);

      return {
        success: true,
        message: `${fullName} यांचे नवीन पिग्मी खाते (${newAccNo}) डेमो यादीत जोडले!`,
      };
    }
    try {
      const fName = (data.firstName || '').trim();
      let lName = (data.lastName || '').trim();
      if (!lName) {
        lName = fName || 'Customer';
      }

      const response = await apiClient.post('/api/PigmyApp/create-request', {
        firstName: fName,
        middleName: (data.middleName || '').trim(),
        lastName: lName,
        mobileNo: (data.mobileNo || '').trim(),
        dailyDepositAmount: data.dailyDepositAmount || 100.0,
        address: (data.address || '').trim(),
        aadhaarNo: (data.aadhaarNo || '').trim(),
        panNo: (data.panNo || '').trim(),
        oldAccountNo: (data.oldAccountNo || '').trim(),
        OldAccountNo: (data.oldAccountNo || '').trim(),
        pigmySchemeID: data.pigmySchemeID || 1,
        branchID: data.branchID || 1
      });
      return response.data;
    } catch (err: any) {
      let errorMsg = 'ग्राहक नोंदणी करताना त्रुटी आली.';
      if (err.response && err.response.data) {
        if (err.response.data.message) {
          errorMsg = err.response.data.message;
        } else if (err.response.data.errors) {
          const errList = Object.values(err.response.data.errors).flat().join('\n');
          errorMsg = errList || JSON.stringify(err.response.data);
        } else {
          errorMsg = `Status: ${err.response.status}\n${JSON.stringify(err.response.data, null, 2)}`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      throw new Error(errorMsg);
    }
  };

  const fetchPigmySchemes = async (): Promise<PigmyScheme[]> => {
    if (isDemoMode) {
      return DEMO_SCHEMES;
    }
    try {
      const response = await apiClient.get('/api/PigmyApp/schemes');
      const data = response.data;
      const parsed = Array.isArray(data) ? data : (data?.value || data?.data || data?.result || data?.schemes || []);
      
      if (!parsed || parsed.length === 0) {
        throw new Error("Empty Array. Raw Response: " + JSON.stringify(data));
      }
      
      return parsed;
    } catch (err: any) {
      console.warn("Failed to fetch schemes.", err.message);
      return [];
    }
  };

  const fetchDropdowns = async (): Promise<DropdownOptions> => {
    try {
      const response = await apiClient.get('/api/AgentCustomerRequests/dropdowns');
      return response.data;
    } catch (err) {
      console.error(err);
      return { genders: [], occupations: [], casteCategories: [], relations: [] };
    }
  };

  const bulkSyncCollections = async (items?: any[]) => {
    if (isDemoMode) {
      return {
        success: true,
        collect_Pigmi: 1,
        message: 'सर्व डेमो पावत्या आधीच सिंक आहेत!',
        savedCount: 0,
      };
    }
    try {
      const pendingRaw = await AsyncStorage.getItem('PENDING_COLLECTIONS');
      const rawQueue: CollectionRecord[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      
      // Deduplicate queue
      const seen = new Set<string>();
      const pendingQueue: CollectionRecord[] = [];
      for (const item of rawQueue) {
        const key = item.syncReferenceId || item.receiptNo || item.id;
        if (!seen.has(key)) {
          seen.add(key);
          pendingQueue.push(item);
        }
      }

      if (pendingQueue.length === 0) {
        return { success: true, message: 'All collections are already synced.' };
      }

      const rawAgentId = parsePositiveId(currentUser?.agentId || agentId || (await AsyncStorage.getItem('AGENT_ID')));
      if (!rawAgentId) {
        return { success: false, message: 'एजंट आयडी उपलब्ध नाही. कृपया पुन्हा लॉगिन करा.' };
      }
      const syncedIds: string[] = [];
      const updatedReceiptMap: { [id: string]: { receiptNo?: string; newBalance?: number } } = {};

      let lastErrorMsg = '';
      const pigmyItems = pendingQueue.filter(item => !item.productType || item.productType === 'PIGMY');
      const nonPigmyItems = pendingQueue.filter(item => item.productType && item.productType !== 'PIGMY');
      const individualItems: CollectionRecord[] = [...nonPigmyItems];

      // 1. Bulk sync PIGMY items only (preserving original collectionTimestamp)
      if (pigmyItems.length > 0) {
        try {
          const validPigmyPairs = pigmyItems
            .map(item => ({ item, pigmyAccountId: parsePositiveId(item.accountId) }))
            .filter((x): x is { item: CollectionRecord; pigmyAccountId: number } => x.pigmyAccountId !== null);
          if (validPigmyPairs.length > 0) {
            const apiItems = validPigmyPairs.map(({ item, pigmyAccountId }) => {
              const matchedAcc = accounts.find(a => a.id === item.accountId || a.accountNumber === item.accountNumber);
              return {
                pigmyAccountId,
                accountNo: item.accountNumber || matchedAcc?.accountNumber || '',
                oldAccountNo: item.oldAccountNo || matchedAcc?.oldAccountNo || '',
                collectionAmount: item.amount,
                collectionDate: item.collectionTimestamp || new Date().toISOString(),
                receiptNo: item.receiptNo,
                transactionId: item.transactionId
              };
            });

            await apiClient.post('/api/PigmyApp/BulkCollection', {
              agentId: rawAgentId,
              items: apiItems
            });
            validPigmyPairs.forEach(({ item }) => syncedIds.push(item.id));
          }
        } catch (bulkErr: any) {
          const bMsg = bulkErr?.response?.data?.message || bulkErr?.response?.data || bulkErr?.message;
          if (bMsg) lastErrorMsg = typeof bMsg === 'string' ? bMsg : (bMsg.message || JSON.stringify(bMsg));
          console.warn('Bulk endpoint failed, falling back to individual sync:', bulkErr?.message);
          individualItems.push(...pigmyItems);
        }
      }

      // 2. Sync remaining (non-Pigmy + failed Pigmy fallback) items individually with original collectionDate & offlineSync=true
      if (individualItems.length > 0) {
        for (const item of individualItems) {
          try {
            const rawAccountId = parsePositiveId(item.accountId);
            if (!rawAccountId) {
              lastErrorMsg = `अवैध खाते क्रमांक (${item.accountNumber || item.accountId})`;
              continue;
            }
            const originalIsoDate = item.collectionTimestamp || new Date().toISOString();
            const uuid = item.syncReferenceId || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });

            let res: any = null;
            if (item.productType === 'LOAN') {
              res = await apiClient.post('/api/PigmyApp/collect-loan-emi', {
                agentId: rawAgentId,
                loanAccountId: rawAccountId,
                amount: item.amount,
                paymentMode: item.paymentMode,
                syncReferenceId: uuid,
                receiptNo: item.receiptNo,
                collectionDate: originalIsoDate,
                offlineSync: true,
                remarks: item.remarks || item.notes || 'हप्ता वसुली'
              });
            } else if (item.productType === 'SAVING') {
              res = await apiClient.post('/api/PigmyApp/collect-saving', {
                agentId: rawAgentId,
                savingAccountId: rawAccountId,
                amount: item.amount,
                paymentMode: item.paymentMode,
                syncReferenceId: uuid,
                receiptNo: item.receiptNo,
                collectionDate: originalIsoDate,
                offlineSync: true,
                remarks: item.remarks || item.notes || 'बचत ठेव'
              });
            } else if (item.productType === 'RD') {
              res = await apiClient.post('/api/PigmyApp/collect-rd', {
                agentId: rawAgentId,
                rdAccountId: rawAccountId,
                amount: item.amount,
                paymentMode: item.paymentMode,
                syncReferenceId: uuid,
                receiptNo: item.receiptNo,
                collectionDate: originalIsoDate,
                offlineSync: true,
                remarks: item.remarks || item.notes || 'आरडी हप्ता'
              });
            } else {
              // PIGMY individual offline sync via /api/collections (supports offlineSync + timestamp)
              res = await apiClient.post('/api/collections', {
                accountId: rawAccountId,
                pigmyAccountId: rawAccountId,
                accountNo: item.accountNumber,
                oldAccountNo: item.oldAccountNo || '',
                amount: item.amount,
                timestamp: originalIsoDate,
                collectionDate: originalIsoDate,
                transactionId: item.transactionId,
                syncReferenceId: uuid,
                receiptNo: item.receiptNo,
                offlineSync: true,
                agentId: rawAgentId,
                paymentMode: item.paymentMode
              });
            }

            syncedIds.push(item.id);
            if (res?.data) {
              updatedReceiptMap[item.id] = {
                receiptNo: res.data.receiptNo || res.data.voucherNo,
                newBalance: res.data.newBalance ?? res.data.currentBalance
              };
            }
          } catch (singleErr: any) {
            const sMsg = singleErr?.response?.data?.message || singleErr?.response?.data || singleErr?.message;
            if (sMsg) lastErrorMsg = typeof sMsg === 'string' ? sMsg : (sMsg.message || JSON.stringify(sMsg));
            console.warn('Failed to sync item individually:', item.id, singleErr?.message);
          }
        }
      }

      // Update state for all successfully synced items
      if (syncedIds.length > 0) {
        setCollections(prev => prev.map(c => {
          if (syncedIds.includes(c.id)) {
            const updates = updatedReceiptMap[c.id] || {};
            return {
              ...c,
              syncStatus: 'SYNCED',
              ...(updates.receiptNo ? { receiptNo: updates.receiptNo } : {}),
              ...(updates.newBalance !== undefined ? { newBalance: updates.newBalance } : {})
            };
          }
          return c;
        }));

        // Remove synced items from PENDING_COLLECTIONS
        const remainingQueue = pendingQueue.filter(p => !syncedIds.includes(p.id));
        if (remainingQueue.length > 0) {
          await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(remainingQueue));
        } else {
          await AsyncStorage.removeItem('PENDING_COLLECTIONS');
        }

        fetchDashboardSummary(rawAgentId).catch(() => {});
        fetchLockStatus(rawAgentId).catch(() => {});
      }

      if (syncedIds.length === 0 && pendingQueue.length > 0) {
        throw new Error(lastErrorMsg || 'सिंक अयशस्वी झाले. सर्व्हरशी संपर्क होऊ शकला नाही किंवा लॉक लागला आहे.');
      }

      return {
        success: true,
        collect_Pigmi: 1,
        message: `Successfully synced ${syncedIds.length} of ${pendingQueue.length} items.`,
        savedCount: syncedIds.length
      };

    } catch (err: any) {
      console.error('Error during bulk sync:', err);
      let errorMsg = err.message || 'API Error occurred during bulk sync';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      }
      throw new Error(errorMsg);
    }
  };

  const getPassbookStatement = (accountId: string, fromDate?: string, toDate?: string): PassbookStatement => {
    const acc = accounts.find(a => a.id === accountId) || accounts[0];
    const accCollections = collections.filter(c => c.accountId === accountId);
    
    let runningBalance = 0;
    const transactions: PassbookTransaction[] = accCollections.map(c => {
      runningBalance += c.amount;
      return {
        collectionId: c.id,
        date: c.timestamp,
        receiptNo: c.receiptNo,
        creditAmount: c.amount,
        runningBalance,
        source: 'APP'
      };
    });

    return {
      pigmyAccountId: acc.id,
      accountNo: acc.accountNumber,
      memberName: acc.customerName,
      agentName: acc.agentName,
      openingDate: acc.startDate,
      fromDate: fromDate || acc.startDate,
      toDate: toDate || new Date().toISOString().split('T')[0],
      openingBalance: 0,
      totalCredit: acc.totalCollected,
      closingBalance: acc.currentBalance,
      currentTotalBalance: acc.currentBalance,
      transactions
    };
  };

  const getCollectionReport = (fromDate: string, toDate: string): CollectionReport => {
    const myCollections = collections.filter(c => c.agentId === agentId);
    const amount = myCollections.reduce((sum, c) => sum + c.amount, 0);
    const uniqueAccs = new Set(myCollections.map(c => c.accountId)).size;

    const reportItems: CollectionReportItem[] = myCollections.map(c => ({
      collectionId: c.id,
      receiptNo: c.receiptNo,
      date: c.timestamp,
      pigmyAccountId: c.accountId,
      accountNo: c.accountNumber,
      memberName: c.customerName,
      amount: c.amount,
      source: 'APP'
    }));

    return {
      agentId,
      fromDate,
      toDate,
      totalCollectedAmount: amount,
      totalReceiptsCount: myCollections.length,
      uniqueAccountsCount: uniqueAccs,
      collections: reportItems
    };
  };

    const getCommissionReport = (fromDate: string, toDate: string): CommissionReport => {
    const report = getCollectionReport(fromDate, toDate);
    return {
      agentId,
      fromDate,
      toDate,
      totalCollectedAmount: report.totalCollectedAmount,
      commissionRate: 0,
      rateType: 'PERCENTAGE',
      calculatedCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      paidVouchersCount: 0
    };
  };

  const fetchPassbookStatement = async (
    accountId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<PassbookStatement> => {
    const rawAccId = String(accountId).replace('acc_', '');
    if (isDemoMode) {
      const acc =
        accounts.find((a) => a.id === accountId || a.id === `acc_${rawAccId}`) || accounts[0];
      const pbEntry = demoPassbooks[`PIGMY_${rawAccId}`];
      if (pbEntry && acc) {
        return {
          pigmyAccountId: rawAccId,
          accountNo: acc.accountNumber,
          memberName: acc.customerName,
          agentName: acc.agentName || currentUser.name,
          openingDate: acc.startDate,
          fromDate: fromDate || acc.startDate,
          toDate: toDate || new Date().toISOString().split('T')[0],
          openingBalance: 0,
          totalCredit: acc.totalCollected,
          closingBalance: pbEntry.currentBalance,
          currentTotalBalance: pbEntry.currentBalance,
          transactions: pbEntry.transactions.map((t) => ({
            collectionId: t.id,
            date: t.date,
            receiptNo: t.reference || t.narration,
            creditAmount: t.crAmount,
            runningBalance: t.balance,
            source: 'APP' as const,
          })),
        };
      }
      return getPassbookStatement(accountId, fromDate, toDate);
    }
    try {
      const res = await apiClient.get(`/api/reports/passbook/${rawAccId}`, {
        params: {
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
        },
      });
      const d = res.data || {};
      const serverTxs: PassbookTransaction[] = Array.isArray(d.transactions)
        ? d.transactions.map((t: any) => ({
            collectionId: t.transactionId || t.collectionId || t.referenceId || String(Math.random()),
            date: t.date || t.transactionDate || '',
            receiptNo: t.referenceId || t.receiptNo || t.narration || '-',
            creditAmount: Number(t.crAmount ?? t.creditAmount ?? 0),
            runningBalance: Number(t.balance ?? t.runningBalance ?? 0),
            source: 'APP',
          }))
        : [];

      // Overlay any unsynced offline receipts for this account
      const pendingLocal = collections.filter(
        c =>
          c.syncStatus === 'SYNC_PENDING' &&
          (String(c.accountId) === String(accountId) || String(c.accountId).replace('acc_', '') === rawAccId)
      );
      let running = Number(d.closingBalance ?? d.currentBalance ?? 0);
      const pendingTxs: PassbookTransaction[] = pendingLocal.map(c => {
        running += c.amount;
        return {
          collectionId: c.id,
          date: c.timestamp,
          receiptNo: `${c.receiptNo} (Pending Sync)`,
          creditAmount: c.amount,
          runningBalance: running,
          source: 'APP',
        };
      });

      const pendingTotal = pendingLocal.reduce((sum, c) => sum + c.amount, 0);
      return {
        pigmyAccountId: d.pigmyAccountId ?? rawAccId,
        accountNo: d.accountNo || '',
        memberName: d.memberName || '',
        agentName: d.agentName || currentUser.name || '',
        openingDate: d.openingDate || '',
        fromDate: d.fromDate || fromDate || '',
        toDate: d.toDate || toDate || new Date().toISOString().split('T')[0],
        openingBalance: Number(d.openingBalance ?? 0),
        totalCredit: Number(d.totalCredit ?? 0) + pendingTotal,
        closingBalance: Number(d.closingBalance ?? 0) + pendingTotal,
        currentTotalBalance: Number(d.currentBalance ?? d.currentTotalBalance ?? 0) + pendingTotal,
        transactions: [...pendingTxs, ...serverTxs],
      };
    } catch (err: any) {
      console.warn('Passbook API failed, falling back to local cache:', err?.message);
      return getPassbookStatement(accountId, fromDate, toDate);
    }
  };

  const fetchCollectionReport = async (fromDate?: string, toDate?: string): Promise<CollectionReport> => {
    const todayIso = new Date().toISOString().split('T')[0];
    const effectiveFrom = fromDate || todayIso;
    const effectiveTo = toDate || todayIso;
    if (isDemoMode) {
      return getCollectionReport(effectiveFrom, effectiveTo);
    }
    try {
      const res = await apiClient.get('/api/reports/collections', {
        params: { fromDate: effectiveFrom, toDate: effectiveTo },
      });
      const d = res.data || {};
      const items: CollectionReportItem[] = Array.isArray(d.collections)
        ? d.collections.map((c: any) => ({
            collectionId: c.collectionId || c.id || String(Math.random()),
            receiptNo: c.receiptNo || '',
            date: c.date || c.collectionDate || '',
            pigmyAccountId: c.pigmyAccountId || c.accountId || '',
            accountNo: c.accountNo || '',
            memberName: c.memberName || c.customerName || '',
            amount: Number(c.amount ?? 0),
            source: c.source === 'MANUAL' ? 'MANUAL' : 'APP',
          }))
        : [];
      return {
        agentId: d.agentId ?? agentId,
        fromDate: d.fromDate || effectiveFrom,
        toDate: d.toDate || effectiveTo,
        totalCollectedAmount: Number(d.totalCollectedAmount ?? 0),
        totalReceiptsCount: Number(d.totalReceipts ?? items.length),
        uniqueAccountsCount: new Set(items.map(i => String(i.pigmyAccountId))).size,
        collections: items,
      };
    } catch (err: any) {
      console.warn('Collection report API failed, falling back to local collections:', err?.message);
      return getCollectionReport(effectiveFrom, effectiveTo);
    }
  };

  const fetchCommissionReport = async (fromDate?: string, toDate?: string): Promise<CommissionReport> => {
    const todayIso = new Date().toISOString().split('T')[0];
    const effectiveFrom = fromDate || todayIso;
    const effectiveTo = toDate || todayIso;
    if (isDemoMode) {
      const baseMonthly = 68500;
      const liveSum = collections.reduce((s, c) => s + c.amount, 0);
      const totalCollected = baseMonthly + liveSum;
      const rate = 3;
      const calculated = Math.round((totalCollected * rate) / 100);
      const paid = Math.round(calculated * 0.4);
      return {
        agentId: agentId || 'agt_2',
        fromDate: effectiveFrom,
        toDate: effectiveTo,
        totalCollectedAmount: totalCollected,
        commissionRate: rate,
        rateType: 'PERCENTAGE',
        calculatedCommission: calculated,
        paidCommission: paid,
        pendingCommission: Math.max(0, calculated - paid),
        paidVouchersCount: 2,
      };
    }
    try {
      const res = await apiClient.get('/api/reports/commission', {
        params: { fromDate: effectiveFrom, toDate: effectiveTo },
      });
      const d = res.data || {};
      return {
        agentId: d.agentId ?? agentId,
        fromDate: d.fromDate || effectiveFrom,
        toDate: d.toDate || effectiveTo,
        totalCollectedAmount: Number(d.totalCollectedAmount ?? 0),
        commissionRate: Number(d.commissionRate ?? 0),
        rateType: d.rateType === 'FLAT' ? 'FLAT' : 'PERCENTAGE',
        calculatedCommission: Number(d.calculatedCommission ?? 0),
        paidCommission: Number(d.paidCommission ?? 0),
        pendingCommission: Number(d.pendingCommission ?? 0),
        paidVouchersCount: Number(d.paidVouchersCount ?? 0),
      };
    } catch (err: any) {
      console.warn('Commission report API failed, falling back cleanly:', err?.message);
      return getCommissionReport(effectiveFrom, effectiveTo);
    }
  };

  const fetchPigmyBookReport = async (
    filter: 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH'
  ): Promise<{ totalCollection: number; dailyRecords: { date: string; customers: number; amount: number }[] }> => {
    if (isDemoMode) {
      const todaySum = collections.reduce((s, c) => s + c.amount, 0);
      const todayCusts = new Set(collections.map((c) => String(c.accountId))).size;
      const fmtDay = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() - offsetDays);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      };
      if (filter === 'TODAY') {
        return {
          totalCollection: todaySum,
          dailyRecords: [{ date: fmtDay(0), customers: todayCusts, amount: todaySum }],
        };
      }
      if (filter === 'LAST_7_DAYS') {
        const records = [
          { date: fmtDay(0), customers: todayCusts, amount: todaySum },
          { date: fmtDay(1), customers: 6, amount: 3500 },
          { date: fmtDay(2), customers: 5, amount: 2800 },
          { date: fmtDay(3), customers: 6, amount: 4100 },
          { date: fmtDay(4), customers: 4, amount: 2200 },
          { date: fmtDay(5), customers: 6, amount: 3600 },
          { date: fmtDay(6), customers: 5, amount: 3100 },
        ];
        return {
          totalCollection: records.reduce((s, r) => s + r.amount, 0),
          dailyRecords: records,
        };
      }
      if (filter === 'THIS_MONTH') {
        const records = [
          { date: fmtDay(0), customers: todayCusts, amount: todaySum },
          { date: fmtDay(1), customers: 6, amount: 3500 },
          { date: fmtDay(2), customers: 5, amount: 2800 },
          { date: fmtDay(3), customers: 6, amount: 4100 },
          { date: fmtDay(7), customers: 6, amount: 3900 },
          { date: fmtDay(10), customers: 5, amount: 3200 },
        ];
        return {
          totalCollection: records.reduce((s, r) => s + r.amount, 0),
          dailyRecords: records,
        };
      }
      const lastMonthRecords = [
        { date: '25/10', customers: 6, amount: 4200 },
        { date: '20/10', customers: 6, amount: 3800 },
        { date: '15/10', customers: 5, amount: 3400 },
        { date: '10/10', customers: 6, amount: 4000 },
        { date: '05/10', customers: 5, amount: 3100 },
      ];
      return {
        totalCollection: lastMonthRecords.reduce((s, r) => s + r.amount, 0),
        dailyRecords: lastMonthRecords,
      };
    }
    const res = await apiClient.get('/api/reports/pigmy-book', {
      params: { filter },
    });
    const d = res.data || {};
    const dailyRecords = Array.isArray(d.dailyRecords)
      ? d.dailyRecords.map((r: any) => ({
          date: r.date || '',
          customers: Number(r.customers ?? 0),
          amount: Number(r.amount ?? 0),
        }))
      : [];
    return {
      totalCollection: Number(d.totalCollection ?? 0),
      dailyRecords,
    };
  };

  const fetchAdminSummary = async () => {
    if (isDemoMode) {
      const totalBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);
      const otherAgentsToday = agents
        .filter((a) => a.id !== 'agt_2')
        .reduce((sum, a) => sum + Number(a.todayCollectedAmount || 0), 0);
      const demoAgentToday = collections.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      return {
        totalBalance,
        todaysCollection: otherAgentsToday + demoAgentToday,
        todaysReceiptsCount: collections.length + 28,
        activeAccountsCount: accounts.length + 64,
        activeAgentsCount: agents.length,
      };
    }
    const res = await apiClient.get('/api/Dashboard/mobile-admin-summary');
    const d = res.data || {};

    if (Array.isArray(d.agents)) {
      const mappedAgents: AgentSummary[] = d.agents.map((a: any) => ({
        id: a.id || `agt_${a.agentId ?? a.pigmyAgentID ?? ''}`,
        name: a.name || a.agentName || 'Agent',
        phone: a.phone || a.mobileNo || '',
        assignedCustomersCount: Number(a.assignedCustomersCount ?? 0),
        todayTargetAmount: Number(a.todayTargetAmount ?? 0),
        todayCollectedAmount: Number(a.todayCollectedAmount ?? 0),
        pendingCustomersCount: Number(a.pendingCustomersCount ?? 0),
        status: a.status === 'ACTIVE' ? 'ACTIVE' : a.status === 'ON_FIELD' ? 'ON_FIELD' : 'OFFLINE',
      }));
      setAgents(mappedAgents);
    }

    if (Array.isArray(d.recentCollections)) {
      const mappedCols: CollectionRecord[] = d.recentCollections.map((c: any, idx: number) => ({
        id: `adm_col_${c.receiptNo || idx}`,
        transactionId: c.receiptNo || `txn_${idx}`,
        receiptNo: c.receiptNo || '',
        accountId: c.accountNumber || '',
        accountNumber: c.accountNumber || '',
        customerName: c.customerName || '',
        agentId: c.agentName || '',
        agentName: c.agentName || '',
        amount: Number(c.amount ?? 0),
        productType: 'PIGMY',
        paymentMode: (c.paymentMode === 'UPI' || c.paymentMode === 'BANK_TRANSFER' ? c.paymentMode : 'CASH'),
        timestamp: c.timestamp ? new Date(c.timestamp).toLocaleString('en-IN') : '',
        collectionTimestamp: c.timestamp,
        status: 'VERIFIED',
        syncStatus: 'SYNCED',
      }));
      setCollections(mappedCols);
    }

    return {
      totalBalance: Number(d.totalBalance ?? 0),
      todaysCollection: Number(d.todaysCollection ?? 0),
      todaysReceiptsCount: Number(d.todaysReceiptsCount ?? 0),
      activeAccountsCount: Number(d.activeAccountsCount ?? 0),
      activeAgentsCount: Number(d.activeAgentsCount ?? 0),
    };
  };

  const fetchManagerCommandData = async (branchId: ManagerBranchId = 'ALL'): Promise<ManagerCommandPayload> => {
    const todayDisplay = (() => {
      const n = new Date();
      return `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`;
    })();

    if (isDemoMode) {
      const selectedBranchObj =
        DEMO_BRANCHES.find((b) => b.id === branchId) || DEMO_BRANCHES[0];
      const matchingSeeds =
        branchId === 'ALL'
          ? DEMO_BRANCH_SEEDS
          : DEMO_BRANCH_SEEDS.filter((s) => s.branchId === branchId);

      const filteredApprovals =
        branchId === 'ALL'
          ? managerApprovals
          : managerApprovals.filter((a) => a.branchId === branchId);

      const filteredAgents =
        branchId === 'ALL'
          ? managerAgents
          : managerAgents.filter((a) => a.branchId === branchId);

      const filteredOverdue =
        branchId === 'ALL'
          ? DEMO_OVERDUE_LOANS
          : DEMO_OVERDUE_LOANS.filter((o) => o.branchId === branchId);

      const filteredMaturities =
        branchId === 'ALL'
          ? DEMO_MATURITY_ITEMS
          : DEMO_MATURITY_ITEMS.filter((m) => m.branchId === branchId);

      // Include live demo collections added beyond initial 4 demo entries into Branch 1 totals
      const extraCollections = collections.filter((c) => !c.id.startsWith('demo_rec_'));
      const includeBranch1Delta = branchId === 'ALL' || branchId === 1;
      const extraPigmy = includeBranch1Delta
        ? extraCollections.filter((c) => !c.productType || c.productType === 'PIGMY').reduce((s, c) => s + c.amount, 0)
        : 0;
      const extraSaving = includeBranch1Delta
        ? extraCollections.filter((c) => c.productType === 'SAVING').reduce((s, c) => s + c.amount, 0)
        : 0;
      const extraRd = includeBranch1Delta
        ? extraCollections.filter((c) => c.productType === 'RD').reduce((s, c) => s + c.amount, 0)
        : 0;
      const extraLoanPrincipal = includeBranch1Delta
        ? extraCollections.filter((c) => c.productType === 'LOAN').reduce((s, c) => s + (c.principalCollected ?? c.amount), 0)
        : 0;

      const sumField = (fn: (s: (typeof DEMO_BRANCH_SEEDS)[number]) => number) =>
        matchingSeeds.reduce((acc, s) => acc + fn(s), 0);

      const fdBalance = sumField((s) => s.fdBalance);
      const savingBalance = sumField((s) => s.savingBalance) + extraSaving;
      const pigmyBalance = sumField((s) => s.pigmyBalance) + extraPigmy;
      const rdBalance = sumField((s) => s.rdBalance) + extraRd;
      const totalDeposits = fdBalance + savingBalance + pigmyBalance + rdBalance;

      const loanOutstanding = Math.max(0, sumField((s) => s.loanOutstanding) - extraLoanPrincipal);
      const loanOverdue = sumField((s) => s.loanOverdue);
      const cdRatioPercent = totalDeposits > 0 ? Math.round((loanOutstanding / totalDeposits) * 1000) / 10 : 0;
      const avgNpa =
        matchingSeeds.length > 0
          ? Math.round((sumField((s) => s.npaPercent) / matchingSeeds.length) * 100) / 100
          : 0;

      const todayCashCollection = filteredAgents.reduce((s, a) => s + a.todayCashAmount, 0);
      const todayUpiCollection = filteredAgents.reduce((s, a) => s + a.todayUpiAmount, 0);
      const remittedCash = matchingSeeds.reduce(
        (s, b) => s + (managerRemittedCashByBranch[b.branchId] || 0),
        0
      );
      const openingCash = sumField((s) => s.openingCash);
      const counterCashDeposits = matchingSeeds.length * 95000;
      const todayReceipts = counterCashDeposits + todayCashCollection + todayUpiCollection + remittedCash;
      const todayPayments = sumField((s) => s.todayPayments);
      const branchCashInHand = Math.max(0, openingCash + counterCashDeposits + remittedCash - todayPayments);

      const pendingVouchersCount = filteredApprovals.filter(
        (a) => a.category === 'VOUCHER' && a.status === 'PENDING'
      ).length;
      const pendingAgentCashTotal = filteredAgents.reduce((s, a) => s + a.cashInHand, 0);
      const lockedAgentsCount = filteredAgents.filter((a) => a.isLocked).length;
      const maturedUnclosedCount = filteredMaturities.filter((m) => m.bucket === 'MATURED_UNCLOSED').length;

      const eodChecklist: ManagerEodChecklistItem[] = [
        {
          id: 'eod_vouchers',
          label: 'व्हाउचर पोस्टिंग (Maker-Checker)',
          status: pendingVouchersCount === 0 ? 'OK' : 'WARNING',
          detail:
            pendingVouchersCount === 0
              ? 'सर्व व्हाउचर्स तपासले व पोस्ट केले आहेत'
              : `${pendingVouchersCount} उच्च-रकमेचे व्हाउचर मंजुरीच्या प्रतीक्षेत`,
        },
        {
          id: 'eod_agent_cash',
          label: 'एजंट रोख जमा (Remittance)',
          status: pendingAgentCashTotal === 0 && lockedAgentsCount === 0 ? 'OK' : 'WARNING',
          detail:
            pendingAgentCashTotal === 0
              ? 'सर्व एजंटकडील रोख शाखेत जमा झाली आहे'
              : `₹${pendingAgentCashTotal.toLocaleString('en-IN')} रोख फिल्डवर प्रलंबित${lockedAgentsCount > 0 ? ` (${lockedAgentsCount} लॉक)` : ''}`,
        },
        {
          id: 'eod_cash_tally',
          label: 'शाखा रोख ताळेबंद (Cash Tally)',
          status: 'OK',
          detail: `अखेरची रोख ₹${branchCashInHand.toLocaleString('en-IN')} अचूक जुळली`,
        },
        {
          id: 'eod_fd_matured',
          label: 'मॅच्युअर अनक्लोज्ड FD खाती',
          status: maturedUnclosedCount === 0 ? 'OK' : 'WARNING',
          detail:
            maturedUnclosedCount === 0
              ? 'कोणतीही मुदतबाह्य FD प्रलंबित नाही'
              : `${maturedUnclosedCount} FD मुदत पूर्ण होऊनही नूतनीकरण/बंद बाकी`,
        },
      ];

      return {
        branches: DEMO_BRANCHES,
        portfolio: {
          branchId,
          branchName: selectedBranchObj.name,
          businessDate: selectedBranchObj.businessDate || todayDisplay,
          eodStatus:
            pendingVouchersCount === 0 && pendingAgentCashTotal === 0
              ? 'OPEN'
              : selectedBranchObj.eodStatus,
          totalDeposits,
          totalLoanOutstanding: loanOutstanding,
          totalLoanOverdue: loanOverdue,
          npaPercent: avgNpa,
          cdRatioPercent,
          branchCashInHand,
          openingCash,
          todayReceipts,
          todayPayments,
          todayCashCollection,
          todayUpiCollection,
          todaysReceiptsCount: collections.length + matchingSeeds.length * 14,
          totalMembers: sumField((s) => s.totalMembers),
          fd: {
            activeAccounts: sumField((s) => s.fdAccounts),
            totalBalance: fdBalance,
            extraLabel: 'मॅच्युअर बाकी',
            extraValue: `${sumField((s) => s.fdMaturedUnclosed)} खाती`,
          },
          saving: {
            activeAccounts: sumField((s) => s.savingAccounts),
            totalBalance: savingBalance,
          },
          pigmy: {
            activeAccounts: sumField((s) => s.pigmyAccounts) + Math.max(0, accounts.length - DEMO_PIGMI_ACCOUNTS.length),
            totalBalance: pigmyBalance,
            extraLabel: 'आज संकलन',
            extraValue: `₹${(todayCashCollection + todayUpiCollection).toLocaleString('en-IN')}`,
          },
          rd: {
            activeAccounts: sumField((s) => s.rdAccounts),
            totalBalance: rdBalance,
          },
          loan: {
            activeAccounts: sumField((s) => s.loanAccounts),
            totalBalance: loanOutstanding,
            extraLabel: 'थकबाकी',
            extraValue: `₹${loanOverdue.toLocaleString('en-IN')}`,
          },
          shares: {
            activeAccounts: sumField((s) => s.shareAccounts),
            totalBalance: sumField((s) => s.shareBalance),
            extraLabel: 'सभासद',
            extraValue: `${sumField((s) => s.totalMembers)}`,
          },
        },
        approvals: deepClone(filteredApprovals),
        agents: deepClone(filteredAgents),
        overdueLoans: deepClone(filteredOverdue),
        maturityItems: deepClone(filteredMaturities),
        eodChecklist,
      };
    }

    // Live CBS Mode: gracefully aggregate /api/Dashboard/summary + /api/Dashboard/mobile-admin-summary
    const branchParam = branchId !== 'ALL' ? { branchId } : undefined;
    const [dashRes, mobRes] = await Promise.allSettled([
      apiClient.get('/api/Dashboard/summary', { params: branchParam }),
      apiClient.get('/api/Dashboard/mobile-admin-summary', { params: branchParam }),
    ]);

    const dash = dashRes.status === 'fulfilled' ? dashRes.value.data || {} : {};
    const mob = mobRes.status === 'fulfilled' ? mobRes.value.data || {} : {};

    if (Array.isArray(mob.recentCollections)) {
      const mappedCols: CollectionRecord[] = mob.recentCollections.map((c: any, idx: number) => ({
        id: `adm_col_${c.receiptNo || idx}`,
        transactionId: c.receiptNo || `txn_${idx}`,
        receiptNo: c.receiptNo || '',
        accountId: c.accountNumber || '',
        accountNumber: c.accountNumber || '',
        customerName: c.customerName || '',
        agentId: c.agentName || '',
        agentName: c.agentName || '',
        amount: Number(c.amount ?? 0),
        productType: 'PIGMY',
        paymentMode: c.paymentMode === 'UPI' || c.paymentMode === 'BANK_TRANSFER' ? c.paymentMode : 'CASH',
        timestamp: c.timestamp ? new Date(c.timestamp).toLocaleString('en-IN') : '',
        collectionTimestamp: c.timestamp,
        status: 'VERIFIED',
        syncStatus: 'SYNCED',
      }));
      setCollections(mappedCols);
    }

    const liveAgents: ManagerAgentControlItem[] = Array.isArray(mob.agents)
      ? mob.agents.map((a: any) => ({
          id: a.id || `agt_${a.agentId ?? a.pigmyAgentID ?? ''}`,
          name: a.name || a.agentName || 'Agent',
          phone: a.phone || a.mobileNo || '',
          assignedCustomersCount: Number(a.assignedCustomersCount ?? 0),
          todayTargetAmount: Number(a.todayTargetAmount ?? 0),
          todayCollectedAmount: Number(a.todayCollectedAmount ?? 0),
          pendingCustomersCount: Number(a.pendingCustomersCount ?? 0),
          status: a.status === 'ACTIVE' ? 'ACTIVE' : a.status === 'ON_FIELD' ? 'ON_FIELD' : 'OFFLINE',
          branchId: Number(a.branchId ?? 1),
          branchName: 'Live CBS Branch',
          cashInHand: Number(a.todayCollectedAmount ?? 0),
          cashLimit: 20000,
          todayCashAmount: Number(a.todayCollectedAmount ?? 0),
          todayUpiAmount: 0,
          isLocked: false,
          lastRemittanceDate: '-',
        }))
      : [];
    setAgents(liveAgents);

    const fdBal = Number(dash.fixedDeposit?.totalBalance ?? 0);
    const savBal = Number(dash.saving?.totalBalance ?? 0);
    const pigBal = Number(dash.pigmy?.totalBalance ?? mob.totalBalance ?? 0);
    const rdBal = Number(dash.recurringDeposit?.totalBalance ?? 0);
    const totalDep = fdBal + savBal + pigBal + rdBal;
    const loanOut = Number(dash.loan?.principalBalance ?? 0);
    const loanOvd = Number(dash.loan?.overdueBalance ?? 0);
    const cdRatio = totalDep > 0 ? Math.round((loanOut / totalDep) * 1000) / 10 : 0;
    const todaysCol = Number(mob.todaysCollection ?? 0);

    return {
      branches: [
        {
          id: 'ALL',
          name: currentUser.name || 'Live CBS Branch',
          shortName: 'Live CBS',
          code: 'LIVE',
          eodStatus: 'OPEN',
          businessDate: todayDisplay,
        },
      ],
      portfolio: {
        branchId: 'ALL',
        branchName: currentUser.name || 'Live CBS Branch',
        businessDate: todayDisplay,
        eodStatus: 'OPEN',
        totalDeposits: totalDep,
        totalLoanOutstanding: loanOut,
        totalLoanOverdue: loanOvd,
        npaPercent: loanOut > 0 ? Math.round((loanOvd / loanOut) * 1000) / 10 : 0,
        cdRatioPercent: cdRatio,
        branchCashInHand: todaysCol,
        openingCash: 0,
        todayReceipts: todaysCol,
        todayPayments: 0,
        todayCashCollection: todaysCol,
        todayUpiCollection: 0,
        todaysReceiptsCount: Number(mob.todaysReceiptsCount ?? 0),
        totalMembers: Number(dash.members?.totalMembers ?? 0),
        fd: {
          activeAccounts: Number(dash.fixedDeposit?.activeAccounts ?? 0),
          totalBalance: fdBal,
          extraLabel: 'मॅच्युअर बाकी',
          extraValue: `${Number(dash.fixedDeposit?.maturedUnclosedAccounts ?? 0)} खाती`,
        },
        saving: {
          activeAccounts: Number(dash.saving?.activeAccounts ?? 0),
          totalBalance: savBal,
        },
        pigmy: {
          activeAccounts: Number(dash.pigmy?.activeAccounts ?? mob.activeAccountsCount ?? 0),
          totalBalance: pigBal,
          extraLabel: 'आज संकलन',
          extraValue: `₹${todaysCol.toLocaleString('en-IN')}`,
        },
        rd: {
          activeAccounts: Number(dash.recurringDeposit?.activeAccounts ?? 0),
          totalBalance: rdBal,
        },
        loan: {
          activeAccounts: Number(dash.loan?.activeAccounts ?? 0),
          totalBalance: loanOut,
          extraLabel: 'थकबाकी',
          extraValue: `₹${loanOvd.toLocaleString('en-IN')}`,
        },
        shares: {
          activeAccounts: Number(dash.shares?.activeAccounts ?? 0),
          totalBalance: Number(dash.shares?.totalBalance ?? 0),
          extraLabel: 'सभासद',
          extraValue: `${Number(dash.members?.totalMembers ?? 0)}`,
        },
      },
      approvals: [],
      agents: liveAgents,
      overdueLoans: [],
      maturityItems: [],
      eodChecklist: [
        {
          id: 'live_sync',
          label: 'Live CBS जोडणी सक्रिय',
          status: 'OK',
          detail: 'मुख्य CBS सर्व्हरवरून आकडेवारी प्राप्त झाली आहे',
        },
      ],
    };
  };

  const updateManagerApproval = async (
    id: string,
    status: ManagerApprovalStatus,
    remarks?: string
  ) => {
    setManagerApprovals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, remarks: remarks || item.remarks } : item
      )
    );
  };

  const toggleManagerAgentLock = async (targetAgentId: string) => {
    setManagerAgents((prev) =>
      prev.map((a) =>
        a.id === targetAgentId
          ? { ...a, isLocked: !a.isLocked, status: !a.isLocked ? 'OFFLINE' : 'ON_FIELD' }
          : a
      )
    );
  };

  const acceptManagerAgentRemittance = async (targetAgentId: string, amount: number) => {
    const cleanAmt = Math.max(0, Number(amount) || 0);
    if (cleanAmt <= 0) return;
    const target = managerAgents.find((a) => a.id === targetAgentId);
    const settled = target ? Math.min(target.cashInHand, cleanAmt) : cleanAmt;

    setManagerAgents((prev) =>
      prev.map((a) => {
        if (a.id !== targetAgentId) return a;
        const remainingCash = Math.max(0, a.cashInHand - settled);
        return {
          ...a,
          cashInHand: remainingCash,
          isLocked: remainingCash > a.cashLimit ? a.isLocked : false,
          status: remainingCash > a.cashLimit ? a.status : 'ON_FIELD',
          lastRemittanceDate: 'आत्ताच जमा',
        };
      })
    );

    if (target) {
      setManagerRemittedCashByBranch((prev) => ({
        ...prev,
        [target.branchId]: (prev[target.branchId] || 0) + settled,
      }));
    }
  };

  const fetchCustomerPortalOverview = async () => {
    if (isDemoMode) {
      const { pigmyAccounts, savingAccounts, rdAccounts, fdAccounts, loanAccounts } = demoPortalAccounts;
      const totalSavingsAndDeposits = [
        ...pigmyAccounts,
        ...savingAccounts,
        ...rdAccounts,
        ...fdAccounts,
      ].reduce((sum, a) => sum + Number(a.balance || 0), 0);
      const totalLoanOutstanding = loanAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
      return {
        summary: {
          ...DEMO_CUSTOMER_PORTAL_DATA.customerInfo,
          totalSavingsAndDeposits,
          totalLoanOutstanding,
          counts: {
            pigmy: pigmyAccounts.length,
            saving: savingAccounts.length,
            rd: rdAccounts.length,
            fd: fdAccounts.length,
            loan: loanAccounts.length,
          },
        },
        accounts: deepClone(demoPortalAccounts),
      };
    }
    const [sumRes, accRes] = await Promise.all([
      apiClient.get('/api/customer/summary'),
      apiClient.get('/api/customer/accounts'),
    ]);
    return {
      summary: sumRes.data,
      accounts: accRes.data,
    };
  };

  const fetchCustomerAccountPassbook = async (productType: string, accountId: number) => {
    if (isDemoMode) {
      const key = `${productType.toUpperCase()}_${accountId}`;
      const existing = demoPassbooks[key];
      if (existing) {
        return deepClone(existing);
      }
      return {
        productType,
        accountNo: String(accountId),
        currentBalance: 0,
        transactions: [],
      };
    }
    const res = await apiClient.get(`/api/customer/passbook/${productType}/${accountId}`);
    return res.data;
  };

  // Save today's collection history to local storage so they remain in "Collected" tab even after sync
  useEffect(() => {
    if (!isAuthenticated || currentRole !== 'AGENT' || isDemoMode || collections.length === 0) return;
    const todayStr = new Date().toLocaleDateString();
    const todaysCollections = collections.filter(c => c.timestamp.startsWith(todayStr));
    if (todaysCollections.length > 0) {
      const seen = new Set<string>();
      const deduped = todaysCollections.filter(c => {
        const key = c.syncReferenceId || c.receiptNo || c.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      AsyncStorage.setItem('TODAYS_COLLECTIONS_HISTORY', JSON.stringify(deduped)).catch(e => console.log(e));
    }
  }, [collections, isAuthenticated, isDemoMode]);

  // Automatic Background Sync Listener (Agent only)
  useEffect(() => {
    if (!isAuthenticated || currentRole !== 'AGENT' || isDemoMode) return;

    const handleNetworkChange = (state: any) => {
      if (state.isConnected) {
        bulkSyncCollections().catch(err => console.log('Auto-sync failed on network change'));
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        bulkSyncCollections().catch(err => console.log('Auto-sync failed on app foreground'));
      }
    };

    const unsubscribeNetInfo = NetInfo.addEventListener(handleNetworkChange);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, agentId, isDemoMode]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isDemoMode,
        currentRole,
        currentUser,
        login,
        loginDemo,
        switchDemoRole,
        logout,
        accounts,
        collections,
        agents,
        agentCustomers,
        managerApprovals,
        managerAgents,
        fetchManagerCommandData,
        updateManagerApproval,
        toggleManagerAgentLock,
        acceptManagerAgentRemittance,
        fetchAgentProfile,
        fetchAgentAccounts,
        fetchAgentCustomers,
        addCollectionRecord,
        lastCreatedReceipt,
        clearLastReceipt,
        getDashboardSummary,
        fetchDashboardSummary,
        checkLockStatus,
        createCustomer,
        fetchPigmySchemes,
        fetchDropdowns,
        bulkSyncCollections,
        getPassbookStatement,
        fetchPassbookStatement,
        getCollectionReport,
        fetchCollectionReport,
        getCommissionReport,
        fetchCommissionReport,
        fetchPigmyBookReport,
        fetchAdminSummary,
        activateCustomerTempPin,
        fetchCustomerPortalOverview,
        fetchCustomerAccountPassbook,
        authToken,
        isLoadingAccounts,
        refreshAgentData,
        fetchCustomerDoorstepProfile,
        collectMultiProduct
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
