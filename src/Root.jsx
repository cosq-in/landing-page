import { lazy, Suspense } from 'react'
import App from './App.jsx'

// The quest book editor (/#/editor) and the admin panel (/#/admin) are their own chunks, so the public site's bundle is unchanged.
// The page is noindex and everything it shows is fetched from Honbu behind a password login.
const EditorApp = lazy(() => import('./editor/EditorApp.jsx'))

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

export default function Root() {
  const hash = window.location.hash
  if (hash.startsWith('#/admin')) return <Suspense fallback={null}><AdminApp /></Suspense>
  if (hash.startsWith('#/editor')) return <Suspense fallback={null}><EditorApp /></Suspense>
  return <App />
}
