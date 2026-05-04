// src/components/ui/DataTable.jsx
import { useMemo, useState } from 'react'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'

export default function DataTable({ columns, rows, onRowClick, searchable = false, pageSize = 25, emptyMessage = 'No rows' }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)))
  }, [rows, search, searchable, columns])

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    const sortedRows = [...filtered].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key]
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return sortedRows
  }, [filtered, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  return (
    <div className="bg-bi-card border border-bi-border rounded-[10px] overflow-hidden">
      {searchable && (
        <div className="p-3 border-b border-bi-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-bi-text-mute" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-bi-bg border border-bi-border rounded focus:outline-none focus:border-bi-primary"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-bi-border bg-bi-bg/50">
              {columns.map((c) => (
                <th key={c.key} className="text-left px-3 py-2 text-xs font-semibold text-bi-text-mute uppercase tracking-wider whitespace-nowrap">
                  <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 hover:text-bi-text">
                    {c.header}
                    {sort.key === c.key && (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center text-bi-text-mute py-8 text-xs">{emptyMessage}</td></tr>
            ) : pageRows.map((r, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(r)}
                className={`border-b border-bi-border last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-bi-tint' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-bi-text">
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="px-3 py-2 border-t border-bi-border flex items-center justify-between text-xs text-bi-text-mute">
          <span>Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded hover:bg-bi-tint disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page === pages - 1} className="px-2 py-1 rounded hover:bg-bi-tint disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
