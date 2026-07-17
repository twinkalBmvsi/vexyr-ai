'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function InviteHandlerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState('Verifying your invitation...')

  useEffect(() => {
    // Supabase client automatically parses the hash fragment (#access_token=...)
    // and establishes a session. We just need to wait for it.
    
    const handleInvite = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setStatus('Error verifying invitation: ' + error.message)
        return
      }

      if (session) {
        setStatus('Invitation verified! Redirecting to setup...')
        // Find their tenant slug and redirect them to set password via handoff
        const { data: userRecord } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single()

        if (userRecord?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', userRecord.tenant_id)
            .single()
            
          if (tenant?.slug) {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'
            // We use handoff to transfer the session to the subdomain and then go to /set-password
            window.location.href = `http://${tenant.slug}.${rootDomain}:3000/auth/handoff?access_token=${session.access_token}&refresh_token=${session.refresh_token}&next=${encodeURIComponent('/set-password')}`
            return
          }
        }
        
        // Fallback
        router.push('/')
      } else {
        setStatus('No valid invitation found in the link.')
      }
    }

    // Small delay to ensure Supabase client parsed the hash
    const timer = setTimeout(handleInvite, 1000)
    return () => clearTimeout(timer)
  }, [router, supabase])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', padding: '2rem' }}>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '3rem', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: '2rem', marginBottom: '1rem', color: 'var(--ink)' }}>Welcome to Vexyr</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>{status}</p>
      </div>
    </div>
  )
}
