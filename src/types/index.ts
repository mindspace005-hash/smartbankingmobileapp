export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  accountNumber?: string;
  agentId?: string;
  limit?: number;
  username?: string;
}

export interface AgentCustomer {
  customerId?: string | number;
  cifNo?: string;
  oldAccountNo?: string;
  customerName: string;
  mobileNo?: string;
  address?: string;
  totalAccounts?: number;
  totalBalance?: number;
  accounts?: any[];
}

export interface PigmiAccount {
  id: string;
  customerId?: string | number;
  accountNumber: string;
  cifNo?: string;
  oldAccountNo?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  agentId: string;
  agentName: string;
  dailyTargetAmount: number;
  currentBalance: number;
  totalCollected: number;
  startDate: string;
  maturityDate: string;
  interestRatePercentage: number;
  status: 'ACTIVE' | 'MATURED' | 'CLOSED';
}

export type ProductType = 'PIGMY' | 'LOAN' | 'SAVING' | 'RD';

export interface DoorstepPigmyAccount {
  accountId: number | string;
  accountNo: string;
  productType: 'PIGMY';
  productTitle?: string;
  schemeName?: string;
  currentBalance: number;
  targetAmount: number;
  openingDate?: string;
  maturityDate?: string;
  isAgentAllowed?: boolean;
  status?: string;
  oldAccountNo?: string;
}

export interface DoorstepLoanAccount {
  accountId: number | string;
  accountNo: string;
  productType: 'LOAN';
  productTitle?: string;
  schemeName?: string;
  currentBalance: number; // Principal Outstanding
  targetAmount: number; // Installment EMI
  interestRate?: number;
  lastPaidDate?: string;
  isAgentAllowed?: boolean;
  status?: string;
}

export interface DoorstepSavingAccount {
  accountId: number | string;
  accountNo: string;
  productType: 'SAVING';
  productTitle?: string;
  schemeName?: string;
  currentBalance: number;
  targetAmount?: number;
  isAgentAllowed?: boolean;
  status?: string;
}

export interface DoorstepRDAccount {
  accountId: number | string;
  accountNo: string;
  productType: 'RD';
  productTitle?: string;
  schemeName?: string;
  currentBalance: number; // Total Deposited
  targetAmount: number; // Monthly Installment
  paidInstallments?: number;
  totalDurationMonths?: number;
  maturityDate?: string;
  isAgentAllowed?: boolean;
  status?: string;
}

export interface CustomerDoorstepProfile {
  customerId: number | string;
  cifNo: string;
  customerName: string;
  mobileNo: string;
  photoPath?: string;
  address?: string;
  agentId?: number | string;
  pigmyAccounts: DoorstepPigmyAccount[];
  loanAccounts: DoorstepLoanAccount[];
  savingAccounts: DoorstepSavingAccount[];
  rdAccounts: DoorstepRDAccount[];
  totalPermittedAccounts: number;
}

export interface CollectionRecord {
  id: string;
  transactionId: string; // Unique ID generated on the phone for Idempotency
  syncReferenceId?: string; // UUID v4 for server idempotency
  receiptNo: string;
  voucherNo?: string;
  accountId: string | number;
  accountNumber: string;
  oldAccountNo?: string;
  customerName: string;
  agentId: string;
  agentName: string;
  amount: number;
  productType?: ProductType;
  productTitle?: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  timestamp: string;
  collectionTimestamp?: string; // Exact ISO timestamp captured at collection time for offline sync
  status: 'COLLECTED' | 'VERIFIED' | 'REJECTED';
  syncStatus: 'SYNC_PENDING' | 'SYNCED'; // For offline-first architecture
  notes?: string;
  remarks?: string;
  // Loan-specific fields
  overdueInterestCollected?: number;
  regularInterestCollected?: number;
  principalCollected?: number;
  newPrincipalBalance?: number;
  // RD-specific fields
  paidInstallments?: number;
  totalDepositedAmount?: number;
  // Saving/Pigmy-specific fields
  newBalance?: number;
}

export interface AgentSummary {
  id: string;
  name: string;
  phone: string;
  assignedCustomersCount: number;
  todayTargetAmount: number;
  todayCollectedAmount: number;
  pendingCustomersCount: number;
  status: 'ACTIVE' | 'ON_FIELD' | 'OFFLINE';
}

export interface DashboardSummary {
  date: string;
  openingBalance: number;
  todaysCollection: number;
  todaysRemittance?: number;
  totalReceipts: number;
  closingBalance: number;
  pendingCashInHand?: number;
  lockStatus?: string;
  isLocked?: boolean;
}

export interface PreviousDayCollection {
  date: string;
  totalCollected: number;
  totalRemitted: number;
  pendingCash: number;
  isSubmitted: boolean;
}

export interface RemittanceStatus {
  agentId: string | number;
  collect_Pigmi: 0 | 1;
  is_pending: 0 | 1;
  status: 'ALLOWED' | 'LOCKED';
  message: string;
  previousDaysCollectionDetails: PreviousDayCollection[];
}

export interface PassbookTransaction {
  collectionId: string | number;
  date: string;
  receiptNo: string;
  creditAmount: number;
  runningBalance: number;
  source: 'APP' | 'MANUAL';
}

export interface PassbookStatement {
  pigmyAccountId: string | number;
  accountNo: string;
  memberName: string;
  agentName: string;
  openingDate: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalCredit: number;
  closingBalance: number;
  currentTotalBalance: number;
  transactions: PassbookTransaction[];
}

export interface CollectionReportItem {
  collectionId: string | number;
  receiptNo: string;
  date: string;
  pigmyAccountId: string | number;
  accountNo: string;
  memberName: string;
  amount: number;
  source: 'APP' | 'MANUAL';
}

export interface CollectionReport {
  agentId: string | number;
  fromDate: string;
  toDate: string;
  totalCollectedAmount: number;
  totalReceiptsCount: number;
  uniqueAccountsCount: number;
  collections: CollectionReportItem[];
}

export interface CommissionReport {
  agentId: string | number;
  fromDate: string;
  toDate: string;
  totalCollectedAmount: number;
  commissionRate: number;
  rateType: 'PERCENTAGE' | 'FLAT';
  calculatedCommission: number;
  paidCommission: number;
  pendingCommission: number;
  paidVouchersCount: number;
}

export interface PigmyScheme {
  schemeId: number;
  schemeCode: string;
  schemeName: string;
  interestRate: number;
  durationMonths: number;
  minDurationMonths: number | null;
  prematureInterestRate: number | null;
  penaltyInterestRate: number | null;
  interestCalculationMethod: string | null;
}

export interface DropdownOptions {
  genders: string[];
  occupations: string[];
  casteCategories: string[];
  relations: string[];
}

export interface AgentCustomerRequest {
  branchID: number;
  pigmyAgentID: number;
  agentName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  firstNameEng: string;
  middleNameEng: string;
  lastNameEng: string;
  gender: string;
  birthDate: string;
  occupation: string;
  casteCategory: string;
  mobileNo: string;
  email: string;
  aadhaarNo: string;
  panNo: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  pincode: string;
  nomineeName: string;
  nomineeNameEng: string;
  nomineeRelation: string;
  nomineeAddress: string;
  nomineeBirthDate: string;
  nomineeAge: number;
  photoPath: string;
  signaturePath: string;
  aadhaarDocPath: string;
  panDocPath: string;
  openPigmyAccount: boolean;
  pigmySchemeID: number;
  oldAccountNo?: string;
  dailyDepositAmount: number;
  initialDepositAmount: number;
  remarks: string;
}

// ==========================================
// Executive Manager Command Center Models
// ==========================================
export type ManagerBranchId = 'ALL' | number;

export interface ManagerBranchOption {
  id: ManagerBranchId;
  name: string;
  shortName: string;
  code: string;
  eodStatus: 'OPEN' | 'PENDING' | 'CLOSED';
  businessDate: string;
}

export interface ManagerProductMetric {
  activeAccounts: number;
  totalBalance: number;
  extraLabel?: string;
  extraValue?: string;
}

export interface ManagerPortfolioSummary {
  branchId: ManagerBranchId;
  branchName: string;
  businessDate: string;
  eodStatus: 'OPEN' | 'PENDING' | 'CLOSED';
  totalDeposits: number;
  totalLoanOutstanding: number;
  totalLoanOverdue: number;
  npaPercent: number;
  cdRatioPercent: number;
  branchCashInHand: number;
  openingCash: number;
  todayReceipts: number;
  todayPayments: number;
  todayCashCollection: number;
  todayUpiCollection: number;
  todaysReceiptsCount: number;
  totalMembers: number;
  fd: ManagerProductMetric;
  saving: ManagerProductMetric;
  pigmy: ManagerProductMetric;
  rd: ManagerProductMetric;
  loan: ManagerProductMetric;
  shares: ManagerProductMetric;
}

export type ManagerApprovalCategory = 'CUSTOMER_KYC' | 'LOAN_APP' | 'VOUCHER';
export type ManagerApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD';

export interface ManagerApprovalItem {
  id: string;
  category: ManagerApprovalCategory;
  title: string;
  subtitle: string;
  amount: number;
  requestedBy: string;
  requestedAt: string;
  branchId: number;
  branchName: string;
  status: ManagerApprovalStatus;
  remarks?: string;
  details: { label: string; value: string }[];
}

export interface ManagerAgentControlItem extends AgentSummary {
  branchId: number;
  branchName: string;
  cashInHand: number;
  cashLimit: number;
  todayCashAmount: number;
  todayUpiAmount: number;
  isLocked: boolean;
  lastRemittanceDate: string;
}

export type OverdueBucket = '30D' | '60D' | 'NPA_90';

export interface OverdueLoanItem {
  id: string;
  accountNo: string;
  customerName: string;
  phone: string;
  loanScheme: string;
  overdueInstallments: number;
  overdueAmount: number;
  outstandingPrincipal: number;
  bucket: OverdueBucket;
  branchId: number;
  lastPaidDate: string;
}

export type MaturityBucket = 'UPCOMING_7' | 'UPCOMING_30' | 'MATURED_UNCLOSED';

export interface MaturityAccountItem {
  id: string;
  productType: 'FD' | 'RD';
  accountNo: string;
  customerName: string;
  phone: string;
  schemeName: string;
  principalAmount: number;
  maturityAmount: number;
  maturityDate: string;
  daysRemaining: number;
  interestRate: number;
  bucket: MaturityBucket;
  branchId: number;
}

export interface ManagerEodChecklistItem {
  id: string;
  label: string;
  status: 'OK' | 'WARNING';
  detail: string;
}

export interface ManagerCommandPayload {
  branches: ManagerBranchOption[];
  portfolio: ManagerPortfolioSummary;
  approvals: ManagerApprovalItem[];
  agents: ManagerAgentControlItem[];
  overdueLoans: OverdueLoanItem[];
  maturityItems: MaturityAccountItem[];
  eodChecklist: ManagerEodChecklistItem[];
}

// ==========================================
// Customer (Khatedar) Digital Banking Models
// ==========================================
export interface CustomerPortalAccountItem {
  accountId: number;
  productType: 'PIGMY' | 'SAVING' | 'RD' | 'FD' | 'LOAN';
  accountNo: string;
  oldAccountNo?: string;
  schemeName: string;
  balance: number;
  status: string;
  maturityDate?: string | null;
  maturityAmount?: number;
  interestRate?: number;
  targetAmount?: number;
  startDate?: string;
  receiptNo?: string;
  nomineeName?: string;
  autoRenew?: boolean;
  paidInstallments?: number;
  totalInstallments?: number;
  sanctionedAmount?: number;
  nextEmiDate?: string;
  agentName?: string;
}

export interface CustomerDueReminder {
  id: string;
  productType: 'LOAN' | 'RD' | 'PIGMY';
  title: string;
  accountNo: string;
  dueDate: string;
  amount: number;
  daysLeft: number;
  status: 'DUE_SOON' | 'OVERDUE';
}

export interface CustomerShareAccount {
  memberNo: string;
  certificateNo: string;
  totalShares: number;
  faceValue: number;
  totalShareAmount: number;
  lastDividendPercent: number;
  lastDividendAmount: number;
  lastDividendYear: string;
  status: string;
}

export interface CustomerLoanEmiItem {
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  principalPart: number;
  interestPart: number;
  remainingBalance: number;
  status: 'PAID' | 'UPCOMING' | 'DUE';
}

export interface CustomerRecentActivityItem {
  id: string;
  accountId: number;
  productType: 'PIGMY' | 'SAVING' | 'RD' | 'FD' | 'LOAN';
  accountNo: string;
  date: string;
  narration: string;
  reference: string;
  crAmount: number;
  drAmount: number;
  balance: number;
}

export type CustomerServiceRequestType =
  | 'DOORSTEP_PICKUP'
  | 'LOAN_APPLY'
  | 'DEPOSIT_OPEN'
  | 'CERTIFICATE'
  | 'SUPPORT_TICKET';

export type CustomerServiceRequestStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export interface CustomerServiceRequest {
  id: string;
  referenceNo: string;
  type: CustomerServiceRequestType;
  title: string;
  subtitle: string;
  amount?: number;
  preferredSlot?: string;
  createdAt: string;
  status: CustomerServiceRequestStatus;
  linkedApprovalId?: string;
}

export interface CustomerInterestRateItem {
  id: string;
  category: 'FD' | 'RD' | 'PIGMY' | 'LOAN';
  tenureOrScheme: string;
  generalRate: string;
  seniorRate?: string;
  minAmount: string;
}

export interface CustomerProfileInfo {
  customerId: number;
  cifNo: string;
  memberNo: string;
  customerName: string;
  mobileNo: string;
  email: string;
  address: string;
  branchName: string;
  branchPhone: string;
  branchAddress: string;
  branchTimings: string;
  kycVerified: boolean;
  maskedAadhaar: string;
  maskedPan: string;
  nomineeName: string;
  nomineeRelation: string;
  assignedAgentName: string;
  assignedAgentPhone: string;
}

export interface CustomerFullPortalPayload {
  summary: {
    customerId: number;
    cifNo: string;
    customerName: string;
    mobileNo: string;
    branchName: string;
    totalSavingsAndDeposits: number;
    totalLoanOutstanding: number;
    totalShareAmount: number;
    counts: { pigmy: number; saving: number; rd: number; fd: number; loan: number };
  };
  accounts: {
    pigmyAccounts: CustomerPortalAccountItem[];
    savingAccounts: CustomerPortalAccountItem[];
    rdAccounts: CustomerPortalAccountItem[];
    fdAccounts: CustomerPortalAccountItem[];
    loanAccounts: CustomerPortalAccountItem[];
  };
  shareAccount: CustomerShareAccount;
  dueReminders: CustomerDueReminder[];
  recentActivity: CustomerRecentActivityItem[];
  interestRates: CustomerInterestRateItem[];
  profile: CustomerProfileInfo;
  serviceRequests: CustomerServiceRequest[];
}


