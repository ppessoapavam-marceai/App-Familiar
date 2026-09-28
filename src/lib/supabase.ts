import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonPublic = import.meta.env.VITE_SUPABASE_ANON_PUBLIC as string | undefined

if (!url || !anonPublic) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_PUBLIC no arquivo .env.local')
}

export const supabase = createClient(url, anonPublic)
