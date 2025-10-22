import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FiEdit, FiEye, FiCopy, FiTrash2, FiSlash, FiCheck } from 'react-icons/fi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { AccessLink, LinkStatus } from '@/types'
import { accessLinksApi } from '@/services/api'
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal'
import { copyToClipboard } from '@/utils/clipboard'
import { formatLinkStatus } from '@/utils/format'

interface LinksListProps {
  links: AccessLink[]
}

const statusColors = {
  [LinkStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [LinkStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [LinkStatus.EXHAUSTED]: 'bg-orange-100 text-orange-800',
  [LinkStatus.DISABLED]: 'bg-yellow-100 text-yellow-800',
}

export default function LinksList({ links }: LinksListProps) {
  const queryClient = useQueryClient()
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    link: AccessLink | null
  }>({
    isOpen: false,
    link: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const copyLinkUrl = async (linkCode: string) => {
    const url = `${window.location.origin}/access/${linkCode}`
    try {
      await copyToClipboard(url)
      toast.success('Link URL copied to clipboard')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => accessLinksApi.delete(linkId),
    onSuccess: () => {
      toast.success('Access link deleted successfully')
      // Invalidate the links query to refresh the list
      void queryClient.invalidateQueries({ queryKey: ['links'] })
      setDeleteModal({ isOpen: false, link: null })
      setIsDeleting(false)
    },
    onError: () => {
      toast.error('Failed to delete access link')
      setIsDeleting(false)
    },
  })

  const disableMutation = useMutation({
    mutationFn: (linkId: string) => accessLinksApi.disable(linkId),
    onSuccess: () => {
      toast.success('Link disabled')
      void queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: () => toast.error('Failed to disable link'),
  })

  const enableMutation = useMutation({
    mutationFn: (linkId: string) => accessLinksApi.enable(linkId),
    onSuccess: () => {
      toast.success('Link enabled')
      void queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: () => toast.error('Failed to enable link'),
  })

  const handleDeleteClick = (link: AccessLink) => {
    setDeleteModal({ isOpen: true, link })
  }

  const handleDeleteConfirm = () => {
    if (deleteModal.link) {
      setIsDeleting(true)
      deleteMutation.mutate(deleteModal.link.id)
    }
  }

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, link: null })
    }
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {links.map((link) => (
          <div
            key={link.id}
            className={clsx(
              'rounded-lg bg-white p-4 shadow',
              link.is_deleted && 'bg-gray-50 opacity-50'
            )}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-gray-900">
                  {link.name}
                  {link.is_deleted && <span className="ml-2 text-xs text-red-600">(Deleted)</span>}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{link.purpose}</p>
              </div>
              <span
                className={clsx(
                  'ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                  statusColors[link.status]
                )}
              >
                {formatLinkStatus(link.status)}
              </span>
            </div>

            <div className="mb-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Code:</span>
                <div className="flex items-center space-x-2">
                  <code className="font-mono text-gray-900">{link.link_code}</code>
                  <button
                    onClick={() => void copyLinkUrl(link.link_code)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <FiCopy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Usage:</span>
                <span className="text-gray-900">
                  {link.granted_count}/{link.max_uses || '∞'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Expires:</span>
                <span className="text-gray-900">
                  {link.expiration ? format(new Date(link.expiration), 'MMM d, yyyy') : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-3">
              <Link
                to={`/links/${link.id}`}
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-900"
              >
                <FiEye className="mr-1 h-4 w-4" />
                View
              </Link>

              {!link.is_deleted && (
                <>
                  <Link
                    to={`/links/${link.id}/edit`}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-900"
                  >
                    <FiEdit className="mr-1 h-4 w-4" />
                    Edit
                  </Link>

                  {link.status === LinkStatus.DISABLED ? (
                    <button
                      onClick={() => enableMutation.mutate(link.id)}
                      className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-900"
                    >
                      <FiCheck className="mr-1 h-4 w-4" />
                      Enable
                    </button>
                  ) : (
                    <button
                      onClick={() => disableMutation.mutate(link.id)}
                      className="inline-flex items-center text-sm font-medium text-yellow-600 hover:text-yellow-900"
                    >
                      <FiSlash className="mr-1 h-4 w-4" />
                      Disable
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteClick(link)}
                    className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-900"
                  >
                    <FiTrash2 className="mr-1 h-4 w-4" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-lg bg-white shadow md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Expires
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {links.map((link) => (
              <tr
                key={link.id}
                className={clsx('hover:bg-gray-50', link.is_deleted && 'bg-gray-50 opacity-50')}
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {link.name}
                      {link.is_deleted && (
                        <span className="ml-2 text-xs text-red-600">(Deleted)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{link.purpose}</div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <code className="font-mono text-sm text-gray-900">{link.link_code}</code>
                    <button
                      onClick={() => void copyLinkUrl(link.link_code)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <FiCopy className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={clsx(
                      'inline-flex rounded-full px-2 text-xs font-semibold leading-5',
                      statusColors[link.status]
                    )}
                  >
                    {formatLinkStatus(link.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {link.granted_count}/{link.max_uses || '∞'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {link.expiration ? format(new Date(link.expiration), 'MMM d, yyyy') : 'Never'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    <Link
                      to={`/links/${link.id}`}
                      className="p-1 text-primary-600 hover:text-primary-900"
                      title="View details"
                    >
                      <FiEye className="h-5 w-5" />
                    </Link>

                    {!link.is_deleted && (
                      <>
                        <Link
                          to={`/links/${link.id}/edit`}
                          className="p-1 text-blue-600 hover:text-blue-900"
                          title="Edit link"
                        >
                          <FiEdit className="h-5 w-5" />
                        </Link>

                        {link.status === LinkStatus.DISABLED ? (
                          <button
                            onClick={() => enableMutation.mutate(link.id)}
                            className="p-1 text-green-600 hover:text-green-900"
                            title="Enable link"
                          >
                            <FiCheck className="h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => disableMutation.mutate(link.id)}
                            className="p-1 text-yellow-600 hover:text-yellow-900"
                            title="Disable link"
                          >
                            <FiSlash className="h-5 w-5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteClick(link)}
                          className="p-1 text-red-600 hover:text-red-900"
                          title="Delete link"
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Access Link"
        message={`Are you sure you want to delete "${deleteModal.link?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  )
}
