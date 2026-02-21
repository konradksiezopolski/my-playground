export type UpscaleState = 'idle' | 'uploading' | 'ready' | 'processing' | 'complete' | 'error'
export type Resolution = '2x' | '4x' | '8x'
export type OutputFormat = 'jpg' | 'png' | 'webp' | 'tiff'

export interface UploadedFile {
  file: File
  previewUrl: string
  width: number
  height: number
}
