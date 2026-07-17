import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getProfile } from '../lib/api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  localMode: boolean
  signInWithMagicLink: (email: string) => Promise<void>
  verifyEmailCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  enterLocalMode: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [localMode, setLocalMode] = useState(!isSupabaseConfigured)

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || localMode) {
      const p = await getProfile()
      setProfile(p)
      return
    }
    const p = await getProfile()
    setProfile(p)
  }, [localMode])

  useEffect(() => {
    if (!isSupabaseConfigured || localMode) {
      void getProfile().then((p) => {
        setProfile(p)
        setLoading(false)
      })
      return
    }

    let mounted = true
    void supabase!.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      void getProfile()
        .then((p) => mounted && setProfile(p))
        .finally(() => mounted && setLoading(false))
    })

    const { data: sub } = supabase!.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void getProfile().then(setProfile)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [localMode])

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error
  }, [])

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (supabase && !localMode) await supabase.auth.signOut()
    setSession(null)
    if (localMode) {
      setProfile(await getProfile())
    } else {
      setProfile(null)
    }
  }, [localMode])

  const enterLocalMode = useCallback(() => {
    setLocalMode(true)
    void getProfile().then(setProfile)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      localMode: localMode || !isSupabaseConfigured,
      signInWithMagicLink,
      verifyEmailCode,
      signOut,
      enterLocalMode,
      refreshProfile,
    }),
    [
      loading,
      session,
      profile,
      localMode,
      signInWithMagicLink,
      verifyEmailCode,
      signOut,
      enterLocalMode,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
