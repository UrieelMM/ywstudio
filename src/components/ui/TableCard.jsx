import { useId, useMemo, useState } from 'react'

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [data-no-row-click="true"]'

const DEFAULT_PAGE_SIZE = 20

const normalizeText = (value) => String(value || '').toLowerCase().trim()

const serializeValue = (value) => {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item)).join(' ')
  }

  if (typeof value === 'object') {
    return Object.values(value)
      .map((item) => serializeValue(item))
      .join(' ')
  }

  return String(value)
}

const getRowKey = (row, rowIndex, absoluteIndex) =>
  row.id ||
  row.userId ||
  row.qrCodeId ||
  row.rewardId ||
  row.redemptionId ||
  row.checkInId ||
  row.txId ||
  row.counterId ||
  row.logId ||
  `${absoluteIndex}-${rowIndex}`

function TableCard({ columns, rows, renderCell, emptyMessage, onRowClick }) {
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const searchInputId = useId()

  const normalizedQuery = normalizeText(query)

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) {
      return rows
    }

    return rows.filter((row) => normalizeText(serializeValue(row)).includes(normalizedQuery))
  }, [rows, normalizedQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / DEFAULT_PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * DEFAULT_PAGE_SIZE
  const endIndex = Math.min(startIndex + DEFAULT_PAGE_SIZE, filteredRows.length)
  const paginatedRows = filteredRows.slice(startIndex, endIndex)

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-secondary/30 bg-surface/60 p-8 text-center text-sm text-ink/70">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-secondary/15">
      <div className="flex flex-col gap-3 border-b border-secondary/15 bg-surface/60 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-ink/70">
          {filteredRows.length === rows.length
            ? `${rows.length} registros`
            : `${filteredRows.length} resultados de ${rows.length} registros`}
        </div>
        <div className="w-full md:w-80">
          <label htmlFor={searchInputId} className="sr-only">
            Buscar en tabla
          </label>
          <input
            id={searchInputId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCurrentPage(1)
            }}
            placeholder="Buscar en la tabla..."
            className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-primary/35 text-xs uppercase tracking-[0.14em] text-ink/75">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap lg:whitespace-normal px-4 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length ? (
              paginatedRows.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex, startIndex + rowIndex)}
                className={`border-t border-secondary/10 bg-white text-sm text-ink/85 ${
                  onRowClick ? 'cursor-pointer transition-colors hover:bg-secondary/5' : ''
                }`}
                onClick={(event) => {
                  if (!onRowClick) {
                    return
                  }

                  if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) {
                    return
                  }

                  onRowClick(row)
                }}
              >
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap lg:whitespace-normal px-4 py-3 align-middle">
                    {renderCell ? renderCell(column.key, row) : row[column.key]}
                  </td>
                ))}
              </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-ink/70">
                  No se encontraron resultados para la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-secondary/15 bg-surface/60 px-4 py-3 text-sm text-ink/75 md:flex-row md:items-center md:justify-between">
        <p>
          Mostrando {filteredRows.length ? startIndex + 1 : 0}-{endIndex} de {filteredRows.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentPage((previous) => Math.max(1, Math.min(totalPages, previous - 1)))
            }
            disabled={safeCurrentPage === 1}
            className="rounded-lg border border-secondary/25 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs font-semibold text-ink/80">
            Página {safeCurrentPage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setCurrentPage((previous) => Math.max(1, Math.min(totalPages, previous + 1)))
            }
            disabled={safeCurrentPage === totalPages}
            className="rounded-lg border border-secondary/25 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}

export default TableCard
