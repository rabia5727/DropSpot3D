import { useRef, useState } from 'react'
import { uploadDefectPhoto } from '../lib/defects'

/**
 * Lets a human get a real, shareable URL for a defect photo without needing
 * an external image host - uploads straight to our own Supabase Storage
 * bucket. Paste the resulting link into an agent chat (Rook/ChatGPT) along
 * with a description; the agent can view it and pass the same URL back to
 * log_defect via `photo_url`, so the real photo travels with the defect.
 */
export function PhotoUploadWidget() {
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setUrl(null)
    setCopied(false)
    try {
      const publicUrl = await uploadDefectPhoto(file)
      setUrl(publicUrl)
    } finally {
      setUploading(false)
    }
  }

  async function handleCopy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
        Defect Photo → Link
      </h2>
      <p className="mb-2 text-[11px] text-white/40">
        Upload a photo, get a link, paste it to the agent so it can view the real defect.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload Photo'}
      </button>

      {url && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-2">
          <span className="flex-1 truncate text-[10px] text-cyan-300">{url}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded bg-cyan-400/20 px-2 py-1 text-[10px] font-medium text-cyan-200"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
