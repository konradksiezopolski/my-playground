import Replicate from 'replicate'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: Request) {
  const { imageUrl } = await request.json() as { imageUrl: string }

  if (!imageUrl) {
    return NextResponse.json({ error: 'No imageUrl provided' }, { status: 400 })
  }

  const output = await replicate.run(
    'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
    { input: { image: imageUrl, scale: 2 } }
  ) as unknown as string

  return NextResponse.json({ resultUrl: output })
}
