import { useEffect } from 'react'

function typing(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null
    return (
        !!element &&
        (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable)
    )
}

/** Keys are matched case-insensitively; use "alt+1" for modifier combinations. */
export function useHotkeys(bindings: Record<string, () => void>) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (typing(event.target)) return
            const combo = `${event.altKey ? 'alt+' : ''}${event.key.toLowerCase()}`
            const action = bindings[combo]
            if (!action) return
            event.preventDefault()
            action()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [bindings])
}
