interface Props {
    html: string
    compact?: boolean
}

function isEmpty(html: string): boolean {
    return html.replace(/<p>\s*<\/p>/g, '').trim() === ''
}

export function RichTextView({ html, compact }: Props) {
    if (isEmpty(html)) return null
    // The HTML is produced by this app's own editor; there is no foreign input.
    return <div className={compact ? 'prose compact' : 'prose'} dangerouslySetInnerHTML={{ __html: html }} />
}
