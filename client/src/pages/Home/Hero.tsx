import { Link } from 'react-router-dom'
import { useAuthStore } from '../../auth/authStore'

function Hero() {
  const session = useAuthStore((state) => state.session)
  const cta = session
    ? { to: '/trips', label: 'View your trips' }
    : { to: '/register', label: 'Get started' }

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Track every trip you take.
      </h1>
      <p className="max-w-xl text-lg text-slate-600">
        Footprint is a simple travel journal — log where you went, when, and
        what you want to remember about it.
      </p>
      <Link
        to={cta.to}
        className="rounded-full bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        {cta.label}
      </Link>
    </div>
  )
}

export default Hero
