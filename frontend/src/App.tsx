import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import Dashboard from '@/pages/Dashboard'
import AccessLinks from '@/pages/AccessLinks'
import AccessLogs from '@/pages/AccessLogs'
import AuditLogs from '@/pages/AuditLogs'
import CreateLink from '@/pages/CreateLink'
import EditLink from '@/pages/EditLink'
import LinkDetails from '@/pages/LinkDetails'
import AccessPortal from '@/pages/AccessPortal'
import GateOpened from '@/pages/GateOpened'
import Settings from '@/pages/Settings'
import NotificationProviders from '@/pages/NotificationProviders'
import Login from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'
import { preloadLinkUrlSettings } from '@/utils/linkUrl'

function App() {
  // Preload link URL settings on app initialization
  useEffect(() => {
    void preloadLinkUrlSettings()
  }, [])

  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/l/:linkCode" element={<AccessPortal />} />
        <Route path="/gate-opened" element={<GateOpened />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected admin routes */}
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="links" element={<AccessLinks />} />
          <Route path="links/new" element={<CreateLink />} />
          <Route path="links/:linkId/edit" element={<EditLink />} />
          <Route path="links/:linkId" element={<LinkDetails />} />
          <Route path="logs" element={<AccessLogs />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="notification-providers" element={<NotificationProviders />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
