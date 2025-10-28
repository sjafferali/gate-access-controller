import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiBell,
  FiGlobe,
  FiToggleLeft,
  FiToggleRight,
} from 'react-icons/fi'
import { notificationProvidersApi } from '@/services/api'
import { NotificationProvider, NotificationProviderType, PaginatedResponse } from '@/types'
import Pagination from '@/components/common/Pagination'
import NotificationProviderModal from '@/components/modals/NotificationProviderModal'

export default function NotificationProviders() {
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<NotificationProvider | null>(null)
  const [filterType, setFilterType] = useState<'all' | NotificationProviderType>('all')
  const queryClient = useQueryClient()

  // Fetch providers
  const { data, isLoading } = useQuery<PaginatedResponse<NotificationProvider>>({
    queryKey: ['notification-providers', page],
    queryFn: () => notificationProvidersApi.list({ page, size: 10 }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationProvidersApi.delete(id),
    onSuccess: () => {
      toast.success('Provider deleted successfully')
      void queryClient.invalidateQueries({ queryKey: ['notification-providers'] })
    },
    onError: () => {
      toast.error('Failed to delete provider')
    },
  })

  // Toggle enable/disable mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      notificationProvidersApi.update(id, { enabled }),
    onSuccess: () => {
      toast.success('Provider status updated')
      void queryClient.invalidateQueries({ queryKey: ['notification-providers'] })
    },
    onError: () => {
      toast.error('Failed to update provider status')
    },
  })

  const handleEdit = (provider: NotificationProvider) => {
    setEditingProvider(provider)
    setModalOpen(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleToggleEnabled = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, enabled: !currentStatus })
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingProvider(null)
    void queryClient.invalidateQueries({ queryKey: ['notification-providers'] })
  }

  // Filter providers by type
  const filteredProviders =
    data?.items.filter(
      (provider) => filterType === 'all' || provider.provider_type === filterType
    ) || []

  const getProviderIcon = (type: NotificationProviderType) => {
    return type === NotificationProviderType.PUSHOVER ? (
      <FiBell className="h-4 w-4" />
    ) : (
      <FiGlobe className="h-4 w-4" />
    )
  }

  const getProviderBadgeClass = (type: NotificationProviderType) => {
    return type === NotificationProviderType.PUSHOVER
      ? 'badge badge-primary'
      : 'badge badge-secondary'
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Notification Providers</h1>
        <p className="text-gray-600">
          Manage notification providers to alert you when links are accessed
        </p>
      </div>

      {/* Actions Bar */}
      <div className="card mb-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType(NotificationProviderType.PUSHOVER)}
              className={`btn ${
                filterType === NotificationProviderType.PUSHOVER ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <FiBell className="mr-1 h-4 w-4" />
              Pushover
            </button>
            <button
              onClick={() => setFilterType(NotificationProviderType.WEBHOOK)}
              className={`btn ${
                filterType === NotificationProviderType.WEBHOOK ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <FiGlobe className="mr-1 h-4 w-4" />
              Webhook
            </button>
          </div>

          <button
            onClick={() => {
              setEditingProvider(null)
              setModalOpen(true)
            }}
            className="btn btn-primary"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Create Provider
          </button>
        </div>
      </div>

      {/* Providers List */}
      {isLoading ? (
        <div className="card">
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
          </div>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="card">
          <div className="py-12 text-center">
            <FiBell className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold">No notification providers</h3>
            <p className="mb-6 text-gray-600">
              Create your first provider to start receiving notifications
            </p>
            <button
              onClick={() => {
                setEditingProvider(null)
                setModalOpen(true)
              }}
              className="btn btn-primary"
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Create Provider
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center">
                          {getProviderIcon(provider.provider_type)}
                          <span className="ml-2 font-medium">{provider.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={getProviderBadgeClass(provider.provider_type)}>
                          {provider.provider_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          onClick={() => handleToggleEnabled(provider.id, provider.enabled)}
                          className="flex items-center gap-2 text-sm"
                        >
                          {provider.enabled ? (
                            <>
                              <FiToggleRight className="h-5 w-5 text-green-600" />
                              <span className="text-green-600">Enabled</span>
                            </>
                          ) : (
                            <>
                              <FiToggleLeft className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-400">Disabled</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                        {new Date(provider.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(provider)}
                            className="rounded p-2 text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-600"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(provider.id, provider.name)}
                            className="rounded p-2 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={data.pages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <NotificationProviderModal provider={editingProvider} onClose={handleModalClose} />
      )}
    </div>
  )
}
