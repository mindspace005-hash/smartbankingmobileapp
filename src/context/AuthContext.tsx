import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { 
  UserRole, User, CollectionRecord, PigmiAccount, AgentSummary,
  DashboardSummary, RemittanceStatus, PassbookStatement, CollectionReport, CommissionReport,
  PassbookTransaction, CollectionReportItem, PigmyScheme, DropdownOptions, AgentCustomerRequest,
  AgentCustomer, ProductType, CustomerDoorstepProfile
} from '../types';
import { MOCK_USERS, MOCK_PIGMI_ACCOUNTS, INITIAL_COLLECTIONS, MOCK_AGENTS } from '../data/mockData';
import { apiClient } from '../config';

interface AuthContextType {
  isAuthenticated: boolean;
  currentRole: UserRole;
  currentUser: User;
  login: (username?: string, password?: string, role?: UserRole, credential?: any) => Promise<void>;
  logout: () => Promise<void>;
  accounts: PigmiAccount[];
  collections: CollectionRecord[];
  agents: AgentSummary[];
  agentCustomers: AgentCustomer[];
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

  // New Agent Endpoints
  getDashboardSummary: () => DashboardSummary;
  checkLockStatus: () => RemittanceStatus;
  createCustomer: (data: Partial<AgentCustomerRequest>) => Promise<any>;
  fetchPigmySchemes: () => Promise<PigmyScheme[]>;
  fetchDropdowns: () => Promise<DropdownOptions>;
  bulkSyncCollections: (items: any[]) => Promise<any>;
  getPassbookStatement: (accountId: string, fromDate?: string, toDate?: string) => PassbookStatement;
  getCollectionReport: (fromDate: string, toDate: string) => CollectionReport;
  getCommissionReport: (fromDate: string, toDate: string) => CommissionReport;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS.admin);
  const [accounts, setAccounts] = useState<PigmiAccount[]>(MOCK_PIGMI_ACCOUNTS);
  const [collections, setCollections] = useState<CollectionRecord[]>(INITIAL_COLLECTIONS);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentCustomers, setAgentCustomers] = useState<AgentCustomer[]>([]);
  const [lastCreatedReceipt, setLastCreatedReceipt] = useState<CollectionRecord | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [serverLockStatus, setServerLockStatus] = useState<RemittanceStatus | null>(null);

  const fetchLockStatus = async (agentIdInput?: string | number): Promise<RemittanceStatus | null> => {
    const rawId = (agentIdInput || currentUser.agentId || (await AsyncStorage.getItem('AGENT_ID')) || '1').toString().replace('agt_', '');
    try {
      const res = await apiClient.get(`/api/PigmyApp/CollectionStatus?agentId=` + rawId);
      if (res.data) {
        const data: RemittanceStatus = {
          agentId: res.data.agentId ?? rawId,
          collect_Pigmi: res.data.collect_Pigmi ?? (res.data.status === 'LOCKED' ? 0 : 1),
          is_pending: res.data.is_pending ?? (res.data.status === 'LOCKED' ? 1 : 0),
          status: res.data.status === 'LOCKED' ? 'LOCKED' : 'ALLOWED',
          message: res.data.message || (res.data.status === 'LOCKED' ? 'à¤à¤œà¤‚à¤Ÿ à¤²à¥‰à¤• à¤†à¤¹à¥‡. à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¬à¤à¤•à¥‡à¤¤ à¤°à¤•à¥à¤•à¤® à¤­à¤°à¤¾.' : 'à¤•à¤®à¤¿à¤¶à¤¨ à¤µ à¤ªà¤¿à¤—à¥à¤®à¥€ à¤•à¤²à¥‡à¤•à¥à¤¶à¤¨à¤¸à¤¾à¤ à¥€ à¤à¤œà¤‚à¤Ÿ à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤†à¤¹à¥‡.'),
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
            productTitle: 'à¤ªà¤¿à¤—à¥à¤®à¥€ à¤ à¥‡à¤µ',
            paymentMode: 'CASH' as const,
            timestamp: dateStr,
            status: 'VERIFIED' as const,
            syncStatus: 'SYNCED' as const,
            notes: 'à¤¸à¤°à¥à¤µà¥à¤¹à¤°à¤µà¤°à¥€à¤² à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤¸à¤‚à¤•à¤²à¤¨'
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
    const rawAgentId = currentUser.agentId ? currentUser.agentId.replace('agt_', '') : (await AsyncStorage.getItem('AGENT_ID') || '1');
    setIsLoadingAccounts(true);
    try {
      await Promise.allSettled([
        fetchAgentAccounts(rawAgentId),
        fetchAgentCustomers(rawAgentId),
        fetchLockStatus(rawAgentId),
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
        const credentials = await Keychain.getGenericPassword({
          authenticationPrompt: {
            title: 'Authentication Required',
            subtitle: 'Please verify to unlock your session'
          }
        });
        const savedAgentId = await AsyncStorage.getItem('AGENT_ID');
        if (credentials && credentials.password) {
          const token = credentials.password;
          await AsyncStorage.setItem('AUTH_TOKEN', token);
          setAuthToken('Bearer ' + token);
          setIsAuthenticated(true);
          setCurrentRole('AGENT');
          if (savedAgentId) {
            const cachedUserStr = await AsyncStorage.getItem('CURRENT_USER');
            if (cachedUserStr) {
              setCurrentUser(JSON.parse(cachedUserStr));
            }
            await fetchAgentAccounts(savedAgentId);
            await fetchAgentCustomers(savedAgentId);
            await fetchAndReconcileTodaysCollections(savedAgentId);
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
      } catch (e) {
        console.error('Failed to load token', e);
      }
    };
    
    const loadPendingCollections = async () => {
      try {
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

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await apiClient.get('/api/PigmyAgents');
        const data = response.data;
        const agentList = Array.isArray(data) ? data : (data.value || []);
        const mappedAgents: AgentSummary[] = agentList.map((agent: any) => ({
          id: `agt_${agent.pigmyAgentID}`,
          name: agent.agentName || 'Unknown Agent',
          phone: agent.mobileNo || '',
          assignedCustomersCount: 0,
          todayTargetAmount: 0,
          todayCollectedAmount: 0,
          pendingCustomersCount: 0,
          status: agent.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
        }));
        if (mappedAgents.length > 0) {
          setAgents(mappedAgents);
        }
      } catch (error) {
        console.error('Error fetching pigmy agents:', error);
      }
    };
    fetchAgents();
  }, []);

  const agentId = currentUser.agentId || 'agt_101';

  const login = async (username?: string, password?: string, role?: UserRole, credential?: any) => {
    let targetRole = role || 'AGENT';
    let loggedInUser = MOCK_USERS.admin;

    if (targetRole === 'ADMIN') {
      loggedInUser = MOCK_USERS.admin;
    } else if (targetRole === 'CUSTOMER') {
      loggedInUser = MOCK_USERS.customer;
    } else if (targetRole === 'AGENT') {
      let rawAgentId = '1';
      if (username && password) {
        // Dynamic login via Axios
        try {
          const response = await apiClient.post('/api/auth/login', { username, password });
          const token = response.data.token || response.data.access_token;
          if (token) {
            await Keychain.setGenericPassword(username, token, {
              accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
            });
            await AsyncStorage.setItem('AUTH_TOKEN', token);

            // Self-verification: verify secret is persisted successfully
            const verifiedToken = await AsyncStorage.getItem('AUTH_TOKEN');
            const verifiedKeychain = await Keychain.getGenericPassword();
            if (!verifiedToken || !verifiedKeychain) {
              console.warn('Secret verification check: re-persisting auth token');
              await AsyncStorage.setItem('AUTH_TOKEN', token);
            }

            setAuthToken('Bearer ' + token);
          }
          
          const extractedAgentId = (
            response.data.agentId || 
            response.data.pigmyAgentID || 
            response.data.id || 
            response.data.userId || 
            response.data.user?.id || 
            response.data.agent?.agentId || 
            '1'
          );
          rawAgentId = extractedAgentId.toString().replace('agt_', '');
          await AsyncStorage.setItem('AGENT_ID', rawAgentId);

          // GET /api/PigmyAgents/{agentId}: Agent's personal info
          let agentDetails: any = null;
          try {
            agentDetails = await fetchAgentProfile(rawAgentId);
          } catch (e) {
            console.log('Error fetching agent details:', e);
          }

          loggedInUser = {
            id: `usr_${rawAgentId}`,
            name: agentDetails?.agentName || response.data.name || response.data.agentName || username,
            email: '',
            phone: agentDetails?.mobileNo || agentDetails?.phone || response.data.phone || '+91 00000 00000',
            role: 'AGENT',
            agentId: `agt_${rawAgentId}`,
            limit: agentDetails?.limit || agentDetails?.dailyLimit || response.data.limit,
            username: agentDetails?.userName || username,
          };
        } catch (error) {
          console.error('Login failed', error);
          throw error;
        }
      } else {
        // Fallback for mock roles if used
        rawAgentId = (credential?.agentId || '1').toString().replace('agt_', '');
        await AsyncStorage.setItem('AGENT_ID', rawAgentId);

        let agentDetails: any = null;
        try {
          agentDetails = await fetchAgentProfile(rawAgentId);
        } catch (e) {
          console.log('Error fetching agent details:', e);
        }

        loggedInUser = {
          id: `usr_${rawAgentId}`,
          name: agentDetails?.agentName || credential?.name || 'Suresh Patil',
          email: '',
          phone: agentDetails?.mobileNo || agentDetails?.phone || credential?.phone || '+91 00000 00000',
          role: 'AGENT',
          agentId: `agt_${rawAgentId}`,
          limit: agentDetails?.limit || agentDetails?.dailyLimit,
          username: agentDetails?.userName || credential?.username,
        };
      }
      
      // 1. GET /api/PigmyAccounts/Agent/{agentId}: Agent's pigmy accounts
      await fetchAgentAccounts(rawAgentId);

      // 2. GET /api/PigmyApp/customers?agentId={agentId} or /api/PigmyAgents/{agentId}/customers: Distinct Customers
      await fetchAgentCustomers(rawAgentId);
      await fetchLockStatus(rawAgentId);
      // 3. Compare and reconcile server collections with phone memory on login
      try {
        await fetchAndReconcileTodaysCollections(rawAgentId);
      } catch (e) {
        console.warn('Error reconciling collections on login:', e);
      }
    }

    await AsyncStorage.setItem('CURRENT_USER', JSON.stringify(loggedInUser));
    setCurrentUser(loggedInUser);
    setCurrentRole(targetRole);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await Keychain.resetGenericPassword();
    await AsyncStorage.removeItem('AGENT_ID');
    await AsyncStorage.removeItem('AUTH_TOKEN');
    setAuthToken('');
    setAgentCustomers([]);
    setIsAuthenticated(false);
  };

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
      const rawAccountId = parseInt(accountId.replace('acc_', ''), 10) || 5; 
      const rawAgentId = parseInt(agentId.replace('agt_', ''), 10) || 2;

      await apiClient.post('/api/collections', {
        accountId: rawAccountId,
        pigmyAccountId: rawAccountId,
        accountNo: account.accountNumber,
        oldAccountNo: account.oldAccountNo || '',
        amount,
        timestamp: now.toISOString(),
        transactionId: newRecord.transactionId,
        offlineSync: false,
        agentId: rawAgentId,
        paymentMode
      });
      
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
    const rawAgentId = (currentUser.agentId || '1').toString().replace('agt_', '');
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
      if (cleanCustId && cleanCustId !== '0') {
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
              if (!exists && res.data.pigmyAccounts) {
                res.data.pigmyAccounts.unshift({
                  accountId: effectiveAccIdNum || 1,
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
      customerId: cleanCustId || targetCustomer?.customerId || '1',
      cifNo: fallbackCustomer?.cifNo || matchedPigmy[0]?.cifNo || `CIF-${cleanCustId}`,
      customerName: fallbackCustomer?.customerName || matchedPigmy[0]?.customerName || 'ग्राहक (Customer)',
      mobileNo,
      address,
      pigmyAccounts: matchedPigmy.map(p => ({
        accountId: parseInt(p.id.replace('acc_', ''), 10) || 1,
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

    const rawAgentId = parseInt((currentUser.agentId || '1').toString().replace('agt_', ''), 10) || 1;
    const rawAccountId = typeof accountId === 'string' ? (parseInt(accountId.replace(/^[a-z_]+/, ''), 10) || 1) : accountId;

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
          latitude: latitude || '16.7050',
          longitude: longitude || '74.2433',
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

    } catch (err: any) {
      if (err.response && err.response.status === 400 && err.response.data && err.response.data.message) {
        const pendingRaw2 = await AsyncStorage.getItem('PENDING_COLLECTIONS');
        if (pendingRaw2) {
          const pendingQueue2 = JSON.parse(pendingRaw2).filter((c: CollectionRecord) => c.id !== newRecord.id);
          await AsyncStorage.setItem('PENDING_COLLECTIONS', JSON.stringify(pendingQueue2));
        }
        setCollections(prev => prev.filter(c => c.id !== newRecord.id));

        if (err.response.data.status === 'LOCKED' || (err.response.data.message && err.response.data.message.includes('à¤²à¥‰à¤•'))) {
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

  const getDashboardSummary = (): DashboardSummary => {
    const rawId = (currentUser.agentId || agentId || '1').toString().replace('agt_', '');
    const myCollections = collections.filter(c => 
      !c.agentId || 
      c.agentId === `agt_${rawId}` || 
      c.agentId === rawId || 
      c.agentId.replace('agt_', '') === rawId
    );
    const todaysCollection = myCollections.reduce((sum, c) => sum + c.amount, 0);
    return {
      date: new Date().toISOString().split('T')[0],
      openingBalance: 12500,
      todaysCollection,
      totalReceipts: myCollections.length,
      closingBalance: 12500 + todaysCollection,
    };
  };

  const checkLockStatus = (): RemittanceStatus => {
    if (serverLockStatus) {
      return serverLockStatus;
    }

    return {
      agentId,
      collect_Pigmi: 1,
      is_pending: 0,
      status: 'ALLOWED',
      message: 'à¤•à¤®à¤¿à¤¶à¤¨ à¤µ à¤ªà¤¿à¤—à¥à¤®à¥€ à¤•à¤²à¥‡à¤•à¥à¤¶à¤¨à¤¸à¤¾à¤ à¥€ à¤à¤œà¤‚à¤Ÿ à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤†à¤¹à¥‡.',
      previousDaysCollectionDetails: []
    };
  };

  const createCustomer = async (data: Partial<AgentCustomerRequest>): Promise<any> => {
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
      let errorMsg = 'à¤—à¥à¤°à¤¾à¤¹à¤• à¤¨à¥‹à¤‚à¤¦à¤£à¥€ à¤•à¤°à¤¤à¤¾à¤¨à¤¾ à¤¤à¥à¤°à¥à¤Ÿà¥€ à¤†à¤²à¥€.';
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

      const rawAgentId = parseInt((currentUser?.agentId || agentId || '1').replace('agt_', ''), 10) || 1;
      const syncedIds: string[] = [];
      const updatedReceiptMap: { [id: string]: { receiptNo?: string; newBalance?: number } } = {};

      let lastErrorMsg = '';
      // Try bulk endpoint first if available
      let bulkSucceeded = false;
      try {
        const apiItems = pendingQueue.map(item => {
          const matchedAcc = accounts.find(a => a.id === item.accountId || a.accountNumber === item.accountNumber);
          return {
            pigmyAccountId: parseInt(String(item.accountId).replace('acc_', ''), 10) || 1,
            accountNo: item.accountNumber || matchedAcc?.accountNumber || '',
            oldAccountNo: item.oldAccountNo || matchedAcc?.oldAccountNo || '',
            collectionAmount: item.amount,
            collectionDate: new Date().toISOString(),
            receiptNo: item.receiptNo,
            transactionId: item.transactionId
          };
        });

        await apiClient.post('/api/PigmyApp/BulkCollection', {
          agentId: rawAgentId,
          items: apiItems
        });
        bulkSucceeded = true;
        pendingQueue.forEach(p => syncedIds.push(p.id));
      } catch (bulkErr: any) {
        const bMsg = bulkErr?.response?.data?.message || bulkErr?.response?.data || bulkErr?.message;
        if (bMsg) lastErrorMsg = typeof bMsg === 'string' ? bMsg : (bMsg.message || JSON.stringify(bMsg));
        console.warn('Bulk endpoint failed, falling back to individual sync:', bulkErr?.message);
      }

      // If bulk failed, sync each item individually
      if (!bulkSucceeded) {
        for (const item of pendingQueue) {
          try {
            const rawAccountId = parseInt(String(item.accountId).replace('acc_', ''), 10) || 1;
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
                remarks: item.remarks || item.notes || 'आरडी हप्ता'
              });
            } else {
              // PIGMY
              try {
                res = await apiClient.post('/api/PigmyApp/collect', {
                  agentId: rawAgentId,
                  pigmyAccountId: rawAccountId,
                  amount: item.amount,
                  paymentMode: item.paymentMode,
                  syncReferenceId: uuid,
                  receiptNo: item.receiptNo,
                  remarks: item.remarks || item.notes || 'दैनिक ठेव'
                });
              } catch (pigmyErr: any) {
                res = await apiClient.post('/api/collections', {
                  accountId: rawAccountId,
                  pigmyAccountId: rawAccountId,
                  accountNo: item.accountNumber,
                  oldAccountNo: item.oldAccountNo || '',
                  amount: item.amount,
                  timestamp: new Date().toISOString(),
                  transactionId: item.transactionId,
                  syncReferenceId: uuid,
                  receiptNo: item.receiptNo,
                  offlineSync: false,
                  agentId: rawAgentId,
                  paymentMode: item.paymentMode
                });
              }
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
    const commissionRate = 2.5;
    const calculatedCommission = (report.totalCollectedAmount * commissionRate) / 100;
    
    return {
      agentId,
      fromDate,
      toDate,
      totalCollectedAmount: report.totalCollectedAmount,
      commissionRate,
      rateType: 'PERCENTAGE',
      calculatedCommission,
      paidCommission: 0,
      pendingCommission: calculatedCommission,
      paidVouchersCount: 0
    };
  };

  // Save today's collection history to local storage so they remain in "Collected" tab even after sync
  useEffect(() => {
    if (!isAuthenticated || collections.length === 0) return;
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
  }, [collections, isAuthenticated]);

  // Automatic Background Sync Listener
  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated, agentId]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentRole,
        currentUser,
        login,
        logout,
        accounts,
        collections,
        agents,
        agentCustomers,
        fetchAgentProfile,
        fetchAgentAccounts,
        fetchAgentCustomers,
        addCollectionRecord,
        lastCreatedReceipt,
        clearLastReceipt,
        getDashboardSummary,
        checkLockStatus,
        createCustomer,
        fetchPigmySchemes,
        fetchDropdowns,
        bulkSyncCollections,
        getPassbookStatement,
        getCollectionReport,
        getCommissionReport,
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
