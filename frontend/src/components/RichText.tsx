import { Color, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon'

const extensions = [StarterKit, TextStyle, Color]

const swatches = ['--red', '--peach', '--yellow', '--green', '--blue', '--mauve']

// Colors are stored as resolved hex values, so the palette stays the only
// place they are defined.
function cssValue(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface ToolProps {
    label: ReactNode
    title: string
    on: boolean
    run: () => void
}

function Toolbar({ editor }: { editor: Editor }) {
    const chain = () => editor.chain().focus()

    const headings: ToolProps[] = ([1, 2, 3] as const).map((level) => ({
        label: `H${level}`,
        title: `Heading ${level}`,
        on: editor.isActive('heading', { level }),
        run: () => chain().toggleHeading({ level }).run(),
    }))

    const marks: ToolProps[] = [
        { label: <b>B</b>, title: 'Bold', on: editor.isActive('bold'), run: () => chain().toggleBold().run() },
        { label: <i>I</i>, title: 'Italic', on: editor.isActive('italic'), run: () => chain().toggleItalic().run() },
        { label: <s>S</s>, title: 'Strike', on: editor.isActive('strike'), run: () => chain().toggleStrike().run() },
        { label: '</>', title: 'Code', on: editor.isActive('code'), run: () => chain().toggleCode().run() },
    ]

    const blocks: ToolProps[] = [
        {
            label: '•',
            title: 'Bullet list',
            on: editor.isActive('bulletList'),
            run: () => chain().toggleBulletList().run(),
        },
        {
            label: '1.',
            title: 'Numbered list',
            on: editor.isActive('orderedList'),
            run: () => chain().toggleOrderedList().run(),
        },
        {
            label: '❝',
            title: 'Quote',
            on: editor.isActive('blockquote'),
            run: () => chain().toggleBlockquote().run(),
        },
    ]

    const groups = [headings, marks, blocks]

    return (
        <div className="editor-bar">
            {groups.map((group, index) => (
                <Group key={index} tools={group} separator={index > 0} />
            ))}
            <span className="editor-sep" />
            {swatches.map((name) => (
                <button
                    key={name}
                    type="button"
                    className="swatch"
                    title={`Color ${name.slice(2)}`}
                    style={{ '--swatch': `var(${name})` } as CSSProperties}
                    onClick={() => chain().setColor(cssValue(name)).run()}
                >
                    <span />
                </button>
            ))}
            <button type="button" title="Remove color" onClick={() => chain().unsetColor().run()}>
                <Icon name="reset" size={14} />
            </button>
        </div>
    )
}

function Group({ tools, separator }: { tools: ToolProps[]; separator: boolean }) {
    return (
        <>
            {separator && <span className="editor-sep" />}
            {tools.map((tool) => (
                <button
                    key={tool.title}
                    type="button"
                    title={tool.title}
                    className={tool.on ? 'on' : undefined}
                    onClick={tool.run}
                >
                    {tool.label}
                </button>
            ))}
        </>
    )
}

interface Props {
    value: string
    onChange: (html: string) => void
}

export function RichText({ value, onChange }: Props) {
    const editor = useEditor({
        extensions,
        content: value,
        shouldRerenderOnTransaction: true,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    })

    if (!editor) return null

    return (
        <div className="editor">
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}
