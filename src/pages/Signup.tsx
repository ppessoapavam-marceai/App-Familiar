import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export function Signup() {
  const { session } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = String(form.get('password'))
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    setPending(true)
    setError(null)
    setInfo(null)
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get('email')).trim(),
      password,
      options: {
        data: {
          name: String(form.get('name')).trim(),
          invite_code: String(form.get('inviteCode')).trim(),
        },
      },
    })
    setPending(false)
    if (error) {
      const msg = error.message.toLowerCase()
      setError(
        msg.includes('database error')
          ? 'Código da família inválido.'
          : msg.includes('already')
            ? 'Já existe uma conta com esse e-mail.'
            : error.message,
      )
      return
    }
    if (!data.session) {
      setInfo('Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="mb-1 text-2xl font-semibold">Criar conta</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Peça o código de convite da família para quem já usa o app.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Seu nome</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input name="password" type="password" required minLength={6} className="input" />
          </div>
          <div>
            <label className="label">Código de convite da família</label>
            <input name="inviteCode" required className="input" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}
          <button type="submit" disabled={pending} className="btn">
            {pending ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
