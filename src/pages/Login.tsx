import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')).trim(),
      password: String(form.get('password')),
    })
    setPending(false)
    if (error) {
      setError(
        error.message.toLowerCase().includes('email not confirmed')
          ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
          : 'E-mail ou senha inválidos.',
      )
      return
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <p className="mb-2 text-3xl">🏡</p>
        <h1 className="mb-1 text-2xl font-semibold">Bem-vindo de volta</h1>
        <p className="mb-6 text-sm muted">Agenda, financeiro e tarefas da família.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input name="password" type="password" required className="input" />
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={pending} className="btn">
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm muted">
          Ainda não tem conta?{' '}
          <Link to="/signup" className="font-medium underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
