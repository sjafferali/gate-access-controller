import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiInfo } from 'react-icons/fi'

export default function GateOpened() {
  const [searchParams] = useSearchParams()
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

  // Handle close button click
  const handleClose = () => {
    // Try to close the window (only works for windows opened by JavaScript)
    window.close()

    // Check if we're still here after a brief moment
    // If window.close() didn't work, navigate to a blank page
    setTimeout(() => {
      // If we're still executing code, the window didn't close
      if (window && document) {
        window.location.href = 'about:blank'
      }
    }, 100)
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

          {/* Main Message - styled like the opening screen */}
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex items-center justify-center">
              <p className="text-sm font-semibold text-green-800 sm:text-base">Gate is opening</p>
            </div>
            <p className="mt-2 text-center text-xs text-green-700 sm:text-sm">
              You may proceed once the gate opens.
            </p>
          </div>

          <p className="mb-6 text-center text-sm text-gray-600 sm:text-base">
            Access granted {formatTimeElapsed(timeElapsed)}
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
                <p className="text-xs font-medium text-gray-500">Access granted at:</p>
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
                  <p>• This page is safe to close or refresh</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleClose}
            className="w-full rounded-lg bg-gray-600 px-6 py-3 text-base font-semibold text-white shadow transition-all hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close This Page
          </button>
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
