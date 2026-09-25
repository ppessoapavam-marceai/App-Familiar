import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useMembers } from '../lib/members'

export function Configuracoes() {
  const { session, profile } = useAuth()
  const { members, colorOf, reload } = useMembers()
  const [code, setCode] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const linked = members.find((m) => m.id === profile?.id)?.telegram_linked ?? null
  const inviteCode = profile?.families?.invite_code ?? ''
  const inviteLink = `${window.location.origin}/signup?code=${encodeURIComponent(inviteCode)}`

  async function generate() {
    setPending(true)
    setError(null)
    const { data, error } = await supabase.rpc('generate_telegram_code')
    setPending(false)
    if (error) {
      setError('Não foi possível gerar o código. Tente de novo.')
      return
    }
    setCode(data as string)
  }

  async function unlink() {
    setPending(true)
    await supabase.rpc('unlink_telegram')
    setPending(false)
    setCode(null)
    void reload()
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não consegui copiar. Selecione o link e copie manualmente.')
    }
  }

  return (
    <div className="grid max-w-5xl gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">⚙️ Ajustes</h1>

        <section className="card">
          <h2 className="section-title">👤 Sua conta</h2>
          <p className="text-sm">{profile?.name}</p>
          <p className="text-sm muted">{session?.user.email}</p>
        </section>

        <section className="card">
          <h2 className="section-title">✈️ Seu Telegram</h2>
          {linked === null ? (
            <p className="text-sm muted">Carregando...</p>
          ) : linked ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">✅ Sua conta está vinculada ao Telegram.</p>
              <button onClick={unlink} disabled={pending} className="btn-outline">
                Desvincular
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm muted">
                Gere um código, abra o bot da família no Telegram e mande{' '}
                <code className="rounded bg-cream-200 px-1 dark:bg-stone-800">/vincular CODIGO</code>.
              </p>
              {code && (
                <div className="rounded-lg border border-dashed border-cream-400 p-4 text-center dark:border-stone-700">
                  <p className="font-mono text-2xl font-semibold tracking-widest">{code}</p>
                  <p className="mt-1 text-xs muted">Válido por 15 minutos</p>
                </div>
              )}
              {error && <p className="text-sm text-rose-700">{error}</p>}
              <div className="flex items-center gap-3">
                <button onClick={generate} disabled={pending} className="btn-outline">
                  {code ? 'Gerar novo código' : 'Gerar código'}
                </button>
                {code && (
                  <button onClick={() => void reload()} className="text-sm underline muted">
                    Já vinculei
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6 md:pt-11">
        <section className="card">
          <h2 className="section-title">👨‍👩‍👧 Quem está na família</h2>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${colorOf(m.id).dot}`} />
                  {m.name}
                  {m.id === profile?.id && <span className="text-xs muted">(você)</span>}
                </span>
                <span className={m.telegram_linked ? 'text-emerald-700 dark:text-emerald-400' : 'muted'}>
                  {m.telegram_linked ? '✈️ Telegram ligado' : 'Sem Telegram'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">💌 Convidar alguém (esposa, filhos...)</h2>
          <p className="mb-3 text-sm muted">
            Mande este link. A pessoa cria a conta dela com o mesmo código da família e, depois, vincula o
            próprio Telegram em <b>Ajustes</b>. As mensagens dela ficam identificadas com o nome dela.
          </p>
          <input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} className="input mb-3 text-xs" />
          <button onClick={copyInvite} className="btn-outline">
            {copied ? '✅ Copiado!' : '📋 Copiar link de convite'}
          </button>
        </section>
      </div>
    </div>
  )
}
