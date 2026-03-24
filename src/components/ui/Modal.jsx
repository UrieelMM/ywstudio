import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function Modal({ isOpen, title, subtitle, onClose, children, size = 'max-w-2xl' }) {
  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${size} overflow-hidden rounded-2xl border border-secondary/20 bg-white shadow-2xl`}
      >
        <header className="flex items-start justify-between border-b border-secondary/20 bg-shell px-4 py-3 sm:px-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-ink/65">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-secondary/20 bg-white p-2 text-ink"
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </header>

        <div className="max-h-[78vh] overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export default Modal
