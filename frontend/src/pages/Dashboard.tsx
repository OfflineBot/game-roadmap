import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import { Icon } from '../components/Icon'
import { Overview } from '../components/Overview'
import { Page } from '../components/Page'
import { ProgressBar } from '../components/ProgressBar'
import { dependencyCount, importCounts } from '../graph'
import { useResource } from '../hooks/useResource'
import { accentStyle, pages, type PageRoute } from '../pages'
import {
    assetParts,
    categoriesProgress,
    categoryParts,
    categoryProgress,
    currentMilestone,
    milestoneParts,
    milestoneProgress,
    milestonesProgress,
    taskParts,
    tasksProgress,
} from '../progress'

function card(path: string): PageRoute {
    return pages.find((page) => page.path === path) ?? pages[0]
}

function DashCard({ page, children }: { page: PageRoute; children: ReactNode }) {
    return (
        <section className="card dash-card" style={accentStyle(page.accent)}>
            <Link to={page.path} className="dash-card-title">
                {page.label}
                <Icon name="right" size={13} />
            </Link>
            {children}
        </section>
    )
}

export function Dashboard() {
    const milestones = useResource(api.milestones.list)
    const categories = useResource(api.categories.list)
    const documents = useResource(api.docs.list)
    const crates = useResource(api.crates.list)
    const bugs = useResource(api.bugs.list)

    const allMilestones = milestones.data ?? []
    const allCategories = categories.data ?? []
    const allDocuments = documents.data ?? []
    const allCrates = crates.data ?? []
    const openBugs = (bugs.data ?? []).filter((bug) => !bug.fixed)
    const fixedBugs = (bugs.data ?? []).filter((bug) => bug.fixed)

    const current = currentMilestone(allMilestones)
    const allTasks = tasksProgress(allMilestones)
    const reached = milestonesProgress(allMilestones)
    const checks = categoriesProgress(allCategories)
    const openTasks = allMilestones.reduce(
        (total, milestone) => total + milestone.tasks.filter((task) => !task.done).length,
        0,
    )

    return (
        <Page
            title="Dashboard"
            error={
                milestones.error ?? categories.error ?? documents.error ?? crates.error ?? bugs.error
            }
        >
            <div className="dash-grid">
                <DashCard page={card('/milestones')}>
                    <Overview
                        value={allTasks}
                        parts={milestoneParts(allMilestones)}
                        note={`${reached.done}/${reached.total} milestones`}
                    />
                    {current ? (
                        <>
                            <div className="dash-row">
                                <span className="name">
                                    Milestone {current.number} - {current.title}
                                </span>
                                <ProgressBar
                                    value={milestoneProgress(current)}
                                    parts={taskParts(current)}
                                    width={240}
                                />
                            </div>
                            {current.tasks
                                .filter((task) => !task.done)
                                .slice(0, 3)
                                .map((task) => (
                                    <div className="dash-row" key={task.id}>
                                        <span className="dim">{task.number}</span>
                                        <span className="name muted">{task.title}</span>
                                    </div>
                                ))}
                            <div className="dash-row dim">{openTasks} open tasks in total</div>
                        </>
                    ) : (
                        <div className="dash-row dim">
                            {allMilestones.length === 0 ? 'No milestones yet.' : 'Everything done.'}
                        </div>
                    )}
                </DashCard>

                <DashCard page={card('/items')}>
                    <Overview
                        value={checks}
                        parts={categoryParts(allCategories)}
                        note={`${checks.done}/${checks.total} checks`}
                    />
                    {allCategories.map((category) => (
                        <div className="dash-row" key={category.id}>
                            <span className="name">{category.name}</span>
                            <ProgressBar
                                value={categoryProgress(category)}
                                parts={assetParts(category)}
                                width={240}
                            />
                        </div>
                    ))}
                    {allCategories.length === 0 && <div className="dash-row dim">No categories yet.</div>}
                </DashCard>

                <DashCard page={card('/crates')}>
                    <div className="overview">
                        <span className="overview-number">{allCrates.length}</span>
                        <span className="overview-note">
                            crates, {dependencyCount(allCrates)} imports
                        </span>
                    </div>
                    {importCounts(allCrates)
                        .filter((entry) => entry.count > 0)
                        .slice(0, 3)
                        .map(({ crate, count }) => (
                            <div className="dash-row" key={crate.id}>
                                <span className="name">{crate.name}</span>
                                <span className="dim">imported by {count}</span>
                            </div>
                        ))}
                    {allCrates.length === 0 && <div className="dash-row dim">No crates yet.</div>}
                </DashCard>

                <DashCard page={card('/bugs')}>
                    <div className="overview">
                        <span className="overview-number">{openBugs.length}</span>
                        <span className="overview-note">
                            {openBugs.length === 1 ? 'open bug' : 'open bugs'}
                        </span>
                    </div>
                    {openBugs.slice(0, 3).map((bug) => (
                        <div className="dash-row" key={bug.id}>
                            <span className="name">{bug.title}</span>
                        </div>
                    ))}
                    {openBugs.length > 3 && (
                        <div className="dash-row dim">{openBugs.length - 3} more open</div>
                    )}
                    {fixedBugs.length > 0 && (
                        <div className="dash-row dim">{fixedBugs.length} fixed in the archive</div>
                    )}
                </DashCard>

                <DashCard page={card('/docs')}>
                    {allDocuments.map((document) => (
                        <div className="dash-row" key={document.id}>
                            <span className="name">{document.title}</span>
                            <span className="dim">{document.updated_at.slice(0, 10)}</span>
                        </div>
                    ))}
                    {allDocuments.length === 0 && <div className="dash-row dim">No pages yet.</div>}
                </DashCard>
            </div>
        </Page>
    )
}
