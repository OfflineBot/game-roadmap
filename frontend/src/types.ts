export interface Task {
    id: number
    number: string
    title: string
    description: string
    done: boolean
}

export interface Milestone {
    id: number
    number: number
    title: string
    description: string
    tasks: Task[]
}

export interface ChecklistItem {
    id: number
    label: string
}

export interface Asset {
    id: number
    name: string
    notes: string
    checks: number[]
}

export interface Category {
    id: number
    parent_id: number | null
    name: string
    checklist: ChecklistItem[]
    assets: Asset[]
    children: Category[]
}

export interface Doc {
    id: number
    title: string
    content: string
    updated_at: string
}

export interface Bug {
    id: number
    title: string
    description: string
    fixed: boolean
    fixed_at: string | null
}

export interface Crate {
    id: number
    name: string
    depends_on: number[]
}
