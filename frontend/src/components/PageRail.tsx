import type { Progress } from '../progress'
import { ProgressBar } from './ProgressBar'

export interface RailEntry {
    /** id of the card this entry jumps to */
    id: string
    note?: string
    label: string
    progress: Progress
}

/** Second sidebar: an overview of the page that doubles as a jump list. */
export function PageRail({ title, entries }: { title: string; entries: RailEntry[] }) {
    if (entries.length < 2) return null

    return (
        <aside className="rail">
            <div className="rail-title">{title}</div>
            {entries.map((entry) => (
                <button
                    key={entry.id}
                    type="button"
                    className="rail-item"
                    onClick={() =>
                        document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                >
                    <span className="rail-head">
                        {entry.note && <span className="rail-note">{entry.note}</span>}
                        <span className="rail-name">{entry.label}</span>
                        <span className="progress-label">
                            {entry.progress.done}/{entry.progress.total}
                        </span>
                    </span>
                    <ProgressBar value={entry.progress} label={false} />
                </button>
            ))}
        </aside>
    )
}
