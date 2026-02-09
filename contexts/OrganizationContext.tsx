'use client'

import { createContext, useContext, ReactNode } from 'react'

type OrganizationContextValue = {
  organizationId: string | null
  inviteCode: string | null
}

const OrganizationContext = createContext<OrganizationContextValue>({
  organizationId: null,
  inviteCode: null,
})

export function OrganizationProvider({
  organizationId,
  inviteCode = null,
  children,
}: {
  organizationId: string | null
  inviteCode?: string | null
  children: ReactNode
}) {
  return (
    <OrganizationContext.Provider value={{ organizationId, inviteCode }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganizationId(): string | null {
  return useContext(OrganizationContext).organizationId
}

export function useInviteCode(): string | null {
  return useContext(OrganizationContext).inviteCode
}
