import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface DownloadButtonProps {
  fileUrl: string
  fileName: string
  onAfterDownload?: () => void
}

export function DownloadButton({ fileUrl, fileName, onAfterDownload }: DownloadButtonProps) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    onAfterDownload?.()
  }

  return (
    <Button onClick={handleDownload} size="lg" className="w-full gap-2">
      <Download className="h-4 w-4" />
      Download Upscaled Image
    </Button>
  )
}
