import { lazy, Suspense } from 'react'
import App from './App.jsx'

// The quest book editor lives at /#/editor as its own chunk, so the public site's bundle is unchanged.
// The page is noindex and everything it shows is fetched from Honbu behind a password login.
const EditorApp = lazy(() => import('./editor/EditorApp.jsx'))

export default function Root() {
  if (!window.location.hash.startsWith('#/editor')) return <App />
  return <Suspense fallback={null}><EditorApp /></Suspense>
}
