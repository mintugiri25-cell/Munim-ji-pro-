import React, { useState } from 'react';
import {
  AuditLog,
  BusinessProfile,
  JournalEntry,
  Party,
  ProductItem,
  Transaction,
  UserRole,
} from '../types/accounting';
import {
  CHART_OF_ACCOUNTS,
  validateJournalEntryBalance,
} from '../engine/doubleEntry';
import { formatCurrency, fromMinorUnits } from '../engine/accountingMath';
import { downloadCsv } from '../db/storage';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Scale,
  TrendingUp,
  History,
  ShieldAlert,
  BarChart2,
  Calendar,
} from 'lucide-react';

interface Props {
  profile: BusinessProfile;
  userRole: UserRole;
  transactions: Transaction[];
  journalEntries: JournalEntry[];
  products: ProductItem[];
  parties: Party[];
  auditLogs: AuditLog[];
}

export const ReportsLedgerView: React.FC<Props> = ({
  profile,
  userRole,
  transactions,
  journalEntries,
  products,
  parties,
  auditLogs,
}) => {
  const [reportTab, setReportTab] = useState<
    'PL' | 'BALANCE_SHEET' | 'TRIAL_BALANCE' | 'GENERAL_LEDGER' | 'ITEM_PROFIT' | 'AUDIT_TRAIL'
  >('PL');

  const isStaff = userRole === 'STAFF';

  // 1. Calculate P&L numbers
  let grossSalesCents = 0;
  let salesReturnsCents = 0;
  let totalCogsCents = 0;
  let operatingExpensesCents = 0;

  for (const tx of transactions) {
    if (tx.isReversed) continue;
    if (tx.type === 'SALE') {
      grossSalesCents += tx.grandTotalCents;
      const cogs = tx.items.reduce((s, it) => s + (it.cogsCents || 0), 0);
      totalCogsCents += cogs;
    } else if (tx.type === 'SALES_RETURN') {
      salesReturnsCents += tx.grandTotalCents;
      const returnCogs = tx.items.reduce((s, it) => s + (it.cogsCents || 0), 0);
      totalCogsCents -= returnCogs;
    } else if (tx.type === 'EXPENSE') {
      operatingExpensesCents += tx.grandTotalCents;
    }
  }

  const netSalesCents = grossSalesCents - salesReturnsCents;
  const grossProfitCents = netSalesCents - totalCogsCents;
  const netProfitCents = grossProfitCents - operatingExpensesCents;

  // 2. Calculate Balance Sheet numbers
  // Assets
  let cashBalanceCents = profile.openingCashCents;
  let bankBalanceCents = profile.openingBankCents;
  for (const tx of transactions) {
    if (tx.isReversed) continue;
    if (tx.type === 'SALE' || tx.type === 'CUSTOMER_RECEIPT') {
      if (tx.paymentMode === 'CASH') cashBalanceCents += tx.paidAmountCents;
      else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') bankBalanceCents += tx.paidAmountCents;
      else if (tx.paymentMode === 'SPLIT') {
        cashBalanceCents += tx.splitCashAmountCents || 0;
        bankBalanceCents += tx.splitBankAmountCents || 0;
      }
    } else if (tx.type === 'PURCHASE' || tx.type === 'SUPPLIER_PAYMENT' || tx.type === 'EXPENSE') {
      if (tx.paymentMode === 'CASH') cashBalanceCents -= tx.paidAmountCents;
      else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') bankBalanceCents -= tx.paidAmountCents;
      else if (tx.paymentMode === 'SPLIT') {
        cashBalanceCents -= tx.splitCashAmountCents || 0;
        bankBalanceCents -= tx.splitBankAmountCents || 0;
      }
    } else if (tx.type === 'CAPITAL_ADDITION') {
      if (tx.paymentMode === 'CASH') cashBalanceCents += tx.grandTotalCents;
      else bankBalanceCents += tx.grandTotalCents;
    } else if (tx.type === 'CAPITAL_WITHDRAWAL') {
      if (tx.paymentMode === 'CASH') cashBalanceCents -= tx.grandTotalCents;
      else bankBalanceCents -= tx.grandTotalCents;
    } else if (tx.type === 'BANK_TRANSFER') {
      if (tx.paymentMode === 'BANK') {
        cashBalanceCents -= tx.grandTotalCents;
        bankBalanceCents += tx.grandTotalCents;
      } else {
        bankBalanceCents -= tx.grandTotalCents;
        cashBalanceCents += tx.grandTotalCents;
      }
    }
  }

  const accountsReceivableCents = parties.reduce((s, p) => s + (p.openingReceivableCents || 0), 0);
  const inventoryValueCents = products.reduce((s, p) => s + p.availableStock * p.weightedAverageCostCents, 0);
  const totalAssetsCents = cashBalanceCents + bankBalanceCents + accountsReceivableCents + inventoryValueCents;

  // Liabilities
  const accountsPayableCents = parties.reduce((s, p) => s + (p.openingPayableCents || 0), 0);
  const totalLiabilitiesCents = accountsPayableCents;

  // Equity
  const ownerCapitalCents = profile.ownerInvestedCapitalCents;
  const ownerDrawingsCents = profile.ownerWithdrawalsCents;
  const retainedEarningsCents = netProfitCents;
  const totalEquityCents = ownerCapitalCents - ownerDrawingsCents + retainedEarningsCents;

  const totalLiabilitiesAndEquityCents = totalLiabilitiesCents + totalEquityCents;

  // 3. Trial Balance Compilation from Journal Entries
  const trialBalances: Record<string, { code: string; name: string; debitCents: number; creditCents: number }> = {};
  for (const code of Object.keys(CHART_OF_ACCOUNTS)) {
    trialBalances[code] = {
      code,
      name: CHART_OF_ACCOUNTS[code].name,
      debitCents: 0,
      creditCents: 0,
    };
  }

  for (const jrn of journalEntries) {
    for (const line of jrn.lines) {
      if (!trialBalances[line.accountCode]) {
        trialBalances[line.accountCode] = {
          code: line.accountCode,
          name: line.accountName,
          debitCents: 0,
          creditCents: 0,
        };
      }
      trialBalances[line.accountCode].debitCents += line.debitCents;
      trialBalances[line.accountCode].creditCents += line.creditCents;
    }
  }

  const tbList = Object.values(trialBalances).filter(
    (tb) => tb.debitCents > 0 || tb.creditCents > 0
  );
  const tbTotalDebitCents = tbList.reduce((s, t) => s + t.debitCents, 0);
  const tbTotalCreditCents = tbList.reduce((s, t) => s + t.creditCents, 0);
  const tbIsBalanced = tbTotalDebitCents === tbTotalCreditCents;

  // 4. Item-wise Profit
  const itemProfitMap: Record<
    string,
    { name: string; sku: string; unitsSold: number; revenueCents: number; cogsCents: number }
  > = {};

  for (const tx of transactions) {
    if (tx.isReversed) continue;
    if (tx.type === 'SALE') {
      for (const it of tx.items) {
        if (!itemProfitMap[it.productId]) {
          itemProfitMap[it.productId] = {
            name: it.productName,
            sku: it.sku,
            unitsSold: 0,
            revenueCents: 0,
            cogsCents: 0,
          };
        }
        itemProfitMap[it.productId].unitsSold += it.quantity;
        itemProfitMap[it.productId].revenueCents += it.lineTotalCents;
        itemProfitMap[it.productId].cogsCents += it.cogsCents || 0;
      }
    }
  }

  const handleExportPlCsv = () => {
    const lines = [
      'Category,Line Item,Amount (₹)',
      `Income,Gross Sales Revenue,${fromMinorUnits(grossSalesCents).toFixed(2)}`,
      `Income,Less: Sales Returns,${fromMinorUnits(salesReturnsCents).toFixed(2)}`,
      `Income,Net Sales Revenue,${fromMinorUnits(netSalesCents).toFixed(2)}`,
      `Direct Cost,Cost of Goods Sold (COGS),${fromMinorUnits(totalCogsCents).toFixed(2)}`,
      `Profit,Gross Profit,${fromMinorUnits(grossProfitCents).toFixed(2)}`,
      `Expenses,Operating Overheads,${fromMinorUnits(operatingExpensesCents).toFixed(2)}`,
      `Profit,Net Operating Profit,${fromMinorUnits(netProfitCents).toFixed(2)}`,
    ];
    downloadCsv(lines.join('\n'), `Profit_Loss_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportTrialBalanceCsv = () => {
    const headers = ['Account Code', 'Account Name', 'Total Debit (₹)', 'Total Credit (₹)'];
    const rows = tbList.map((t) => [
      t.code,
      `"${t.name.replace(/"/g, '""')}"`,
      fromMinorUnits(t.debitCents).toFixed(2),
      fromMinorUnits(t.creditCents).toFixed(2),
    ]);
    rows.push([
      'TOTAL',
      'All Accounts Balance',
      fromMinorUnits(tbTotalDebitCents).toFixed(2),
      fromMinorUnits(tbTotalCreditCents).toFixed(2),
    ]);
    downloadCsv([headers.join(','), ...rows.map((r) => r.join(','))].join('\n'), `Trial_Balance_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (isStaff && reportTab !== 'AUDIT_TRAIL') {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Access Restricted for Staff Role</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Financial statements, Profit & Loss reports, and General Ledgers are strictly available to Owner and Accountant roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Financial Statements & General Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Double-Entry verified accounting statements, audit logs and item profit
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {reportTab === 'PL' && (
            <button
              onClick={handleExportPlCsv}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export P&L CSV</span>
            </button>
          )}
          {reportTab === 'TRIAL_BALANCE' && (
            <button
              onClick={handleExportTrialBalanceCsv}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Trial Balance CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Report Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'PL', label: 'Profit & Loss (Nafa / Nuksan)' },
          { id: 'BALANCE_SHEET', label: 'Balance Sheet' },
          { id: 'TRIAL_BALANCE', label: 'Trial Balance (Debit = Credit)' },
          { id: 'GENERAL_LEDGER', label: 'General Journal Ledger' },
          { id: 'ITEM_PROFIT', label: 'Item-wise Profit Analysis' },
          { id: 'AUDIT_TRAIL', label: 'Audit History & Reversals' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              reportTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. PROFIT & LOSS */}
      {reportTab === 'PL' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="text-center pb-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">{profile.shopName}</h3>
            <p className="text-xs text-slate-500">
              Profit & Loss Statement for Financial Year {profile.financialYearStart} to Present
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 text-xs sm:text-sm">
            {/* Revenue Section */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-1">
                1. Revenue (Bikri Aamdani)
              </h4>
              <div className="flex justify-between text-slate-700 pl-4">
                <span>Kul Bikri (Gross Sales):</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(grossSalesCents, profile.currencySymbol)}
                </span>
              </div>
              {salesReturnsCents > 0 && (
                <div className="flex justify-between text-rose-600 pl-4">
                  <span>Less: Bikri Wapasi (Sales Returns):</span>
                  <span>-{formatCurrency(salesReturnsCents, profile.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pl-4 pt-1 border-t border-slate-100">
                <span>Shuddh Bikri (Net Sales):</span>
                <span>{formatCurrency(netSalesCents, profile.currencySymbol)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-1">
                2. Direct Cost (Bikhe Maal Ki Kharid Lagat)
              </h4>
              <div className="flex justify-between text-slate-700 pl-4">
                <span>Cost of Goods Sold (COGS - Weighted Average):</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totalCogsCents, profile.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Gross Profit Highlight */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-sm sm:text-base font-bold text-emerald-900">
              <span>Gross Profit (Kul Munaafa):</span>
              <span className="text-lg font-black text-emerald-700">
                {formatCurrency(grossProfitCents, profile.currencySymbol)}
              </span>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-1">
                3. Operating Expenses (Dukan Ke Kharch)
              </h4>
              <div className="flex justify-between text-slate-700 pl-4">
                <span>Rent, Salary, Bijli, Transport & Misc:</span>
                <span className="font-semibold text-rose-700">
                  {formatCurrency(operatingExpensesCents, profile.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center text-base sm:text-lg font-black">
              <span>Net Operating Profit (Shuddh Laabh):</span>
              <span className={netProfitCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatCurrency(netProfitCents, profile.currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. BALANCE SHEET */}
      {reportTab === 'BALANCE_SHEET' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="text-center pb-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">{profile.shopName}</h3>
            <p className="text-xs text-slate-500">
              Balance Sheet Statement as of {new Date().toISOString().slice(0, 10)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
            {/* Assets (Sampatti) */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-2">
                Assets (Dukan Ki Sampatti)
              </h4>
              <div className="flex justify-between text-slate-700">
                <span>Galle Ka Cash (Cash in Hand):</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(cashBalanceCents, profile.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Bank & UPI Accounts:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(bankBalanceCents, profile.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Grahak Se Lena (Receivables):</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(accountsReceivableCents, profile.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Dukan Ka Maal (Stock Valuation):</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(inventoryValueCents, profile.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between font-bold text-slate-900 pt-3 border-t-2 border-slate-300 text-sm">
                <span>Total Assets (Kul Sampatti):</span>
                <span className="text-emerald-700">
                  {formatCurrency(totalAssetsCents, profile.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-2">
                Liabilities & Equity (Dayitva aur Capital)
              </h4>
              <div className="flex justify-between text-slate-700">
                <span>Supplier Ko Dena (Accounts Payable):</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(accountsPayableCents, profile.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Malik Ki Lagayi Capital:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(ownerCapitalCents, profile.currencySymbol)}
                </span>
              </div>
              {ownerDrawingsCents > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Less: Malik Ka Niji Kharch (Drawings):</span>
                  <span>-{formatCurrency(ownerDrawingsCents, profile.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700">
                <span>Retained Earnings / Munaafa:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(retainedEarningsCents, profile.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between font-bold text-slate-900 pt-3 border-t-2 border-slate-300 text-sm">
                <span>Total Liabilities & Equity:</span>
                <span className="text-blue-700">
                  {formatCurrency(totalLiabilitiesAndEquityCents, profile.currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRIAL BALANCE */}
      {reportTab === 'TRIAL_BALANCE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Trial Balance (Debit = Credit Audit Verification)
              </h3>
            </div>
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                tbIsBalanced
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {tbIsBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Perfect Balanced (Debit === Credit)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Out of Balance</span>
                </>
              )}
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Account Code</th>
                <th className="py-2.5 px-3">Account Name</th>
                <th className="py-2.5 px-4 text-right">Debit Balance ({profile.currencySymbol})</th>
                <th className="py-2.5 px-4 text-right">Credit Balance ({profile.currencySymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tbList.map((tb) => (
                <tr key={tb.code} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{tb.code}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{tb.name}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                    {tb.debitCents > 0 ? formatCurrency(tb.debitCents, profile.currencySymbol) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                    {tb.creditCents > 0 ? formatCurrency(tb.creditCents, profile.currencySymbol) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td className="py-3 px-4" colSpan={2}>
                  TOTAL (Double-Entry Verification)
                </td>
                <td className="py-3 px-4 text-right text-emerald-400">
                  {formatCurrency(tbTotalDebitCents, profile.currencySymbol)}
                </td>
                <td className="py-3 px-4 text-right text-emerald-400">
                  {formatCurrency(tbTotalCreditCents, profile.currencySymbol)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 4. GENERAL LEDGER */}
      {reportTab === 'GENERAL_LEDGER' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">
              General Double-Entry Journal Entries ({journalEntries.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Immutable Accounting Audit Trail
            </span>
          </div>

          <div className="space-y-3">
            {journalEntries.map((jrn) => (
              <div
                key={jrn.id}
                className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-800">
                    {jrn.id} • {jrn.date}
                  </span>
                  <span className="font-bold text-slate-600 truncate max-w-md">
                    {jrn.description}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="py-1 px-3">Account</th>
                        <th className="py-1 px-3 text-right">Debit</th>
                        <th className="py-1 px-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jrn.lines.map((l, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3">
                            <span className="font-mono text-slate-400 mr-2">{l.accountCode}</span>
                            <span className="font-medium text-slate-800">{l.accountName}</span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                            {l.debitCents > 0
                              ? formatCurrency(l.debitCents, profile.currencySymbol)
                              : ''}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium text-slate-900">
                            {l.creditCents > 0
                              ? formatCurrency(l.creditCents, profile.currencySymbol)
                              : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ITEM-WISE PROFIT */}
      {reportTab === 'ITEM_PROFIT' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">
              Item-wise Actual Profit & Margin Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Historical sales value vs COGS actually realized on each item
            </p>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3 text-right">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Gross Sales</th>
                <th className="py-2.5 px-3 text-right">COGS Cost</th>
                <th className="py-2.5 px-3 text-right">Gross Profit</th>
                <th className="py-2.5 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.values(itemProfitMap).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Abhi tak koi sale entry nahi hui hai.
                  </td>
                </tr>
              ) : (
                Object.values(itemProfitMap).map((it, idx) => {
                  const profitCents = it.revenueCents - it.cogsCents;
                  const marginPct =
                    it.revenueCents > 0
                      ? ((profitCents / it.revenueCents) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{it.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{it.sku}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {it.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatCurrency(it.revenueCents, profile.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                        {formatCurrency(it.cogsCents, profile.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                        {formatCurrency(profitCents, profile.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-teal-700">
                        {marginPct}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. AUDIT TRAIL */}
      {reportTab === 'AUDIT_TRAIL' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                System Audit Trail & Reversal Logs
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Immutable Activity Records
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      by {log.userName}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
