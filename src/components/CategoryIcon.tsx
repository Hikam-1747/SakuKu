import {
  Bike,
  BookOpen,
  Coffee,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  PiggyBank,
  ShoppingBag,
  Smartphone,
  Tag,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type { TransactionType } from '../types/finance';
import { getCategoryVisual, type CategoryIconKey } from '../utils/categories';

const ICON_MAP: Record<CategoryIconKey, typeof Tag> = {
  food: UtensilsCrossed,
  home: Home,
  transport: Bike,
  study: BookOpen,
  coffee: Coffee,
  savings: PiggyBank,
  wallet: Wallet,
  laptop: Laptop,
  scholarship: GraduationCap,
  shop: ShoppingBag,
  health: HeartPulse,
  phone: Smartphone,
  tag: Tag,
};

interface CategoryIconProps {
  category: string;
  type?: TransactionType;
  size?: 'sm' | 'md';
  inverted?: boolean;
}

export function CategoryIcon({
  category,
  type = 'expense',
  size = 'md',
  inverted = false,
}: CategoryIconProps) {
  const visual = getCategoryVisual(category, type);
  const Icon = ICON_MAP[visual.iconKey] ?? Tag;
  const boxClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${boxClass} ${
        inverted ? 'bg-white/15 text-white' : `${visual.bgClass} ${visual.textClass}`
      }`}
      aria-hidden="true"
    >
      <Icon className={iconClass} />
    </span>
  );
}
