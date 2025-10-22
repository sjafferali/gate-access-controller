import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { FiFilter, FiSearch, FiFileText, FiX } from 'react-icons/fi'
import { accessLogsApi } from '@/services/api'
import { AccessStatus } from '@/types'
import Pagination from '@/components/common/Pagination'
import { useDebounce } from '@/hooks/useDebounce'

export default function AccessLogs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const linkIdFromUrl = searchParams.get('linkId')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AccessStatus | ''>('')
  const [linkIdFilter, setLinkIdFilter] = useState<string | null>(linkIdFromUrl)

  // Update linkIdFilter when URL parameter changes
  useEffect(() => {
    setLinkIdFilter(linkIdFromUrl)
  }, [linkIdFromUrl])

  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300)

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, linkIdFilter])

  const { data, isLoading } = useQuery({
    queryKey: [
      'logs',
      { page, search: debouncedSearch, status: statusFilter, linkId: linkIdFilter },
    ],
    queryFn: () =>
      accessLogsApi.list({
        page,
        size: 50,
        status: statusFilter || undefined,
        link_id: linkIdFilter || undefined,
        // Use ip_address for search if it looks like an IP, otherwise leave it for backend to handle
        ip_address: debouncedSearch && debouncedSearch.includes('.') ? debouncedSearch : undefined,
      }),
  })

  const clearLinkFilter = () => {
    setLinkIdFilter(null)
    searchParams.delete('linkId')
    setSearchParams(searchParams)
  }

  const statusColors = {
    [AccessStatus.GRANTED]: 'bg-green-100 text-green-800',
    [AccessStatus.DENIED]: 'bg-red-100 text-red-800',
    [AccessStatus.ERROR]: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Access Logs</h1>
        <p className="mt-1 text-sm text-gray-500">View all gate access attempts and their status</p>
      </div>

      {linkIdFilter && (
        <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center">
            <FiFilter className="mr-2 h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-800">Showing logs for a specific link</span>
          </div>
          <button
            onClick={clearLinkFilter}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <FiX className="mr-1 h-4 w-4" />
            Clear filter
          </button>
        </div>
      )}

      <div className="card">
        <div className="mb-4 flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by IP address or link code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FiFilter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AccessStatus | '')}
              className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value={AccessStatus.GRANTED}>GRANTED</option>
              <option value={AccessStatus.DENIED}>DENIED</option>
              <option value={AccessStatus.ERROR}>ERROR</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
              <span className="ml-2 text-gray-600">Loading logs...</span>
            </div>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.items.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {format(new Date(log.accessed_at), 'MMM d, h:mm:ss a')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {log.link_name || log.link_code_used || 'Unknown'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            statusColors[log.status]
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination currentPage={page} totalPages={data.pages} onPageChange={setPage} />
          </>
        ) : (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <FiFileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No access logs yet</h3>
            <p className="text-sm text-gray-500">
              Access logs will appear here once visitors use your access links
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
