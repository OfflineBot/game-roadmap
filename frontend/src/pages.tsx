import type { CSSProperties, ReactNode } from 'react'
import { Crates } from './pages/Crates'
import { Dashboard } from './pages/Dashboard'
import { Docs } from './pages/Docs'
import { Items } from './pages/Items'
import { Milestones } from './pages/Milestones'

export interface PageRoute {
    path: string
    label: string
    /** Used where the full label does not fit, such as the phone tab bar. */
    short: string
    accent: string
    element: ReactNode
}

export function accentStyle(accent: string): CSSProperties {
    return { '--accent': `var(${accent})` } as CSSProperties
}

export const pages: PageRoute[] = [
    { path: '/', label: 'Dashboard', short: 'Home', accent: '--mauve', element: <Dashboard /> },
    { path: '/milestones', label: 'Milestones', short: 'Roadmap', accent: '--blue', element: <Milestones /> },
    { path: '/items', label: 'Item Track List', short: 'Items', accent: '--green', element: <Items /> },
    { path: '/crates', label: 'Crate Imports', short: 'Crates', accent: '--teal', element: <Crates /> },
    { path: '/docs', label: 'General Information', short: 'Info', accent: '--peach', element: <Docs /> },
]
