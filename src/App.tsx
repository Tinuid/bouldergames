import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Home from './routes/Home'
import CreateSession from './routes/CreateSession'
import JoinSession from './routes/JoinSession'
import SessionView from './routes/SessionView'
import SessionLeaderboard from './routes/SessionLeaderboard'
import FeedbackList from './routes/FeedbackList'
import GymMap from './routes/GymMap'

export default function App() {
  const { loading, error } = useAuth()

  if (error) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-3 p-6">
        <h1 className="font-display text-xl font-bold text-bad">Verbindung fehlgeschlagen</h1>
        <p className="text-muted">{error}</p>
        <button className="btn-primary" onClick={() => location.reload()}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="flex min-h-full items-center justify-center p-6 text-muted">Lädt …</div>
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateSession />} />
      <Route path="/join" element={<JoinSession />} />
      <Route path="/join/:code" element={<JoinSession />} />
      <Route path="/s/:sessionId" element={<SessionView />} />
      <Route path="/s/:sessionId/rangliste" element={<SessionLeaderboard />} />
      <Route path="/karte" element={<GymMap />} />
      <Route path="/feedback" element={<FeedbackList />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
