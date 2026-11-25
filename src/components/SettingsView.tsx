import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Database,
  Download,
  HardDriveDownload,
  ImagePlus,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import type {
  BusinessProfile,
  IncomeSourceItem,
  RabItem,
  TransactionItem,
} from '../types/finance';
import { createBackupPayload, parseAndValidateBackup } from '../utils/backup';
import {
  normalizeBusinessProfile,
  validateLogoFileMetadata,
} from '../utils/finance';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  businessProfile: BusinessProfile;
  rabItems: RabItem[];
  incomeSources: IncomeSourceItem[];
  transactions: TransactionItem[];
  onSaveBusinessProfile: (profile: BusinessProfile) => void;
  onRestoreBackup: (
    rabItems: RabItem[],
    transactions: TransactionItem[],
    incomeSources: IncomeSourceItem[] | null,
    businessProfile: BusinessProfile | null
  ) => void;
  onRestoreError: (error: string) => void;
  onBackupSuccess: () => void;
  onLoadDemo: () => void;
  onResetData: () => void;
}

function readAndCompressLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        reject(new Error('File gambar kosong atau rusak.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('File gambar tidak dapat diproses.'));
      img.onload = () => {
        const maxDim = 256;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outputMime =
          file.type === 'image/jpeg' || file.type === 'image/jpg'
            ? 'image/jpeg'
            : 'image/png';
        resolve(canvas.toDataURL(outputMime, 0.9));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function SettingsView({
  businessProfile,
  rabItems,
  incomeSources,
  transactions,
  onSaveBusinessProfile,
  onRestoreBackup,
  onRestoreError,
  onBackupSuccess,
  onLoadDemo,
  onResetData,
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [userName, setUserName] = useState(businessProfile.userName ?? 'Sobat Kos');
  const [businessName, setBusinessName] = useState(businessProfile.businessName);
  const [tagline, setTagline] = useState(businessProfile.tagline);
  const [addressContact, setAddressContact] = useState(
    businessProfile.addressContact
  );
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(
    businessProfile.logoDataUrl
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  useEffect(() => {
    setUserName(businessProfile.userName ?? 'Sobat Kos');
    setBusinessName(businessProfile.businessName);
    setTagline(businessProfile.tagline);
    setAddressContact(businessProfile.addressContact);
    setLogoDataUrl(businessProfile.logoDataUrl);
  }, [businessProfile]);

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLogoError(null);
    const check = validateLogoFileMetadata(file.type, file.size);
    if (!check.ok) {
      setLogoError(check.error);
      return;
    }

    setIsProcessingLogo(true);
    try {
      const dataUrl = await readAndCompressLogo(file);
      setLogoDataUrl(dataUrl);
    } catch (err: unknown) {
      setLogoError(
        err instanceof Error ? err.message : 'Gagal memproses foto profil.'
      );
    } finally {
      setIsProcessingLogo(false);
    }
  }

  function handleSaveProfileSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedUser = userName.trim();
    const trimmedApp = businessName.trim();
    if (!trimmedUser) {
      setProfileError('Nama panggilan pengguna wajib diisi untuk sapaan di Beranda.');
      return;
    }
    setProfileError(null);
    onSaveBusinessProfile(
      normalizeBusinessProfile({
        businessName: trimmedApp || 'SakuKu',
        userName: trimmedUser,
        tagline,
        addressContact,
        logoDataUrl,
      })
    );
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

  function handleRestoreChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const result = parseAndValidateBackup(content);
      if (!result.ok) {
        onRestoreError(result.error);
        return;
      }
      onRestoreBackup(
        result.rabItems,
        result.transactions,
        result.incomeSources,
        result.businessProfile
      );
    };
    reader.onerror = () => {
      onRestoreError('Gagal membaca file backup dari perangkatmu.');
    };
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Profil Nama Pengguna */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Profil Pengguna
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Atur nama panggilan untuk sapaan di Beranda serta identitas untuk laporan PDF.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfileSubmit} className="mt-5 space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* Foto Profil */}
            <div className="md:col-span-4">
              <span className="block text-xs font-semibold text-slate-700">
                Foto Profil (Opsional)
              </span>
              <div className="mt-2 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center">
                {logoDataUrl ? (
                  <img
                    src={logoDataUrl}
                    alt="Pratinjau foto profil"
                    className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
                    <UserRound className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload foto profil"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {isProcessingLogo
                      ? 'Memproses...'
                      : logoDataUrl
                        ? 'Ganti Foto'
                        : 'Unggah Foto'}
                  </button>

                  {logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoDataUrl(null);
                        setLogoError(null);
                      }}
                      className="inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Hapus
                    </button>
                  )}
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                  JPG, PNG, atau WebP (maks. 2 MB)
                </p>

                {logoError && (
                  <p className="mt-2 text-xs font-medium text-rose-700" role="alert">
                    {logoError}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4 md:col-span-8">
              <div>
                <label
                  htmlFor="profile-user-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nama Panggilan (Tampil di Sapaan Beranda)
                </label>
                <input
                  id="profile-user-name"
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    if (profileError) setProfileError(null);
                  }}
                  placeholder="Contoh: Rizky"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-business-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nama Saku / Header Laporan PDF
                </label>
                <input
                  id="profile-business-name"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Contoh: SakuKu"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-tagline"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Kampus / Jurusan (Opsional)
                  </label>
                  <input
                    id="profile-tagline"
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Contoh: Informatika Semester 5"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-address"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Alamat Kos / Kontak (Opsional)
                  </label>
                  <input
                    id="profile-address"
                    type="text"
                    value={addressContact}
                    onChange={(e) => setAddressContact(e.target.value)}
                    placeholder="Contoh: Kos Melati · 0812-3456"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {profileError && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              role="alert"
            >
              {profileError}
            </p>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Simpan Profil
            </button>
          </div>
        </form>
      </section>

      {/* Backup & Restore Data (.json) */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <HardDriveDownload className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Backup &amp; Restore Data (.json)
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Simpan seluruh profil, Budget, Sumber Pemasukan, dan Riwayat Transaksi ke file JSON
              lokal agar aman saat pindah perangkat.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Cadangkan Data Saat Ini
            </p>
            <p className="mt-1 text-xs text-slate-600 tabular-nums">
              {rabItems.length} Kategori Budget · {incomeSources.length} Sumber Pemasukan ·{' '}
              {transactions.length} Transaksi.
            </p>
            <button
              type="button"
              onClick={handleBackupJson}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              Backup Data (.json)
            </button>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Pulihkan dari File Backup
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Pilih file <span className="font-mono">.json</span> hasil ekspor SakuKu sebelumnya.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Pilih file backup JSON untuk restore data"
              onChange={handleRestoreChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
            >
              <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
              Restore Data
            </button>
          </div>
        </div>
      </section>

      {/* Info Mode Offline & PWA */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Mode Offline &amp; Aplikasi Home Screen (PWA)
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Data tersimpan aman secara lokal di perangkatmu (LocalStorage) dengan Service Worker
              aktif sehingga tetap lancar dipakai tanpa kuota internet.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-emerald-700">
            Status penyimpanan lokal: Siap digunakan offline
          </p>
          <PWAInstallButton showGuideFallback />
        </div>
      </section>

      {/* Data Contoh / Reset */}
      <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-display text-base font-bold text-slate-900">
            Data Contoh &amp; Reset
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Muat ulang data contoh mahasiswa (Sep–Nov 2026) atau bersihkan seluruh catatan.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onLoadDemo}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            <Database className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            Muat Data Contoh
          </button>
          <button
            type="button"
            onClick={onResetData}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset Data
          </button>
        </div>
      </section>
    </div>
  );
}
