import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { to: '/', label: '🏡 Início', end: true },
  { to: '/agenda', label: '📅 Agenda' },
  { to: '/financeiro', label: '💰 Financeiro' },
  { to: '/tarefas', label: '✅ Tarefas' },
  { to: '/configuracoes', label: '⚙️ Ajustes' },
]

export function Layout() {
  const { session, profile, loading } = useAuth()

  if (loading) return <p className="p-8 text-sm muted">Carregando...</p>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <div className="p-8 text-sm muted">
        Não encontramos o perfil desta conta.{' '}
        <button className="underline" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-cream-300 bg-cream-50/80 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-lg font-semibold">⭐ {profile.families?.name}</p>
            <p className="text-xs muted">Olá, {profile.name} 👋</p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100'
                      : 'text-stone-600 hover:bg-cream-200 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-stone-400 transition hover:bg-cream-200 dark:hover:bg-stone-800"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
