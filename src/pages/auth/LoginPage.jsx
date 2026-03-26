import { useMemo, useState } from 'react'
import { LockKeyhole, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import logo from '../../assets/ywstudio_logo.jpg'
import { useAuthStore } from '../../store/useAuthStore'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)
  const isLoggingIn = useAuthStore((state) => state.isLoggingIn)
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const redirectTo = useMemo(() => {
    const from = location.state?.from
    if (typeof from === 'string' && from.startsWith('/')) {
      return from
    }
    return '/usuarios'
  }, [location.state])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const email = form.email.trim()
    const password = form.password

    if (!email) {
      toast.error('Ingresa tu correo electrónico.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('El formato de correo no es válido.')
      return
    }

    if (!password) {
      toast.error('Ingresa tu contraseña.')
      return
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    const result = await login({ email, password })
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success('Sesión iniciada correctamente.')
    navigate(redirectTo, { replace: true })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-warm">
      <div className="pointer-events-none absolute -top-24 left-[-120px] h-96 w-96 rounded-full bg-primary/80 blur-[80px] transition-all duration-1000" />
      <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-96 w-96 rounded-full bg-secondary/30 blur-[80px] transition-all duration-1000" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 sm:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
          <article className="hidden rounded-3xl border border-secondary/15 bg-white/50 p-8 backdrop-blur-xl shadow-2xl shadow-secondary/5 lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">
              <img src={logo} alt="YW Studio" className="h-[18px] w-[18px] rounded-full object-cover shadow-sm" />
              ywstudio loyalty
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-ink">
              Administra el programa de lealtad.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-ink/75">
              Inicia sesión para gestionar el programa de lealtad con trazabilidad, reglas de negocio y operación diaria.
            </p>
          </article>

          <article className="rounded-3xl border border-secondary/20 bg-white/95 p-6 shadow-xl shadow-secondary/10 sm:p-8 transition-shadow hover:shadow-2xl hover:shadow-secondary/15 duration-500">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">Acceso seguro</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Iniciar sesión</h2>
              <p className="mt-2 text-sm text-ink/70">Accede con tu cuenta de administrador.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="loginEmail" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
                  Correo electrónico *
                </label>
                <div className="group flex items-center gap-2 rounded-xl border border-secondary/25 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:border-secondary/50 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                  <Mail size={16} className="text-secondary/90" />
                  <input
                    id="loginEmail"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, email: event.target.value }))
                    }
                    className="w-full border-none bg-transparent text-sm text-ink outline-none"
                    placeholder="Ej. admin@ywstudio.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="loginPassword"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
                >
                  Contraseña *
                </label>
                <div className="group flex items-center gap-2 rounded-xl border border-secondary/25 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:border-secondary/50 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
                  <LockKeyhole size={16} className="text-secondary/90" />
                  <input
                    id="loginPassword"
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, password: event.target.value }))
                    }
                    className="w-full border-none bg-transparent text-sm text-ink outline-none"
                    placeholder="Tu contraseña"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingIn ? 'Validando credenciales...' : 'Iniciar sesión'}
              </button>
            </form>
          </article>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
