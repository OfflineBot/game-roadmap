import type { ReactNode } from 'react'

interface Props {
    title: string
    error: string | null
    head?: ReactNode
    children: ReactNode
}

export function Page({ title, error, head, children }: Props) {
    return (
        <>
            <header className="page-head">
                <h1>{title}</h1>
                {head}
            </header>
            {error && <div className="page-error">{error}</div>}
            {children}
        </>
    )
}
