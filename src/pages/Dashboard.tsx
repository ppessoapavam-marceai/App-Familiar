import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { currency, shortDateTime, dateOnly, type Author } from '../lib/format'

type EventRow = { id: string; title: string; starts_at: string; location: string | null; profiles: Author }
type TaskRow = { id: string; title: string; due_date: string | null; profiles: Author }
type TxRow = { type: 'receita' | 'despesa'; amount: number }

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function Dashboard() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [txs, setTxs] = useState<TxRow[]>([])

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, starts_at, location, profiles(name)')
      .gte('starts_at', startOfToday().toISOString())
      .order('starts_at')
      .limit(5)
      .then(({ data }) => setEvents((data ?? []) as unknown as EventRow[]))
    supabase
      .from('tasks')
      .select('id, title, due_date, profiles(name)')
      .eq('done', false)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5)
      .then(({ data }) => setTasks((data ?? []) as unknown as TaskRow[]))
    supabase
      .from('transactions')
      .select('type, amount')
      .gte('occurred_at', startOfMonth().toISOString())
      .then(({ data }) => setTxs((data ?? []) as unknown as TxRow[]))
  }, [])

  const receitas = txs.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const despesas = txs.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const saldo = receitas - despesas

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Saldo do mês</p>
          <p className={`mt-1 text-2xl font-semibold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {currency(saldo)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Receitas do mês</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{currency(receitas)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Despesas do mês</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{currency(despesas)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="section-title">Próximos compromissos</h2>
          {events.length === 0 && <p className="text-sm text-slate-400">Nada agendado por enquanto.</p>}
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="text-sm">
                <p className="font-medium">{e.title}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {shortDateTime(e.starts_at)}
                  {e.location ? ` · ${e.location}` : ''} · {e.profiles?.name}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">Tarefas pendentes</h2>
          {tasks.length === 0 && <p className="text-sm text-slate-400">Nenhuma pendência. 🎉</p>}
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li key={t.id} className="text-sm">
                <p className="font-medium">{t.title}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {t.due_date ? dateOnly(t.due_date) : 'Sem prazo'} · {t.profiles?.name}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
