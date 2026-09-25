import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { currency, shortDateTime, dateOnly, type Author } from '../lib/format'
import { categoryEmoji } from '../lib/categories'

type EventRow = { id: string; title: string; starts_at: string; location: string | null; profiles: Author }
type TaskRow = { id: string; title: string; due_date: string | null; profiles: Author }
type TxRow = { type: 'receita' | 'despesa'; amount: number; category: string }

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
      .select('type, amount, category')
      .gte('occurred_at', startOfMonth().toISOString())
      .then(({ data }) => setTxs((data ?? []) as unknown as TxRow[]))
  }, [])

  const receitas = txs.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const despesas = txs.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const saldo = receitas - despesas

  const topCategories = Object.entries(
    txs
      .filter((t) => t.type === 'despesa')
      .reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + Number(t.amount) }), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium muted">⚖️ Saldo do mês</p>
          <p className={`mt-1 text-2xl font-semibold ${saldo >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {currency(saldo)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium muted">📈 Receitas do mês</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{currency(receitas)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium muted">🛒 Despesas do mês</p>
          <p className="mt-1 text-2xl font-semibold text-rose-700">{currency(despesas)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="section-title">📅 Próximos compromissos</h2>
          {events.length === 0 && <p className="text-sm muted">Nada agendado por enquanto. 🌿</p>}
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="text-sm">
                <p className="font-medium">{e.title}</p>
                <p className="muted">
                  {shortDateTime(e.starts_at)}
                  {e.location ? ` · 📍 ${e.location}` : ''} · {e.profiles?.name}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">✅ Tarefas pendentes</h2>
          {tasks.length === 0 && <p className="text-sm muted">Nenhuma pendência. 🎉</p>}
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li key={t.id} className="text-sm">
                <p className="font-medium">{t.title}</p>
                <p className="muted">
                  {t.due_date ? `⏰ ${dateOnly(t.due_date)}` : 'Sem prazo'} · {t.profiles?.name}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {topCategories.length > 0 && (
        <section className="card">
          <h2 className="section-title">🧮 Onde mais gastamos no mês</h2>
          <ul className="space-y-3">
            {topCategories.map(([cat, value]) => (
              <li key={cat} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>
                    {categoryEmoji(cat)} {cat}
                  </span>
                  <span className="font-medium">{currency(value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cream-200 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${Math.max(4, (value / (topCategories[0][1] || 1)) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
