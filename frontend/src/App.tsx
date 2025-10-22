import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import AccessLinks from '@/pages/AccessLinks'
import AccessLogs from '@/pages/AccessLogs'
import CreateLink from '@/pages/CreateLink'
import EditLink from '@/pages/EditLink'
import LinkDetails from '@/pages/LinkDetails'
import AccessPortal from '@/pages/AccessPortal'
import Settings from '@/pages/Settings'

function App() {
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
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
