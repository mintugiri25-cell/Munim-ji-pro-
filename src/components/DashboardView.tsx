import React, { useState } from 'react';
import {
  BusinessProfile,
  FilterState,
  Party,
  ProductItem,
  Transaction,
  UserRole,
} from '../types/accounting';
import { formatCurrency, fromMinorUnits } from '../engine/accountingMath';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Calendar,
  Wallet,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react';

interface Props {
  profile: BusinessProfile;
  userRole: UserRole;
  transactions: Transaction[];
  parties: Party[];
  products: ProductItem[];
  onOpenTransaction: (tx: Transaction) => void;
  onOpenParty: (partyId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<Props> = ({
  profile,
  userRole,
  transactions,
  parties,
  products,
  onOpenTransaction,
  onOpenParty,
  onNavigateTab,
}) => {
  const [dateRange, setDateRange] = useState<FilterState['dateRange']>('THIS_MONTH');

  // Filter transactions by selected date range
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const filteredTransactions = transactions.filter((tx) => {
    if (tx.isReversed) return false;
    const txDate = tx.date;

    if (dateRange === 'TODAY') {
      return txDate === todayStr;
    }
    if (dateRange === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return txDate === yesterday.toISOString().slice(0, 10);
    }
    if (dateRange === 'THIS_WEEK') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return txDate >= startOfWeek.toISOString().slice(0, 10);
    }
    if (dateRange === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return txDate >= startOfMonth.toISOString().slice(0, 10);
    }
    if (dateRange === 'THIS_YEAR') {
      return txDate >= profile.financialYearStart;
    }
    return true; // ALL
  });

  // Core Calculations
  let totalGrossSalesCents = 0;
  let totalSalesReturnCents = 0;
  let totalSalesDiscountCents = 0;
  let totalCogsCents = 0;

  let totalPurchasesCents = 0;
  let totalCashReceivedCents = 0;
  let totalCashPaidCents = 0;
  let totalOperatingExpensesCents = 0;

  for (const tx of filteredTransactions) {
    if (tx.type === 'SALE') {
      totalGrossSalesCents += tx.grandTotalCents;
      totalSalesDiscountCents += tx.discountCents;
      totalCashReceivedCents += tx.paidAmountCents;
      const lineCogs = tx.items.reduce((s, it) => s + (it.cogsCents || 0), 0);
      totalCogsCents += lineCogs;
    } else if (tx.type === 'SALES_RETURN') {
      totalSalesReturnCents += tx.grandTotalCents;
      const returnCogs = tx.items.reduce((s, it) => s + (it.cogsCents || 0), 0);
      totalCogsCents -= returnCogs;
    } else if (tx.type === 'PURCHASE') {
      totalPurchasesCents += tx.grandTotalCents;
      totalCashPaidCents += tx.paidAmountCents;
    } else if (tx.type === 'CUSTOMER_RECEIPT') {
      totalCashReceivedCents += tx.paidAmountCents;
    } else if (tx.type === 'SUPPLIER_PAYMENT') {
      totalCashPaidCents += tx.paidAmountCents;
    } else if (tx.type === 'EXPENSE') {
      totalOperatingExpensesCents += tx.grandTotalCents;
      totalCashPaidCents += tx.paidAmountCents;
    }
  }

  const netSalesCents = totalGrossSalesCents - totalSalesReturnCents;
  const grossProfitCents = netSalesCents - totalCogsCents;
  const netOperatingProfitCents = grossProfitCents - totalOperatingExpensesCents;

  // Unsold stock value & quantity
  const totalStockQty = products.reduce((sum, p) => sum + p.availableStock, 0);
  const totalStockValueCents = products.reduce(
    (sum, p) => sum + p.availableStock * p.weightedAverageCostCents,
    0
  );

  // Receivables & Payables
  const totalReceivablesCents = parties.reduce(
    (sum, p) => sum + (p.openingReceivableCents || 0),
    0
  );
  const totalPayablesCents = parties.reduce(
    (sum, p) => sum + (p.openingPayableCents || 0),
    0
  );

  // Cash and Bank Balances
  // Calculate running cash and bank balances from opening + all historical tx
  let runningCashCents = profile.openingCashCents;
  let runningBankCents = profile.openingBankCents;

  for (const tx of transactions) {
    if (tx.isReversed) continue;
    if (tx.type === 'SALE' || tx.type === 'CUSTOMER_RECEIPT') {
      if (tx.paymentMode === 'CASH') runningCashCents += tx.paidAmountCents;
      else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') runningBankCents += tx.paidAmountCents;
      else if (tx.paymentMode === 'SPLIT') {
        runningCashCents += tx.splitCashAmountCents || 0;
        runningBankCents += tx.splitBankAmountCents || 0;
      }
    } else if (tx.type === 'PURCHASE' || tx.type === 'SUPPLIER_PAYMENT' || tx.type === 'EXPENSE') {
      if (tx.paymentMode === 'CASH') runningCashCents -= tx.paidAmountCents;
      else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') runningBankCents -= tx.paidAmountCents;
      else if (tx.paymentMode === 'SPLIT') {
        runningCashCents -= tx.splitCashAmountCents || 0;
        runningBankCents -= tx.splitBankAmountCents || 0;
      }
    } else if (tx.type === 'CAPITAL_ADDITION') {
      if (tx.paymentMode === 'CASH') runningCashCents += tx.grandTotalCents;
      else runningBankCents += tx.grandTotalCents;
    } else if (tx.type === 'CAPITAL_WITHDRAWAL') {
      if (tx.paymentMode === 'CASH') runningCashCents -= tx.grandTotalCents;
      else runningBankCents -= tx.grandTotalCents;
    } else if (tx.type === 'BANK_TRANSFER') {
      if (tx.paymentMode === 'BANK') {
        runningCashCents -= tx.grandTotalCents;
        runningBankCents += tx.grandTotalCents;
      } else {
        runningBankCents -= tx.grandTotalCents;
        runningCashCents += tx.grandTotalCents;
      }
    }
  }

  // Low Stock Items
  const lowStockProducts = products.filter((p) => p.availableStock <= p.lowStockThreshold);

  // Overdue Invoices
  const overdueInvoices = transactions.filter(
    (tx) =>
      !tx.isReversed &&
      tx.type === 'SALE' &&
      tx.pendingAmountCents > 0 &&
      tx.dueDate &&
      tx.dueDate < todayStr
  );

  const isStaff = userRole === 'STAFF';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Vyapar Dashboard</h2>
          <p className="text-xs text-slate-500">
            Real-time accounting overview • Double-entry validated
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <Calendar className="w-4 h-4 text-slate-400 mr-1 hidden sm:block" />
          {(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'ALL'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition whitespace-nowrap ${
                dateRange === range
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {range === 'TODAY'
                ? 'Aaj (Today)'
                : range === 'THIS_WEEK'
                ? 'Is Hafte'
                : range === 'THIS_MONTH'
                ? 'Is Mahine'
                : range === 'THIS_YEAR'
                ? 'Is Saal (FY)'
                : 'Sabhi (All)'}
            </button>
          ))}
        </div>
      </div>

      {/* Overdue Alert banner if any */}
      {overdueInvoices.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold">
              {overdueInvoices.length} Overdue Udhar Bill(s) — Immediate Follow-up Required
            </h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Customers ki due date nikal chuki hai. Total pending:{' '}
              <strong>
                {formatCurrency(
                  overdueInvoices.reduce((s, t) => s + t.pendingAmountCents, 0),
                  profile.currencySymbol
                )}
              </strong>
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('SALES_PURCHASES')}
            className="text-xs font-semibold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
          >
            View Bills
          </button>
        </div>
      )}

      {/* Row 1: Primary Business Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Kul Bikri (Net Sales)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(netSalesCents, profile.currencySymbol)}
          </p>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
            <span>Gross: {formatCurrency(totalGrossSalesCents, profile.currencySymbol)}</span>
            {totalSalesReturnCents > 0 && (
              <span className="text-rose-600">Return: -{formatCurrency(totalSalesReturnCents, profile.currencySymbol)}</span>
            )}
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Kul Kharid (Purchases)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(totalPurchasesCents, profile.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Supplier bills added to stock
          </p>
        </div>

        {/* Gross Profit (Restricted from Staff) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Munaafa (Gross Profit)</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          {isStaff ? (
            <div className="mt-3 flex items-center space-x-2 text-slate-400 text-xs italic">
              <ShieldAlert className="w-4 h-4" />
              <span>Owner & Accountant Only</span>
            </div>
          ) : (
            <>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {formatCurrency(grossProfitCents, profile.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Net Sales minus Cost of Goods Sold (COGS)
              </p>
            </>
          )}
        </div>

        {/* Net Operating Profit (Restricted from Staff) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Shuddh Laabh (Net Profit)</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          {isStaff ? (
            <div className="mt-3 flex items-center space-x-2 text-slate-400 text-xs italic">
              <ShieldAlert className="w-4 h-4" />
              <span>Owner & Accountant Only</span>
            </div>
          ) : (
            <>
              <p
                className={`text-2xl font-black mt-2 ${
                  netOperatingProfitCents >= 0 ? 'text-indigo-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(netOperatingProfitCents, profile.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Gross Profit minus Dukan Expenses
              </p>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Strict Principal & Cost Breakdown (Requirement 7) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Principal, Capital & Cost Breakdown (No Ambiguity)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict accounting separation: Invested Capital vs COGS vs Unsold Stock vs Cashflow
            </p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
            Audit-Grade
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          {/* Owner Capital */}
          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              1. Malik Ka Lagaya Paisa
            </span>
            <p className="text-lg font-bold text-emerald-400 mt-1">
              {formatCurrency(profile.ownerInvestedCapitalCents, profile.currencySymbol)}
            </p>
            <span className="text-[10px] text-slate-400">Total Invested Capital</span>
          </div>

          {/* COGS (Sold Items Cost) */}
          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              2. Bikhe Maal Ki Kharid Lagat
            </span>
            <p className="text-lg font-bold text-amber-300 mt-1">
              {isStaff ? 'Confidential' : formatCurrency(totalCogsCents, profile.currencySymbol)}
            </p>
            <span className="text-[10px] text-slate-400">Cost of Goods Sold (COGS)</span>
          </div>

          {/* Unsold Stock Value */}
          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              3. Dukan Ke Maal Mein Laga
            </span>
            <p className="text-lg font-bold text-sky-400 mt-1">
              {formatCurrency(totalStockValueCents, profile.currencySymbol)}
            </p>
            <span className="text-[10px] text-slate-400">Unsold Stock Valuation</span>
          </div>

          {/* Customer Receivables */}
          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              4. Grahakon Se Pending Udhar
            </span>
            <p className="text-lg font-bold text-rose-300 mt-1">
              {formatCurrency(totalReceivablesCents, profile.currencySymbol)}
            </p>
            <span className="text-[10px] text-slate-400">Accounts Receivable</span>
          </div>
        </div>
      </div>

      {/* Row 3: Cash, Bank, Party Khata Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash in Hand */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Galle Ka Cash (Rokad)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(runningCashCents, profile.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Available physical cash balance</p>
        </div>

        {/* Bank & Digital Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Bank & UPI Balance</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(runningBankCents, profile.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Current Account / UPI balance</p>
        </div>

        {/* Total Customers Receivable */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Grahak Se Lena Hai</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {formatCurrency(totalReceivablesCents, profile.currencySymbol)}
          </p>
          <button
            onClick={() => onNavigateTab('PARTIES')}
            className="text-[11px] text-blue-600 hover:underline mt-1 font-medium inline-flex items-center"
          >
            View Customer Khatas <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Total Suppliers Payable */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Supplier Ko Dena Hai</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {formatCurrency(totalPayablesCents, profile.currencySymbol)}
          </p>
          <button
            onClick={() => onNavigateTab('PARTIES')}
            className="text-[11px] text-blue-600 hover:underline mt-1 font-medium inline-flex items-center"
          >
            View Supplier Khatas <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Row 4: Recent Invoices & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Recent Transactions (Taaza Entries)</h3>
            <button
              onClick={() => onNavigateTab('SALES_PURCHASES')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View All Bills
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                onClick={() => onOpenTransaction(tx)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      tx.type === 'SALE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tx.type === 'PURCHASE'
                        ? 'bg-blue-100 text-blue-800'
                        : tx.type === 'CUSTOMER_RECEIPT'
                        ? 'bg-teal-100 text-teal-800'
                        : tx.type === 'SUPPLIER_PAYMENT'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tx.type === 'SALE'
                      ? 'SL'
                      : tx.type === 'PURCHASE'
                      ? 'PR'
                      : tx.type === 'CUSTOMER_RECEIPT'
                      ? 'IN'
                      : tx.type === 'SUPPLIER_PAYMENT'
                      ? 'OUT'
                      : 'EX'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {tx.partyName || tx.expenseCategory || tx.type}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {tx.invoiceNumber} • {tx.date} • {tx.paymentMode}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">
                    {formatCurrency(tx.grandTotalCents, profile.currencySymbol)}
                  </p>
                  {tx.pendingAmountCents > 0 && (
                    <span className="text-[10px] text-rose-600 font-semibold">
                      Due: {formatCurrency(tx.pendingAmountCents, profile.currencySymbol)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Watch */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <Package className="w-4 h-4 text-amber-500" />
              <span>Low Stock Alerts</span>
            </h3>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              {lowStockProducts.length}
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Sabhi items ka stock surakshit level par hai.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.code}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600">
                      {p.availableStock} {p.unit}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Min: {p.lowStockThreshold}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
