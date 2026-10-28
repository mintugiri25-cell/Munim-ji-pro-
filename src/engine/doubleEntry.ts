import { JournalEntry, JournalLine, Transaction } from '../types/accounting';

export interface AccountDefinition {
  code: string;
  name: string;
  nameHinglish: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
}

export const CHART_OF_ACCOUNTS: Record<string, AccountDefinition> = {
  '1010': {
    code: '1010',
    name: 'Cash in Hand',
    nameHinglish: 'Galle ka Cash / Rokad',
    type: 'ASSET',
    normalBalance: 'DEBIT',
  },
  '1020': {
    code: '1020',
    name: 'Bank & UPI Accounts',
    nameHinglish: 'Bank Khata / UPI Balance',
    type: 'ASSET',
    normalBalance: 'DEBIT',
  },
  '1030': {
    code: '1030',
    name: 'Accounts Receivable',
    nameHinglish: 'Grahak se Lena (Customers Due)',
    type: 'ASSET',
    normalBalance: 'DEBIT',
  },
  '1040': {
    code: '1040',
    name: 'Merchandise Inventory',
    nameHinglish: 'Dukan ka Maal / Stock Value',
    type: 'ASSET',
    normalBalance: 'DEBIT',
  },
  '2010': {
    code: '2010',
    name: 'Accounts Payable',
    nameHinglish: 'Supplier ko Dena (Vendor Dues)',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
  },
  '3010': {
    code: '3010',
    name: 'Owner Invested Capital',
    nameHinglish: 'Malik ka Lagaya Paisa (Capital)',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
  },
  '3020': {
    code: '3020',
    name: 'Owner Drawings',
    nameHinglish: 'Niji Kharch ke liye Nikala Paisa (Drawings)',
    type: 'EQUITY',
    normalBalance: 'DEBIT',
  },
  '4010': {
    code: '4010',
    name: 'Sales Revenue',
    nameHinglish: 'Bikri Aamdani (Gross Sales)',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
  },
  '4020': {
    code: '4020',
    name: 'Sales Returns & Discounts',
    nameHinglish: 'Wapasi aur Chhoot (Sales Return)',
    type: 'REVENUE',
    normalBalance: 'DEBIT',
  },
  '5010': {
    code: '5010',
    name: 'Cost of Goods Sold (COGS)',
    nameHinglish: 'Bikhe Maal ki Kharid Lagat (Principal Cost)',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
  },
  '5020': {
    code: '5020',
    name: 'Purchase Returns',
    nameHinglish: 'Supplier ko Maal Wapasi',
    type: 'EXPENSE',
    normalBalance: 'CREDIT',
  },
  '6010': {
    code: '6010',
    name: 'Operating Expenses',
    nameHinglish: 'Dukan ke Kharch (Rent, Bijli, Salary)',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
  },
};

/**
 * Validates that total debits equals total credits.
 * Throws error if unequal.
 */
export function validateJournalEntryBalance(lines: JournalLine[]): {
  isValid: boolean;
  totalDebitCents: number;
  totalCreditCents: number;
  differenceCents: number;
} {
  const totalDebitCents = lines.reduce((acc, l) => acc + l.debitCents, 0);
  const totalCreditCents = lines.reduce((acc, l) => acc + l.creditCents, 0);
  const differenceCents = Math.abs(totalDebitCents - totalCreditCents);

  return {
    isValid: differenceCents === 0,
    totalDebitCents,
    totalCreditCents,
    differenceCents,
  };
}

/**
 * Generates balanced double-entry journal entry from any business transaction
 */
export function createJournalEntryForTransaction(tx: Transaction): JournalEntry {
  const lines: JournalLine[] = [];

  const addLine = (accountCode: string, debitCents: number, creditCents: number) => {
    if (debitCents === 0 && creditCents === 0) return;
    const acct = CHART_OF_ACCOUNTS[accountCode];
    lines.push({
      accountCode,
      accountName: acct ? acct.name : `Account ${accountCode}`,
      debitCents,
      creditCents,
    });
  };

  switch (tx.type) {
    case 'SALE': {
      // 1. Inflow of Funds / Receivable
      const cashReceived =
        tx.paymentMode === 'CASH'
          ? tx.paidAmountCents
          : tx.paymentMode === 'SPLIT'
          ? tx.splitCashAmountCents || 0
          : 0;

      const bankReceived =
        tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI'
          ? tx.paidAmountCents
          : tx.paymentMode === 'SPLIT'
          ? tx.splitBankAmountCents || 0
          : 0;

      const receivable = tx.pendingAmountCents;

      addLine('1010', cashReceived, 0);
      addLine('1020', bankReceived, 0);
      addLine('1030', receivable, 0);

      // 2. Revenue (Credit Sales)
      addLine('4010', 0, tx.grandTotalCents);

      // 3. Perpetual Inventory & COGS
      const totalCOGS = tx.items.reduce((sum, item) => sum + (item.cogsCents || 0), 0);
      if (totalCOGS > 0) {
        addLine('5010', totalCOGS, 0); // Debit COGS Expense
        addLine('1040', 0, totalCOGS); // Credit Inventory
      }
      break;
    }

    case 'PURCHASE': {
      // 1. Inventory Asset Inflow
      addLine('1040', tx.grandTotalCents, 0);

      // 2. Outflow of Cash/Bank or Liability to Supplier
      const cashPaid =
        tx.paymentMode === 'CASH'
          ? tx.paidAmountCents
          : tx.paymentMode === 'SPLIT'
          ? tx.splitCashAmountCents || 0
          : 0;

      const bankPaid =
        tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI'
          ? tx.paidAmountCents
          : tx.paymentMode === 'SPLIT'
          ? tx.splitBankAmountCents || 0
          : 0;

      const payable = tx.pendingAmountCents;

      addLine('1010', 0, cashPaid);
      addLine('1020', 0, bankPaid);
      addLine('2010', 0, payable);
      break;
    }

    case 'CUSTOMER_RECEIPT': {
      // Paisa Aaya from Customer
      const isCash = tx.paymentMode === 'CASH';
      const targetAccount = isCash ? '1010' : '1020';
      addLine(targetAccount, tx.paidAmountCents, 0);
      addLine('1030', 0, tx.paidAmountCents); // Reduce Accounts Receivable
      break;
    }

    case 'SUPPLIER_PAYMENT': {
      // Paisa Diya to Supplier
      const isCash = tx.paymentMode === 'CASH';
      const sourceAccount = isCash ? '1010' : '1020';
      addLine('2010', tx.paidAmountCents, 0); // Reduce Accounts Payable
      addLine(sourceAccount, 0, tx.paidAmountCents);
      break;
    }

    case 'EXPENSE': {
      // Operating Expense (Rent, Electricity, Tea, Salary, etc.)
      const isCash = tx.paymentMode === 'CASH';
      const sourceAccount = isCash ? '1010' : '1020';
      addLine('6010', tx.grandTotalCents, 0);
      addLine(sourceAccount, 0, tx.grandTotalCents);
      break;
    }

    case 'SALES_RETURN': {
      // Customer Returned Goods
      addLine('4020', tx.grandTotalCents, 0); // Debit Contra-Revenue
      if (tx.paymentMode === 'CASH') {
        addLine('1010', 0, tx.paidAmountCents);
      } else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') {
        addLine('1020', 0, tx.paidAmountCents);
      } else {
        addLine('1030', 0, tx.grandTotalCents); // Reduce Receivable
      }

      // Restock inventory & reduce COGS
      const returnCOGS = tx.items.reduce((sum, item) => sum + (item.cogsCents || 0), 0);
      if (returnCOGS > 0) {
        addLine('1040', returnCOGS, 0); // Debit Inventory
        addLine('5010', 0, returnCOGS); // Credit COGS
      }
      break;
    }

    case 'PURCHASE_RETURN': {
      // Return goods to supplier
      if (tx.paymentMode === 'CASH') {
        addLine('1010', tx.paidAmountCents, 0);
      } else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') {
        addLine('1020', tx.paidAmountCents, 0);
      } else {
        addLine('2010', tx.grandTotalCents, 0); // Reduce Payable
      }
      addLine('1040', 0, tx.grandTotalCents); // Credit Inventory
      break;
    }

    case 'CAPITAL_ADDITION': {
      // Owner Invested Capital
      const isCash = tx.paymentMode === 'CASH';
      const targetAccount = isCash ? '1010' : '1020';
      addLine(targetAccount, tx.grandTotalCents, 0);
      addLine('3010', 0, tx.grandTotalCents); // Credit Owner Capital Equity
      break;
    }

    case 'CAPITAL_WITHDRAWAL': {
      // Owner Personal Drawing
      const isCash = tx.paymentMode === 'CASH';
      const sourceAccount = isCash ? '1010' : '1020';
      addLine('3020', tx.grandTotalCents, 0); // Debit Owner Drawings
      addLine(sourceAccount, 0, tx.grandTotalCents);
      break;
    }

    case 'BANK_TRANSFER': {
      // Move between Cash & Bank
      if (tx.paymentMode === 'BANK') {
        // Deposited Cash to Bank
        addLine('1020', tx.grandTotalCents, 0);
        addLine('1010', 0, tx.grandTotalCents);
      } else {
        // Withdrew Cash from Bank
        addLine('1010', tx.grandTotalCents, 0);
        addLine('1020', 0, tx.grandTotalCents);
      }
      break;
    }
  }

  const balanceCheck = validateJournalEntryBalance(lines);
  if (!balanceCheck.isValid) {
    console.error('CRITICAL: Double Entry Ledger is out of balance!', {
      tx,
      lines,
      balanceCheck,
    });
    throw new Error(
      `Double-Entry violation: Total Debits (${balanceCheck.totalDebitCents}) != Total Credits (${balanceCheck.totalCreditCents})`
    );
  }

  return {
    id: tx.journalEntryId || `JRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    transactionId: tx.id,
    date: tx.date,
    timestamp: tx.createdTimestamp,
    description: `${tx.type}: ${tx.invoiceNumber} - ${tx.notes || tx.partyName || 'Entry'}`,
    lines,
    totalDebitCents: balanceCheck.totalDebitCents,
    totalCreditCents: balanceCheck.totalCreditCents,
  };
}

/**
 * Creates Reversal Journal Entry for an existing entry (Audit trail integrity)
 */
export function createReversalJournalEntry(
  original: JournalEntry,
  reason: string,
  reversalDate: string
): JournalEntry {
  // Flip debits and credits
  const reversedLines: JournalLine[] = original.lines.map((l) => ({
    accountCode: l.accountCode,
    accountName: l.accountName,
    debitCents: l.creditCents, // Swapped
    creditCents: l.debitCents, // Swapped
  }));

  const balanceCheck = validateJournalEntryBalance(reversedLines);

  return {
    id: `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    transactionId: original.transactionId,
    date: reversalDate,
    timestamp: Date.now(),
    description: `REVERSAL of ${original.description}. Reason: ${reason}`,
    lines: reversedLines,
    totalDebitCents: balanceCheck.totalDebitCents,
    totalCreditCents: balanceCheck.totalCreditCents,
  };
}
