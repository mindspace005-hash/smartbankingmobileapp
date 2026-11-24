import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Wallet,
  Briefcase,
  Calculator,
  UserCircle2,
} from 'lucide-react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';
import {
  CollectionRecord,
  CustomerFullPortalPayload,
  CustomerPortalAccountItem,
  CustomerLoanEmiItem,
} from '../../types';
import { CustomerDashboardProvider, ServiceModalPrefill } from './CustomerDashboardContext';
import {
  CustomerPassbookModal,
  FdCertificateModal,
  LoanEmiScheduleModal,
} from './CustomerModals';
import { CustomerHomeTab } from './tabs/CustomerHomeTab';
import { CustomerAccountsTab } from './tabs/CustomerAccountsTab';
import { CustomerServicesTab } from './tabs/CustomerServicesTab';
import { CustomerCalculatorsTab } from './tabs/CustomerCalculatorsTab';
import { CustomerProfileTab } from './tabs/CustomerProfileTab';
import { triggerLightHaptic, triggerSuccessHaptic } from '../../utils/haptics';

interface CustomerDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

const Tab = createBottomTabNavigator();

export const CustomerDashboard: React.FC<CustomerDashboardProps> = () => {
  const { colors } = useThemeColors();
  const { showToast } = useToast();
  const {
    isDemoMode,
    collections,
    customerServiceRequests,
    managerApprovals,
    fetchCustomerFullPortal,
    fetchCustomerAccountPassbook,
    fetchCustomerLoanSchedule,
    submitCustomerServiceRequest,
  } = useAuth();

  const [data, setData] = useState<CustomerFullPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideBalances, setHideBalances] = useState(false);

  // Modals State
  const [passbookLoading, setPassbookLoading] = useState(false);
  const [passbookData, setPassbookData] = useState<{
    productType: string;
    accountNo: string;
    currentBalance: number;
    transactions: any[];
  } | null>(null);
  const [selectedFd, setSelectedFd] = useState<CustomerPortalAccountItem | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<CustomerPortalAccountItem | null>(null);
  const [loanSchedule, setLoanSchedule] = useState<CustomerLoanEmiItem[]>([]);
  const [serviceModalPrefill, setServiceModalPrefill] = useState<ServiceModalPrefill | null>(null);

  const fetchRef = useRef(fetchCustomerFullPortal);
  fetchRef.current = fetchCustomerFullPortal;

  const reloadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const payload = await fetchRef.current();
      setData(payload);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'खाते माहिती लोड करताना अडचण आली.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const demoCollectionsCount = isDemoMode ? collections.length : 0;

  useEffect(() => {
    let mounted = true;
    fetchRef
      .current()
      .then((payload) => {
        if (mounted) {
          setData(payload);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || 'खाते माहिती लोड करताना अडचण आली.');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [isDemoMode, demoCollectionsCount, customerServiceRequests, managerApprovals]);

  const toggleHideBalances = useCallback(() => {
    setHideBalances((p) => !p);
  }, []);

  const maskInr = useCallback(
    (amount: number) => {
      if (hideBalances) return '₹ •••••';
      return `₹${Math.round(Number(amount || 0)).toLocaleString('en-IN')}`;
    },
    [hideBalances]
  );

  const openPassbook = useCallback(
    async (productType: string, accountId: number) => {
      if (productType === 'FD') return;
      triggerLightHaptic();
      setPassbookLoading(true);
      setPassbookData({ productType, accountNo: '', currentBalance: 0, transactions: [] });
      try {
        const pb = await fetchCustomerAccountPassbook(productType, accountId);
        setPassbookData(pb);
      } catch {
        setPassbookData(null);
      } finally {
        setPassbookLoading(false);
      }
    },
    [fetchCustomerAccountPassbook]
  );

  const openFdCertificate = useCallback((fd: CustomerPortalAccountItem) => {
    triggerLightHaptic();
    setSelectedFd(fd);
  }, []);

  const openLoanSchedule = useCallback(
    async (loan: CustomerPortalAccountItem) => {
      triggerLightHaptic();
      setSelectedLoan(loan);
      const sched = await fetchCustomerLoanSchedule(loan.accountId);
      setLoanSchedule(sched);
    },
    [fetchCustomerLoanSchedule]
  );

  const triggerServiceModal = useCallback((prefill: ServiceModalPrefill) => {
    setServiceModalPrefill(prefill);
  }, []);

  const clearServiceModalPrefill = useCallback(() => {
    setServiceModalPrefill(null);
  }, []);

  const handleRequestFdRenewal = async (fd: CustomerPortalAccountItem) => {
    const req = await submitCustomerServiceRequest({
      type: 'DEPOSIT_OPEN',
      title: `FD नूतनीकरण विनंती (${fd.accountNo})`,
      subtitle: `${fd.schemeName} • मॅच्युरिटी ${fd.maturityDate || ''}`,
      amount: fd.maturityAmount || fd.balance,
    });
    triggerSuccessHaptic();
    showToast(`नूतनीकरण विनंती क्र. ${req.referenceNo} शाखेकडे पाठवली!`, 'success', 'FD Renewal');
    setSelectedFd(null);
  };

  const pendingRequestsCount = useMemo(
    () => (data?.serviceRequests || []).filter((r) => r.status === 'PENDING').length,
    [data?.serviceRequests]
  );

  const ctxValue = useMemo(
    () => ({
      data,
      loading,
      refreshing,
      error,
      reloadData,
      hideBalances,
      toggleHideBalances,
      maskInr,
      openPassbook,
      openFdCertificate,
      openLoanSchedule,
      serviceModalPrefill,
      triggerServiceModal,
      clearServiceModalPrefill,
    }),
    [
      data,
      loading,
      refreshing,
      error,
      reloadData,
      hideBalances,
      toggleHideBalances,
      maskInr,
      openPassbook,
      openFdCertificate,
      openLoanSchedule,
      serviceModalPrefill,
      triggerServiceModal,
      clearServiceModalPrefill,
    ]
  );

  return (
    <CustomerDashboardProvider value={ctxValue}>
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            tabBarActiveTintColor: colors.primaryDark,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              height: 62,
              paddingBottom: 7,
              paddingTop: 6,
            },
            tabBarLabelStyle: {
              fontSize: 10.5,
              fontWeight: '800',
            },
          }}
        >
          <Tab.Screen
            name="CustomerHome"
            component={CustomerHomeTab}
            options={{
              tabBarLabel: 'मुख्यपृष्ठ',
              tabBarIcon: ({ color, size }) => <Home size={size - 3} color={color} />,
            }}
          />
          <Tab.Screen
            name="CustomerAccounts"
            component={CustomerAccountsTab}
            options={{
              tabBarLabel: 'खाती',
              tabBarIcon: ({ color, size }) => <Wallet size={size - 3} color={color} />,
            }}
          />
          <Tab.Screen
            name="CustomerServices"
            component={CustomerServicesTab}
            options={{
              tabBarLabel: 'सेवा',
              tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: colors.primary,
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '800',
              },
              tabBarIcon: ({ color, size }) => <Briefcase size={size - 3} color={color} />,
            }}
          />
          <Tab.Screen
            name="CustomerCalculators"
            component={CustomerCalculatorsTab}
            options={{
              tabBarLabel: 'कॅल्क्युलेटर',
              tabBarIcon: ({ color, size }) => <Calculator size={size - 3} color={color} />,
            }}
          />
          <Tab.Screen
            name="CustomerProfile"
            component={CustomerProfileTab}
            options={{
              tabBarLabel: 'प्रोफाइल',
              tabBarIcon: ({ color, size }) => <UserCircle2 size={size - 3} color={color} />,
            }}
          />
        </Tab.Navigator>

        {/* Shared Customer Detail Modals */}
        <CustomerPassbookModal
          visible={!!passbookData}
          loading={passbookLoading}
          customerName={data?.summary.customerName || 'खातेदार'}
          passbookData={passbookData}
          onClose={() => setPassbookData(null)}
        />

        <FdCertificateModal
          visible={!!selectedFd}
          fd={selectedFd}
          customerName={data?.summary.customerName || 'खातेदार'}
          cifNo={data?.summary.cifNo || '-'}
          onClose={() => setSelectedFd(null)}
          onRequestRenewal={handleRequestFdRenewal}
        />

        <LoanEmiScheduleModal
          visible={!!selectedLoan}
          loan={selectedLoan}
          schedule={loanSchedule}
          onClose={() => setSelectedLoan(null)}
          onOpenPassbook={(loanId) => openPassbook('LOAN', loanId)}
        />
      </View>
    </CustomerDashboardProvider>
  );
};
