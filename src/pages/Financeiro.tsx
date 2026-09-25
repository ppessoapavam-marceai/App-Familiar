import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { currency, dateOnly, viaLabel, type Author, type Source } from '../lib/format'
import { ALL_CATEGORY_NAMES, CATEGORY_GROUPS, categoryEmoji } from '../lib/categories'

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

const OTHER = '__outra__'

export function Financeiro() {
  const { profile } = useAuth()
  const [txs, setTxs] = useState<TxRow[]>([])
  const [type, setType] = useState<'despesa' | 'receita'>('despesa')
  const [category, setCategory] = useState('')

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

  const groups = CATEGORY_GROUPS.filter((g) => g.kind === type)
  const usedCustom = useMemo(() => {
    const known = new Set(ALL_CATEGORY_NAMES.map((n) => n.toLowerCase()))
    return [...new Set(txs.filter((t) => t.type === type).map((t) => t.category))].filter(
      (c) => !known.has(c.toLowerCase()),
    )
  }, [txs, type])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile) return
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const amount = Number(String(form.get('amount')).replace(',', '.'))
    const chosen = category === OTHER ? String(form.get('customCategory') ?? '').trim() : category
    if (!Number.isFinite(amount) || amount <= 0 || !chosen) return
    const date = String(form.get('date') ?? '')
    await supabase.from('transactions').insert({
      family_id: profile.family_id,
      user_id: profile.id,
      type,
      amount,
      category: chosen,
      description: String(form.get('description') ?? '').trim() || null,
      occurred_at: date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString(),
    })
    formEl.reset()
    setCategory('')
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
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">💰 Financeiro</h1>
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3">
            <p className="text-xs muted">⚖️ Saldo</p>
            <p className={`font-semibold ${saldo >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency(saldo)}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs muted">📈 Receitas</p>
            <p className="font-semibold text-emerald-700">{currency(receitas)}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs muted">🛒 Despesas</p>
            <p className="font-semibold text-rose-700">{currency(despesas)}</p>
          </div>
        </div>

        {txs.length === 0 && <p className="text-sm muted">Nenhum lançamento ainda. 🌱</p>}
        <ul className="space-y-2">
          {txs.map((tx) => (
            <li key={tx.id} className="item">
              <div className="flex gap-3">
                <span className="text-xl">{categoryEmoji(tx.category)}</span>
                <div>
                  <p className="font-medium">
                    {tx.category}
                    {tx.description ? <span className="font-normal muted"> · {tx.description}</span> : ''}
                  </p>
                  <p className="text-sm muted">
                    {dateOnly(tx.occurred_at)} · {tx.profiles?.name}
                    {viaLabel(tx.source)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${tx.type === 'despesa' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {tx.type === 'despesa' ? '-' : '+'}
                  {currency(Number(tx.amount))}
                </span>
                <button onClick={() => remove(tx.id)} className="link-danger" aria-label="Remover">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card h-fit">
        <h2 className="section-title">➕ Novo lançamento</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['despesa', 'receita'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  setCategory('')
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  type === t
                    ? t === 'despesa'
                      ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'border-cream-300 muted hover:bg-cream-200 dark:border-stone-700'
                }`}
              >
                {t === 'despesa' ? '🛒 Despesa' : '💵 Receita'}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input name="amount" type="number" step="0.01" min="0.01" required className="input" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="" disabled>
                Escolha uma opção...
              </option>
              {groups.map((g) => (
                <optgroup key={g.label} label={`${g.emoji} ${g.label}`}>
                  {g.options.map((o) => (
                    <option key={o.name} value={o.name}>
                      {o.emoji} {o.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              {usedCustom.length > 0 && (
                <optgroup label="⭐ Já usadas por vocês">
                  {usedCustom.map((c) => (
                    <option key={c} value={c}>
                      🏷️ {c}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value={OTHER}>✏️ Outra...</option>
            </select>
          </div>
          {category === OTHER && (
            <div>
              <label className="label">Nome da nova categoria</label>
              <input name="customCategory" required autoFocus className="input" placeholder="Ex: Academia" />
            </div>
          )}
          <div>
            <label className="label">Detalhe (opcional)</label>
            <input name="description" className="input" placeholder="Ex: compras da semana" />
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
