import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900"
      role="status"
    >
      <div className="mx-auto flex max-w-[1360px] items-center justify-center gap-2">
        <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
        <span>
          Mode Offline aktif — seluruh catatan Budget Bulanan dan Transaksi tetap berjalan penuh dari penyimpanan lokal.
        </span>
      </div>
    </div>
  );
}
