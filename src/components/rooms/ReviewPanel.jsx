import { useState } from 'react'
import { submitRoomReview } from '../../lib/rooms'

export default function ReviewPanel({ room, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!rating || busy) return
    setBusy(true)
    setError('')
    const result = await submitRoomReview(room.id, rating, feedback)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSubmitted()
  }

  return <section className="overflow-hidden rounded-3xl border border-jade/20 bg-white shadow-[0_20px_60px_-42px_rgba(6,21,16,0.45)]">
    <div className="grid gap-4 bg-gradient-to-br from-ink via-[#0b3027] to-jade-deep p-4 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-jade-glow">Task complete</p><h2 className="mt-2 font-display text-2xl font-bold">How was your experience?</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">Your review helps other students choose a reliable helper and helps the community improve.</p></div>
      <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-3xl" aria-hidden="true">✦</div>
    </div>

    {room.review ? <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-jade">Your review</p><div className="mt-2 flex gap-1" aria-label={`${room.review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <span key={index} className={index < room.review.rating ? 'text-amber-500' : 'text-stone/25'}>★</span>)}</div></div><span className="rounded-full bg-jade/10 px-3 py-1.5 text-xs font-bold text-jade-deep">Submitted</span></div>
      {room.review.feedback && <p className="mt-5 rounded-2xl border border-line/70 bg-mist/50 p-4 text-sm leading-relaxed text-stone">“{room.review.feedback}”</p>}
      <p className="mt-4 text-xs font-medium text-stone">Thanks for helping make Campus Assist better.</p>
    </div> : <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-8">
      <fieldset>
        <legend className="text-sm font-bold text-ink">Your overall rating <span className="text-rose-600">*</span></legend>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHovered(0)}>
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1
            return <button key={value} type="button" onMouseEnter={() => setHovered(value)} onFocus={() => setHovered(value)} onBlur={() => setHovered(0)} onClick={() => setRating(value)} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} aria-pressed={rating === value} className={`rounded-lg p-1 text-3xl transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade ${value <= (hovered || rating) ? 'text-amber-500' : 'text-stone/25'}`}>★</button>
          })}
        </div>
        <p className="mt-1 text-xs font-medium text-stone">{rating ? ['','We’ll do better','Could be better','Good experience','Great experience','Excellent experience'][rating] : 'Select 1 to 5 stars'}</p>
      </fieldset>
      <label className="block"><span className="text-sm font-bold text-ink">Share a few details <span className="font-medium text-stone">(optional)</span></span><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={600} rows={4} placeholder="What went well? Your note can help the next student." className="mt-2 w-full resize-y rounded-2xl border border-line bg-mist/40 px-4 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-stone/70 focus:border-jade focus:bg-white"/><span className="mt-1 block text-right text-xs text-stone">{feedback.length}/600</span></label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={!rating || busy} className="rounded-xl bg-jade px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-jade-deep disabled:cursor-not-allowed disabled:opacity-45">{busy ? 'Sending review…' : 'Submit review'}</button><p className="text-xs text-stone">You can submit one review for this task.</p></div>
    </form>}
  </section>
}
