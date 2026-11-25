import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { NavTab, RabItem, TransactionItem } from '../types/finance';
import {
  computeDailyBudgetRecommendation,
  computeDashboardSummary,
  computeRabMetrics,
  filterTransactionsByPeriod,
  formatCompactRupiah,
  formatMonthLabel,
  formatRupiah,
  formatShortDateLabel,
  getAvailableMonths,
  getCurrentMonthKey,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';
import { RabStatusLabel } from './StatusLabel';

interface DashboardViewProps {
  userName: string;
  rabItems: RabItem[];
  transactions: TransactionItem[];
  selectedPeriod: string; // 'all' | 'YYYY-MM'
  onSelectPeriod: (period: string) => void;
  onNavigate: (tab: NavTab) => void;
  onOpenQuickAdd: () => void;
  onLoadDemo: () => void;
}

export function DashboardView({
  userName,
  rabItems,
  transactions,
  selectedPeriod,
  onSelectPeriod,
  onNavigate,
  onOpenQuickAdd,
  onLoadDemo,
}: DashboardViewProps) {
  const isCompletelyEmpty = rabItems.length === 0 && transactions.length === 0;

  if (isCompletelyEmpty) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Halo, {userName} 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Yuk mulai atur uang saku dan jatah pengeluaranmu biar lebih tenang sampai akhir bulan.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Wallet className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold text-slate-900">
            Dompet &amp; Budget Kamu Masih Kosong
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Atur kategori jatah pengeluaranmu (Makan, Kos, Transport) atau muat contoh data
            mahasiswa 3 bulan terakhir untuk langsung mencoba.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLoadDemo}
              className="min-h-[44px] whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Muat Data Contoh Anak Kos
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rab')}
              className="min-h-[44px] whitespace-nowrap rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Atur Budget Bulanan
            </button>
          </div>
        </section>
      </div>
    );
  }

  const availableMonths = getAvailableMonths(transactions);
  const currentMonthKey = getCurrentMonthKey();
  const periodValid =
    selectedPeriod === 'all' ||
    selectedPeriod === currentMonthKey ||
    availableMonths.some((m) => m.key === selectedPeriod);
  const effectivePeriod = periodValid ? selectedPeriod : 'all';

  const scopedTransactions = filterTransactionsByPeriod(
    transactions,
    effectivePeriod
  );

  const uniqueMonthsInScope = new Set(
    scopedTransactions
      .filter((t) => t.date && t.date.length >= 7)
      .map((t) => t.date.slice(0, 7))
  ).size;
  const periodMultiplier =
    effectivePeriod === 'all' ? Math.max(1, uniqueMonthsInScope) : 1;

  const summary = computeDashboardSummary(
    rabItems,
    scopedTransactions,
    periodMultiplier
  );
  const rabMetrics = computeRabMetrics(
    rabItems,
    scopedTransactions,
    periodMultiplier
  );

  const dailyTargetMonthKey =
    effectivePeriod === 'all' ? currentMonthKey : effectivePeriod;
  const dailySourceTransactions =
    effectivePeriod === 'all'
      ? filterTransactionsByPeriod(transactions, currentMonthKey)
      : scopedTransactions;
  const dailyMonthSummary =
    effectivePeriod === 'all'
      ? computeDashboardSummary(rabItems, dailySourceTransactions, 1)
      : summary;

  const dailyRec = computeDailyBudgetRecommendation(
    dailyMonthSummary.netCashflow,
    dailyTargetMonthKey
  );

  const avgDailySpend =
    dailyRec.daysInMonth > 0
      ? Math.round(dailyMonthSummary.totalExpense / dailyRec.daysInMonth)
      : 0;

  const dropdownMonths = availableMonths.some((m) => m.key === currentMonthKey)
    ? availableMonths
    : [
        { key: currentMonthKey, label: formatMonthLabel(currentMonthKey) },
        ...availableMonths,
      ];

  const top3Budgets = rabMetrics.slice(0, 3);
  const latestTransactions = [...scopedTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const isPositiveRemaining = summary.netCashflow > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Sapaan Personal & Pemilih Bulan Aktif */}
      <section
        aria-label="Sapaan dan Pemilih Bulan"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Halo, {userName} 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan dompet dan batas aman jajanmu bulan ini.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="relative flex items-center">
            <Calendar
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-500"
              aria-hidden="true"
            />
            <label htmlFor="beranda-month-picker" className="sr-only">
              Pilih Bulan Aktif
            </label>
            <select
              id="beranda-month-picker"
              value={effectivePeriod}
              onChange={(e) => onSelectPeriod(e.target.value)}
              className="min-h-[44px] rounded-2xl border border-slate-200/80 bg-white py-2 pl-10 pr-8 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
            >
              {dropdownMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
              <option value="all">Semua Periode</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Hero Card Utama: Sisa Uang Bulan Ini + Indikator Cerdas */}
      <section
        aria-label="Sisa Uang Bulan Ini"
        className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-indigo-50 p-6 shadow-sm sm:p-7"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">
              {effectivePeriod === 'all'
                ? 'Sisa Uang Saku (Semua Periode)'
                : 'Sisa Uang Bulan Ini'}
            </p>
            <p
              className={`mt-2 font-display text-4xl font-bold tracking-tight tabular-nums sm:text-5xl ${
                isPositiveRemaining ? 'text-slate-900' : 'text-rose-700'
              }`}
              data-testid="kpi-sisa-uang"
            >
              {formatRupiah(summary.netCashflow)}
            </p>
          </div>

          <div
            className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-white/85 px-4 py-3.5 shadow-xs backdrop-blur-xs"
            data-testid="kpi-daily-budget"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              {dailyRec.isPastMonth ? (
                <>
                  <p className="text-xs font-medium text-slate-500">
                    Rata-rata pengeluaran ({formatMonthLabel(dailyRec.monthKey, true)})
                  </p>
                  <p className="mt-0.5 font-display text-base font-bold text-slate-900 tabular-nums">
                    {formatCompactRupiah(avgDailySpend)} / hari
                  </p>
                </>
              ) : dailyRec.remainingMoney > 0 ? (
                <>
                  <p className="text-xs font-medium text-slate-600">
                    Batas aman jajan hari ini:
                  </p>
                  <p className="mt-0.5 font-display text-base font-bold text-emerald-700 tabular-nums sm:text-lg">
                    {formatRupiah(dailyRec.dailyAllowance)}{' '}
                    <span className="font-sans text-xs font-medium text-slate-500">
                      ({dailyRec.daysRemaining} hari tersisa)
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-rose-700">
                    Batas aman jajan hari ini:
                  </p>
                  <p className="mt-0.5 font-display text-base font-bold text-rose-700 tabular-nums">
                    Rp 0 · Tahan dulu jajan non-prioritas
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. 2 Kartu Ringkas Berdampingan: Total Pemasukan & Total Pengeluaran */}
      <section
        aria-label="Ringkasan Pemasukan dan Pengeluaran"
        className="grid grid-cols-2 gap-4 sm:gap-5"
      >
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-900/80 sm:text-sm">
              Total Pemasukan
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p
            className="mt-2 font-display text-xl font-bold text-emerald-900 tabular-nums sm:text-2xl"
            data-testid="kpi-total-income"
          >
            {formatCompactRupiah(summary.totalIncome)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-emerald-800/75 tabular-nums">
            {formatRupiah(summary.totalIncome)}
          </p>
        </article>

        <article className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-rose-900/80 sm:text-sm">
              Total Pengeluaran
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p
            className="mt-2 font-display text-xl font-bold text-rose-900 tabular-nums sm:text-2xl"
            data-testid="kpi-total-expense"
          >
            {formatCompactRupiah(summary.totalExpense)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-rose-800/75 tabular-nums">
            {formatRupiah(summary.totalExpense)}
          </p>
        </article>
      </section>

      {/* 4. Top 3 Pantauan Budget & 3 Transaksi Terbaru */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Pantauan Budget (Top 3 Kategori) */}
        <section
          aria-label="Pantauan Budget"
          className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Pantauan Budget
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                3 kategori pengeluaran utama bulan ini
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('rab')}
              className="inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
            >
              Lihat Semua Budget
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {top3Budgets.length > 0 ? (
            <div className="mt-5 space-y-5">
              {top3Budgets.map((item) => {
                const barColor =
                  item.status === 'Over-Budget'
                    ? 'bg-rose-500'
                    : item.status === 'Mendekati Limit'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';
                const clampedWidth = Math.min(item.utilizationPct, 100);

                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <CategoryIcon category={item.category} type="expense" size="sm" />
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {item.category}
                        </span>
                      </div>
                      <RabStatusLabel status={item.status} />
                    </div>

                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`Progress budget ${item.category}`}
                      aria-valuenow={Math.round(item.utilizationPct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${clampedWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                      <span
                        className={
                          item.remaining < 0
                            ? 'font-semibold text-rose-700'
                            : 'font-medium text-slate-600'
                        }
                      >
                        {item.remaining >= 0
                          ? `Sisa ${formatCompactRupiah(item.remaining)} dari ${formatCompactRupiah(item.allocated)}`
                          : `Lebih ${formatCompactRupiah(Math.abs(item.remaining))} dari ${formatCompactRupiah(item.allocated)}`}
                      </span>
                      <span className="font-mono font-semibold text-slate-700">
                        {item.utilizationPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <p className="text-xs text-slate-600">
                Belum ada kategori budget yang dibuat.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('rab')}
                className="mt-3 min-h-[40px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Atur Budget Sekarang
              </button>
            </div>
          )}
        </section>

        {/* 3 Transaksi Terbaru */}
        <section
          aria-label="3 Transaksi Terbaru"
          className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Transaksi Terbaru
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                3 mutasi terakhir tercatat
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Semua Riwayat
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {latestTransactions.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {latestTransactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CategoryIcon category={tx.category} type={tx.type} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {tx.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {formatShortDateLabel(tx.date)} · {tx.category}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatRupiah(tx.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <p className="text-xs text-slate-600">
                Belum ada transaksi di periode ini.
              </p>
              <button
                type="button"
                onClick={onOpenQuickAdd}
                className="mt-3 min-h-[40px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Catat Transaksi Pertama
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
