export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'AED' | 'GBP';

export type UserRole = 'OWNER' | 'ACCOUNTANT' | 'STAFF';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  pin?: string;
}

export interface BusinessProfile {
  shopName: string;
  ownerName: string;
  contactNumber: string;
  alternateNumber?: string;
  address: string;
  currencySymbol: string;
  currencyCode: CurrencyCode;
  financialYearStart: string; // e.g. 2026-04-01
  taxNumber?: string; // GSTIN or Tax Reg
  isGstEnabled: boolean;
  defaultTaxPercent: number;
  openingCashCents: number;
  openingBankCents: number;
  openingStockCostCents: number;
  ownerInvestedCapitalCents: number;
  ownerWithdrawalsCents: number;
  isConfigured: boolean;
  isSampleData: boolean;
}

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

export interface Party {
  id: string;
  name: string;
  businessName?: string;
  mobileNumber: string;
  alternateNumber?: string;
  address?: string;
  email?: string;
  taxNumber?: string;
  partyType: PartyType;
  openingReceivableCents: number; // party se lena hai
  openingPayableCents: number;    // party ko dena hai
  creditLimitCents?: number;
  paymentTermsDays?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProfitMode = 'MARKUP' | 'MARGIN';

export interface ProductItem {
  id: string;
  name: string;
  code: string; // SKU or Barcode
  category: string;
  unit: string; // Pcs, Kg, Box, Mtr, Ltr, etc.
  baseCostCents: number;
  additionalCostCents: number; // shipping, handling
  weightedAverageCostCents: number; // moving weighted average inventory cost
  defaultSellingPriceCents: number;
  profitMode: ProfitMode;
  defaultProfitPercent: number; // e.g. 20%
  availableStock: number;
  openingStock: number;
  openingStockCostCents: number;
  lowStockThreshold: number;
  barcode?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'SALE'              // Cash/Credit sale
  | 'PURCHASE'          // Cash/Credit purchase
  | 'CUSTOMER_RECEIPT'  // Paisa Aaya from customer
  | 'SUPPLIER_PAYMENT'  // Paisa Diya to supplier
  | 'EXPENSE'           // Business Operating Expense
  | 'SALES_RETURN'      // Customer return
  | 'PURCHASE_RETURN'   // Supplier return
  | 'CAPITAL_ADDITION'  // Owner invested capital
  | 'CAPITAL_WITHDRAWAL'// Owner drawings
  | 'BANK_TRANSFER';    // Cash to Bank or Bank to Cash

export type PaymentMode = 'CASH' | 'BANK' | 'UPI' | 'CREDIT' | 'SPLIT';

export interface TransactionItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCostCents: number;     // Historical cost at time of sale (for COGS)
  unitPriceCents: number;    // Selling or Purchase price per unit
  discountPercent: number;
  taxPercent: number;
  lineTotalCents: number;
  cogsCents: number;         // Cost of goods sold for this line item
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  type: TransactionType;
  date: string;               // YYYY-MM-DD
  createdTimestamp: number;   // Epoch ms
  modifiedTimestamp: number;  // Epoch ms
  createdByUserId: string;
  createdByUserName: string;
  createdByRole: UserRole;
  
  partyId?: string;
  partyName?: string;
  
  paymentMode: PaymentMode;
  splitCashAmountCents?: number;
  splitBankAmountCents?: number;

  items: TransactionItem[];
  subtotalCents: number;
  discountCents: number;
  deliveryChargeCents: number;
  taxCents: number;
  grandTotalCents: number;
  paidAmountCents: number;
  pendingAmountCents: number; // grandTotal - paidAmount
  dueDate?: string;

  expenseCategory?: string;
  notes?: string;
  attachmentUrl?: string;

  // Double-entry link
  journalEntryId: string;
  
  // Audit & Reversals
  isReversed?: boolean;
  reversalReason?: string;
  reversedByUserName?: string;
  reversedAtTimestamp?: number;

  // Sync state
  syncStatus: 'SYNCED' | 'LOCAL_PENDING';
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debitCents: number;
  creditCents: number;
}

export interface JournalEntry {
  id: string;
  transactionId: string;
  date: string;
  timestamp: number;
  description: string;
  lines: JournalLine[];
  totalDebitCents: number;
  totalCreditCents: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameHinglish: string;
  isDefault?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  entityType: 'TRANSACTION' | 'PARTY' | 'PRODUCT' | 'SETTINGS' | 'JOURNAL';
  entityId: string;
  details: string;
}

export interface FilterState {
  dateRange: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  partyId?: string;
  categoryId?: string;
  paymentMode?: PaymentMode | 'ALL';
  searchQuery?: string;
}
