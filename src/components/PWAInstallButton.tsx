import { useState } from 'react';
import { CheckCircle2, Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  showGuideFallback?: boolean;
}

export function PWAInstallButton({
  compact = false,
  showGuideFallback = false,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    if (!showGuideFallback) return null;
    return (
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Aplikasi sudah terinstal di perangkat ini</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 font-semibold text-white transition-colors hover:bg-blue-700 ${
          compact ? 'min-h-[40px] px-3 py-2 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Install Aplikasi</span>
      </button>
    );
  }

  if (isIOS || showGuideFallback) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${
            compact ? 'min-h-[40px] px-3 py-2 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
          }`}
        >
          <Smartphone className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <span>{isIOS ? 'Install di iPhone / iPad' : 'Panduan Install Home Screen'}</span>
        </button>

        {showGuideModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-guide-title"
          >
            <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    id="pwa-guide-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    Tambahkan SakuKu ke Home Screen
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Buka catatan uang sakumu satu sentuhan tanpa koneksi internet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  aria-label="Tutup panduan instalasi"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <p className="font-semibold text-slate-900">Android (Chrome / Edge)</p>
                  <p className="mt-1">
                    Ketuk menu browser (ikon tiga titik di kanan atas), lalu pilih{' '}
                    <strong>Install app</strong> atau <strong>Add to Home screen</strong>.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <p className="font-semibold text-slate-900">iOS (Safari)</p>
                  <p className="mt-1">
                    Ketuk tombol <strong>Share</strong> di bilah bawah Safari, gulir ke bawah,
                    lalu pilih <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="mt-5 min-h-[44px] w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
