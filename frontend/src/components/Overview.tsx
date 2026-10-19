import { percent, type Part, type Progress } from '../progress'
import { ProgressBar } from './ProgressBar'

interface Props {
    value: Progress
    parts: Part[]
    note: string
}

/** The page head: the one number to read, over a bar that shows the parts. */
export function Overview({ value, parts, note }: Props) {
    return (
        <div className="overview">
            <span className={value.complete ? 'overview-percent complete' : 'overview-percent'}>
                {percent(value)}%
            </span>
            <ProgressBar value={value} parts={parts} label={false} />
            <span className="overview-note">{note}</span>
        </div>
    )
}
