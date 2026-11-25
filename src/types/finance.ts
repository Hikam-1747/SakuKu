export type NavTab =
  | 'dashboard'
  | 'rab'
  | 'transactions'
  | 'monthly'
  | 'settings';

export type TransactionType = 'income' | 'expense';

export type TransactionMethod =
  | 'QRIS / E-Wallet'
  | 'Transfer Bank'
  | 'Tunai / Dompet'
  | 'PayLater / Cicilan';

export type TransactionStatus = 'Lunas' | 'Pending';

export type RabStatus = 'Aman' | 'Mendekati Limit' | 'Over-Budget';

export interface RabItem {
  id: string;
  category: string;
  allocated: number;
  notes: string;
  createdAt: string;
}

export interface IncomeSourceItem {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
}

export interface BusinessProfile {
  businessName: string;
  userName?: string;
  tagline: string;
  addressContact: string;
  logoDataUrl: string | null;
}

export interface TransactionItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  method: TransactionMethod;
  status: TransactionStatus;
  notes?: string;
}

export interface RabMetric extends RabItem {
  spent: number;
  remaining: number;
  utilizationPct: number;
  status: RabStatus;
}

export interface IncomeSourceMetric extends IncomeSourceItem {
  totalReceived: number;
  txCount: number;
  sharePct: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalRabTarget: number;
  totalExpense: number;
  netCashflow: number;
  rabUtilizationPct: number;
}

export interface DailyBudgetRecommendation {
  dailyAllowance: number;
  remainingMoney: number;
  daysRemaining: number;
  daysInMonth: number;
  monthKey: string;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
}

export interface TransactionFilters {
  type: 'all' | TransactionType;
  category: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}

export interface MonthOption {
  key: string; // YYYY-MM
  label: string; // e.g., November 2026
}

export interface MonthlySummaryRow {
  monthKey: string;
  label: string;
  shortLabel: string;
  totalIncome: number;
  totalRab: number;
  totalExpense: number;
  netProfit: number;
  efficiencyPct: number; // (totalExpense / totalRab) * 100
}

export interface MoMMetricDelta {
  current: number;
  previous: number;
  deltaAmount: number;
  deltaPct: number | null; // null when previous === 0
  direction: 'up' | 'down' | 'flat';
}

export interface MonthOverMonthComparison {
  currentMonthKey: string;
  currentMonthLabel: string;
  previousMonthKey: string;
  previousMonthLabel: string;
  hasPreviousData: boolean;
  income: MoMMetricDelta;
  expense: MoMMetricDelta;
  netCashflow: MoMMetricDelta;
}

export interface CategoryMonthDelta {
  category: string;
  amountA: number;
  amountB: number;
  diff: number; // amountB - amountA
  diffPct: number | null;
}

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  businessProfile?: BusinessProfile;
  rabItems: RabItem[];
  incomeSources?: IncomeSourceItem[];
  transactions: TransactionItem[];
}

export interface ToastMessage {
  id: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface AiInsightReport {
  healthStatus: 'Sehat' | 'Perlu Perhatian' | 'Kritis' | string;
  executiveSummary: string;
  cashflowEvaluation: string;
  budgetLeakage: Array<{
    category: string;
    severity: string;
    finding: string;
  }>;
  tacticalSavings: Array<{
    title: string;
    action: string;
    estimatedImpact: string;
  }>;
  generatedAt: string;
}
