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

function RequireAuth({ children }) {
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
  return children
}

export default function App() {
  const { session, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? null : session ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell nav>
              <Home />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/library"
        element={
          <RequireAuth>
            <AppShell nav>
              <Library />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/progress"
        element={
          <RequireAuth>
            <AppShell nav>
              <Progress />
            </AppShell>
          </RequireAuth>
        }
      />

      <Route
        path="/calendar"
        element={
          <RequireAuth>
            <AppShell>
              <MonthCalendar />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/day/:date"
        element={
          <RequireAuth>
            <AppShell>
              <DayRecord />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/day/:date/build"
        element={
          <RequireAuth>
            <AppShell>
              <DayBuilder />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/day/:date/log"
        element={
          <RequireAuth>
            <AppShell>
              <WorkoutLogging />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/library/new"
        element={
          <RequireAuth>
            <AppShell>
              <ExerciseForm />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/library/:id"
        element={
          <RequireAuth>
            <AppShell>
              <ExerciseForm />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/progress/:exerciseId"
        element={
          <RequireAuth>
            <AppShell>
              <ExerciseProgress />
            </AppShell>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
