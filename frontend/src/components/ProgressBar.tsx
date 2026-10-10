import type { Progress } from '../progress'

interface Props {
    value: Progress
    label?: boolean
    width?: number
}

export function ProgressBar({ value, label = true, width }: Props) {
    return (
        <div className="progress" style={width ? { width } : undefined}>
            <div className="progress-track">
                <div
                    className={value.complete ? 'progress-fill complete' : 'progress-fill'}
                    style={{ width: `${value.ratio * 100}%` }}
                />
            </div>
            {label && (
                <span className="progress-label">
                    {value.done}/{value.total}
                </span>
            )}
        </div>
    )
}
