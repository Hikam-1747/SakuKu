import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpenseBreakdown,
  buildIncomeBreakdown,
  buildPdfFilename,
  buildPeriodComparisonSeries,
  computeCategoryMonthComparison,
  computeDailyBudgetRecommendation,
  computeDashboardSummary,
  computeIncomeSourceMetrics,
  computeMonthOverMonthComparison,
  computeMonthlyRows,
  computeRabMetrics,
  detectImageFormatFromDataUrl,
  filterTransactions,
  filterTransactionsByPeriod,
  formatCompactRupiah,
  formatInputThousands,
  formatMonthLabel,
  formatRupiah,
  formatShortDateLabel,
  generateCsvReport,
  getAvailableMonths,
  getCurrentMonthKey,
  getMonthDateBounds,
  getPreviousCalendarMonth,
  getRabStatus,
  getTransactionFilterCategoryGroups,
  normalizeBusinessProfile,
  parseRupiahInput,
  sanitizePdfFilenamePart,
  validateLogoFileMetadata,
} from './finance';
import { getCategoryVisual } from './categories';
import { createBackupPayload, parseAndValidateBackup } from './backup';
import {
  DEMO_INCOME_SOURCES,
  DEMO_RAB_ITEMS,
  DEMO_TRANSACTIONS,
} from '../data/demoData';
import type {
  BusinessProfile,
  IncomeSourceItem,
  RabItem,
  TransactionItem,
} from '../types/finance';

const sampleIncomeSources: IncomeSourceItem[] = [
  {
    id: 'inc-1',
    name: 'Uang Saku Bulanan',
    notes: 'Kiriman orang tua',
    createdAt: '2026-09-01',
  },
  {
    id: 'inc-2',
    name: 'Freelance',
    notes: 'Honor project desain',
    createdAt: '2026-09-02',
  },
];

const sampleBudgets: RabItem[] = [
  {
    id: 'b1',
    category: 'Makan & Minum',
    allocated: 1_000_000,
    notes: 'Warteg & kantin kampus',
    createdAt: '2026-09-01',
  },
  {
    id: 'b2',
    category: 'Nongkrong/Kopi',
    allocated: 250_000,
    notes: 'Kafe & ngopi nugas',
    createdAt: '2026-09-01',
  },
  {
    id: 'b3',
    category: 'Kos & Listrik',
    allocated: 900_000,
    notes: 'Sewa kamar & token',
    createdAt: '2026-09-01',
  },
];

const sampleTx: TransactionItem[] = [
  {
    id: 't1',
    date: '2026-09-05',
    type: 'income',
    title: 'Kiriman September',
    category: 'Uang Saku Bulanan',
    amount: 2_500_000,
    method: 'Transfer Bank',
    status: 'Lunas',
  },
  {
    id: 't2',
    date: '2026-09-15',
    type: 'expense',
    title: 'Makan & Galon Sep',
    category: 'Makan & Minum',
    amount: 850_000,
    method: 'QRIS / E-Wallet',
    status: 'Lunas',
  },
  {
    id: 't3',
    date: '2026-10-05',
    type: 'expense',
    title: 'Ngopi Nugas UTS',
    category: 'Nongkrong/Kopi',
    amount: 300_000,
    method: 'QRIS / E-Wallet',
    status: 'Lunas',
  },
  {
    id: 't4',
    date: '2026-10-12',
    type: 'expense',
    title: 'Sewa Kos Okt',
    category: 'Kos & Listrik',
    amount: 900_000,
    method: 'Transfer Bank',
    status: 'Lunas',
  },
  {
    id: 't5',
    date: '2026-10-20',
    type: 'income',
    title: 'Kiriman Oktober',
    category: 'Uang Saku Bulanan',
    amount: 2_500_000,
    method: 'Transfer Bank',
    status: 'Lunas',
  },
  {
    id: 't6',
    date: '2026-11-08',
    type: 'expense',
    title: 'Makan Siang Kantin',
    category: 'Makan & Minum',
    amount: 400_000,
    method: 'Tunai / Dompet',
    status: 'Lunas',
  },
];

test('formatRupiah, formatCompactRupiah, formatShortDateLabel, and input parsing work accurately for IDR', () => {
  assert.equal(formatRupiah(1_250_000), 'Rp 1.250.000');
  assert.equal(formatRupiah(-250_000), '-Rp 250.000');
  assert.equal(formatCompactRupiah(1_500_000), 'Rp 1,5 jt');
  assert.equal(formatCompactRupiah(450_000), 'Rp 450 rb');
  assert.equal(formatCompactRupiah(87_500), 'Rp 87,5 rb');
  assert.equal(formatCompactRupiah(-1_200_000), '-Rp 1,2 jt');
  assert.equal(formatCompactRupiah(750), 'Rp 750');
  assert.equal(formatInputThousands('1250000'), '1.250.000');
  assert.equal(parseRupiahInput('Rp 1.250.000'), 1_250_000);
  assert.match(formatShortDateLabel('2026-11-22'), /22\s+Nov\s+2026/i);
});

test('getRabStatus classifies Aman, Mendekati Limit, and Over-Budget correctly', () => {
  assert.equal(getRabStatus(80), 'Aman');
  assert.equal(getRabStatus(80.1), 'Mendekati Limit');
  assert.equal(getRabStatus(100), 'Mendekati Limit');
  assert.equal(getRabStatus(100.1), 'Over-Budget');
});

test('computeDailyBudgetRecommendation divides remaining money by remaining days accurately', () => {
  // Nov 25, 2026 out of 30 days -> 6 days remaining (25..30)
  const refDate = new Date(2026, 10, 25);
  assert.equal(getCurrentMonthKey(refDate), '2026-11');

  const rec = computeDailyBudgetRecommendation(525_000, '2026-11', refDate);
  assert.equal(rec.isCurrentMonth, true);
  assert.equal(rec.isPastMonth, false);
  assert.equal(rec.daysInMonth, 30);
  assert.equal(rec.daysRemaining, 6);
  assert.equal(rec.dailyAllowance, 87_500);

  // Last day of month -> daysRemaining = 1 (never divides by zero)
  const lastDayRec = computeDailyBudgetRecommendation(
    120_000,
    '2026-11',
    new Date(2026, 10, 30)
  );
  assert.equal(lastDayRec.daysRemaining, 1);
  assert.equal(lastDayRec.dailyAllowance, 120_000);

  // Negative or zero remaining money clamps daily allowance to 0
  const deficitRec = computeDailyBudgetRecommendation(-50_000, '2026-11', refDate);
  assert.equal(deficitRec.dailyAllowance, 0);

  // Past month marks isPastMonth = true
  const pastRec = computeDailyBudgetRecommendation(800_000, '2026-10', refDate);
  assert.equal(pastRec.isPastMonth, true);
  assert.equal(pastRec.daysRemaining, 0);
  assert.equal(pastRec.dailyAllowance, 0);
});

test('computeRabMetrics aggregates spent, remaining, and status accurately with period multiplier', () => {
  const metrics = computeRabMetrics(sampleBudgets, sampleTx);
  assert.equal(metrics.length, 3);

  const makan = metrics[0];
  assert.equal(makan.spent, 1_250_000);
  assert.equal(makan.remaining, -250_000);
  assert.equal(makan.status, 'Over-Budget');

  const nongkrong = metrics[1];
  assert.equal(nongkrong.spent, 300_000);
  assert.equal(nongkrong.remaining, -50_000);
  assert.equal(nongkrong.status, 'Over-Budget');

  // With 3-month multiplier, 1_000_000 * 3 = 3_000_000 -> 1_250_000 is Aman
  const multiMetrics = computeRabMetrics(sampleBudgets, sampleTx, 3);
  assert.equal(multiMetrics[0].allocated, 3_000_000);
  assert.equal(multiMetrics[0].status, 'Aman');
});

test('demo data matches student/anak kos scenario for 3 months', () => {
  assert.deepEqual(
    DEMO_INCOME_SOURCES.map((s) => s.name),
    ['Uang Saku Bulanan', 'Freelance', 'Beasiswa', 'Jualan']
  );
  assert.deepEqual(
    DEMO_RAB_ITEMS.map((r) => r.category),
    [
      'Makan & Minum',
      'Kos & Listrik',
      'Bensin/Transport',
      'Tugas & Print',
      'Nongkrong/Kopi',
      'Tabungan',
    ]
  );

  const novTx = filterTransactionsByPeriod(DEMO_TRANSACTIONS, '2026-11');
  const novSummary = computeDashboardSummary(DEMO_RAB_ITEMS, novTx);
  assert.equal(novSummary.totalIncome, 3_300_000);
  assert.equal(novSummary.totalExpense, 2_775_000);
  assert.equal(novSummary.netCashflow, 525_000);
});

test('computeDashboardSummary calculates totals and net cashflow', () => {
  const summary = computeDashboardSummary(sampleBudgets, sampleTx);
  assert.equal(summary.totalIncome, 5_000_000);
  assert.equal(summary.totalRabTarget, 2_150_000);
  assert.equal(summary.totalExpense, 2_450_000);
  assert.equal(summary.netCashflow, 2_550_000);
});

test('filterTransactions handles type, category, date range, and search query', () => {
  const onlyOctober = filterTransactions(sampleTx, {
    type: 'expense',
    category: 'all',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
    searchQuery: '',
  });
  assert.equal(onlyOctober.length, 2);
  assert.equal(onlyOctober[0].id, 't4');
});

test('period helpers, available months, and month bounds work accurately', () => {
  const months = getAvailableMonths(sampleTx);
  assert.deepEqual(
    months.map((m) => m.key),
    ['2026-11', '2026-10', '2026-09']
  );
  assert.equal(formatMonthLabel('2026-11'), 'November 2026');
  assert.equal(getPreviousCalendarMonth('2026-01'), '2025-12');
  assert.deepEqual(getMonthDateBounds('2026-02'), {
    dateFrom: '2026-02-01',
    dateTo: '2026-02-28',
  });
});

test('computeMonthOverMonthComparison computes accurate percentage deltas', () => {
  const mom = computeMonthOverMonthComparison(sampleTx, '2026-10');
  assert.equal(mom.hasPreviousData, true);
  assert.equal(mom.income.current, 2_500_000);
  assert.equal(mom.income.previous, 2_500_000);
  assert.equal(mom.income.direction, 'flat');

  assert.equal(mom.expense.current, 1_200_000);
  assert.equal(mom.expense.previous, 850_000);
  assert.equal(mom.expense.direction, 'up');
});

test('computeMonthlyRows uses full monthly budget target per month', () => {
  const rows = computeMonthlyRows(sampleBudgets, sampleTx, 6);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].totalRab, 2_150_000);
  assert.equal(rows[2].totalRab, 2_150_000);

  const catDiff = computeCategoryMonthComparison(
    sampleBudgets,
    sampleTx,
    '2026-09',
    '2026-10'
  );
  const makanRow = catDiff.find((c) => c.category === 'Makan & Minum');
  assert.equal(makanRow?.amountA, 850_000);
  assert.equal(makanRow?.amountB, 0);
  assert.equal(makanRow?.diff, -850_000);
});

test('period comparison series, expense breakdown, and CSV export use student budget labels', () => {
  const periodSeries = buildPeriodComparisonSeries(sampleBudgets, sampleTx);
  assert.equal(periodSeries.labels.length, 3);
  assert.equal(periodSeries.rabTarget[0], 2_150_000);

  const breakdown = buildExpenseBreakdown(sampleTx);
  assert.equal(breakdown[0].category, 'Makan & Minum');

  const metrics = computeRabMetrics(sampleBudgets, sampleTx);
  const summary = computeDashboardSummary(sampleBudgets, sampleTx);
  const csv = generateCsvReport(metrics, sampleTx, summary);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('RINGKASAN BUDGET BULANAN SAKUKU'));
  assert.ok(csv.includes('PERBANDINGAN JATAH ANGGARAN VS TERPAKAI'));
  assert.ok(csv.includes('Sisa Uang Saku'));
});

test('computeIncomeSourceMetrics and buildIncomeBreakdown aggregate income sources accurately', () => {
  const sourceMetrics = computeIncomeSourceMetrics(sampleIncomeSources, sampleTx);
  assert.equal(sourceMetrics.length, 2);
  assert.equal(sourceMetrics[0].name, 'Uang Saku Bulanan');
  assert.equal(sourceMetrics[0].totalReceived, 5_000_000);
  assert.equal(sourceMetrics[0].txCount, 2);
  assert.equal(Math.round(sourceMetrics[0].sharePct), 100);

  const breakdown = buildIncomeBreakdown(sampleTx);
  assert.equal(breakdown.length, 1);
  assert.equal(breakdown[0].source, 'Uang Saku Bulanan');
});

test('backup serialization and validation round-trips valid data and rejects malformed JSON', () => {
  const payload = createBackupPayload(sampleBudgets, sampleTx, sampleIncomeSources);
  assert.equal(payload.app, 'SakuKu');
  const res = parseAndValidateBackup(JSON.stringify(payload));
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.rabItems.length, sampleBudgets.length);
    assert.equal(res.incomeSources?.length, sampleIncomeSources.length);
    assert.equal(res.transactions.length, sampleTx.length);
  }

  // Backward compatibility with legacy payment methods
  const legacyPayload = JSON.stringify({
    app: 'FinTrack Pro',
    version: 1,
    exportedAt: '2026-10-01T00:00:00.000Z',
    rabItems: sampleBudgets,
    transactions: [
      {
        ...sampleTx[0],
        method: 'Tunai / Kas Kecil',
      },
    ],
  });
  const legacyRes = parseAndValidateBackup(legacyPayload);
  assert.equal(legacyRes.ok, true);
  if (legacyRes.ok) {
    assert.equal(legacyRes.incomeSources, null);
    assert.equal(legacyRes.transactions[0].method, 'Tunai / Dompet');
  }

  const bad = parseAndValidateBackup('{"rabItems": "invalid"}');
  assert.equal(bad.ok, false);
});

test('getTransactionFilterCategoryGroups separates income sources and budget categories cleanly', () => {
  const groups = getTransactionFilterCategoryGroups(
    sampleBudgets,
    sampleIncomeSources,
    sampleTx
  );

  assert.deepEqual(groups.incomeCategories, ['Uang Saku Bulanan', 'Freelance']);
  assert.deepEqual(groups.expenseCategories, [
    'Makan & Minum',
    'Nongkrong/Kopi',
    'Kos & Listrik',
  ]);
});

test('profile normalization, logo validation, CSV header, and PDF filename work accurately', () => {
  const validImg = validateLogoFileMetadata('image/png', 150_000);
  assert.equal(validImg.ok, true);

  const badMime = validateLogoFileMetadata('application/pdf', 10_000);
  assert.equal(badMime.ok, false);

  const tooBig = validateLogoFileMetadata('image/jpeg', 3 * 1024 * 1024);
  assert.equal(tooBig.ok, false);

  const profile: BusinessProfile = normalizeBusinessProfile({
    businessName: '  SakuKu — Rizky  ',
    userName: '  Rizky  ',
    tagline: ' Informatika Semester 5 ',
    addressContact: ' Kos Melati Sleman ',
    logoDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  });

  assert.equal(profile.businessName, 'SakuKu — Rizky');
  assert.equal(profile.userName, 'Rizky');
  assert.equal(profile.tagline, 'Informatika Semester 5');
  assert.equal(profile.addressContact, 'Kos Melati Sleman');

  const defaultUserProfile = normalizeBusinessProfile({ businessName: 'SakuKu' });
  assert.equal(defaultUserProfile.userName, 'Sobat Kos');

  const metrics = computeRabMetrics(sampleBudgets, sampleTx);
  const summary = computeDashboardSummary(sampleBudgets, sampleTx);
  const csvWithProfile = generateCsvReport(metrics, sampleTx, summary, profile);
  assert.ok(csvWithProfile.includes('PROFIL SAKUKU,SakuKu — Rizky'));

  assert.equal(
    sanitizePdfFilenamePart('SakuKu - Rizky!'),
    'SakuKu-Rizky'
  );
  assert.equal(
    buildPdfFilename('SakuKu', 'November 2026'),
    'Laporan-Budget-SakuKu-November-2026.pdf'
  );
  assert.equal(detectImageFormatFromDataUrl('data:image/png;base64,abc'), 'PNG');
  assert.equal(detectImageFormatFromDataUrl(null), null);
});

test('getCategoryVisual returns semantic icons and soft badge classes for student categories', () => {
  assert.equal(getCategoryVisual('Makan & Minum', 'expense').iconKey, 'food');
  assert.equal(getCategoryVisual('Kos & Listrik', 'expense').iconKey, 'home');
  assert.equal(getCategoryVisual('Uang Saku Bulanan', 'income').iconKey, 'wallet');
  assert.equal(getCategoryVisual('Beasiswa', 'income').iconKey, 'scholarship');
  assert.equal(getCategoryVisual('Kategori Custom', 'expense').iconKey, 'tag');
});
