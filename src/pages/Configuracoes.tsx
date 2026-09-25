import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export function Configuracoes() {
  const { session, profile } = useAuth()
  const [linked, setLinked] = useState<boolean | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    const { data } = await supabase.rpc('my_telegram_linked')
    setLinked(Boolean(data))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus()
  }, [loadStatus])

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
    void loadStatus()
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <section className="card">
        <h2 className="section-title">Sua conta</h2>
        <p className="text-sm">{profile?.name}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{session?.user.email}</p>
        <p className="mt-2 text-xs text-slate-400">
          Família: {profile?.families?.name} · Código de convite: {profile?.families?.invite_code}
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">Telegram</h2>
        {linked === null ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : linked ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600">✅ Sua conta está vinculada ao Telegram.</p>
            <button onClick={unlink} disabled={pending} className="btn-outline">
              Desvincular
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gere um código, abra o bot da família no Telegram e mande{' '}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/vincular CODIGO</code>.
            </p>
            {code && (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
                <p className="font-mono text-2xl font-semibold tracking-widest">{code}</p>
                <p className="mt-1 text-xs text-slate-400">Válido por 15 minutos</p>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-3">
              <button onClick={generate} disabled={pending} className="btn-outline">
                {code ? 'Gerar novo código' : 'Gerar código'}
              </button>
              {code && (
                <button onClick={loadStatus} className="text-sm text-slate-500 underline">
                  Já vinculei
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
