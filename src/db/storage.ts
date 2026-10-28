import {
  AuditLog,
  BusinessProfile,
  ExpenseCategory,
  JournalEntry,
  Party,
  ProductItem,
  Transaction,
  UserProfile,
} from '../types/accounting';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  INITIAL_SAMPLE_PARTIES,
  INITIAL_SAMPLE_PRODUCTS,
  INITIAL_SAMPLE_PROFILE,
  getSampleTransactions,
} from './sampleData';
import { createJournalEntryForTransaction } from '../engine/doubleEntry';
import { calculateWeightedAverageCost, fromMinorUnits } from '../engine/accountingMath';

const STORAGE_KEY = 'munimji_business_state_v1';

export interface AppState {
  profile: BusinessProfile;
  currentUser: UserProfile;
  parties: Party[];
  products: ProductItem[];
  transactions: Transaction[];
  journalEntries: JournalEntry[];
  expenseCategories: ExpenseCategory[];
  auditLogs: AuditLog[];
  isOfflineMode: boolean;
  pendingSyncCount: number;
}

export function getDefaultInitialState(): AppState {
  const { transactions, journalEntries } = getSampleTransactions();
  
  return {
    profile: INITIAL_SAMPLE_PROFILE,
    currentUser: {
      id: 'usr-1',
      name: 'Mintu Giri',
      role: 'OWNER',
    },
    parties: INITIAL_SAMPLE_PARTIES,
    products: INITIAL_SAMPLE_PRODUCTS,
    transactions,
    journalEntries,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    auditLogs: [
      {
        id: 'aud-init',
        timestamp: Date.now(),
        userId: 'usr-1',
        userName: 'Mintu Giri',
        action: 'INITIALIZED_SAMPLE_DATA',
        entityType: 'SETTINGS',
        entityId: 'profile',
        details: 'Loaded realistic business sample data for review and testing.',
      },
    ],
    isOfflineMode: !navigator.onLine,
    pendingSyncCount: 0,
  };
}

export function loadStoredState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultInitialState();
      saveStoredState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultInitialState(),
      ...parsed,
      isOfflineMode: !navigator.onLine,
    };
  } catch (err) {
    console.error('Failed to parse stored accounting state, resetting to default:', err);
    return getDefaultInitialState();
  }
}

export function saveStoredState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to persist accounting state:', err);
  }
}

export function clearToCleanRealState(ownerName: string, shopName: string): AppState {
  const cleanProfile: BusinessProfile = {
    shopName: shopName || 'Apna Vyapar',
    ownerName: ownerName || 'Business Owner',
    contactNumber: '',
    address: '',
    currencySymbol: '₹',
    currencyCode: 'INR',
    financialYearStart: new Date().getFullYear() + '-04-01',
    isGstEnabled: true,
    defaultTaxPercent: 18,
    openingCashCents: 0,
    openingBankCents: 0,
    openingStockCostCents: 0,
    ownerInvestedCapitalCents: 0,
    ownerWithdrawalsCents: 0,
    isConfigured: true,
    isSampleData: false, // REAL DATA
  };

  const cleanState: AppState = {
    profile: cleanProfile,
    currentUser: {
      id: 'usr-1',
      name: ownerName || 'Business Owner',
      role: 'OWNER',
    },
    parties: [],
    products: [],
    transactions: [],
    journalEntries: [],
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    auditLogs: [
      {
        id: `aud-${Date.now()}`,
        timestamp: Date.now(),
        userId: 'usr-1',
        userName: ownerName || 'Owner',
        action: 'RESET_TO_REAL_DATA',
        entityType: 'SETTINGS',
        entityId: 'system',
        details: 'Reset system to blank real ledger. Sample data purged.',
      },
    ],
    isOfflineMode: !navigator.onLine,
    pendingSyncCount: 0,
  };

  saveStoredState(cleanState);
  return cleanState;
}

/**
 * Handles stock updates, weighted average costs, party receivables/payables,
 * double entry ledger generation, and audit logging.
 */
export function postTransaction(
  prevState: AppState,
  tx: Transaction,
  auditUserName: string,
  auditUserId: string
): { updatedState: AppState; journalEntry: JournalEntry } {
  // 1. Generate and validate balanced journal entry
  const journalEntry = createJournalEntryForTransaction(tx);

  // 2. Clone state collections
  const products = [...prevState.products];
  const parties = [...prevState.parties];
  const transactions = [tx, ...prevState.transactions];
  const journalEntries = [journalEntry, ...prevState.journalEntries];

  // 3. Update Inventory & Weighted Average Costs
  if (tx.type === 'PURCHASE') {
    for (const item of tx.items) {
      const idx = products.findIndex((p) => p.id === item.productId);
      if (idx !== -1) {
        const p = products[idx];
        const newWeightedAvg = calculateWeightedAverageCost(
          p.availableStock,
          p.weightedAverageCostCents,
          item.quantity,
          item.unitPriceCents
        );
        products[idx] = {
          ...p,
          availableStock: p.availableStock + item.quantity,
          weightedAverageCostCents: newWeightedAvg,
          baseCostCents: item.unitPriceCents,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } else if (tx.type === 'SALE') {
    for (const item of tx.items) {
      const idx = products.findIndex((p) => p.id === item.productId);
      if (idx !== -1) {
        const p = products[idx];
        products[idx] = {
          ...p,
          availableStock: Math.max(0, p.availableStock - item.quantity),
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } else if (tx.type === 'SALES_RETURN') {
    for (const item of tx.items) {
      const idx = products.findIndex((p) => p.id === item.productId);
      if (idx !== -1) {
        const p = products[idx];
        products[idx] = {
          ...p,
          availableStock: p.availableStock + item.quantity,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } else if (tx.type === 'PURCHASE_RETURN') {
    for (const item of tx.items) {
      const idx = products.findIndex((p) => p.id === item.productId);
      if (idx !== -1) {
        const p = products[idx];
        products[idx] = {
          ...p,
          availableStock: Math.max(0, p.availableStock - item.quantity),
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  // 4. Update Party Receivables/Payables if party transaction
  if (tx.partyId) {
    const pIdx = parties.findIndex((p) => p.id === tx.partyId);
    if (pIdx !== -1) {
      const party = { ...parties[pIdx] };
      if (tx.type === 'SALE') {
        // Increases customer receivable by pending credit
        party.openingReceivableCents += tx.pendingAmountCents;
      } else if (tx.type === 'PURCHASE') {
        // Increases supplier payable by pending credit
        party.openingPayableCents += tx.pendingAmountCents;
      } else if (tx.type === 'CUSTOMER_RECEIPT') {
        // Reduces customer receivable
        party.openingReceivableCents = Math.max(0, party.openingReceivableCents - tx.paidAmountCents);
      } else if (tx.type === 'SUPPLIER_PAYMENT') {
        // Reduces supplier payable
        party.openingPayableCents = Math.max(0, party.openingPayableCents - tx.paidAmountCents);
      } else if (tx.type === 'SALES_RETURN') {
        party.openingReceivableCents = Math.max(0, party.openingReceivableCents - tx.grandTotalCents);
      } else if (tx.type === 'PURCHASE_RETURN') {
        party.openingPayableCents = Math.max(0, party.openingPayableCents - tx.grandTotalCents);
      }
      party.updatedAt = new Date().toISOString();
      parties[pIdx] = party;
    }
  }

  // 5. Update Profile Capital tracking if applicable
  const profile = { ...prevState.profile };
  if (tx.type === 'CAPITAL_ADDITION') {
    profile.ownerInvestedCapitalCents += tx.grandTotalCents;
  } else if (tx.type === 'CAPITAL_WITHDRAWAL') {
    profile.ownerWithdrawalsCents += tx.grandTotalCents;
  }

  // 6. Record Audit Log
  const newAudit: AuditLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    userId: auditUserId,
    userName: auditUserName,
    action: `POST_${tx.type}`,
    entityType: 'TRANSACTION',
    entityId: tx.id,
    details: `${tx.invoiceNumber}: Amount ₹${fromMinorUnits(tx.grandTotalCents).toFixed(2)} (${tx.paymentMode}). ${tx.notes || ''}`,
  };

  const updatedState: AppState = {
    ...prevState,
    profile,
    products,
    parties,
    transactions,
    journalEntries,
    auditLogs: [newAudit, ...prevState.auditLogs],
  };

  saveStoredState(updatedState);
  return { updatedState, journalEntry };
}

/**
 * Downloads data as JSON backup
 */
export function exportBackupToFile(state: AppState): void {
  const exportPayload = {
    version: '1.0.0',
    appName: 'MunimJi Pro',
    exportedAt: new Date().toISOString(),
    data: state,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MunimJi_Backup_${state.profile.shopName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Restores JSON backup with integrity checks
 */
export function importBackupFromFile(fileContent: string): AppState {
  const parsed = JSON.parse(fileContent);
  const data = parsed.data || parsed;

  if (!data.profile || !data.transactions || !data.parties) {
    throw new Error('Invalid backup file: Missing required accounting collections.');
  }

  saveStoredState(data);
  return data;
}

/**
 * Utility to download CSV strings
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
