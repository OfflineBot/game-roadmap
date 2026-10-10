import type { ReactNode } from 'react'

interface Props {
    title: string
    error: string | null
    head?: ReactNode
    rail?: ReactNode
    children: ReactNode
}

export function Page({ title, error, head, rail, children }: Props) {
    return (
        <>
            <header className="page-head">
                <h1>{title}</h1>
                {head}
            </header>
            {error && <div className="page-error">{error}</div>}
            <div className="page-body">
                <div className="page-main">{children}</div>
                {rail}
            </div>
        </>
    )
}
