import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  History,
  Home,
  PieChart,
  Plus,
  Settings,
} from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { RabManagerView } from './components/RabManagerView';
import { SettingsView } from './components/SettingsView';
import { ToastContainer } from './components/ToastContainer';
import { TransactionsView } from './components/TransactionsView';
import {
  DEFAULT_BUSINESS_PROFILE,
  DEMO_INCOME_SOURCES,
  DEMO_RAB_ITEMS,
  DEMO_TRANSACTIONS,
} from './data/demoData';
import type {
  BusinessProfile,
  IncomeSourceItem,
  NavTab,
  RabItem,
  ToastMessage,
  TransactionItem,
} from './types/finance';
import {
  computeIncomeSourceMetrics,
  computeRabMetrics,
  filterTransactionsByPeriod,
  formatMonthLabel,
  formatRupiah,
  getCurrentMonthKey,
  getMonthDateBounds,
  normalizeBusinessProfile,
} from './utils/finance';

const STORAGE_KEY_RAB = 'sakuku_budget_items_v1';
const STORAGE_KEY_TX = 'sakuku_transactions_v1';
const STORAGE_KEY_INCOME_SOURCES = 'sakuku_income_sources_v1';
const STORAGE_KEY_BUSINESS_PROFILE = 'sakuku_profile_v1';

function loadInitialRab(): RabItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RAB);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback to demo data
  }
  return DEMO_RAB_ITEMS;
}

function loadInitialTransactions(): TransactionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TX);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback to demo data
  }
  return DEMO_TRANSACTIONS;
}

function mergeMissingIncomeCategories(
  baseSources: IncomeSourceItem[],
  txList: TransactionItem[]
): IncomeSourceItem[] {
  const seen = new Set(baseSources.map((s) => s.name.trim().toLowerCase()));
  const merged = [...baseSources];
  let idx = 0;

  for (const tx of txList) {
    if (tx.type !== 'income') continue;
    const trimmed = tx.category.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      idx += 1;
      merged.push({
        id: `inc-merged-${Date.now()}-${idx}`,
        name: trimmed,
        notes: 'Dipulihkan dari riwayat transaksi pemasukan.',
        createdAt: tx.date || new Date().toISOString().slice(0, 10),
      });
    }
  }

  return merged;
}

function loadInitialIncomeSources(initialTx: TransactionItem[]): IncomeSourceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INCOME_SOURCES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback to demo data
  }
  return mergeMissingIncomeCategories(DEMO_INCOME_SOURCES, initialTx);
}

function loadInitialBusinessProfile(): BusinessProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUSINESS_PROFILE);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return normalizeBusinessProfile(parsed);
      }
    }
  } catch {
    // Fallback to default profile
  }
  return DEFAULT_BUSINESS_PROFILE;
}

const PRIMARY_NAV_ITEMS: Array<{
  id: Exclude<NavTab, 'settings'>;
  label: string;
  icon: typeof Home;
}> = [
  {
    id: 'dashboard',
    label: 'Beranda',
    icon: Home,
  },
  {
    id: 'rab',
    label: 'Budget',
    icon: PieChart,
  },
  {
    id: 'transactions',
    label: 'Riwayat',
    icon: History,
  },
  {
    id: 'monthly',
    label: 'Rekap',
    icon: CalendarRange,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [rabSubTab, setRabSubTab] = useState<'rab' | 'income'>('rab');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() =>
    getCurrentMonthKey()
  );
  const [presetTxDateRange, setPresetTxDateRange] = useState<{
    dateFrom: string;
    dateTo: string;
  } | null>(null);

  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);

  const [rabItems, setRabItems] = useState<RabItem[]>(loadInitialRab);
  const [transactions, setTransactions] = useState<TransactionItem[]>(
    loadInitialTransactions
  );
  const [incomeSources, setIncomeSources] = useState<IncomeSourceItem[]>(() =>
    loadInitialIncomeSources(loadInitialTransactions())
  );
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(
    loadInitialBusinessProfile
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RAB, JSON.stringify(rabItems));
    } catch {
      // Ignore storage quota issues
    }
  }, [rabItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    } catch {
      // Ignore storage quota issues
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_INCOME_SOURCES,
        JSON.stringify(incomeSources)
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [incomeSources]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_BUSINESS_PROFILE,
        JSON.stringify(businessProfile)
      );
    } catch {
      // Ignore storage quota issues
    }
    document.title = `${businessProfile.businessName} — Personal & Student Budget Tracker`;
  }, [businessProfile]);

  const budgetScopeMonthKey =
    selectedPeriod === 'all' ? getCurrentMonthKey() : selectedPeriod;

  const rabMetrics = useMemo(() => {
    const monthTx = filterTransactionsByPeriod(transactions, budgetScopeMonthKey);
    return computeRabMetrics(rabItems, monthTx);
  }, [rabItems, transactions, budgetScopeMonthKey]);

  const incomeSourceMetrics = useMemo(
    () => computeIncomeSourceMetrics(incomeSources, transactions),
    [incomeSources, transactions]
  );

  function pushToast(toast: Omit<ToastMessage, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }

  function openQuickCreateModal() {
    setEditingTx(null);
    setIsQuickModalOpen(true);
  }

  function openQuickEditModal(tx: TransactionItem) {
    setEditingTx(tx);
    setIsQuickModalOpen(true);
  }

  function handleSaveRab(
    data: { category: string; allocated: number; notes: string },
    editingId?: string
  ): { ok: boolean; error?: string } {
    const duplicate = rabItems.find(
      (item) =>
        item.category.toLowerCase() === data.category.toLowerCase() &&
        item.id !== editingId
    );
    if (duplicate) {
      return {
        ok: false,
        error: `Kategori budget "${data.category}" sudah ada. Pakai nama lain atau edit kategori yang tersedia.`,
      };
    }

    if (editingId) {
      const existing = rabItems.find((r) => r.id === editingId);
      setRabItems((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, ...data } : item
        )
      );
      if (existing && existing.category !== data.category) {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.type === 'expense' && tx.category === existing.category
              ? { ...tx, category: data.category }
              : tx
          )
        );
      }
      pushToast({
        variant: 'success',
        title: 'Kategori budget diperbarui',
        description: `${data.category} — Jatah ${formatRupiah(data.allocated)}/bln`,
      });
    } else {
      const newItem: RabItem = {
        id: `budget-${Date.now()}`,
        category: data.category,
        allocated: data.allocated,
        notes: data.notes,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setRabItems((prev) => [...prev, newItem]);
      pushToast({
        variant: 'success',
        title: 'Kategori budget ditambahkan',
        description: `${data.category} — Jatah ${formatRupiah(data.allocated)}/bln`,
      });
    }

    return { ok: true };
  }

  function handleDeleteRab(id: string) {
    const target = rabItems.find((item) => item.id === id);
    setRabItems((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      pushToast({
        variant: 'info',
        title: 'Kategori budget dihapus',
        description: `Kategori "${target.category}" telah dihapus dari Budget Bulanan.`,
      });
    }
  }

  function handleSaveIncomeSource(
    data: { name: string; notes: string },
    editingId?: string
  ): { ok: boolean; error?: string; item?: IncomeSourceItem } {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return {
        ok: false,
        error: 'Nama sumber pemasukan wajib diisi.',
      };
    }

    const duplicate = incomeSources.find(
      (item) =>
        item.name.toLowerCase() === trimmedName.toLowerCase() &&
        item.id !== editingId
    );
    if (duplicate) {
      return {
        ok: false,
        error: `Sumber pemasukan "${trimmedName}" sudah ada. Pakai nama lain atau edit yang tersedia.`,
      };
    }

    if (editingId) {
      const existing = incomeSources.find((s) => s.id === editingId);
      const updatedItem: IncomeSourceItem = {
        id: editingId,
        name: trimmedName,
        notes: data.notes.trim(),
        createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
      };
      setIncomeSources((prev) =>
        prev.map((item) => (item.id === editingId ? updatedItem : item))
      );
      if (existing && existing.name !== trimmedName) {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.type === 'income' && tx.category === existing.name
              ? { ...tx, category: trimmedName }
              : tx
          )
        );
      }
      pushToast({
        variant: 'success',
        title: 'Sumber pemasukan diperbarui',
        description: trimmedName,
      });
      return { ok: true, item: updatedItem };
    }

    const newItem: IncomeSourceItem = {
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      notes: data.notes.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setIncomeSources((prev) => [...prev, newItem]);
    pushToast({
      variant: 'success',
      title: 'Sumber pemasukan ditambahkan',
      description: trimmedName,
    });
    return { ok: true, item: newItem };
  }

  function handleDeleteIncomeSource(id: string) {
    const target = incomeSources.find((item) => item.id === id);
    setIncomeSources((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      pushToast({
        variant: 'info',
        title: 'Sumber pemasukan dihapus',
        description: `Sumber "${target.name}" telah dihapus dari daftar.`,
      });
    }
  }

  function handleQuickAddIncomeSource(
    name: string
  ): { ok: boolean; error?: string; item?: IncomeSourceItem } {
    return handleSaveIncomeSource({ name, notes: '' });
  }

  function handleSaveTransaction(
    data: Omit<TransactionItem, 'id'>,
    editingId?: string
  ) {
    let nextTransactions: TransactionItem[];

    if (editingId) {
      nextTransactions = transactions.map((tx) =>
        tx.id === editingId ? { ...data, id: editingId } : tx
      );
      setTransactions(nextTransactions);
      pushToast({
        variant: 'success',
        title: 'Transaksi diperbarui',
        description: `${data.title} (${formatRupiah(data.amount)})`,
      });
    } else {
      const newTx: TransactionItem = {
        ...data,
        id: `tx-${Date.now()}`,
      };
      nextTransactions = [newTx, ...transactions];
      setTransactions(nextTransactions);
      pushToast({
        variant: 'success',
        title: 'Transaksi tersimpan',
        description: `${data.title} (${formatRupiah(data.amount)})`,
      });
    }

    if (data.type === 'expense') {
      const txMonth = data.date.slice(0, 7);
      const monthScopedTx = filterTransactionsByPeriod(nextTransactions, txMonth);
      const updatedMetrics = computeRabMetrics(rabItems, monthScopedTx);
      const affectedBudget = updatedMetrics.find(
        (item) => item.category === data.category
      );
      if (affectedBudget && affectedBudget.status === 'Over-Budget') {
        pushToast({
          variant: 'error',
          title: `Over-Budget: ${affectedBudget.category}`,
          description: `Terpakai ${affectedBudget.utilizationPct.toFixed(
            0
          )}% (${formatRupiah(affectedBudget.spent)} dari jatah ${formatRupiah(
            affectedBudget.allocated
          )}).`,
        });
      } else if (affectedBudget && affectedBudget.status === 'Mendekati Limit') {
        pushToast({
          variant: 'warning',
          title: `Mendekati Limit: ${affectedBudget.category}`,
          description: `Sudah terpakai ${affectedBudget.utilizationPct.toFixed(
            0
          )}% dari jatah anggaran bulan ini.`,
        });
      }
    }
  }

  function handleDeleteTransaction(id: string) {
    const target = transactions.find((tx) => tx.id === id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    if (target) {
      pushToast({
        variant: 'info',
        title: 'Transaksi dihapus',
        description: target.title,
      });
    }
  }

  function handleLoadDemoData() {
    setRabItems(DEMO_RAB_ITEMS);
    setIncomeSources(DEMO_INCOME_SOURCES);
    setTransactions(DEMO_TRANSACTIONS);
    setSelectedPeriod(getCurrentMonthKey());
    setPresetTxDateRange(null);
    pushToast({
      variant: 'success',
      title: 'Data contoh anak kos dimuat',
      description: 'Menampilkan data 3 bulan terakhir (Sep–Nov 2026) dalam Rupiah.',
    });
  }

  function handleResetData() {
    setRabItems([]);
    setIncomeSources([]);
    setTransactions([]);
    setSelectedPeriod(getCurrentMonthKey());
    setPresetTxDateRange(null);
    pushToast({
      variant: 'info',
      title: 'Data berhasil dikosongkan',
      description: 'Seluruh kategori budget, sumber pemasukan, dan transaksi telah dihapus.',
    });
  }

  function handleInspectMonthTransactions(monthKey: string) {
    const bounds = getMonthDateBounds(monthKey);
    setPresetTxDateRange(bounds);
    setActiveTab('transactions');
    pushToast({
      variant: 'info',
      title: `Menampilkan mutasi ${formatMonthLabel(monthKey)}`,
      description: `Filter tanggal ${bounds.dateFrom} s/d ${bounds.dateTo} aktif.`,
    });
  }

  function handleSaveBusinessProfile(nextProfile: BusinessProfile) {
    const normalized = normalizeBusinessProfile(nextProfile);
    setBusinessProfile(normalized);
    pushToast({
      variant: 'success',
      title: 'Profil disimpan',
      description: `Halo, ${normalized.userName} · Profil aktif di aplikasi & laporan PDF.`,
    });
  }

  function handleRestoreBackup(
    restoredRab: RabItem[],
    restoredTx: TransactionItem[],
    restoredIncomeSources: IncomeSourceItem[] | null,
    restoredProfile: BusinessProfile | null
  ) {
    const nextSources =
      restoredIncomeSources !== null
        ? restoredIncomeSources
        : mergeMissingIncomeCategories(DEMO_INCOME_SOURCES, restoredTx);

    setRabItems(restoredRab);
    setIncomeSources(nextSources);
    setTransactions(restoredTx);
    if (restoredProfile !== null) {
      setBusinessProfile(restoredProfile);
    }
    setSelectedPeriod(getCurrentMonthKey());
    setPresetTxDateRange(null);
    pushToast({
      variant: 'success',
      title: 'Restore data berhasil',
      description: `${restoredRab.length} Kategori Budget, ${nextSources.length} Sumber Pemasukan, dan ${restoredTx.length} transaksi telah dipulihkan.`,
    });
  }

  const pageTitle =
    activeTab === 'settings'
      ? 'Pengaturan'
      : PRIMARY_NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Beranda';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Clean Desktop Sidebar (4 Tab + Tombol Catat Menonjol) */}
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen print:hidden">
          <div>
            <div
              data-testid="sidebar-brand"
              className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-6 py-4"
            >
              {businessProfile.logoDataUrl ? (
                <img
                  src={businessProfile.logoDataUrl}
                  alt={`Logo ${businessProfile.businessName}`}
                  className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-0.5"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-display text-sm font-bold text-white">
                  S
                </div>
              )}
              <div className="min-w-0">
                <span className="block truncate font-display text-base font-bold tracking-tight text-slate-900">
                  {businessProfile.businessName}
                </span>
                <span className="block truncate text-[11px] font-medium text-slate-500">
                  Student Budget Tracker
                </span>
              </div>
            </div>

            <div className="p-4">
              <button
                type="button"
                onClick={openQuickCreateModal}
                className="mb-4 flex min-h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                Catat Transaksi
              </button>

              <nav aria-label="Navigasi utama" className="space-y-1">
                {PRIMARY_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'rab') setRabSubTab('rab');
                        setActiveTab(item.id);
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 p-4">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Pengaturan &amp; Backup</span>
            </button>
          </div>
        </aside>

        {/* Main Content Shell */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Minimalist Header: Page Title (Left) + Gear Icon Pengaturan (Top Right) */}
          <header className="sticky top-0 z-30 flex h-[54px] items-center justify-between gap-3 border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:h-16 lg:px-8 print:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                data-testid="mobile-header-brand"
                className="flex min-w-0 items-center gap-2.5 lg:hidden"
              >
                {businessProfile.logoDataUrl ? (
                  <img
                    src={businessProfile.logoDataUrl}
                    alt={`Logo ${businessProfile.businessName}`}
                    className="h-7 w-7 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 font-display text-xs font-bold text-white">
                    S
                  </div>
                )}
                <span className="truncate font-display text-sm font-bold text-slate-900">
                  {businessProfile.businessName}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="truncate text-xs font-medium text-slate-500">
                  {pageTitle}
                </span>
              </div>

              <h1 className="hidden truncate font-display text-lg font-bold text-slate-900 lg:block">
                {pageTitle}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                aria-label="Pengaturan"
                title="Pengaturan"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  activeTab === 'settings'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="print:hidden">
            <OfflineIndicator />
          </div>

          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
            {activeTab === 'dashboard' && (
              <DashboardView
                userName={businessProfile.userName ?? 'Sobat Kos'}
                rabItems={rabItems}
                transactions={transactions}
                selectedPeriod={selectedPeriod}
                onSelectPeriod={setSelectedPeriod}
                onNavigate={setActiveTab}
                onOpenQuickAdd={openQuickCreateModal}
                onLoadDemo={handleLoadDemoData}
              />
            )}

            {activeTab === 'rab' && (
              <RabManagerView
                rabMetrics={rabMetrics}
                incomeSourceMetrics={incomeSourceMetrics}
                activeMonthLabel={formatMonthLabel(budgetScopeMonthKey)}
                initialSubTab={rabSubTab}
                onSaveRab={handleSaveRab}
                onDeleteRab={handleDeleteRab}
                onSaveIncomeSource={handleSaveIncomeSource}
                onDeleteIncomeSource={handleDeleteIncomeSource}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                rabItems={rabItems}
                incomeSources={incomeSources}
                transactions={transactions}
                presetDateRange={presetTxDateRange}
                onClearPresetDateRange={() => setPresetTxDateRange(null)}
                onOpenQuickAdd={openQuickCreateModal}
                onEditTransaction={openQuickEditModal}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'monthly' && (
              <MonthlySummaryView
                businessProfile={businessProfile}
                rabItems={rabItems}
                incomeSources={incomeSources}
                transactions={transactions}
                onInspectMonthTransactions={handleInspectMonthTransactions}
                onCsvExportSuccess={() =>
                  pushToast({
                    variant: 'success',
                    title: 'Ekspor CSV berhasil',
                    description: 'Laporan budget bulanan & riwayat transaksi telah diunduh.',
                  })
                }
                onBackupSuccess={() =>
                  pushToast({
                    variant: 'success',
                    title: 'Backup JSON berhasil',
                    description: 'File cadangan data lokal telah diunduh.',
                  })
                }
                onPdfExportSuccess={(filename) =>
                  pushToast({
                    variant: 'success',
                    title: 'File PDF berhasil diunduh!',
                    description: filename,
                  })
                }
                onPdfExportError={(error) =>
                  pushToast({
                    variant: 'error',
                    title: 'Gagal mengekspor PDF',
                    description: error,
                  })
                }
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                businessProfile={businessProfile}
                rabItems={rabItems}
                incomeSources={incomeSources}
                transactions={transactions}
                onSaveBusinessProfile={handleSaveBusinessProfile}
                onRestoreBackup={handleRestoreBackup}
                onRestoreError={(error) =>
                  pushToast({
                    variant: 'error',
                    title: 'Restore gagal',
                    description: error,
                  })
                }
                onBackupSuccess={() =>
                  pushToast({
                    variant: 'success',
                    title: 'Backup JSON berhasil',
                    description: 'File cadangan data lokal telah diunduh.',
                  })
                }
                onLoadDemo={handleLoadDemoData}
                onResetData={handleResetData}
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Bar: 4 Tab Bersih + 1 Tombol + Menonjol di Tengah */}
      <nav
        aria-label="Navigasi bawah mobile"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 items-center border-t border-slate-200/80 bg-white/95 backdrop-blur-md lg:hidden print:hidden"
      >
        {PRIMARY_NAV_ITEMS.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'rab') setRabSubTab('rab');
                setActiveTab(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-1 px-1 transition-colors ${
                isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold leading-none tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Prominent Center + Action Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={openQuickCreateModal}
            aria-label="Catat Transaksi Cepat"
            className="-mt-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-md shadow-slate-900/20 transition-transform active:scale-95 hover:bg-slate-800"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {PRIMARY_NAV_ITEMS.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-1 px-1 transition-colors ${
                isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold leading-none tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Modal / Bottom Sheet Catat Transaksi Cepat */}
      <QuickTransactionModal
        isOpen={isQuickModalOpen}
        editingTransaction={editingTx}
        rabItems={rabItems}
        incomeSources={incomeSources}
        onClose={() => {
          setIsQuickModalOpen(false);
          setEditingTx(null);
        }}
        onSaveTransaction={handleSaveTransaction}
        onQuickAddIncomeSource={handleQuickAddIncomeSource}
        onNavigateToBudget={() => {
          setRabSubTab('rab');
          setActiveTab('rab');
        }}
      />

      <div className="print:hidden">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
