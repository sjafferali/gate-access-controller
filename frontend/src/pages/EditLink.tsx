import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FiCopy } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { accessLinksApi } from '@/services/api'
import { UpdateAccessLink, LinkPurpose, LinkStatus } from '@/types'

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
    reset,
    formState: { errors },
  } = useForm<UpdateAccessLink>()

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
        status: link.status,
        active_on: formatDateTimeLocal(link.active_on),
        expiration: formatDateTimeLocal(link.expiration),
        max_uses: link.max_uses,
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

  const copyCode = () => {
    if (link?.link_code) {
      void navigator.clipboard.writeText(link.link_code)
      toast.success('Access code copied to clipboard')
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
    if (data.status && data.status !== link?.status) cleanedData.status = data.status

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
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Access Link</h1>
        <p className="mt-1 text-sm text-gray-500">Update the details of your access link</p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e)
        }}
        className="card space-y-6"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name *
          </label>
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
            className={`mt-1 block w-full rounded-md ${
              errors.name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            } shadow-sm sm:text-sm`}
            placeholder="Delivery - Amazon Package"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            {...register('status')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value={LinkStatus.ACTIVE}>Active</option>
            <option value={LinkStatus.DISABLED}>Disabled</option>
            <option value={LinkStatus.EXPIRED}>Expired</option>
            <option value={LinkStatus.DELETED}>Deleted</option>
          </select>
        </div>

        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
            Purpose
          </label>
          <select
            {...register('purpose')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value={LinkPurpose.DELIVERY}>Delivery</option>
            <option value={LinkPurpose.RECURRING_DELIVERY}>Recurring Delivery</option>
            <option value={LinkPurpose.VISITOR}>Visitor</option>
            <option value={LinkPurpose.SERVICE}>Service</option>
            <option value={LinkPurpose.EMERGENCY}>Emergency</option>
            <option value={LinkPurpose.OTHER}>Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            {...register('notes', {
              maxLength: {
                value: 500,
                message: 'Notes cannot exceed 500 characters',
              },
            })}
            rows={3}
            className={`mt-1 block w-full rounded-md ${
              errors.notes
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            } shadow-sm sm:text-sm`}
            placeholder="Additional instructions or details..."
          />
          {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
          <p className="mt-1 text-xs text-gray-500">Optional - Maximum 500 characters</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="active_on" className="block text-sm font-medium text-gray-700">
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
              className={`mt-1 block w-full rounded-md ${
                errors.active_on
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              } shadow-sm sm:text-sm`}
            />
            {errors.active_on && (
              <p className="mt-1 text-sm text-red-600">{errors.active_on.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="expiration" className="block text-sm font-medium text-gray-700">
              Expires On
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
              className={`mt-1 block w-full rounded-md ${
                errors.expiration
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              } shadow-sm sm:text-sm`}
            />
            {errors.expiration && (
              <p className="mt-1 text-sm text-red-600">{errors.expiration.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700">
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
            className={`mt-1 block w-full rounded-md ${
              errors.max_uses
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            } shadow-sm sm:text-sm`}
            placeholder="Leave empty for unlimited"
          />
          {errors.max_uses ? (
            <p className="mt-1 text-sm text-red-600">{errors.max_uses.message}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Leave empty for unlimited uses (max 1000 if specified)
            </p>
          )}
        </div>

        <div className="rounded-md bg-gray-50 p-4">
          <div className="text-sm text-gray-600">
            <p className="mb-2 font-medium">Link Information:</p>
            <p className="flex items-center">
              Access Code:
              <code className="mx-2 rounded bg-gray-200 px-2 py-1">{link.link_code}</code>
              <button
                type="button"
                onClick={copyCode}
                className="text-gray-400 transition-colors hover:text-gray-600"
                title="Copy access code"
              >
                <FiCopy className="h-4 w-4" />
              </button>
            </p>
            <p>
              Usage: {link.granted_count}/{link.max_uses || '∞'}
            </p>
            <p>Created: {new Date(link.created_at).toLocaleString()}</p>
            {link.updated_at && <p>Last Updated: {new Date(link.updated_at).toLocaleString()}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              void navigate('/links')
            }}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Link'}
          </button>
        </div>
      </form>
    </div>
  )
}
