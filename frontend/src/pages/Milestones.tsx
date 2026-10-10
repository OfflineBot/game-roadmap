import { useMemo, useState } from 'react'
import * as api from '../api'
import { EntryDialog, type Entry } from '../components/EntryDialog'
import { Icon } from '../components/Icon'
import { InlineAdd } from '../components/InlineAdd'
import { Page } from '../components/Page'
import { ProgressBar } from '../components/ProgressBar'
import { RichTextView } from '../components/RichTextView'
import { RowActions } from '../components/RowActions'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { useHotkeys } from '../hooks/useHotkeys'
import { useResource } from '../hooks/useResource'
import { milestoneProgress, milestonesProgress } from '../progress'
import type { Milestone, Task } from '../types'

type Editing =
    | { kind: 'new-milestone' }
    | { kind: 'milestone'; milestone: Milestone }
    | { kind: 'task'; task: Task }

function dialogTitle(editing: Editing): string {
    switch (editing.kind) {
        case 'new-milestone':
            return 'New milestone'
        case 'milestone':
            return `Edit Milestone ${editing.milestone.number}`
        case 'task':
            return `Edit task ${editing.task.number}`
    }
}

function dialogValue(editing: Editing): Entry {
    switch (editing.kind) {
        case 'new-milestone':
            return { name: '', text: '' }
        case 'milestone':
            return { name: editing.milestone.title, text: editing.milestone.description }
        case 'task':
            return { name: editing.task.title, text: editing.task.description }
    }
}

export function Milestones() {
    const { data, error, run } = useResource(api.milestones.list)
    const [editing, setEditing] = useState<Editing | null>(null)
    const [expanded, setExpanded] = useState<Record<number, boolean>>({})
    const remove = useConfirmDelete()

    const milestones = data ?? []
    const hotkeys = useMemo(() => ({ n: () => setEditing({ kind: 'new-milestone' }) }), [])
    useHotkeys(hotkeys)

    const save = (entry: Entry) => {
        if (!editing) return
        const input = { title: entry.name, description: entry.text }
        switch (editing.kind) {
            case 'new-milestone':
                return run(() => api.milestones.create(input))
            case 'milestone':
                return run(() => api.milestones.update(editing.milestone.id, input))
            case 'task':
                return run(() => api.tasks.update(editing.task.id, input))
        }
    }

    const addButton = (
        <button type="button" className="btn accent" onClick={() => setEditing({ kind: 'new-milestone' })}>
            <Icon name="plus" /> Milestone <span className="key-hint">n</span>
        </button>
    )

    return (
        <Page
            title="Milestones"
            error={error}
            head={<ProgressBar value={milestonesProgress(milestones)} width={240} />}
        >
            <div className="card-grid narrow">
                {milestones.map((milestone, index) => {
                    const progress = milestoneProgress(milestone)
                    const open = expanded[milestone.id] ?? !progress.complete

                    return (
                        <section className="card" key={milestone.id}>
                            <div className="card-head hoverable">
                                <button
                                    type="button"
                                    className="icon-btn"
                                    title={open ? 'Collapse' : 'Expand'}
                                    onClick={() => setExpanded({ ...expanded, [milestone.id]: !open })}
                                >
                                    <Icon name={open ? 'down' : 'right'} />
                                </button>
                                <span className={progress.complete ? 'badge done' : 'badge accent'}>
                                    Milestone {milestone.number}
                                </span>
                                <button
                                    type="button"
                                    className="title"
                                    onClick={() => setEditing({ kind: 'milestone', milestone })}
                                >
                                    {milestone.title}
                                </button>
                                {progress.complete && <span className="badge done">done</span>}
                                <RowActions
                                    name="milestone"
                                    first={index === 0}
                                    last={index === milestones.length - 1}
                                    onMove={(direction) => run(() => api.milestones.move(milestone.id, direction))}
                                    onEdit={() => setEditing({ kind: 'milestone', milestone })}
                                    onDelete={() =>
                                        remove.ask({
                                            what: 'milestone',
                                            name: `Milestone ${milestone.number} - ${milestone.title}`,
                                            confirm: () => run(() => api.milestones.remove(milestone.id)),
                                        })
                                    }
                                />
                                <span className="spacer" />
                                <ProgressBar value={progress} width={220} />
                            </div>

                            {open && (
                                <div className="card-body">
                                    <RichTextView html={milestone.description} compact />
                                    {milestone.tasks.map((task, taskIndex) => (
                                        <div className="task hoverable" key={task.id}>
                                            <input
                                                type="checkbox"
                                                className="check"
                                                checked={task.done}
                                                title={task.done ? 'Mark as open' : 'Mark as done'}
                                                onChange={() => run(() => api.tasks.update(task.id, { done: !task.done }))}
                                            />
                                            <span className="task-number">{task.number}</span>
                                            <div className="task-main">
                                                <div className="row">
                                                    <button
                                                        type="button"
                                                        className={task.done ? 'title done' : 'title'}
                                                        onClick={() => setEditing({ kind: 'task', task })}
                                                    >
                                                        {task.title}
                                                    </button>
                                                    <RowActions
                                                        name="task"
                                                        first={taskIndex === 0}
                                                        last={taskIndex === milestone.tasks.length - 1}
                                                        onMove={(direction) => run(() => api.tasks.move(task.id, direction))}
                                                        onEdit={() => setEditing({ kind: 'task', task })}
                                                        onDelete={() =>
                                                            remove.ask({
                                                                what: 'task',
                                                                name: `${task.number} - ${task.title}`,
                                                                confirm: () => run(() => api.tasks.remove(task.id)),
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <RichTextView html={task.description} compact />
                                            </div>
                                        </div>
                                    ))}
                                    <InlineAdd
                                        label="task"
                                        onAdd={(title) =>
                                            run(() =>
                                                api.milestones.createTask(milestone.id, { title, description: '' }),
                                            )
                                        }
                                    />
                                </div>
                            )}
                        </section>
                    )
                })}

            </div>

            {data && milestones.length === 0 && <div className="empty">No milestones yet.</div>}
            <div className="page-actions">{addButton}</div>

            {editing && (
                <EntryDialog
                    title={dialogTitle(editing)}
                    nameLabel="Title"
                    textLabel="Description"
                    value={dialogValue(editing)}
                    onSubmit={save}
                    onClose={() => setEditing(null)}
                />
            )}
            {remove.dialog}
        </Page>
    )
}
