import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FiCopy, FiEdit, FiZap, FiFileText, FiBell } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { accessLinksApi } from '@/services/api'
import { LinkStatus, NotificationProviderType } from '@/types'
import { copyToClipboard } from '@/utils/clipboard'
import { formatLinkStatus } from '@/utils/format'
import { generateLinkUrl } from '@/utils/linkUrl'
import { useState, useEffect } from 'react'

export default function LinkDetails() {
  const { linkId } = useParams<{ linkId: string }>()
  const navigate = useNavigate()
  const [linkUrl, setLinkUrl] = useState<string>('')

  const { data: link, isLoading } = useQuery({
    queryKey: ['link', linkId],
    queryFn: () => accessLinksApi.get(linkId!),
    enabled: !!linkId,
  })

  // No longer need to fetch providers separately since they're included in the link response

  // Generate the link URL when link data is available
  useEffect(() => {
    if (link) {
      void generateLinkUrl(link.link_code).then(setLinkUrl)
    }
  }, [link])

  const copyLinkUrl = async () => {
    if (link && linkUrl) {
      try {
        await copyToClipboard(linkUrl)
        toast.success('Link URL copied to clipboard')
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="card py-12 text-center">
          <div className="inline-flex items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            <span className="ml-2 text-gray-600">Loading link details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!link) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="card border-red-200 bg-red-50 py-6 text-center">
          <p className="text-red-600">Link not found</p>
          <button
            onClick={() => {
              void navigate('/links')
            }}
            className="mt-4 text-sm text-primary-600 hover:text-primary-700"
          >
            Back to Links
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{link.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Access Link Details</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              void navigate(`/logs?linkId=${linkId}`)
            }}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <FiFileText className="mr-2 h-4 w-4" />
            View Logs
          </button>
          <button
            onClick={() => {
              void navigate(`/links/${linkId}/edit`)
            }}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <FiEdit className="mr-2 h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      <div className="card">
        <dl className="divide-y divide-gray-200">
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <span
                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  link.status === LinkStatus.ACTIVE
                    ? 'bg-green-100 text-green-800'
                    : link.status === LinkStatus.INACTIVE
                      ? 'bg-gray-100 text-gray-800'
                      : link.status === LinkStatus.DISABLED
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                }`}
              >
                {formatLinkStatus(link.status)}
              </span>
            </dd>
          </div>

          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">Access Code</dt>
            <dd className="mt-1 flex items-center text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <code className="mr-2 font-mono text-lg">{link.link_code}</code>
              <button
                onClick={() => void copyLinkUrl()}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiCopy className="h-4 w-4" />
              </button>
            </dd>
          </div>

          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">Access URL</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {linkUrl ? (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary-600 hover:text-primary-700"
                >
                  {linkUrl}
                </a>
              ) : (
                <span className="text-gray-400">Loading...</span>
              )}
            </dd>
          </div>

          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">Purpose</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{link.purpose}</dd>
          </div>

          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">Auto-Open</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {link.auto_open ? (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  <FiZap className="mr-1 h-3 w-3" />
                  Enabled - Gate opens automatically
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  Disabled - Requires button click
                </span>
              )}
            </dd>
          </div>

          {link.notes && (
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
              <dt className="text-sm font-medium text-gray-500">Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{link.notes}</dd>
            </div>
          )}

          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">Usage</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <div className="space-y-1">
                <p>Granted: {link.granted_count}</p>
                <p>Denied: {link.denied_count}</p>
                {link.max_uses && <p>Maximum: {link.max_uses}</p>}
                {link.remaining_uses !== null && <p>Remaining: {link.remaining_uses}</p>}
              </div>
            </dd>
          </div>

          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">
              <span className="flex items-center">
                <FiBell className="mr-1 h-4 w-4 text-gray-400" />
                Notifications
              </span>
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {link.notification_providers && link.notification_providers.length > 0 ? (
                <div className="space-y-2">
                  {link.notification_providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-2"
                    >
                      <div className="flex items-center">
                        <FiBell className="mr-2 h-4 w-4 text-primary-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                          <p className="text-xs text-gray-500">
                            Type:{' '}
                            {provider.provider_type === NotificationProviderType.PUSHOVER
                              ? 'Pushover'
                              : 'Webhook'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          provider.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">No notification providers configured</span>
              )}
            </dd>
          </div>

          {link.active_on && (
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
              <dt className="text-sm font-medium text-gray-500">Active From</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {format(new Date(link.active_on), 'PPP p')}
              </dd>
            </div>
          )}

          {link.expiration && (
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
              <dt className="text-sm font-medium text-gray-500">Expires</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {format(new Date(link.expiration), 'PPP p')}
              </dd>
            </div>
          )}

          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {format(new Date(link.created_at), 'PPP p')}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
