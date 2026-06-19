import { Routes, Route } from 'react-router-dom'
import { AppShell }        from './components/layout/AppShell'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage }    from './pages/SettingsPage'
import { TripHomePage }    from './pages/TripHomePage'
import { CreateTripPage }  from './pages/CreateTripPage'
import { ActivityTypePage } from './pages/ActivityTypePage'
import { ActivityFormPage } from './pages/ActivityFormPage'
import { PreviousTripsPage } from './pages/PreviousTripsPage'
import { TripDetailPage } from './pages/TripDetailPage'

function App() {
  return (
    <AppShell>
      <Routes>
        {/* Trip routes */}
        <Route path="/"             element={<TripHomePage />} />
        <Route path="/create-trip"  element={<CreateTripPage />} />

        {/* Settings */}
        <Route path="/settings"     element={<SettingsPage />} />

        {/* Phase 22–23 placeholders — reuse PlaceholderPage with descriptive title */}
        {/* IN-01: /expense removed — expense entry uses the ExpenseSheet bottom-sheet modal,
            not a routed page; no navigation call targets this route */}
        <Route path="/activity"        element={<ActivityTypePage />} />
        <Route path="/activity/:type"  element={<ActivityFormPage />} />

        {/* Phase 24 — Plans 01-02: PreviousTripsPage + TripDetailPage wired */}
        <Route path="/trips"           element={<PreviousTripsPage />} />
        <Route path="/trips/:tripId"   element={<TripDetailPage />} />

        {/* Catch-all: unknown paths show a graceful not-found page */}
        <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
      </Routes>
    </AppShell>
  )
}

export default App
