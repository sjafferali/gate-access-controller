import { Outlet, NavLink } from 'react-router-dom'
import { FiHome, FiLink, FiFileText, FiSettings, FiActivity, FiMenu, FiX } from 'react-icons/fi'
import { useState } from 'react'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome },
  { name: 'Access Links', href: '/links', icon: FiLink },
  { name: 'Access Logs', href: '/logs', icon: FiFileText },
  { name: 'Settings', href: '/settings', icon: FiSettings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <FiSettings className="h-5 w-5 text-gray-400" />
              <span className="ml-3 text-sm text-gray-600">Admin Panel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top header */}
        <header className="bg-white shadow-sm">
          <div className="flex h-16 items-center px-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <FiMenu className="h-6 w-6 text-gray-500" />
            </button>
            <h1 className="ml-4 text-lg font-semibold text-gray-900 lg:ml-0">
              Gate Access Controller
            </h1>
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
