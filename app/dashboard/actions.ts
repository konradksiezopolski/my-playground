'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deleteJob(formData: FormData) {
  const jobId = formData.get('jobId') as string
  if (!jobId) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('jobs').delete().eq('id', jobId).eq('user_id', user.id)
  revalidatePath('/dashboard')
}
