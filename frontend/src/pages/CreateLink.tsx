import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiCalendar, FiClock, FiHash, FiFileText, FiTag, FiUser } from 'react-icons/fi'
import { accessLinksApi } from '@/services/api'
import { CreateAccessLink, LinkPurpose } from '@/types'
import SearchableSelect from '@/components/form/SearchableSelect'

export default function CreateLink() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateAccessLink>({
    defaultValues: {
      purpose: LinkPurpose.OTHER,
    },
  })

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
      // Convert empty strings to undefined/null for optional fields
      active_on: data.active_on || undefined,
      expiration: data.expiration || undefined,
      max_uses: data.max_uses || undefined,
      notes: data.notes || undefined,
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
                  <p className="mt-1 text-xs text-gray-500">Link becomes active at this time</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="expiration"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  <FiCalendar className="mr-1 inline text-gray-500" />
                  Expires On
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
                  <p className="mt-1 text-xs text-gray-500">Link expires and becomes invalid</p>
                )}
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
