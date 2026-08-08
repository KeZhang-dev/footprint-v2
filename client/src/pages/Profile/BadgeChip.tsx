const BADGE_STYLES: Record<string, string> = {
  Gold: 'bg-amber-100 text-amber-800',
  Silver: 'bg-slate-200 text-slate-700',
  Bronze: 'bg-orange-100 text-orange-800',
}

interface BadgeChipProps {
  badge: string | null
}

function BadgeChip({ badge }: BadgeChipProps) {
  if (!badge) {
    return <span className="text-sm text-slate-500">No badge yet</span>
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_STYLES[badge] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {badge}
    </span>
  )
}

export default BadgeChip
