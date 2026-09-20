import { cn } from '@/lib/utils'

const CATEGORY_STYLES: { keywords: string[]; icon: string; tile: string }[] = [
  { keywords: ['flight', 'travel', 'trip', 'taxi', 'uber', 'bus', 'train', 'plane', 'airport', 'hotel', 'stay'], icon: '✈️', tile: 'bg-sky-100' },
  { keywords: ['food', 'dinner', 'lunch', 'breakfast', 'restaurant', 'tapas', 'meal', 'eat', 'pizza', 'coffee', 'drink', 'bar'], icon: '🍽️', tile: 'bg-orange-100' },
  { keywords: ['fun', 'movie', 'ticket', 'concert', 'game', 'party', 'museum', 'show', 'entertainment'], icon: '🎉', tile: 'bg-violet-100' },
  { keywords: ['groc', 'shop', 'store', 'market'], icon: '🛒', tile: 'bg-emerald-100' },
  { keywords: ['bill', 'rent', 'utilit', 'electric', 'water', 'gas', 'internet', 'phone'], icon: '🏠', tile: 'bg-amber-100' },
]

/**
 * Category icon tile for expense rows. Guesses the category from the
 * description keywords; falls back to a receipt glyph. Emoji-based so it
 * matches the reference design without adding new icon dependencies.
 */
export function CategoryIcon({ description, className }: { description: string; className?: string }) {
  const text = description.toLowerCase()
  const match = CATEGORY_STYLES.find(c => c.keywords.some(k => text.includes(k)))
  const icon = match?.icon ?? '🧾'
  const tile = match?.tile ?? 'bg-[#dce5ed]'
  return (
    <div
      className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0', tile, className)}
      aria-hidden
    >
      {icon}
    </div>
  )
}
