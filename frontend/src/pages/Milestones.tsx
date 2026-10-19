import { useMemo, useState } from 'react'
import * as api from '../api'
import { Check } from '../components/Check'
import { EntryDialog, type Entry } from '../components/EntryDialog'
import { Icon } from '../components/Icon'
import { InlineAdd } from '../components/InlineAdd'
import { Overview } from '../components/Overview'
import { Page } from '../components/Page'
import { PageRail } from '../components/PageRail'
import { ProgressBar } from '../components/ProgressBar'
import { RichTextView } from '../components/RichTextView'
import { RowActions } from '../components/RowActions'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { useHotkeys } from '../hooks/useHotkeys'
import { useResource } from '../hooks/useResource'
import { useSortable } from '../hooks/useSortable'
import {
    currentMilestone,
    milestoneParts,
    milestoneProgress,
    milestonesProgress,
    tasksProgress,
} from '../progress'
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
    const allTasks = tasksProgress(milestones)
    const reached = milestonesProgress(milestones)
    // Only the milestone being worked on is open to begin with.
    const currentId = currentMilestone(milestones)?.id
    const sort = useSortable()
    const order = sort.list('milestones', milestones, (from, to) =>
        run(() => api.milestones.move(milestones[from].id, to)),
    )
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
            head={
                <Overview
                    value={allTasks}
                    parts={milestoneParts(milestones)}
                    note={`${allTasks.done}/${allTasks.total} tasks - ${reached.done}/${reached.total} milestones done`}
                />
            }
            rail={
                <PageRail
                    title="Roadmap"
                    entries={milestones.map((milestone) => ({
                        id: `milestone-${milestone.id}`,
                        note: String(milestone.number),
                        label: milestone.title,
                        progress: milestoneProgress(milestone),
                    }))}
                />
            }
        >
            <div className="stack">
                {order.items.map((milestone, index) => {
                    const progress = milestoneProgress(milestone)
                    const open = expanded[milestone.id] ?? milestone.id === currentId
                    const tasks = sort.list(`tasks-${milestone.id}`, milestone.tasks, (from, to) =>
                        run(() => api.tasks.move(milestone.tasks[from].id, to)),
                    )

                    return (
                        <section
                            className="card"
                            key={milestone.id}
                            id={`milestone-${milestone.id}`}
                            {...order.row(index)}
                        >
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
                                    handle={order.handle}
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
                                <ProgressBar value={progress} />
                            </div>

                            {open && (
                                <div className="card-body">
                                    <RichTextView html={milestone.description} compact />
                                    {tasks.items.map((task, taskIndex) => (
                                        <div className="task hoverable" key={task.id} {...tasks.row(taskIndex)}>
                                            <Check
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
                                                        handle={tasks.handle}
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
