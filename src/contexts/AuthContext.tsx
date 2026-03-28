import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Organization, OrgRole } from '../types'

type Profile = {
  displayName: string
  role: string
  managerName: string
  currentOrgId: string | null
}

type AuthState = {
  user: User | null
  session: Session | null
  profile: Profile | null
  organization: Organization | null
  orgRole: OrgRole | null
  isSuper: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, meta: SignUpMeta) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

type SignUpMeta = {
  bizRegistrationNo: string
  bizName: string
  bizCeo: string
  bizAddress: string
  bizPhone: string
  bizMobile: string
  managerName: string
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  organization: null,
  orgRole: null,
  isSuper: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    // 프로필 조회
    const { data: profileData } = await supabase
      .from('profiles')
      .select('display_name, role, manager_name, current_org_id')
      .eq('id', userId)
      .single()

    if (!profileData) return

    setProfile({
      displayName: profileData.display_name,
      role: profileData.role,
      managerName: profileData.manager_name ?? '',
      currentOrgId: profileData.current_org_id,
    })

    // 조직 정보 조회
    if (profileData.current_org_id) {
      const [orgRes, memberRes] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.current_org_id)
          .single(),
        supabase
          .from('org_members')
          .select('role')
          .eq('org_id', profileData.current_org_id)
          .eq('user_id', userId)
          .single(),
      ])

      if (orgRes.data) {
        setOrganization({
          id: orgRes.data.id,
          bizRegistrationNo: orgRes.data.biz_registration_no ?? '',
          bizName: orgRes.data.biz_name ?? '',
          bizCeo: orgRes.data.biz_ceo ?? '',
          bizAddress: orgRes.data.biz_address ?? '',
          bizPhone: orgRes.data.biz_phone ?? '',
          bizMobile: orgRes.data.biz_mobile ?? '',
          createdAt: orgRes.data.created_at,
          updatedAt: orgRes.data.updated_at,
        })
      }

      if (memberRes.data) {
        setOrgRole(memberRes.data.role as OrgRole)
      }
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setOrganization(null)
        setOrgRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, meta: SignUpMeta) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: meta.managerName,
          biz_registration_no: meta.bizRegistrationNo,
          biz_name: meta.bizName,
          biz_ceo: meta.bizCeo,
          biz_address: meta.bizAddress,
          biz_phone: meta.bizPhone,
          biz_mobile: meta.bizMobile,
          manager_name: meta.managerName,
        },
      },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setOrganization(null)
    setOrgRole(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        organization,
        orgRole,
        isSuper: profile?.role === 'admin',
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
