import { Link } from 'react-router-dom'

export default function AuthLayout({
  children,
  eyebrow,
  title,
  subtitle,
  footer,
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink text-white">
      {/* Full-bleed NIT Jamshedpur campus — kept vivid */}
      <div className="auth-fade absolute inset-0" aria-hidden>
        <img
          src="/nitjsr-campus.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        {/* Darken only where copy sits; photo stays rich on the right */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(6,21,16,0.88) 0%, rgba(6,21,16,0.78) 42%, rgba(6,21,16,0.35) 62%, rgba(6,21,16,0.2) 100%)',
          }}
        />
        <div
          className="auth-mesh absolute -left-[12%] top-[-18%] h-[50%] w-[48%] rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(circle, rgba(18,168,132,0.35) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-dvh max-w-7xl grid-cols-1 lg:grid-cols-2">
        <section className="flex flex-col justify-between px-5 py-7 sm:px-10 sm:py-10 lg:px-14 lg:py-14">
          <div className="auth-rise">
            <Link
              to="/signin"
              className="font-display text-lg font-bold tracking-[-0.02em] text-white"
            >
              Campus Assist
            </Link>
            <p className="mt-2 text-sm font-semibold tracking-wide text-jade-glow">
              NIT Jamshedpur · for the whole campus
            </p>
          </div>

          <div className="auth-rise auth-rise-delay-1 my-7 max-w-lg sm:my-12 lg:my-0">
            <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-jade-glow uppercase">
              {eyebrow}
            </p>
            <h1 className="font-display text-3xl leading-[1.1] font-bold tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.15rem]">
              {title}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed font-medium text-white/90 sm:mt-4 sm:text-[1.05rem]">
              {subtitle}
            </p>

            <ul className="mt-6 hidden space-y-3.5 text-[0.95rem] font-semibold text-white sm:block sm:mt-8">
              <li className="flex gap-3">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-jade-glow" />
                Raise a request room — tip, place, and what you need.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-jade-glow" />
                Browse the live lobby and enter any open room.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-jade-glow" />
                Owners stay in control — lock, chat, or throw helpers out.
              </li>
            </ul>
          </div>

          <p className="auth-rise auth-rise-delay-3 hidden text-sm font-semibold text-white/80 lg:block">
            Connecting students who need help with those willing to assist.
          </p>
        </section>

        <section className="flex items-center px-4 pb-8 sm:px-10 sm:pb-12 lg:px-12 lg:pb-0">
          <div className="auth-rise auth-rise-delay-2 w-full max-w-md rounded-2xl border border-white/20 bg-white p-5 text-ink shadow-[0_28px_70px_-24px_rgba(0,0,0,0.55)] sm:p-9 lg:ml-auto">
            {children}
            {footer ? (
              <p className="mt-7 text-center text-sm font-medium text-stone">
                {footer}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
