import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface DownloadButtonProps {
  fileUrl: string
  fileName: string
}

export function DownloadButton({ fileUrl, fileName }: DownloadButtonProps) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    a.click()
  }

  return (
    <Button onClick={handleDownload} size="lg" className="w-full gap-2">
      <Download className="h-4 w-4" />
      Download Upscaled Image
    </Button>
  )
}
