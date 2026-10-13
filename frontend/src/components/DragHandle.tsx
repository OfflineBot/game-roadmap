import type { HandleProps } from '../hooks/useSortable'
import { Icon } from './Icon'

/** Grab area of a sortable row. */
export function DragHandle({ name, ...handle }: HandleProps & { name: string }) {
    const title = `Drag to reorder ${name}`
    return (
        <span className="grip" title={title} aria-label={title} {...handle}>
            <Icon name="grip" />
        </span>
    )
}
