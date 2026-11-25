import { AlertOctagon, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { RabStatus, TransactionStatus } from '../types/finance';

export function RabStatusLabel({ status }: { status: RabStatus }) {
  if (status === 'Over-Budget') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-red-700">
        <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />
        Over-Budget
      </span>
    );
  }
  if (status === 'Mendekati Limit') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
        Mendekati Limit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
      Aman
    </span>
  );
}

export function TxStatusLabel({ status }: { status: TransactionStatus }) {
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-amber-700">
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
      Lunas
    </span>
  );
}
