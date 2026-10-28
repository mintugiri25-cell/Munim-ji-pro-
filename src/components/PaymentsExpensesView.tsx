import React, { useState } from 'react';
import {
  BusinessProfile,
  ExpenseCategory,
  Transaction,
  UserRole,
} from '../types/accounting';
import { formatCurrency, fromMinorUnits, toMinorUnits } from '../engine/accountingMath';
import { downloadCsv } from '../db/storage';
import {
  Wallet,
  Building,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  Plus,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';

interface Props {
  profile: BusinessProfile;
  userRole: UserRole;
  transactions: Transaction[];
  expenseCategories: ExpenseCategory[];
  onOpenNewExpense: () => void;
  onPostTransfer: (type: 'BANK_TRANSFER' | 'CAPITAL_ADDITION' | 'CAPITAL_WITHDRAWAL', amountCents: number, mode: 'CASH' | 'BANK', notes: string) => void;
}

export const PaymentsExpensesView: React.FC<Props> = ({
  profile,
  userRole,
  transactions,
  expenseCategories,
  onOpenNewExpense,
  onPostTransfer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'CASH_BOOK' | 'BANK_BOOK' | 'EXPENSES'>('ALL');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCapitalModal, setShowCapitalModal] = useState(false);

  // Transfer Modal State
  const [transferDirection, setTransferDirection] = useState<'CASH_TO_BANK' | 'BANK_TO_CASH'>('CASH_TO_BANK');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Capital Modal State
  const [capitalAction, setCapitalAction] = useState<'ADD' | 'WITHDRAW'>('ADD');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalMode, setCapitalMode] = useState<'CASH' | 'BANK'>('BANK');
  const [capitalNotes, setCapitalNotes] = useState('');

  const isStaff = userRole === 'STAFF';

  // Calculate Running Balances
  let runningCashCents = profile.openingCashCents;
  let runningBankCents = profile.openingBankCents;
  let totalExpensesCents = 0;

  const validTx = transactions.filter((t) => !t.isReversed);

  for (const tx of validTx) {
    if (tx.type === 'SALE' || tx.type === 'CUSTOMER_RECEIPT') {
      if (tx.paymentMode === 'CASH') runningCashCents += tx.paidAmountCents;
      else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') runningBankCents += tx.paidAmountCents;
      else if (tx.paymentMode === 'SPLIT') {
        runningCashCents += tx.splitCashAmountCents || 0;
        runningBankCents += tx.splitBankAmountCents || 0;
      }
    } else if (tx.type === 'PURCHASE' || tx.type === 'SUPPLIER_PAYMENT') {
      if (tx.paymentMode === 'CASH') runningCashCents -= tx.paidAmountCents;
      else if (tx.paymentMode === 'BANK' || tx.paymentMode === 'UPI') runningBankCents -= tx.paidAmountCents;
      else if (tx.paymentMode === 'SPLIT') {
        runningCashCents -= tx.splitCashAmountCents || 0;
        runningBankCents -= tx.splitBankAmountCents || 0;
      }
    } else if (tx.type === 'EXPENSE') {
      totalExpensesCents += tx.grandTotalCents;
      if (tx.paymentMode === 'CASH') runningCashCents -= tx.grandTotalCents;
      else runningBankCents -= tx.grandTotalCents;
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

  // Filter list
  const filteredTransactions = validTx.filter((tx) => {
    if (activeSubTab === 'CASH_BOOK') {
      return (
        tx.paymentMode === 'CASH' ||
        tx.type === 'BANK_TRANSFER' ||
        (tx.paymentMode === 'SPLIT' && (tx.splitCashAmountCents || 0) > 0)
      );
    }
    if (activeSubTab === 'BANK_BOOK') {
      return (
        tx.paymentMode === 'BANK' ||
        tx.paymentMode === 'UPI' ||
        tx.type === 'BANK_TRANSFER' ||
        (tx.paymentMode === 'SPLIT' && (tx.splitBankAmountCents || 0) > 0)
      );
    }
    if (activeSubTab === 'EXPENSES') {
      return tx.type === 'EXPENSE';
    }
    return true;
  });

  const handleExportCashBookCsv = () => {
    const headers = ['Date', 'Invoice/Ref', 'Type', 'Mode', 'Particulars', 'Amount Received (Inflow)', 'Amount Paid (Outflow)'];
    const rows = filteredTransactions.map((tx) => {
      const isInflow = tx.type === 'SALE' || tx.type === 'CUSTOMER_RECEIPT' || tx.type === 'CAPITAL_ADDITION';
      return [
        tx.date,
        tx.invoiceNumber,
        tx.type,
        tx.paymentMode,
        `"${(tx.partyName || tx.expenseCategory || tx.notes || '').replace(/"/g, '""')}"`,
        isInflow ? fromMinorUnits(tx.paidAmountCents || tx.grandTotalCents).toFixed(2) : '0.00',
        !isInflow ? fromMinorUnits(tx.paidAmountCents || tx.grandTotalCents).toFixed(2) : '0.00',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(csvContent, `Cash_Bank_Book_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = toMinorUnits(parseFloat(transferAmount) || 0);
    if (amount <= 0) return;

    onPostTransfer(
      'BANK_TRANSFER',
      amount,
      transferDirection === 'CASH_TO_BANK' ? 'BANK' : 'CASH',
      transferNotes || (transferDirection === 'CASH_TO_BANK' ? 'Cash deposited in Bank' : 'Cash withdrawn from Bank')
    );
    setShowTransferModal(false);
    setTransferAmount('');
    setTransferNotes('');
  };

  const handleCapitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = toMinorUnits(parseFloat(capitalAmount) || 0);
    if (amount <= 0) return;

    onPostTransfer(
      capitalAction === 'ADD' ? 'CAPITAL_ADDITION' : 'CAPITAL_WITHDRAWAL',
      amount,
      capitalMode,
      capitalNotes || (capitalAction === 'ADD' ? 'Owner capital addition' : 'Owner personal withdrawal')
    );
    setShowCapitalModal(false);
    setCapitalAmount('');
    setCapitalNotes('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rokad, Bank & Kharch (Cash & Expenses)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Galla cash, Bank accounts, Dukan ke kharch aur Malik ki capital
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCashBookCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Export Book CSV
          </button>
          {!isStaff && (
            <>
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Cash ⮂ Bank Transfer</span>
              </button>
              <button
                onClick={() => setShowCapitalModal(true)}
                className="flex items-center space-x-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Owner Capital</span>
              </button>
            </>
          )}
          <button
            onClick={onOpenNewExpense}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Kharcha Jodein</span>
          </button>
        </div>
      </div>

      {/* Account Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cash in Hand */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Galle Ka Cash (In Hand)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(runningCashCents, profile.currencySymbol)}
          </p>
          <span className="text-[11px] text-slate-400">Physical shop cash in hand</span>
        </div>

        {/* Bank & UPI */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Bank & Digital Balance</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(runningBankCents, profile.currencySymbol)}
          </p>
          <span className="text-[11px] text-slate-400">Current/Savings & UPI balance</span>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Kul Kharch (Expenses)</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {formatCurrency(totalExpensesCents, profile.currencySymbol)}
          </p>
          <span className="text-[11px] text-slate-400">Operating overheads (Rent, Salary, etc.)</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        {[
          { id: 'ALL', label: 'Sabhi Entries' },
          { id: 'CASH_BOOK', label: 'Cash Book (Galla Rokad)' },
          { id: 'BANK_BOOK', label: 'Bank Book (Digital)' },
          { id: 'EXPENSES', label: 'Dukan Kharch (Expenses Only)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Tarikh</th>
              <th className="py-3 px-3">Voucher #</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Particulars / Category</th>
              <th className="py-3 px-3">Payment Mode</th>
              <th className="py-3 px-3 text-right">Paisa Aaya (Inflow)</th>
              <th className="py-3 px-4 text-right">Paisa Gaya (Outflow)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Koi record nahi mila.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isInflow =
                  tx.type === 'SALE' ||
                  tx.type === 'CUSTOMER_RECEIPT' ||
                  tx.type === 'CAPITAL_ADDITION';
                const isOutflow =
                  tx.type === 'PURCHASE' ||
                  tx.type === 'SUPPLIER_PAYMENT' ||
                  tx.type === 'EXPENSE' ||
                  tx.type === 'CAPITAL_WITHDRAWAL';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-slate-600">{tx.date}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-xs truncate">
                      {tx.partyName || tx.expenseCategory || tx.notes || 'General entry'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-semibold">{tx.paymentMode}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-600 text-sm">
                      {isInflow
                        ? formatCurrency(tx.paidAmountCents || tx.grandTotalCents, profile.currencySymbol)
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                      {isOutflow
                        ? formatCurrency(tx.paidAmountCents || tx.grandTotalCents, profile.currencySymbol)
                        : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base">Cash ⮂ Bank Transfer</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transfer Direction
                </label>
                <select
                  value={transferDirection}
                  onChange={(e) => setTransferDirection(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="CASH_TO_BANK">Galla Cash ➔ Bank mein Jama kiya (Deposit)</option>
                  <option value="BANK_TO_CASH">Bank se ➔ Galle ke liye Nikala (Withdrawal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rakam (Amount in {profile.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note / Bank Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deposited cash at SBI branch"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                >
                  Post Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Capital Modal */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base">Owner Capital & Drawings</h3>
              <button
                onClick={() => setShowCapitalModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCapitalSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paisa Action *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCapitalAction('ADD')}
                    className={`py-2 rounded-lg text-xs font-bold border ${
                      capitalAction === 'ADD'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    + Capital Lagayi (Invest)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapitalAction('WITHDRAW')}
                    className={`py-2 rounded-lg text-xs font-bold border ${
                      capitalAction === 'WITHDRAW'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    - Niji Kharch (Drawing)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khata (Cash or Bank)
                </label>
                <select
                  value={capitalMode}
                  onChange={(e) => setCapitalMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="BANK">Bank Account / UPI</option>
                  <option value="CASH">Galla Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rakam (Amount in {profile.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="0.00"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Festival advance capital"
                  value={capitalNotes}
                  onChange={(e) => setCapitalNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
