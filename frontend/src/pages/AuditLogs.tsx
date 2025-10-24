import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogsApi, authApi } from '@/services/api'
import { AuditAction, type AuditLog } from '@/types'
import { FiCalendar, FiFilter, FiSearch, FiX } from 'react-icons/fi'

export default function AuditLogs() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [ipFilter, setIpFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showMyActionsOnly, setShowMyActionsOnly] = useState(true)
  const pageSize = 50

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
  })

  // Fetch audit logs
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'auditLogs',
      page,
      search,
      actionFilter,
      ipFilter,
      startDate,
      endDate,
      showMyActionsOnly,
    ],
    queryFn: () =>
      auditLogsApi.list({
        page,
        size: pageSize,
        search: search || undefined,
        action: actionFilter || undefined,
        ip_address: ipFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        user_id: showMyActionsOnly && currentUser ? currentUser.user_id : undefined,
      }),
    enabled: !!currentUser, // Only run query when we have the current user
  })

  const handleClearFilters = () => {
    setSearch('')
    setActionFilter('')
    setIpFilter('')
    setStartDate('')
    setEndDate('')
    setShowMyActionsOnly(true)
    setPage(1)
  }

  const hasActiveFilters =
    search || actionFilter || ipFilter || startDate || endDate || !showMyActionsOnly

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getActionBadgeColor = (action: AuditAction | string) => {
    switch (action as AuditAction) {
      case AuditAction.LINK_CREATED:
        return 'bg-green-100 text-green-800'
      case AuditAction.LINK_UPDATED:
        return 'bg-blue-100 text-blue-800'
      case AuditAction.LINK_DELETED:
        return 'bg-red-100 text-red-800'
      case AuditAction.LINK_DISABLED:
        return 'bg-orange-100 text-orange-800'
      case AuditAction.LINK_ENABLED:
        return 'bg-teal-100 text-teal-800'
      case AuditAction.LINK_CODE_REGENERATED:
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track all changes made to access links in the system
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search by link code, name, user, IP, or action..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
              hasActiveFilters
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiFilter />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                {[search, actionFilter, ipFilter, startDate, endDate].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <FiX />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="space-y-4 border-t pt-4">
            {/* My Actions Only Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-my-actions"
                checked={showMyActionsOnly}
                onChange={(e) => {
                  setShowMyActionsOnly(e.target.checked)
                  setPage(1)
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="show-my-actions" className="text-sm text-gray-700">
                My actions only
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Action Filter */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Action</label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value)
                    setPage(1)
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  <option value={AuditAction.LINK_CREATED}>Link Created</option>
                  <option value={AuditAction.LINK_UPDATED}>Link Updated</option>
                  <option value={AuditAction.LINK_DELETED}>Link Deleted</option>
                  <option value={AuditAction.LINK_DISABLED}>Link Disabled</option>
                  <option value={AuditAction.LINK_ENABLED}>Link Enabled</option>
                  <option value={AuditAction.LINK_CODE_REGENERATED}>Code Regenerated</option>
                </select>
              </div>

              {/* IP Address Filter */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">IP Address</label>
                <input
                  type="text"
                  placeholder="Filter by IP..."
                  value={ipFilter}
                  onChange={(e) => {
                    setIpFilter(e.target.value)
                    setPage(1)
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setPage(1)
                    }}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setPage(1)
                    }}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      {data && (
        <div className="text-sm text-gray-600">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.total)} of{' '}
          {data.total} entries
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to load audit logs. Please try again.
        </div>
      )}

      {/* Audit Logs Table */}
      {!isLoading && data && (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-400">
                        <p className="text-lg font-medium">No audit logs found</p>
                        <p className="mt-1 text-sm">
                          {hasActiveFilters
                            ? 'Try adjusting your filters'
                            : 'Audit logs will appear here as actions are performed'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.items.map((log: AuditLog) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {log.user_name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action_display}
                        </span>
                      </td>
                      <td className="max-w-md px-6 py-4 text-sm text-gray-900">
                        <div className="truncate">{log.summary}</div>
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                              View changes ({Object.keys(log.changes).length} field
                              {Object.keys(log.changes).length > 1 ? 's' : ''})
                            </summary>
                            <div className="mt-2 space-y-1 rounded bg-gray-50 p-2 text-xs">
                              {Object.entries(log.changes).map(([field, change]) => (
                                <div key={field} className="font-mono">
                                  <span className="font-semibold">{field}:</span>
                                  <div className="ml-4">
                                    <div className="text-red-600">
                                      - {JSON.stringify(change.old)}
                                    </div>
                                    <div className="text-green-600">
                                      + {JSON.stringify(change.new)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.link_name && <div className="font-medium">{log.link_name}</div>}
                        {log.link_code && (
                          <div className="font-mono text-xs text-gray-500">{log.link_code}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{page}</span> of{' '}
                    <span className="font-medium">{data.pages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                      disabled={page === data.pages}
                      className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
