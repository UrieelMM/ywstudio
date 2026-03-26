import Modal from './Modal'
import Spinner from './Spinner'

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  variant = 'danger',
}) {
  const confirmButtonStyles =
    variant === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300'
      : 'bg-secondary text-white hover:brightness-95 focus:ring-secondary/40'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={description} size="max-w-md">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="rounded-xl border border-secondary/25 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-secondary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${confirmButtonStyles}`}
        >
          {isLoading ? <Spinner className="h-4 w-4 text-white" /> : null}
          <span>{confirmText}</span>
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
