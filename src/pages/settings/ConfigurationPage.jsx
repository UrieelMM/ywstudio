import { useMemo, useState } from 'react'
import { Building2, Palette, Save, Settings, UserCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/ui/StatCard'
import { uploadEntityImage } from '../../services/storageUploadService'
import { useOperationsStore } from '../../store/useOperationsStore'

const MAX_IMAGE_SIZE_MB = 5
const BRANDING_ENTITY_ID = 'branding'

const readImagePreview = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No fue posible leer la imagen seleccionada.'))
    reader.readAsDataURL(file)
  })

const toMultilineText = (items) => (Array.isArray(items) ? items.join('\n') : '')

function ConfigurationPage() {
  const tenantId = useOperationsStore((state) => state.tenantId)
  const appConfig = useOperationsStore((state) => state.appConfig)
  const saveAppConfig = useOperationsStore((state) => state.saveAppConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(appConfig.logoUrl || '')
  const [draft, setDraft] = useState({
    adminName: appConfig.adminName || '',
    logoUrl: appConfig.logoUrl || '',
    branchesText: toMultilineText(appConfig.branches),
    disciplinesText: toMultilineText(appConfig.disciplines),
  })

  const branchCount = useMemo(
    () =>
      draft.branchesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean).length,
    [draft.branchesText],
  )

  const disciplineCount = useMemo(
    () =>
      draft.disciplinesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean).length,
    [draft.disciplinesText],
  )

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setLogoFile(null)
      setLogoPreview(draft.logoUrl || '')
      return
    }

    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error('La imagen supera el límite de 5 MB.')
      event.target.value = ''
      return
    }

    try {
      const preview = await readImagePreview(file)
      setLogoFile(file)
      setLogoPreview(preview)
    } catch (error) {
      toast.error(error?.message || 'No fue posible generar la vista previa.')
      event.target.value = ''
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)

    let logoUrl = draft.logoUrl || ''
    if (logoFile) {
      try {
        const uploadResult = await uploadEntityImage({
          tenantId,
          entityType: 'settings',
          entityId: BRANDING_ENTITY_ID,
          file: logoFile,
        })
        logoUrl = uploadResult.downloadURL
      } catch (error) {
        toast.error(error?.message || 'No fue posible subir el logo.')
        setIsSaving(false)
        return
      }
    }

    const result = await saveAppConfig(
      {
        adminName: draft.adminName,
        logoUrl,
        branches: draft.branchesText,
        disciplines: draft.disciplinesText,
      },
      'admin-ui',
    )
    setIsSaving(false)

    if (!result.ok) {
      toast.error(result.message || 'No se pudo guardar la configuración.')
      return
    }

    setLogoFile(null)
    toast.success('Configuración actualizada correctamente.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes generales"
        description="Gestiona branding, nombre del administrador y catálogos operativos del dashboard."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UserCircle2} label="Administrador" value={appConfig.adminName || 'Sin definir'} hint="" />
        <StatCard icon={Building2} label="Sedes configuradas" value={appConfig.branches?.length || 0} hint="" />
        <StatCard icon={Settings} label="Disciplinas activas" value={appConfig.disciplines?.length || 0} hint="" />
        <StatCard icon={Palette} label="Logo operativo" value={appConfig.logoUrl ? 'Cargado' : 'Pendiente'} hint="" />
      </section>

      <SectionCard
        title="Configuración del sistema"
        description=""
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="adminName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Nombre del administrador *
            </label>
            <input
              id="adminName"
              value={draft.adminName}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, adminName: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. Admin YW Studio"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="brandLogo" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Logo del estudio
            </label>
            <div className="rounded-xl border border-secondary/20 bg-surface/60 p-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-secondary/20 bg-white shadow-sm">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview del logo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-secondary">
                      <Palette size={20} />
                    </div>
                  )}
                </div>
                <input
                  id="brandLogo"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-secondary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary hover:border-secondary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <p className="mt-2 text-xs text-ink/60">PNG, JPG o WEBP. Máximo 5 MB.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="branchesText" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
                Sedes (una por línea) *
              </label>
              <textarea
                id="branchesText"
                value={draft.branchesText}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, branchesText: event.target.value }))
                }
                className="h-44 w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder={'Ej.\nTizayuca\nPachuca'}
                required
              />
              <p className="text-xs text-ink/60">Sedes detectadas: {branchCount}</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="disciplinesText" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
                Disciplinas (una por línea) *
              </label>
              <textarea
                id="disciplinesText"
                value={draft.disciplinesText}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, disciplinesText: event.target.value }))
                }
                className="h-44 w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder={'Ej.\nBallet\nJazz\nHip Hop'}
                required
              />
              <p className="text-xs text-ink/60">Disciplinas detectadas: {disciplineCount}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSaving ? <Spinner className="h-4 w-4 text-white" /> : <Save size={16} />}
            <span>{isSaving ? 'Guardando configuración...' : 'Guardar configuración'}</span>
          </button>
        </form>
      </SectionCard>
    </div>
  )
}

export default ConfigurationPage
