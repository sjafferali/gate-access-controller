import { IconType } from 'react-icons'
import clsx from 'clsx'

interface StatsCardProps {
  title: string
  value: number | string
  icon: IconType
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow'
  subtitle?: string
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
}

export default function StatsCard({ title, value, icon: Icon, color, subtitle }: StatsCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={clsx('rounded-lg p-3', colorMap[color], 'bg-opacity-10')}>
          <Icon className={clsx('h-6 w-6', `text-${color}-600`)} />
        </div>
      </div>
    </div>
  )
}