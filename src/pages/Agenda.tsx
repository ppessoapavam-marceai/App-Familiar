import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useMembers } from '../lib/members'
import { viaLabel, type Author, type Source } from '../lib/format'

type EventRow = {
  id: string
  user_id: string
  title: string
  starts_at: string
  location: string | null
  source: Source
  profiles: Author
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeOf = (iso: string) => {
  const d = new Date(iso)
  return d.getHours() === 0 && d.getMinutes() === 0 ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function Agenda() {
  const { profile } = useAuth()
  const { colorOf, members } = useMembers()
  const today = keyOf(new Date())
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [events, setEvents] = useState<EventRow[]>([])

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [month])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, user_id, title, starts_at, location, source, profiles(name)')
      .gte('starts_at', days[0].toISOString())
      .lt('starts_at', new Date(days[41].getTime() + 86_400_000).toISOString())
      .order('starts_at')
    setEvents((data ?? []) as unknown as EventRow[])
  }, [days])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const byDay = useMemo(() => {
    const map = new Map<string, EventRow[]>()
    for (const ev of events) {
      const k = keyOf(new Date(ev.starts_at))
      map.set(k, [...(map.get(k) ?? []), ev])
    }
    return map
  }, [events])

  const selectedEvents = byDay.get(selected) ?? []
  const selectedDate = new Date(`${selected}T12:00:00`)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile) return
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const startsAt = new Date(`${form.get('date')}T${form.get('time') || '00:00'}:00`)
    if (Number.isNaN(startsAt.getTime())) return
    await supabase.from('events').insert({
      family_id: profile.family_id,
      user_id: profile.id,
      title: String(form.get('title')).trim(),
      starts_at: startsAt.toISOString(),
      location: String(form.get('location') ?? '').trim() || null,
    })
    formEl.reset()
    setSelected(String(form.get('date')))
    setMonth(new Date(startsAt.getFullYear(), startsAt.getMonth(), 1))
    void load()
  }

  async function remove(id: string) {
    await supabase.from('events').delete().eq('id', id)
    void load()
  }

  const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const monthLabel = upperFirst(new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month))
  const selectedLabel = upperFirst(
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate),
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">📅 {monthLabel}</h1>
          <div className="flex gap-2">
            <button
              className="btn-outline"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Mês anterior"
            >
              ←
            </button>
            <button
              className="btn-outline"
              onClick={() => {
                setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                setSelected(today)
              }}
            >
              Hoje
            </button>
            <button
              className="btn-outline"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Próximo mês"
            >
              →
            </button>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-cream-300 bg-cream-200/60 dark:border-stone-800 dark:bg-stone-800/50">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-center text-xs font-semibold muted">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const k = keyOf(d)
              const list = byDay.get(k) ?? []
              const inMonth = d.getMonth() === month.getMonth()
              const isSelected = k === selected
              return (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  className={`flex min-h-16 flex-col gap-1 border-b border-r border-cream-300 p-1.5 text-left transition sm:min-h-28 dark:border-stone-800 ${
                    inMonth ? '' : 'bg-cream-100/70 opacity-50 dark:bg-stone-950/40'
                  } ${isSelected ? 'bg-amber-50 ring-2 ring-inset ring-amber-300 dark:bg-amber-500/10' : 'hover:bg-cream-100 dark:hover:bg-stone-800/60'}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      k === today ? 'bg-stone-800 text-cream-50 dark:bg-cream-100 dark:text-stone-900' : ''
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <div className="hidden flex-col gap-1 sm:flex">
                    {list.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        className={`truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${colorOf(ev.user_id).chip}`}
                      >
                        {timeOf(ev.starts_at) && <b>{timeOf(ev.starts_at)} </b>}
                        {ev.title}
                      </span>
                    ))}
                    {list.length > 2 && <span className="px-1 text-[11px] muted">+{list.length - 2} mais</span>}
                  </div>
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {list.slice(0, 4).map((ev) => (
                      <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${colorOf(ev.user_id).dot}`} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {members.length > 1 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
            {members.map((m) => (
              <span key={m.id} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${colorOf(m.id).dot}`} />
                {m.name}
              </span>
            ))}
          </p>
        )}
      </section>

      <aside className="space-y-4">
        <section className="card">
          <h2 className="section-title">🗓️ {selectedLabel}</h2>
          {selectedEvents.length === 0 && <p className="text-sm muted">Nada marcado para este dia. 🌿</p>}
          <ul className="space-y-2">
            {selectedEvents.map((ev) => (
              <li key={ev.id} className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${colorOf(ev.user_id).chip}`}>
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {timeOf(ev.starts_at) && <span>⏰ {timeOf(ev.starts_at)} · </span>}
                    {ev.title}
                  </p>
                  {ev.location && <p className="text-xs opacity-80">📍 {ev.location}</p>}
                  <p className="text-xs opacity-70">
                    {ev.profiles?.name}
                    {viaLabel(ev.source)}
                  </p>
                </div>
                <button onClick={() => remove(ev.id)} className="link-danger" aria-label="Remover">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">➕ Novo compromisso</h2>
          <form key={selected} onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label">Título</label>
              <input name="title" required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data</label>
                <input name="date" type="date" required defaultValue={selected} className="input" />
              </div>
              <div>
                <label className="label">Hora</label>
                <input name="time" type="time" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Local (opcional)</label>
              <input name="location" className="input" />
            </div>
            <button type="submit" className="btn">
              Adicionar
            </button>
          </form>
        </section>
      </aside>
    </div>
  )
}
