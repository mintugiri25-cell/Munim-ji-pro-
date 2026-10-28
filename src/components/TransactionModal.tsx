import React, { useState } from 'react';
import {
  BusinessProfile,
  ExpenseCategory,
  Party,
  PaymentMode,
  ProductItem,
  Transaction,
  TransactionItem,
  TransactionType,
  UserProfile,
} from '../types/accounting';
import {
  formatCurrency,
  fromMinorUnits,
  toMinorUnits,
} from '../engine/accountingMath';
import { Plus, Trash2, X, AlertCircle } from 'lucide-react';

interface Props {
  initialType: TransactionType;
  profile: BusinessProfile;
  currentUser: UserProfile;
  parties: Party[];
  products: ProductItem[];
  expenseCategories: ExpenseCategory[];
  onClose: () => void;
  onSubmit: (tx: Transaction) => void;
}

export const TransactionModal: React.FC<Props> = ({
  initialType,
  profile,
  currentUser,
  parties,
  products,
  expenseCategories,
  onClose,
  onSubmit,
}) => {
  const [txType, setTxType] = useState<TransactionType>(initialType);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>('');
  const [partyId, setPartyId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [splitCash, setSplitCash] = useState<string>('0');
  const [splitBank, setSplitBank] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(
    expenseCategories[0]?.name || 'Miscellaneous'
  );

  // Line Items for Sale & Purchase
  const [items, setItems] = useState<
    Array<{
      productId: string;
      quantity: number;
      rate: number; // in standard currency units (e.g. 120.00)
    }>
  >([]);

  // Simple direct amount for Receipt, Payment, Expense, Capital
  const [directAmount, setDirectAmount] = useState<string>('');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [deliveryInput, setDeliveryInput] = useState<string>('0');

  // Error state
  const [error, setError] = useState<string>('');

  const isItemBased = txType === 'SALE' || txType === 'PURCHASE';

  // Filter parties by role
  const relevantParties = parties.filter((p) => {
    if (txType === 'SALE' || txType === 'CUSTOMER_RECEIPT') {
      return p.partyType === 'CUSTOMER' || p.partyType === 'BOTH';
    }
    if (txType === 'PURCHASE' || txType === 'SUPPLIER_PAYMENT') {
      return p.partyType === 'SUPPLIER' || p.partyType === 'BOTH';
    }
    return true;
  });

  // Add line item
  const handleAddItem = () => {
    if (products.length === 0) {
      setError('Pehle Items & Stock tab se items add karein.');
      return;
    }
    const defaultProduct = products[0];
    const initialRate =
      txType === 'SALE'
        ? fromMinorUnits(defaultProduct.defaultSellingPriceCents)
        : fromMinorUnits(defaultProduct.baseCostCents);

    setItems([...items, { productId: defaultProduct.id, quantity: 1, rate: initialRate }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity' | 'rate', value: any) => {
    const updated = [...items];
    const current = { ...updated[index] };

    if (field === 'productId') {
      current.productId = value;
      const product = products.find((p) => p.id === value);
      if (product) {
        current.rate =
          txType === 'SALE'
            ? fromMinorUnits(product.defaultSellingPriceCents)
            : fromMinorUnits(product.baseCostCents);
      }
    } else if (field === 'quantity') {
      current.quantity = Math.max(0.01, parseFloat(value) || 0);
    } else if (field === 'rate') {
      current.rate = Math.max(0, parseFloat(value) || 0);
    }

    updated[index] = current;
    setItems(updated);
  };

  // Calculate Subtotal & Totals
  let calculatedSubtotalCents = 0;
  const processedItems: TransactionItem[] = [];

  if (isItemBased) {
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const lineTotalCents = toMinorUnits(item.quantity * item.rate);
      calculatedSubtotalCents += lineTotalCents;

      // Historical COGS at time of sale
      const unitCostCents = product.weightedAverageCostCents || product.baseCostCents;
      const cogsCents = txType === 'SALE' ? Math.round(item.quantity * unitCostCents) : 0;

      processedItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.code,
        unit: product.unit,
        quantity: item.quantity,
        unitCostCents,
        unitPriceCents: toMinorUnits(item.rate),
        discountPercent: 0,
        taxPercent: 0,
        lineTotalCents,
        cogsCents,
      });
    }
  } else {
    calculatedSubtotalCents = toMinorUnits(parseFloat(directAmount) || 0);
  }

  const discountCents = toMinorUnits(parseFloat(discountInput) || 0);
  const deliveryChargeCents = toMinorUnits(parseFloat(deliveryInput) || 0);
  const grandTotalCents = Math.max(0, calculatedSubtotalCents - discountCents + deliveryChargeCents);

  // Default Paid Amount
  const defaultPaid = fromMinorUnits(grandTotalCents);
  const effectivePaidCents =
    paymentMode === 'CREDIT'
      ? 0
      : paidAmountInput !== ''
      ? toMinorUnits(parseFloat(paidAmountInput) || 0)
      : grandTotalCents;

  const pendingAmountCents = Math.max(0, grandTotalCents - effectivePaidCents);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isItemBased && items.length === 0) {
      setError('Kam se kam ek item add karein.');
      return;
    }

    if (grandTotalCents <= 0) {
      setError('Kul rakam (Total Amount) 0 se zyada honi chahiye.');
      return;
    }

    if ((txType === 'CUSTOMER_RECEIPT' || txType === 'SUPPLIER_PAYMENT') && !partyId) {
      setError('Kripya party chunein.');
      return;
    }

    const selectedParty = parties.find((p) => p.id === partyId);

    // Generate Invoice Number
    const prefix =
      txType === 'SALE'
        ? 'INV'
        : txType === 'PURCHASE'
        ? 'PUR'
        : txType === 'CUSTOMER_RECEIPT'
        ? 'RCT'
        : txType === 'SUPPLIER_PAYMENT'
        ? 'PAY'
        : txType === 'EXPENSE'
        ? 'EXP'
        : 'CAP';
    const invoiceNumber = `${prefix}-${Date.now().toString().slice(-6)}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoiceNumber,
      type: txType,
      date,
      createdTimestamp: Date.now(),
      modifiedTimestamp: Date.now(),
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      createdByRole: currentUser.role,
      partyId: selectedParty?.id,
      partyName: selectedParty?.name,
      paymentMode,
      splitCashAmountCents: paymentMode === 'SPLIT' ? toMinorUnits(parseFloat(splitCash) || 0) : 0,
      splitBankAmountCents: paymentMode === 'SPLIT' ? toMinorUnits(parseFloat(splitBank) || 0) : 0,
      items: processedItems,
      subtotalCents: calculatedSubtotalCents,
      discountCents,
      deliveryChargeCents,
      taxCents: 0,
      grandTotalCents,
      paidAmountCents: effectivePaidCents,
      pendingAmountCents,
      dueDate: dueDate || undefined,
      expenseCategory: txType === 'EXPENSE' ? expenseCategory : undefined,
      notes,
      journalEntryId: `jrn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      syncStatus: 'SYNCED',
    };

    onSubmit(newTx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {txType === 'SALE'
                ? 'Nayi Bikri Bill (New Sale Invoice)'
                : txType === 'PURCHASE'
                ? 'Nayi Kharid Bill (New Purchase Voucher)'
                : txType === 'CUSTOMER_RECEIPT'
                ? 'Paisa Aaya (Customer Receipt)'
                : txType === 'SUPPLIER_PAYMENT'
                ? 'Paisa Diya (Supplier Payment)'
                : txType === 'EXPENSE'
                ? 'Dukan Kharcha (Business Expense)'
                : 'Malik Ka Paisa (Owner Capital)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Double-entry validated accounting entry
            </p>
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
          {/* Top Meta: Date, Party */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarikh (Date) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            {/* Party Selector for Sales, Purchases, Receipts, Payments */}
            {(txType === 'SALE' ||
              txType === 'PURCHASE' ||
              txType === 'CUSTOMER_RECEIPT' ||
              txType === 'SUPPLIER_PAYMENT') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Party (Grahak / Supplier)
                </label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white cursor-pointer"
                >
                  <option value="">
                    {txType === 'SALE' ? 'Walk-in Cash Customer' : '-- Party Chunein --'}
                  </option>
                  {relevantParties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.businessName ? `(${p.businessName})` : ''} - Bal:{' '}
                      {formatCurrency(
                        p.openingReceivableCents - p.openingPayableCents,
                        profile.currencySymbol
                      )}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Expense Category */}
            {txType === 'EXPENSE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kharch Ki Category *
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white cursor-pointer"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.nameHinglish})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Item Based Line Items */}
          {isItemBased && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bill Items ({items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Item Jodein</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Koi item nahi joda gaya. Upar <strong>"+ Item Jodein"</strong> par click karein.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const currentProd = products.find((p) => p.id === item.productId);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                      >
                        {/* Product Picker */}
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 font-medium">
                            Product
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.availableStock} {p.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-24">
                          <label className="block text-[10px] text-slate-500 font-medium">
                            Qty ({currentProd?.unit || 'Pcs'})
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-right font-medium"
                          />
                        </div>

                        {/* Rate */}
                        <div className="w-28">
                          <label className="block text-[10px] text-slate-500 font-medium">
                            Rate ({profile.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-right font-medium"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="w-28 text-right sm:pt-4">
                          <span className="text-xs font-bold text-slate-900">
                            {formatCurrency(
                              toMinorUnits(item.quantity * item.rate),
                              profile.currencySymbol
                            )}
                          </span>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 sm:mt-3 self-end cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Direct Amount for non-item transactions */}
          {!isItemBased && (
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
                value={directAmount}
                onChange={(e) => setDirectAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          )}

          {/* Discount & Freight for Item Based */}
          {isItemBased && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Chhoot (Discount in {profile.currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Bhaada (Delivery/Freight)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={deliveryInput}
                  onChange={(e) => setDeliveryInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Payment Mode & Settlement */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white cursor-pointer"
                >
                  <option value="CASH">Galla / Cash in Hand</option>
                  <option value="BANK">Bank Account / NetBanking</option>
                  <option value="UPI">UPI / QR Code</option>
                  {isItemBased && <option value="CREDIT">Poora Udhar (Credit)</option>}
                  {isItemBased && <option value="SPLIT">Split (Cash + Bank)</option>}
                </select>
              </div>

              {/* Paid Amount */}
              {isItemBased && paymentMode !== 'CREDIT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Praapt Rakam (Amount Paid Now)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={defaultPaid.toString()}
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold"
                  />
                </div>
              )}
            </div>

            {/* Credit Due Date if pending amount */}
            {pendingAmountCents > 0 && (
              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">
                  Udhar Chukane Ki Tarikh (Credit Due Date)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Vivaran / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 500 advance received, remaining on Diwali"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Grand Total Summary Box */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Grand Total
              </span>
              <span className="text-xl font-black text-emerald-400">
                {formatCurrency(grandTotalCents, profile.currencySymbol)}
              </span>
            </div>

            {pendingAmountCents > 0 && (
              <div className="text-right">
                <span className="text-[11px] text-rose-300 uppercase tracking-wider block">
                  Pending Udhar
                </span>
                <span className="text-sm font-bold text-rose-400">
                  {formatCurrency(pendingAmountCents, profile.currencySymbol)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
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
              Post Entry & Save Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
