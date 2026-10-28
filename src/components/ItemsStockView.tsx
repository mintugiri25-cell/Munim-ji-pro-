import React, { useState } from 'react';
import { BusinessProfile, ProductItem, UserRole } from '../types/accounting';
import { formatCurrency, fromMinorUnits } from '../engine/accountingMath';
import { downloadCsv } from '../db/storage';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Download,
  ShieldAlert,
  ArrowUpDown,
  Tag,
  Edit2,
  Image as ImageIcon,
} from 'lucide-react';

interface Props {
  profile: BusinessProfile;
  userRole: UserRole;
  products: ProductItem[];
  onOpenNewItem: () => void;
  onEditItem: (item: ProductItem) => void;
}

export const ItemsStockView: React.FC<Props> = ({
  profile,
  userRole,
  products,
  onOpenNewItem,
  onEditItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const isStaff = userRole === 'STAFF';

  // Categories list
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const filtered = products.filter((p) => {
    if (onlyLowStock && p.availableStock > p.lowStockThreshold) return false;
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCode = p.code.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchCat) return false;
    }

    return true;
  });

  const totalStockQty = products.reduce((s, p) => s + p.availableStock, 0);
  const totalStockValueCents = products.reduce(
    (s, p) => s + p.availableStock * p.weightedAverageCostCents,
    0
  );
  const lowStockCount = products.filter((p) => p.availableStock <= p.lowStockThreshold).length;

  const handleExportStockCsv = () => {
    const headers = [
      'SKU',
      'Item Name',
      'Category',
      'Unit',
      'Stock Qty',
      'Base Cost',
      'Weighted Avg Cost',
      'Profit Mode',
      'Profit %',
      'Selling Price',
      'Total Stock Value',
    ];

    const rows = products.map((p) => [
      p.code,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.unit,
      p.availableStock,
      isStaff ? 'N/A' : fromMinorUnits(p.baseCostCents).toFixed(2),
      isStaff ? 'N/A' : fromMinorUnits(p.weightedAverageCostCents).toFixed(2),
      p.profitMode,
      p.defaultProfitPercent,
      fromMinorUnits(p.defaultSellingPriceCents).toFixed(2),
      isStaff ? 'N/A' : fromMinorUnits(p.availableStock * p.weightedAverageCostCents).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(csvContent, `Stock_Valuation_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Items, Stock & Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dukan ka maal, weighted average costing aur Markup/Margin setting
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportStockCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Export Stock CSV
          </button>
          <button
            onClick={onOpenNewItem}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Naya Item Jodein</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Kul Stock Units (Quantity)
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalStockQty}</p>
          <span className="text-[11px] text-slate-400">Total units across {products.length} products</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Unsold Stock Valuation
          </span>
          {isStaff ? (
            <p className="text-sm font-semibold text-slate-400 mt-2 italic flex items-center space-x-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Restricted for Staff</span>
            </p>
          ) : (
            <>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {formatCurrency(totalStockValueCents, profile.currencySymbol)}
              </p>
              <span className="text-[11px] text-slate-400">Weighted Average Cost basis</span>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Low Stock Alerts
          </span>
          <p
            className={`text-2xl font-black mt-1 ${
              lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {lowStockCount} Items
          </p>
          <span className="text-[11px] text-slate-400">Below minimum threshold limit</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">Sabhi Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <label className="flex items-center space-x-2 text-xs text-slate-700 font-medium cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span>Sirf Low Stock</span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Available Stock</th>
                {!isStaff && <th className="py-3 px-3 text-right">Base Cost</th>}
                {!isStaff && <th className="py-3 px-3 text-right">Weighted Avg Cost</th>}
                <th className="py-3 px-3 text-center">Profit Mode</th>
                <th className="py-3 px-3 text-right">Default Selling Price</th>
                {!isStaff && <th className="py-3 px-3 text-right">Stock Valuation</th>}
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Koi item nahi mila. Naya item add karein.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLow = p.availableStock <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              SKU: {p.code}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {p.category}
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-black text-sm ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {p.availableStock} {p.unit}
                        </span>
                        {isLow && (
                          <span className="block text-[10px] text-rose-500 font-semibold">
                            Low Stock! (Min {p.lowStockThreshold})
                          </span>
                        )}
                      </td>

                      {/* Base Cost */}
                      {!isStaff && (
                        <td className="py-3 px-3 text-right text-slate-600">
                          {formatCurrency(p.baseCostCents, profile.currencySymbol)}
                        </td>
                      )}

                      {/* Weighted Average Cost */}
                      {!isStaff && (
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {formatCurrency(p.weightedAverageCostCents, profile.currencySymbol)}
                        </td>
                      )}

                      {/* Profit Mode Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.profitMode === 'MARKUP'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {p.profitMode === 'MARKUP'
                            ? `Markup +${p.defaultProfitPercent}%`
                            : `Margin ${p.defaultProfitPercent}%`}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(p.defaultSellingPriceCents, profile.currencySymbol)}
                      </td>

                      {/* Stock Valuation */}
                      {!isStaff && (
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(
                            p.availableStock * p.weightedAverageCostCents,
                            profile.currencySymbol
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onEditItem(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
