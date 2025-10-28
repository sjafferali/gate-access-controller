import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiX, FiPlus, FiTrash } from 'react-icons/fi'
import { notificationProvidersApi } from '@/services/api'
import {
  NotificationProvider,
  NotificationProviderType,
  CreateNotificationProvider,
  UpdateNotificationProvider,
  PushoverConfig,
  WebhookConfig,
} from '@/types'

// Form type with flattened fields for easier form management
interface NotificationProviderFormData {
  name: string
  enabled: boolean
  // Pushover fields
  pushover_user_key?: string
  pushover_api_token?: string
  pushover_priority?: string
  pushover_sound?: string
  pushover_device?: string
  // Webhook fields
  webhook_url?: string
  webhook_method?: string
  webhook_body_template?: string
}

interface Props {
  provider?: NotificationProvider | null
  onClose: () => void
}

export default function NotificationProviderModal({ provider, onClose }: Props) {
  const isEditing = !!provider
  const [providerType, setProviderType] = useState<NotificationProviderType>(
    provider?.provider_type || NotificationProviderType.PUSHOVER
  )
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    provider?.provider_type === NotificationProviderType.WEBHOOK
      ? Object.entries((provider.config as WebhookConfig).headers || {}).map(([key, value]) => ({
          key,
          value,
        }))
      : [{ key: '', value: '' }]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<NotificationProviderFormData>({
    defaultValues: {
      name: provider?.name || '',
      enabled: provider?.enabled !== false,
    },
  })

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: CreateNotificationProvider | UpdateNotificationProvider) => {
      if (isEditing && provider) {
        return notificationProvidersApi.update(provider.id, data as UpdateNotificationProvider)
      } else {
        return notificationProvidersApi.create(data as CreateNotificationProvider)
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Provider updated successfully' : 'Provider created successfully')
      onClose()
    },
    onError: () => {
      toast.error(isEditing ? 'Failed to update provider' : 'Failed to create provider')
    },
  })

  const onSubmit = (data: NotificationProviderFormData) => {
    // Build config based on provider type
    let config: PushoverConfig | WebhookConfig

    if (providerType === NotificationProviderType.PUSHOVER) {
      config = {
        user_key: data.pushover_user_key || '',
        api_token: data.pushover_api_token || '',
        priority: parseInt(data.pushover_priority || '0'),
        sound: data.pushover_sound || 'pushover',
        device: data.pushover_device || undefined,
      }
    } else {
      const headersObj = headers.reduce(
        (acc, h) => {
          if (h.key && h.value) {
            acc[h.key] = h.value
          }
          return acc
        },
        {} as Record<string, string>
      )

      config = {
        url: data.webhook_url || '',
        method: data.webhook_method || 'POST',
        headers: headersObj,
        body_template: data.webhook_body_template || undefined,
      }
    }

    const payload = {
      name: data.name,
      provider_type: providerType,
      config,
      enabled: data.enabled !== false,
    }

    mutation.mutate(payload)
  }

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers]
    if (newHeaders[index]) {
      newHeaders[index][field] = value
      setHeaders(newHeaders)
    }
  }

  // Set initial values for editing
  useEffect(() => {
    if (provider) {
      if (provider.provider_type === NotificationProviderType.PUSHOVER) {
        const config = provider.config as PushoverConfig
        setValue('pushover_user_key', config.user_key)
        setValue('pushover_api_token', config.api_token)
        setValue('pushover_priority', config.priority.toString())
        setValue('pushover_sound', config.sound || 'pushover')
        setValue('pushover_device', config.device || '')
      } else {
        const config = provider.config as WebhookConfig
        setValue('webhook_url', config.url)
        setValue('webhook_method', config.method)
        setValue('webhook_body_template', config.body_template || '')
      }
    }
  }, [provider, setValue])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Notification Provider' : 'Create Notification Provider'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
            {/* Basic Info */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Provider Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Main Pushover, Slack Webhook"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
            </div>

            {/* Provider Type */}
            {!isEditing && (
              <div>
                <label className="mb-2 block text-sm font-medium">Provider Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value={NotificationProviderType.PUSHOVER}
                      checked={providerType === NotificationProviderType.PUSHOVER}
                      onChange={(e) => setProviderType(e.target.value as NotificationProviderType)}
                      className="mr-2"
                    />
                    Pushover
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value={NotificationProviderType.WEBHOOK}
                      checked={providerType === NotificationProviderType.WEBHOOK}
                      onChange={(e) => setProviderType(e.target.value as NotificationProviderType)}
                      className="mr-2"
                    />
                    Webhook
                  </label>
                </div>
              </div>
            )}

            {/* Pushover Configuration */}
            {providerType === NotificationProviderType.PUSHOVER && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    User Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('pushover_user_key', {
                      required: providerType === NotificationProviderType.PUSHOVER,
                    })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    placeholder="Your Pushover user key"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    API Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('pushover_api_token', {
                      required: providerType === NotificationProviderType.PUSHOVER,
                    })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    placeholder="Your application API token"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Priority</label>
                  <select
                    {...register('pushover_priority')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="-2">Lowest</option>
                    <option value="-1">Low</option>
                    <option value="0">Normal</option>
                    <option value="1">High</option>
                    <option value="2">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Sound (optional)</label>
                  <select
                    {...register('pushover_sound')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="pushover">Pushover (default)</option>
                    <option value="bike">Bike</option>
                    <option value="bugle">Bugle</option>
                    <option value="cashregister">Cash Register</option>
                    <option value="classical">Classical</option>
                    <option value="cosmic">Cosmic</option>
                    <option value="falling">Falling</option>
                    <option value="gamelan">Gamelan</option>
                    <option value="incoming">Incoming</option>
                    <option value="intermission">Intermission</option>
                    <option value="magic">Magic</option>
                    <option value="mechanical">Mechanical</option>
                    <option value="pianobar">Piano Bar</option>
                    <option value="siren">Siren</option>
                    <option value="spacealarm">Space Alarm</option>
                    <option value="tugboat">Tug Boat</option>
                    <option value="alien">Alien</option>
                    <option value="climb">Climb</option>
                    <option value="persistent">Persistent</option>
                    <option value="echo">Echo</option>
                    <option value="updown">Up Down</option>
                    <option value="vibrate">Vibrate</option>
                    <option value="none">None (silent)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Device (optional)</label>
                  <input
                    type="text"
                    {...register('pushover_device')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    placeholder="Specific device name (leave empty for all devices)"
                  />
                </div>
              </>
            )}

            {/* Webhook Configuration */}
            {providerType === NotificationProviderType.WEBHOOK && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Webhook URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    {...register('webhook_url', {
                      required: providerType === NotificationProviderType.WEBHOOK,
                    })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    placeholder="https://your-webhook-url.com/notify"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">HTTP Method</label>
                  <select
                    {...register('webhook_method')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Headers (optional)</label>
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                          placeholder="Header name"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                          placeholder="Header value"
                        />
                        <button
                          type="button"
                          onClick={() => removeHeader(index)}
                          className="rounded p-2 text-red-600 hover:bg-red-50"
                        >
                          <FiTrash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addHeader} className="btn btn-secondary btn-sm">
                      <FiPlus className="mr-1 h-4 w-4" />
                      Add Header
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Body Template (optional)</label>
                  <textarea
                    {...register('webhook_body_template')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    placeholder={`{"event": "{event_type}", "link": "{link_name}", "code": "{link_code}", "timestamp": "{timestamp}"}`}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Available placeholders: {'{link_code}'}, {'{link_name}'}, {'{event_type}'},{' '}
                    {'{timestamp}'}
                  </p>
                </div>
              </>
            )}

            {/* Enable/Disable */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('enabled')}
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">Enable this provider</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t bg-gray-50 p-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
              {mutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </div>
              ) : isEditing ? (
                'Update Provider'
              ) : (
                'Create Provider'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
