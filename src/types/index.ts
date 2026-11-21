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
