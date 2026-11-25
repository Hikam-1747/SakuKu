import { useEffect, useState, type FormEvent } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type {
  IncomeSourceItem,
  RabItem,
  TransactionItem,
  TransactionMethod,
  TransactionStatus,
  TransactionType,
} from '../types/finance';
import { formatInputThousands, parseRupiahInput } from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';

interface QuickTransactionModalProps {
  isOpen: boolean;
  editingTransaction?: TransactionItem | null;
  rabItems: RabItem[];
  incomeSources: IncomeSourceItem[];
  onClose: () => void;
  onSaveTransaction: (
    data: Omit<TransactionItem, 'id'>,
    editingId?: string
  ) => void;
  onQuickAddIncomeSource: (
    name: string
  ) => { ok: boolean; error?: string; item?: IncomeSourceItem };
  onNavigateToBudget: () => void;
}

const METHODS: TransactionMethod[] = [
  'QRIS / E-Wallet',
  'Transfer Bank',
  'Tunai / Dompet',
  'PayLater / Cicilan',
];

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function QuickTransactionModal({
  isOpen,
  editingTransaction = null,
  rabItems,
  incomeSources,
  onClose,
  onSaveTransaction,
  onQuickAddIncomeSource,
  onNavigateToBudget,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(getTodayDateString());
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<TransactionMethod>('QRIS / E-Wallet');
  const [status, setStatus] = useState<TransactionStatus>('Lunas');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [showQuickAddSource, setShowQuickAddSource] = useState(false);
  const [quickSourceName, setQuickSourceName] = useState('');
  const [quickSourceError, setQuickSourceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setTitle(editingTransaction.title);
      setCategory(editingTransaction.category);
      setAmountText(formatInputThousands(String(editingTransaction.amount)));
      setMethod(editingTransaction.method);
      setStatus(editingTransaction.status);
      setNotes(editingTransaction.notes ?? '');
      setFormError(null);
      setShowQuickAddSource(false);
      setQuickSourceName('');
      setQuickSourceError(null);
      return;
    }

    setType('expense');
    setDate(getTodayDateString());
    setTitle('');
    setCategory(rabItems[0]?.category ?? '');
    setAmountText('');
    setMethod('QRIS / E-Wallet');
    setStatus('Lunas');
    setNotes('');
    setFormError(null);
    setShowQuickAddSource(false);
    setQuickSourceName('');
    setQuickSourceError(null);
  }, [isOpen, editingTransaction, rabItems]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const expenseCategories = rabItems.map((r) => r.category);
  const incomeCategoryNames = incomeSources.map((s) => s.name);
  const availableCategories =
    type === 'expense' ? expenseCategories : incomeCategoryNames;

  function handleToggleType(nextType: TransactionType) {
    setType(nextType);
    setShowQuickAddSource(false);
    setQuickSourceError(null);
    setFormError(null);
    if (nextType === 'expense') {
      setCategory(expenseCategories[0] ?? '');
    } else {
      setCategory(incomeCategoryNames[0] ?? '');
    }
  }

  function handleQuickCreateIncomeSource() {
    const trimmed = quickSourceName.trim();
    if (!trimmed) {
      setQuickSourceError('Nama sumber pemasukan baru wajib diisi.');
      return;
    }
    const res = onQuickAddIncomeSource(trimmed);
    if (!res.ok || !res.item) {
      setQuickSourceError(res.error ?? 'Gagal menambahkan sumber pemasukan.');
      return;
    }
    setCategory(res.item.name);
    setQuickSourceName('');
    setQuickSourceError(null);
    setShowQuickAddSource(false);
    if (formError) setFormError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseRupiahInput(amountText);
    const trimmedTitle = title.trim();

    if (parsedAmount <= 0) {
      setFormError('Masukkan nominal transaksi lebih dari Rp 0.');
      return;
    }
    if (!category) {
      setFormError(
        type === 'expense'
          ? 'Pilih kategori jatah pengeluaran terlebih dahulu.'
          : 'Pilih sumber pemasukan terlebih dahulu.'
      );
      return;
    }
    if (!trimmedTitle) {
      setFormError('Isi nama atau keterangan singkat transaksi.');
      return;
    }
    if (!date) {
      setFormError('Tanggal transaksi wajib diisi.');
      return;
    }

    onSaveTransaction(
      {
        date,
        type,
        title: trimmedTitle,
        category,
        amount: parsedAmount,
        method,
        status,
        notes: notes.trim() || undefined,
      },
      editingTransaction?.id
    );
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-tx-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-2xl">
        {/* Drag Handle (Mobile) */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <div className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4">
          <div>
            <h2
              id="quick-tx-modal-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              {editingTransaction ? 'Edit Transaksi' : 'Catat Transaksi Cepat'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Sekali ketuk untuk perbarui sisa uang saku bulan ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal catat transaksi"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 sm:space-y-4 sm:p-6" noValidate>
          {/* Toggle Besar Pengeluaran | Pemasukan */}
          <div
            className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5"
            role="group"
            aria-label="Jenis transaksi"
          >
            <button
              type="button"
              onClick={() => handleToggleType('expense')}
              aria-pressed={type === 'expense'}
              className={`min-h-[46px] whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => handleToggleType('income')}
              aria-pressed={type === 'income'}
              className={`min-h-[46px] whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pemasukan
            </button>
          </div>

          {/* Input Nominal Besar */}
          <div>
            <label
              htmlFor="quick-tx-amount-input"
              className="block text-xs font-semibold text-slate-600"
            >
              Nominal
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-lg font-semibold text-slate-400">
                Rp
              </span>
              <input
                id="quick-tx-amount-input"
                type="text"
                inputMode="numeric"
                value={amountText}
                onChange={(e) => {
                  setAmountText(formatInputThousands(e.target.value));
                  if (formError) setFormError(null);
                }}
                placeholder="0"
                className="min-h-[54px] w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-12 pr-4 font-mono text-2xl font-bold text-slate-900 tabular-nums placeholder:text-slate-300 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 sm:text-3xl"
              />
            </div>
          </div>

          {/* Grid Pilihan Kategori Ramah Jempol */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                {type === 'expense' ? 'Pilih Kategori Budget' : 'Pilih Sumber Pemasukan'}
              </span>
              {type === 'income' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddSource((prev) => !prev);
                    setQuickSourceError(null);
                  }}
                  className="min-h-[32px] text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {showQuickAddSource ? 'Tutup' : '+ Tambah Sumber'}
                </button>
              )}
            </div>

            {availableCategories.length > 0 ? (
              <div
                className="mt-2 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label={type === 'expense' ? 'Kategori Budget' : 'Sumber Pemasukan'}
              >
                {availableCategories.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setCategory(cat);
                        if (formError) setFormError(null);
                      }}
                      className={`flex min-h-[46px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
                        isSelected
                          ? type === 'expense'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <CategoryIcon
                        category={cat}
                        type={type}
                        size="sm"
                        inverted={isSelected}
                      />
                      <span className="line-clamp-2 flex-1 leading-tight">{cat}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-600">
                  {type === 'expense'
                    ? 'Belum ada kategori pengeluaran di Budget.'
                    : 'Belum ada sumber pemasukan tersimpan.'}
                </p>
                {type === 'expense' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToBudget();
                    }}
                    className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    + Buat Kategori Budget Dulu
                  </button>
                )}
              </div>
            )}

            {type === 'income' && showQuickAddSource && (
              <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <label
                  htmlFor="modal-quick-income-source"
                  className="block text-xs font-semibold text-emerald-900"
                >
                  Nama Sumber Pemasukan Baru
                </label>
                <div className="flex gap-2">
                  <input
                    id="modal-quick-income-source"
                    type="text"
                    value={quickSourceName}
                    onChange={(e) => {
                      setQuickSourceName(e.target.value);
                      if (quickSourceError) setQuickSourceError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickCreateIncomeSource();
                      }
                    }}
                    placeholder="Contoh: Asisten Lab / Endorse"
                    className="min-h-[42px] flex-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateIncomeSource}
                    className="min-h-[42px] whitespace-nowrap rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Simpan
                  </button>
                </div>
                {quickSourceError && (
                  <p className="text-xs font-medium text-rose-700" role="alert">
                    {quickSourceError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Keterangan / Judul Transaksi */}
          <div>
            <label
              htmlFor="quick-tx-title-input"
              className="block text-xs font-semibold text-slate-600"
            >
              Judul / Catatan Transaksi
            </label>
            <input
              id="quick-tx-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder={
                type === 'expense'
                  ? 'Contoh: Makan Siang Warteg & Es Teh'
                  : 'Contoh: Kiriman Uang Saku Bulanan'
              }
              className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Tanggal & Metode Pembayaran */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="quick-tx-date-input"
                className="block text-xs font-semibold text-slate-600"
              >
                Tanggal
              </label>
              <input
                id="quick-tx-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="quick-tx-method-select"
                className="block text-xs font-semibold text-slate-600"
              >
                Metode Pembayaran
              </label>
              <select
                id="quick-tx-method-select"
                value={method}
                onChange={(e) => setMethod(e.target.value as TransactionMethod)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
              role="alert"
            >
              {formError}
            </p>
          )}

          {/* Submit CTA */}
          <div className="pt-1">
            <button
              type="submit"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              {editingTransaction ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Simpan Transaksi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
