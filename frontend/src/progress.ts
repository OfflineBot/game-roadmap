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

/** The one being worked on: the first milestone that is not finished. */
export function currentMilestone(milestones: Milestone[]): Milestone | undefined {
    return milestones.find((milestone) => !milestoneProgress(milestone).complete)
}

export function assetProgress(asset: Asset, checklist: ChecklistItem[]): Progress {
    return progress(asset.checks.length, checklist.length)
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
