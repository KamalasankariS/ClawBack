import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ChevronLeft, ChevronRight, ArrowRight, Search, FileWarning, ShieldCheck } from 'lucide-react'

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
  retailer_name: 'bg-purple-50 text-purple-700 border-purple-200',
  amount: 'bg-green-50 text-green-700 border-green-200',
  deducted_at: 'bg-blue-50 text-blue-700 border-blue-200',
  status: 'bg-orange-50 text-orange-700 border-orange-200',
  reason: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  company_id: 'bg-red-50 text-red-700 border-red-200',
}

function describeChange(field: string, rule: string, rawValue: string | null, cleanedValue: string | null): string {
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
          <ShieldCheck size={20} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Data Cleanup Report</h2>
        </div>
        <p className="text-sm text-gray-500">
          When deductions were imported from the spreadsheet, the system automatically fixed formatting issues.
          This report shows every correction so you can verify nothing was changed incorrectly.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {Object.entries(FIELD_LABELS).map(([field, label]) => {
          const count = fieldCounts[field] || 0
          const colors = FIELD_COLORS[field] || 'bg-gray-50 text-gray-700 border-gray-200'
          return (
            <button
              key={field}
              onClick={() => { setFieldFilter(fieldFilter === field ? '' : field); setPage(1) }}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                fieldFilter === field ? colors + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs font-medium">{label}</div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by deduction #..."
            className="text-sm border border-gray-200 rounded-md pl-8 pr-3 py-2 bg-white w-56"
            value={deductionIdFilter}
            onChange={(e) => { setDeductionIdFilter(e.target.value); setPage(1) }}
          />
        </div>
        {(deductionIdFilter || fieldFilter) && (
          <button
            onClick={() => { setDeductionIdFilter(''); setFieldFilter(''); setPage(1) }}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {response ? `${response.total} corrections found` : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-24">Deduction</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-28">Field</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">What Changed</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-72">Before → After</th>
            </tr>
          </thead>
          <tbody>
            {response?.data.map((a) => {
              const colors = FIELD_COLORS[a.field] || 'bg-gray-50 text-gray-600 border-gray-200'
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => navigate(`/deductions/${a.deductionId}`)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      #{a.deductionId}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
                      {FIELD_LABELS[a.field] || a.field}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 text-sm">
                    {describeChange(a.field, a.rule, a.rawValue, a.cleanedValue)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded max-w-28 truncate" title={a.rawValue || ''}>
                        {a.rawValue || '(empty)'}
                      </span>
                      <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded max-w-28 truncate" title={a.cleanedValue || ''}>
                        {a.cleanedValue || '(cleared)'}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {response?.data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  <FileWarning size={24} className="mx-auto mb-2 text-gray-300" />
                  No corrections found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            Showing page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1 rounded border border-gray-200 bg-white disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-600">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1 rounded border border-gray-200 bg-white disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
