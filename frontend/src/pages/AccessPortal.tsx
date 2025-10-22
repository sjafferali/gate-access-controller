import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FiLock, FiUnlock, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'
import { validationApi } from '@/services/api'
import { type ErrorResponse } from '@/types'

export default function AccessPortal() {
  const { linkCode } = useParams<{ linkCode: string }>()
  const [isRequesting, setIsRequesting] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['validate', linkCode],
    queryFn: () => validationApi.validateLink(linkCode!),
    enabled: !!linkCode,
    retry: false,
  })

  const accessMutation = useMutation({
    mutationFn: () => validationApi.requestAccess(linkCode!),
    onSuccess: (response) => {
      toast.success(response.message)
      setIsRequesting(false)
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      const message = error.response?.data?.message || 'Access denied'
      toast.error(message)
      setIsRequesting(false)
    },
  })

  const handleRequestAccess = () => {
    setIsRequesting(true)
    accessMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            <span className="ml-2 text-gray-600">Validating access link...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <FiAlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Invalid Link</h1>
          <p className="text-gray-600">
            This access link is invalid or does not exist. Please check the link and try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-lg bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-6 flex justify-center">
            <div className={`rounded-full p-4 ${data.is_valid ? 'bg-green-100' : 'bg-red-100'}`}>
              {data.is_valid ? (
                <FiUnlock className="h-12 w-12 text-green-600 sm:h-14 sm:w-14" />
              ) : (
                <FiLock className="h-12 w-12 text-red-600 sm:h-14 sm:w-14" />
              )}
            </div>
          </div>

          <h1 className="mb-4 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Gate Access Request
          </h1>

          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <h2 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">{data.name}</h2>
            {data.notes && <p className="text-sm text-gray-600 sm:text-base">{data.notes}</p>}
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  data.is_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {data.message}
              </span>
            </div>
          </div>

          {data.is_valid ? (
            <button
              onClick={handleRequestAccess}
              disabled={isRequesting}
              className="w-full rounded-lg bg-primary-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500 focus:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
            >
              {isRequesting ? 'Opening Gate...' : 'Request Access'}
            </button>
          ) : (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800 sm:text-base">
                This link cannot grant access at this time. {data.message}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 sm:text-base">
            Having trouble? Contact the property owner for assistance.
          </p>
        </div>
      </div>
    </div>
  )
}
