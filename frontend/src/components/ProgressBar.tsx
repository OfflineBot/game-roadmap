import { percent, type Part, type Progress } from '../progress'
import { Segments } from './Segments'

interface Props {
    value: Progress
    /** Shown as one block per part where they still fit, as one bar where they do not. */
    parts?: Part[]
    label?: boolean
    width?: number
}

/** Below this a block is a hairline that says nothing. */
const SEGMENT_SPACE = 12

export function ProgressBar({ value, parts = [], label = true, width }: Props) {
    const split = parts.length > 0 && parts.length * SEGMENT_SPACE <= (width ?? Infinity)

    return (
        <div className="progress" style={width ? { width } : undefined}>
            {/* Nothing done reads as nothing, which keeps long untouched lists quiet. */}
            {label && <span className="progress-percent">{value.done > 0 ? `${percent(value)}%` : ''}</span>}
            {split ? (
                <Segments parts={parts} />
            ) : (
                <div className="progress-track">
                    <div
                        className={value.complete ? 'progress-fill complete' : 'progress-fill'}
                        style={{ width: `${value.ratio * 100}%` }}
                    />
                </div>
            )}
            {label && (
                <span className="progress-label">
                    {value.done}/{value.total}
                </span>
            )}
        </div>
    )
}
