import { Routes, Route } from 'react-router-dom'
import { DashboardPage }   from './pages/DashboardPage'
import { DomainPage }      from './pages/DomainPage'
import { EntryTypePage }   from './pages/EntryTypePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

function App() {
  return (
    <Routes>
      {/* Phase 3 — real content */}
      <Route path="/"              element={<DashboardPage />} />
      <Route path="/d/:domain"     element={<DomainPage />} />
      <Route path="/d/:domain/:type" element={<EntryTypePage />} />

      {/* Phase 4 stubs — URL Capture + Review */}
      <Route path="/d/:domain/:type/capture" element={<PlaceholderPage title="URL Capture" />} />
      <Route path="/d/:domain/:type/review"  element={<PlaceholderPage title="Review" />} />

      {/* Phase 5 stub — Manual Entry */}
      <Route path="/d/:domain/:type/manual"  element={<PlaceholderPage title="Manual Entry" />} />

      {/* Phase 6 stubs — Entry List + Detail */}
      <Route path="/entries"    element={<PlaceholderPage title="Entry List" />} />
      <Route path="/entries/:id" element={<PlaceholderPage title="Entry Detail" />} />
    </Routes>
  )
}

export default App
