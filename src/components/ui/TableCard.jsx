function TableCard({ columns, rows, renderCell, emptyMessage }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-secondary/30 bg-surface/60 p-8 text-center text-sm text-ink/70">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-secondary/15">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-primary/35 text-xs uppercase tracking-[0.14em] text-ink/75">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className="border-t border-secondary/10 bg-white text-sm text-ink/85"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-middle">
                    {renderCell ? renderCell(column.key, row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableCard
