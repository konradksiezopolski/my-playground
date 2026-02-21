import { put, del } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('image') as File

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const blob = await put(file.name, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}

export async function DELETE(request: Request) {
  const { url } = await request.json() as { url: string }
  await del(url)
  return NextResponse.json({ success: true })
}
