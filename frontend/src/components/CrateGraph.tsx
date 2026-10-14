import { useLayoutEffect, useRef, useState } from 'react'
import { wouldBeCircular } from '../graph'
import type { Crate } from '../types'
import { IconButton } from './IconButton'

interface Props {
    rows: Crate[][]
    selected: Crate | null
    onPick: (crate: Crate) => void
    onEdit: (crate: Crate) => void
    onDelete: (crate: Crate) => void
}

interface Box {
    x: number
    width: number
    top: number
    bottom: number
}

/**
 * Where one arrow of a bundle meets a crate. A handful of lines are spread
 * along the edge so each can be followed; a bundle too wide to spread without
 * the heads touching stays gathered in the middle instead.
 */
function anchor(box: Box, index: number, total: number): number {
    const span = (total - 1) * 11
    if (total <= 1 || span > box.width - 20) return box.x
    return box.x - span / 2 + (span * index) / (total - 1)
}

function curve(fromX: number, from: Box, toX: number, to: Box): string {
    const bend = Math.max(22, (from.top - to.bottom) * 0.35)
    return `M ${fromX} ${from.top} C ${fromX} ${from.top - bend} ${toX} ${to.bottom + bend} ${toX} ${to.bottom + 4}`
}

/** Edge ends are ordered across a crate by where the other end sits. */
function order(ids: number[], boxes: Map<number, Box>): number[] {
    return [...ids].sort((a, b) => (boxes.get(a)?.x ?? 0) - (boxes.get(b)?.x ?? 0))
}

export function CrateGraph({ rows, selected, onPick, onEdit, onDelete }: Props) {
    const frame = useRef<HTMLDivElement>(null)
    const nodes = useRef(new Map<number, HTMLElement>())
    const [boxes, setBoxes] = useState(new Map<number, Box>())
    const [hovered, setHovered] = useState<number | null>(null)

    const all = rows.flat()

    // Arrows are drawn over the laid out crates, so their ends have to be read
    // back from the page rather than guessed.
    useLayoutEffect(() => {
        const measure = () => {
            const base = frame.current?.getBoundingClientRect()
            if (!base) return
            const next = new Map<number, Box>()
            nodes.current.forEach((node, id) => {
                const box = node.getBoundingClientRect()
                next.set(id, {
                    x: Math.round(box.left - base.left + box.width / 2),
                    width: Math.round(box.width),
                    top: Math.round(box.top - base.top),
                    bottom: Math.round(box.bottom - base.top),
                })
            })
            setBoxes(next)
        }

        measure()
        const observer = new ResizeObserver(measure)
        if (frame.current) observer.observe(frame.current)
        return () => observer.disconnect()
    }, [rows])

    // Hovering traces one crate; while connecting, the picked crate wins.
    const traced = selected ?? (hovered === null ? null : (all.find((crate) => crate.id === hovered) ?? null))

    const importers = new Map<number, number[]>()
    for (const crate of all) {
        for (const id of crate.depends_on) {
            importers.set(id, [...(importers.get(id) ?? []), crate.id])
        }
    }

    const edges = all.flatMap((crate) => {
        const out = order(crate.depends_on, boxes)
        return crate.depends_on.map((id) => {
            const into = order(importers.get(id) ?? [], boxes)
            return {
                key: `${crate.id}-${id}`,
                from: boxes.get(crate.id),
                to: boxes.get(id),
                fromIndex: out.indexOf(id),
                fromCount: out.length,
                toIndex: into.indexOf(crate.id),
                toCount: into.length,
                active: traced?.id === crate.id || traced?.id === id,
            }
        })
    })

    const linked = (crate: Crate): boolean =>
        !traced ||
        traced.id === crate.id ||
        traced.depends_on.includes(crate.id) ||
        crate.depends_on.includes(traced.id)

    const state = (crate: Crate): string => {
        if (!selected) return linked(crate) ? 'node' : 'node aside'
        if (selected.id === crate.id) return 'node picked'
        if (selected.depends_on.includes(crate.id)) return 'node imported'
        return wouldBeCircular(all, selected.id, crate.id) ? 'node blocked' : 'node open'
    }

    const hint = (crate: Crate): string => {
        if (!selected) return `Connect ${crate.name}`
        if (selected.id === crate.id) return 'Stop connecting'
        if (selected.depends_on.includes(crate.id)) return `${selected.name} stops importing ${crate.name}`
        return wouldBeCircular(all, selected.id, crate.id)
            ? `${crate.name} already imports ${selected.name}`
            : `${selected.name} imports ${crate.name}`
    }

    return (
        <div className={traced ? 'graph tracing' : 'graph'} ref={frame}>
            <svg className="edges" aria-hidden="true">
                <defs>
                    <marker id="tip" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                        <path d="M0 0 L8 4 L0 8 z" fill="var(--surface1)" />
                    </marker>
                    <marker id="tip-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                        <path d="M0 0 L8 4 L0 8 z" fill="var(--accent)" />
                    </marker>
                </defs>
                {edges.map(
                    (edge) =>
                        edge.from &&
                        edge.to && (
                            <path
                                key={edge.key}
                                className={edge.active ? 'edge on' : 'edge'}
                                d={curve(
                                    anchor(edge.from, edge.fromIndex, edge.fromCount),
                                    edge.from,
                                    anchor(edge.to, edge.toIndex, edge.toCount),
                                    edge.to,
                                )}
                                markerEnd={edge.active ? 'url(#tip-on)' : 'url(#tip)'}
                            />
                        ),
                )}
            </svg>

            {rows.map((row, index) => (
                <div className="graph-row" key={index}>
                    {row.map((crate) => (
                        <div
                            className={state(crate)}
                            key={crate.id}
                            ref={(node) => {
                                if (node) nodes.current.set(crate.id, node)
                                else nodes.current.delete(crate.id)
                            }}
                            onMouseEnter={() => setHovered(crate.id)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <button
                                type="button"
                                className="node-name"
                                title={hint(crate)}
                                disabled={state(crate) === 'node blocked'}
                                onClick={() => onPick(crate)}
                            >
                                {crate.name}
                            </button>
                            <div className="actions">
                                <IconButton icon="edit" title={`Rename ${crate.name}`} onClick={() => onEdit(crate)} />
                                <IconButton
                                    icon="trash"
                                    title={`Delete ${crate.name}`}
                                    danger
                                    onClick={() => onDelete(crate)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}
