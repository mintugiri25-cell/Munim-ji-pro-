import React, { useState } from 'react';
import { BusinessProfile, Party, Transaction } from '../types/accounting';
import { formatCurrency, fromMinorUnits } from '../engine/accountingMath';
import { downloadCsv } from '../db/storage';
import { X, Printer, Download, Calendar, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Props {
  party: Party;
  profile: BusinessProfile;
  transactions: Transaction[];
  onClose: () => void;
  onOpenQuickPayment: (party: Party, type: 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT') => void;
}

export const PartyStatementModal: React.FC<Props> = ({
  party,
  profile,
  transactions,
  onClose,
  onOpenQuickPayment,
}) => {
  const [dateRange, setDateRange] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR'>('ALL');

  // Filter transactions for this party
  const partyTransactions = transactions.filter(
    (tx) => tx.partyId === party.id && !tx.isReversed
  );

  const now = new Date();
  const filtered = partyTransactions.filter((tx) => {
    if (dateRange === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      return tx.date >= startOfMonth;
    }
    if (dateRange === 'THIS_YEAR') {
      return tx.date >= profile.financialYearStart;
    }
    return true;
  });

  // Calculate Net balance
  const receivable = party.openingReceivableCents;
  const payable = party.openingPayableCents;
  const netCents = receivable - payable;

  const handleExportCsv = () => {
    const headers = ['Date', 'Invoice/Voucher', 'Type', 'Description', 'Total Amount', 'Paid Amount', 'Pending Amount'];
    const rows = filtered.map((tx) => [
      tx.date,
      tx.invoiceNumber,
      tx.type,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
      fromMinorUnits(tx.grandTotalCents).toFixed(2),
      fromMinorUnits(tx.paidAmountCents).toFixed(2),
      fromMinorUnits(tx.pendingAmountCents).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(
      csvContent,
      `Statement_${party.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:max-w-none print:w-full print:rounded-none">
        {/* Controls - Hidden on print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Party Khata Statement: {party.name}
            </h3>
            <p className="text-xs text-slate-500">
              Mobile: {party.mobileNumber} {party.businessName ? `• ${party.businessName}` : ''}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Sheet */}
        <div className="pt-4 space-y-4">
          {/* Party Balance Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Grahak Se Lena (Receivable)
              </span>
              <p className="text-lg font-black text-emerald-600 mt-0.5">
                {formatCurrency(receivable, profile.currencySymbol)}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Supplier Ko Dena (Payable)
              </span>
              <p className="text-lg font-black text-rose-600 mt-0.5">
                {formatCurrency(payable, profile.currencySymbol)}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Net Khata Balance
              </span>
              <p
                className={`text-lg font-black mt-0.5 ${
                  netCents >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatCurrency(Math.abs(netCents), profile.currencySymbol)}{' '}
                <span className="text-xs font-normal">
                  {netCents >= 0 ? '(Lena Hai)' : '(Dena Hai)'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick settlement buttons */}
          <div className="flex items-center space-x-2 print:hidden">
            <button
              onClick={() => onOpenQuickPayment(party, 'CUSTOMER_RECEIPT')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ Paisa Received (Receipt)</span>
            </button>
            <button
              onClick={() => onOpenQuickPayment(party, 'SUPPLIER_PAYMENT')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>- Paisa Diya (Payment)</span>
            </button>
          </div>

          {/* Ledger Statement Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tarikh</th>
                  <th className="py-2.5 px-3">Bill / Voucher #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">Debit / Total</th>
                  <th className="py-2.5 px-3 text-right">Credit / Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Is party ke saath abhi tak koi transaction record nahi hai.
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{tx.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                        {tx.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'SALE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.type === 'PURCHASE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {tx.notes || `${tx.items.length} items`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                        {formatCurrency(tx.grandTotalCents, profile.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                        {formatCurrency(tx.paidAmountCents, profile.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {formatCurrency(tx.pendingAmountCents, profile.currencySymbol)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
