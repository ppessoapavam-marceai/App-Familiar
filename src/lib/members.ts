import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Member = { id: string; name: string; telegram_linked: boolean }

// Uma cor por pessoa da família, sem azul.
export const MEMBER_COLORS = [
  { chip: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-500/30', dot: 'bg-amber-400' },
  { chip: 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-500/20 dark:text-rose-100 dark:border-rose-500/30', dot: 'bg-rose-400' },
  { chip: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-500/30', dot: 'bg-emerald-400' },
  { chip: 'bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-500/20 dark:text-violet-100 dark:border-violet-500/30', dot: 'bg-violet-400' },
  { chip: 'bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-500/20 dark:text-orange-100 dark:border-orange-500/30', dot: 'bg-orange-400' },
  { chip: 'bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-500/20 dark:text-teal-100 dark:border-teal-500/30', dot: 'bg-teal-400' },
]

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([])

  const reload = useCallback(async () => {
    const { data } = await supabase.rpc('family_members')
    setMembers((data ?? []) as Member[])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  const colorOf = (userId: string) => {
    const i = members.findIndex((m) => m.id === userId)
    return MEMBER_COLORS[(i < 0 ? 0 : i) % MEMBER_COLORS.length]
  }

  return { members, colorOf, reload }
}
