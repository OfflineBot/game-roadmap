import type { Part } from '../progress'

/** One block per part, as wide as that part is big. */
export function Segments({ parts }: { parts: Part[] }) {
    return (
        <div className="segments">
            {parts.map((part) => (
                <div
                    key={part.id}
                    className="segment"
                    style={{ flexGrow: Math.max(part.value.total, 1) }}
                    title={`${part.title}: ${part.value.done}/${part.value.total}`}
                >
                    <div
                        className={part.value.complete ? 'segment-fill complete' : 'segment-fill'}
                        style={{ width: `${part.value.ratio * 100}%` }}
                    />
                </div>
            ))}
        </div>
    )
}
