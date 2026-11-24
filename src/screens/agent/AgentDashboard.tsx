import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, ArrowDownToLine, Users, BarChart3 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../context/ThemeContext';
import {
  CollectionRecord,
  PigmiAccount,
  PassbookStatement,
  PigmyScheme,
  CustomerDoorstepProfile,
  ProductType,
} from '../../types';
import { AgentDashboardProvider } from './AgentDashboardContext';
import { AgentHomeTab } from './tabs/AgentHomeTab';
import { AgentCollectTab } from './tabs/AgentCollectTab';
import { AgentCustomersTab } from './tabs/AgentCustomersTab';
import { ReportsHubScreen } from './ReportsHubScreen';
import {
  DoorstepHubModal,
  QuickCollectSheet,
  PassbookModal,
  CreateCustomerModal,
} from '../../components/agent/DoorstepCollectionModals';
import { useToast } from '../../components/ui/ToastProvider';
import { PRODUCT_THEME } from '../../theme/tokens';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../../utils/haptics';

interface AgentDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

const Tab = createBottomTabNavigator();

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ onSelectReceipt }) => {
  const {
    accounts,
    collections,
    isDemoMode,
    addCollectionRecord,
    currentUser,
    checkLockStatus,
    createCustomer,
    fetchPigmySchemes,
    bulkSyncCollections,
    getPassbookStatement,
    fetchPassbookStatement,
    agentCustomers,
    fetchCustomerDoorstepProfile,
    collectMultiProduct,
  } = useAuth();

  const { colors, t } = useThemeColors();
  const { showToast } = useToast();

  const [inputAmount, setInputAmount] = useState('500');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false);

  const [doorstepCustomer, setDoorstepCustomer] = useState<PigmiAccount | null>(null);
  const [doorstepProfile, setDoorstepProfile] = useState<CustomerDoorstepProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [collectModalAccount, setCollectModalAccount] = useState<PigmiAccount | null>(null);

  const [selectedProductCollection, setSelectedProductCollection] = useState<{
    productType: ProductType;
    accountId: number | string;
    accountNo: string;
    productTitle: string;
    schemeName?: string;
    currentBalance: number;
    targetAmount: number;
    customerName: string;
    oldAccountNo?: string;
  } | null>(null);

  const [passbookModal, setPassbookModal] = useState<PassbookStatement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [schemes, setSchemes] = useState<PigmyScheme[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);
  const [schemesError, setSchemesError] = useState<string | null>(null);

  useEffect(() => {
    if (!showCreateModal) return;
    setIsLoadingSchemes(true);
    setSchemesError(null);
    fetchPigmySchemes()
      .then((res) => {
        setSchemes(res || []);
        setIsLoadingSchemes(false);
      })
      .catch((err: any) => {
        setIsLoadingSchemes(false);
        setSchemesError(err?.message || 'Failed to load schemes');
      });
  }, [showCreateModal, fetchPigmySchemes]);

  const lockStatus = checkLockStatus();

  const myAssignedAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          !currentUser.agentId ||
          a.agentId === currentUser.agentId ||
          a.agentId === currentUser.agentId.replace('agt_', '') ||
          a.agentId === `agt_${currentUser.agentId.replace('agt_', '')}`
      ),
    [accounts, currentUser.agentId]
  );

  const isDateToday = useCallback((ts: string) => {
    if (!ts) return false;
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return (
      ts.startsWith(now.toLocaleDateString()) ||
      ts.includes(`${d}/${m}/${y}`) ||
      ts.includes(`${pad(d)}/${pad(m)}/${y}`) ||
      ts.includes(`${y}-${pad(m)}-${pad(d)}`)
    );
  }, []);

  const todayCollections = useMemo(
    () => collections.filter((c) => isDateToday(c.timestamp)),
    [collections, isDateToday]
  );

  const pendingSyncCount = useMemo(
    () => collections.filter((c) => c.syncStatus === 'SYNC_PENDING').length,
    [collections]
  );

  const isAccCollectedToday = useCallback(
    (a: PigmiAccount) => {
      const aCleanId = a.id.replace('acc_', '').trim();
      const aAccNo = (a.accountNumber || '').trim().toLowerCase();
      const aOldNo = (a.oldAccountNo || '').trim();
      return todayCollections.some((c) => {
        const cCleanId = String(c.accountId || '').trim().replace('acc_', '');
        const cAccNo = (c.accountNumber || '').trim().toLowerCase();
        const cOldNo = (c.oldAccountNo || '').trim();
        return (
          (aCleanId && cCleanId === aCleanId) ||
          (aAccNo && cAccNo === aAccNo) ||
          (aOldNo && cOldNo === aOldNo)
        );
      });
    },
    [todayCollections]
  );

  const handleSelectCustomer = useCallback(
    async (acc: PigmiAccount) => {
      if (lockStatus.status === 'LOCKED') {
        triggerErrorHaptic();
        showToast(lockStatus.message, 'error', 'एजंट लॉक (Locked)');
        return;
      }
      triggerLightHaptic();
      setDoorstepCustomer(acc);
      setDoorstepProfile(null);
      setIsLoadingProfile(true);
      try {
        let targetCustId = acc.customerId;
        if (!targetCustId && acc.cifNo) {
          const found = agentCustomers.find(
            (c) => c.cifNo && c.cifNo.trim().toUpperCase() === acc.cifNo?.trim().toUpperCase()
          );
          if (found) targetCustId = found.customerId;
        }
        if (!targetCustId) {
          const foundByName = agentCustomers.find(
            (c) =>
              c.customerName &&
              acc.customerName &&
              c.customerName.trim().toLowerCase() === acc.customerName.trim().toLowerCase()
          );
          if (foundByName) targetCustId = foundByName.customerId;
        }
        const profile = await fetchCustomerDoorstepProfile(targetCustId || acc.id, acc);
        setDoorstepProfile(profile);
      } catch {
        // Fallback handled inside fetchCustomerDoorstepProfile
      } finally {
        setIsLoadingProfile(false);
      }
    },
    [agentCustomers, fetchCustomerDoorstepProfile, lockStatus.message, lockStatus.status, showToast]
  );

  const handleSelectProductToCollect = (
    productType: ProductType,
    item: any,
    custName: string,
    oldAccNo?: string
  ) => {
    const target = item.targetAmount || 0;
    const defRemarks =
      productType === 'LOAN'
        ? 'हप्ता वसुली'
        : productType === 'SAVING'
        ? 'बचत ठेव'
        : productType === 'RD'
        ? 'आरडी हप्ता'
        : 'दैनिक ठेव';

    setSelectedProductCollection({
      productType,
      accountId: item.accountId,
      accountNo: item.accountNo,
      productTitle: item.productTitle || PRODUCT_THEME[productType].labelMr,
      schemeName: item.schemeName,
      currentBalance: item.currentBalance || 0,
      targetAmount: target,
      customerName: custName,
      oldAccountNo: oldAccNo || item.oldAccountNo,
    });
    setInputAmount(target > 0 ? String(target) : '100');
    setNotes(defRemarks);
  };

  const handleConfirmMultiCollection = async () => {
    if (!selectedProductCollection) return;
    if (lockStatus.status === 'LOCKED') {
      triggerErrorHaptic();
      showToast(lockStatus.message, 'error', 'Agent Locked');
      return;
    }
    const numericAmount = parseFloat(inputAmount);
    if (!numericAmount || numericAmount <= 0) {
      triggerErrorHaptic();
      showToast('कृपया वैध रक्कम प्रविष्ट करा.', 'warning');
      return;
    }
    if (!isDemoMode && selectedProductCollection.productType === 'SAVING' && numericAmount < 10) {
      triggerErrorHaptic();
      showToast('बचत खात्यात किमान ₹१० जमा आवश्यक आहे.', 'warning');
      return;
    }

    setIsSubmittingCollection(true);
    try {
      const receipt = await collectMultiProduct({
        productType: selectedProductCollection.productType,
        accountId: selectedProductCollection.accountId,
        accountNo: selectedProductCollection.accountNo,
        oldAccountNo: selectedProductCollection.oldAccountNo,
        customerName: selectedProductCollection.customerName,
        amount: numericAmount,
        paymentMode,
        remarks: notes,
      });
      triggerSuccessHaptic();
      showToast(`पावती क्र. ${receipt.receiptNo} यशस्वीरीत्या नोंदवली!`, 'success', 'वसुली पूर्ण');
      setSelectedProductCollection(null);
      setDoorstepCustomer(null);
      setNotes('');
      onSelectReceipt(receipt);
    } catch (err: any) {
      triggerErrorHaptic();
      showToast(err?.message || 'वसुली नोंदवण्यात अडचण आली.', 'error', 'त्रुटी');
    } finally {
      setIsSubmittingCollection(false);
    }
  };

  const handleConfirmLegacyCollection = async () => {
    if (!collectModalAccount) return;
    const numericAmount = parseFloat(inputAmount);
    if (!numericAmount || numericAmount <= 0) {
      triggerErrorHaptic();
      showToast('कृपया वैध रक्कम प्रविष्ट करा.', 'warning');
      return;
    }
    setIsSubmittingCollection(true);
    try {
      const receipt = await addCollectionRecord(collectModalAccount.id, numericAmount, paymentMode, notes);
      triggerSuccessHaptic();
      showToast(`पावती ${receipt.receiptNo} नोंदवली!`, 'success', 'वसुली पूर्ण');
      setCollectModalAccount(null);
      setNotes('');
      onSelectReceipt(receipt);
    } catch (err: any) {
      triggerErrorHaptic();
      showToast(err?.message || 'वसुली अयशस्वी झाली.', 'error');
    } finally {
      setIsSubmittingCollection(false);
    }
  };

  const handleSyncNow = useCallback(async () => {
    if (lockStatus.status === 'LOCKED') {
      showToast(lockStatus.message, 'error', 'Sync Blocked');
      return;
    }
    triggerLightHaptic();
    setIsSyncing(true);
    try {
      const res = await bulkSyncCollections();
      triggerSuccessHaptic();
      showToast(res?.message || 'सर्व पावत्या सिंक झाल्या!', 'success', 'Sync Complete');
    } catch (err: any) {
      triggerErrorHaptic();
      showToast(err?.message || 'सिंक अयशस्वी झाले.', 'error', 'Sync Error');
    } finally {
      setIsSyncing(false);
    }
  }, [bulkSyncCollections, lockStatus.message, lockStatus.status, showToast]);

  const handleCreateCustomerSubmit = async (payload: {
    name: string;
    phone: string;
    deposit: string;
    address: string;
    aadhaar: string;
    pan: string;
    oldAccNo: string;
    schemeId: number;
  }) => {
    if (isDemoMode) {
      if (!payload.name.trim()) {
        showToast('ग्राहकाचे नाव आवश्यक आहे.', 'warning');
        return;
      }
    } else if (!payload.name.trim() || !payload.phone.trim()) {
      showToast('ग्राहकाचे नाव आणि मोबाईल नंबर आवश्यक आहे.', 'warning');
      return;
    }
    const parts = payload.name.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
    const middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';

    try {
      const result = await createCustomer({
        firstName,
        middleName,
        lastName,
        mobileNo: payload.phone.trim(),
        address: payload.address.trim(),
        aadhaarNo: payload.aadhaar.trim(),
        panNo: payload.pan.trim(),
        oldAccountNo: payload.oldAccNo.trim(),
        pigmySchemeID: payload.schemeId,
        dailyDepositAmount: parseFloat(payload.deposit) || 100.0,
      });
      triggerSuccessHaptic();
      showToast(result?.message || 'नवीन ग्राहक नोंदणी विनंती पाठवली!', 'success');
      setShowCreateModal(false);
    } catch (err: any) {
      triggerErrorHaptic();
      showToast(err?.message || 'ग्राहक नोंदणी करताना त्रुटी आली.', 'error');
    }
  };

  const openAccountPassbook = useCallback(
    async (acc: PigmiAccount) => {
      triggerLightHaptic();
      try {
        const stmt = await fetchPassbookStatement(acc.id);
        setPassbookModal(stmt);
      } catch {
        setPassbookModal(getPassbookStatement(acc.id));
      }
    },
    [fetchPassbookStatement, getPassbookStatement]
  );

  const openCreateCustomer = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const contextValue = useMemo(
    () => ({
      myAssignedAccounts,
      todayCollections,
      pendingSyncCount,
      isSyncing,
      handleSyncNow,
      handleSelectCustomer,
      openAccountPassbook,
      openCreateCustomer,
      onSelectReceipt,
      isAccCollectedToday,
    }),
    [
      myAssignedAccounts,
      todayCollections,
      pendingSyncCount,
      isSyncing,
      handleSyncNow,
      handleSelectCustomer,
      openAccountPassbook,
      openCreateCustomer,
      onSelectReceipt,
      isAccCollectedToday,
    ]
  );

  return (
    <AgentDashboardProvider value={contextValue}>
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
              paddingBottom: 8,
              paddingTop: 6,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '700',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={AgentHomeTab}
            options={{
              tabBarLabel: t.home,
              tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} />,
            }}
          />
          <Tab.Screen
            name="Collect"
            component={AgentCollectTab}
            options={{
              tabBarLabel: t.collect,
              tabBarIcon: ({ color, size }) => <ArrowDownToLine size={size - 2} color={color} />,
            }}
          />
          <Tab.Screen
            name="Customers"
            component={AgentCustomersTab}
            options={{
              tabBarLabel: t.customers,
              tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
            }}
          />
          <Tab.Screen
            name="Reports"
            component={ReportsHubScreen}
            options={{
              tabBarLabel: t.reports,
              tabBarIcon: ({ color, size }) => <BarChart3 size={size - 2} color={color} />,
            }}
          />
        </Tab.Navigator>

        {/* Shared Bottom-Sheet Modals */}
        <DoorstepHubModal
          customer={doorstepCustomer}
          profile={doorstepProfile}
          loading={isLoadingProfile}
          onClose={() => setDoorstepCustomer(null)}
          onSelectProduct={handleSelectProductToCollect}
        />

        <QuickCollectSheet
          visible={!!selectedProductCollection}
          title={selectedProductCollection?.productTitle || ''}
          customerName={selectedProductCollection?.customerName || ''}
          accountNo={selectedProductCollection?.accountNo || ''}
          oldAccountNo={selectedProductCollection?.oldAccountNo}
          defaultAmount={selectedProductCollection?.targetAmount}
          amount={inputAmount}
          onChangeAmount={setInputAmount}
          paymentMode={paymentMode}
          onChangeMode={setPaymentMode}
          notes={notes}
          onChangeNotes={setNotes}
          submitting={isSubmittingCollection}
          onCancel={() => setSelectedProductCollection(null)}
          onConfirm={handleConfirmMultiCollection}
        />

        <QuickCollectSheet
          visible={!!collectModalAccount && !selectedProductCollection && !doorstepCustomer}
          title="त्वरित पिग्मी ठेव"
          customerName={collectModalAccount?.customerName || ''}
          accountNo={collectModalAccount?.accountNumber || ''}
          oldAccountNo={collectModalAccount?.oldAccountNo}
          defaultAmount={collectModalAccount?.dailyTargetAmount}
          amount={inputAmount}
          onChangeAmount={setInputAmount}
          paymentMode={paymentMode}
          onChangeMode={setPaymentMode}
          notes={notes}
          onChangeNotes={setNotes}
          submitting={isSubmittingCollection}
          onCancel={() => setCollectModalAccount(null)}
          onConfirm={handleConfirmLegacyCollection}
        />

        <PassbookModal
          statement={passbookModal}
          oldAccountNo={
            passbookModal
              ? accounts.find(
                  (a) =>
                    a.id === `acc_${passbookModal.pigmyAccountId}` ||
                    a.id === String(passbookModal.pigmyAccountId) ||
                    a.accountNumber === passbookModal.accountNo
                )?.oldAccountNo
              : undefined
          }
          onClose={() => setPassbookModal(null)}
        />

        <CreateCustomerModal
          visible={showCreateModal}
          schemes={schemes}
          loadingSchemes={isLoadingSchemes}
          schemesError={schemesError}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCustomerSubmit}
        />
      </View>
    </AgentDashboardProvider>
  );
};
