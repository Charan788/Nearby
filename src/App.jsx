import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Discover from './pages/Discover.jsx'
import Chat from './pages/Chat.jsx'
import AdminReview from './pages/AdminReview.jsx'
import EditProfile from './pages/EditProfile.jsx'
import VerificationStatus from './pages/VerificationStatus.jsx'
import Matches from './pages/Matches.jsx'
import Premium from './pages/Premium.jsx'
import Pricing from './pages/Pricing.jsx'
import Invite from './pages/Invite.jsx'
import Join from './pages/Join.jsx'
import Help from './pages/Help.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/join" element={<Join />} />
      <Route path="/status" element={<VerificationStatus />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/chat/:matchId" element={<Chat />} />
      <Route path="/admin" element={<AdminReview />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/invite" element={<Invite />} />
      <Route path="/help" element={<Help />} />
    </Routes>
  )
}
