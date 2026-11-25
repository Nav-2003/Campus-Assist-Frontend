import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthField from '../components/auth/AuthField'
import { useAuth } from '../context/AuthContext'
import { isNitEmail, nitEmailHint } from '../lib/email'
import { resetPassword, sendEmailOtp, verifyEmailOtp } from '../lib/auth'

export default function ForgotPassword() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSendOtp() {
    setError('')
    setMessage('')
    if (!isNitEmail(email)) {
      setError(nitEmailHint())
      return
    }
    setBusy(true)
    const result = await sendEmailOtp(email)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setOtpSent(true)
    setMessage('Verification code sent. It is valid for 5 minutes.')
  }

  async function handleVerifyOtp() {
    setBusy(true)
    setError('')
    setMessage('')
    const result = await verifyEmailOtp(email, otp)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setVerifiedEmail(email.trim().toLowerCase())
    setMessage('Email verified. Choose a new password below.')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (verifiedEmail !== email.trim().toLowerCase()) {
      setError('Verify your email before updating the password.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    const result = await resetPassword(email, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setUpdated(true)
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Get back to campus."
      subtitle="Verify your NIT Jamshedpur email, then choose a new password for your account."
      footer={
        <>
          Remembered your password?{' '}
          <Link to="/signin" className="font-semibold text-jade transition-colors hover:text-jade-deep">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-7">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          {updated ? 'Password updated' : 'Reset password'}
        </h2>
        <p className="mt-1.5 text-sm font-semibold text-stone">
          {updated ? 'Your password has been changed successfully.' : 'We will verify your email with a one time code.'}
        </p>
      </div>

      {updated ? (
        <Link to="/signin" className="auth-btn-sheen flex w-full items-center justify-center rounded-xl bg-jade px-4 py-3.5 text-sm font-semibold text-white hover:bg-jade-deep">
          Continue to sign in
        </Link>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <AuthField
              id="email"
              label="NIT email"
              type="email"
              autoComplete="email"
              placeholder="rollno@nitjsr.ac.in"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setOtpSent(false)
                setVerifiedEmail('')
                setOtp('')
                setMessage('')
                setError('')
              }}
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={busy || verifiedEmail === email.trim().toLowerCase()}
              className="mt-3 rounded-lg border border-jade px-3 py-2 text-sm font-semibold text-jade hover:bg-jade/5 disabled:opacity-55"
            >
              {busy ? 'Please wait…' : otpSent ? 'Resend code' : 'Send verification code'}
            </button>
          </div>

          {otpSent && verifiedEmail !== email.trim().toLowerCase() ? (
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-bold text-ink">Verification code</label>
              <div className="flex gap-2">
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digit code"
                  className="min-w-0 flex-1 rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-jade"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={busy || otp.length !== 6}
                  className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-55"
                >
                  Verify
                </button>
              </div>
            </div>
          ) : null}

          {verifiedEmail === email.trim().toLowerCase() ? (
            <>
              <AuthField
                id="new-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <AuthField
                id="confirm-password"
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter it again"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button
                type="submit"
                disabled={busy || password.length < 8 || password !== confirmPassword}
                className="auth-btn-sheen flex w-full items-center justify-center rounded-xl bg-jade px-4 py-3.5 text-sm font-semibold text-white hover:bg-jade-deep disabled:opacity-55"
              >
                {busy ? 'Updating password…' : 'Update password'}
              </button>
            </>
          ) : null}

          {message ? <p className="text-sm text-jade-deep" role="status">{message}</p> : null}
          {error ? <p className="text-sm text-red-700/90" role="alert">{error}</p> : null}
        </form>
      )}
    </AuthLayout>
  )
}
