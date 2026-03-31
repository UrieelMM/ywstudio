import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { CheckCircle2, ChevronDown, QrCode, TriangleAlert, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { doc, getDoc } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import bannerImage from '../../assets/banner.webp'
import defaultLogo from '../../assets/ywstudio_logo.jpg'
import Spinner from '../../components/ui/Spinner'
import { db } from '../../lib/firebase'
import { getFriendlyReason } from '../../lib/loyaltyMessages'
import { runPublicQrCheckIn } from '../../services/loyaltyTransactionsService'
import { useOperationsStore } from '../../store/useOperationsStore'

const TENANT_ID = 'tenant-ywstudio'
const DANCE_STUDIO_BANNER_URL = bannerImage

const formatDateTime = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : value
}

const getRejectionMessage = (reason, campaign) => {
  if (reason === 'QR_OUT_OF_WINDOW' && campaign?.validFromCustom && campaign?.validUntilCustom) {
    const nowLabel = dayjs().format('DD/MM/YYYY HH:mm')
    return `Este QR está vigente del ${formatDateTime(campaign.validFromCustom)} al ${formatDateTime(campaign.validUntilCustom)}. Fecha actual: ${nowLabel}.`
  }

  return getFriendlyReason(reason)
}

const createIdempotencyKey = () =>
  `pub_${dayjs().format('YYYYMMDDHHmmss')}_${Math.random().toString(36).slice(2, 10)}`

const sanitizeUserCode = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '')
const sanitizeEmail = (value) => String(value || '').trim().toLowerCase()

function PublicQrScanPage() {
  const { qrCodeId = '' } = useParams()
  const appConfig = useOperationsStore((state) => state.appConfig)
  const logo = appConfig.logoUrl || defaultLogo
  const formCardRef = useRef(null)
  const [isLoadingQr, setIsLoadingQr] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [qrCampaign, setQrCampaign] = useState(null)
  const [showScrollCta, setShowScrollCta] = useState(true)
  const [form, setForm] = useState({
    userId: '',
    email: '',
  })

  useEffect(() => {
    let mounted = true

    const loadQrData = async () => {
      setIsLoadingQr(true)
      try {
        const qrDoc = await getDoc(doc(db, 'tenants', TENANT_ID, 'qrCodes', qrCodeId))
        if (!mounted) {
          return
        }

        if (!qrDoc.exists()) {
          setQrCampaign(null)
          return
        }

        setQrCampaign(qrDoc.data())
      } catch {
        if (!mounted) {
          return
        }
        setQrCampaign(null)
      } finally {
        if (mounted) {
          setIsLoadingQr(false)
        }
      }
    }

    loadQrData()

    return () => {
      mounted = false
    }
  }, [qrCodeId])

  useEffect(() => {
    const target = formCardRef.current
    if (!target) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollCta(!entry.isIntersecting)
      },
      {
        threshold: 0.35,
      },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [isLoadingQr])

  const qrIsLikelyActive = useMemo(() => {
    if (!qrCampaign) {
      return false
    }

    if (qrCampaign.status !== 'active') {
      return false
    }

    const from = dayjs(qrCampaign.validFromCustom)
    const until = dayjs(qrCampaign.validUntilCustom)
    const now = dayjs()

    if (!from.isValid() || !until.isValid()) {
      return false
    }

    return !now.isBefore(from) && !now.isAfter(until)
  }, [qrCampaign])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const userId = sanitizeUserCode(form.userId)
    const email = sanitizeEmail(form.email)

    if (!userId || !email) {
      toast.error('Ingresa número de usuario y correo electrónico.')
      return
    }

    if (!/^ywstudio-\d{4,}$/.test(userId)) {
      toast.error('El número debe estar en formato ywstudio-0001.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('El correo electrónico no es válido.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await runPublicQrCheckIn({
        tenantId: TENANT_ID,
        qrCodeId,
        userId,
        email,
        idempotencyKey: createIdempotencyKey(),
        deviceId: 'public-qr-web',
      })

      setScanResult(result)

      if (result.ok) {
        toast.success(`Asistencia registrada (+${result.awardedVisits || 1} visita).`)
        setForm((previous) => ({ ...previous, userId: '' }))
      } else {
        toast.error(getRejectionMessage(result.reason, qrCampaign))
      }
    } catch {
      toast.error('No se pudo validar tu asistencia. Intenta de nuevo en unos segundos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToForm = () => {
    formCardRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-warm px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -top-24 right-[-120px] h-80 w-80 rounded-full bg-primary/65 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-130px] left-[-100px] h-80 w-80 rounded-full bg-secondary/25 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-3xl border border-secondary/20 bg-white/90 p-6 shadow-soft sm:p-8">
          <div className="relative mb-5 overflow-hidden rounded-2xl border border-secondary/20">
            <img
              src={DANCE_STUDIO_BANNER_URL}
              alt="Studio de baile"
              className="h-36 w-full object-cover sm:h-44"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/25 via-primary/20 to-ink/10" />
            <div className="absolute inset-0 flex items-end justify-start p-4 sm:p-5">
              <div className="inline-flex items-center gap-3 rounded-xl border border-white/30 bg-white/20 px-3 py-2 backdrop-blur-sm">
                <img
                  src={logo}
                  alt="YW Studio"
                  className="h-10 w-10 rounded-full border border-white/60 object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = defaultLogo
                  }}
                />
                <div className="text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
                    YW Studio
                  </p>
                  <p className="text-sm font-semibold text-white">Programa de lealtad</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">
            <img
              src={logo}
              alt="YW Studio"
              className="h-[20px] w-[20px] rounded-full object-cover shadow-sm"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = defaultLogo
              }}
            />
            ywstudio loyalty
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Registro de clase por QR
          </h1>
          <p className="mt-3 text-sm text-ink/75">
            Captura tu número de usuario y correo para validar tu asistencia. Si no puedes registrarte,
            pide apoyo en recepción para registrar tu clase manualmente.
          </p>

          <div className="mt-6 grid gap-3 rounded-2xl border border-secondary/20 bg-surface/70 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Campaña</p>
              <p className="mt-1 font-semibold text-ink">{qrCampaign?.name || 'Registro general'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Estado de vigencia</p>
              <p className="mt-1 font-semibold text-ink">
                {qrIsLikelyActive ? 'Vigente' : 'Revisar en recepción'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Disciplina</p>
              <p className="mt-1 font-semibold text-ink">
                {qrCampaign?.disciplineId === 'all'
                  ? 'Todas las disciplinas'
                  : qrCampaign?.disciplineId || 'Por confirmar'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Sede</p>
              <p className="mt-1 font-semibold text-ink">{qrCampaign?.branchId || 'Por confirmar'}</p>
            </div>
          </div>
        </article>

        <article
          ref={formCardRef}
          className="rounded-3xl border border-secondary/20 bg-white/95 p-6 shadow-soft sm:p-8"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-shell px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70">
            <QrCode size={14} className="text-secondary" />
            Registro del alumno
          </div>

          {isLoadingQr ? (
            <div className="flex items-center justify-center py-12 text-secondary">
              <Spinner className="h-14 w-14" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="scanUserId"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
                >
                  Número de usuario *
                </label>
                <input
                  id="scanUserId"
                  value={form.userId}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, userId: event.target.value }))
                  }
                  className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  placeholder="Ej. ywstudio-0001"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="scanEmail"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
                >
                  Correo electrónico *
                </label>
                <input
                  id="scanEmail"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  placeholder="Ej. alumna@correo.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <CheckCircle2 size={16} />}
                <span>{isSubmitting ? 'Validando...' : 'Registrar asistencia'}</span>
              </button>
            </form>
          )}

          {scanResult ? (
            <div
              className={`mt-4 rounded-xl border p-3 text-sm ${
                scanResult.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {scanResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <p className="font-semibold">
                  {scanResult.ok ? 'Asistencia registrada correctamente.' : 'No fue posible registrar tu asistencia.'}
                </p>
              </div>
              {!scanResult.ok ? (
                <p className="mt-1 text-xs">
                  {getRejectionMessage(scanResult.reason, qrCampaign)}
                </p>
              ) : null}
            </div>
          ) : null}

          {!qrIsLikelyActive ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <TriangleAlert size={16} className="mt-0.5" />
              <p className="text-xs">
                Este QR podría estar fuera de vigencia o pausado. Si tienes dudas, recepción puede registrar tu clase de
                forma manual.
              </p>
            </div>
          ) : null}
        </article>
      </section>

      {showScrollCta ? (
        <button
          type="button"
          onClick={scrollToForm}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink shadow-soft backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-secondary/55 hover:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/40 sm:hidden"
          aria-label="Ir al formulario de registro"
        >
          <span>Registro</span>
          <span className="inline-flex h-6 w-6 animate-bounce items-center justify-center rounded-full bg-secondary text-white">
            <ChevronDown size={14} />
          </span>
        </button>
      ) : null}
    </main>
  )
}

export default PublicQrScanPage
