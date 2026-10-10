import { Icon, type IconName } from './Icon'

interface Props {
    icon: IconName
    title: string
    onClick: () => void
    disabled?: boolean
    danger?: boolean
}

export function IconButton({ icon, title, onClick, disabled, danger }: Props) {
    return (
        <button
            type="button"
            className={danger ? 'icon-btn danger' : 'icon-btn'}
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
        >
            <Icon name={icon} />
        </button>
    )
}
