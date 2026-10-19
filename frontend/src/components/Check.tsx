interface Props {
    checked: boolean
    title: string
    onChange: () => void
}

/** The box stays small; the label around it is what the pointer has to hit. */
export function Check({ checked, title, onChange }: Props) {
    return (
        <label className="check-hit" title={title}>
            <input type="checkbox" className="check" checked={checked} onChange={onChange} />
        </label>
    )
}
