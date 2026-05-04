import { createClient } from '@supabase/supabase-js'

const url     = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Serialize auth operations within this client to avoid Web Locks API
// "lock stolen" errors when multiple parallel requests fire on app mount.
// Web Locks coordinate across tabs but can race within rapid concurrent
// requests; a simple promise chain is enough for our single-app needs.
let _authLockChain = Promise.resolve()
const promiseLock = async (_name, _acquireTimeout, fn) => {
  const next = _authLockChain.then(() => fn(), () => fn())
  _authLockChain = next.catch(() => {})
  return next
}

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'sb-bagong-ilog-auth',
        lock: promiseLock
      }
    })
  : null
