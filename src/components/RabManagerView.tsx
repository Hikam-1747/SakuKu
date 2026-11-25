import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type {
  IncomeSourceItem,
  IncomeSourceMetric,
  RabItem,
  RabMetric,
} from '../types/finance';
import {
  formatCompactRupiah,
  formatInputThousands,
  formatRupiah,
  parseRupiahInput,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';
import { RabStatusLabel } from './StatusLabel';

interface RabManagerViewProps {
  rabMetrics: RabMetric[];
  incomeSourceMetrics: IncomeSourceMetric[];
  activeMonthLabel?: string;
  initialSubTab?: 'rab' | 'income';
  onSaveRab: (
    data: { category: string; allocated: number; notes: string },
    editingId?: string
  ) => { ok: boolean; error?: string };
  onDeleteRab: (id: string) => void;
  onSaveIncomeSource: (
    data: { name: string; notes: string },
    editingId?: string
  ) => { ok: boolean; error?: string };
  onDeleteIncomeSource: (id: string) => void;
}

export function RabManagerView({
  rabMetrics,
  incomeSourceMetrics,
  activeMonthLabel,
  initialSubTab = 'rab',
  onSaveRab,
  onDeleteRab,
  onSaveIncomeSource,
  onDeleteIncomeSource,
}: RabManagerViewProps) {
  const [subTab, setSubTab] = useState<'rab' | 'income'>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Budget Category Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [allocatedText, setAllocatedText] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Income Source Form State
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceNotes, setSourceNotes] = useState('');
  const [sourceError, setSourceError] = useState<string | null>(null);

  const totalAllocated = rabMetrics.reduce((s, r) => s + r.allocated, 0);
  const totalSpent = rabMetrics.reduce((s, r) => s + r.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;

  const totalIncomeReceived = incomeSourceMetrics.reduce(
    (s, item) => s + item.totalReceived,
    0
  );
  const totalIncomeTxCount = incomeSourceMetrics.reduce(
    (s, item) => s + item.txCount,
    0
  );

  function resetForm() {
    setEditingId(null);
    setCategory('');
    setAllocatedText('');
    setNotes('');
    setFormError(null);
  }

  function resetSourceForm() {
    setEditingSourceId(null);
    setSourceName('');
    setSourceNotes('');
    setSourceError(null);
  }

  function handleStartEdit(item: RabItem) {
    setEditingId(item.id);
    setCategory(item.category);
    setAllocatedText(formatInputThousands(String(item.allocated)));
    setNotes(item.notes);
    setFormError(null);
  }

  function handleStartEditSource(item: IncomeSourceItem) {
    setEditingSourceId(item.id);
    setSourceName(item.name);
    setSourceNotes(item.notes);
    setSourceError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedCategory = category.trim();
    const parsedAllocated = parseRupiahInput(allocatedText);

    if (!trimmedCategory) {
      setFormError('Nama kategori budget wajib diisi.');
      return;
    }
    if (parsedAllocated <= 0) {
      setFormError('Jatah anggaran bulanan harus lebih besar dari Rp 0.');
      return;
    }

    const res = onSaveRab(
      {
        category: trimmedCategory,
        allocated: parsedAllocated,
        notes: notes.trim(),
      },
      editingId ?? undefined
    );

    if (!res.ok) {
      setFormError(res.error ?? 'Gagal menyimpan kategori budget.');
      return;
    }

    resetForm();
  }

  function handleSubmitSource(e: FormEvent) {
    e.preventDefault();
    const trimmedName = sourceName.trim();
    if (!trimmedName) {
      setSourceError('Nama sumber pemasukan wajib diisi.');
      return;
    }

    const res = onSaveIncomeSource(
      {
        name: trimmedName,
        notes: sourceNotes.trim(),
      },
      editingSourceId ?? undefined
    );

    if (!res.ok) {
      setSourceError(res.error ?? 'Gagal menyimpan sumber pemasukan.');
      return;
    }

    resetSourceForm();
  }

  return (
    <div className="space-y-5">
      {/* Sub-Tab Header: Jatah Pengeluaran | Sumber Pemasukan */}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Atur Budget &amp; Pemasukan
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Sesuaikan jatah pengeluaran bulanan dan daftar sumber uang masukmu secara custom.
          </p>
        </div>
        <div
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl bg-slate-100 p-1"
          role="tablist"
          aria-label="Pilihan pengelolaan budget"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'rab'}
            onClick={() => setSubTab('rab')}
            className={`min-h-[40px] whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              subTab === 'rab'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jatah Pengeluaran ({rabMetrics.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'income'}
            onClick={() => setSubTab('income')}
            className={`min-h-[40px] whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              subTab === 'income'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sumber Pemasukan ({incomeSourceMetrics.length})
          </button>
        </div>
      </section>

      {subTab === 'rab' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Form Tambah / Edit Jatah Pengeluaran */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-4 lg:self-start">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingId ? 'Edit Jatah Pengeluaran' : 'Tambah Jatah Pengeluaran'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Tentukan batas anggaran per bulan supaya jajan dan kebutuhan kos tetap aman.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="rab-category-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nama Kategori
                </label>
                <input
                  id="rab-category-input"
                  type="text"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Contoh: Paket Data & Pulsa"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label
                  htmlFor="rab-allocated-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Jatah Anggaran / Bulan (Rp)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-mono text-xs font-medium text-slate-500">
                    Rp
                  </span>
                  <input
                    id="rab-allocated-input"
                    type="text"
                    inputMode="numeric"
                    value={allocatedText}
                    onChange={(e) => {
                      setAllocatedText(formatInputThousands(e.target.value));
                      if (formError) setFormError(null);
                    }}
                    placeholder="500.000"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 font-mono text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="rab-notes-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Catatan (Opsional)
                </label>
                <textarea
                  id="rab-notes-input"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Kuota bulanan, galon, atau kebutuhan kos..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {formError && (
                <p
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                  role="alert"
                >
                  {formError}
                </p>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {editingId ? 'Simpan Perubahan' : 'Simpan Kategori'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="min-h-[44px] whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Daftar Jatah Pengeluaran */}
          <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm lg:col-span-8">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Daftar Jatah Pengeluaran Bulanan
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeMonthLabel
                    ? `Pemakaian ${activeMonthLabel} dibandingkan jatah anggaran per kategori.`
                    : 'Pemakaian dihitung otomatis dari transaksi pengeluaran.'}
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                Total: {formatCompactRupiah(totalAllocated)}
              </span>
            </div>

            {rabMetrics.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {rabMetrics.map((item) => {
                    const barColor =
                      item.status === 'Over-Budget'
                        ? 'bg-rose-500'
                        : item.status === 'Mendekati Limit'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500';
                    const clampedWidth = Math.min(item.utilizationPct, 100);

                    return (
                      <article key={item.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <CategoryIcon category={item.category} type="expense" size="sm" />
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-slate-900">
                                {item.category}
                              </h4>
                              {item.notes && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <RabStatusLabel status={item.status} />
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${clampedWidth}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className="text-slate-600">
                            {item.remaining >= 0
                              ? `Sisa ${formatCompactRupiah(item.remaining)} dari ${formatCompactRupiah(item.allocated)}`
                              : `Lebih ${formatCompactRupiah(Math.abs(item.remaining))} dari ${formatCompactRupiah(item.allocated)}`}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              aria-label={`Edit kategori budget ${item.category}`}
                              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingId === item.id) resetForm();
                                onDeleteRab(item.id);
                              }}
                              aria-label={`Hapus kategori budget ${item.category}`}
                              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-600">
                        <th className="py-3.5 pl-6 pr-3">Kategori</th>
                        <th className="px-3 py-3.5 text-right">Jatah Anggaran</th>
                        <th className="px-3 py-3.5 text-right">Terpakai</th>
                        <th className="px-3 py-3.5 text-right">Sisa Jatah</th>
                        <th className="px-3 py-3.5">Status</th>
                        <th className="py-3.5 pl-2 pr-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rabMetrics.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="max-w-[220px] py-3.5 pl-6 pr-3 align-top">
                            <div className="flex items-start gap-2.5">
                              <CategoryIcon category={item.category} type="expense" size="sm" />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{item.category}</p>
                                {item.notes && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right align-top font-mono text-xs font-medium text-slate-900 tabular-nums">
                            {formatRupiah(item.allocated)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right align-top font-mono text-xs text-slate-700 tabular-nums">
                            <div>{formatRupiah(item.spent)}</div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {item.utilizationPct.toFixed(0)}%
                            </div>
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-3.5 text-right align-top font-mono text-xs font-semibold tabular-nums ${
                              item.remaining < 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {formatRupiah(item.remaining)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 align-top">
                            <RabStatusLabel status={item.status} />
                          </td>
                          <td className="whitespace-nowrap py-3.5 pl-2 pr-6 text-right align-top">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                aria-label={`Edit kategori budget ${item.category}`}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingId === item.id) resetForm();
                                  onDeleteRab(item.id);
                                }}
                                aria-label={`Hapus kategori budget ${item.category}`}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50/70 font-semibold text-slate-900">
                        <td className="py-3.5 pl-6 pr-3 text-xs">Total Budget Bulanan</td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs tabular-nums">
                          {formatRupiah(totalAllocated)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs tabular-nums">
                          {formatRupiah(totalSpent)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs tabular-nums ${
                            totalRemaining < 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {formatRupiah(totalRemaining)}
                        </td>
                        <td colSpan={2} className="py-3.5 pl-2 pr-6" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Belum ada kategori jatah pengeluaran
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tambahkan kategori pertamamu melalui formulir di samping.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Form Tambah / Edit Sumber Pemasukan */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-4 lg:self-start">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingSourceId ? 'Edit Sumber Pemasukan' : 'Tambah Sumber Pemasukan'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Sumber ini otomatis muncul di pop-up catat transaksi saat kamu memilih Pemasukan.
              </p>
            </div>

            <form onSubmit={handleSubmitSource} className="mt-5 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="income-source-name-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nama Sumber Pemasukan
                </label>
                <input
                  id="income-source-name-input"
                  type="text"
                  value={sourceName}
                  onChange={(e) => {
                    setSourceName(e.target.value);
                    if (sourceError) setSourceError(null);
                  }}
                  placeholder="Contoh: Asisten Lab / Endorse"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label
                  htmlFor="income-source-notes-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Keterangan (Opsional)
                </label>
                <textarea
                  id="income-source-notes-input"
                  rows={2}
                  value={sourceNotes}
                  onChange={(e) => setSourceNotes(e.target.value)}
                  placeholder="Misal: Honor asisten praktikum atau kiriman bulanan..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {sourceError && (
                <p
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                  role="alert"
                >
                  {sourceError}
                </p>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {editingSourceId ? 'Simpan Perubahan' : 'Simpan Sumber'}
                </button>
                {editingSourceId && (
                  <button
                    type="button"
                    onClick={resetSourceForm}
                    className="min-h-[44px] whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Daftar Sumber Pemasukan */}
          <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm lg:col-span-8">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Daftar Sumber Pemasukan
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Akumulasi seluruh pemasukan yang masuk per sumber.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                Total: {formatCompactRupiah(totalIncomeReceived)}
              </span>
            </div>

            {incomeSourceMetrics.length > 0 ? (
              <>
                <div className="divide-y divide-slate-100 md:hidden">
                  {incomeSourceMetrics.map((item) => (
                    <article key={item.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <CategoryIcon category={item.name} type="income" size="sm" />
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-slate-900">
                              {item.name}
                            </h4>
                            {item.notes && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                          {item.sharePct.toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="font-mono font-semibold text-emerald-700">
                          {formatRupiah(item.totalReceived)} ({item.txCount}x)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditSource(item)}
                            aria-label={`Edit sumber pemasukan ${item.name}`}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (editingSourceId === item.id) resetSourceForm();
                              onDeleteIncomeSource(item.id);
                            }}
                            aria-label={`Hapus sumber pemasukan ${item.name}`}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-600">
                        <th className="py-3.5 pl-6 pr-3">Sumber Pemasukan</th>
                        <th className="px-3 py-3.5 text-right">Transaksi</th>
                        <th className="px-3 py-3.5 text-right">Total Pemasukan</th>
                        <th className="px-3 py-3.5 text-right">Proporsi</th>
                        <th className="py-3.5 pl-2 pr-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incomeSourceMetrics.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="max-w-[260px] py-3.5 pl-6 pr-3 align-top">
                            <div className="flex items-start gap-2.5">
                              <CategoryIcon category={item.name} type="income" size="sm" />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                {item.notes && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right align-top font-mono text-xs text-slate-700 tabular-nums">
                            {item.txCount}x
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right align-top font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                            {formatRupiah(item.totalReceived)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right align-top font-mono text-xs text-slate-700 tabular-nums">
                            {item.sharePct.toFixed(1)}%
                          </td>
                          <td className="whitespace-nowrap py-3.5 pl-2 pr-6 text-right align-top">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditSource(item)}
                                aria-label={`Edit sumber pemasukan ${item.name}`}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingSourceId === item.id) resetSourceForm();
                                  onDeleteIncomeSource(item.id);
                                }}
                                aria-label={`Hapus sumber pemasukan ${item.name}`}
                                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50/70 font-semibold text-slate-900">
                        <td className="py-3.5 pl-6 pr-3 text-xs">
                          Total Pemasukan Terkategori
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs tabular-nums">
                          {totalIncomeTxCount}x
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs text-emerald-700 tabular-nums">
                          {formatRupiah(totalIncomeReceived)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs tabular-nums">
                          {totalIncomeReceived > 0 ? '100.0%' : '0.0%'}
                        </td>
                        <td className="py-3.5 pl-2 pr-6" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Belum ada sumber pemasukan
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tambahkan sumber uang masukmu melalui formulir di samping.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
