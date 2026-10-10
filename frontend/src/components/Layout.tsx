import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { accentStyle, pages } from '../pages'

export function Layout() {
    const { pathname } = useLocation()
    const current = pages.find((page) => page.path === pathname) ?? pages[0]

    return (
        <div className="app" style={accentStyle(current.accent)}>
            <nav className="sidebar">
                <div className="sidebar-title">Game Roadmap</div>
                {pages.map((page) => (
                    <NavLink
                        key={page.path}
                        to={page.path}
                        end
                        style={accentStyle(page.accent)}
                        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                    >
                        <span className="nav-dot" />
                        {page.label}
                    </NavLink>
                ))}
            </nav>
            <main className="main">
                <Outlet />
            </main>
        </div>
    )
}
