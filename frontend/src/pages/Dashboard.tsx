import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FiLink, FiCheck, FiX, FiPlus, FiActivity, FiUsers } from 'react-icons/fi'
import { accessLinksApi, accessLogsApi } from '@/services/api'
import { LinkStatus } from '@/types'
import StatsCard from '@/components/common/StatsCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import LinksSummary from '@/components/dashboard/LinksSummary'

export default function Dashboard() {
  // Fetch stats
  const { data: linksData, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['links', { page: 1, size: 10 }],
    queryFn: () => accessLinksApi.list({ page: 1, size: 10 }),
  })

  const { data: logsStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['logs-stats'],
    queryFn: () => accessLogsApi.getStats(),
  })

  const { data: recentLogs, isLoading: isLoadingRecentLogs } = useQuery({
    queryKey: ['recent-logs'],
    queryFn: () => accessLogsApi.list({ page: 1, size: 5 }),
  })

  // Calculate stats
  const activeLinks = linksData?.items.filter((link) => link.status === LinkStatus.ACTIVE).length || 0
  const totalLinks = linksData?.total || 0
  const grantedAccess = logsStats?.granted_count || 0
  const deniedAccess = logsStats?.denied_count || 0
  const isLoadingDashboard = isLoadingLinks || isLoadingStats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage your gate access control system
          </p>
        </div>
        <Link
          to="/links/new"
          className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:px-4 sm:py-2"
        >
          <FiPlus className="mr-2 h-4 w-4" />
          New Access Link
        </Link>
      </div>

      {/* Stats Grid */}
      {isLoadingDashboard ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Active Links"
            value={activeLinks}
            icon={FiLink}
            color="blue"
            subtitle={`${totalLinks} total links`}
          />
          <StatsCard
            title="Access Granted"
            value={grantedAccess}
            icon={FiCheck}
            color="green"
            subtitle="All time"
          />
          <StatsCard
            title="Access Denied"
            value={deniedAccess}
            icon={FiX}
            color="red"
            subtitle="All time"
          />
          <StatsCard
            title="Unique Visitors"
            value={logsStats?.unique_ips || 0}
            icon={FiUsers}
            color="purple"
            subtitle="All time"
          />
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center text-lg font-medium text-gray-900">
              <FiActivity className="mr-2 h-5 w-5 text-gray-400" />
              Recent Activity
            </h2>
            <Link
              to="/logs"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
          {isLoadingRecentLogs ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                <span className="ml-2 text-sm text-gray-600">Loading activity...</span>
              </div>
            </div>
          ) : (
            <RecentActivity logs={recentLogs?.items || []} />
          )}
        </div>

        {/* Links Summary */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center text-lg font-medium text-gray-900">
              <FiLink className="mr-2 h-5 w-5 text-gray-400" />
              Active Links
            </h2>
            <Link
              to="/links"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
          {isLoadingLinks ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                <span className="ml-2 text-sm text-gray-600">Loading links...</span>
              </div>
            </div>
          ) : (
            <LinksSummary links={linksData?.items || []} />
          )}
        </div>
      </div>
    </div>
  )
}