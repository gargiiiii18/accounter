import { cn } from '@/lib/utils'

interface MemberAvatarProps {
  name: string
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-11 w-11 text-xs',
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function MemberAvatar({ name, color, size = 'sm', className }: MemberAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: color || '#2563eb' }}
      title={name}
    >
      {initialsOf(name)}
    </div>
  )
}

export function MemberAvatarStack({
  members,
  max = 4,
  size = 'sm',
  className,
}: {
  members: { id: string; name: string; color?: string }[]
  max?: number
  size?: MemberAvatarProps['size']
  className?: string
}) {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className={cn('flex items-center', className)}>
      {shown.map((m, i) => (
        <MemberAvatar
          key={m.id}
          name={m.name}
          color={m.color}
          size={size}
          className={i > 0 ? '-ml-2.5' : undefined}
        />
      ))}
      {extra > 0 && (
        <div
          className={cn(
            'rounded-full bg-white border border-[#c0cdd9] text-[#456073] font-bold flex items-center justify-center shrink-0 -ml-2.5',
            SIZE_CLASSES[size]
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
