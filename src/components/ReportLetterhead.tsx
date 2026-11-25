import { UserRound } from 'lucide-react';
import type { BusinessProfile } from '../types/finance';

interface ReportLetterheadProps {
  profile: BusinessProfile;
  documentTitle: string;
  subtitle?: string;
}

export function ReportLetterhead({
  profile,
  documentTitle,
  subtitle,
}: ReportLetterheadProps) {
  const printedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <section
      aria-label="Header Laporan SakuKu"
      data-testid="report-letterhead"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:px-6 sm:py-5 print:rounded-none print:border-x-0 print:border-t-0 print:border-b-2 print:border-slate-900 print:px-0 print:pb-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5 sm:items-center">
          {profile.logoDataUrl ? (
            <img
              src={profile.logoDataUrl}
              alt={`Foto profil ${profile.businessName}`}
              className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1 sm:h-14 sm:w-14"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 sm:h-14 sm:w-14">
              <UserRound className="h-6 w-6" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {profile.businessName}
            </h2>
            {profile.tagline && (
              <p className="mt-0.5 text-xs font-medium text-blue-700">
                {profile.tagline}
              </p>
            )}
            {profile.addressContact && (
              <p className="mt-0.5 text-xs text-slate-500">
                {profile.addressContact}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            {documentTitle}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            Dicetak: {printedDate}
          </p>
        </div>
      </div>
    </section>
  );
}
