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
    top: number
    bottom: number
}

/** How far an arrow bulges out before it reaches the crate above. */
function curve(from: Box, to: Box): string {
    const bend = Math.max(22, (from.top - to.bottom) * 0.35)
    return `M ${from.x} ${from.top} C ${from.x} ${from.top - bend} ${to.x} ${to.bottom + bend} ${to.x} ${to.bottom + 4}`
}

export function CrateGraph({ rows, selected, onPick, onEdit, onDelete }: Props) {
    const frame = useRef<HTMLDivElement>(null)
    const nodes = useRef(new Map<number, HTMLElement>())
    const [boxes, setBoxes] = useState(new Map<number, Box>())

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

    const edges = all.flatMap((crate) =>
        crate.depends_on.map((id) => ({
            key: `${crate.id}-${id}`,
            from: boxes.get(crate.id),
            to: boxes.get(id),
            active: selected?.id === crate.id || selected?.id === id,
        })),
    )

    const state = (crate: Crate): string => {
        if (!selected) return 'node'
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
        <div className="graph" ref={frame}>
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
                                d={curve(edge.from, edge.to)}
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
