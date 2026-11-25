import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/finance';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 pl-8 sm:right-5 sm:pl-0 lg:bottom-5"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone =
          toast.variant === 'warning'
            ? {
                wrapper: 'border-amber-300 bg-amber-50 text-amber-950',
                icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />,
              }
            : toast.variant === 'error'
              ? {
                  wrapper: 'border-red-300 bg-red-50 text-red-950',
                  icon: <AlertOctagon className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />,
                }
              : toast.variant === 'info'
                ? {
                    wrapper: 'border-blue-300 bg-blue-50 text-blue-950',
                    icon: <Info className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />,
                  }
                : {
                    wrapper: 'border-emerald-300 bg-emerald-50 text-emerald-950',
                    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />,
                  };

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${tone.wrapper}`}
          >
            <div className="mt-0.5">{tone.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs leading-relaxed opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Tutup notifikasi ${toast.title}`}
              className="rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
