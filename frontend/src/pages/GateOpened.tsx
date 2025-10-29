import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiHome, FiInfo } from 'react-icons/fi'

export default function GateOpened() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [timeElapsed, setTimeElapsed] = useState(0)

  // Get parameters from URL
  const linkName = searchParams.get('name') || 'Access Link'
  const timestamp = searchParams.get('timestamp')
  const notes = searchParams.get('notes')

  // Start a timer to show how long ago the gate was opened
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Format the time elapsed
  const formatTimeElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  }

  // Format the timestamp if provided
  const formatTimestamp = (ts: string | null) => {
    if (!ts) return new Date().toLocaleString()
    try {
      return new Date(parseInt(ts)).toLocaleString()
    } catch {
      return new Date().toLocaleString()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-lg bg-white p-6 shadow-lg sm:p-8">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="rounded-full bg-green-100 p-4">
                <FiCheckCircle className="h-16 w-16 text-green-600" />
              </div>
              {/* Animated pulse effect */}
              <div className="absolute inset-0 animate-ping rounded-full bg-green-100 opacity-20"></div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Gate Successfully Opened!
          </h1>

          <p className="mb-6 text-center text-sm text-gray-600 sm:text-base">
            The gate was opened {formatTimeElapsed(timeElapsed)}
          </p>

          {/* Link Information Card */}
          <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="space-y-3">
              {/* Link Name */}
              <div>
                <p className="text-xs font-medium text-gray-500">Access Link Used:</p>
                <p className="text-sm font-semibold text-gray-900">{linkName}</p>
              </div>

              {/* Timestamp */}
              <div>
                <p className="text-xs font-medium text-gray-500">Opened At:</p>
                <p className="text-sm text-gray-700">{formatTimestamp(timestamp)}</p>
              </div>

              {/* Notes if available */}
              {notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Instructions:</p>
                  <p className="text-sm text-gray-700">{decodeURIComponent(notes)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Important Notice */}
          <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiInfo className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                <div className="mt-1 text-xs text-yellow-700">
                  <p>• The gate should be open now - please proceed</p>
                  <p>• This page is safe to close or refresh</p>
                  <p>• Refreshing will NOT open the gate again</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action - Close or Navigate Away */}
            <button
              onClick={() => window.close()}
              className="w-full rounded-lg bg-gray-600 px-6 py-3 text-base font-semibold text-white shadow transition-all hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close This Page
            </button>

            {/* Secondary Action - Go Home (if public home exists) */}
            <button
              onClick={() => void navigate('/')}
              className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200"
            >
              <FiHome className="mr-2 h-4 w-4" />
              Return to Home
            </button>
          </div>
        </div>

        {/* Footer Information */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 sm:text-sm">
            Need assistance? Contact the property owner.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Your access has been logged for security purposes
          </p>
        </div>
      </div>
    </div>
  )
}
