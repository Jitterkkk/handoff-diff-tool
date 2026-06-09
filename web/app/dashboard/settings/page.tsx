import { cookies } from 'next/headers'
import { SlackSettings } from '@/components/SlackSettings'
import { getSlackIntegration } from '@/lib/api'

export default async function SettingsPage() {
  const store = await cookies()
  const token = store.get('handoff_token')?.value ?? ''

  const integration = token ? await getSlackIntegration({ token }) : null

  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Integrações e preferências</p>
      </div>
      <SlackSettings initialIntegration={integration} />
    </div>
  )
}
