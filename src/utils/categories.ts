import type { TransactionType } from '../types/finance';

export type CategoryIconKey =
  | 'food'
  | 'home'
  | 'transport'
  | 'study'
  | 'coffee'
  | 'savings'
  | 'wallet'
  | 'laptop'
  | 'scholarship'
  | 'shop'
  | 'health'
  | 'phone'
  | 'tag';

export interface CategoryVisual {
  iconKey: CategoryIconKey;
  bgClass: string;
  textClass: string;
}

export function getCategoryVisual(
  category: string,
  type: TransactionType = 'expense'
): CategoryVisual {
  const lower = category.trim().toLowerCase();

  if (type === 'income') {
    if (lower.includes('uang saku') || lower.includes('kiriman') || lower.includes('ortu')) {
      return {
        iconKey: 'wallet',
        bgClass: 'bg-emerald-100/80',
        textClass: 'text-emerald-700',
      };
    }
    if (lower.includes('freelance') || lower.includes('project') || lower.includes('asisten')) {
      return {
        iconKey: 'laptop',
        bgClass: 'bg-teal-100/80',
        textClass: 'text-teal-700',
      };
    }
    if (lower.includes('beasiswa') || lower.includes('ukt')) {
      return {
        iconKey: 'scholarship',
        bgClass: 'bg-indigo-100/80',
        textClass: 'text-indigo-700',
      };
    }
    if (lower.includes('jualan') || lower.includes('bisnis') || lower.includes('toko')) {
      return {
        iconKey: 'shop',
        bgClass: 'bg-green-100/80',
        textClass: 'text-green-700',
      };
    }
    return {
      iconKey: 'wallet',
      bgClass: 'bg-emerald-100/80',
      textClass: 'text-emerald-700',
    };
  }

  if (lower.includes('makan') || lower.includes('minum') || lower.includes('galon')) {
    return {
      iconKey: 'food',
      bgClass: 'bg-orange-100/80',
      textClass: 'text-orange-700',
    };
  }
  if (lower.includes('kos') || lower.includes('listrik') || lower.includes('sewa') || lower.includes('wifi')) {
    return {
      iconKey: 'home',
      bgClass: 'bg-indigo-100/80',
      textClass: 'text-indigo-700',
    };
  }
  if (lower.includes('bensin') || lower.includes('transport') || lower.includes('ojek') || lower.includes('parkir')) {
    return {
      iconKey: 'transport',
      bgClass: 'bg-sky-100/80',
      textClass: 'text-sky-700',
    };
  }
  if (lower.includes('tugas') || lower.includes('print') || lower.includes('buku') || lower.includes('kuliah')) {
    return {
      iconKey: 'study',
      bgClass: 'bg-violet-100/80',
      textClass: 'text-violet-700',
    };
  }
  if (lower.includes('nongkrong') || lower.includes('kopi') || lower.includes('jajan') || lower.includes('hiburan')) {
    return {
      iconKey: 'coffee',
      bgClass: 'bg-rose-100/80',
      textClass: 'text-rose-700',
    };
  }
  if (lower.includes('tabungan') || lower.includes('darurat') || lower.includes('investasi')) {
    return {
      iconKey: 'savings',
      bgClass: 'bg-emerald-100/80',
      textClass: 'text-emerald-700',
    };
  }
  if (lower.includes('kuota') || lower.includes('data') || lower.includes('pulsa') || lower.includes('internet')) {
    return {
      iconKey: 'phone',
      bgClass: 'bg-cyan-100/80',
      textClass: 'text-cyan-700',
    };
  }
  if (lower.includes('sehat') || lower.includes('obat') || lower.includes('laundry')) {
    return {
      iconKey: 'health',
      bgClass: 'bg-teal-100/80',
      textClass: 'text-teal-700',
    };
  }

  return {
    iconKey: 'tag',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
  };
}
