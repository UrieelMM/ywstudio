import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  CircleUserRound,
  Pencil,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UserCheck,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { formatDayMonthYear } from '../../lib/dateFormat'
import { uploadEntityImage } from '../../services/storageUploadService'
import { useOperationsStore } from '../../store/useOperationsStore'

const userColumns = [
  { key: 'fullName', label: 'Alumno' },
  { key: 'userId', label: 'Número de usuario' },
  { key: 'discipline', label: 'Disciplina principal' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'visits', label: 'Visitas' },
  { key: 'status', label: 'Estado' },
  { key: 'updatedAtCustom', label: 'Última actualización' },
  { key: 'actions', label: 'Acciones' },
]

const USER_CODE_REGEX = /^ywstudio-(\d{4,})$/
const MAX_IMAGE_SIZE_MB = 5

const readImagePreview = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No fue posible leer la imagen seleccionada.'))
    reader.readAsDataURL(file)
  })

const toggleDisciplineSelection = (selectedDisciplines, discipline) => {
  const current = Array.isArray(selectedDisciplines) ? selectedDisciplines : []
  if (current.includes(discipline)) {
    return current.filter((entry) => entry !== discipline)
  }
  return [...current, discipline]
}

const getNextUserNumber = (users) => {
  const maxSequence = users.reduce((max, user) => {
    const match = USER_CODE_REGEX.exec(String(user.userId || '').toLowerCase())
    if (!match) {
      return max
    }
    const sequence = Number(match[1])
    if (!Number.isFinite(sequence)) {
      return max
    }
    return sequence > max ? sequence : max
  }, 0)

  return `ywstudio-${String(maxSequence + 1).padStart(4, '0')}`
}

function UsersPage() {
  const users = useOperationsStore((state) => state.users)
  const registerUser = useOperationsStore((state) => state.registerUser)
  const updateUserProfile = useOperationsStore((state) => state.updateUserProfile)
  const updateUserStatus = useOperationsStore((state) => state.updateUserStatus)
  const deleteUser = useOperationsStore((state) => state.deleteUser)
  const tenantId = useOperationsStore((state) => state.tenantId)
  const appConfig = useOperationsStore((state) => state.appConfig)
  const disciplineOptions = useMemo(() => appConfig.disciplines || [], [appConfig.disciplines])
  const defaultDiscipline = disciplineOptions[0] || 'General'
  const nextUserNumber = getNextUserNumber(users)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null)
  const [editingUserId, setEditingUserId] = useState('')
  const [draft, setDraft] = useState({
    userId: nextUserNumber,
    firstName: '',
    lastName: '',
    phoneE164: '+52',
    disciplineIds: [defaultDiscipline],
    email: '',
    birthDate: '',
  })
  const [createImageFile, setCreateImageFile] = useState(null)
  const [createImagePreview, setCreateImagePreview] = useState('')
  const [editDraft, setEditDraft] = useState({
    firstName: '',
    lastName: '',
    phoneE164: '+52',
    disciplineIds: [defaultDiscipline],
    email: '',
    birthDate: '',
    profileImageUrl: '',
  })
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState('')

  const activeUsers = users.filter((user) => user.status === 'active').length
  const totalVisits = users.reduce((acc, user) => acc + Number(user.totalVisits || 0), 0)
  const averageVisits = users.length ? (totalVisits / users.length).toFixed(1) : '0'
  const selectedUser = useMemo(
    () => users.find((entry) => entry.userId === selectedUserId) || null,
    [users, selectedUserId],
  )
  const editingUser = useMemo(
    () => users.find((entry) => entry.userId === editingUserId) || null,
    [users, editingUserId],
  )

  const handleCreateUser = async (event) => {
    event.preventDefault()
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.phoneE164.trim() || !draft.email.trim()) {
      toast.error('Nombre, apellidos, teléfono y correo son obligatorios.')
      return
    }

    if (!Array.isArray(draft.disciplineIds) || !draft.disciplineIds.length) {
      toast.error('Selecciona al menos una disciplina.')
      return
    }

    if (!/^\+[1-9]\d{7,14}$/.test(draft.phoneE164.trim())) {
      toast.error('Captura teléfono en formato E.164. Ejemplo: +525512345678')
      return
    }

    setIsSubmitting(true)

    let profileImageUrl = ''
    if (createImageFile) {
      try {
        const uploadResult = await uploadEntityImage({
          tenantId,
          entityType: 'users',
          entityId: draft.userId || nextUserNumber,
          file: createImageFile,
        })
        profileImageUrl = uploadResult.downloadURL
      } catch (error) {
        toast.error(error?.message || 'No fue posible subir la imagen del alumno.')
        setIsSubmitting(false)
        return
      }
    }

    const result = await registerUser(
      {
        ...draft,
        disciplineIds: draft.disciplineIds,
        email: draft.email.trim(),
        birthDate: draft.birthDate || undefined,
        ...(profileImageUrl ? { profileImageUrl } : {}),
      },
      'admin-ui',
    )

    if (!result.ok) {
      toast.error(result.message || 'No fue posible registrar el usuario.')
      setIsSubmitting(false)
      return
    }
    setDraft({
      userId: nextUserNumber,
      firstName: '',
      lastName: '',
      phoneE164: '+52',
      disciplineIds: draft.disciplineIds.length ? draft.disciplineIds : [defaultDiscipline],
      email: '',
      birthDate: '',
    })
    setCreateImageFile(null)
    setCreateImagePreview('')
    setIsCreateModalOpen(false)
    toast.success('Usuario registrado correctamente.')
    setIsSubmitting(false)
  }

  const openEditModal = (user) => {
    const incomingDisciplineIds = Array.isArray(user.disciplineIds) && user.disciplineIds.length
      ? user.disciplineIds
      : [defaultDiscipline]
    const resolvedDisciplineIds = disciplineOptions.length
      ? incomingDisciplineIds.filter((discipline) => disciplineOptions.includes(discipline))
      : incomingDisciplineIds
    const finalDisciplineIds = resolvedDisciplineIds.length
      ? resolvedDisciplineIds
      : [defaultDiscipline]

    setEditingUserId(user.userId)
    setEditDraft({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneE164: user.phoneE164 || '+52',
      disciplineIds: finalDisciplineIds,
      email: user.email || '',
      birthDate: user.birthDate || '',
      profileImageUrl: user.profileImageUrl || '',
    })
    setEditImageFile(null)
    setEditImagePreview(user.profileImageUrl || '')
    setIsEditModalOpen(true)
  }

  const handleCreateImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setCreateImageFile(null)
      setCreateImagePreview('')
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
      setCreateImageFile(file)
      setCreateImagePreview(preview)
    } catch (error) {
      toast.error(error?.message || 'No fue posible cargar la vista previa.')
      event.target.value = ''
    }
  }

  const handleEditImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setEditImageFile(null)
      setEditImagePreview(editDraft.profileImageUrl || '')
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
      setEditImageFile(file)
      setEditImagePreview(preview)
    } catch (error) {
      toast.error(error?.message || 'No fue posible cargar la vista previa.')
      event.target.value = ''
    }
  }

  const handleUpdateUser = async (event) => {
    event.preventDefault()
    if (!editingUserId) {
      toast.error('No se seleccionó usuario para edición.')
      return
    }

    if (!Array.isArray(editDraft.disciplineIds) || !editDraft.disciplineIds.length) {
      toast.error('Selecciona al menos una disciplina.')
      return
    }

    setIsSavingEdit(true)

    let profileImageUrl = editDraft.profileImageUrl || ''
    if (editImageFile) {
      try {
        const uploadResult = await uploadEntityImage({
          tenantId,
          entityType: 'users',
          entityId: editingUserId,
          file: editImageFile,
        })
        profileImageUrl = uploadResult.downloadURL
      } catch (error) {
        toast.error(error?.message || 'No fue posible subir la imagen del alumno.')
        setIsSavingEdit(false)
        return
      }
    }

    const result = await updateUserProfile(
      editingUserId,
      {
        ...editDraft,
        disciplineIds: editDraft.disciplineIds,
        profileImageUrl,
      },
      'admin-ui',
    )
    setIsSavingEdit(false)

    if (!result.ok) {
      toast.error(result.message || 'No se pudo actualizar el usuario.')
      return
    }

    setEditImageFile(null)
    setEditImagePreview(profileImageUrl || '')
    setIsEditModalOpen(false)
    toast.success('Usuario actualizado.')
  }

  const requestDeleteUser = (user) => {
    setPendingDeleteUser(user)
  }

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser?.userId) {
      return
    }

    setIsDeletingUser(true)
    const result = await deleteUser(pendingDeleteUser.userId, 'admin-ui')
    setIsDeletingUser(false)
    if (!result.ok) {
      toast.error(result.message || 'No se pudo eliminar el usuario.')
      return
    }

    if (selectedUserId === pendingDeleteUser.userId) {
      setSelectedUserId('')
    }

    setPendingDeleteUser(null)
    toast.success('Usuario eliminado.')
  }

  const formatDate = (value) => (value ? formatDayMonthYear(value) : 'No registrado')

  const formatDateTime = (value) => {
    if (!value) {
      return 'No registrado'
    }
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format('DD MMM YYYY · HH:mm') : value
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alumnos"
        title="Administración de alumnos"
        description="Alta rápida, edición y control de estado de alumnos."
        action={
          <button
            type="button"
            onClick={() => {
              setDraft((previous) => ({
                ...previous,
                userId: nextUserNumber,
                disciplineIds:
                  Array.isArray(previous.disciplineIds) &&
                  previous.disciplineIds.length &&
                  previous.disciplineIds.every((discipline) => disciplineOptions.includes(discipline))
                    ? previous.disciplineIds
                    : [defaultDiscipline],
              }))
              setIsCreateModalOpen(true)
            }}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0"
          >
            <span className="inline-flex items-center gap-2">
              <UserPlus size={16} /> Nuevo alumno
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Usuarios totales" value={users.length} hint="Base operativa actual" />
        <StatCard icon={UserCheck} label="Usuarios activos" value={activeUsers} hint="Listos para registrar asistencia" />
        <StatCard icon={TrendingUp} label="Visitas acumuladas" value={totalVisits} hint="Ciclo actual" />
        <StatCard icon={ShieldCheck} label="Promedio visitas" value={averageVisits} hint="Por alumno" />
      </section>

      <section className="grid gap-6 items-start">
        <SectionCard
          title="Panel de usuarios"
          description="Acciones de estado para operación diaria de lealtad."
        >
          <TableCard
            columns={userColumns}
            rows={users}
            emptyMessage="No hay usuarios registrados."
            onRowClick={(row) => setSelectedUserId(row.userId)}
            renderCell={(column, row) => {
              if (column === 'fullName') {
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-secondary/20 bg-surface shadow-sm"
                      style={{ minWidth: '36px', minHeight: '36px' }}
                    >
                      {row.profileImageUrl ? (
                        <img src={row.profileImageUrl} alt={row.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-secondary">
                          <CircleUserRound size={16} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(row.userId)}
                        className="text-left font-semibold text-ink underline-offset-2 transition hover:text-secondary hover:underline"
                      >
                        {row.fullName}
                      </button>
                      <p className="text-xs text-ink/60">{row.userId}</p>
                    </div>
                  </div>
                )
              }

              if (column === 'discipline') {
                return row.disciplineIds?.[0] || 'General'
              }

              if (column === 'userId') {
                return <span className="font-medium text-ink">{row.userId}</span>
              }

              if (column === 'phone') {
                return row.phoneE164
              }

              if (column === 'visits') {
                return `${row.visitBalanceCached} disponibles / ${row.totalVisits} totales`
              }

              if (column === 'status') {
                return <StatusBadge value={row.status === 'active' ? 'Activo' : 'Inactivo'} />
              }

              if (column === 'updatedAtCustom') {
                return formatDayMonthYear(row.updatedAtCustom)
              }

              if (column === 'actions') {
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteUser(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 shadow-sm transition-all duration-200 hover:bg-rose-50"
                    >
                      <Trash2 size={12} />
                      Eliminar
                    </button>
                  </div>
                )
              }

              return row[column]
            }}
          />
        </SectionCard>
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setCreateImageFile(null)
          setCreateImagePreview('')
        }}
        title="Registrar nuevo alumno"
        subtitle="El número de usuario se genera automáticamente y se usa junto con correo para registrar asistencia por QR."
        size="max-w-xl"
      >
        <form onSubmit={handleCreateUser} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="userNumber" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Número de usuario *
            </label>
            <div className="flex items-center gap-2">
              <input
                id="userNumber"
                value={draft.userId}
                readOnly
                className="w-full rounded-xl border border-secondary/25 bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-sm"
                placeholder="ywstudio-0001"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="createProfileImage" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Foto del alumno
            </label>
            <div className="rounded-xl border border-secondary/20 bg-surface/60 p-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-secondary/20 bg-white shadow-sm">
                  {createImagePreview ? (
                    <img src={createImagePreview} alt="Preview del alumno" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-secondary">
                      <CircleUserRound size={20} />
                    </div>
                  )}
                </div>
                <input
                  id="createProfileImage"
                  type="file"
                  accept="image/*"
                  onChange={handleCreateImageChange}
                  className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-secondary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary hover:border-secondary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <p className="mt-2 text-xs text-ink/60">PNG, JPG o WEBP. Máximo 5 MB.</p>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Nombre(s) *
            </label>
            <input
              id="firstName"
              value={draft.firstName}
              onChange={(event) => setDraft((previous) => ({ ...previous, firstName: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. Camila"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Apellidos *
            </label>
            <input
              id="lastName"
              value={draft.lastName}
              onChange={(event) => setDraft((previous) => ({ ...previous, lastName: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. Herrera Luna"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="phoneE164" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Teléfono (E.5512345678) *
            </label>
            <input
              id="phoneE164"
              value={draft.phoneE164}
              onChange={(event) => setDraft((previous) => ({ ...previous, phoneE164: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. +525512345678"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Disciplinas *
            </label>
            <div className="rounded-xl border border-secondary/20 bg-surface/60 p-3">
              {disciplineOptions.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {disciplineOptions.map((discipline) => {
                    const isSelected = draft.disciplineIds.includes(discipline)
                    const isPrimary = draft.disciplineIds[0] === discipline
                    return (
                      <label
                        key={discipline}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${
                          isSelected
                            ? 'border-secondary/50 bg-white text-ink'
                            : 'border-secondary/20 bg-white/70 text-ink/75'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              setDraft((previous) => ({
                                ...previous,
                                disciplineIds: toggleDisciplineSelection(previous.disciplineIds, discipline),
                              }))
                            }
                            className="h-4 w-4 rounded border-secondary/40 text-secondary focus:ring-secondary/30"
                          />
                          <span>{discipline}</span>
                        </span>
                        {isPrimary ? <span className="text-[10px] font-semibold uppercase text-secondary">Principal</span> : null}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-ink/70">Configura disciplinas en la sección de Configuración.</p>
              )}
              <p className="mt-2 text-xs text-ink/65">
                La primera disciplina seleccionada se guarda como principal.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Correo electrónico *
            </label>
            <input
              id="email"
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. alumna@ywstudio.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="birthDate" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Fecha de nacimiento
            </label>
            <input
              id="birthDate"
              type="date"
              value={draft.birthDate}
              onChange={(event) => setDraft((previous) => ({ ...previous, birthDate: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="AAAA-MM-DD"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <UserPlus size={16} />}
            <span>{isSubmitting ? 'Registrando...' : 'Registrar usuario'}</span>
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditImageFile(null)
          setEditImagePreview('')
        }}
        title="Editar alumno"
        subtitle="Actualiza datos de perfil del alumno."
        size="max-w-xl"
      >
        <form onSubmit={handleUpdateUser} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="editProfileImage" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Foto del alumno
            </label>
            <div className="rounded-xl border border-secondary/20 bg-surface/60 p-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-secondary/20 bg-white shadow-sm">
                  {editImagePreview ? (
                    <img src={editImagePreview} alt="Preview del alumno" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-secondary">
                      <CircleUserRound size={20} />
                    </div>
                  )}
                </div>
                <input
                  id="editProfileImage"
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                  className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-secondary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary hover:border-secondary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <p className="mt-2 text-xs text-ink/60">PNG, JPG o WEBP. Máximo 5 MB.</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Estado del alumno
            </label>
            <div className="rounded-xl border border-secondary/20 bg-surface/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge value={editingUser?.status === 'active' ? 'Activo' : 'Inactivo'} />
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingUserId) {
                      return
                    }

                    const result = await updateUserStatus(
                      editingUserId,
                      editingUser?.status === 'active' ? 'inactive' : 'active',
                      'admin-ui',
                    )
                    if (!result.ok) {
                      toast.error(result.message || 'No se pudo actualizar el estado del alumno.')
                      return
                    }
                    toast.success('Estado del alumno actualizado.')
                  }}
                  className="rounded-lg border border-secondary/25 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/50"
                >
                  {editingUser?.status === 'active' ? 'Pausar alumno' : 'Activar alumno'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="editFirstName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Nombre(s) *
            </label>
            <input
              id="editFirstName"
              value={editDraft.firstName}
              onChange={(event) => setEditDraft((previous) => ({ ...previous, firstName: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. Camila"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="editLastName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Apellidos *
            </label>
            <input
              id="editLastName"
              value={editDraft.lastName}
              onChange={(event) => setEditDraft((previous) => ({ ...previous, lastName: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. Herrera Luna"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="editPhoneE164" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Teléfono (E.5512345678) *
            </label>
            <input
              id="editPhoneE164"
              value={editDraft.phoneE164}
              onChange={(event) => setEditDraft((previous) => ({ ...previous, phoneE164: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. +525512345678"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Disciplinas *
            </label>
            <div className="rounded-xl border border-secondary/20 bg-surface/60 p-3">
              {disciplineOptions.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {disciplineOptions.map((discipline) => {
                    const isSelected = editDraft.disciplineIds.includes(discipline)
                    const isPrimary = editDraft.disciplineIds[0] === discipline
                    return (
                      <label
                        key={discipline}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${
                          isSelected
                            ? 'border-secondary/50 bg-white text-ink'
                            : 'border-secondary/20 bg-white/70 text-ink/75'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              setEditDraft((previous) => ({
                                ...previous,
                                disciplineIds: toggleDisciplineSelection(previous.disciplineIds, discipline),
                              }))
                            }
                            className="h-4 w-4 rounded border-secondary/40 text-secondary focus:ring-secondary/30"
                          />
                          <span>{discipline}</span>
                        </span>
                        {isPrimary ? <span className="text-[10px] font-semibold uppercase text-secondary">Principal</span> : null}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-ink/70">Configura disciplinas en la sección de Configuración.</p>
              )}
              <p className="mt-2 text-xs text-ink/65">
                La primera disciplina seleccionada se guarda como principal.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="editEmail" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Correo electrónico *
            </label>
            <input
              id="editEmail"
              type="email"
              value={editDraft.email}
              onChange={(event) => setEditDraft((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. alumna@ywstudio.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="editBirthDate" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Fecha de nacimiento
            </label>
            <input
              id="editBirthDate"
              type="date"
              value={editDraft.birthDate}
              onChange={(event) => setEditDraft((previous) => ({ ...previous, birthDate: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="AAAA-MM-DD"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingEdit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSavingEdit ? <Spinner className="h-4 w-4 text-white" /> : <Pencil size={16} />}
            <span>{isSavingEdit ? 'Guardando...' : 'Guardar cambios'}</span>
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUserId('')}
        title="Detalle completo de usuario"
        subtitle="Ficha operativa y de auditoría para seguimiento del programa de lealtad."
        size="max-w-3xl"
      >
        {selectedUser ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-secondary/20 bg-white shadow-sm">
                    {selectedUser.profileImageUrl ? (
                      <img
                        src={selectedUser.profileImageUrl}
                        alt={selectedUser.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-secondary">
                        <CircleUserRound size={22} />
                      </div>
                    )}
                  </div>
                  <p className="font-display text-lg font-semibold text-ink">{selectedUser.fullName}</p>
                </div>
                <StatusBadge value={selectedUser.status === 'active' ? 'Activo' : 'Inactivo'} />
              </div>
              <p className="mt-1 text-xs text-ink/60">ID: {selectedUser.userId}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Perfil</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Nombre</dt>
                    <dd className="font-semibold text-ink">{selectedUser.firstName || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Apellidos</dt>
                    <dd className="font-semibold text-ink">{selectedUser.lastName || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Teléfono</dt>
                    <dd className="font-semibold text-ink">{selectedUser.phoneE164 || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Email</dt>
                    <dd className="font-semibold text-ink">{selectedUser.email || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Nacimiento</dt>
                    <dd className="font-semibold text-ink">{formatDate(selectedUser.birthDate)}</dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Lealtad</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Disciplinas</dt>
                    <dd className="font-semibold text-ink">
                      {selectedUser.disciplineIds?.join(', ') || 'No registrado'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Visitas disponibles</dt>
                    <dd className="font-semibold text-ink">{selectedUser.visitBalanceCached ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Visitas totales</dt>
                    <dd className="font-semibold text-ink">{selectedUser.totalVisits ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Última asistencia</dt>
                    <dd className="font-semibold text-ink">{formatDateTime(selectedUser.lastCheckInAtCustom)}</dd>
                  </div>
                </dl>
              </article>
            </div>

            <article className="rounded-xl border border-secondary/15 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-soft">
              <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Auditoría</p>
              <dl className="grid gap-2 text-sm text-ink/80 md:grid-cols-2">
                <div className="flex items-center justify-between gap-2 md:pr-5">
                  <dt className="text-ink/60">Creado</dt>
                  <dd className="font-semibold text-ink">{formatDateTime(selectedUser.createdAtCustom)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 md:pr-5">
                  <dt className="text-ink/60">Actualizado</dt>
                  <dd className="font-semibold text-ink">{formatDateTime(selectedUser.updatedAtCustom)}</dd>
                </div>
              </dl>
            </article>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteUser)}
        onClose={() => setPendingDeleteUser(null)}
        onConfirm={confirmDeleteUser}
        isLoading={isDeletingUser}
        title="Eliminar alumno"
        description={
          pendingDeleteUser
            ? `Se eliminará ${pendingDeleteUser.fullName} (${pendingDeleteUser.userId}). Esta acción no se puede deshacer.`
            : 'Esta acción no se puede deshacer.'
        }
        confirmText="Eliminar alumno"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}

export default UsersPage
