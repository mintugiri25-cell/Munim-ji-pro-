import React, { useState } from 'react';
import { BusinessProfile, Transaction, UserRole } from '../types/accounting';
import { formatCurrency } from '../engine/accountingMath';
import {
  Search,
  Plus,
  Printer,
  RotateCcw,
  BookOpen,
  Filter,
  CheckCircle,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';

interface Props {
  profile: BusinessProfile;
  userRole: UserRole;
  transactions: Transaction[];
  onOpenNewTransaction: (type: 'SALE' | 'PURCHASE') => void;
  onPrintTransaction: (tx: Transaction) => void;
  onViewJournal: (tx: Transaction) => void;
  onReverseTransaction: (tx: Transaction) => void;
}

export const SalesPurchasesView: React.FC<Props> = ({
  profile,
  userRole,
  transactions,
  onOpenNewTransaction,
  onPrintTransaction,
  onViewJournal,
  onReverseTransaction,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReversed, setShowReversed] = useState(false);

  const isStaff = userRole === 'STAFF';

  const filtered = transactions.filter((tx) => {
    if (!showReversed && tx.isReversed) return false;

    if (filterType !== 'ALL' && tx.type !== filterType) {
      if (filterType === 'RETURNS' && (tx.type === 'SALES_RETURN' || tx.type === 'PURCHASE_RETURN')) {
        // match
      } else {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchInv = tx.invoiceNumber.toLowerCase().includes(q);
      const matchParty = tx.partyName?.toLowerCase().includes(q);
      const matchNote = tx.notes?.toLowerCase().includes(q);
      const matchItem = tx.items.some((it) => it.productName.toLowerCase().includes(q));
      if (!matchInv && !matchParty && !matchNote && !matchItem) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header & New Invoicing Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sale & Purchase Vouchers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bikri, Kharid, Tax Invoices aur Return Vouchers ka poora hisaab
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onOpenNewTransaction('SALE')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Sale (Bikri)</span>
          </button>
          <button
            onClick={() => onOpenNewTransaction('PURCHASE')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Purchase (Kharid)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Bill #, Grahak/Supplier name, Item or Note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
          />
        </div>

        {/* Filter Type Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Sabhi Bills' },
            { id: 'SALE', label: 'Bikri (Sale)' },
            { id: 'PURCHASE', label: 'Kharid (Purchase)' },
            { id: 'CUSTOMER_RECEIPT', label: 'Paisa Aaya' },
            { id: 'SUPPLIER_PAYMENT', label: 'Paisa Diya' },
            { id: 'RETURNS', label: 'Returns' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toggle Reversed Entries */}
        <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showReversed}
            onChange={(e) => setShowReversed(e.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span>Show Reversed/Cancelled</span>
        </label>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">Koi bill ya voucher nahi mila</p>
            <p className="text-xs text-slate-400 mt-1">Upar diye buttons se naya bill banayein.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((tx) => {
              const totalLineCogs = tx.items.reduce((s, it) => s + (it.cogsCents || 0), 0);
              const invoiceProfitCents = tx.type === 'SALE' ? tx.grandTotalCents - totalLineCogs : 0;
              const marginPercent =
                tx.grandTotalCents > 0
                  ? ((invoiceProfitCents / tx.grandTotalCents) * 100).toFixed(1)
                  : '0.0';

              return (
                <div
                  key={tx.id}
                  className={`p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    tx.isReversed ? 'bg-rose-50/40 opacity-75' : ''
                  }`}
                >
                  {/* Left Column: Invoice Meta */}
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
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
                        ? 'SALE'
                        : tx.type === 'PURCHASE'
                        ? 'PUR'
                        : tx.type === 'CUSTOMER_RECEIPT'
                        ? 'IN'
                        : tx.type === 'SUPPLIER_PAYMENT'
                        ? 'OUT'
                        : 'RET'}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {tx.invoiceNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tx.paymentMode === 'CASH'
                              ? 'bg-slate-100 text-slate-700'
                              : tx.paymentMode === 'CREDIT'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {tx.paymentMode}
                        </span>
                        {tx.isReversed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                            VOID / REVERSED
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        {tx.partyName || tx.expenseCategory || 'Walk-in Cash Customer'}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{tx.date}</span>
                        </span>
                        <span>•</span>
                        <span>By {tx.createdByUserName}</span>
                        {tx.dueDate && (
                          <>
                            <span>•</span>
                            <span className="text-amber-700 font-medium">Due: {tx.dueDate}</span>
                          </>
                        )}
                      </div>

                      {/* Items Pill */}
                      {tx.items && tx.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tx.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                            >
                              {it.productName} ({it.quantity} {it.unit})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Financial Amounts & Action Buttons */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <p className="text-lg font-black text-slate-900">
                        {formatCurrency(tx.grandTotalCents, profile.currencySymbol)}
                      </p>

                      <div className="text-xs space-y-0.5">
                        <span className="text-emerald-700 font-semibold block">
                          Paid: {formatCurrency(tx.paidAmountCents, profile.currencySymbol)}
                        </span>
                        {tx.pendingAmountCents > 0 && (
                          <span className="text-rose-600 font-bold block">
                            Udhar (Due): {formatCurrency(tx.pendingAmountCents, profile.currencySymbol)}
                          </span>
                        )}
                        {!isStaff && tx.type === 'SALE' && (
                          <span className="text-[11px] text-teal-700 font-medium block">
                            Profit: {formatCurrency(invoiceProfitCents, profile.currencySymbol)} ({marginPercent}% margin)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-1.5 mt-2.5">
                      <button
                        onClick={() => onPrintTransaction(tx)}
                        title="Print Tax Invoice / Bill"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onViewJournal(tx)}
                        title="View Double-Entry Ledger Entry"
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>

                      {!tx.isReversed && !isStaff && (
                        <button
                          onClick={() => onReverseTransaction(tx)}
                          title="Reverse / Cancel Bill with Audit Entry"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
