import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthField from '../components/auth/AuthField'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, URGENCY, createRoom } from '../lib/rooms'

const empty = {
  title: '',
  description: '',
  location: '',
  tip: '20',
  category: 'errand',
  urgency: 'normal',
}

export default function RaiseRequest() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const result = await createRoom(user, form)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    refresh()
    navigate(`/rooms/${result.room.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="auth-rise mb-8">
        <p className="text-xs font-semibold tracking-[0.08em] text-jade uppercase">
          New request room
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl">
          What do you need on campus?
        </h1>
        <p className="mt-3 text-sm leading-relaxed font-medium text-stone sm:text-base">
          Your room goes live on the lobby. Helpers can enter, chat, and
          coordinate — you can lock or remove anyone anytime.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="auth-rise auth-rise-delay-1 space-y-5 rounded-3xl border border-line/80 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(6,21,16,0.45)] sm:p-8"
        noValidate
      >
        <AuthField
          id="title"
          label="Short title"
          placeholder="e.g. Need printout near Library"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
        />

        <label htmlFor="description" className="block">
          <span className="mb-2 block text-sm font-bold text-ink">
            What you need
          </span>
          <textarea
            id="description"
            required
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Details helpers should know — quantity, timing, anything useful."
            className="auth-field w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-[0.95rem] font-medium text-ink outline-none placeholder:text-stone/50"
          />
        </label>

        <AuthField
          id="location"
          label="Meet / drop address"
          placeholder="e.g. Hostel B gate, Academic block, Canteen"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
        />

        <div>
          <span className="mb-2 block text-sm font-bold text-ink">Category</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => update('category', c.id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors ${
                  form.category === c.id
                    ? 'border-jade bg-jade/10 text-jade-deep'
                    : 'border-line text-stone hover:border-jade/40 hover:text-ink'
                }`}
              >
                <span className="mr-1.5" aria-hidden>
                  {c.emoji}
                </span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className="mb-2 block text-sm font-bold text-ink">Tip (₹)</span>
            <input
              type="number"
              min="0"
              max="500"
              value={form.tip}
              onChange={(e) => update('tip', e.target.value)}
              className="auth-field w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.95rem] font-medium text-ink outline-none"
            />
          </label>

          <label className="block sm:col-span-1">
            <span className="mb-2 block text-sm font-bold text-ink">Urgency</span>
            <select
              value={form.urgency}
              onChange={(e) => update('urgency', e.target.value)}
              className="auth-field w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.95rem] font-medium text-ink outline-none"
            >
              {URGENCY.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

        </div>

        {error ? (
          <p className="text-sm text-red-700/90" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="auth-btn-sheen flex w-full items-center justify-center rounded-xl bg-jade px-4 py-3.5 text-sm font-semibold text-white transition-[transform,opacity] hover:bg-jade-deep active:scale-[0.985] disabled:opacity-70"
        >
          {submitting ? 'Opening room…' : 'Open request room'}
        </button>
      </form>
    </div>
  )
}
