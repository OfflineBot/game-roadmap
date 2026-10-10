import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { ProgressBar } from '../components/ProgressBar'
import { useResource } from '../hooks/useResource'
import { accentStyle, pages, type PageRoute } from '../pages'
import { activeMilestone, categoriesProgress, categoryProgress, milestoneProgress, milestonesProgress } from '../progress'

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

    const allMilestones = milestones.data ?? []
    const allCategories = categories.data ?? []
    const allDocuments = documents.data ?? []

    const current = activeMilestone(allMilestones)
    const openTasks = allMilestones.reduce(
        (total, milestone) => total + milestone.tasks.filter((task) => !task.done).length,
        0,
    )

    return (
        <Page title="Dashboard" error={milestones.error ?? categories.error ?? documents.error}>
            <div className="dash-grid">
                <DashCard page={card('/milestones')}>
                    <div className="dash-row">
                        <span className="name muted">Milestones done</span>
                        <ProgressBar value={milestonesProgress(allMilestones)} width={150} />
                    </div>
                    {current ? (
                        <>
                            <div className="dash-row">
                                <span className="name">
                                    Milestone {current.number} - {current.title}
                                </span>
                                <ProgressBar value={milestoneProgress(current)} width={150} />
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
                    <div className="dash-row">
                        <span className="name muted">Assets complete</span>
                        <ProgressBar value={categoriesProgress(allCategories)} width={150} />
                    </div>
                    {allCategories.map((category) => (
                        <div className="dash-row" key={category.id}>
                            <span className="name">{category.name}</span>
                            <ProgressBar value={categoryProgress(category)} width={150} />
                        </div>
                    ))}
                    {allCategories.length === 0 && <div className="dash-row dim">No categories yet.</div>}
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
