import { format } from 'date-fns'
import { FiCheck, FiX, FiAlertCircle, FiActivity } from 'react-icons/fi'
import clsx from 'clsx'
import { AccessLog, AccessStatus } from '@/types'

interface RecentActivityProps {
  logs: AccessLog[]
}

const statusConfig = {
  [AccessStatus.GRANTED]: {
    icon: FiCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  [AccessStatus.DENIED]: {
    icon: FiX,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  [AccessStatus.ERROR]: {
    icon: FiAlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
}

export default function RecentActivity({ logs }: RecentActivityProps) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <FiActivity className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">No recent activity</p>
        <p className="mt-1 text-xs text-gray-500">Activity will appear here when visitors use access links</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const config = statusConfig[log.status]
        const Icon = config.icon

        return (
          <div key={log.id} className="flex items-start space-x-3">
            <div className={clsx('rounded-full p-2', config.bgColor)}>
              <Icon className={clsx('h-4 w-4', config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {log.link_name || 'Unknown Link'}
              </p>
              <p className="text-xs text-gray-500">
                {log.ip_address} • {format(new Date(log.accessed_at), 'MMM d, h:mm a')}
              </p>
            </div>
            <span
              className={clsx(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                log.status === AccessStatus.GRANTED
                  ? 'bg-green-100 text-green-800'
                  : log.status === AccessStatus.DENIED
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              )}
            >
              {log.status}
            </span>
          </div>
        )
      })}
    </div>
  )
}