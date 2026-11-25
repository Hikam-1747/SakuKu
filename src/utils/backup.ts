import type {
  BackupPayload,
  BusinessProfile,
  IncomeSourceItem,
  RabItem,
  TransactionItem,
  TransactionMethod,
} from '../types/finance';
import { normalizeBusinessProfile } from './finance';

function normalizeMethod(raw: unknown): TransactionMethod {
  if (
    raw === 'QRIS / E-Wallet' ||
    raw === 'Transfer Bank' ||
    raw === 'Tunai / Dompet' ||
    raw === 'PayLater / Cicilan'
  ) {
    return raw;
  }
  // Map legacy method strings cleanly
  if (raw === 'QRIS / Virtual Account') return 'QRIS / E-Wallet';
  if (raw === 'Tunai / Kas Kecil') return 'Tunai / Dompet';
  if (raw === 'Giro / Tempo') return 'PayLater / Cicilan';
  return 'QRIS / E-Wallet';
}

export function createBackupPayload(
  rabItems: RabItem[],
  transactions: TransactionItem[],
  incomeSources: IncomeSourceItem[] = [],
  businessProfile?: BusinessProfile
): BackupPayload {
  return {
    app: 'SakuKu',
    version: 2,
    exportedAt: new Date().toISOString(),
    ...(businessProfile
      ? { businessProfile: normalizeBusinessProfile(businessProfile) }
      : {}),
    rabItems,
    incomeSources,
    transactions,
  };
}

export function parseAndValidateBackup(rawJson: string):
  | {
      ok: true;
      businessProfile: BusinessProfile | null;
      rabItems: RabItem[];
      incomeSources: IncomeSourceItem[] | null;
      transactions: TransactionItem[];
    }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      error: 'File tidak berformat JSON yang valid.',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: 'Struktur file backup tidak dikenali.',
    };
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.rabItems) || !Array.isArray(record.transactions)) {
    return {
      ok: false,
      error: 'File backup harus memuat array "rabItems" dan "transactions".',
    };
  }

  let validProfile: BusinessProfile | null = null;
  if (record.businessProfile !== undefined) {
    if (!record.businessProfile || typeof record.businessProfile !== 'object') {
      return {
        ok: false,
        error: 'Format profil dalam file backup tidak valid.',
      };
    }
    const p = record.businessProfile as Record<string, unknown>;
    validProfile = normalizeBusinessProfile({
      businessName: typeof p.businessName === 'string' ? p.businessName : '',
      tagline: typeof p.tagline === 'string' ? p.tagline : '',
      addressContact:
        typeof p.addressContact === 'string' ? p.addressContact : '',
      logoDataUrl: typeof p.logoDataUrl === 'string' ? p.logoDataUrl : null,
    });
  }

  const validRab: RabItem[] = [];
  for (const item of record.rabItems) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Terdapat item kategori budget yang tidak valid.' };
    }
    const r = item as Record<string, unknown>;
    if (
      typeof r.id !== 'string' ||
      typeof r.category !== 'string' ||
      !r.category.trim() ||
      typeof r.allocated !== 'number' ||
      !Number.isFinite(r.allocated) ||
      r.allocated < 0
    ) {
      return {
        ok: false,
        error: 'Format data Kategori Budget dalam file backup tidak valid.',
      };
    }
    validRab.push({
      id: r.id,
      category: r.category.trim(),
      allocated: Math.round(r.allocated),
      notes: typeof r.notes === 'string' ? r.notes : '',
      createdAt:
        typeof r.createdAt === 'string'
          ? r.createdAt
          : new Date().toISOString().slice(0, 10),
    });
  }

  let validIncomeSources: IncomeSourceItem[] | null = null;
  if (record.incomeSources !== undefined) {
    if (!Array.isArray(record.incomeSources)) {
      return {
        ok: false,
        error: 'Format daftar sumber pemasukan dalam file backup tidak valid.',
      };
    }
    validIncomeSources = [];
    for (const item of record.incomeSources) {
      if (!item || typeof item !== 'object') {
        return {
          ok: false,
          error: 'Terdapat item sumber pemasukan yang tidak valid.',
        };
      }
      const s = item as Record<string, unknown>;
      if (
        typeof s.id !== 'string' ||
        typeof s.name !== 'string' ||
        !s.name.trim()
      ) {
        return {
          ok: false,
          error: 'Format data sumber pemasukan dalam file backup tidak valid.',
        };
      }
      validIncomeSources.push({
        id: s.id,
        name: s.name.trim(),
        notes: typeof s.notes === 'string' ? s.notes : '',
        createdAt:
          typeof s.createdAt === 'string'
            ? s.createdAt
            : new Date().toISOString().slice(0, 10),
      });
    }
  }

  const validTx: TransactionItem[] = [];
  for (const item of record.transactions) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Terdapat item transaksi yang tidak valid.' };
    }
    const t = item as Record<string, unknown>;
    if (
      typeof t.id !== 'string' ||
      typeof t.date !== 'string' ||
      (t.type !== 'income' && t.type !== 'expense') ||
      typeof t.title !== 'string' ||
      !t.title.trim() ||
      typeof t.category !== 'string' ||
      typeof t.amount !== 'number' ||
      !Number.isFinite(t.amount) ||
      t.amount <= 0
    ) {
      return {
        ok: false,
        error: 'Format data transaksi dalam file backup tidak valid.',
      };
    }

    validTx.push({
      id: t.id,
      date: t.date,
      type: t.type,
      title: t.title.trim(),
      category: t.category,
      amount: Math.round(t.amount),
      method: normalizeMethod(t.method),
      status: t.status === 'Pending' ? 'Pending' : 'Lunas',
      notes: typeof t.notes === 'string' ? t.notes : undefined,
    });
  }

  return {
    ok: true,
    businessProfile: validProfile,
    rabItems: validRab,
    incomeSources: validIncomeSources,
    transactions: validTx,
  };
}
