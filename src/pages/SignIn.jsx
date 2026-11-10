import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthField from '../components/auth/AuthField'
import { useAuth } from '../context/AuthContext'
import { isNitEmail, nitEmailHint } from '../lib/email'

export default function SignIn() {
  const { signIn, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isNitEmail(email)) {
      setEmailError(nitEmailHint())
      return
    }
    setEmailError('')
    setFormError('')
    setSubmitting(true)
    const result = await signIn({ email, password, remember })
    setSubmitting(false)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    const dest = location.state?.from || '/dashboard'
    navigate(dest, { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="NIT Jamshedpur"
      title="Your campus help network."
      subtitle="Sign in to ask for a hand — or help a fellow Nitjsr student when you’re free and nearby."
      footer={
        <>
          New to Campus Assist?{' '}
          <Link
            to="/signup"
            className="font-semibold text-jade transition-colors hover:text-jade-deep"
          >
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-7">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          Sign in
        </h2>
        <p className="mt-1.5 text-sm font-semibold text-stone">
          Only @nitjsr.ac.in emails are allowed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          ) : null}
        </div>

        <AuthField
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (formError) setFormError('')
          }}
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

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 rounded border-line accent-jade"
            />
            Remember me
          </label>
          <button
            type="button"
            className="text-sm font-medium text-jade transition-colors hover:text-jade-deep"
          >
            Forgot password?
          </button>
        </div>

        {formError ? (
          <p className="text-sm text-red-700/90" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="auth-btn-sheen mt-2 flex w-full items-center justify-center rounded-xl bg-jade px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-[transform,opacity] duration-200 hover:bg-jade-deep active:scale-[0.985] disabled:opacity-70"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
