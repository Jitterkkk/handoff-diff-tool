'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { checkItem } from '@/lib/api'

export async function toggleReviewItem(
  reviewId: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  const store = await cookies()
  const token = store.get('handoff_token')?.value
  if (!token) throw new Error('Not authenticated')
  await checkItem({ token }, reviewId, itemId, checked)
  revalidatePath(`/dashboard/reviews/${reviewId}`)
}

export async function logout(): Promise<void> {
  const store = await cookies()
  store.delete('handoff_token')
}
