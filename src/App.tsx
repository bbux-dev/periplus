import { Routes, Route } from 'react-router-dom'
import { AppShell }        from './components/layout/AppShell'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage }    from './pages/SettingsPage'
import { TripHomePage }    from './pages/TripHomePage'
import { CreateTripPage }  from './pages/CreateTripPage'
import { ActivityTypePage } from './pages/ActivityTypePage'

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
        <Route path="/expense"         element={<PlaceholderPage title="Log Expense" />} />
        <Route path="/activity"        element={<ActivityTypePage />} />
        <Route path="/activity/:type"  element={<PlaceholderPage title="Activity Form" />} />

        {/* Phase 24 placeholders */}
        <Route path="/trips"           element={<PlaceholderPage title="Previous Trips" />} />
        <Route path="/trips/:tripId"   element={<PlaceholderPage title="Trip Detail" />} />

        {/* Catch-all: unknown paths show a graceful not-found page */}
        <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
      </Routes>
    </AppShell>
  )
}

export default App
