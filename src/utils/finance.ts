import type {
  BusinessProfile,
  CategoryMonthDelta,
  DailyBudgetRecommendation,
  DashboardSummary,
  IncomeSourceItem,
  IncomeSourceMetric,
  MoMMetricDelta,
  MonthOption,
  MonthOverMonthComparison,
  MonthlySummaryRow,
  RabItem,
  RabMetric,
  RabStatus,
  TransactionFilters,
  TransactionItem,
} from '../types/finance';

export const INCOME_CATEGORIES: readonly string[] = [
  'Uang Saku Bulanan',
  'Freelance',
  'Beasiswa',
  'Jualan',
];

export function formatRupiah(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const isNegative = safe < 0;
  const absFormatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.abs(safe));
  return `${isNegative ? '-Rp ' : 'Rp '}${absFormatted}`;
}

export function formatCompactRupiah(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    const num = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${sign}Rp ${num} M`;
  }
  if (abs >= 1_000_000) {
    const num = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${sign}Rp ${num} jt`;
  }
  if (abs >= 1_000) {
    const num = (abs / 1_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${sign}Rp ${num} rb`;
  }
  return formatRupiah(safe);
}

export function formatInputThousands(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

export function parseRupiahInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getRabStatus(utilizationPct: number): RabStatus {
  if (utilizationPct > 100) return 'Over-Budget';
  if (utilizationPct > 80) return 'Mendekati Limit';
  return 'Aman';
}

export function formatMonthLabel(monthKey: string, short = false): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey;
  }
  const dateObj = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  }).format(dateObj);
}

export function formatShortDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return dateStr;
  }
  const dateObj = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);
}

export function getCurrentMonthKey(referenceDate: Date = new Date()): string {
  const y = referenceDate.getFullYear();
  const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getAvailableMonths(transactions: TransactionItem[]): MonthOption[] {
  const keys = new Set<string>();
  for (const tx of transactions) {
    if (tx.date && tx.date.length >= 7) {
      keys.add(tx.date.slice(0, 7));
    }
  }
  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      key,
      label: formatMonthLabel(key),
    }));
}

export function filterTransactionsByPeriod(
  transactions: TransactionItem[],
  periodKey: string
): TransactionItem[] {
  if (!periodKey || periodKey === 'all') return transactions;
  return transactions.filter((tx) => tx.date.startsWith(periodKey));
}

export function getMonthDateBounds(monthKey: string): {
  dateFrom: string;
  dateTo: string;
} {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return { dateFrom: '', dateTo: '' };
  }
  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${yearStr}-${monthStr}-01`,
    dateTo: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function getPreviousCalendarMonth(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function computeDailyBudgetRecommendation(
  remainingMoney: number,
  monthKey: string,
  referenceDate: Date = new Date()
): DailyBudgetRecommendation {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return {
      dailyAllowance: 0,
      remainingMoney,
      daysRemaining: 0,
      daysInMonth: 30,
      monthKey,
      isCurrentMonth: false,
      isPastMonth: false,
    };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  if (year < refYear || (year === refYear && month < refMonth)) {
    return {
      dailyAllowance: 0,
      remainingMoney,
      daysRemaining: 0,
      daysInMonth,
      monthKey,
      isCurrentMonth: false,
      isPastMonth: true,
    };
  }

  if (year === refYear && month === refMonth) {
    const daysRemaining = Math.max(1, daysInMonth - refDay + 1);
    const dailyAllowance =
      remainingMoney > 0 ? Math.floor(remainingMoney / daysRemaining) : 0;
    return {
      dailyAllowance,
      remainingMoney,
      daysRemaining,
      daysInMonth,
      monthKey,
      isCurrentMonth: true,
      isPastMonth: false,
    };
  }

  // Future month
  const dailyAllowance =
    remainingMoney > 0 ? Math.floor(remainingMoney / daysInMonth) : 0;
  return {
    dailyAllowance,
    remainingMoney,
    daysRemaining: daysInMonth,
    daysInMonth,
    monthKey,
    isCurrentMonth: false,
    isPastMonth: false,
  };
}

export function computeRabMetrics(
  rabItems: RabItem[],
  transactions: TransactionItem[],
  periodMultiplier = 1
): RabMetric[] {
  const multiplier = Math.max(1, periodMultiplier);
  const expenseByCategory = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const current = expenseByCategory.get(tx.category) ?? 0;
      expenseByCategory.set(tx.category, current + tx.amount);
    }
  }

  return rabItems.map((item) => {
    const allocated = item.allocated * multiplier;
    const spent = expenseByCategory.get(item.category) ?? 0;
    const remaining = allocated - spent;
    const utilizationPct =
      allocated > 0 ? (spent / allocated) * 100 : spent > 0 ? 100 : 0;
    const status = getRabStatus(utilizationPct);

    return {
      ...item,
      allocated,
      spent,
      remaining,
      utilizationPct,
      status,
    };
  });
}

export function computeDashboardSummary(
  rabItems: RabItem[],
  transactions: TransactionItem[],
  periodMultiplier = 1
): DashboardSummary {
  const multiplier = Math.max(1, periodMultiplier);
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
    }
  }

  const totalRabTarget =
    rabItems.reduce((sum, item) => sum + item.allocated, 0) * multiplier;
  const netCashflow = totalIncome - totalExpense;
  const rabUtilizationPct =
    totalRabTarget > 0 ? (totalExpense / totalRabTarget) * 100 : 0;

  return {
    totalIncome,
    totalRabTarget,
    totalExpense,
    netCashflow,
    rabUtilizationPct,
  };
}

export function filterTransactions(
  transactions: TransactionItem[],
  filters: TransactionFilters
): TransactionItem[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return transactions
    .filter((tx) => {
      if (filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }
      if (filters.category && filters.category !== 'all' && tx.category !== filters.category) {
        return false;
      }
      if (filters.dateFrom && tx.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && tx.date > filters.dateTo) {
        return false;
      }
      if (query) {
        const haystack = `${tx.title} ${tx.category} ${tx.method} ${tx.status} ${tx.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface TransactionFilterCategoryGroups {
  incomeCategories: string[];
  expenseCategories: string[];
}

export function getTransactionFilterCategoryGroups(
  rabItems: RabItem[],
  incomeSources: IncomeSourceItem[],
  transactions: TransactionItem[]
): TransactionFilterCategoryGroups {
  const incomeSet = new Set<string>();
  const expenseSet = new Set<string>();

  for (const source of incomeSources) {
    const trimmed = source.name.trim();
    if (trimmed) incomeSet.add(trimmed);
  }
  for (const rab of rabItems) {
    const trimmed = rab.category.trim();
    if (trimmed) expenseSet.add(trimmed);
  }
  for (const tx of transactions) {
    const trimmed = tx.category.trim();
    if (!trimmed) continue;
    if (tx.type === 'income') {
      incomeSet.add(trimmed);
    } else if (tx.type === 'expense') {
      expenseSet.add(trimmed);
    }
  }

  return {
    incomeCategories: Array.from(incomeSet),
    expenseCategories: Array.from(expenseSet),
  };
}

export interface PeriodComparisonSeries {
  labels: string[];
  income: number[];
  rabTarget: number[];
  expense: number[];
}

export function buildPeriodComparisonSeries(
  rabItems: RabItem[],
  transactions: TransactionItem[]
): PeriodComparisonSeries {
  const monthBuckets = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    if (!tx.date || tx.date.length < 7) continue;
    const monthKey = tx.date.slice(0, 7);
    const bucket = monthBuckets.get(monthKey) ?? { income: 0, expense: 0 };
    if (tx.type === 'income') {
      bucket.income += tx.amount;
    } else {
      bucket.expense += tx.amount;
    }
    monthBuckets.set(monthKey, bucket);
  }

  const sortedKeys = Array.from(monthBuckets.keys()).sort();
  if (sortedKeys.length === 0) {
    return { labels: [], income: [], rabTarget: [], expense: [] };
  }

  // Monthly budget allocation baseline per month
  const monthlyBudgetTarget = rabItems.reduce((sum, item) => sum + item.allocated, 0);

  const labels: string[] = [];
  const income: number[] = [];
  const rabTarget: number[] = [];
  const expense: number[] = [];

  for (const key of sortedKeys) {
    labels.push(formatMonthLabel(key, true));
    const bucket = monthBuckets.get(key)!;
    income.push(bucket.income);
    rabTarget.push(monthlyBudgetTarget);
    expense.push(bucket.expense);
  }

  return { labels, income, rabTarget, expense };
}

export interface CategoryComparisonSeries {
  labels: string[];
  income: number[];
  rabTarget: number[];
  expense: number[];
}

export function buildCategoryComparisonSeries(
  rabMetrics: RabMetric[],
  transactions: TransactionItem[]
): CategoryComparisonSeries {
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalRab = rabMetrics.reduce((sum, item) => sum + item.allocated, 0);

  const labels: string[] = [];
  const income: number[] = [];
  const rabTarget: number[] = [];
  const expense: number[] = [];

  for (const item of rabMetrics) {
    labels.push(item.category);
    const share = totalRab > 0 ? item.allocated / totalRab : 0;
    income.push(Math.round(totalIncome * share));
    rabTarget.push(item.allocated);
    expense.push(item.spent);
  }

  return { labels, income, rabTarget, expense };
}

export function computeMonthlyRows(
  rabItems: RabItem[],
  transactions: TransactionItem[],
  maxMonths = 6
): MonthlySummaryRow[] {
  const buckets = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    if (!tx.date || tx.date.length < 7) continue;
    const key = tx.date.slice(0, 7);
    const b = buckets.get(key) ?? { income: 0, expense: 0 };
    if (tx.type === 'income') {
      b.income += tx.amount;
    } else {
      b.expense += tx.amount;
    }
    buckets.set(key, b);
  }

  const allKeys = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));
  const recentKeys = allKeys.slice(-maxMonths);
  const monthlyBudgetTarget = rabItems.reduce((sum, item) => sum + item.allocated, 0);

  return recentKeys.map((monthKey) => {
    const bucket = buckets.get(monthKey)!;
    const netProfit = bucket.income - bucket.expense;
    const efficiencyPct =
      monthlyBudgetTarget > 0 ? (bucket.expense / monthlyBudgetTarget) * 100 : 0;

    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      shortLabel: formatMonthLabel(monthKey, true),
      totalIncome: bucket.income,
      totalRab: monthlyBudgetTarget,
      totalExpense: bucket.expense,
      netProfit,
      efficiencyPct,
    };
  });
}

function buildMoMDelta(current: number, previous: number): MoMMetricDelta {
  const deltaAmount = current - previous;
  const deltaPct =
    previous !== 0 ? (deltaAmount / Math.abs(previous)) * 100 : null;
  const direction =
    deltaAmount > 0 ? 'up' : deltaAmount < 0 ? 'down' : 'flat';

  return {
    current,
    previous,
    deltaAmount,
    deltaPct,
    direction,
  };
}

export function computeMonthOverMonthComparison(
  transactions: TransactionItem[],
  currentMonthKey: string
): MonthOverMonthComparison {
  const previousMonthKey = getPreviousCalendarMonth(currentMonthKey);

  let currIncome = 0;
  let currExpense = 0;
  let prevIncome = 0;
  let prevExpense = 0;
  let hasPreviousData = false;

  for (const tx of transactions) {
    if (tx.date.startsWith(currentMonthKey)) {
      if (tx.type === 'income') currIncome += tx.amount;
      else currExpense += tx.amount;
    } else if (tx.date.startsWith(previousMonthKey)) {
      hasPreviousData = true;
      if (tx.type === 'income') prevIncome += tx.amount;
      else prevExpense += tx.amount;
    }
  }

  return {
    currentMonthKey,
    currentMonthLabel: formatMonthLabel(currentMonthKey),
    previousMonthKey,
    previousMonthLabel: formatMonthLabel(previousMonthKey),
    hasPreviousData,
    income: buildMoMDelta(currIncome, prevIncome),
    expense: buildMoMDelta(currExpense, prevExpense),
    netCashflow: buildMoMDelta(currIncome - currExpense, prevIncome - prevExpense),
  };
}

export function computeCategoryMonthComparison(
  rabItems: RabItem[],
  transactions: TransactionItem[],
  monthA: string,
  monthB: string
): CategoryMonthDelta[] {
  const categories = new Set<string>(rabItems.map((r) => r.category));
  const mapA = new Map<string, number>();
  const mapB = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.date.startsWith(monthA)) {
      categories.add(tx.category);
      mapA.set(tx.category, (mapA.get(tx.category) ?? 0) + tx.amount);
    }
    if (tx.date.startsWith(monthB)) {
      categories.add(tx.category);
      mapB.set(tx.category, (mapB.get(tx.category) ?? 0) + tx.amount);
    }
  }

  return Array.from(categories)
    .map((category) => {
      const amountA = mapA.get(category) ?? 0;
      const amountB = mapB.get(category) ?? 0;
      const diff = amountB - amountA;
      const diffPct = amountA > 0 ? (diff / amountA) * 100 : null;
      return {
        category,
        amountA,
        amountB,
        diff,
        diffPct,
      };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

export interface ExpenseBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export function buildExpenseBreakdown(
  transactions: TransactionItem[]
): ExpenseBreakdownItem[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const tx of transactions) {
    if (tx.type === 'expense') {
      totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
      grandTotal += tx.amount;
    }
  }

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface IncomeBreakdownItem {
  source: string;
  amount: number;
  txCount: number;
  percentage: number;
}

export function computeIncomeSourceMetrics(
  incomeSources: IncomeSourceItem[],
  transactions: TransactionItem[]
): IncomeSourceMetric[] {
  const totals = new Map<string, { amount: number; count: number }>();
  let grandTotal = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      const current = totals.get(tx.category) ?? { amount: 0, count: 0 };
      current.amount += tx.amount;
      current.count += 1;
      totals.set(tx.category, current);
      grandTotal += tx.amount;
    }
  }

  return incomeSources.map((source) => {
    const agg = totals.get(source.name) ?? { amount: 0, count: 0 };
    return {
      ...source,
      totalReceived: agg.amount,
      txCount: agg.count,
      sharePct: grandTotal > 0 ? (agg.amount / grandTotal) * 100 : 0,
    };
  });
}

export function buildIncomeBreakdown(
  transactions: TransactionItem[]
): IncomeBreakdownItem[] {
  const totals = new Map<string, { amount: number; count: number }>();
  let grandTotal = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      const current = totals.get(tx.category) ?? { amount: 0, count: 0 };
      current.amount += tx.amount;
      current.count += 1;
      totals.set(tx.category, current);
      grandTotal += tx.amount;
    }
  }

  return Array.from(totals.entries())
    .map(([source, agg]) => ({
      source,
      amount: agg.amount,
      txCount: agg.count,
      percentage: grandTotal > 0 ? (agg.amount / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildIncomeByCategory(
  transactions: TransactionItem[]
): Array<{ category: string; amount: number }> {
  return buildIncomeBreakdown(transactions).map((item) => ({
    category: item.source,
    amount: item.amount,
  }));
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

export function validateLogoFileMetadata(
  mimeType: string,
  sizeBytes: number
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_LOGO_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      ok: false,
      error: 'Format foto/logo harus berupa gambar JPG, PNG, atau WebP.',
    };
  }
  if (sizeBytes > MAX_LOGO_FILE_BYTES) {
    return {
      ok: false,
      error: 'Ukuran file foto/logo maksimal 2 MB agar penyimpanan tetap ringan.',
    };
  }
  return { ok: true };
}

export function normalizeBusinessProfile(
  input: Partial<BusinessProfile> | null | undefined,
  fallbackName = 'SakuKu',
  fallbackUserName = 'Sobat Kos'
): BusinessProfile {
  const rawName = typeof input?.businessName === 'string' ? input.businessName.trim() : '';
  const rawUserName = typeof input?.userName === 'string' ? input.userName.trim() : '';
  const rawTagline = typeof input?.tagline === 'string' ? input.tagline.trim() : '';
  const rawAddress =
    typeof input?.addressContact === 'string' ? input.addressContact.trim() : '';
  const rawLogo =
    typeof input?.logoDataUrl === 'string' && input.logoDataUrl.startsWith('data:image/')
      ? input.logoDataUrl
      : null;

  return {
    businessName: rawName || fallbackName,
    userName: rawUserName || fallbackUserName,
    tagline: rawTagline,
    addressContact: rawAddress,
    logoDataUrl: rawLogo,
  };
}

export function sanitizePdfFilenamePart(
  value: string,
  fallback = 'SakuKu'
): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

export function buildPdfFilename(
  businessName: string,
  periodLabel: string
): string {
  const safeName = sanitizePdfFilenamePart(businessName, 'SakuKu');
  const safePeriod = sanitizePdfFilenamePart(periodLabel, 'Semua-Periode');
  return `Laporan-Budget-${safeName}-${safePeriod}.pdf`;
}

export function detectImageFormatFromDataUrl(
  dataUrl: string | null | undefined
): 'PNG' | 'JPEG' | 'WEBP' | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const lower = dataUrl.slice(0, 40).toLowerCase();
  if (lower.startsWith('data:image/png')) return 'PNG';
  if (lower.startsWith('data:image/jpeg') || lower.startsWith('data:image/jpg')) {
    return 'JPEG';
  }
  if (lower.startsWith('data:image/webp')) return 'WEBP';
  return null;
}

export function generateCsvReport(
  rabMetrics: RabMetric[],
  transactions: TransactionItem[],
  summary: DashboardSummary,
  businessProfile?: BusinessProfile
): string {
  const lines: string[] = [];

  if (businessProfile) {
    const profile = normalizeBusinessProfile(businessProfile);
    lines.push(['PROFIL SAKUKU', profile.businessName].map(escapeCsvCell).join(','));
    if (profile.tagline) {
      lines.push(['Kampus / Keterangan', profile.tagline].map(escapeCsvCell).join(','));
    }
    if (profile.addressContact) {
      lines.push(['Kos / Kontak', profile.addressContact].map(escapeCsvCell).join(','));
    }
    lines.push(
      ['Tanggal Ekspor', new Date().toISOString().slice(0, 10)]
        .map(escapeCsvCell)
        .join(',')
    );
    lines.push('');
  }

  lines.push('RINGKASAN BUDGET BULANAN SAKUKU');
  lines.push(['Metrik', 'Nilai (IDR)'].map(escapeCsvCell).join(','));
  lines.push(['Total Pemasukan', summary.totalIncome].map(escapeCsvCell).join(','));
  lines.push(['Total Jatah Anggaran', summary.totalRabTarget].map(escapeCsvCell).join(','));
  lines.push(['Total Terpakai', summary.totalExpense].map(escapeCsvCell).join(','));
  lines.push(['Sisa Uang Saku', summary.netCashflow].map(escapeCsvCell).join(','));
  lines.push('');

  lines.push('PERBANDINGAN JATAH ANGGARAN VS TERPAKAI');
  lines.push(
    ['Kategori Budget', 'Jatah Anggaran (IDR)', 'Terpakai (IDR)', 'Sisa Budget (IDR)', 'Persentase Terpakai (%)', 'Status', 'Catatan']
      .map(escapeCsvCell)
      .join(',')
  );
  for (const rab of rabMetrics) {
    lines.push(
      [
        rab.category,
        rab.allocated,
        rab.spent,
        rab.remaining,
        `${rab.utilizationPct.toFixed(1)}%`,
        rab.status,
        rab.notes,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  lines.push('');

  const incomeBreakdown = buildIncomeBreakdown(transactions);
  if (incomeBreakdown.length > 0) {
    lines.push('RINGKASAN PEMASUKAN PER SUMBER');
    lines.push(
      ['Sumber Pemasukan', 'Jumlah Transaksi', 'Total Pemasukan (IDR)', 'Proporsi (%)']
        .map(escapeCsvCell)
        .join(',')
    );
    for (const item of incomeBreakdown) {
      lines.push(
        [
          item.source,
          item.txCount,
          item.amount,
          `${item.percentage.toFixed(1)}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
    lines.push('');
  }

  lines.push('RIWAYAT TRANSAKSI');
  lines.push(
    ['Tanggal', 'Jenis', 'Judul Transaksi', 'Kategori', 'Nominal (IDR)', 'Metode', 'Status', 'Catatan']
      .map(escapeCsvCell)
      .join(',')
  );
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  for (const tx of sorted) {
    lines.push(
      [
        tx.date,
        tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        tx.title,
        tx.category,
        tx.amount,
        tx.method,
        tx.status,
        tx.notes ?? '',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  return `\uFEFF${lines.join('\r\n')}`;
}
