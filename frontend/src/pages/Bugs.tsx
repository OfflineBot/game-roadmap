import { useState } from 'react'
import * as api from '../api'
import { Check } from '../components/Check'
import { EntryDialog, type Entry } from '../components/EntryDialog'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { InlineAdd } from '../components/InlineAdd'
import { Page } from '../components/Page'
import { RichTextView } from '../components/RichTextView'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { useResource } from '../hooks/useResource'
import type { Bug } from '../types'

export function Bugs() {
    const { data, error, run } = useResource(api.bugs.list)
    const [editing, setEditing] = useState<Bug | null>(null)
    const [archiveOpen, setArchiveOpen] = useState(false)
    const remove = useConfirmDelete()

    const bugs = data ?? []
    const open = bugs.filter((bug) => !bug.fixed)
    // The latest fix on top, which is the one worth looking up again.
    const fixed = bugs.filter((bug) => bug.fixed).reverse()

    const save = (entry: Entry) => {
        if (editing) {
            return run(() => api.bugs.update(editing.id, { title: entry.name, description: entry.text }))
        }
    }

    const row = (bug: Bug) => (
        <div className="task hoverable" key={bug.id}>
            <Check
                checked={bug.fixed}
                title={bug.fixed ? 'Reopen bug' : 'Mark as fixed'}
                onChange={() => run(() => api.bugs.update(bug.id, { fixed: !bug.fixed }))}
            />
            <div className="task-main">
                <div className="row">
                    <button
                        type="button"
                        className={bug.fixed ? 'title done' : 'title'}
                        onClick={() => setEditing(bug)}
                    >
                        {bug.title}
                    </button>
                    {bug.fixed_at && <span className="badge">{bug.fixed_at.slice(0, 10)}</span>}
                    <div className="actions">
                        <IconButton icon="edit" title="Edit bug" onClick={() => setEditing(bug)} />
                        <IconButton
                            icon="trash"
                            title="Delete bug"
                            danger
                            onClick={() =>
                                remove.ask({
                                    what: 'bug',
                                    name: bug.title,
                                    confirm: () => run(() => api.bugs.remove(bug.id)),
                                })
                            }
                        />
                    </div>
                </div>
                <RichTextView html={bug.description} compact />
            </div>
        </div>
    )

    return (
        <Page
            title="Known Bugs"
            error={error}
            head={
                <>
                    <span className="dim">
                        {open.length} open, {fixed.length} fixed
                    </span>
                </>
            }
        >
            <div className="stack">
                <section className="card">
                    <div className="card-body">
                        {open.map(row)}
                        {data && open.length === 0 && (
                            <div className="empty-row dim">
                                {bugs.length === 0 ? 'No bugs noted yet.' : 'No open bugs left.'}
                            </div>
                        )}
                        <InlineAdd
                            label="bug"
                            onAdd={(title) => run(() => api.bugs.create({ title, description: '' }))}
                        />
                    </div>
                </section>

                {fixed.length > 0 && (
                    <section className="card">
                        <button
                            type="button"
                            className="card-head archive-head"
                            onClick={() => setArchiveOpen(!archiveOpen)}
                        >
                            <Icon name={archiveOpen ? 'down' : 'right'} />
                            <span className="title">Archive</span>
                            <span className="badge done">{fixed.length} fixed</span>
                        </button>
                        {archiveOpen && <div className="card-body">{fixed.map(row)}</div>}
                    </section>
                )}
            </div>

            {editing && (
                <EntryDialog
                    title="Edit bug"
                    nameLabel="Title"
                    textLabel="Description"
                    value={{ name: editing.title, text: editing.description }}
                    onSubmit={save}
                    onClose={() => setEditing(null)}
                />
            )}
            {remove.dialog}
        </Page>
    )
}
