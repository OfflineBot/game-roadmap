import type { Asset, Category, ChecklistItem, Crate, Doc, Milestone, Task } from './types'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(detail?.error ?? `${method} ${path} failed with ${response.status}`)
    }
    return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}

interface Resource<T, Create, Patch> {
    list: () => Promise<T[]>
    create: (input: Create) => Promise<{ id: number }>
    update: (id: number, patch: Patch) => Promise<void>
    remove: (id: number) => Promise<void>
    move: (id: number, to: number) => Promise<void>
}

function resource<T, Create, Patch>(path: string): Resource<T, Create, Patch> {
    return {
        list: () => request('GET', `/${path}`),
        create: (input) => request('POST', `/${path}`, input),
        update: (id, patch) => request('PATCH', `/${path}/${id}`, patch),
        remove: (id) => request('DELETE', `/${path}/${id}`),
        move: (id, to) => request('POST', `/${path}/${id}/move`, { to }),
    }
}

export interface Titled {
    title: string
    description: string
}

export const milestones = {
    ...resource<Milestone, Titled, Partial<Titled>>('milestones'),
    createTask: (milestoneId: number, input: Titled) =>
        request<{ id: number }>('POST', `/milestones/${milestoneId}/tasks`, input),
}

export const tasks = resource<Task, never, Partial<Titled> & { done?: boolean }>('tasks')

export const categories = {
    ...resource<Category, { name: string; parent_id?: number }, { name: string }>('categories'),
    createChecklistItem: (categoryId: number, label: string) =>
        request<{ id: number }>('POST', `/categories/${categoryId}/checklist`, { label }),
    createAsset: (categoryId: number, name: string) =>
        request<{ id: number }>('POST', `/categories/${categoryId}/assets`, { name }),
}

export const checklist = resource<ChecklistItem, never, { label: string }>('checklist')

export const assets = {
    ...resource<Asset, never, { name?: string; notes?: string }>('assets'),
    setCheck: (assetId: number, checklistItemId: number, checked: boolean) =>
        request<void>('PUT', `/assets/${assetId}/check`, { checklist_item_id: checklistItemId, checked }),
}

export const docs = resource<Doc, { title: string }, { title?: string; content?: string }>('documents')

export const crates = {
    list: () => request<Crate[]>('GET', '/crates'),
    create: (input: { name: string }) => request<{ id: number }>('POST', '/crates', input),
    update: (id: number, patch: { name: string }) => request<void>('PATCH', `/crates/${id}`, patch),
    remove: (id: number) => request<void>('DELETE', `/crates/${id}`),
    addImport: (id: number, importedId: number) =>
        request<void>('POST', `/crates/${id}/deps`, { depends_on_id: importedId }),
    removeImport: (id: number, importedId: number) =>
        request<void>('DELETE', `/crates/${id}/deps/${importedId}`),
}
