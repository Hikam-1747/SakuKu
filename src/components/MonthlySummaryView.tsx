import { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  Download,
  FileDown,
  HardDriveDownload,
  Lightbulb,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  AiInsightReport,
  BusinessProfile,
  IncomeSourceItem,
  MoMMetricDelta,
  RabItem,
  TransactionItem,
} from '../types/finance';
import { createBackupPayload } from '../utils/backup';
import {
  buildIncomeBreakdown,
  buildIncomeByCategory,
  computeCategoryMonthComparison,
  computeDashboardSummary,
  computeMonthOverMonthComparison,
  computeMonthlyRows,
  computeRabMetrics,
  filterTransactionsByPeriod,
  formatCompactRupiah,
  formatMonthLabel,
  formatRupiah,
  generateCsvReport,
  getAvailableMonths,
} from '../utils/finance';
import { exportFinancePdfReport } from '../utils/pdfReport';
import {
  ComparisonGroupedBarChart,
  INCOME_DOUGHNUT_COLORS,
  IncomeDoughnutChart,
} from './Charts';

interface MonthlySummaryViewProps {
  businessProfile: BusinessProfile;
  rabItems: RabItem[];
  incomeSources: IncomeSourceItem[];
  transactions: TransactionItem[];
  onInspectMonthTransactions: (monthKey: string) => void;
  onCsvExportSuccess: () => void;
  onBackupSuccess: () => void;
  onPdfExportSuccess: (filename: string) => void;
  onPdfExportError: (error: string) => void;
}

function DeltaBadge({
  delta,
  invertGood = false,
  prevLabel,
}: {
  delta: MoMMetricDelta;
  invertGood?: boolean;
  prevLabel: string;
}) {
  if (delta.deltaPct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Belum ada pembanding di {prevLabel}
      </span>
    );
  }

  const isUp = delta.direction === 'up';
  const isDown = delta.direction === 'down';
  const isPositiveOutcome = invertGood ? isDown : isUp;
  const absPct = Math.abs(delta.deltaPct).toFixed(1);

  if (delta.direction === 'flat') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
        <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Stabil (0.0%) dari {prevLabel}
      </span>
    );
  }

  const textTone = isPositiveOutcome ? 'text-emerald-700' : 'text-rose-700';
  const suffix = invertGood
    ? isDown
      ? 'lebih hemat dari bulan lalu'
      : 'lebih boros dari bulan lalu'
    : 'dari bulan lalu';

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${textTone}`}
    >
      {isUp ? (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {isUp ? '+' : '-'}
      {absPct}% {suffix}
    </span>
  );
}

export function MonthlySummaryView({
  businessProfile,
  rabItems,
  incomeSources,
  transactions,
  onInspectMonthTransactions,
  onCsvExportSuccess,
  onBackupSuccess,
  onPdfExportSuccess,
  onPdfExportError,
}: MonthlySummaryViewProps) {
  const availableMonths = getAvailableMonths(transactions);
  const [referenceMonth, setReferenceMonth] = useState<string>(
    availableMonths[0]?.key ?? ''
  );
  const [trendChartKind, setTrendChartKind] = useState<'bar' | 'line'>('bar');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [monthA, setMonthA] = useState<string>(
    availableMonths[1]?.key ?? availableMonths[0]?.key ?? ''
  );
  const [monthB, setMonthB] = useState<string>(availableMonths[0]?.key ?? '');

  const [aiReport, setAiReport] = useState<AiInsightReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (availableMonths.length === 0) {
      setReferenceMonth('');
      setMonthA('');
      setMonthB('');
      return;
    }
    if (!availableMonths.some((m) => m.key === referenceMonth)) {
      setReferenceMonth(availableMonths[0].key);
    }
    if (!availableMonths.some((m) => m.key === monthB)) {
      setMonthB(availableMonths[0].key);
    }
    if (!availableMonths.some((m) => m.key === monthA)) {
      setMonthA(availableMonths[1]?.key ?? availableMonths[0].key);
    }
  }, [availableMonths.map((m) => m.key).join(',')]);

  if (availableMonths.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <CalendarRange className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
          Belum Ada Data Rekap Bulanan
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
          Catat transaksi pemasukan atau pengeluaran terlebih dahulu untuk melihat grafik tren,
          perbandingan antarbulan, dan ekspor laporan PDF.
        </p>
      </section>
    );
  }

  const activeRefMonth = referenceMonth || availableMonths[0].key;
  const mom = computeMonthOverMonthComparison(transactions, activeRefMonth);
  const monthlyRows = computeMonthlyRows(rabItems, transactions, 6);
  const monthlyRowsDesc = [...monthlyRows].reverse();

  const monthTransactions = filterTransactionsByPeriod(transactions, activeRefMonth);
  const monthSummary = computeDashboardSummary(rabItems, monthTransactions);
  const monthRabMetrics = computeRabMetrics(rabItems, monthTransactions);
  const incomeBreakdown = buildIncomeBreakdown(monthTransactions);

  const catMonthA = monthA || availableMonths[availableMonths.length - 1].key;
  const catMonthB = monthB || availableMonths[0].key;
  const categoryDiffs = computeCategoryMonthComparison(
    rabItems,
    transactions,
    catMonthA,
    catMonthB
  );

  const biggestIncrease = categoryDiffs.find((c) => c.diff > 0);
  const biggestSaving = [...categoryDiffs]
    .filter((c) => c.diff < 0)
    .sort((a, b) => a.diff - b.diff)[0];

  async function handleExportPdf() {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const filename = await exportFinancePdfReport({
        businessProfile,
        periodLabel: mom.currentMonthLabel,
        summary: monthSummary,
        rabMetrics: monthRabMetrics,
        transactions: monthTransactions,
      });
      onPdfExportSuccess(filename);
    } catch (err: unknown) {
      onPdfExportError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat file PDF.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleExportCsv() {
    const csvContent = generateCsvReport(
      monthRabMetrics,
      monthTransactions,
      monthSummary,
      businessProfile
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `sakuku-laporan-budget-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onCsvExportSuccess();
  }

  function handleBackupJson() {
    const payload = createBackupPayload(
      rabItems,
      transactions,
      incomeSources,
      businessProfile
    );
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `sakuku-backup-${today}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onBackupSuccess();
  }

  async function handleRunAiAnalysis() {
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: monthSummary,
          rabBreakdown: monthRabMetrics.map((r) => ({
            category: r.category,
            allocated: r.allocated,
            spent: r.spent,
            remaining: r.remaining,
            utilizationPct: Number(r.utilizationPct.toFixed(1)),
            status: r.status,
          })),
          incomeByCategory: buildIncomeByCategory(monthTransactions),
          recentTransactions: [...monthTransactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 25),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Gagal menjalankan analisis AI.');
      }

      setAiReport({
        ...data,
        generatedAt: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch (err: unknown) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat menghubungi layanan AI Advisor.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Rekap & Tombol Export */}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Rekap &amp; Perbandingan Bulanan
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Evaluasi {mom.currentMonthLabel} vs {mom.previousMonthLabel} serta ekspor laporan lengkap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <select
            id="mom-reference-month"
            aria-label="Pilih bulan rekap"
            value={activeRefMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none sm:text-sm"
          >
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            aria-busy={isExportingPdf}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExportingPdf ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileDown className="h-4 w-4" aria-hidden="true" />
            )}
            {isExportingPdf ? 'Menyiapkan PDF...' : 'Unduh Laporan PDF'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleBackupJson}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <HardDriveDownload className="h-4 w-4" aria-hidden="true" />
            Backup JSON
          </button>
        </div>
      </section>

      {/* 3 Kartu Perbandingan Bulan Ini vs Bulan Lalu */}
      <section
        aria-label="Kartu Perbandingan Antarbulan"
        className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5"
      >
        <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Pemasukan</p>
          <p
            className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums"
            data-testid="mom-income-current"
          >
            {formatCompactRupiah(mom.income.current)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
            {formatRupiah(mom.income.current)}
          </p>
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <DeltaBadge delta={mom.income} prevLabel={mom.previousMonthLabel} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Pengeluaran</p>
          <p
            className="mt-2 font-display text-2xl font-bold text-rose-700 tabular-nums"
            data-testid="mom-expense-current"
          >
            {formatCompactRupiah(mom.expense.current)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
            {formatRupiah(mom.expense.current)}
          </p>
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <DeltaBadge
              delta={mom.expense}
              invertGood
              prevLabel={mom.previousMonthLabel}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Sisa Uang Saku</p>
          <p
            className={`mt-2 font-display text-2xl font-bold tabular-nums ${
              mom.netCashflow.current >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
            data-testid="mom-net-current"
          >
            {formatCompactRupiah(mom.netCashflow.current)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
            {formatRupiah(mom.netCashflow.current)}
          </p>
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <DeltaBadge delta={mom.netCashflow} prevLabel={mom.previousMonthLabel} />
          </div>
        </article>
      </section>

      {/* Grafik Tren Antarbulan + Proporsi Sumber Pemasukan */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                <h3 className="font-display text-base font-bold text-slate-900">
                  Grafik Tren Bulanan
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Pemasukan vs Jatah Anggaran vs Terpakai hingga 6 bulan terakhir.
              </p>
            </div>
            <div
              className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl bg-slate-100 p-1"
              role="group"
              aria-label="Tipe grafik tren bulanan"
            >
              <button
                type="button"
                onClick={() => setTrendChartKind('bar')}
                className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  trendChartKind === 'bar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grafik Batang
              </button>
              <button
                type="button"
                onClick={() => setTrendChartKind('line')}
                className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  trendChartKind === 'line'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tren Garis
              </button>
            </div>
          </div>

          <ComparisonGroupedBarChart
            labels={monthlyRows.map((r) => r.shortLabel)}
            income={monthlyRows.map((r) => r.totalIncome)}
            rabTarget={monthlyRows.map((r) => r.totalRab)}
            expense={monthlyRows.map((r) => r.totalExpense)}
            mode="period"
            chartKind={trendChartKind}
          />
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-4">
          <h3 className="font-display text-base font-bold text-slate-900">
            Sumber Pemasukan
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Proporsi pemasukan pada {mom.currentMonthLabel}
          </p>

          {incomeBreakdown.length > 0 ? (
            <div className="mt-4 space-y-4">
              <IncomeDoughnutChart
                labels={incomeBreakdown.map((item) => item.source)}
                values={incomeBreakdown.map((item) => item.amount)}
              />
              <ul className="space-y-2 border-t border-slate-100 pt-3">
                {incomeBreakdown.map((item, idx) => (
                  <li
                    key={item.source}
                    className="flex items-center justify-between gap-2 text-xs tabular-nums"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            INCOME_DOUGHNUT_COLORS[idx % INCOME_DOUGHNUT_COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium text-slate-700">
                        {item.source}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono font-semibold text-slate-900">
                      {formatCompactRupiah(item.amount)} ({item.percentage.toFixed(0)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
              Belum ada pemasukan tercatat di {mom.currentMonthLabel}.
            </div>
          )}
        </section>
      </div>

      {/* Tabel Ringkasan Bulanan */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <h3 className="font-display text-base font-bold text-slate-900">
            Tabel Ringkasan Bulanan
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Klik &ldquo;Lihat Mutasi&rdquo; untuk memeriksa seluruh transaksi pada bulan terkait.
          </p>
        </div>

        {/* Mobile Cards */}
        <div className="divide-y divide-slate-100 md:hidden">
          {monthlyRowsDesc.map((row) => (
            <article key={row.monthKey} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900">{row.label}</h4>
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    row.efficiencyPct > 100
                      ? 'text-rose-700'
                      : row.efficiencyPct > 80
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  Terpakai {row.efficiencyPct.toFixed(0)}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs tabular-nums">
                <div>
                  <span className="text-slate-500">Masuk</span>
                  <p className="mt-0.5 font-mono font-semibold text-emerald-700">
                    {formatCompactRupiah(row.totalIncome)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Keluar</span>
                  <p className="mt-0.5 font-mono font-semibold text-rose-700">
                    {formatCompactRupiah(row.totalExpense)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Sisa</span>
                  <p
                    className={`mt-0.5 font-mono font-semibold ${
                      row.netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'
                    }`}
                  >
                    {formatCompactRupiah(row.netProfit)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onInspectMonthTransactions(row.monthKey)}
                aria-label={`Lihat Detail transaksi ${row.label}`}
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Lihat Mutasi
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3.5 pl-6 pr-3">Bulan &amp; Tahun</th>
                <th className="px-3 py-3.5 text-right">Total Pemasukan</th>
                <th className="px-3 py-3.5 text-right">Jatah Anggaran</th>
                <th className="px-3 py-3.5 text-right">Total Pengeluaran</th>
                <th className="px-3 py-3.5 text-right">Sisa Uang Saku</th>
                <th className="px-3 py-3.5 text-right">Serapan</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyRowsDesc.map((row) => (
                <tr key={row.monthKey} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap py-3.5 pl-6 pr-3 font-semibold text-slate-900">
                    {row.label}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    {formatRupiah(row.totalIncome)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs text-indigo-700 tabular-nums">
                    {formatRupiah(row.totalRab)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs font-semibold text-rose-700 tabular-nums">
                    {formatRupiah(row.totalExpense)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs font-semibold tabular-nums ${
                      row.netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'
                    }`}
                  >
                    {formatRupiah(row.netProfit)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs font-semibold tabular-nums ${
                      row.efficiencyPct > 100
                        ? 'text-rose-700'
                        : row.efficiencyPct > 80
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }`}
                  >
                    {row.efficiencyPct.toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap py-3.5 pl-3 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectMonthTransactions(row.monthKey)}
                      aria-label={`Lihat Detail transaksi ${row.label}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Lihat Mutasi
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Perbandingan Kategori (Bulan A vs Bulan B) */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Perbandingan Kategori Antarbulan
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Lihat kategori mana yang paling naik atau paling hemat antar dua bulan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="compare-month-a"
              aria-label="Bulan pembanding A"
              value={catMonthA}
              onChange={(e) => setMonthA(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-semibold text-slate-400">vs</span>
            <select
              id="compare-month-b"
              aria-label="Bulan pembanding B"
              value={catMonthB}
              onChange={(e) => setMonthB(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(biggestIncrease || biggestSaving) && (
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2 sm:px-6">
            {biggestIncrease && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200/70 bg-rose-50/70 p-3.5">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <div className="text-xs">
                  <p className="font-semibold text-rose-900">
                    Kenaikan Tertinggi: {biggestIncrease.category}
                  </p>
                  <p className="mt-0.5 font-mono text-rose-800 tabular-nums">
                    +{formatCompactRupiah(biggestIncrease.diff)} pada {formatMonthLabel(catMonthB)}
                  </p>
                </div>
              </div>
            )}
            {biggestSaving && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3.5">
                <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <div className="text-xs">
                  <p className="font-semibold text-emerald-900">
                    Penghematan Terbesar: {biggestSaving.category}
                  </p>
                  <p className="mt-0.5 font-mono text-emerald-800 tabular-nums">
                    {formatCompactRupiah(biggestSaving.diff)} pada {formatMonthLabel(catMonthB)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 pl-6 pr-3">Kategori</th>
                <th className="px-3 py-3 text-right">{formatMonthLabel(catMonthA, true)}</th>
                <th className="px-3 py-3 text-right">{formatMonthLabel(catMonthB, true)}</th>
                <th className="py-3 pl-3 pr-6 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryDiffs.map((item) => (
                <tr key={item.category} className="hover:bg-slate-50/70">
                  <td className="py-3 pl-6 pr-3 text-xs font-semibold text-slate-900 sm:text-sm">
                    {item.category}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {formatCompactRupiah(item.amountA)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                    {formatCompactRupiah(item.amountB)}
                  </td>
                  <td
                    className={`whitespace-nowrap py-3 pl-3 pr-6 text-right font-mono text-xs font-semibold tabular-nums ${
                      item.diff > 0
                        ? 'text-rose-700'
                        : item.diff < 0
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                    }`}
                  >
                    {item.diff > 0 ? '+' : ''}
                    {formatCompactRupiah(item.diff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Asisten Hemat AI */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Asisten Hemat AI
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Cek pos pengeluaran yang bocor dan dapatkan 3 tips hemat praktis untuk {mom.currentMonthLabel}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzing}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 self-start whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60 sm:self-center"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            )}
            {isAnalyzing ? 'Menganalisis...' : 'Analisis Budget dengan AI'}
          </button>
        </div>

        {!isAnalyzing && aiError && (
          <div
            className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div className="flex items-start gap-2.5 text-xs text-rose-800">
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span>{aiError}</span>
            </div>
            <button
              type="button"
              onClick={handleRunAiAnalysis}
              className="self-start whitespace-nowrap rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!isAnalyzing && !aiError && aiReport && (
          <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {aiReport.healthStatus === 'Kritis' ? (
                  <AlertOctagon className="h-5 w-5 text-rose-600" aria-hidden="true" />
                ) : aiReport.healthStatus === 'Perlu Perhatian' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                )}
                <span className="text-sm font-bold text-slate-900">
                  Kondisi Dompet: {aiReport.healthStatus}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Pukul {aiReport.generatedAt}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <p className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                {aiReport.executiveSummary}
              </p>
              <p className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                {aiReport.cashflowEvaluation}
              </p>
            </div>

            {aiReport.tacticalSavings.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {aiReport.tacticalSavings.slice(0, 3).map((tip, idx) => (
                  <div
                    key={`${tip.title}-${idx}`}
                    className="rounded-xl border border-slate-200/70 bg-white p-4"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                      Tips Hemat {idx + 1}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-slate-900">
                      {tip.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {tip.action}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
