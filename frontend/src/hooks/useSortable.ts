import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const ROW = '[data-row]'

export interface HandleProps {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}

export interface SortableList<T> {
    /** The items in the order they are being dragged into. */
    items: T[]
    handle: HandleProps
    row: (index: number) => { 'data-row': string }
}

interface Drag {
    key: string
    from: number
    to: number
}

interface Context {
    container: HTMLElement
    commit: (from: number, to: number) => void
}

function rowsOf(container: HTMLElement): HTMLElement[] {
    return [...container.children].filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.matches(ROW),
    )
}

function reorder<T>(items: T[], from: number, to: number): T[] {
    const next = [...items]
    next.splice(to, 0, ...next.splice(from, 1))
    return next
}

/**
 * Reordering by dragging a row handle. Pointer events cover mouse and touch
 * alike, and one instance serves every list on a page: the key tells which
 * list the dragged row belongs to.
 */
export function useSortable() {
    const [drag, setDrag] = useState<Drag | null>(null)
    const context = useRef<Context | null>(null)

    // Reordering moves the row through the DOM, which drops any capture the
    // handle holds, so the rest of the drag is followed on the window.
    useEffect(() => {
        const current = context.current
        if (!drag || !current) return

        const stop = () => {
            context.current = null
            setDrag(null)
        }

        // The dragged row keeps its slot in the flow, so counting the rows
        // whose middle the pointer has passed gives the index to land on.
        const onMove = (event: PointerEvent) => {
            let to = 0
            rowsOf(current.container).forEach((row, index) => {
                if (index === drag.to) return
                const box = row.getBoundingClientRect()
                if (event.clientY > box.top + box.height / 2) to += 1
            })
            if (to !== drag.to) setDrag({ ...drag, to })
        }

        const onUp = () => {
            stop()
            if (drag.to !== drag.from) current.commit(drag.from, drag.to)
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', stop)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('pointercancel', stop)
        }
    }, [drag])

    function list<T>(key: string, items: T[], commit: (from: number, to: number) => void): SortableList<T> {
        const active = drag?.key === key ? drag : null

        const begin = (event: ReactPointerEvent<HTMLElement>) => {
            const row = event.currentTarget.closest<HTMLElement>(ROW)
            const container = row?.parentElement
            if (!row || !container) return
            const from = rowsOf(container).indexOf(row)
            if (from < 0) return
            event.preventDefault()
            context.current = { container, commit }
            setDrag({ key, from, to: from })
        }

        return {
            items: active ? reorder(items, active.from, active.to) : items,
            handle: { onPointerDown: begin },
            row: (index) => ({ 'data-row': active?.to === index ? 'dragging' : '' }),
        }
    }

    return { list }
}
