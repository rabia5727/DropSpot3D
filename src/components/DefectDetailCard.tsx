import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { resolveSuggestion, updateDefect, uploadDefectPhoto } from '../lib/defects'
import type { Defect } from '../lib/types'
import { DEFECT_LABELS } from '../lib/types'

interface Props {
  defect: Defect
  onClose: () => void
}

export function DefectDetailCard({ defect, onClose }: Props) {
  const [note, setNote] = useState(defect.note ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function saveNote() {
    if (note === (defect.note ?? '')) return
    setSaving(true)
    try {
      await updateDefect({ id: defect.id, note })
    } finally {
      setSaving(false)
    }
  }

  async function toggleResolved() {
    await updateDefect({ id: defect.id, resolved: !defect.resolved })
  }

  async function handlePhotoSelected(file: File) {
    setUploading(true)
    try {
      const photo_url = await uploadDefectPhoto(file)
      await updateDefect({ id: defect.id, photo_url })
    } finally {
      setUploading(false)
    }
  }

  async function handleCopyPhotoLink() {
    if (!defect.photo_url) return
    await navigator.clipboard.writeText(defect.photo_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute left-4 top-4 z-40 w-72 rounded-xl border border-white/10 bg-[#12141c] p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{DEFECT_LABELS[defect.defect_type]}</h3>
        <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
          ×
        </button>
      </div>
      <p className="mt-1 text-xs text-white/50">
        {new Date(defect.created_at).toLocaleString()} · {defect.source}
      </p>

      {defect.photo_url ? (
        <div className="mt-3">
          <img
            src={defect.photo_url}
            alt="Photo of the defect"
            className="h-32 w-full rounded-lg border border-white/10 object-cover"
          />
          <button
            type="button"
            onClick={handleCopyPhotoLink}
            className="mt-1 w-full rounded bg-white/5 px-2 py-1 text-[10px] text-white/60 hover:bg-white/10"
          >
            {copied ? 'Copied' : 'Copy photo link (to give the agent)'}
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePhotoSelected(file)
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Attach Photo'}
          </button>
        </>
      )}

      {defect.suggestion_status === 'pending' && (
        <div className="mt-3 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-2 text-xs text-yellow-200">
          <p className="font-medium">Agent suggests:</p>
          <p>
            {defect.suggested_defect_type ? DEFECT_LABELS[defect.suggested_defect_type] : '-'} ·{' '}
            {defect.suggested_severity ?? '-'}
          </p>
          {defect.suggestion_note && <p className="mt-1 opacity-80">{defect.suggestion_note}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => resolveSuggestion(defect.id, 'accept')}
              className="rounded bg-green-500/80 px-2 py-1 text-white"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => resolveSuggestion(defect.id, 'reject')}
              className="rounded bg-white/10 px-2 py-1 text-white"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={saveNote}
        placeholder="Add a note..."
        className="mt-3 h-16 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white outline-none"
      />

      <label className="mt-3 flex items-center gap-2 text-xs text-white/70">
        <input type="checkbox" checked={defect.resolved} onChange={toggleResolved} />
        Resolved
      </label>
      {saving && <p className="mt-1 text-[10px] text-white/40">Saving…</p>}
    </motion.div>
  )
}
