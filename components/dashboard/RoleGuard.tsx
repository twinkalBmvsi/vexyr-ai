'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function RoleGuard({
  children,
  userRole,
  accessPages,
  tenantSlug,
}: {
  children: React.ReactNode
  userRole: string
  accessPages: string[]
  tenantSlug: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    // Owners have access to everything
    if (userRole === 'owner') {
      setAuthorized(true)
      return
    }

    // Normalize paths to handle URL encoding and trailing slashes
    // usePathname() returns the external URL without the internal tenant rewrite
    const decodedPathname = decodeURIComponent(pathname)
    const normalizedPath = decodedPathname.replace(/\/$/, '') || '/'

    // Remove tenantSlug from path if it exists (for local dev without subdomains)
    let cleanPath = normalizedPath
    if (cleanPath.startsWith(`/${tenantSlug}`)) {
      cleanPath = cleanPath.substring(`/${tenantSlug}`.length) || '/'
    }

    // Always allow root dashboard and system pages for everyone
    if (cleanPath === '/' || cleanPath.startsWith('/set-password')) {
      setAuthorized(true)
      return
    }

    // Ensure accessPages is an array
    const pages = Array.isArray(accessPages) ? accessPages : []

    // Check if current path matches any of the allowed pages
    // e.g. /appointments
    const isAllowed = pages.some((page) => {
      const allowedPath = `/${page}`
      if (page === 'settings') {
        return cleanPath === allowedPath
      }
      return cleanPath.startsWith(allowedPath)
    })

    if (!isAllowed) {
      router.replace('/')
    } else {
      setAuthorized(true)
    }
  }, [pathname, userRole, accessPages, tenantSlug, router])

  if (authorized === null) {
    return null // or a small loading spinner if preferred
  }

  return <>{children}</>
}
