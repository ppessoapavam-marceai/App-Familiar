import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { dateOnly, viaLabel, type Author, type Source } from '../lib/format'

type TaskRow = {
  id: string
  title: string
  due_date: string | null
  done: boolean
  source: Source
  profiles: Author
}

export function Tarefas() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<TaskRow[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, done, source, profiles(name)')
      .order('done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setTasks((data ?? []) as unknown as TaskRow[])
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
    const due = String(form.get('dueDate') ?? '')
    await supabase.from('tasks').insert({
      family_id: profile.family_id,
      user_id: profile.id,
      title: String(form.get('title')).trim(),
      due_date: due ? new Date(`${due}T12:00:00`).toISOString() : null,
    })
    formEl.reset()
    void load()
  }

  async function toggle(task: TaskRow) {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    void load()
  }

  async function remove(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    void load()
  }

  const pending = tasks.filter((t) => !t.done).length

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">
          ✅ Tarefas <span className="text-sm font-normal muted">· {pending} pendente{pending === 1 ? '' : 's'}</span>
        </h1>
        {tasks.length === 0 && <p className="text-sm muted">Nenhuma tarefa cadastrada. 🌿</p>}
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="item">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggle(task)}
                  aria-label={task.done ? 'Marcar como pendente' : 'Marcar como concluída'}
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
                    task.done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-cream-400 hover:border-amber-400 dark:border-stone-600'
                  }`}
                >
                  {task.done ? '✓' : ''}
                </button>
                <div>
                  <p className={`font-medium ${task.done ? 'text-stone-400 line-through' : ''}`}>{task.title}</p>
                  <p className="text-sm muted">
                    {task.due_date ? `⏰ ${dateOnly(task.due_date)}` : 'Sem prazo'} · {task.profiles?.name}
                    {viaLabel(task.source)}
                  </p>
                </div>
              </div>
              <button onClick={() => remove(task.id)} className="link-danger" aria-label="Remover">
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card h-fit">
        <h2 className="section-title">➕ Nova tarefa</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Título</label>
            <input name="title" required className="input" />
          </div>
          <div>
            <label className="label">Prazo (opcional)</label>
            <input name="dueDate" type="date" className="input" />
          </div>
          <button type="submit" className="btn">
            Adicionar
          </button>
        </form>
      </section>
    </div>
  )
}
