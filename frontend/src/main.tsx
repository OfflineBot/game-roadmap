import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { pages } from './pages'
import './styles/theme.css'
import './styles/layout.css'
import './styles/controls.css'
import './styles/editor.css'
import './styles/content.css'
import './styles/graph.css'

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <Routes>
            <Route element={<Layout />}>
                {pages.map((page) => (
                    <Route key={page.path} path={page.path} element={page.element} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    </BrowserRouter>,
)
