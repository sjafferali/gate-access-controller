import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  FiCopy,
  FiZap,
  FiUser,
  FiTag,
  FiFileText,
  FiClock,
  FiCalendar,
  FiHash,
  FiInfo,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { accessLinksApi } from '@/services/api'
import { UpdateAccessLink, LinkPurpose } from '@/types'
import { copyToClipboard } from '@/utils/clipboard'
import SearchableSelect from '@/components/form/SearchableSelect'

export default function EditLink() {
  const navigate = useNavigate()
  const { linkId } = useParams<{ linkId: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch existing link data
  const {
    data: link,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['link', linkId],
    queryFn: () => accessLinksApi.get(linkId!),
    enabled: !!linkId,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UpdateAccessLink>()

  // Helper function to set expiration date using shortcuts
  const setExpirationShortcut = (hours: number) => {
    const now = new Date()
    now.setHours(now.getHours() + hours)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hoursStr = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    setValue('expiration', `${year}-${month}-${day}T${hoursStr}:${minutes}`, {
      shouldValidate: true,
    })
  }

  const purposeOptions = [
    { value: LinkPurpose.DELIVERY, label: 'Delivery' },
    { value: LinkPurpose.RECURRING_DELIVERY, label: 'Recurring Delivery' },
    { value: LinkPurpose.VISITOR, label: 'Visitor' },
    { value: LinkPurpose.SERVICE, label: 'Service' },
    { value: LinkPurpose.EMERGENCY, label: 'Emergency' },
    { value: LinkPurpose.OTHER, label: 'Other' },
  ]

  // Populate form when link data is loaded
  useEffect(() => {
    if (link) {
      // Convert datetime strings to local datetime format for the inputs
      const formatDateTimeLocal = (dateString?: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        // Format: YYYY-MM-DDTHH:mm
        return date.toISOString().slice(0, 16)
      }

      reset({
        name: link.name,
        notes: link.notes || '',
        purpose: link.purpose,
        active_on: formatDateTimeLocal(link.active_on),
        expiration: formatDateTimeLocal(link.expiration),
        max_uses: link.max_uses,
        auto_open: link.auto_open,
      })
    }
  }, [link, reset])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAccessLink) => accessLinksApi.update(linkId!, data),
    onSuccess: (data) => {
      toast.success('Access link updated successfully')
      void navigate(`/links/${data.id}`)
    },
    onError: () => {
      toast.error('Failed to update access link')
      setIsSubmitting(false)
    },
  })

  const copyCode = async () => {
    if (link?.link_code) {
      try {
        await copyToClipboard(link.link_code)
        toast.success('Access code copied to clipboard')
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  const onSubmit = (data: UpdateAccessLink) => {
    setIsSubmitting(true)

    // Clean up the data before sending
    const cleanedData: UpdateAccessLink = {}

    // Only include fields that have changed
    if (data.name && data.name !== link?.name) cleanedData.name = data.name
    if (data.notes !== link?.notes) cleanedData.notes = data.notes || undefined
    if (data.purpose && data.purpose !== link?.purpose) cleanedData.purpose = data.purpose

    // Handle datetime fields - convert local datetime to ISO string with timezone
    if (data.active_on) {
      const activeDate = data.active_on ? new Date(data.active_on).toISOString() : undefined
      if (activeDate !== link?.active_on) cleanedData.active_on = activeDate
    } else if (link?.active_on && !data.active_on) {
      cleanedData.active_on = undefined
    }

    if (data.expiration) {
      const expDate = data.expiration ? new Date(data.expiration).toISOString() : undefined
      if (expDate !== link?.expiration) cleanedData.expiration = expDate
    } else if (link?.expiration && !data.expiration) {
      cleanedData.expiration = undefined
    }

    if (data.max_uses !== link?.max_uses) {
      cleanedData.max_uses = data.max_uses || undefined
    }

    if (data.auto_open !== link?.auto_open) {
      cleanedData.auto_open = data.auto_open
    }

    // If no changes were made
    if (Object.keys(cleanedData).length === 0) {
      toast('No changes made', { icon: 'ℹ️' })
      setIsSubmitting(false)
      return
    }

    updateMutation.mutate(cleanedData)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Loading link details...</div>
        </div>
      </div>
    )
  }

  if (error || !link) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">Failed to load link details</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Access Link</h1>
        <p className="mt-2 text-base text-gray-600">
          Update the details and permissions for your access link
        </p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e)
        }}
        className="space-y-8"
      >
        {/* Basic Information Section */}
        <div className="card">
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="flex items-center text-lg font-semibold text-gray-900">
              <FiUser className="mr-2 text-primary-600" />
              Basic Information
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Link Name *
              </label>
              <div className="relative">
                <input
                  {...register('name', {
                    required: 'Link name is required',
                    minLength: {
                      value: 3,
                      message: 'Link name must be at least 3 characters long',
                    },
                    maxLength: {
                      value: 100,
                      message: 'Link name cannot exceed 100 characters',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9\s\-.,&]+$/,
                      message:
                        'Link name can only contain letters, numbers, spaces, and basic punctuation (- . , &)',
                    },
                  })}
                  type="text"
                  className={`block w-full rounded-md border ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } px-3 py-2.5 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1 sm:text-sm`}
                  placeholder="e.g., Amazon Delivery, Plumber Visit, Guest - John Doe"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="purpose" className="mb-1 block text-sm font-medium text-gray-700">
                <FiTag className="mr-1 inline text-gray-500" />
                Purpose
              </label>
              <Controller
                name="purpose"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={purposeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a purpose"
                  />
                )}
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
                <FiFileText className="mr-1 inline text-gray-500" />
                Notes / Special Instructions
              </label>
              <textarea
                {...register('notes', {
                  maxLength: {
                    value: 500,
                    message: 'Notes cannot exceed 500 characters',
                  },
                })}
                rows={4}
                className={`block w-full rounded-md border ${
                  errors.notes
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                } px-3 py-2.5 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1 sm:text-sm`}
                placeholder="Add any special instructions, gate codes, or delivery notes here..."
              />
              {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
              <p className="mt-1 text-xs text-gray-500">Optional - Maximum 500 characters</p>
            </div>
          </div>
        </div>

        {/* Access Control Section */}
        <div className="card">
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="flex items-center text-lg font-semibold text-gray-900">
              <FiClock className="mr-2 text-primary-600" />
              Access Control
            </h2>
            <p className="mt-1 text-sm text-gray-500">Set time limits and usage restrictions</p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="active_on" className="mb-1 block text-sm font-medium text-gray-700">
                  <FiCalendar className="mr-1 inline text-gray-500" />
                  Active From
                </label>
                <input
                  {...register('active_on', {
                    validate: (value) => {
                      if (!value) return true // Optional field
                      const activeDate = new Date(value)
                      const now = new Date()
                      now.setMinutes(now.getMinutes() - 5) // Allow 5 minutes in the past for editing
                      if (activeDate < now && value !== link?.active_on) {
                        return 'Active date cannot be in the past'
                      }
                      return true
                    },
                  })}
                  type="datetime-local"
                  className={`block w-full rounded-md border ${
                    errors.active_on
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } px-3 py-2.5 shadow-sm focus:outline-none focus:ring-1 sm:text-sm`}
                />
                {errors.active_on ? (
                  <p className="mt-1 text-sm text-red-600">{errors.active_on.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">Link becomes active at this time</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="expiration"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  <FiCalendar className="mr-1 inline text-gray-500" />
                  Expires On (Optional)
                </label>
                <input
                  {...register('expiration', {
                    validate: (value, formValues) => {
                      if (!value) return true // Optional field
                      const expirationDate = new Date(value)
                      const now = new Date()
                      if (expirationDate <= now && value !== link?.expiration) {
                        return 'Expiration date must be in the future'
                      }
                      if (formValues.active_on) {
                        const activeDate = new Date(formValues.active_on)
                        if (expirationDate <= activeDate) {
                          return 'Expiration date must be after the active date'
                        }
                      }
                      return true
                    },
                  })}
                  type="datetime-local"
                  className={`block w-full rounded-md border ${
                    errors.expiration
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } px-3 py-2.5 shadow-sm focus:outline-none focus:ring-1 sm:text-sm`}
                />
                {errors.expiration ? (
                  <p className="mt-1 text-sm text-red-600">{errors.expiration.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    When the link expires (leave empty for no expiration)
                  </p>
                )}

                {/* Quick Expiration Shortcuts */}
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-600">Quick select:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpirationShortcut(1)}
                      className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      <FiClock className="mr-1 h-3 w-3" />1 hour
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationShortcut(3)}
                      className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      <FiClock className="mr-1 h-3 w-3" />3 hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationShortcut(12)}
                      className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                    >
                      <FiClock className="mr-1 h-3 w-3" />
                      12 hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationShortcut(24)}
                      className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                    >
                      <FiCalendar className="mr-1 h-3 w-3" />1 day
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationShortcut(72)}
                      className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                    >
                      <FiCalendar className="mr-1 h-3 w-3" />3 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationShortcut(168)}
                      className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 transition-colors hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1"
                    >
                      <FiCalendar className="mr-1 h-3 w-3" />1 week
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationShortcut(720)}
                      className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 transition-colors hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1"
                    >
                      <FiCalendar className="mr-1 h-3 w-3" />1 month
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('expiration', '', { shouldValidate: true })}
                      className="inline-flex items-center rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                    >
                      Never Expire
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="max_uses" className="mb-1 block text-sm font-medium text-gray-700">
                <FiHash className="mr-1 inline text-gray-500" />
                Maximum Uses
              </label>
              <input
                {...register('max_uses', {
                  valueAsNumber: true,
                  min: {
                    value: 1,
                    message: 'Maximum uses must be at least 1',
                  },
                  max: {
                    value: 1000,
                    message: 'Maximum uses cannot exceed 1000',
                  },
                  validate: (value) => {
                    if (value && (!Number.isInteger(value) || value < 0)) {
                      return 'Please enter a valid positive number'
                    }
                    return true
                  },
                })}
                type="number"
                min="1"
                max="1000"
                className={`block w-full rounded-md border ${
                  errors.max_uses
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                } px-3 py-2.5 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1 sm:text-sm`}
                placeholder="Leave empty for unlimited uses"
              />
              {errors.max_uses ? (
                <p className="mt-1 text-sm text-red-600">{errors.max_uses.message}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Number of times this link can be used (leave empty for unlimited)
                </p>
              )}
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    {...register('auto_open')}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="auto_open"
                    className="flex items-center text-sm font-medium text-gray-700"
                  >
                    <FiZap className="mr-1 text-yellow-500" />
                    Auto-Open Gate
                  </label>
                  <p className="text-xs text-gray-600">
                    When enabled, the gate will open automatically as soon as the link is accessed,
                    without requiring the user to click the "Open Gate" button. Use this for
                    seamless, one-click access experiences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Link Information Section */}
        <div className="card">
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="flex items-center text-lg font-semibold text-gray-900">
              <FiInfo className="mr-2 text-primary-600" />
              Link Information
            </h2>
            <p className="mt-1 text-sm text-gray-500">Read-only details about this access link</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Access Code</p>
                <code className="mt-1 font-mono text-base text-gray-900">{link.link_code}</code>
              </div>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="ml-4 rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                title="Copy access code"
              >
                <FiCopy className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Usage Statistics</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {link.granted_count}/{link.max_uses || '∞'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {link.granted_count} granted, {link.denied_count} denied
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Created</p>
                <p className="mt-1 text-base text-gray-900">
                  {new Date(link.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(link.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {link.updated_at && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600">
                  Last updated: {new Date(link.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              void navigate('/links')
            }}
            className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Access Link'}
          </button>
        </div>
      </form>
    </div>
  )
}
