import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  footer: ReactNode
  children: ReactNode
}

function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:flex-row">
      <div className="relative hidden min-h-[520px] flex-col items-start justify-start gap-4 p-10 lg:flex lg:w-1/2">
        <img
          src="/login-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/10" />
        <span className="relative z-10 w-fit rounded-full bg-white/15 px-4 py-1 text-sm font-medium text-white backdrop-blur-sm">
          Travel Journal
        </span>
        <h2 className="relative z-10 text-4xl leading-tight font-bold text-white">
          Every trip tells
          <br />
          <span className="italic">a story.</span>
        </h2>
        <p className="relative z-10 max-w-xs text-white/80">
          Log your adventures, share your journey, and turn your memories
          into a story worth telling.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-8 sm:p-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-slate-600">{subtitle}</p>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
