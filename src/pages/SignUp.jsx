import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthField from '../components/auth/AuthField'
import { useAuth } from '../context/AuthContext'
import { isNitEmail, nitEmailHint } from '../lib/email'

export default function SignUp() {
  const { signUp, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNo, setPhoneNo] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')

  const strength = useMemo(() => scorePassword(password), [password])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isNitEmail(email)) {
      setEmailError(nitEmailHint())
      return
    }
    if (!agree || password !== confirm) return
    setEmailError('')
    setFormError('')
    setSubmitting(true)
    const result = await signUp({ name: fullName, email, phoneNo, password })
    setSubmitting(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="Join Campus Assist"
      title="Campus help, from students like you."
      subtitle="Join Nitjsr students who share small daily favours — request what you need, or fulfil a request when you’re already around."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/signin"
            className="font-semibold text-jade transition-colors hover:text-jade-deep"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-7">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          Sign up
        </h2>
        <p className="mt-1.5 text-sm font-semibold text-stone">
          Open to every hostel and day scholar · @nitjsr.ac.in only
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="fullName"
          label="Full name"
          autoComplete="name"
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <div>
          <AuthField
            id="email"
            label="NIT email"
            type="email"
            autoComplete="email"
            placeholder="rollno@nitjsr.ac.in"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError('')
              if (formError) setFormError('')
            }}
          />
          {emailError ? (
            <p className="mt-2 text-sm text-red-700/90" role="alert">
              {emailError}
            </p>
          ) : (
            <p className="mt-2 text-xs text-stone">
              Must end with @nitjsr.ac.in
            </p>
          )}
        </div>

        <AuthField
          id="phoneNo"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="Your phone number"
          value={phoneNo}
          onChange={(e) => setPhoneNo(e.target.value)}
        />

        <div>
          <AuthField
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide text-stone uppercase transition-colors hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
          />
          <PasswordStrength strength={strength} />
        </div>

        <AuthField
          id="confirm"
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {confirm && password !== confirm ? (
          <p className="text-sm text-red-700/90" role="alert">
            Passwords do not match.
          </p>
        ) : null}

        {formError ? (
          <p className="text-sm text-red-700/90" role="alert">
            {formError}
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm leading-snug text-stone">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-line accent-jade"
            required
          />
          <span>
            I agree to the{' '}
            <button type="button" className="font-medium text-jade hover:text-jade-deep">
              Terms
            </button>{' '}
            and{' '}
            <button type="button" className="font-medium text-jade hover:text-jade-deep">
              Privacy Policy
            </button>
            , and confirm I am an NIT Jamshedpur student.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || !agree || (confirm && password !== confirm)}
          className="auth-btn-sheen mt-2 flex w-full items-center justify-center rounded-xl bg-jade px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-[transform,opacity] duration-200 hover:bg-jade-deep active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}

function scorePassword(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

function PasswordStrength({ strength }) {
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const tones = [
    'bg-line',
    'bg-red-400/80',
    'bg-amber-400/90',
    'bg-jade-glow/80',
    'bg-jade',
  ]

  return (
    <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              strength >= step ? tones[strength] : 'bg-line'
            }`}
          />
        ))}
      </div>
      <span className="min-w-12 text-right text-xs font-medium text-stone">
        {labels[strength]}
      </span>
    </div>
  )
}
