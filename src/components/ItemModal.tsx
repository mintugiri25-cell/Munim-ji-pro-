import React, { useState, useEffect } from 'react';
import { BusinessProfile, ProductItem, ProfitMode } from '../types/accounting';
import {
  calculateSellingPrice,
  formatCurrency,
  fromMinorUnits,
  toMinorUnits,
} from '../engine/accountingMath';
import { X, Package, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AiImageModal } from './AiImageModal';

interface Props {
  profile: BusinessProfile;
  initialItem?: ProductItem | null;
  onClose: () => void;
  onSave: (item: ProductItem) => void;
}

export const ItemModal: React.FC<Props> = ({
  profile,
  initialItem,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [code, setCode] = useState(initialItem?.code || '');
  const [category, setCategory] = useState(initialItem?.category || 'General');
  const [unit, setUnit] = useState(initialItem?.unit || 'Pcs');

  // Cost & Profit Settings
  const [baseCostInput, setBaseCostInput] = useState<string>(
    initialItem ? fromMinorUnits(initialItem.baseCostCents).toString() : '100'
  );
  const [additionalCostInput, setAdditionalCostInput] = useState<string>(
    initialItem ? fromMinorUnits(initialItem.additionalCostCents).toString() : '0'
  );

  const [profitMode, setProfitMode] = useState<ProfitMode>(
    initialItem?.profitMode || 'MARKUP'
  );
  const [profitPercentInput, setProfitPercentInput] = useState<string>(
    initialItem ? initialItem.defaultProfitPercent.toString() : '20'
  );

  // Manual Selling Price Override
  const [sellingPriceInput, setSellingPriceInput] = useState<string>(
    initialItem ? fromMinorUnits(initialItem.defaultSellingPriceCents).toString() : ''
  );
  const [isPriceOverridden, setIsPriceOverridden] = useState<boolean>(false);

  // Stock
  const [availableStock, setAvailableStock] = useState<string>(
    initialItem ? initialItem.availableStock.toString() : '50'
  );
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(
    initialItem ? initialItem.lowStockThreshold.toString() : '10'
  );
  const [barcode, setBarcode] = useState(initialItem?.barcode || '');
  const [imageUrl, setImageUrl] = useState(initialItem?.imageUrl || '');

  // AI Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Live Pricing Calculation
  const costMinor = toMinorUnits(
    (parseFloat(baseCostInput) || 0) + (parseFloat(additionalCostInput) || 0)
  );
  const percentNumeric = parseFloat(profitPercentInput) || 0;

  const calculation = calculateSellingPrice(costMinor, profitMode, percentNumeric);

  // Auto-fill suggested selling price if not manually overridden
  useEffect(() => {
    if (!isPriceOverridden && !calculation.error) {
      setSellingPriceInput(fromMinorUnits(calculation.sellingPriceCents).toString());
    }
  }, [baseCostInput, additionalCostInput, profitMode, profitPercentInput, isPriceOverridden]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim()) {
      setValidationError('Item ka naam zaroori hai.');
      return;
    }

    if (costMinor <= 0) {
      setValidationError('Kharid Lagat (Cost) 0 se zyada honi chahiye.');
      return;
    }

    if (calculation.error) {
      setValidationError(calculation.error);
      return;
    }

    if (profitMode === 'MARGIN' && percentNumeric >= 100) {
      setValidationError('Margin mode mein percentage 100% ya usse zyada nahi ho sakti!');
      return;
    }

    const finalSellingPriceCents = toMinorUnits(
      parseFloat(sellingPriceInput) || fromMinorUnits(calculation.sellingPriceCents)
    );

    const stockNum = parseFloat(availableStock) || 0;
    const itemData: ProductItem = {
      id: initialItem?.id || `prd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      code: code.trim() || `SKU-${Date.now().toString().slice(-5)}`,
      category: category.trim() || 'General',
      unit: unit.trim() || 'Pcs',
      baseCostCents: toMinorUnits(parseFloat(baseCostInput) || 0),
      additionalCostCents: toMinorUnits(parseFloat(additionalCostInput) || 0),
      weightedAverageCostCents: initialItem?.weightedAverageCostCents || costMinor,
      defaultSellingPriceCents: finalSellingPriceCents,
      profitMode,
      defaultProfitPercent: percentNumeric,
      availableStock: stockNum,
      openingStock: initialItem?.openingStock ?? stockNum,
      openingStockCostCents: initialItem?.openingStockCostCents ?? Math.round(stockNum * costMinor),
      lowStockThreshold: parseFloat(lowStockThreshold) || 10,
      barcode: barcode.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      createdAt: initialItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(itemData);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-slate-900" />
              <h3 className="text-lg font-bold text-slate-900">
                {initialItem ? 'Edit Product Item' : 'Naya Item / Maal Jodein'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {(validationError || calculation.error) && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError || calculation.error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Name & SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item / Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice 25 Kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Code / SKU / Barcode
                </label>
                <input
                  type="text"
                  placeholder="e.g. RICE-25K or 890123"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grains, Electricals, FMCG"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit (Ikai) *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white cursor-pointer"
                >
                  <option value="Pcs">Pcs (Pieces)</option>
                  <option value="Box">Box (Peti / Dibba)</option>
                  <option value="Bag">Bag (Bori / Katta)</option>
                  <option value="Kg">Kg (Kilogram)</option>
                  <option value="Ltr">Ltr (Litre)</option>
                  <option value="Mtr">Mtr (Metre)</option>
                  <option value="Roll">Roll</option>
                  <option value="Tin">Tin</option>
                </select>
              </div>
            </div>

            {/* Cost Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kharid Lagat (Base Cost in {profile.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={baseCostInput}
                  onChange={(e) => setBaseCostInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Anya Kharcha (Shipping/Freight per unit)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={additionalCostInput}
                  onChange={(e) => setAdditionalCostInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* PROFIT MODE & CALCULATION (Requirement 5) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Profit Mode & Calculation (Markup vs Margin)
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Formula Engine Validated
                </span>
              </div>

              {/* Toggle Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProfitMode('MARKUP')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                    profitMode === 'MARKUP'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <div>1. Cost Par Markup %</div>
                  <span className="text-[10px] font-normal block opacity-90">
                    Selling Price = Cost × (1 + M%)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProfitMode('MARGIN')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                    profitMode === 'MARGIN'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <div>2. Selling Price Par Margin %</div>
                  <span className="text-[10px] font-normal block opacity-90">
                    Selling Price = Cost / (1 − M%)
                  </span>
                </button>
              </div>

              {/* Profit Percent Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {profitMode === 'MARKUP' ? 'Markup Percentage (%)' : 'Margin Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={profitMode === 'MARGIN' ? '99.99' : '9999'}
                    step="any"
                    value={profitPercentInput}
                    onChange={(e) => {
                      setProfitPercentInput(e.target.value);
                      setIsPriceOverridden(false);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-bold"
                  />
                  {profitMode === 'MARGIN' && (
                    <span className="text-[10px] text-rose-600 block mt-0.5">
                      Note: Margin 100% ya usse zyada input reject hota hai.
                    </span>
                  )}
                </div>

                {/* Calculation Demonstration Box */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Cost:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(costMinor, profile.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Suggested Price:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(calculation.sellingPriceCents, profile.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-100">
                    <span>Expected Gross Profit:</span>
                    <span>
                      {formatCurrency(calculation.grossProfitCents, profile.currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Final Selling Price with Override option */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Final Default Selling Price ({profile.currencySymbol}) *
                  </label>
                  {isPriceOverridden && (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                      Manual Price Override
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={sellingPriceInput}
                  onChange={(e) => {
                    setSellingPriceInput(e.target.value);
                    setIsPriceOverridden(true);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-black text-slate-900"
                />
              </div>
            </div>

            {/* Stock & Low-Stock Alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mawjuda Stock (Available Stock)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={availableStock}
                  onChange={(e) => setAvailableStock(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Low Stock Warning Alert
                </label>
                <input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Product Image & AI Generation Button */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Image (Photo)
              </label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Product"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <Package className="w-5 h-5" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                  <span>Generate AI Product Photo (Gemini)</span>
                </button>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
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
                Save Product
              </button>
            </div>
          </form>
        </div>
      </div>

      {showAiModal && (
        <AiImageModal
          initialPrompt={`Studio product photography of ${name || 'item'} with clean crisp lighting and realistic packaging`}
          onClose={() => setShowAiModal(false)}
          onApplyImage={(url) => setImageUrl(url)}
        />
      )}
    </>
  );
};
