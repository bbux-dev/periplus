import { Routes, Route } from 'react-router-dom'
import { DashboardPage }   from './pages/DashboardPage'
import { DomainPage }      from './pages/DomainPage'
import { CaptureUrlPage }  from './pages/CaptureUrlPage'
import { ReviewPage }      from './pages/ReviewPage'
import { ManualEntryPage } from './pages/ManualEntryPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

function App() {
  return (
    <Routes>
      {/* Phase 3 — real content */}
      <Route path="/"              element={<DashboardPage />} />
      <Route path="/d/:domain"     element={<DomainPage />} />

      {/* Phase 4 — URL Capture (default) + Review */}
      <Route path="/d/:domain/:type"         element={<CaptureUrlPage />} />
      <Route path="/d/:domain/:type/review"  element={<ReviewPage />} />

      {/* Phase 5 — Manual Entry */}
      <Route path="/d/:domain/:type/manual"  element={<ManualEntryPage />} />

      {/* Phase 6 stubs — Entry List + Detail */}
      <Route path="/entries"    element={<PlaceholderPage title="Entry List" />} />
      <Route path="/entries/:id" element={<PlaceholderPage title="Entry Detail" />} />

      {/* Catch-all: unknown paths show a graceful not-found page */}
      <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
    </Routes>
  )
}

export default App
