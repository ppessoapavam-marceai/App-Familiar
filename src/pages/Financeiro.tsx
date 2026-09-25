import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { currency, dateOnly, viaLabel, type Author, type Source } from '../lib/format'

type TxRow = {
  id: string
  type: 'receita' | 'despesa'
  amount: number
  category: string
  description: string | null
  occurred_at: string
  source: Source
  profiles: Author
}

export function Financeiro() {
  const { profile } = useAuth()
  const [txs, setTxs] = useState<TxRow[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('id, type, amount, category, description, occurred_at, source, profiles(name)')
      .order('occurred_at', { ascending: false })
      .limit(100)
    setTxs((data ?? []) as unknown as TxRow[])
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
    const amount = Number(String(form.get('amount')).replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) return
    const date = String(form.get('date') ?? '')
    await supabase.from('transactions').insert({
      family_id: profile.family_id,
      user_id: profile.id,
      type: form.get('type') === 'receita' ? 'receita' : 'despesa',
      amount,
      category: String(form.get('category')).trim(),
      description: String(form.get('description') ?? '').trim() || null,
      occurred_at: date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString(),
    })
    formEl.reset()
    void load()
  }

  async function remove(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    void load()
  }

  const receitas = txs.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const despesas = txs.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const saldo = receitas - despesas

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Financeiro</h1>
        <div className="grid grid-cols-3 gap-3">
          <div className="item flex-col gap-0 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Saldo</p>
            <p className={`font-semibold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{currency(saldo)}</p>
          </div>
          <div className="item flex-col gap-0 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Receitas</p>
            <p className="font-semibold text-emerald-600">{currency(receitas)}</p>
          </div>
          <div className="item flex-col gap-0 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Despesas</p>
            <p className="font-semibold text-red-600">{currency(despesas)}</p>
          </div>
        </div>

        {txs.length === 0 && <p className="text-sm text-slate-400">Nenhum lançamento ainda.</p>}
        <ul className="space-y-2">
          {txs.map((tx) => (
            <li key={tx.id} className="item">
              <div>
                <p className="font-medium">
                  {tx.category}
                  {tx.description ? ` · ${tx.description}` : ''}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {dateOnly(tx.occurred_at)} · {tx.profiles?.name}
                  {viaLabel(tx.source)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${tx.type === 'despesa' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {tx.type === 'despesa' ? '-' : '+'}
                  {currency(Number(tx.amount))}
                </span>
                <button onClick={() => remove(tx.id)} className="link-danger">
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card h-fit">
        <h2 className="section-title">Novo lançamento</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Tipo</label>
            <select name="type" defaultValue="despesa" className="input">
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input name="amount" type="number" step="0.01" min="0.01" required className="input" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <input name="category" required placeholder="Mercado, Transporte, Salário..." className="input" />
          </div>
          <div>
            <label className="label">Descrição (opcional)</label>
            <input name="description" className="input" />
          </div>
          <div>
            <label className="label">Data</label>
            <input name="date" type="date" className="input" />
          </div>
          <button type="submit" className="btn">
            Adicionar
          </button>
        </form>
      </section>
    </div>
  )
}
