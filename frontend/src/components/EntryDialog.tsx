import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { RichText } from './RichText'

export interface Entry {
    name: string
    text: string
}

interface Props {
    title: string
    nameLabel: string
    /** Omitted for plain renames, which have no rich text. */
    textLabel?: string
    value: Entry
    onSubmit: (entry: Entry) => void
    onClose: () => void
}

export function EntryDialog({ title, nameLabel, textLabel, value, onSubmit, onClose }: Props) {
    const [name, setName] = useState(value.name)
    const [text, setText] = useState(value.text)

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                if (!name.trim()) return
                onSubmit({ name: name.trim(), text })
                onClose()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [name, text, onSubmit, onClose])

    const submit = () => {
        if (!name.trim()) return
        onSubmit({ name: name.trim(), text })
        onClose()
    }

    return (
        <Modal title={title} onClose={onClose}>
            <div>
                <label className="label" htmlFor="entry-name">
                    {nameLabel}
                </label>
                <input
                    id="entry-name"
                    className="field"
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') submit()
                    }}
                />
            </div>
            {textLabel && (
                <div>
                    <span className="label">{textLabel}</span>
                    <RichText value={text} onChange={setText} />
                </div>
            )}
            <div className="dialog-actions">
                <span className="hint">Ctrl+Enter saves</span>
                <button type="button" className="btn" onClick={onClose}>
                    Cancel
                </button>
                <button type="button" className="btn accent" onClick={submit}>
                    Save
                </button>
            </div>
        </Modal>
    )
}
