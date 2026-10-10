import { Modal } from './Modal'

interface Props {
    title: string
    message: string
    onConfirm: () => void
    onClose: () => void
}

export function ConfirmDialog({ title, message, onConfirm, onClose }: Props) {
    return (
        <Modal title={title} onClose={onClose}>
            <p className="muted" style={{ margin: 0 }}>
                {message}
            </p>
            <div className="dialog-actions">
                <button type="button" className="btn" onClick={onClose}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn danger"
                    onClick={() => {
                        onConfirm()
                        onClose()
                    }}
                >
                    Delete
                </button>
            </div>
        </Modal>
    )
}
