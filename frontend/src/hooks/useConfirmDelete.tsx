import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface Pending {
    what: string
    name: string
    confirm: () => void
}

/** Every delete in this app goes through an explicit confirmation. */
export function useConfirmDelete() {
    const [pending, setPending] = useState<Pending | null>(null)

    const dialog = pending ? (
        <ConfirmDialog
            title={`Delete ${pending.what}`}
            message={`Delete ${pending.what} "${pending.name}"? This cannot be undone.`}
            onConfirm={pending.confirm}
            onClose={() => setPending(null)}
        />
    ) : null

    return { ask: (next: Pending) => setPending(next), dialog }
}
