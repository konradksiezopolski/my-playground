import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Job {
  id: string
  result_url: string
  resolution: string
  format: string
  created_at: string
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  const date = new Date(job.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <div className="aspect-square overflow-hidden bg-zinc-50">
        <img
          src={job.result_url}
          alt="Upscaled image"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3">
        <p className="text-xs text-zinc-400">
          {job.resolution.toUpperCase()} · {job.format.toUpperCase()} · {date}
        </p>
        <a
          href={job.result_url}
          download
          className="mt-2 flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline"
        >
          ↓ Download
        </a>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })

  const allJobs = jobs ?? []
  const now = new Date()
  const thisMonthJobs = allJobs.filter((job) => {
    const d = new Date(job.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-8">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
          <StatCard label="Total upscales" value={allJobs.length} />
          <StatCard label="This month" value={thisMonthJobs.length} />
          <StatCard label="Plan" value="Free" />
          <StatCard label="Credits" value="2× only" />
        </div>

        {/* Jobs */}
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Past Upscales</h2>
        {allJobs.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <p>No upscales yet.</p>
            <a href="/" className="mt-2 inline-block text-sm text-zinc-900 underline underline-offset-2">
              Upscale your first image →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {allJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
