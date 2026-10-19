import type { Asset, Category, ChecklistItem, Milestone } from './types'

export interface Progress {
    done: number
    total: number
    ratio: number
    complete: boolean
}

export function progress(done: number, total: number): Progress {
    return { done, total, ratio: total === 0 ? 0 : done / total, complete: total > 0 && done === total }
}

/** A named piece of a progress: one task, one asset, one milestone. */
export interface Part {
    id: number
    title: string
    value: Progress
}

export function percent(value: Progress): number {
    return Math.round(value.ratio * 100)
}

function sum(parts: Progress[]): Progress {
    return progress(
        parts.reduce((total, part) => total + part.done, 0),
        parts.reduce((total, part) => total + part.total, 0),
    )
}

export function milestoneProgress(milestone: Milestone): Progress {
    return progress(milestone.tasks.filter((task) => task.done).length, milestone.tasks.length)
}

export function milestonesProgress(milestones: Milestone[]): Progress {
    return progress(milestones.filter((m) => milestoneProgress(m).complete).length, milestones.length)
}

/** Every task of the roadmap, which moves long before a whole milestone does. */
export function tasksProgress(milestones: Milestone[]): Progress {
    return sum(milestones.map(milestoneProgress))
}

/** The one being worked on: the first milestone that is not finished. */
export function currentMilestone(milestones: Milestone[]): Milestone | undefined {
    return milestones.find((milestone) => !milestoneProgress(milestone).complete)
}

export function taskParts(milestone: Milestone): Part[] {
    return milestone.tasks.map((task) => ({
        id: task.id,
        title: `${task.number} ${task.title}`,
        value: progress(task.done ? 1 : 0, 1),
    }))
}

export function milestoneParts(milestones: Milestone[]): Part[] {
    return milestones.map((milestone) => ({
        id: milestone.id,
        title: `Milestone ${milestone.number} - ${milestone.title}`,
        value: milestoneProgress(milestone),
    }))
}

export function assetProgress(asset: Asset, checklist: ChecklistItem[]): Progress {
    return progress(asset.checks.length, checklist.length)
}

/** Assets of a category and of its subcategories, each one a part. */
export function assetParts(category: Category, checklist = category.checklist): Part[] {
    return [
        ...category.assets.map((asset) => ({
            id: asset.id,
            title: asset.name,
            value: assetProgress(asset, checklist),
        })),
        ...category.children.flatMap((child) => assetParts(child, checklist)),
    ]
}

export function categoryParts(categories: Category[]): Part[] {
    return categories.map((category) => ({
        id: category.id,
        title: category.name,
        value: categoryProgress(category),
    }))
}

/** Assets of a category and of its subcategories, measured against the top-level checklist. */
export function categoryProgress(category: Category, checklist = category.checklist): Progress {
    return sum([
        ...category.assets.map((asset) => assetProgress(asset, checklist)),
        ...category.children.map((child) => categoryProgress(child, checklist)),
    ])
}

export function categoriesProgress(categories: Category[]): Progress {
    return sum(categories.map((category) => categoryProgress(category)))
}

export function countAssets(category: Category): number {
    return category.assets.length + category.children.reduce((total, child) => total + countAssets(child), 0)
}
