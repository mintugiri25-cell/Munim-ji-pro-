import React, { useState } from 'react';
import { BusinessProfile, Party, PartyType } from '../types/accounting';
import { fromMinorUnits, toMinorUnits } from '../engine/accountingMath';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface Props {
  profile: BusinessProfile;
  initialParty?: Party | null;
  onClose: () => void;
  onSave: (party: Party) => void;
}

export const PartyModal: React.FC<Props> = ({
  profile,
  initialParty,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialParty?.name || '');
  const [businessName, setBusinessName] = useState(initialParty?.businessName || '');
  const [mobileNumber, setMobileNumber] = useState(initialParty?.mobileNumber || '');
  const [alternateNumber, setAlternateNumber] = useState(initialParty?.alternateNumber || '');
  const [address, setAddress] = useState(initialParty?.address || '');
  const [email, setEmail] = useState(initialParty?.email || '');
  const [taxNumber, setTaxNumber] = useState(initialParty?.taxNumber || '');
  const [partyType, setPartyType] = useState<PartyType>(initialParty?.partyType || 'CUSTOMER');

  // Opening balance fields
  const [balanceDirection, setBalanceDirection] = useState<'RECEIVABLE' | 'PAYABLE' | 'ZERO'>(
    initialParty
      ? initialParty.openingReceivableCents > 0
        ? 'RECEIVABLE'
        : initialParty.openingPayableCents > 0
        ? 'PAYABLE'
        : 'ZERO'
      : 'ZERO'
  );
  const [openingAmount, setOpeningAmount] = useState<string>(
    initialParty
      ? (
          fromMinorUnits(
            initialParty.openingReceivableCents || initialParty.openingPayableCents
          ) || 0
        ).toString()
      : '0'
  );

  const [creditLimit, setCreditLimit] = useState<string>(
    initialParty?.creditLimitCents ? fromMinorUnits(initialParty.creditLimitCents).toString() : ''
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState<string>(
    initialParty?.paymentTermsDays ? initialParty.paymentTermsDays.toString() : '15'
  );
  const [notes, setNotes] = useState(initialParty?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Party ka naam zaroori hai.');
      return;
    }

    if (!mobileNumber.trim()) {
      setError('Mobile number zaroori hai.');
      return;
    }

    const amountCents = toMinorUnits(parseFloat(openingAmount) || 0);

    let openingReceivableCents = 0;
    let openingPayableCents = 0;

    if (balanceDirection === 'RECEIVABLE') {
      openingReceivableCents = amountCents;
    } else if (balanceDirection === 'PAYABLE') {
      openingPayableCents = amountCents;
    }

    const partyData: Party = {
      id: initialParty?.id || `pty-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      businessName: businessName.trim() || undefined,
      mobileNumber: mobileNumber.trim(),
      alternateNumber: alternateNumber.trim() || undefined,
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      taxNumber: taxNumber.trim() || undefined,
      partyType,
      openingReceivableCents,
      openingPayableCents,
      creditLimitCents: creditLimit ? toMinorUnits(parseFloat(creditLimit)) : undefined,
      paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 15,
      notes: notes.trim() || undefined,
      createdAt: initialParty?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(partyData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-slate-900" />
            <h3 className="text-lg font-bold text-slate-900">
              {initialParty ? 'Edit Party Profile' : 'Nayi Party Jodein (New Party)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Party Type Radio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Party Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'CUSTOMER' as PartyType, label: 'Grahak (Customer)' },
                { type: 'SUPPLIER' as PartyType, label: 'Supplier (Vendor)' },
                { type: 'BOTH' as PartyType, label: 'Dono (Both)' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.type}
                  onClick={() => setPartyType(opt.type)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                    partyType === opt.type
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Business Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Party / Vyakti Ka Naam *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dukan / Business Name
              </label>
              <input
                type="text"
                placeholder="e.g. Kumar General Store"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Mobile Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternate Number / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="Optional"
                value={alternateNumber}
                onChange={(e) => setAlternateNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Opening Balance (Lena Hai vs Dena Hai) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <label className="block text-xs font-bold text-slate-900">
              Opening Balance (Pichhla Baki Khata)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBalanceDirection('ZERO')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition cursor-pointer ${
                  balanceDirection === 'ZERO'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Koi Baki Nahi (₹0)
              </button>
              <button
                type="button"
                onClick={() => setBalanceDirection('RECEIVABLE')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition cursor-pointer ${
                  balanceDirection === 'RECEIVABLE'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-emerald-700 border-slate-200'
                }`}
              >
                Lena Hai (Receivable)
              </button>
              <button
                type="button"
                onClick={() => setBalanceDirection('PAYABLE')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition cursor-pointer ${
                  balanceDirection === 'PAYABLE'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-rose-700 border-slate-200'
                }`}
              >
                Dena Hai (Payable)
              </button>
            </div>

            {balanceDirection !== 'ZERO' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Opening Balance Rakam ({profile.currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
            )}
          </div>

          {/* Credit Limit & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Credit Limit ({profile.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Optional (e.g. 50000)"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms (Days)
              </label>
              <input
                type="number"
                min="1"
                placeholder="15"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Address & Tax Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN / Tax Registration No.
              </label>
              <input
                type="text"
                placeholder="Optional GST Number"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pata (Address)
              </label>
              <input
                type="text"
                placeholder="Area, City, Pincode"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
            >
              Save Party
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
