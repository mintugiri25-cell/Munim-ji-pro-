import React from 'react';
import { BusinessProfile, UserProfile, UserRole } from '../types/accounting';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Wallet,
  FileSpreadsheet,
  CheckCircle2,
  Smartphone,
  Plus,
  Shield,
  Wifi,
  WifiOff,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export type ActiveTab =
  | 'DASHBOARD'
  | 'SALES_PURCHASES'
  | 'PARTIES'
  | 'ITEMS_STOCK'
  | 'PAYMENTS_EXPENSES'
  | 'REPORTS_LEDGER'
  | 'TESTS_VERIFICATION'
  | 'SETTINGS_MOBILE';

interface Props {
  profile: BusinessProfile;
  currentUser: UserProfile;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onRoleChange: (role: UserRole) => void;
  onOpenNewTransaction: (type: 'SALE' | 'PURCHASE' | 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT' | 'EXPENSE') => void;
  onSwitchToRealData: () => void;
  onResetSampleData: () => void;
  isOffline: boolean;
}

export const Navbar: React.FC<Props> = ({
  profile,
  currentUser,
  activeTab,
  setActiveTab,
  onRoleChange,
  onOpenNewTransaction,
  onSwitchToRealData,
  onResetSampleData,
  isOffline,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      {/* Sample Data Warning Banner if active */}
      {profile.isSampleData && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 px-4 py-1.5 text-xs text-white flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center space-x-2 font-medium">
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>
              <strong>Sample Business Data Mode:</strong> Aap testing demo data dekh rahe hain. Isme sample parties, stock aur entries hain.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onSwitchToRealData}
              className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-2.5 py-0.5 rounded text-[11px] shadow-xs cursor-pointer transition"
            >
              Start Real Blank Ledger
            </button>
            <button
              onClick={onResetSampleData}
              className="bg-amber-900/60 hover:bg-amber-900 text-white font-medium px-2 py-0.5 rounded text-[11px] cursor-pointer transition"
            >
              Reset Sample
            </button>
          </div>
        </div>
      )}

      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
              M
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  MunimJi Pro
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Double-Entry
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                {profile.shopName} • <span className="text-slate-300">{profile.ownerName}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Desktop & Tablet) */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={() => onOpenNewTransaction('SALE')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Sale (Bikri)</span>
            </button>
            <button
              onClick={() => onOpenNewTransaction('PURCHASE')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Purchase (Kharid)</span>
            </button>
            <button
              onClick={() => onOpenNewTransaction('CUSTOMER_RECEIPT')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Paisa Aaya</span>
            </button>
            <button
              onClick={() => onOpenNewTransaction('SUPPLIER_PAYMENT')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Paisa Diya</span>
            </button>
            <button
              onClick={() => onOpenNewTransaction('EXPENSE')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Kharcha</span>
            </button>
          </div>

          {/* User Role Switcher & Offline Indicator */}
          <div className="flex items-center space-x-3">
            {/* Offline badge */}
            <div
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isOffline
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
              title={isOffline ? 'Offline Mode (Local Database Active)' : 'Online & Synchronized'}
            >
              {isOffline ? <WifiOff className="w-3 h-3 text-rose-400" /> : <Wifi className="w-3 h-3 text-emerald-400" />}
              <span className="hidden sm:inline">{isOffline ? 'Offline' : 'Online'}</span>
            </div>

            {/* Role selector */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
              <Shield className="w-3.5 h-3.5 text-slate-400 ml-1.5 hidden sm:block" />
              <select
                value={currentUser.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="OWNER" className="bg-slate-900 text-white">
                  Owner (Malik)
                </option>
                <option value="ACCOUNTANT" className="bg-slate-900 text-white">
                  Accountant (Munim)
                </option>
                <option value="STAFF" className="bg-slate-900 text-white">
                  Staff (Sales/Billing)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Quick Action Buttons Row */}
        <div className="flex md:hidden items-center justify-between gap-1.5 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/80">
          <button
            onClick={() => onOpenNewTransaction('SALE')}
            className="flex-1 min-w-[75px] py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold text-center"
          >
            + Sale
          </button>
          <button
            onClick={() => onOpenNewTransaction('PURCHASE')}
            className="flex-1 min-w-[75px] py-1 bg-blue-600 text-white rounded text-[11px] font-semibold text-center"
          >
            + Purchase
          </button>
          <button
            onClick={() => onOpenNewTransaction('CUSTOMER_RECEIPT')}
            className="flex-1 min-w-[75px] py-1 bg-slate-800 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-semibold text-center"
          >
            Inflow
          </button>
          <button
            onClick={() => onOpenNewTransaction('SUPPLIER_PAYMENT')}
            className="flex-1 min-w-[75px] py-1 bg-slate-800 text-rose-400 border border-rose-500/30 rounded text-[11px] font-semibold text-center"
          >
            Outflow
          </button>
          <button
            onClick={() => onOpenNewTransaction('EXPENSE')}
            className="flex-1 min-w-[75px] py-1 bg-slate-800 text-amber-400 border border-amber-500/30 rounded text-[11px] font-semibold text-center"
          >
            Kharcha
          </button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'bg-slate-800 text-white shadow-xs font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('SALES_PURCHASES')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'SALES_PURCHASES'
                ? 'bg-slate-800 text-white shadow-xs font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sale & Purchase</span>
          </button>

          <button
            onClick={() => setActiveTab('PARTIES')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'PARTIES'
                ? 'bg-slate-800 text-white shadow-xs font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Parties (Khata Bahi)</span>
          </button>

          <button
            onClick={() => setActiveTab('ITEMS_STOCK')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'ITEMS_STOCK'
                ? 'bg-slate-800 text-white shadow-xs font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Items & Stock</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS_EXPENSES')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'PAYMENTS_EXPENSES'
                ? 'bg-slate-800 text-white shadow-xs font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Rokad & Kharch</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORTS_LEDGER')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'REPORTS_LEDGER'
                ? 'bg-slate-800 text-white shadow-xs font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ledgers & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('TESTS_VERIFICATION')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'TESTS_VERIFICATION'
                ? 'bg-emerald-950 text-emerald-300 shadow-xs font-semibold border border-emerald-800'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Math & Engine Tests</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS_MOBILE')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === 'SETTINGS_MOBILE'
                ? 'bg-slate-800 text-white shadow-xs font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Settings & Mobile Build</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
