import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FiCalendar,
  FiClock,
  FiHash,
  FiFileText,
  FiTag,
  FiUser,
  FiZap,
  FiLink2,
  FiBell,
} from 'react-icons/fi'
import { accessLinksApi, notificationProvidersApi } from '@/services/api'
import { CreateAccessLink, LinkPurpose, NotificationProviderType } from '@/types'
import SearchableSelect from '@/components/form/SearchableSelect'

export default function CreateLink() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useCustomCode, setUseCustomCode] = useState(false)
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])

  // Fetch notification providers
  const { data: providers = [] } = useQuery({
    queryKey: ['notification-providers-summary'],
    queryFn: notificationProvidersApi.getSummary,
  })

  // Get current date/time in datetime-local format (YYYY-MM-DDTHH:mm)
  const getCurrentDateTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Get default expiration based on settings
  const getDefaultExpiration = () => {
    try {
      const storedSettings = localStorage.getItem('gateAccessSettings')
      if (storedSettings) {
        const settings = JSON.parse(storedSettings) as { defaultExpirationHours?: number }
        const expirationHours = settings.defaultExpirationHours || 24
        const expirationDate = new Date()
        expirationDate.setHours(expirationDate.getHours() + expirationHours)
        const year = expirationDate.getFullYear()
        const month = String(expirationDate.getMonth() + 1).padStart(2, '0')
        const day = String(expirationDate.getDate()).padStart(2, '0')
        const hours = String(expirationDate.getHours()).padStart(2, '0')
        const minutes = String(expirationDate.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }
    } catch (error) {
      console.error('Failed to load default expiration from settings:', error)
    }
    // Default to 24 hours from now if settings not found
    const defaultDate = new Date()
    defaultDate.setHours(defaultDate.getHours() + 24)
    const year = defaultDate.getFullYear()
    const month = String(defaultDate.getMonth() + 1).padStart(2, '0')
    const day = String(defaultDate.getDate()).padStart(2, '0')
    const hours = String(defaultDate.getHours()).padStart(2, '0')
    const minutes = String(defaultDate.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateAccessLink>({
    defaultValues: {
      purpose: LinkPurpose.OTHER,
      auto_open: false,
      active_on: getCurrentDateTime(),
      expiration: getDefaultExpiration(),
    },
  })

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

  const createMutation = useMutation({
    mutationFn: accessLinksApi.create,
    onSuccess: (data) => {
      toast.success('Access link created successfully')
      void navigate(`/links/${data.id}`)
    },
    onError: () => {
      toast.error('Failed to create access link')
      setIsSubmitting(false)
    },
  })

  const onSubmit = (data: CreateAccessLink) => {
    setIsSubmitting(true)

    // Clean up the data before sending
    const cleanedData = {
      ...data,
      // Convert datetime-local format to ISO string for backend compatibility
      // HTML datetime-local gives us "YYYY-MM-DDTHH:mm" but backend needs full ISO format
      active_on: new Date(data.active_on).toISOString(),
      expiration: data.expiration ? new Date(data.expiration).toISOString() : undefined,
      // Convert empty strings to undefined/null for optional fields
      max_uses: data.max_uses || undefined,
      notes: data.notes || undefined,
      auto_open: data.auto_open ?? false,
      link_code: useCustomCode && data.link_code ? data.link_code.toUpperCase().trim() : undefined,
      notification_provider_ids: selectedProviders,
    }

    createMutation.mutate(cleanedData)
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Access Link</h1>
        <p className="mt-2 text-base text-gray-600">
          Generate a new temporary access link for your gate with customizable permissions
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

            {/* Custom Link Code Section */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    checked={useCustomCode}
                    onChange={(e) => setUseCustomCode(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FiLink2 className="mr-1 text-blue-500" />
                    Use Custom Link Code
                  </label>
                  <p className="text-xs text-gray-600">
                    Override the automatically generated code with your own custom code
                  </p>
                </div>
              </div>

              {useCustomCode && (
                <div className="mt-3">
                  <input
                    {...register('link_code', {
                      required: useCustomCode ? 'Custom link code is required' : false,
                      minLength: {
                        value: 4,
                        message: 'Link code must be at least 4 characters',
                      },
                      maxLength: {
                        value: 20,
                        message: 'Link code cannot exceed 20 characters',
                      },
                      pattern: {
                        value: /^[A-Za-z0-9]+$/,
                        message: 'Link code can only contain letters and numbers',
                      },
                    })}
                    type="text"
                    placeholder="e.g., DELIVERY123 or AMAZON"
                    onChange={(e) => {
                      // Convert to uppercase as the user types
                      e.target.value = e.target.value.toUpperCase()
                    }}
                    className={`block w-full rounded-md border ${
                      errors.link_code
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                    } px-3 py-2.5 font-mono text-sm font-medium uppercase placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1`}
                  />
                  {errors.link_code ? (
                    <p className="mt-1 text-sm text-red-600">{errors.link_code.message}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      4-20 characters, letters and numbers only (automatically converted to
                      uppercase)
                    </p>
                  )}
                </div>
              )}
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
                  Active From *
                </label>
                <input
                  {...register('active_on', {
                    required: 'Active date is required',
                    validate: (value) => {
                      if (!value) return 'Active date is required'
                      const activeDate = new Date(value)
                      const now = new Date()
                      now.setMinutes(now.getMinutes() - 5) // Allow 5 minutes in the past
                      if (activeDate < now) {
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
                  <p className="mt-1 text-xs text-gray-500">
                    When the link becomes active (defaults to now)
                  </p>
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
                      if (expirationDate <= now) {
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
                      onClick={() =>
                        setValue('expiration', getDefaultExpiration(), { shouldValidate: true })
                      }
                      className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                    >
                      Reset to Default
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
                    without requiring the user to click the "Request Access" button. Use this for
                    seamless, one-click access experiences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings Section */}
        <div className="card">
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="flex items-center text-lg font-semibold text-gray-900">
              <FiBell className="mr-2 text-primary-600" />
              Notification Settings
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select which notification providers to alert when this link is used
            </p>
          </div>

          <div className="space-y-5">
            {providers.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-600">
                  No notification providers configured yet.{' '}
                  <button
                    type="button"
                    onClick={() => void navigate('/notification-providers')}
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Create a provider
                  </button>{' '}
                  to receive alerts when this link is used.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Select the notification providers that should be alerted when this link is
                  accessed:
                </p>
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      id={`provider-${provider.id}`}
                      checked={selectedProviders.includes(provider.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProviders([...selectedProviders, provider.id])
                        } else {
                          setSelectedProviders(selectedProviders.filter((id) => id !== provider.id))
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor={`provider-${provider.id}`}
                      className="ml-3 flex flex-1 cursor-pointer items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                        <p className="text-xs text-gray-500">
                          Type:{' '}
                          {provider.provider_type === NotificationProviderType.PUSHOVER
                            ? 'Pushover'
                            : 'Webhook'}
                        </p>
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
                    </label>
                  </div>
                ))}
                {selectedProviders.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedProviders.length} provider{selectedProviders.length !== 1 ? 's' : ''}{' '}
                    selected
                  </p>
                )}
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
            {isSubmitting ? 'Creating...' : 'Create Access Link'}
          </button>
        </div>
      </form>
    </div>
  )
}
