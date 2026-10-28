import React from 'react';
import { BusinessProfile, Transaction } from '../types/accounting';
import { formatCurrency, fromMinorUnits } from '../engine/accountingMath';
import { Printer, X, Download } from 'lucide-react';

interface Props {
  transaction: Transaction;
  profile: BusinessProfile;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<Props> = ({ transaction, profile, onClose }) => {
  const isSale = transaction.type === 'SALE';
  const isPurchase = transaction.type === 'PURCHASE';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:max-w-none print:w-full print:rounded-none">
        
        {/* Controls - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              {isSale ? 'Tax Invoice / Bikri Bill' : isPurchase ? 'Purchase Bill' : 'Voucher Receipt'}
            </span>
            <span className="text-sm font-medium text-slate-500">
              #{transaction.invoiceNumber}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="pt-6 font-sans printable-invoice">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-300">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {profile.shopName}
              </h1>
              <p className="text-xs text-slate-600 mt-1">{profile.address || 'Business Address'}</p>
              <p className="text-xs text-slate-600">
                Phone: {profile.contactNumber} {profile.alternateNumber ? `| ${profile.alternateNumber}` : ''}
              </p>
              {profile.taxNumber && (
                <p className="text-xs font-semibold text-slate-800 mt-1">
                  GSTIN / Tax ID: <span className="font-mono">{profile.taxNumber}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="inline-block text-xs uppercase tracking-widest font-bold px-3 py-1 bg-slate-100 rounded text-slate-800 border border-slate-200">
                {isSale ? 'TAX INVOICE' : isPurchase ? 'PURCHASE VOUCHER' : 'RECEIPT VOUCHER'}
              </div>
              <p className="text-sm font-semibold font-mono text-slate-900 mt-2">
                Bill No: {transaction.invoiceNumber}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: {transaction.date}
              </p>
              {transaction.dueDate && (
                <p className="text-xs text-amber-700 font-medium">
                  Due Date: {transaction.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div className="py-4 border-b border-slate-200 flex justify-between text-xs">
            <div>
              <span className="text-slate-400 uppercase tracking-wider font-semibold">Bill To / M/s:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {transaction.partyName || 'Walk-in Counter Customer'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 uppercase tracking-wider font-semibold">Payment Mode:</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {transaction.paymentMode} {transaction.pendingAmountCents > 0 ? '(Partial Credit)' : '(Fully Settled)'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          {transaction.items && transaction.items.length > 0 ? (
            <div className="mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 uppercase font-semibold">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Item Description</th>
                    <th className="py-2.5 px-2">SKU</th>
                    <th className="py-2.5 px-2 text-right">Qty</th>
                    <th className="py-2.5 px-2 text-right">Rate</th>
                    <th className="py-2.5 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transaction.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-2 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-900">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">{item.sku}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-800">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">
                        {formatCurrency(item.unitPriceCents, profile.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-slate-900">
                        {formatCurrency(item.lineTotalCents, profile.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-slate-500 italic">
              {transaction.notes || 'Direct payment transaction voucher.'}
            </div>
          )}

          {/* Summary Calculation */}
          <div className="mt-6 pt-4 border-t-2 border-slate-300 flex justify-between items-start text-xs">
            <div className="max-w-xs text-slate-500">
              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
              <p className="mt-1">
                Goods once sold will not be taken back without original bill. All disputes subject to local jurisdiction.
              </p>
              {transaction.notes && (
                <p className="mt-2 text-slate-700 italic">
                  Note: {transaction.notes}
                </p>
              )}
            </div>

            <div className="w-64 space-y-1.5 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(transaction.subtotalCents, profile.currencySymbol)}</span>
              </div>
              {transaction.discountCents > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(transaction.discountCents, profile.currencySymbol)}</span>
                </div>
              )}
              {transaction.deliveryChargeCents > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery/Freight:</span>
                  <span>+{formatCurrency(transaction.deliveryChargeCents, profile.currencySymbol)}</span>
                </div>
              )}
              {transaction.taxCents > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax:</span>
                  <span>+{formatCurrency(transaction.taxCents, profile.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                <span>Grand Total:</span>
                <span>{formatCurrency(transaction.grandTotalCents, profile.currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Amount Paid:</span>
                <span>{formatCurrency(transaction.paidAmountCents, profile.currencySymbol)}</span>
              </div>
              {transaction.pendingAmountCents > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Balance Due (Udhar):</span>
                  <span>{formatCurrency(transaction.pendingAmountCents, profile.currencySymbol)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 pt-8 flex justify-between text-xs text-slate-500 border-t border-slate-200">
            <div className="text-center w-40">
              <div className="h-10"></div>
              <div className="border-t border-slate-400 pt-1">Receiver's Signature</div>
            </div>
            <div className="text-center w-48">
              <div className="h-10"></div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                For {profile.shopName}
              </div>
              <div className="text-[10px] text-slate-400">Authorized Signatory</div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-8 print:mt-12">
            Generated with MunimJi Pro • Double-Entry Verified Accounting
          </div>
        </div>
      </div>
    </div>
  );
};
