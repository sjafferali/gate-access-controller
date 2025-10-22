import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi'
import { accessLinksApi } from '@/services/api'
import { LinkStatus } from '@/types'
import LinksList from '@/components/links/LinksList'
import Pagination from '@/components/common/Pagination'
import { useDebounce } from '@/hooks/useDebounce'

export default function AccessLinks() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LinkStatus | ''>('')

  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300)

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  const { data, isLoading, error } = useQuery({
    queryKey: ['links', { page, search: debouncedSearch, status: statusFilter }],
    queryFn: () =>
      accessLinksApi.list({
        page,
        size: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Links</h1>
          <p className="mt-1 text-sm text-gray-500">Manage temporary access links for your gate</p>
        </div>
        <Link
          to="/links/new"
          className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:px-4 sm:py-2"
        >
          <FiPlus className="mr-2 h-4 w-4" />
          New Link
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search links by name or code..."
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
              onChange={(e) => setStatusFilter(e.target.value as LinkStatus | '')}
              className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value={LinkStatus.ACTIVE}>Active</option>
              <option value={LinkStatus.EXPIRED}>Expired</option>
              <option value={LinkStatus.DISABLED}>Disabled</option>
              <option value={LinkStatus.DELETED}>Deleted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Links List */}
      {isLoading ? (
        <div className="card py-12 text-center">
          <div className="inline-flex items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            <span className="ml-2 text-gray-600">Loading links...</span>
          </div>
        </div>
      ) : error ? (
        <div className="card border-red-200 bg-red-50 py-6 text-center">
          <p className="text-red-600">Failed to load links</p>
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <LinksList links={data.items} />
          <Pagination currentPage={page} totalPages={data.pages} onPageChange={setPage} />
        </>
      ) : (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <FiPlus className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No access links yet</h3>
          <p className="mb-6 text-sm text-gray-500">
            Get started by creating your first temporary access link
          </p>
          <Link
            to="/links/new"
            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Create your first link
          </Link>
        </div>
      )}
    </div>
  )
}
