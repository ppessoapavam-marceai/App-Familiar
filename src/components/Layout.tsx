import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { to: '/', label: 'Início', end: true },
  { to: '/agenda', label: 'Agenda' },
  { to: '/financeiro', label: 'Financeiro' },
  { to: '/tarefas', label: 'Tarefas' },
  { to: '/configuracoes', label: 'Configurações' },
]

export function Layout() {
  const { session, profile, loading } = useAuth()

  if (loading) return <p className="p-8 text-sm text-slate-500">Carregando...</p>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Não encontramos o perfil desta conta.{' '}
        <button className="underline" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-lg font-semibold">{profile.families?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Olá, {profile.name}</p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                      : 'text-slate-600 dark:text-slate-300'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
