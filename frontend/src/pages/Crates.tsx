import { useMemo, useState } from 'react'
import * as api from '../api'
import { CrateGraph } from '../components/CrateGraph'
import { EntryDialog, type Entry } from '../components/EntryDialog'
import { InlineAdd } from '../components/InlineAdd'
import { Page } from '../components/Page'
import { dependencyCount, rows } from '../graph'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { useHotkeys } from '../hooks/useHotkeys'
import { useResource } from '../hooks/useResource'
import type { Crate } from '../types'

function count(value: number, one: string, many: string): string {
    return `${value} ${value === 1 ? one : many}`
}

export function Crates() {
    const { data, error, run } = useResource(api.crates.list)
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [editing, setEditing] = useState<Crate | null>(null)
    const remove = useConfirmDelete()

    const crates = data ?? []
    const selected = crates.find((crate) => crate.id === selectedId) ?? null
    const hotkeys = useMemo(() => ({ escape: () => setSelectedId(null) }), [])
    useHotkeys(hotkeys)

    // One click picks the importer, the next one adds or drops the import.
    const pick = (crate: Crate) => {
        if (!selected || selected.id === crate.id) {
            setSelectedId(selected?.id === crate.id ? null : crate.id)
            return
        }
        const imported = selected.depends_on.includes(crate.id)
        void run(() =>
            imported
                ? api.crates.removeImport(selected.id, crate.id)
                : api.crates.addImport(selected.id, crate.id),
        )
    }

    const rename = (entry: Entry) => {
        if (editing) return run(() => api.crates.update(editing.id, { name: entry.name }))
    }

    return (
        <Page
            title="Crate Imports"
            error={error}
            head={
                <>
                    <span className="dim">
                        {count(crates.length, 'crate', 'crates')}, {count(dependencyCount(crates), 'import', 'imports')}
                    </span>
                    <span className="spacer" />
                    <InlineAdd label="crate" accent onAdd={(name) => run(() => api.crates.create({ name }))} />
                </>
            }
        >
            <div className={selected ? 'connect-bar active' : 'connect-bar'}>
                {selected ? (
                    <>
                        <span className="badge accent">{selected.name}</span>
                        <span>imports - click a crate to add or drop it</span>
                        <span className="spacer" />
                        <button type="button" className="btn" onClick={() => setSelectedId(null)}>
                            Done <span className="key-hint">esc</span>
                        </button>
                    </>
                ) : (
                    <span className="dim">
                        Arrows point at what a crate imports. Click a crate to connect it.
                    </span>
                )}
            </div>

            {crates.length > 0 ? (
                <CrateGraph
                    rows={rows(crates)}
                    selected={selected}
                    onPick={pick}
                    onEdit={setEditing}
                    onDelete={(crate) =>
                        remove.ask({
                            what: 'crate',
                            name: crate.name,
                            confirm: () => run(() => api.crates.remove(crate.id)),
                        })
                    }
                />
            ) : (
                data && <div className="empty">No crates yet. Add the first one above.</div>
            )}

            {editing && (
                <EntryDialog
                    title={`Rename ${editing.name}`}
                    nameLabel="Name"
                    value={{ name: editing.name, text: '' }}
                    onSubmit={rename}
                    onClose={() => setEditing(null)}
                />
            )}
            {remove.dialog}
        </Page>
    )
}
