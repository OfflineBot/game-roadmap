import type { CSSProperties, ReactNode } from 'react'
import { Dashboard } from './pages/Dashboard'
import { Docs } from './pages/Docs'
import { Items } from './pages/Items'
import { Milestones } from './pages/Milestones'

export interface PageRoute {
    path: string
    label: string
    accent: string
    element: ReactNode
}

export function accentStyle(accent: string): CSSProperties {
    return { '--accent': `var(${accent})` } as CSSProperties
}

export const pages: PageRoute[] = [
    { path: '/', label: 'Dashboard', accent: '--mauve', element: <Dashboard /> },
    { path: '/milestones', label: 'Milestones', accent: '--blue', element: <Milestones /> },
    { path: '/items', label: 'Item Track List', accent: '--green', element: <Items /> },
    { path: '/docs', label: 'General Information', accent: '--peach', element: <Docs /> },
]
