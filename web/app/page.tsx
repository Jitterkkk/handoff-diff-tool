import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  redirect(token ? '/dashboard' : '/login')
}
