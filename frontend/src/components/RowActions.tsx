import type { Direction } from '../types'
import { IconButton } from './IconButton'

interface Props {
    name: string
    onMove: (direction: Direction) => void
    onEdit: () => void
    onDelete: () => void
    first: boolean
    last: boolean
}

/** Reorder, edit and delete - the same four buttons on every row of the app. */
export function RowActions({ name, onMove, onEdit, onDelete, first, last }: Props) {
    return (
        <div className="actions">
            <IconButton icon="up" title={`Move ${name} up`} disabled={first} onClick={() => onMove('up')} />
            <IconButton icon="down" title={`Move ${name} down`} disabled={last} onClick={() => onMove('down')} />
            <IconButton icon="edit" title={`Edit ${name}`} onClick={onEdit} />
            <IconButton icon="trash" title={`Delete ${name}`} danger onClick={onDelete} />
        </div>
    )
}
