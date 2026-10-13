import { useState } from 'react'
import * as api from '../api'
import { EntryDialog, type Entry } from '../components/EntryDialog'
import { Icon } from '../components/Icon'
import { InlineAdd } from '../components/InlineAdd'
import { Page } from '../components/Page'
import { PageRail } from '../components/PageRail'
import { ProgressBar } from '../components/ProgressBar'
import { RichTextView } from '../components/RichTextView'
import { RowActions } from '../components/RowActions'
import { useConfirmDelete } from '../hooks/useConfirmDelete'
import { useResource } from '../hooks/useResource'
import { useSortable, type SortableList } from '../hooks/useSortable'
import { assetProgress, categoriesProgress, categoryProgress, countAssets } from '../progress'
import type { Asset, Category, ChecklistItem } from '../types'

function assetCount(category: Category): string {
    const count = countAssets(category)
    return count === 1 ? '1 asset' : `${count} assets`
}

type Editing =
    | { kind: 'category'; category: Category }
    | { kind: 'todo'; item: ChecklistItem }
    | { kind: 'asset'; asset: Asset }

interface AssetHandlers {
    onCheck: (asset: Asset, itemId: number, checked: boolean) => void
    onEdit: (asset: Asset) => void
    onDelete: (asset: Asset) => void
}

interface AssetTableProps extends AssetHandlers {
    assets: SortableList<Asset>
    checklist: ChecklistItem[]
    onAdd: (name: string) => void
}

function AssetTable({ assets, checklist, onAdd, onCheck, onEdit, onDelete }: AssetTableProps) {
    return (
        <>
            {assets.items.length > 0 && (
                <div className="table-scroll">
                <table className="items-table">
                    <thead>
                        <tr>
                            <th>Asset</th>
                            {checklist.map((item) => (
                                <th key={item.id} className="check-col">
                                    {item.label}
                                </th>
                            ))}
                            <th className="progress-col">Done</th>
                            <th className="actions-col" />
                        </tr>
                    </thead>
                    <tbody>
                        {assets.items.map((asset, index) => (
                            <tr key={asset.id} className="hoverable" {...assets.row(index)}>
                                <td>
                                    <button type="button" className="title" onClick={() => onEdit(asset)}>
                                        {asset.name}
                                    </button>
                                    <RichTextView html={asset.notes} compact />
                                </td>
                                {checklist.map((item) => {
                                    const checked = asset.checks.includes(item.id)
                                    return (
                                        <td key={item.id} className="check-col">
                                            <input
                                                type="checkbox"
                                                className="check"
                                                title={item.label}
                                                checked={checked}
                                                onChange={() => onCheck(asset, item.id, !checked)}
                                            />
                                        </td>
                                    )
                                })}
                                <td className="progress-col">
                                    {checklist.length > 0 ? (
                                        <ProgressBar value={assetProgress(asset, checklist)} />
                                    ) : (
                                        <span className="dim">no todos yet</span>
                                    )}
                                </td>
                                <td className="actions-col">
                                    <RowActions
                                        name="asset"
                                        handle={assets.handle}
                                        onEdit={() => onEdit(asset)}
                                        onDelete={() => onDelete(asset)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
            <InlineAdd label="asset" onAdd={onAdd} />
        </>
    )
}

export function Items() {
    const { data, error, run } = useResource(api.categories.list)
    const [editing, setEditing] = useState<Editing | null>(null)
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
    const remove = useConfirmDelete()

    const categories = data ?? []
    const sort = useSortable()
    const order = sort.list('categories', categories, (from, to) =>
        run(() => api.categories.move(categories[from].id, to)),
    )
    const assetsOf = (category: Category) =>
        sort.list(`assets-${category.id}`, category.assets, (from, to) =>
            run(() => api.assets.move(category.assets[from].id, to)),
        )

    const handlers: AssetHandlers = {
        onCheck: (asset, itemId, checked) => run(() => api.assets.setCheck(asset.id, itemId, checked)),
        onEdit: (asset) => setEditing({ kind: 'asset', asset }),
        onDelete: (asset) =>
            remove.ask({
                what: 'asset',
                name: asset.name,
                confirm: () => run(() => api.assets.remove(asset.id)),
            }),
    }

    const save = (entry: Entry) => {
        if (!editing) return
        switch (editing.kind) {
            case 'category':
                return run(() => api.categories.update(editing.category.id, { name: entry.name }))
            case 'todo':
                return run(() => api.checklist.update(editing.item.id, { label: entry.name }))
            case 'asset':
                return run(() => api.assets.update(editing.asset.id, { name: entry.name, notes: entry.text }))
        }
    }

    const removeCategory = (category: Category, what: string) =>
        remove.ask({
            what,
            name: category.name,
            confirm: () => run(() => api.categories.remove(category.id)),
        })

    return (
        <Page
            title="Item Track List"
            error={error}
            head={
                <>
                    <ProgressBar value={categoriesProgress(categories)} width={240} />
                    <span className="spacer" />
                    <InlineAdd
                        label="category"
                        accent
                        onAdd={(name) => run(() => api.categories.create({ name }))}
                    />
                </>
            }
            rail={
                <PageRail
                    title="Categories"
                    entries={categories.map((category) => ({
                        id: `category-${category.id}`,
                        label: category.name,
                        progress: categoryProgress(category),
                    }))}
                />
            }
        >
            <div className="stack">
                {order.items.map((category, index) => {
                    const open = !collapsed[category.id]
                    const children = sort.list(`children-${category.id}`, category.children, (from, to) =>
                        run(() => api.categories.move(category.children[from].id, to)),
                    )

                    return (
                    <section
                        className="card"
                        key={category.id}
                        id={`category-${category.id}`}
                        {...order.row(index)}
                    >
                        <div className="card-head hoverable">
                            <button
                                type="button"
                                className="icon-btn"
                                title={open ? 'Collapse' : 'Expand'}
                                onClick={() => setCollapsed({ ...collapsed, [category.id]: open })}
                            >
                                <Icon name={open ? 'down' : 'right'} />
                            </button>
                            <button
                                type="button"
                                className="title"
                                onClick={() => setEditing({ kind: 'category', category })}
                            >
                                {category.name}
                            </button>
                            <span className="dim">{assetCount(category)}</span>
                            <RowActions
                                name="category"
                                handle={order.handle}
                                onEdit={() => setEditing({ kind: 'category', category })}
                                onDelete={() => removeCategory(category, 'category')}
                            />
                            <span className="spacer" />
                            <ProgressBar value={categoryProgress(category)} width={220} />
                        </div>

                        {open && (
                        <div className="card-body stack">
                            <div className="chips">
                                <span className="dim">Todos</span>
                                {category.checklist.map((item) => (
                                    <span className="chip" key={item.id}>
                                        <button
                                            type="button"
                                            className="chip-name"
                                            onClick={() => setEditing({ kind: 'todo', item })}
                                        >
                                            {item.label}
                                        </button>
                                        <button
                                            type="button"
                                            className="chip-x"
                                            title={`Delete todo ${item.label}`}
                                            onClick={() =>
                                                remove.ask({
                                                    what: 'todo',
                                                    name: item.label,
                                                    confirm: () => run(() => api.checklist.remove(item.id)),
                                                })
                                            }
                                        >
                                            <Icon name="close" size={12} />
                                        </button>
                                    </span>
                                ))}
                                <InlineAdd
                                    label="todo"
                                    onAdd={(label) => run(() => api.categories.createChecklistItem(category.id, label))}
                                />
                            </div>

                            <AssetTable
                                assets={assetsOf(category)}
                                checklist={category.checklist}
                                onAdd={(name) => run(() => api.categories.createAsset(category.id, name))}
                                {...handlers}
                            />

                            {children.items.map((child, childIndex) => (
                                <div className="subcategory" key={child.id} {...children.row(childIndex)}>
                                    <div className="subcategory-head hoverable">
                                        <span className="tag">Subcategory</span>
                                        <button
                                            type="button"
                                            className="title"
                                            onClick={() => setEditing({ kind: 'category', category: child })}
                                        >
                                            {child.name}
                                        </button>
                                        <RowActions
                                            name="subcategory"
                                            handle={children.handle}
                                            onEdit={() => setEditing({ kind: 'category', category: child })}
                                            onDelete={() => removeCategory(child, 'subcategory')}
                                        />
                                        <span className="spacer" />
                                        <ProgressBar value={categoryProgress(child, category.checklist)} width={220} />
                                    </div>
                                    <AssetTable
                                        assets={assetsOf(child)}
                                        checklist={category.checklist}
                                        onAdd={(name) => run(() => api.categories.createAsset(child.id, name))}
                                        {...handlers}
                                    />
                                </div>
                            ))}

                            <InlineAdd
                                label="subcategory"
                                onAdd={(name) => run(() => api.categories.create({ name, parent_id: category.id }))}
                            />
                        </div>
                        )}
                    </section>
                    )
                })}

                {data && categories.length === 0 && (
                    <div className="empty">No categories yet. Add one above, for example "Tools".</div>
                )}
            </div>

            {editing && (
                <EntryDialog
                    title={
                        editing.kind === 'asset'
                            ? `Edit ${editing.asset.name}`
                            : editing.kind === 'todo'
                              ? 'Rename todo'
                              : 'Rename category'
                    }
                    nameLabel="Name"
                    textLabel={editing.kind === 'asset' ? 'Notes' : undefined}
                    value={
                        editing.kind === 'asset'
                            ? { name: editing.asset.name, text: editing.asset.notes }
                            : editing.kind === 'todo'
                              ? { name: editing.item.label, text: '' }
                              : { name: editing.category.name, text: '' }
                    }
                    onSubmit={save}
                    onClose={() => setEditing(null)}
                />
            )}
            {remove.dialog}
        </Page>
    )
}
