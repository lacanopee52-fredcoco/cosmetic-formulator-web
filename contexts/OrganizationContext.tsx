'use client'

import { createContext, useContext, ReactNode } from 'react'

const OrganizationContext = createContext<string | null>(null)

export function OrganizationProvider({ organizationId, children }: { organizationId: string | null; children: ReactNode }) {
  return (
    <OrganizationContext.Provider value={organizationId}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganizationId(): string | null {
  return useContext(OrganizationContext)
}
