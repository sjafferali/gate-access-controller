import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiLink,
  FiFileText,
  FiSettings,
  FiActivity,
  FiMenu,
  FiX,
  FiZap,
  FiClock,
  FiUser,
} from 'react-icons/fi'
import { useState } from 'react'
import clsx from 'clsx'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { accessLinksApi } from '@/services/api'
import { useUser } from '@/hooks/useUser'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome },
  { name: 'Access Links', href: '/links', icon: FiLink },
  { name: 'Access Logs', href: '/logs', icon: FiFileText },
  { name: 'Audit Logs', href: '/audit-logs', icon: FiClock },
  { name: 'Settings', href: '/settings', icon: FiSettings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useUser()

  const quickLinkMutation = useMutation({
    mutationFn: async () => accessLinksApi.createQuickLink(),
    onSuccess: (newLink) => {
      toast.success('Quick link created successfully!')
      // Invalidate links query to refresh the list
      void queryClient.invalidateQueries({ queryKey: ['links'] })
      // Navigate to the new link's detail page
      void navigate(`/links/${newLink.id}`)
    },
    onError: () => {
      toast.error('Failed to create quick link')
    },
  })

  const handleQuickLink = () => {
    quickLinkMutation.mutate()
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <FiActivity className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Gate Access</span>
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <FiX className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary-100 text-primary-900' : 'text-gray-700 hover:bg-gray-100'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-gray-200 p-3">
            {/* Quick Link Button */}
            <button
              onClick={handleQuickLink}
              disabled={quickLinkMutation.isPending}
              className={clsx(
                'group mb-3 flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <FiZap className="mr-2 h-5 w-5" />
              {quickLinkMutation.isPending ? 'Creating...' : 'Quick Link'}
            </button>

            {/* Admin Panel Label */}
            <div className="flex items-center px-2">
              <FiSettings className="h-4 w-4 text-gray-400" />
              <span className="ml-2 text-xs text-gray-500">Admin Panel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top header */}
        <header className="bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <FiMenu className="h-6 w-6 text-gray-500" />
              </button>
              <h1 className="ml-4 text-lg font-semibold text-gray-900 lg:ml-0">
                Gate Access Controller
              </h1>
            </div>

            {/* User info */}
            {user && (
              <div className="flex items-center space-x-2 rounded-lg bg-gray-100 px-3 py-2">
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    user.is_authenticated
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-400 text-white'
                  )}
                >
                  <FiUser className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{user.display_name}</span>
                  {user.email && (
                    <span className="text-xs text-gray-500">{user.email}</span>
                  )}
                  {!user.is_authenticated && (
                    <span className="text-xs text-gray-500">(No auth)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
