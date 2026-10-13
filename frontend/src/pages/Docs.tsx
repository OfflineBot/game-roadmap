import { useCallback, useEffect, useState } from 'react'
import * as api from '../api'
import { DragHandle } from '../components/DragHandle'
import { IconButton } from '../components/IconButton'
import { InlineAdd } from '../components/InlineAdd'
import { Page } from '../components/Page'
import { RichText } from '../components/RichText'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { useResource } from '../hooks/useResource'
import { useSortable } from '../hooks/useSortable'
import type { Doc } from '../types'

interface Draft {
    title: string
    content: string
}

function changed(page: Doc, draft: Draft | undefined): boolean {
    return draft !== undefined && (draft.title !== page.title || draft.content !== page.content)
}

export function Docs() {
    const { data, error, run } = useResource(api.docs.list)
    const [selectedId, setSelectedId] = useState<number | null>(null)
    // Edits are kept per page, so switching pages never loses anything unsaved.
    const [drafts, setDrafts] = useState<Record<number, Draft>>({})
    const remove = useConfirmDelete()

    const documents = data ?? []
    const selected = documents.find((page) => page.id === selectedId) ?? documents[0] ?? null
    const sort = useSortable()
    const order = sort.list('documents', documents, (from, to) => {
        // Without a pick of their own the editor follows the first page, so
        // reordering would pull it away from the page being read.
        if (selected) setSelectedId(selected.id)
        return run(() => api.docs.move(documents[from].id, to))
    })
    const draft = selected ? drafts[selected.id] : undefined
    const value: Draft | null = draft ?? (selected ? { title: selected.title, content: selected.content } : null)
    const unsaved = selected ? changed(selected, draft) : false

    const edit = (patch: Partial<Draft>) => {
        if (!selected || !value) return
        setDrafts({ ...drafts, [selected.id]: { ...value, ...patch } })
    }

    const save = useCallback(async () => {
        if (!selected || !value || !unsaved) return
        await run(() => api.docs.update(selected.id, value))
        setDrafts((current) => {
            const next = { ...current }
            delete next[selected.id]
            return next
        })
    }, [selected, value, unsaved, run])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                void save()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [save])

    return (
        <Page title="General Information" error={error}>
            <div className="docs-layout">
                <aside className="card docs-list">
                    {order.items.map((page, index) => (
                        <div
                            key={page.id}
                            className={page.id === selected?.id ? 'docs-item active' : 'docs-item'}
                            {...order.row(index)}
                        >
                            <DragHandle name="page" {...order.handle} />
                            <button type="button" className="name" onClick={() => setSelectedId(page.id)}>
                                {page.title}
                            </button>
                            {changed(page, drafts[page.id]) && <span className="unsaved-dot" title="Unsaved" />}
                        </div>
                    ))}
                    <InlineAdd
                        label="page"
                        onAdd={async (title) => {
                            const created = await run(() => api.docs.create({ title }))
                            if (created) setSelectedId(created.id)
                        }}
                    />
                </aside>

                <section className="card docs-editor">
                    {selected && value ? (
                        <>
                            <div className="row hoverable">
                                <input
                                    className="doc-title"
                                    value={value.title}
                                    onChange={(event) => edit({ title: event.target.value })}
                                />
                                <div className="actions">
                                    <IconButton
                                        icon="trash"
                                        title="Delete page"
                                        danger
                                        onClick={() =>
                                            remove.ask({
                                                what: 'page',
                                                name: selected.title,
                                                confirm: () => run(() => api.docs.remove(selected.id)),
                                            })
                                        }
                                    />
                                </div>
                                <button
                                    type="button"
                                    className={unsaved ? 'btn accent' : 'btn'}
                                    disabled={!unsaved}
                                    onClick={save}
                                >
                                    Save <span className="key-hint">ctrl+s</span>
                                </button>
                            </div>
                            <RichText
                                key={selected.id}
                                value={value.content}
                                onChange={(content) => edit({ content })}
                            />
                        </>
                    ) : (
                        <div className="empty">
                            {data ? 'No pages yet. Add one on the left, for example "Code Conventions".' : 'Loading...'}
                        </div>
                    )}
                </section>
            </div>
            {remove.dialog}
        </Page>
    )
}
