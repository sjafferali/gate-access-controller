import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FiExternalLink, FiCopy, FiLink } from 'react-icons/fi'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { AccessLink, LinkStatus } from '@/types'
import { copyToClipboard } from '@/utils/clipboard'
import { formatLinkStatus } from '@/utils/format'

interface LinksSummaryProps {
  links: AccessLink[]
}

const statusColors = {
  [LinkStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [LinkStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [LinkStatus.EXHAUSTED]: 'bg-orange-100 text-orange-800',
  [LinkStatus.DISABLED]: 'bg-yellow-100 text-yellow-800',
}

export default function LinksSummary({ links }: LinksSummaryProps) {
  const copyCode = async (code: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await copyToClipboard(code)
      toast.success('Access code copied to clipboard')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  if (links.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <FiLink className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">No active links</p>
        <p className="mt-1 text-xs text-gray-500">Create your first access link to get started</p>
      </div>
    )
  }

  const activeLinks = links.filter((link) => link.status === LinkStatus.ACTIVE)

  return (
    <div className="space-y-3">
      {activeLinks.slice(0, 5).map((link) => (
        <div key={link.id} className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <Link
                to={`/links/${link.id}`}
                className="truncate text-sm font-medium text-gray-900 hover:text-primary-600"
              >
                {link.name}
              </Link>
              <span
                className={clsx(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  statusColors[link.status]
                )}
              >
                {formatLinkStatus(link.status)}
              </span>
            </div>
            <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center">
                Code: <code className="mx-1 font-mono">{link.link_code}</code>
                <button
                  onClick={(e) => void copyCode(link.link_code, e)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                  title="Copy access code"
                >
                  <FiCopy className="h-3 w-3" />
                </button>
              </span>
              {link.expiration && (
                <span>Expires: {format(new Date(link.expiration), 'MMM d')}</span>
              )}
              {link.max_uses && (
                <span>
                  Uses: {link.granted_count}/{link.max_uses}
                </span>
              )}
            </div>
          </div>
          <Link to={`/links/${link.id}`} className="ml-2 text-gray-400 hover:text-gray-600">
            <FiExternalLink className="h-4 w-4" />
          </Link>
        </div>
      ))}

      {links.length > 5 && (
        <div className="pt-2 text-center">
          <Link to="/links" className="text-sm text-primary-600 hover:text-primary-700">
            View all {links.length} links
          </Link>
        </div>
      )}
    </div>
  )
}
