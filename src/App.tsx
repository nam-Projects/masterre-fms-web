import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import LoginPage from './components/Auth/LoginPage'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import DetailPage from './components/Detail/DetailPage'
import CodeManagement from './components/Settings/CodeManagement'
import StageGuide from './components/Settings/StageGuide'
import ProfileSettings from './components/Settings/ProfileSettings'
import MyProfile from './components/Settings/MyProfile'
import MemberList from './components/Settings/MemberList'
import InviteSignUp from './components/Auth/InviteSignUp'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite" element={<InviteSignUp />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/job/:jobId" element={<DetailPage />} />
              <Route path="/settings/codes" element={<CodeManagement />} />
              <Route path="/settings/guide" element={<StageGuide />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/members" element={<MemberList />} />
              <Route path="/settings/me" element={<MyProfile />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
