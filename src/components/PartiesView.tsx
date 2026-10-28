import React, { useState } from 'react';
import { BusinessProfile, Party, PartyType, Transaction } from '../types/accounting';
import { formatCurrency, fromMinorUnits } from '../engine/accountingMath';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { downloadCsv } from '../db/storage';

interface Props {
  profile: BusinessProfile;
  parties: Party[];
  transactions: Transaction[];
  onOpenNewParty: () => void;
  onEditParty: (party: Party) => void;
  onViewStatement: (party: Party) => void;
  onQuickPayment: (party: Party, type: 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT') => void;
}

export const PartiesView: React.FC<Props> = ({
  profile,
  parties,
  transactions,
  onOpenNewParty,
  onEditParty,
  onViewStatement,
  onQuickPayment,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = parties.filter((p) => {
    if (filterType !== 'ALL' && p.partyType !== filterType) {
      if (filterType === 'BOTH' && p.partyType === 'BOTH') {
        // match
      } else {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchBusiness = p.businessName?.toLowerCase().includes(q);
      const matchPhone = p.mobileNumber.includes(q);
      if (!matchName && !matchBusiness && !matchPhone) return false;
    }

    return true;
  });

  const totalReceivables = parties.reduce((s, p) => s + (p.openingReceivableCents || 0), 0);
  const totalPayables = parties.reduce((s, p) => s + (p.openingPayableCents || 0), 0);

  const handleExportAllPartiesCsv = () => {
    const headers = ['ID', 'Name', 'Business Name', 'Phone', 'Party Type', 'Lena Hai (Receivable)', 'Dena Hai (Payable)', 'Credit Limit'];
    const rows = parties.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.businessName || '').replace(/"/g, '""')}"`,
      p.mobileNumber,
      p.partyType,
      fromMinorUnits(p.openingReceivableCents).toFixed(2),
      fromMinorUnits(p.openingPayableCents).toFixed(2),
      p.creditLimitCents ? fromMinorUnits(p.creditLimitCents).toFixed(2) : '0.00',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(csvContent, `Parties_List_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Parties Khata & Bahi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Grahak (Customer) aur Supplier ka alag-alag lena-dena aur statement
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportAllPartiesCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Export Parties CSV
          </button>
          <button
            onClick={onOpenNewParty}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nayi Party Jodein</span>
          </button>
        </div>
      </div>

      {/* Aggregate Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Kul Lena Hai (Total Receivables)
            </span>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {formatCurrency(totalReceivables, profile.currencySymbol)}
            </p>
            <span className="text-[11px] text-emerald-600">All customers outstanding debt</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-200/60 flex items-center justify-center text-emerald-800">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Kul Dena Hai (Total Payables)
            </span>
            <p className="text-2xl font-black text-rose-700 mt-1">
              {formatCurrency(totalPayables, profile.currencySymbol)}
            </p>
            <span className="text-[11px] text-rose-600">All suppliers outstanding payment</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-200/60 flex items-center justify-center text-rose-800">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search party by name, business, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Sabhi Parties' },
            { id: 'CUSTOMER', label: 'Customers (Grahak)' },
            { id: 'SUPPLIER', label: 'Suppliers' },
            { id: 'BOTH', label: 'Customer & Supplier (Both)' },
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
      </div>

      {/* Parties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((party) => {
          const rec = party.openingReceivableCents;
          const pay = party.openingPayableCents;
          const isDual = party.partyType === 'BOTH';

          return (
            <div
              key={party.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {party.name}
                    </h3>
                    {party.businessName && (
                      <p className="text-xs text-slate-500 font-medium">
                        {party.businessName}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      party.partyType === 'CUSTOMER'
                        ? 'bg-emerald-100 text-emerald-800'
                        : party.partyType === 'SUPPLIER'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {party.partyType}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{party.mobileNumber}</span>
                  </div>
                  {party.address && (
                    <p className="text-[11px] text-slate-400 truncate">{party.address}</p>
                  )}
                  {party.taxNumber && (
                    <p className="text-[11px] font-mono text-slate-600">GST: {party.taxNumber}</p>
                  )}
                </div>

                {/* Balances Block */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  {/* If Dual Party, show both explicitly per Requirement 4 */}
                  {isDual ? (
                    <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-emerald-700 font-medium">Lena Hai (As Customer):</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(rec, profile.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-rose-700 font-medium">Dena Hai (As Supplier):</span>
                        <span className="font-bold text-rose-700">
                          {formatCurrency(pay, profile.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                        <span>Net Balance:</span>
                        <span className={rec - pay >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                          {formatCurrency(Math.abs(rec - pay), profile.currencySymbol)}{' '}
                          <span className="text-[10px] font-normal">
                            {rec - pay >= 0 ? '(Lena)' : '(Dena)'}
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : party.partyType === 'CUSTOMER' ? (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Grahak Se Lena Hai:</span>
                      <span className="font-black text-emerald-600 text-sm">
                        {formatCurrency(rec, profile.currencySymbol)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Supplier Ko Dena Hai:</span>
                      <span className="font-black text-rose-600 text-sm">
                        {formatCurrency(pay, profile.currencySymbol)}
                      </span>
                    </div>
                  )}

                  {party.creditLimitCents ? (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Credit Limit:</span>
                      <span>{formatCurrency(party.creditLimitCents, profile.currencySymbol)}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onViewStatement(party)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Statement</span>
                </button>

                {party.partyType === 'CUSTOMER' || party.partyType === 'BOTH' ? (
                  <button
                    onClick={() => onQuickPayment(party, 'CUSTOMER_RECEIPT')}
                    className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    title="Paisa Received from Customer"
                  >
                    + Receipt
                  </button>
                ) : null}

                {party.partyType === 'SUPPLIER' || party.partyType === 'BOTH' ? (
                  <button
                    onClick={() => onQuickPayment(party, 'SUPPLIER_PAYMENT')}
                    className="py-1.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    title="Pay to Supplier"
                  >
                    - Pay
                  </button>
                ) : null}

                <button
                  onClick={() => onEditParty(party)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
