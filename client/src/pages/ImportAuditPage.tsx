import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ChevronLeft, ChevronRight, ArrowRight, Search, FileWarning, ShieldCheck } from 'lucide-react'
import { useTitle } from '../hooks/useTitle'

interface AuditEntry {
  id: number
  deductionId: number
  field: string
  rawValue: string | null
  cleanedValue: string | null
  rule: string
}

interface ListResponse {
  data: AuditEntry[]
  total: number
  page: number
  limit: number
}

const FIELD_LABELS: Record<string, string> = {
  retailer_name: 'Retailer Name',
  amount: 'Amount',
  deducted_at: 'Date',
  status: 'Status',
  reason: 'Reason Code',
  company_id: 'Company',
}

const FIELD_COLORS: Record<string, string> = {
  retailer_name: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/25',
  amount: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/25',
  deducted_at: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25',
  status: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/25',
  reason: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/25',
  company_id: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25',
}

function describeChange(_field: string, rule: string, rawValue: string | null, cleanedValue: string | null): string {
  // Retailer
  if (rule === 'alias_matched') return `Matched variant "${rawValue}" to standard name "${cleanedValue}"`
  if (rule === 'unresolvable_retailer') return `Could not match "${rawValue}" to any known retailer`

  // Amount
  if (rule === 'null_to_zero') return 'Missing amount — set to $0.00'
  if (rule === 'near_zero_or_infinite') return `Invalid number (${rawValue}) — set to $0.00`
  if (rule === 'unparseable_placeholder') return `Placeholder text "${rawValue}" — set to $0.00`
  if (rule === 'unparseable_amount') return `Could not parse "${rawValue}" as a dollar amount — set to $0.00`
  if (rule === 'strip_currency') return `Removed currency symbol from "${rawValue}"`
  if (rule === 'accounting_negative') return `Converted accounting format (${rawValue}) to negative number`
  if (rule === 'scientific_notation') return `Converted scientific notation ${rawValue} to ${cleanedValue}`

  // Date
  if (rule === 'invalid_placeholder') return `Placeholder "${rawValue}" is not a real date — cleared`
  if (rule === 'unix_timestamp') return `Converted Unix timestamp to readable date`
  if (rule === 'iso_format') return `Reformatted ISO date string`
  if (rule === 'mm_dd_yyyy') return `Parsed MM/DD/YYYY format`
  if (rule === 'dd_mm_yyyy') return `Parsed DD-MM-YYYY format`
  if (rule === 'text_date') return `Parsed written-out date ("${rawValue}")`
  if (rule === 'invalid_date_values') return `Date "${rawValue}" has impossible values — cleared`
  if (rule === 'unparseable_date') return `Could not parse "${rawValue}" as a date — cleared`

  // Status
  if (rule === 'null_to_open') return 'Missing status — set to Open'
  if (rule === 'empty_to_open') return 'Empty status — set to Open'
  if (rule.startsWith('mapped_')) return `Standardized "${rawValue}" → "${cleanedValue}"`
  if (rule.startsWith('unknown_status_')) return `Unrecognized status "${rawValue}" — set to Open`

  // Reason
  if (rule === 'unrecognized_reason') return `Could not match reason "${rawValue}" to a known code`
  if (rule.startsWith('unknown_reason_')) return `Unrecognized reason "${rawValue}" — left unset`

  // Company
  if (rule === 'orphan_company_id') return `Company ID ${rawValue} doesn't exist in the system — unlinked`

  return `Applied rule: ${rule}`
}

export function ImportAuditPage() {
  useTitle('Tool Maintenance')
  const navigate = useNavigate()
  const [response, setResponse] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [deductionIdFilter, setDeductionIdFilter] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '50')
    if (deductionIdFilter) params.set('deductionId', deductionIdFilter)
    if (fieldFilter) params.set('field', fieldFilter)
    api<ListResponse>(`/import-audit?${params}`).then(setResponse)
  }, [page, deductionIdFilter, fieldFilter])

  const totalPages = response ? Math.ceil(response.total / response.limit) : 0

  // Count by field for summary
  const fieldCounts = (response?.data || []).reduce((acc, a) => {
    acc[a.field] = (acc[a.field] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={20} className="text-accent-text" />
          <h2 className="text-xl font-semibold text-heading">Tool Maintenance</h2>
        </div>
        <p className="text-sm text-subtle">
          Audit log of all automatic data corrections made during import.
          Use this page to verify data integrity and track what the system cleaned up.
        </p>
      </div>

      {/* Summary line */}
      {response && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3 mb-5 flex items-center gap-3">
          <ShieldCheck size={16} className="text-accent-text shrink-0" />
          <span className="text-sm text-prose">
            <span className="font-semibold text-heading">{response.total}</span> fields were auto-cleaned during import.
            Filter by field type below to review specific corrections.
          </span>
        </div>
      )}

      {/* Field filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(FIELD_LABELS).map(([field, label]) => {
          const count = fieldCounts[field] || 0
          const isActive = fieldFilter === field
          const colors = FIELD_COLORS[field] || 'bg-panel-hover text-prose border-edge'
          return (
            <button
              key={field}
              onClick={() => { setFieldFilter(isActive ? '' : field); setPage(1) }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isActive ? colors + ' ring-2 ring-offset-1 ring-accent/40' : 'bg-panel border-edge hover:border-faint text-subtle'
              }`}
            >
              {label} <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Search by deduction #..."
            className="text-sm border border-edge rounded-md pl-8 pr-3 py-2 bg-input-bg text-heading w-56"
            value={deductionIdFilter}
            onChange={(e) => { setDeductionIdFilter(e.target.value); setPage(1) }}
          />
        </div>
        {(deductionIdFilter || fieldFilter) && (
          <button
            onClick={() => { setDeductionIdFilter(''); setFieldFilter(''); setPage(1) }}
            className="text-xs text-accent-text hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-faint ml-auto">
          {response ? `${response.total} corrections found` : ''}
        </span>
      </div>

      {/* Table */}
      <div className="window-card">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-panel-hover border-b border-edge">
              <th className="text-left px-4 py-2.5 font-medium text-subtle" style={{ width: '10%' }}>Deduction</th>
              <th className="text-left px-4 py-2.5 font-medium text-subtle" style={{ width: '14%' }}>Field</th>
              <th className="text-left px-4 py-2.5 font-medium text-subtle" style={{ width: '40%' }}>What Changed</th>
              <th className="text-left px-4 py-2.5 font-medium text-subtle" style={{ width: '36%' }}>Before → After</th>
            </tr>
          </thead>
          <tbody>
            {response?.data.map((a) => {
              const colors = FIELD_COLORS[a.field] || 'bg-panel-hover text-subtle border-edge'
              return (
                <tr key={a.id} className="border-b border-edge-light hover:bg-panel-hover">
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => navigate(`/deductions/${a.deductionId}`)}
                      className="text-accent-text hover:underline font-medium"
                    >
                      #{a.deductionId}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
                      {FIELD_LABELS[a.field] || a.field}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-prose text-sm">
                    {describeChange(a.field, a.rule, a.rawValue, a.cleanedValue)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded min-w-0 truncate" title={a.rawValue || ''}>
                        {a.rawValue || '(empty)'}
                      </span>
                      <ArrowRight size={12} className="text-faint flex-shrink-0" />
                      <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded min-w-0 truncate" title={a.cleanedValue || ''}>
                        {a.cleanedValue || '(cleared)'}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {response?.data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-faint">
                  <FileWarning size={24} className="mx-auto mb-2 text-faint" />
                  No corrections found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-edge bg-panel-hover">
          <span className="text-xs text-subtle">
            Showing page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1 rounded border border-edge bg-panel disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-prose">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1 rounded border border-edge bg-panel disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
