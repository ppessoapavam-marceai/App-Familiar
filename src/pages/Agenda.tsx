import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { dateTime, viaLabel, type Author, type Source } from '../lib/format'

type EventRow = {
  id: string
  title: string
  starts_at: string
  location: string | null
  source: Source
  profiles: Author
}

export function Agenda() {
  const { profile } = useAuth()
  const [events, setEvents] = useState<EventRow[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, starts_at, location, source, profiles(name)')
      .order('starts_at')
    setEvents((data ?? []) as unknown as EventRow[])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

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
    void load()
  }

  async function remove(id: string) {
    await supabase.from('events').delete().eq('id', id)
    void load()
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Agenda</h1>
        {events.length === 0 && <p className="text-sm text-slate-400">Nenhum compromisso cadastrado ainda.</p>}
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="item">
              <div>
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {dateTime(ev.starts_at)}
                  {ev.location ? ` · ${ev.location}` : ''}
                </p>
                <p className="text-xs text-slate-400">
                  Adicionado por {ev.profiles?.name}
                  {viaLabel(ev.source)}
                </p>
              </div>
              <button onClick={() => remove(ev.id)} className="link-danger">
                Remover
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card h-fit">
        <h2 className="section-title">Novo compromisso</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Título</label>
            <input name="title" required className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data</label>
              <input name="date" type="date" required className="input" />
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
    </div>
  )
}
