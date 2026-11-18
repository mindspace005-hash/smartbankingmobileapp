import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useThemeColors, ThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/StatCard';
import { PigmyBookScreen } from './PigmyBookScreen';
import { CollectionRecord, PigmiAccount, PassbookStatement, RemittanceStatus, PigmyScheme, DropdownOptions, ProductType, CustomerDoorstepProfile } from '../../types';

interface AgentDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

type TabType = 'HOME' | 'COLLECTION' | 'REPORTS';

const isDateToday = (ts?: string) => {
  if (!ts) return false;
  const todayStr = new Date().toLocaleDateString();
  const todayIso = new Date().toISOString().split('T')[0];
  if (ts.startsWith(todayStr) || ts.startsWith(todayIso)) return true;
  const parsed = new Date(ts);
  if (!isNaN(parsed.getTime())) {
    const today = new Date();
    return parsed.getFullYear() === today.getFullYear() &&
           parsed.getMonth() === today.getMonth() &&
           parsed.getDate() === today.getDate();
  }
  return false;
};

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ onSelectReceipt }) => {
  const { colors } = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { 
    accounts, 
    collections, 
    addCollectionRecord, 
    currentUser, 
    agents,
    getDashboardSummary,
    checkLockStatus,
    createCustomer,
    fetchPigmySchemes,
    fetchDropdowns,
    bulkSyncCollections,
    getPassbookStatement,
    getCollectionReport,
    getCommissionReport,
    agentCustomers,
    fetchCustomerDoorstepProfile,
    collectMultiProduct,
    isLoadingAccounts,
    refreshAgentData
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('HOME');

  // HOME TAB STATE
  const currentAgent = agents.find((a) => a.id === (currentUser.agentId || 'agt_101')) || agents[0];
  const myAssignedAccounts = accounts.filter((a) => 
    !currentUser.agentId || 
    a.agentId === currentUser.agentId || 
    a.agentId === currentUser.agentId.replace('agt_', '') ||
    a.agentId === `agt_${currentUser.agentId.replace('agt_', '')}`
  );
  const [selectedAccount, setSelectedAccount] = useState<PigmiAccount>(myAssignedAccounts[0] || accounts[0]);
  const [inputAmount, setInputAmount] = useState<string>(selectedAccount?.dailyTargetAmount?.toString() || '500');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [notes, setNotes] = useState<string>('');
  
  const dashboardSummary = getDashboardSummary();
  const lockStatus = checkLockStatus();

  // CUSTOMERS TAB STATE
  const [collectionSubTab, setCollectionSubTab] = useState<'TRANSACTIONS' | 'COLLECTION'>('COLLECTION');
  const [collectionStatusTab, setCollectionStatusTab] = useState<'UNCOLLECTED' | 'COLLECTED'>('UNCOLLECTED');
  const [collectModalAccount, setCollectModalAccount] = useState<PigmiAccount | null>(null);

  // Doorstep Multi-Product State
  const [doorstepCustomer, setDoorstepCustomer] = useState<PigmiAccount | null>(null);
  const [doorstepProfile, setDoorstepProfile] = useState<CustomerDoorstepProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Selected Product Collection Form
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
    paidInstallments?: number;
    totalDurationMonths?: number;
    interestRate?: number;
  } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  
  // New modal fields
  const [newCustAadhaar, setNewCustAadhaar] = useState('');
  const [newCustPan, setNewCustPan] = useState('');
  const [newCustOldAccNo, setNewCustOldAccNo] = useState('');
  const [newCustSchemeId, setNewCustSchemeId] = useState<number>(0);
  const [newCustDeposit, setNewCustDeposit] = useState('200');
  const [showSchemeDropdown, setShowSchemeDropdown] = useState(false);
  
  const [schemes, setSchemes] = useState<PigmyScheme[]>([]);
  const [dropdowns, setDropdowns] = useState<DropdownOptions | null>(null);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);
  const [schemesError, setSchemesError] = useState<string | null>(null);

  useEffect(() => {
    if (showCreateModal) {
      setIsLoadingSchemes(true);
      setSchemesError(null);
      fetchPigmySchemes().then(res => {
        setSchemes(res || []);
        if (res && res.length > 0) setNewCustSchemeId(res[0].schemeId);
        setIsLoadingSchemes(false);
      }).catch((err: any) => {
        setIsLoadingSchemes(false);
        let msg = err.message || 'Unknown network error';
        if (err.response) {
          msg = `Error ${err.response.status}: ${err.response.data?.message || err.response.statusText || 'Failed to fetch'}`;
        }
        setSchemesError(msg);
      });
      fetchDropdowns().then(res => setDropdowns(res)).catch(e => console.log('Dropdown error', e));
    }
  }, [showCreateModal]);

  const [passbookModal, setPassbookModal] = useState<PassbookStatement | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const filterAccounts = (accs: PigmiAccount[]) => {
    if (!searchQuery.trim()) return accs;
    const q = searchQuery.trim().toLowerCase();

    const matches = accs.filter(a => {
      const oldAcc = (a.oldAccountNo || '').toLowerCase();
      const newAcc = (a.accountNumber || '').toLowerCase();
      const name = (a.customerName || '').toLowerCase();
      const cif = (a.cifNo || '').toLowerCase();
      const id = a.id.toString().replace('acc_', '').toLowerCase();
      return oldAcc.includes(q) || newAcc.includes(q) || name.includes(q) || cif.includes(q) || id.includes(q);
    });

    // Smart Ranking: Exact old account matches first, then prefix matches, then regular matches
    return matches.sort((a, b) => {
      const aOld = (a.oldAccountNo || '').toLowerCase();
      const bOld = (b.oldAccountNo || '').toLowerCase();
      if (aOld === q && bOld !== q) return -1;
      if (bOld === q && aOld !== q) return 1;
      if (aOld.startsWith(q) && !bOld.startsWith(q)) return -1;
      if (bOld.startsWith(q) && !aOld.startsWith(q)) return 1;
      return 0;
    });
  };

  const renderCustomerListLoading = (message = 'ग्राहकांची माहिती लोड होत आहे...') => (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color="#2563EB" style={{ marginBottom: 12 }} />
      <Text style={styles.stateTitle}>{message}</Text>
      <Text style={styles.stateSubtitle}>कृपया प्रतीक्षा करा, सर्व्हरकडून खाती आणली जात आहेत...</Text>
    </View>
  );

  const renderNoCustomersEmptyState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={{ fontSize: 36 }}>👥</Text>
      </View>
      <Text style={styles.stateTitle}>कोणतेही ग्राहक किंवा खाती आढळली नाहीत</Text>
      <Text style={styles.stateEnglishTitle}>No Customers or Accounts Assigned</Text>
      
      <View style={styles.agentInfoBadge}>
        <Text style={styles.agentInfoBadgeText}>
          एजंट: {currentUser.name || 'प्रमोद मुडे'} (ID: {currentUser.agentId?.replace('agt_', '') || '2'})
        </Text>
      </View>

      <Text style={styles.stateDescription}>
        या एजंट खात्याकडे सध्या बँकेच्या सिस्टीममध्ये कोणतीही ग्राहक खाती जोडलेली (Assign) नाहीत.{'\n'}
        नवीन ग्राहक खाती जोडण्यासाठी बँकेशी संपर्क करा किंवा वरील "+ Create New Customer" बटण वापरून नवीन खाते नोंदवा.
      </Text>

      <TouchableOpacity 
        style={styles.retryBtn} 
        onPress={refreshAgentData}
        activeOpacity={0.8}
      >
        <Text style={styles.retryBtnText}>🔄 पुन्हा तपासा (Refresh Data)</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchEmptyState = () => (
    <View style={styles.stateContainer}>
      <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
      <Text style={styles.stateTitle}>'{searchQuery}' साठी कोणतेही खाते सापडले नाही</Text>
      <Text style={styles.stateSubtitle}>No accounts matching your search query.</Text>
      <Text style={styles.stateDescription}>
        कृपया जुना खाते क्र. (उदा. 9), नवीन खाते क्र. किंवा ग्राहकाचे नाव तपासून पुन्हा शोधा.
      </Text>
      <TouchableOpacity 
        style={[styles.retryBtn, { backgroundColor: '#4B5563', marginTop: 12 }]} 
        onPress={() => setSearchQuery('')}
        activeOpacity={0.8}
      >
        <Text style={styles.retryBtnText}>शोध रद्द करा (Clear Search)</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSelectCustomer = async (acc: PigmiAccount) => {
    if (lockStatus.status === 'LOCKED') {
      Alert.alert('एजंट लॉक (Agent Locked)', lockStatus.message);
      return;
    }
    setDoorstepCustomer(acc);
    setDoorstepProfile(null);
    setIsLoadingProfile(true);

    try {
      // 1. Resolve actual customerId: check acc.customerId, or find by CIF or name in agentCustomers
      let targetCustId = acc.customerId;
      if (!targetCustId && acc.cifNo) {
        const found = agentCustomers.find(c => c.cifNo && c.cifNo.trim().toUpperCase() === acc.cifNo?.trim().toUpperCase());
        if (found) targetCustId = found.customerId;
      }
      if (!targetCustId) {
        const foundByName = agentCustomers.find(c => c.customerName && acc.customerName && c.customerName.trim().toLowerCase() === acc.customerName.trim().toLowerCase());
        if (foundByName) targetCustId = foundByName.customerId;
      }

      // 2. Fetch doorstep profile passing targetCustId and acc as hintAccount
      const profile = await fetchCustomerDoorstepProfile(targetCustId || acc.id, acc);
      setDoorstepProfile(profile);
    } catch (e) {
      console.warn('Failed to load doorstep profile', e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSelectProductToCollect = (
    productType: ProductType,
    item: any,
    custName: string,
    oldAccNo?: string
  ) => {
    let target = item.targetAmount || 0;
    let defRemarks = 'दैनिक ठेव';
    if (productType === 'LOAN') defRemarks = 'हप्ता वसुली';
    else if (productType === 'SAVING') defRemarks = 'बचत ठेव';
    else if (productType === 'RD') defRemarks = 'आरडी हप्ता';

    setSelectedProductCollection({
      productType,
      accountId: item.accountId,
      accountNo: item.accountNo,
      productTitle: item.productTitle || (
        productType === 'LOAN' ? 'कर्ज खाते (Loan EMI)' :
        productType === 'SAVING' ? 'बचत ठेव (Saving)' :
        productType === 'RD' ? 'आवर्ती ठेव (RD)' :
        'दैनिक ठेव (Pigmy)'
      ),
      schemeName: item.schemeName,
      currentBalance: item.currentBalance,
      targetAmount: target,
      customerName: custName,
      oldAccountNo: oldAccNo || item.oldAccountNo,
      paidInstallments: item.paidInstallments,
      totalDurationMonths: item.totalDurationMonths,
      interestRate: item.interestRate,
    });
    setInputAmount(target > 0 ? target.toString() : '');
    setNotes(defRemarks);
  };

  const handleRecordMultiProductCollection = async () => {
    if (lockStatus.status === 'LOCKED') {
      Alert.alert('एजंट लॉक (Agent Locked)', lockStatus.message);
      return;
    }
    const numericAmount = parseFloat(inputAmount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('अवैध रक्कम', 'कृपया वैध रक्कम प्रविष्ट करा.');
      return;
    }
    if (selectedProductCollection?.productType === 'SAVING' && numericAmount < 10) {
      Alert.alert('किमान रक्कम', 'बचत खात्यात किमान ₹१० जमा करणे आवश्यक आहे.');
      return;
    }
    if (!selectedProductCollection) return;

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
        latitude: '16.7050',
        longitude: '74.2433'
      });

      Alert.alert(
        'पावती यशस्वी! 🎉',
        `${selectedProductCollection.productTitle} साठी ₹${numericAmount} ची नोंद झाली.\nपावती क्र: ${receipt.receiptNo}`,
        [
          { text: 'पावती पहा (View Receipt)', onPress: () => onSelectReceipt(receipt) },
          { text: 'ठीक आहे (OK)' },
        ]
      );

      setSelectedProductCollection(null);
      setDoorstepCustomer(null);
      setNotes('');
    } catch (err: any) {
      Alert.alert('त्रुटी (Error)', err.message || 'वसुली नोंदवण्यात अडचण आली.');
    }
  };

  const handleRecordCollection = async () => {
    if (lockStatus.status === 'LOCKED') {
      Alert.alert('Agent Locked', lockStatus.message);
      return;
    }
    const numericAmount = parseFloat(inputAmount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      return;
    }
    if (!collectModalAccount) return;
    
    try {
      const receipt = await addCollectionRecord(collectModalAccount.id, numericAmount, paymentMode, notes);
      Alert.alert(
        'Collection Recorded! 🎉',
        `Receipt ${receipt.receiptNo} generated for ${collectModalAccount.customerName}.`,
        [
          { text: 'View Receipt', onPress: () => onSelectReceipt(receipt) },
          { text: 'OK' },
        ]
      );
      setNotes('');
      setCollectModalAccount(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record collection');
    }
  };

  const handleBulkSync = async () => {
    if (lockStatus.status === 'LOCKED') {
      Alert.alert('Sync Blocked', lockStatus.message);
      return;
    }
    // Mock items to sync
    const items = [
      { pigmyAccountId: myAssignedAccounts[0].id, collectionAmount: 200, collectionDate: new Date().toISOString() }
    ];
    const result = await bulkSyncCollections(items);
    Alert.alert('Sync Successful', result.message);
  };

  const handleCreateCustomer = async () => {
    if (!newCustName || !newCustPhone || !newCustSchemeId) {
      Alert.alert('Error', 'Name, phone, and scheme are required.');
      return;
    }
    try {
      const cleanName = newCustName.trim().replace(/\s+/g, ' ');
      const nameParts = cleanName.split(' ').filter(Boolean);

      let firstName = '';
      let middleName = '';
      let lastName = '';

      if (nameParts.length === 1) {
        firstName = nameParts[0];
        lastName = nameParts[0];
      } else if (nameParts.length === 2) {
        firstName = nameParts[0];
        lastName = nameParts[1];
      } else if (nameParts.length > 2) {
        firstName = nameParts[0];
        lastName = nameParts[nameParts.length - 1];
        middleName = nameParts.slice(1, -1).join(' ');
      }

      const result = await createCustomer({
        firstName,
        middleName,
        lastName,
        mobileNo: newCustPhone,
        address: newCustAddress,
        aadhaarNo: newCustAadhaar,
        panNo: newCustPan,
        oldAccountNo: newCustOldAccNo,
        pigmySchemeID: newCustSchemeId,
        dailyDepositAmount: parseFloat(newCustDeposit) || 100.0,
      });
      Alert.alert('Success', result.message || 'Customer registration request sent!');
      setShowCreateModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustAadhaar('');
      setNewCustPan('');
      setNewCustOldAccNo('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };



  const renderCollectionTab = () => (
    <ScrollView 
      contentContainerStyle={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoadingAccounts} onRefresh={refreshAgentData} />
      }
    >
      {lockStatus.status === 'LOCKED' && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>⚠️ {lockStatus.message}</Text>
        </View>
      )}

      {/* Sub Tabs */}
      <View style={styles.subTabBar}>
        <TouchableOpacity style={[styles.subTabBtn, collectionSubTab === 'TRANSACTIONS' && styles.subTabBtnActive]} onPress={() => setCollectionSubTab('TRANSACTIONS')}>
          <Text style={[styles.subTabBtnText, collectionSubTab === 'TRANSACTIONS' && styles.subTabBtnTextActive]}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTabBtn, collectionSubTab === 'COLLECTION' && styles.subTabBtnActive]} onPress={() => setCollectionSubTab('COLLECTION')}>
          <Text style={[styles.subTabBtnText, collectionSubTab === 'COLLECTION' && styles.subTabBtnTextActive]}>Collect Pigmy</Text>
        </TouchableOpacity>
      </View>

      {collectionSubTab === 'TRANSACTIONS' ? (
        <View style={{ gap: 12 }}>
          <View style={styles.stackedCard}>
            <Text style={styles.dashCardTitle}>Opening Balance</Text>
            <Text style={styles.dashCardValue}>₹{dashboardSummary.openingBalance}</Text>
          </View>
          <View style={styles.stackedCard}>
            <Text style={styles.dashCardTitle}>Today's Collection (All Products)</Text>
            <Text style={styles.dashCardValue}>₹{dashboardSummary.todaysCollection.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.stackedCard}>
            <Text style={styles.dashCardTitle}>Closing Balance</Text>
            <Text style={styles.dashCardValue}>₹{dashboardSummary.closingBalance.toLocaleString('en-IN')}</Text>
          </View>

          {/* Today's Transactions List */}
          {(() => {
            const todayCollections = collections.filter(c => isDateToday(c.timestamp));
            return (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.sectionHeader, { marginBottom: 10 }]}>आजच्या जमा नोंदी ({todayCollections.length})</Text>
                {todayCollections.map(c => {
                  const isLoan = c.productType === 'LOAN';
                  const isSaving = c.productType === 'SAVING';
                  const isRd = c.productType === 'RD';
                  const badgeBg = isLoan ? '#FEF3C7' : isSaving ? '#D1FAE5' : isRd ? '#FFEDD5' : '#E0E7FF';
                  const badgeColor = isLoan ? '#B45309' : isSaving ? '#047857' : isRd ? '#C2410C' : '#4338CA';
                  const label = isLoan ? 'कर्ज' : isSaving ? 'बचत' : isRd ? 'RD' : 'पिग्मी';

                  return (
                    <TouchableOpacity 
                      key={c.id} 
                      style={styles.routeRow}
                      onPress={() => onSelectReceipt(c)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <View style={{ backgroundColor: badgeBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '800' }}>{label}</Text>
                          </View>
                          <Text style={styles.routeName}>{c.customerName}</Text>
                        </View>
                        <Text style={styles.routeAcc}>{c.accountNumber} • {c.receiptNo}</Text>
                        <Text style={styles.routeAddr}>{c.timestamp}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#10B981' }}>+₹{c.amount.toLocaleString('en-IN')}</Text>
                        <Text style={{ fontSize: 11, color: c.syncStatus === 'SYNCED' ? '#10B981' : '#F59E0B', fontWeight: '700' }}>
                          {c.syncStatus === 'SYNCED' ? 'Synced' : 'Pending'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {todayCollections.length === 0 && (
                  <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 12 }}>आज कोणतीही वसुली नोंदवलेली नाही.</Text>
                )}
              </View>
            );
          })()}
        </View>
      ) : (
        <View>


          {(() => {
            const todayCollections = collections.filter(c => isDateToday(c.timestamp));

            const isAccCollectedToday = (a: PigmiAccount) => {
              const aCleanId = a.id.replace('acc_', '').trim();
              const aAccNo = (a.accountNumber || '').trim().toLowerCase();
              const aOldNo = (a.oldAccountNo || '').trim();

              return todayCollections.some(c => {
                const cIdStr = String(c.accountId || '').trim();
                const cCleanId = cIdStr.replace('acc_', '');
                const cAccNo = (c.accountNumber || '').trim().toLowerCase();
                const cOldNo = (c.oldAccountNo || '').trim();

                return (
                  cIdStr === a.id ||
                  cCleanId === aCleanId ||
                  `acc_${cCleanId}` === a.id ||
                  (aAccNo && cAccNo && aAccNo === cAccNo) ||
                  (aOldNo && cOldNo && aOldNo === cOldNo)
                );
              });
            };

            const uncollectedAccounts = myAssignedAccounts.filter(a => !isAccCollectedToday(a));
            const collectedAccounts = myAssignedAccounts.filter(a => isAccCollectedToday(a));
            const displayedAccounts = filterAccounts(collectionStatusTab === 'UNCOLLECTED' ? uncollectedAccounts : collectedAccounts);

            return (
              <View style={styles.card}>
                <View style={styles.inputField}>
                  <Text style={{ marginRight: 8, fontSize: 16 }}>🔍</Text>
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="जुना क्र. (उदा. 9), नाव, किंवा खाते क्र..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <View style={[styles.subTabBar, { backgroundColor: '#F3F4F6', marginBottom: 12 }]}>
                  <TouchableOpacity style={[styles.subTabBtn, collectionStatusTab === 'UNCOLLECTED' && styles.subTabBtnActive]} onPress={() => setCollectionStatusTab('UNCOLLECTED')}>
                    <Text style={[styles.subTabBtnText, collectionStatusTab === 'UNCOLLECTED' && styles.subTabBtnTextActive]}>Uncollected ({uncollectedAccounts.length})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.subTabBtn, collectionStatusTab === 'COLLECTED' && styles.subTabBtnActive]} onPress={() => setCollectionStatusTab('COLLECTED')}>
                    <Text style={[styles.subTabBtnText, collectionStatusTab === 'COLLECTED' && styles.subTabBtnTextActive]}>Collected ({collectedAccounts.length})</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingAccounts ? (
                  renderCustomerListLoading('ग्राहकांची यादी सर्व्हरवरून लोड होत आहे...')
                ) : myAssignedAccounts.length === 0 ? (
                  renderNoCustomersEmptyState()
                ) : displayedAccounts.length === 0 ? (
                  searchQuery.trim() ? (
                    renderSearchEmptyState()
                  ) : collectionStatusTab === 'UNCOLLECTED' ? (
                    <View style={styles.stateContainer}>
                      <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
                      <Text style={[styles.stateTitle, { color: '#059669' }]}>सर्व वसुली पूर्ण झाली आहे!</Text>
                      <Text style={styles.stateSubtitle}>All collections completed for today.</Text>
                      <Text style={styles.stateDescription}>
                        आजच्या सर्व {collectedAccounts.length} ग्राहकांची वसुली यशस्वीरित्या नोंदवली गेली आहे.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.stateContainer}>
                      <Text style={{ fontSize: 36, marginBottom: 8 }}>⏳</Text>
                      <Text style={styles.stateTitle}>आज अजून कोणतीही वसुली झालेली नाही</Text>
                      <Text style={styles.stateSubtitle}>No collections done yet today.</Text>
                      <Text style={styles.stateDescription}>
                        'Uncollected' टॅबमधून ग्राहकांची वसुली नोंदवा.
                      </Text>
                    </View>
                  )
                ) : (
                  displayedAccounts.map(acc => {
                    const accCleanId = acc.id.replace('acc_', '').trim();
                    const accAccNo = (acc.accountNumber || '').trim().toLowerCase();
                    const accCollection = todayCollections.find(c => {
                      const cIdStr = String(c.accountId || '').trim();
                      const cCleanId = cIdStr.replace('acc_', '');
                      const cAccNo = (c.accountNumber || '').trim().toLowerCase();
                      return cIdStr === acc.id || cCleanId === accCleanId || (accAccNo && cAccNo && accAccNo === cAccNo);
                    });
                    const isPending = accCollection?.syncStatus === 'SYNC_PENDING';

                    return (
                      <View key={acc.id} style={styles.routeRow}>
                        <View style={styles.routeLeft}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.routeName}>{acc.customerName}</Text>
                            {acc.oldAccountNo ? (
                              <View style={styles.oldAccountBadge}>
                                <Text style={styles.oldAccountBadgeText}>जुना क्र. {acc.oldAccountNo}</Text>
                              </View>
                            ) : null}
                            <Text style={styles.routeAcc}>खाते क्र: {acc.accountNumber}</Text>
                          </View>
                        </View>
                        {collectionStatusTab === 'UNCOLLECTED' ? (
                          <TouchableOpacity style={styles.collectBtn} onPress={() => handleSelectCustomer(acc)}>
                            <Text style={styles.collectBtnText}>Collect</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.collectBtn, { 
                            backgroundColor: isPending ? '#F59E0B' : '#10B981', 
                            borderWidth: 0, 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: 6,
                            paddingHorizontal: 12
                          }]}>
                            <Text style={{ fontSize: 12 }}>{isPending ? '🕒' : '✅'}</Text>
                            <Text style={[styles.collectBtnText, { color: '#FFF' }]}>{isPending ? 'Pending' : 'Synced'}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            );
          })()}
        </View>
      )}
    </ScrollView>
  );

  const renderHomeTab = () => (
    <ScrollView 
      contentContainerStyle={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoadingAccounts} onRefresh={refreshAgentData} />
      }
    >
      <TouchableOpacity style={styles.createCustBtn} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.createCustBtnText}>+ Create New Customer</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>
        Assigned Customer Accounts {myAssignedAccounts.length > 0 ? `(${myAssignedAccounts.length})` : ''}
      </Text>
      
      <View style={[styles.inputField, { marginBottom: 16, backgroundColor: '#FFFFFF' }]}>
        <Text style={{ marginRight: 8, fontSize: 16 }}>🔍</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder="जुना क्र. (उदा. 9), नाव, किंवा खाते क्र..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.trim() ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 16, color: '#9CA3AF' }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoadingAccounts ? (
        renderCustomerListLoading('ग्राहकांची माहिती लोड होत आहे...')
      ) : myAssignedAccounts.length === 0 ? (
        renderNoCustomersEmptyState()
      ) : filterAccounts(myAssignedAccounts).length === 0 ? (
        renderSearchEmptyState()
      ) : (
        filterAccounts(myAssignedAccounts).map(acc => (
          <TouchableOpacity 
            key={acc.id} 
            style={styles.routeRow}
            onPress={() => setPassbookModal(getPassbookStatement(acc.id))}
          >
            <View style={styles.routeLeft}>
              <View style={[styles.routeAvatar, { backgroundColor: '#E0E7FF' }]}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeName}>{acc.customerName}</Text>
                {acc.oldAccountNo ? (
                  <View style={styles.oldAccountBadge}>
                    <Text style={styles.oldAccountBadgeText}>जुना क्र. {acc.oldAccountNo}</Text>
                  </View>
                ) : null}
                <Text style={styles.routeAcc}>खाते क्र: {acc.accountNumber}</Text>
                <Text style={styles.routeAddr}>Bal: ₹{acc.currentBalance}</Text>
              </View>
            </View>
            <View style={styles.selectBtn}>
              <Text style={styles.selectBtnText}>Passbook</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Create Customer Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>New Pigmi Account Onboarding</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputField}>
                <TextInput style={styles.textInput} value={newCustName} onChangeText={setNewCustName} placeholder="E.g. Vikas Shinde" />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Mobile No</Text>
                  <View style={styles.inputField}>
                    <TextInput style={styles.textInput} value={newCustPhone} onChangeText={setNewCustPhone} keyboardType="phone-pad" />
                  </View>
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Daily Deposit (₹)</Text>
                  <View style={styles.inputField}>
                    <TextInput style={styles.textInput} value={newCustDeposit} onChangeText={setNewCustDeposit} keyboardType="numeric" />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Address</Text>
              <View style={styles.inputField}>
                <TextInput style={styles.textInput} value={newCustAddress} onChangeText={setNewCustAddress} placeholder="Street, City, Pincode" />
              </View>

              <Text style={styles.label}>Aadhaar No</Text>
              <View style={styles.inputField}>
                <TextInput style={styles.textInput} value={newCustAadhaar} onChangeText={setNewCustAadhaar} keyboardType="numeric" maxLength={12} />
              </View>

              <Text style={styles.label}>PAN No</Text>
              <View style={styles.inputField}>
                <TextInput style={styles.textInput} value={newCustPan} onChangeText={setNewCustPan} autoCapitalize="characters" maxLength={10} />
              </View>

              <Text style={styles.label}>Old A/c No (जुना खाते क्र. - ऐच्छिक)</Text>
              <View style={styles.inputField}>
                <TextInput style={styles.textInput} value={newCustOldAccNo} onChangeText={setNewCustOldAccNo} placeholder="उदा. 9" />
              </View>

              <Text style={styles.label}>Select Scheme</Text>
              <View style={{ marginBottom: 16 }}>
                <TouchableOpacity 
                  style={[styles.inputField, { justifyContent: 'space-between' }]} 
                  onPress={() => setShowSchemeDropdown(!showSchemeDropdown)}
                  disabled={schemes.length === 0}
                >
                  <Text style={{ fontSize: 16, color: newCustSchemeId ? '#1F2937' : '#9CA3AF' }}>
                    {schemes.find(s => s.schemeId === newCustSchemeId)?.schemeName || 'Select a scheme'}
                  </Text>
                  <Text style={{ color: '#6B7280' }}>▼</Text>
                </TouchableOpacity>

                {showSchemeDropdown && schemes.length > 0 && (
                  <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginTop: 4, maxHeight: 150, elevation: 2 }}>
                    <ScrollView nestedScrollEnabled={true}>
                      {schemes.map(s => (
                        <TouchableOpacity 
                          key={s.schemeId} 
                          style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                          onPress={() => {
                            setNewCustSchemeId(s.schemeId);
                            setShowSchemeDropdown(false);
                          }}
                        >
                          <Text style={{ fontSize: 16, color: '#1F2937' }}>{s.schemeName}</Text>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>{s.interestRate}% Interest</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {isLoadingSchemes ? (
                  <Text style={{ color: '#9CA3AF', marginTop: 4 }}>Loading schemes...</Text>
                ) : schemesError ? (
                  <Text style={{ color: '#EF4444', marginTop: 4 }}>{schemesError}</Text>
                ) : (
                  schemes.length === 0 && <Text style={{ color: '#EF4444', marginTop: 4 }}>No schemes available.</Text>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateCustomer}>
                  <Text style={styles.saveBtnText}>Submit Application</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Passbook Modal */}
      {passbookModal && (
        <Modal visible={true} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Passbook Statement</Text>
              <Text style={styles.pbText}>{passbookModal.memberName}</Text>
              <Text style={styles.pbText}>खाते क्र: {passbookModal.accountNo}</Text>
              {(() => {
                const matched = accounts.find(a => a.id === `acc_${passbookModal.pigmyAccountId}` || a.id === String(passbookModal.pigmyAccountId) || a.accountNumber === passbookModal.accountNo);
                return matched?.oldAccountNo ? (
                  <Text style={[styles.pbText, { color: '#047857', fontWeight: '700' }]}>जुना: {matched.oldAccountNo}</Text>
                ) : null;
              })()}
              <Text style={styles.pbBold}>Total Credit: ₹{passbookModal.totalCredit}</Text>
              
              <View style={styles.pbDivider} />
              <ScrollView style={styles.pbScroll}>
                {passbookModal.transactions.map((tx, idx) => (
                  <View key={idx} style={styles.pbTxRow}>
                    <View>
                      <Text style={styles.pbTxDate}>{tx.date}</Text>
                      <Text style={styles.pbTxRec}>{tx.receiptNo}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.pbTxAmount}>+ ₹{tx.creditAmount}</Text>
                      <Text style={styles.pbTxBal}>Bal: ₹{tx.runningBalance}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              
              <TouchableOpacity style={styles.saveBtn} onPress={() => setPassbookModal(null)}>
                <Text style={styles.saveBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );

  const renderReportsTab = () => {
    return (
      <View style={{ flex: 1 }}>
        <PigmyBookScreen />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'HOME' && styles.tabBtnActive]} onPress={() => setActiveTab('HOME')}>
          <Text style={[styles.tabBtnText, activeTab === 'HOME' && styles.tabBtnTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'COLLECTION' && styles.tabBtnActive]} onPress={() => setActiveTab('COLLECTION')}>
          <Text style={[styles.tabBtnText, activeTab === 'COLLECTION' && styles.tabBtnTextActive]}>Collection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'REPORTS' && styles.tabBtnActive]} onPress={() => setActiveTab('REPORTS')}>
          <Text style={[styles.tabBtnText, activeTab === 'REPORTS' && styles.tabBtnTextActive]}>Reports</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'HOME' && renderHomeTab()}
        {activeTab === 'COLLECTION' && renderCollectionTab()}
        {activeTab === 'REPORTS' && renderReportsTab()}
      </View>

      {/* 1. Doorstep Multi-Product Hub Modal */}
      {doorstepCustomer && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              {/* Header */}
              <View style={styles.cardHeaderAccent}>
                <Text style={styles.cardHeaderAccentText}>🚪 बहु-खाते डोअरस्टेप वसुली (Multi-Product Hub)</Text>
              </View>

              <View style={styles.doorstepCustomerHeader}>
                <View>
                  <Text style={styles.pbBold}>{doorstepCustomer.customerName}</Text>
                  <Text style={styles.pbText}>CIF: {doorstepCustomer.cifNo || 'CIF-001'}</Text>
                  {doorstepCustomer.oldAccountNo ? (
                    <View style={[styles.oldAccountBadge, { marginTop: 4 }]}>
                      <Text style={styles.oldAccountBadgeText}>जुना खाते क्र. {doorstepCustomer.oldAccountNo}</Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity 
                  onPress={() => setDoorstepCustomer(null)}
                  style={{ padding: 6 }}
                >
                  <Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pbDivider} />

              {isLoadingProfile ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 13 }}>ग्राहकाची खाती पडताळत आहे...</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* Pigmy Accounts (Only show the specific account selected by the agent) */}
                  {(() => {
                    const allPigmy = doorstepProfile?.pigmyAccounts || [];
                    const selectedOnly = allPigmy.filter(p => {
                      return (
                        doorstepCustomer.accountNumber === p.accountNo || 
                        doorstepCustomer.id === `acc_${p.accountId}` ||
                        String(doorstepCustomer.id).replace('acc_', '') === String(p.accountId) ||
                        (doorstepCustomer.oldAccountNo && p.oldAccountNo && doorstepCustomer.oldAccountNo.trim() === p.oldAccountNo.trim())
                      );
                    });
                    const displayPigmy = selectedOnly.length > 0 ? selectedOnly : (allPigmy.length > 0 ? [allPigmy[0]] : []);

                    return displayPigmy.map(p => {
                      const isSelected = true;

                      return (
                        <View 
                          key={`pigmy_${p.accountId}`} 
                          style={[
                            styles.productCard, 
                            { borderColor: '#4F46E5', borderWidth: 2, backgroundColor: '#F5F3FF' }
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 16 }}>🐷</Text>
                              <Text style={[styles.productCardTitle, { color: '#4338CA' }]}>{p.productTitle || 'दैनिक पिग्मी ठेव'}</Text>
                              {p.oldAccountNo ? (
                                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#C7D2FE' }}>
                                  <Text style={{ color: '#4338CA', fontSize: 11, fontWeight: '700' }}>जुना क्र. {p.oldAccountNo}</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.productCardAcc}>खाते क्र: {p.accountNo}</Text>
                            <Text style={styles.productCardBal}>चालू शिल्लक: ₹{p.currentBalance.toLocaleString('en-IN')}</Text>
                            <Text style={styles.productCardTarget}>दैनिक हप्ता: ₹{p.targetAmount}/day</Text>
                          </View>
                          <TouchableOpacity 
                            style={[styles.productCollectBtn, { backgroundColor: '#4F46E5' }]}
                            onPress={() => handleSelectProductToCollect('PIGMY', p, doorstepCustomer.customerName, p.oldAccountNo || doorstepCustomer.oldAccountNo)}
                          >
                            <Text style={styles.productCollectBtnText}>वसुली</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    });
                  })()}

                  {/* Loan Accounts */}
                  {doorstepProfile?.loanAccounts && doorstepProfile.loanAccounts.map(l => (
                    <View key={`loan_${l.accountId}`} style={[styles.productCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>🏦</Text>
                          <Text style={[styles.productCardTitle, { color: '#B45309' }]}>{l.productTitle || 'कर्ज खाते (Loan EMI)'}</Text>
                        </View>
                        <Text style={styles.productCardAcc}>खाते क्र: {l.accountNo}</Text>
                        <Text style={[styles.productCardBal, { color: '#DC2626' }]}>थकबाकी मुद्दल: ₹{l.currentBalance.toLocaleString('en-IN')}</Text>
                        <Text style={styles.productCardTarget}>मासिक हप्ता (EMI): ₹{l.targetAmount.toLocaleString('en-IN')}</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.productCollectBtn, { backgroundColor: '#D97706' }]}
                        onPress={() => handleSelectProductToCollect('LOAN', l, doorstepCustomer.customerName, doorstepCustomer.oldAccountNo)}
                      >
                        <Text style={styles.productCollectBtnText}>हप्ता भरा</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Saving Accounts */}
                  {doorstepProfile?.savingAccounts && doorstepProfile.savingAccounts.map(s => (
                    <View key={`saving_${s.accountId}`} style={[styles.productCard, { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>💰</Text>
                          <Text style={[styles.productCardTitle, { color: '#047857' }]}>{s.productTitle || 'बचत ठेव (Saving)'}</Text>
                        </View>
                        <Text style={styles.productCardAcc}>खाते क्र: {s.accountNo}</Text>
                        <Text style={styles.productCardBal}>उपलब्ध शिल्लक: ₹{s.currentBalance.toLocaleString('en-IN')}</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.productCollectBtn, { backgroundColor: '#059669' }]}
                        onPress={() => handleSelectProductToCollect('SAVING', s, doorstepCustomer.customerName, doorstepCustomer.oldAccountNo)}
                      >
                        <Text style={styles.productCollectBtnText}>ठेव जमा</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* RD Accounts */}
                  {doorstepProfile?.rdAccounts && doorstepProfile.rdAccounts.map(r => (
                    <View key={`rd_${r.accountId}`} style={[styles.productCard, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>📅</Text>
                          <Text style={[styles.productCardTitle, { color: '#C2410C' }]}>{r.productTitle || 'आवर्ती ठेव (RD)'}</Text>
                        </View>
                        <Text style={styles.productCardAcc}>खाते क्र: {r.accountNo}</Text>
                        <Text style={styles.productCardBal}>एकूण ठेव: ₹{r.currentBalance.toLocaleString('en-IN')}</Text>
                        <Text style={styles.productCardTarget}>हप्ता: ₹{r.targetAmount} (भरलेले: {r.paidInstallments || 0}/{r.totalDurationMonths || 12})</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.productCollectBtn, { backgroundColor: '#EA580C' }]}
                        onPress={() => handleSelectProductToCollect('RD', r, doorstepCustomer.customerName, doorstepCustomer.oldAccountNo)}
                      >
                        <Text style={styles.productCollectBtnText}>हप्ता भरा</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {(!doorstepProfile?.pigmyAccounts?.length && 
                    !doorstepProfile?.loanAccounts?.length && 
                    !doorstepProfile?.savingAccounts?.length && 
                    !doorstepProfile?.rdAccounts?.length) && (
                    <Text style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>या ग्राहकासाठी कोणतीही खाती उपलब्ध नाहीत.</Text>
                  )}
                </ScrollView>
              )}

              <View style={{ marginTop: 16 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setDoorstepCustomer(null)}>
                  <Text style={[styles.cancelBtnText, { textAlign: 'center' }]}>बंद करा (Close)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. Collection Deposit Input Modal */}
      {selectedProductCollection && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.cardHeaderAccent}>
                <Text style={styles.cardHeaderAccentText}>⚡ {selectedProductCollection.productTitle}</Text>
              </View>
              <View style={styles.quickDepositAccountBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  <Text style={styles.pbBold}>{selectedProductCollection.customerName}</Text>
                  {selectedProductCollection.oldAccountNo ? (
                    <View style={styles.oldAccountBadge}>
                      <Text style={styles.oldAccountBadgeText}>जुना क्र. {selectedProductCollection.oldAccountNo}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.pbText}>खाते क्र.: {selectedProductCollection.accountNo}</Text>
                <Text style={[styles.pbText, { color: '#047857', fontWeight: '600', marginTop: 2 }]}>
                  चालू शिल्लक/थकबाकी: ₹{selectedProductCollection.currentBalance.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.pbDivider} />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>जमा रक्कम / Amount (₹)</Text>
                  <View style={styles.inputField}>
                    <Text style={styles.inputPrefix}>₹</Text>
                    <TextInput
                      style={styles.textInput}
                      value={inputAmount}
                      onChangeText={setInputAmount}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Payment Mode</Text>
              <View style={styles.modeRow}>
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'CASH' && styles.modeBtnActive]} onPress={() => setPaymentMode('CASH')}>
                  <Text style={[styles.modeBtnText, paymentMode === 'CASH' && styles.modeBtnTextActive]}>💵 रोख (Cash)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'UPI' && styles.modeBtnActive]} onPress={() => setPaymentMode('UPI')}>
                  <Text style={[styles.modeBtnText, paymentMode === 'UPI' && styles.modeBtnTextActive]}>📱 UPI</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>रिमार्क / Remarks</Text>
              <View style={styles.inputField}>
                <TextInput style={styles.textInput} value={notes} onChangeText={setNotes} placeholder="उदा. दैनिक ठेव / हप्ता" />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedProductCollection(null)}>
                  <Text style={styles.cancelBtnText}>रद्द करा</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleRecordMultiProductCollection}>
                  <Text style={styles.saveBtnText}>नोंदवा (Record)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Legacy Pigmy Collection Modal (Fallback) */}
      {collectModalAccount && !selectedProductCollection && !doorstepCustomer && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.cardHeaderAccent}>
                <Text style={styles.cardHeaderAccentText}>⚡ Quick Deposit</Text>
              </View>
              <View style={styles.quickDepositAccountBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  <Text style={styles.pbBold}>{collectModalAccount.customerName}</Text>
                  {collectModalAccount.oldAccountNo ? (
                    <View style={styles.oldAccountBadge}>
                      <Text style={styles.oldAccountBadgeText}>जुना क्र. {collectModalAccount.oldAccountNo}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.pbText}>खाते क्र.: {collectModalAccount.accountNumber}</Text>
                <Text style={[styles.pbText, { color: '#047857', fontWeight: '600', marginTop: 2 }]}>दैनिक हप्ता: ₹{collectModalAccount.dailyTargetAmount}/day</Text>
              </View>
              <View style={styles.pbDivider} />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Deposit Amount (₹)</Text>
                  <View style={styles.inputField}>
                    <Text style={styles.inputPrefix}>₹</Text>
                    <TextInput
                      style={styles.textInput}
                      value={inputAmount}
                      onChangeText={setInputAmount}
                      keyboardType="numeric"
                      placeholder="500"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.label}>Payment Mode</Text>
              <View style={styles.modeRow}>
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'CASH' && styles.modeBtnActive]} onPress={() => setPaymentMode('CASH')}>
                  <Text style={[styles.modeBtnText, paymentMode === 'CASH' && styles.modeBtnTextActive]}>💵 Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, paymentMode === 'UPI' && styles.modeBtnActive]} onPress={() => setPaymentMode('UPI')}>
                  <Text style={[styles.modeBtnText, paymentMode === 'UPI' && styles.modeBtnTextActive]}>📱 UPI</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Notes</Text>
              <View style={styles.inputField}>
                <TextInput style={styles.textInput} value={notes} onChangeText={setNotes} placeholder="e.g. Received at shop" />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCollectModalAccount(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleRecordCollection}>
                  <Text style={styles.saveBtnText}>Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: colors.primary, fontWeight: '800' },
  tabContent: { padding: 16, paddingBottom: 40 },
  
  alertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertBannerText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },

  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  dashCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  dashCardTitle: { color: '#6B7280', fontSize: 12, marginBottom: 4 },
  dashCardValue: { color: '#1E1B4B', fontSize: 18, fontWeight: '800' },

  syncBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  syncBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  
  createCustBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  createCustBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  sectionHeader: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderAccent: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  cardHeaderAccentText: { color: colors.primaryDark, fontWeight: '800', fontSize: 15 },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  chipsRow: { flexDirection: 'row', marginBottom: 6 },
  chip: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipName: { color: '#1E1B4B', fontSize: 13, fontWeight: '700' },
  chipNameActive: { color: '#FFFFFF' },
  chipSub: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  chipSubActive: { color: '#C7D2FE' },
  
  formRow: { flexDirection: 'row', gap: 10 },
  formCol: { flex: 1 },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 4,
  },
  inputPrefix: { color: colors.primary, fontSize: 16, fontWeight: '700', marginRight: 6 },
  textInput: { flex: 1, color: '#1E1B4B', fontSize: 15, fontWeight: '600' },
  
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    height: 48,
  },
  modeBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  modeBtnTextActive: { color: '#FFFFFF', fontWeight: '800' },
  
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  routeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  routeAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  routeName: { color: '#1E1B4B', fontSize: 14, fontWeight: '700' },
  routeAddr: { color: '#9CA3AF', fontSize: 11, marginTop: 1 },
  routeAcc: { color: colors.primaryLight, fontSize: 11, fontWeight: '600', marginTop: 2 },
  selectBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  selectBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E1B4B', marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: { padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#6B7280', fontSize: 13, fontWeight: '700' },

  saveBtn: { padding: 12, borderRadius: 8, backgroundColor: colors.primary, minWidth: 80, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700' },

  pbText: { color: '#4B5563', fontSize: 14 },
  pbBold: { color: '#1E1B4B', fontSize: 14, fontWeight: '700' },
  pbDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  pbScroll: { maxHeight: 300, marginBottom: 10 },
  pbTxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pbTxDate: { color: '#6B7280', fontSize: 12 },
  pbTxRec: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  pbTxAmount: { color: '#10B981', fontSize: 14, fontWeight: '700' },
  pbTxBal: { color: '#9CA3AF', fontSize: 12 },

  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },

  subTabBar: { flexDirection: 'row', backgroundColor: '#EDE9FE', borderRadius: 12, padding: 4, marginBottom: 16 },
  subTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabBtnActive: { backgroundColor: colors.primary },
  subTabBtnText: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  subTabBtnTextActive: { color: '#FFFFFF' },

  stackedCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  
  collectBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  collectBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  oldAccountBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 3,
  },
  oldAccountBadgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '800',
  },
  quickDepositAccountBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  doorstepCustomerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  productCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  productCardAcc: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    marginTop: 2,
  },
  productCardBal: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  productCardTarget: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  productCollectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  productCollectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  stateEnglishTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  stateDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  agentInfoBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
    marginBottom: 6,
  },
  agentInfoBadgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
