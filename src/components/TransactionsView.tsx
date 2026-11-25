import { useEffect, useState } from 'react';
import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import type {
  IncomeSourceItem,
  RabItem,
  TransactionFilters,
  TransactionItem,
} from '../types/finance';
import {
  filterTransactions,
  formatCompactRupiah,
  formatRupiah,
  formatShortDateLabel,
  getTransactionFilterCategoryGroups,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';

interface TransactionsViewProps {
  rabItems: RabItem[];
  incomeSources: IncomeSourceItem[];
  transactions: TransactionItem[];
  presetDateRange?: { dateFrom: string; dateTo: string } | null;
  onClearPresetDateRange?: () => void;
  onOpenQuickAdd: () => void;
  onEditTransaction: (tx: TransactionItem) => void;
  onDeleteTransaction: (id: string) => void;
}

export function TransactionsView({
  rabItems,
  incomeSources,
  transactions,
  presetDateRange,
  onClearPresetDateRange,
  onOpenQuickAdd,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionsViewProps) {
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    category: 'all',
    dateFrom: presetDateRange?.dateFrom ?? '',
    dateTo: presetDateRange?.dateTo ?? '',
    searchQuery: '',
  });

  useEffect(() => {
    if (presetDateRange) {
      setFilters((prev) => ({
        ...prev,
        type: 'all',
        category: 'all',
        searchQuery: '',
        dateFrom: presetDateRange.dateFrom,
        dateTo: presetDateRange.dateTo,
      }));
    }
  }, [presetDateRange]);

  const {
    incomeCategories: filterIncomeCategories,
    expenseCategories: filterExpenseCategories,
  } = getTransactionFilterCategoryGroups(rabItems, incomeSources, transactions);

  const filteredTransactions = filterTransactions(transactions, filters);
  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.searchQuery.trim() !== '';

  const filteredIncomeTotal = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const filteredExpenseTotal = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header & Filter Bar */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Riwayat Mutasi Harian
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi ·
              Masuk {formatCompactRupiah(filteredIncomeTotal)} · Keluar{' '}
              {formatCompactRupiah(filteredExpenseTotal)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    type: 'all',
                    category: 'all',
                    dateFrom: '',
                    dateTo: '',
                    searchQuery: '',
                  });
                  onClearPresetDateRange?.();
                }}
                className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Catat Transaksi
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="relative sm:col-span-5">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari transaksi"
                value={filters.searchQuery}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                }
                placeholder="Cari judul, kategori, metode..."
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:col-span-7">
              <select
                aria-label="Filter jenis transaksi"
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: e.target.value as TransactionFilters['type'],
                    category: 'all',
                  }))
                }
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none sm:text-sm"
              >
                <option value="all">Semua Jenis</option>
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>

              <select
                aria-label="Filter kategori transaksi"
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value }))
                }
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none sm:text-sm"
              >
                <option value="all">Semua Kategori</option>
                {filters.type === 'income' &&
                  filterIncomeCategories.map((cat) => (
                    <option key={`inc-${cat}`} value={cat}>
                      {cat}
                    </option>
                  ))}
                {filters.type === 'expense' &&
                  filterExpenseCategories.map((cat) => (
                    <option key={`exp-${cat}`} value={cat}>
                      {cat}
                    </option>
                  ))}
                {filters.type === 'all' && (
                  <>
                    {filterIncomeCategories.length > 0 && (
                      <optgroup label="Sumber Pemasukan">
                        {filterIncomeCategories.map((cat) => (
                          <option key={`all-inc-${cat}`} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {filterExpenseCategories.length > 0 && (
                      <optgroup label="Jatah Pengeluaran">
                        {filterExpenseCategories.map((cat) => (
                          <option key={`all-exp-${cat}`} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Rentang Tanggal:</span>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="Filter tanggal mulai"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
                className="min-h-[40px] min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none sm:flex-initial"
              />
              <span className="text-slate-400">s/d</span>
              <input
                type="date"
                aria-label="Filter tanggal akhir"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
                className="min-h-[40px] min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none sm:flex-initial"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Daftar Mutasi */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        {filteredTransactions.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <CategoryIcon category={tx.category} type={tx.type} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {tx.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {formatShortDateLabel(tx.date)} · {tx.category} · {tx.method}
                    </p>
                    {tx.notes && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pl-[54px] sm:justify-end sm:pl-0">
                  <p
                    className={`whitespace-nowrap font-mono text-sm font-bold tabular-nums ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatRupiah(tx.amount)}
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      aria-label={`Edit transaksi ${tx.title}`}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx.id)}
                      aria-label={`Hapus transaksi ${tx.title}`}
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {hasActiveFilters
                ? 'Tidak ada transaksi yang sesuai filter'
                : 'Belum ada transaksi tercatat'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {hasActiveFilters
                ? 'Ubah kata kunci pencarian atau reset filter untuk melihat seluruh mutasi.'
                : 'Ketuk tombol + untuk mencatat pemasukan atau pengeluaran pertamamu.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
