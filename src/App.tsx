import React, { useState, useEffect } from 'react';
import {
  AppState,
  clearToCleanRealState,
  getDefaultInitialState,
  loadStoredState,
  postTransaction,
  saveStoredState,
} from './db/storage';
import {
  BusinessProfile,
  Party,
  ProductItem,
  Transaction,
  TransactionType,
  UserProfile,
  UserRole,
} from './types/accounting';
import { createReversalJournalEntry } from './engine/doubleEntry';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { SalesPurchasesView } from './components/SalesPurchasesView';
import { PartiesView } from './components/PartiesView';
import { ItemsStockView } from './components/ItemsStockView';
import { PaymentsExpensesView } from './components/PaymentsExpensesView';
import { ReportsLedgerView } from './components/ReportsLedgerView';
import { VerificationTestsView } from './components/VerificationTestsView';
import { SettingsMobileView } from './components/SettingsMobileView';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { TransactionModal } from './components/TransactionModal';
import { PartyModal } from './components/PartyModal';
import { PartyStatementModal } from './components/PartyStatementModal';
import { ItemModal } from './components/ItemModal';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadStoredState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Modals state
  const [activeTxModalType, setActiveTxModalType] = useState<TransactionType | null>(null);
  const [printTransaction, setPrintTransaction] = useState<Transaction | null>(null);
  const [editingParty, setEditingParty] = useState<Party | null | 'NEW'>(null);
  const [statementParty, setStatementParty] = useState<Party | null>(null);
  const [editingItem, setEditingItem] = useState<ProductItem | null | 'NEW'>(null);
  const [journalModalTx, setJournalModalTx] = useState<Transaction | null>(null);

  // Reversal Prompt Modal state
  const [reversingTx, setReversingTx] = useState<Transaction | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');

  // Offline/Online listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Role Switcher
  const handleRoleChange = (role: UserRole) => {
    const updated = {
      ...appState,
      currentUser: {
        ...appState.currentUser,
        role,
      },
    };
    setAppState(updated);
    saveStoredState(updated);
  };

  // Switch to clean blank ledger
  const handleSwitchToRealData = () => {
    const confirmed = window.confirm(
      'Kya aap sach mein Sample Data hatakar apna Real Blank Ledger shuru karna chahte hain? Sample demo entries hat jayengi.'
    );
    if (!confirmed) return;

    const clean = clearToCleanRealState(appState.profile.ownerName, appState.profile.shopName);
    setAppState(clean);
    setActiveTab('DASHBOARD');
  };

  // Reset sample demo data
  const handleResetSampleData = () => {
    const defaultState = getDefaultInitialState();
    setAppState(defaultState);
    saveStoredState(defaultState);
    setActiveTab('DASHBOARD');
  };

  // Post new transaction through double-entry engine
  const handleTransactionSubmit = (tx: Transaction) => {
    try {
      const { updatedState } = postTransaction(
        appState,
        tx,
        appState.currentUser.name,
        appState.currentUser.id
      );
      setAppState(updatedState);
      setActiveTxModalType(null);
    } catch (err: any) {
      alert(`Transaction posting error: ${err.message}`);
    }
  };

  // Reversal of posted transaction (Requirement 8 - no silent deletion)
  const handleConfirmReversal = () => {
    if (!reversingTx) return;
    if (!reversalReason.trim()) {
      alert('Kripya reversal ka kaaran (reason) likhein.');
      return;
    }

    try {
      const originalJournal = appState.journalEntries.find(
        (j) => j.transactionId === reversingTx.id
      );
      if (!originalJournal) {
        throw new Error('Associated journal entry not found.');
      }

      // 1. Create reversal journal entry
      const reversalJournal = createReversalJournalEntry(
        originalJournal,
        reversalReason,
        new Date().toISOString().slice(0, 10)
      );

      // 2. Mark transaction as reversed
      const transactions = appState.transactions.map((t) =>
        t.id === reversingTx.id
          ? {
              ...t,
              isReversed: true,
              reversalReason,
              reversedByUserName: appState.currentUser.name,
              reversedAtTimestamp: Date.now(),
            }
          : t
      );

      // 3. Roll back inventory and party balance
      const products = [...appState.products];
      if (reversingTx.type === 'SALE') {
        for (const item of reversingTx.items) {
          const idx = products.findIndex((p) => p.id === item.productId);
          if (idx !== -1) {
            products[idx] = {
              ...products[idx],
              availableStock: products[idx].availableStock + item.quantity,
            };
          }
        }
      } else if (reversingTx.type === 'PURCHASE') {
        for (const item of reversingTx.items) {
          const idx = products.findIndex((p) => p.id === item.productId);
          if (idx !== -1) {
            products[idx] = {
              ...products[idx],
              availableStock: Math.max(0, products[idx].availableStock - item.quantity),
            };
          }
        }
      }

      const parties = [...appState.parties];
      if (reversingTx.partyId) {
        const pIdx = parties.findIndex((p) => p.id === reversingTx.partyId);
        if (pIdx !== -1) {
          const party = { ...parties[pIdx] };
          if (reversingTx.type === 'SALE') {
            party.openingReceivableCents = Math.max(0, party.openingReceivableCents - reversingTx.pendingAmountCents);
          } else if (reversingTx.type === 'PURCHASE') {
            party.openingPayableCents = Math.max(0, party.openingPayableCents - reversingTx.pendingAmountCents);
          } else if (reversingTx.type === 'CUSTOMER_RECEIPT') {
            party.openingReceivableCents += reversingTx.paidAmountCents;
          } else if (reversingTx.type === 'SUPPLIER_PAYMENT') {
            party.openingPayableCents += reversingTx.paidAmountCents;
          }
          parties[pIdx] = party;
        }
      }

      const updatedState: AppState = {
        ...appState,
        transactions,
        products,
        parties,
        journalEntries: [reversalJournal, ...appState.journalEntries],
        auditLogs: [
          {
            id: `aud-rev-${Date.now()}`,
            timestamp: Date.now(),
            userId: appState.currentUser.id,
            userName: appState.currentUser.name,
            action: `REVERSED_${reversingTx.type}`,
            entityType: 'TRANSACTION',
            entityId: reversingTx.id,
            details: `Voided ${reversingTx.invoiceNumber}. Reason: ${reversalReason}`,
          },
          ...appState.auditLogs,
        ],
      };

      setAppState(updatedState);
      saveStoredState(updatedState);
      setReversingTx(null);
      setReversalReason('');
    } catch (err: any) {
      alert(`Reversal failed: ${err.message}`);
    }
  };

  // Party save
  const handleSaveParty = (party: Party) => {
    const existingIdx = appState.parties.findIndex((p) => p.id === party.id);
    let updatedParties: Party[];
    if (existingIdx !== -1) {
      updatedParties = [...appState.parties];
      updatedParties[existingIdx] = party;
    } else {
      updatedParties = [party, ...appState.parties];
    }

    const updatedState = { ...appState, parties: updatedParties };
    setAppState(updatedState);
    saveStoredState(updatedState);
    setEditingParty(null);
  };

  // Product Item save
  const handleSaveItem = (item: ProductItem) => {
    const existingIdx = appState.products.findIndex((p) => p.id === item.id);
    let updatedProducts: ProductItem[];
    if (existingIdx !== -1) {
      updatedProducts = [...appState.products];
      updatedProducts[existingIdx] = item;
    } else {
      updatedProducts = [item, ...appState.products];
    }

    const updatedState = { ...appState, products: updatedProducts };
    setAppState(updatedState);
    saveStoredState(updatedState);
    setEditingItem(null);
  };

  // Cash/Bank Transfer & Capital posting
  const handlePostTransfer = (
    type: 'BANK_TRANSFER' | 'CAPITAL_ADDITION' | 'CAPITAL_WITHDRAWAL',
    amountCents: number,
    mode: 'CASH' | 'BANK',
    notes: string
  ) => {
    const prefix = type === 'BANK_TRANSFER' ? 'TRF' : 'CAP';
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoiceNumber: `${prefix}-${Date.now().toString().slice(-6)}`,
      type,
      date: new Date().toISOString().slice(0, 10),
      createdTimestamp: Date.now(),
      modifiedTimestamp: Date.now(),
      createdByUserId: appState.currentUser.id,
      createdByUserName: appState.currentUser.name,
      createdByRole: appState.currentUser.role,
      paymentMode: mode,
      items: [],
      subtotalCents: amountCents,
      discountCents: 0,
      deliveryChargeCents: 0,
      taxCents: 0,
      grandTotalCents: amountCents,
      paidAmountCents: amountCents,
      pendingAmountCents: 0,
      notes,
      journalEntryId: `jrn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      syncStatus: 'SYNCED',
    };

    handleTransactionSubmit(tx);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        profile={appState.profile}
        currentUser={appState.currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRoleChange={handleRoleChange}
        onOpenNewTransaction={(type) => setActiveTxModalType(type)}
        onSwitchToRealData={handleSwitchToRealData}
        onResetSampleData={handleResetSampleData}
        isOffline={isOffline}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'DASHBOARD' && (
          <DashboardView
            profile={appState.profile}
            userRole={appState.currentUser.role}
            transactions={appState.transactions}
            parties={appState.parties}
            products={appState.products}
            onOpenTransaction={(tx) => setPrintTransaction(tx)}
            onOpenParty={(id) => {
              const party = appState.parties.find((p) => p.id === id);
              if (party) setStatementParty(party);
            }}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'SALES_PURCHASES' && (
          <SalesPurchasesView
            profile={appState.profile}
            userRole={appState.currentUser.role}
            transactions={appState.transactions}
            onOpenNewTransaction={(type) => setActiveTxModalType(type)}
            onPrintTransaction={(tx) => setPrintTransaction(tx)}
            onViewJournal={(tx) => setJournalModalTx(tx)}
            onReverseTransaction={(tx) => setReversingTx(tx)}
          />
        )}

        {activeTab === 'PARTIES' && (
          <PartiesView
            profile={appState.profile}
            parties={appState.parties}
            transactions={appState.transactions}
            onOpenNewParty={() => setEditingParty('NEW')}
            onEditParty={(p) => setEditingParty(p)}
            onViewStatement={(p) => setStatementParty(p)}
            onQuickPayment={(p, type) => {
              setActiveTxModalType(type);
            }}
          />
        )}

        {activeTab === 'ITEMS_STOCK' && (
          <ItemsStockView
            profile={appState.profile}
            userRole={appState.currentUser.role}
            products={appState.products}
            onOpenNewItem={() => setEditingItem('NEW')}
            onEditItem={(item) => setEditingItem(item)}
          />
        )}

        {activeTab === 'PAYMENTS_EXPENSES' && (
          <PaymentsExpensesView
            profile={appState.profile}
            userRole={appState.currentUser.role}
            transactions={appState.transactions}
            expenseCategories={appState.expenseCategories}
            onOpenNewExpense={() => setActiveTxModalType('EXPENSE')}
            onPostTransfer={handlePostTransfer}
          />
        )}

        {activeTab === 'REPORTS_LEDGER' && (
          <ReportsLedgerView
            profile={appState.profile}
            userRole={appState.currentUser.role}
            transactions={appState.transactions}
            journalEntries={appState.journalEntries}
            products={appState.products}
            parties={appState.parties}
            auditLogs={appState.auditLogs}
          />
        )}

        {activeTab === 'TESTS_VERIFICATION' && <VerificationTestsView />}

        {activeTab === 'SETTINGS_MOBILE' && (
          <SettingsMobileView
            profile={appState.profile}
            currentUser={appState.currentUser}
            appState={appState}
            onUpdateProfile={(p) => {
              const updated = { ...appState, profile: p };
              setAppState(updated);
              saveStoredState(updated);
            }}
            onRestoreState={(restored) => setAppState(restored)}
            onSwitchToRealData={handleSwitchToRealData}
          />
        )}
      </main>

      {/* MODALS */}

      {/* New Transaction / Invoice Modal */}
      {activeTxModalType && (
        <TransactionModal
          initialType={activeTxModalType}
          profile={appState.profile}
          currentUser={appState.currentUser}
          parties={appState.parties}
          products={appState.products}
          expenseCategories={appState.expenseCategories}
          onClose={() => setActiveTxModalType(null)}
          onSubmit={handleTransactionSubmit}
        />
      )}

      {/* Print Tax Invoice / Bill Modal */}
      {printTransaction && (
        <InvoicePrintModal
          transaction={printTransaction}
          profile={appState.profile}
          onClose={() => setPrintTransaction(null)}
        />
      )}

      {/* Party Create / Edit Modal */}
      {editingParty && (
        <PartyModal
          profile={appState.profile}
          initialParty={editingParty === 'NEW' ? null : editingParty}
          onClose={() => setEditingParty(null)}
          onSave={handleSaveParty}
        />
      )}

      {/* Party Statement Modal */}
      {statementParty && (
        <PartyStatementModal
          party={statementParty}
          profile={appState.profile}
          transactions={appState.transactions}
          onClose={() => setStatementParty(null)}
          onOpenQuickPayment={(p, type) => {
            setStatementParty(null);
            setActiveTxModalType(type);
          }}
        />
      )}

      {/* Item Create / Edit Modal */}
      {editingItem && (
        <ItemModal
          profile={appState.profile}
          initialItem={editingItem === 'NEW' ? null : editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveItem}
        />
      )}

      {/* Journal Entry Inspector Modal */}
      {journalModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base">Double-Entry Journal Details</h3>
                <p className="text-xs text-slate-500 font-mono">
                  Tx: {journalModalTx.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setJournalModalTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {(() => {
              const jrn = appState.journalEntries.find(
                (j) => j.transactionId === journalModalTx.id
              );
              if (!jrn) {
                return (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Journal entry not found.
                  </p>
                );
              }
              return (
                <div className="mt-4 space-y-3">
                  <div className="text-xs text-slate-600">
                    <span>Description: </span>
                    <span className="font-semibold">{jrn.description}</span>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="py-2 px-3">Account</th>
                        <th className="py-2 px-3 text-right">Debit</th>
                        <th className="py-2 px-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jrn.lines.map((l, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <span className="font-mono text-slate-400 mr-2">{l.accountCode}</span>
                            <span className="font-medium">{l.accountName}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">
                            {l.debitCents > 0
                              ? (l.debitCents / 100).toFixed(2)
                              : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">
                            {l.creditCents > 0
                              ? (l.creditCents / 100).toFixed(2)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="py-2 px-3">Total (Balanced)</td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          {(jrn.totalDebitCents / 100).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          {(jrn.totalCreditCents / 100).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Transaction Reversal Modal (Requirement 8) */}
      {reversingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900">
            <h3 className="text-base font-bold text-rose-600">
              Reverse Transaction / Bill Void
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Accounting integrity ke tehat posted entries ko direct delete nahi kiya jata. Reversal entry post ki jayegi jo double-entry ledger aur stock ko accurately reverse karegi.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reversal Ka Kaaran (Reason) *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Grahak ne bill cancel karwaya / Galat item select ho gaya tha"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReversingTx(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
