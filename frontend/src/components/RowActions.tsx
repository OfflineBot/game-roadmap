import type { HandleProps } from '../hooks/useSortable'
import { DragHandle } from './DragHandle'
import { IconButton } from './IconButton'

interface Props {
    name: string
    handle: HandleProps
    onEdit: () => void
    onDelete: () => void
}

/** Reorder, edit and delete - the same three controls on every row of the app. */
export function RowActions({ name, handle, onEdit, onDelete }: Props) {
    return (
        <div className="actions">
            <DragHandle name={name} {...handle} />
            <IconButton icon="edit" title={`Edit ${name}`} onClick={onEdit} />
            <IconButton icon="trash" title={`Delete ${name}`} danger onClick={onDelete} />
        </div>
    )
}
