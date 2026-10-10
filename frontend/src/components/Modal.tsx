import { useEffect, type ReactNode } from 'react'

interface Props {
    title: string
    onClose: () => void
    children: ReactNode
}

export function Modal({ title, onClose, children }: Props) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    return (
        <div
            className="backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <div className="dialog">
                <h2>{title}</h2>
                {children}
            </div>
        </div>
    )
}
