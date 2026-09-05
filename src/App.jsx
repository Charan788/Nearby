import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Discover from './pages/Discover.jsx'
import Chat from './pages/Chat.jsx'
import AdminReview from './pages/AdminReview.jsx'
import EditProfile from './pages/EditProfile.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/chat/:matchId" element={<Chat />} />
      <Route path="/admin" element={<AdminReview />} />
      <Route path="/profile/edit" element={<EditProfile />} />
    </Routes>
  )
}