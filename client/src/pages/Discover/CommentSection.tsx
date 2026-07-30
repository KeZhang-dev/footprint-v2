import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getComments, postComment, type TripComment } from '../../api/discover'

interface CommentSectionProps {
  tripId: number
  showInput: boolean
  onCommentPosted: () => void
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function CommentSection({ tripId, showInput, onCommentPosted }: CommentSectionProps) {
  const [comments, setComments] = useState<TripComment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getComments(tripId)
      .then((data) => {
        if (!cancelled) setComments(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load comments.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tripId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setSubmitting(true)
    try {
      const comment = await postComment(tripId, text.trim())
      setComments((prev) => [...prev, comment])
      setText('')
      setError(null)
      onCommentPosted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-500">Comments</h3>

      {showInput && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            autoFocus
            required
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            Post
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              {comment.authorAvatarUrl ? (
                <img
                  src={comment.authorAvatarUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  {initials(comment.authorDisplayName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">
                    {comment.authorDisplayName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDateTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm break-words text-slate-600">
                  {comment.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CommentSection
