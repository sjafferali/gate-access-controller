import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import AccessLinks from '@/pages/AccessLinks'
import AccessLogs from '@/pages/AccessLogs'
import AuditLogs from '@/pages/AuditLogs'
import CreateLink from '@/pages/CreateLink'
import EditLink from '@/pages/EditLink'
import LinkDetails from '@/pages/LinkDetails'
import AccessPortal from '@/pages/AccessPortal'
import Settings from '@/pages/Settings'
import { preloadLinkUrlSettings } from '@/utils/linkUrl'

function App() {
  // Preload link URL settings on app initialization
  useEffect(() => {
    void preloadLinkUrlSettings()
  }, [])

  return (
    <Routes>
      {/* Public route for accessing links */}
      <Route path="/access/:linkCode" element={<AccessPortal />} />

      {/* Admin routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="links" element={<AccessLinks />} />
        <Route path="links/new" element={<CreateLink />} />
        <Route path="links/:linkId/edit" element={<EditLink />} />
        <Route path="links/:linkId" element={<LinkDetails />} />
        <Route path="logs" element={<AccessLogs />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
