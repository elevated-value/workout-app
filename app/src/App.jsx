import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './state/AuthProvider.jsx'
import AppShell from './components/AppShell.jsx'
import { Loading } from './components/ui.jsx'

import Login from './screens/Login.jsx'
import Home from './screens/Home.jsx'
import MonthCalendar from './screens/MonthCalendar.jsx'
import DayRecord from './screens/DayRecord.jsx'
import DayBuilder from './screens/DayBuilder.jsx'
import WorkoutLogging from './screens/WorkoutLogging.jsx'
import Library from './screens/Library.jsx'
import ExerciseForm from './screens/ExerciseForm.jsx'
import Progress from './screens/Progress.jsx'
import ExerciseProgress from './screens/ExerciseProgress.jsx'

// Every authenticated route renders inside <AppShell>, which always shows the
// bottom nav (spec §6). Login is the one exception — it is the pre-auth gate
// with no navigation destinations.
function Screen({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <AppShell>
        <Loading label="Loading" />
      </AppShell>
    )
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <AppShell>{children}</AppShell>
}

export default function App() {
  const { session, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? null : session ? <Navigate to="/" replace /> : <Login />}
      />

      <Route path="/" element={<Screen><Home /></Screen>} />
      <Route path="/library" element={<Screen><Library /></Screen>} />
      <Route path="/library/new" element={<Screen><ExerciseForm /></Screen>} />
      <Route path="/library/:id" element={<Screen><ExerciseForm /></Screen>} />
      <Route path="/progress" element={<Screen><Progress /></Screen>} />
      <Route path="/progress/:exerciseId" element={<Screen><ExerciseProgress /></Screen>} />
      <Route path="/calendar" element={<Screen><MonthCalendar /></Screen>} />
      <Route path="/day/:date" element={<Screen><DayRecord /></Screen>} />
      <Route path="/day/:date/build" element={<Screen><DayBuilder /></Screen>} />
      <Route path="/day/:date/log" element={<Screen><WorkoutLogging /></Screen>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
