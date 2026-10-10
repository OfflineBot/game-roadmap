import { useRef, useState } from 'react'
import { Icon } from './Icon'

interface Props {
    label: string
    onAdd: (value: string) => void
    accent?: boolean
}

/** Stays open after Enter so several entries can be typed in a row. */
export function InlineAdd({ label, onAdd, accent }: Props) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState('')
    const input = useRef<HTMLInputElement>(null)

    if (!open) {
        return (
            <button
                type="button"
                className={accent ? 'btn accent' : 'add-link'}
                onClick={() => setOpen(true)}
            >
                <Icon name="plus" size={accent ? 16 : 14} />
                {label}
            </button>
        )
    }

    const submit = () => {
        const trimmed = value.trim()
        if (!trimmed) {
            setOpen(false)
            return
        }
        onAdd(trimmed)
        setValue('')
        input.current?.focus()
    }

    return (
        <div className="inline-add">
            <input
                ref={input}
                className="field"
                autoFocus
                placeholder={label}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') submit()
                    if (event.key === 'Escape') setOpen(false)
                }}
                onBlur={() => {
                    if (!value.trim()) setOpen(false)
                }}
            />
            <button type="button" className="btn accent" onClick={submit}>
                Add
            </button>
        </div>
    )
}
