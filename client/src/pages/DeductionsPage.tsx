import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { formatCurrency, formatDate } from '../lib/utils'
import { STATUS_CONFIG } from '../lib/constants'
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Upload, Download, X, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from '../components/Toast'
import { useTitle } from '../hooks/useTitle'
import { SelectWithAdd } from '../components/SelectWithAdd'

interface Deduction {
  id: number
  companyId: number | null
  retailerId: number | null
  amount: string
  status: string
  invoiceNumber: string | null
  deductedAt: string | null
  company: { name: string } | null
  retailer: { name: string } | null
  reason: { label: string; code: string } | null
  handledBy?: { id: number; name: string }[]
}

interface ListResponse {
  data: Deduction[]
  total: number
  page: number
  limit: number
}

interface Company { id: number; name: string }
interface Retailer { id: number; name: string }
interface Reason { id: number; code: string; label: string }

export function DeductionsPage() {
  useTitle('Deductions')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [response, setResponse] = useState<ListResponse | null>(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const debouncedSearch = useCallback((value: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])
  const [statusFilter, setStatusFilter] = useState<string[]>(searchParams.get('status')?.split(',').filter(Boolean) || [])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [retailerFilter, setRetailerFilter] = useState(searchParams.get('retailerId') || '')
  const [companyFilter, setCompanyFilter] = useState(searchParams.get('companyId') || '')

  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')

  // Sort state
  const [sortField, setSortField] = useState('deductedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'accept' | 'dispute' | 'park' | 'close'>('accept')
  const [bulkNotes, setBulkNotes] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [reasons, setReasons] = useState<Reason[]>([])

  // Modal state
  const [showNewForm, setShowNewForm] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  // New deduction form
  const [newCompanyId, setNewCompanyId] = useState('')
  const [newRetailerId, setNewRetailerId] = useState('')
  const [newReasonId, setNewReasonId] = useState('')
  const [newInvoice, setNewInvoice] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Duplicate warning
  const [duplicateWarning, setDuplicateWarning] = useState<Deduction[]>([])
  const [dupChecked, setDupChecked] = useState(false)

  // Upload state
  const [uploadResult, setUploadResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // CSV preview state
  interface CSVRow { company_id: number; retailer_id: number; reason_id?: number; invoice_number?: string; amount: number; deducted_at: string; notes?: string }
  const [csvPreview, setCsvPreview] = useState<CSVRow[] | null>(null)
  const [csvError, setCsvError] = useState('')

  const [refreshKey, setRefreshKey] = useState(0)
  const page = parseInt(searchParams.get('page') || '1')

  const loadRefs = () => {
    api<Retailer[]>('/retailers').then(setRetailers)
    api<Company[]>('/companies').then(setCompanies)
    api<Reason[]>('/dispute-reasons').then(setReasons)
  }

  useEffect(() => { loadRefs() }, [])

  const buildFilterParams = () => {
    const globalCompanyId = (window as any).__companyId
    const params = new URLSearchParams()
    if (companyFilter) params.set('companyId', companyFilter)
    else if (globalCompanyId) params.set('companyId', globalCompanyId)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (retailerFilter) params.set('retailerId', retailerFilter)
    if (search) params.set('search', search)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    params.set('sort', `${sortField}:${sortDir}`)
    return params
  }

  useEffect(() => {
    const params = buildFilterParams()
    params.set('page', String(page))
    params.set('limit', '25')

    api<ListResponse>(`/deductions?${params}`).then((r) => {
      setResponse(r)
      setSelected(new Set())
    })
  }, [companyFilter, statusFilter.join(','), retailerFilter, search, dateFrom, dateTo, sortField, sortDir, page, refreshKey])

  const totalPages = response ? Math.ceil(response.total / response.limit) : 0

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    setSearchParams(params)
  }

  const resetNewForm = () => {
    setNewCompanyId(''); setNewRetailerId(''); setNewReasonId('')
    setNewInvoice(''); setNewAmount(''); setNewDate(''); setNewNotes('')
    setFormError(''); setDuplicateWarning([]); setDupChecked(false)
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown size={10} className="text-gray-300 ml-0.5" />
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="text-gray-900 ml-0.5" />
      : <ChevronDown size={10} className="text-gray-900 ml-0.5" />
  }

  const handleExport = async () => {
    const params = buildFilterParams()
    const token = localStorage.getItem('confido_token')
    const res = await fetch(`/api/deductions/export?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      toast('error', 'Export failed. Please try again.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deductions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSelectAll = () => {
    if (!response) return
    const allIds = response.data.map(d => d.id)
    if (selected.size === allIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkAction = async () => {
    setBulkLoading(true)
    setBulkResult(null)
    try {
      const result = await api<{ message: string }>('/deductions/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selected),
          action: bulkAction,
          notes: bulkNotes,
        }),
      })
      setBulkResult({ type: 'success', message: result.message })
      setSelected(new Set())
      setRefreshKey(k => k + 1)
      setTimeout(() => { setShowBulkModal(false); setBulkResult(null); setBulkNotes('') }, 1500)
    } catch (e: any) {
      setBulkResult({ type: 'error', message: e.message })
    } finally {
      setBulkLoading(false)
    }
  }

  const submitDeduction = async () => {
    setFormLoading(true)
    setFormError('')
    try {
      const created = await api<Deduction>('/deductions', {
        method: 'POST',
        body: JSON.stringify({
          companyId: parseInt(newCompanyId),
          retailerId: parseInt(newRetailerId),
          reasonId: newReasonId ? parseInt(newReasonId) : undefined,
          invoiceNumber: newInvoice || undefined,
          amount: parseFloat(newAmount),
          deductedAt: newDate,
          notes: newNotes || undefined,
        }),
      })
      setShowNewForm(false)
      resetNewForm()
      setRefreshKey((k) => k + 1)
      navigate(`/deductions/${created.id}`)
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCreateDeduction = async () => {
    if (!newCompanyId || !newRetailerId || !newAmount || !newDate) {
      setFormError('Company, retailer, amount, and date are required.')
      return
    }
    if (parseFloat(newAmount) < 0) {
      setFormError('Amount must be a positive number.')
      return
    }

    // If we already checked and user confirmed, submit directly
    if (dupChecked) {
      await submitDeduction()
      return
    }

    // Check for duplicates first
    setFormLoading(true)
    setFormError('')
    try {
      const result = await api<{ duplicates: Deduction[] }>('/deductions/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({
          retailerId: parseInt(newRetailerId),
          invoiceNumber: newInvoice || undefined,
          amount: parseFloat(newAmount),
          deductedAt: newDate,
        }),
      })
      if (result.duplicates.length > 0) {
        setDuplicateWarning(result.duplicates)
        setDupChecked(true)
        setFormLoading(false)
        return
      }
    } catch {
      // If duplicate check fails, proceed anyway
    }
    await submitDeduction()
  }

  const handleCSVParse = async (file: File) => {
    setCsvError('')
    setCsvPreview(null)
    setUploadResult(null)

    try {
      const text = await file.text()
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        setCsvError('CSV must have a header row and at least one data row.')
        return
      }

      const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase())
      const requiredHeaders = ['company_id', 'retailer_id', 'amount', 'deducted_at']
      const missing = requiredHeaders.filter((h) => !headers.includes(h))
      if (missing.length > 0) {
        setCsvError(`Missing required columns: ${missing.join(', ')}`)
        return
      }

      const rows: CSVRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]!.split(',').map((v) => v.trim())
        const row: Record<string, any> = {}
        headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
        rows.push({
          company_id: parseInt(row.company_id),
          retailer_id: parseInt(row.retailer_id),
          reason_id: row.reason_id ? parseInt(row.reason_id) : undefined,
          invoice_number: row.invoice_number || undefined,
          amount: parseFloat(row.amount),
          deducted_at: row.deducted_at,
          notes: row.notes || undefined,
        })
      }

      // Validate locally before showing preview
      const errors: string[] = []
      const companyIds = new Set(companies.map(c => c.id))
      const retailerIds = new Set(retailers.map(r => r.id))
      rows.forEach((r, i) => {
        if (!companyIds.has(r.company_id)) errors.push(`Row ${i + 1}: unknown company_id ${r.company_id}`)
        if (!retailerIds.has(r.retailer_id)) errors.push(`Row ${i + 1}: unknown retailer_id ${r.retailer_id}`)
        if (isNaN(r.amount) || r.amount < 0) errors.push(`Row ${i + 1}: invalid amount`)
        if (!r.deducted_at) errors.push(`Row ${i + 1}: missing date`)
      })
      if (errors.length > 0) {
        setCsvError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''))
        return
      }

      setCsvPreview(rows)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCSVConfirm = async () => {
    if (!csvPreview) return
    setUploadLoading(true)
    setUploadResult(null)
    try {
      const result = await api<{ created: number; message: string }>('/deductions/upload', {
        method: 'POST',
        body: JSON.stringify(csvPreview),
      })
      setUploadResult({ type: 'success', message: result.message })
      setCsvPreview(null)
      setRefreshKey((k) => k + 1)
    } catch (e: any) {
      setUploadResult({ type: 'error', message: e.message })
    } finally {
      setUploadLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Deductions</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          >
            <Upload size={14} /> <span className="hidden sm:inline">Upload CSV</span><span className="sm:hidden">Upload</span>
          </button>
          <button
            onClick={() => { resetNewForm(); setShowNewForm(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            <Plus size={14} /> <span className="hidden sm:inline">New Deduction</span><span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-white"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); debouncedSearch(e.target.value) }}
          />
        </div>
        <select
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white flex items-center gap-1.5 min-w-[140px]"
          >
            {statusFilter.length === 0
              ? 'All Statuses'
              : `${statusFilter.length} selected`}
            <ChevronDown size={12} className="ml-auto text-gray-400" />
          </button>
          {showStatusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
              <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48">
                {statusFilter.length > 0 && (
                  <button
                    onClick={() => { setStatusFilter([]); setPage(1) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    Clear all
                  </button>
                )}
                {Object.entries(STATUS_CONFIG).map(([val, { label, color }]) => (
                  <label key={val} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(val)}
                      onChange={(e) => {
                        setStatusFilter(prev =>
                          e.target.checked ? [...prev, val] : prev.filter(s => s !== val)
                        )
                        setPage(1)
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className={color}>{label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <select
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
          value={retailerFilter}
          onChange={(e) => { setRetailerFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Retailers</option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <input
          type="date"
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          title="From date"
        />
        <span className="text-gray-400 self-center text-xs">to</span>
        <input
          type="date"
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          title="To date"
        />
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear
          </button>
          <div className="ml-auto flex gap-2">
            {['accept', 'dispute', 'park', 'close'].map((a) => (
              <button
                key={a}
                onClick={() => { setBulkAction(a as any); setBulkNotes(''); setBulkResult(null); setShowBulkModal(true) }}
                className="px-3 py-1.5 text-xs font-medium border border-blue-300 rounded-md bg-white text-blue-700 hover:bg-blue-100 capitalize"
              >
                {a === 'park' ? 'Put On Hold' : a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={response ? selected.size === response.data.length && response.data.length > 0 : false}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('id')}>
                <span className="flex items-center">ID <SortIcon field="id" /></span>
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Company</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Retailer</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Reason</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('invoiceNumber')}>
                <span className="flex items-center">Invoice <SortIcon field="invoiceNumber" /></span>
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                <span className="flex items-center justify-end">Amount <SortIcon field="amount" /></span>
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('deductedAt')}>
                <span className="flex items-center">Date <SortIcon field="deductedAt" /></span>
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center">Status <SortIcon field="status" /></span>
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Handled By</th>
            </tr>
          </thead>
          <tbody>
            {response?.data.map((d) => {
              const sc = STATUS_CONFIG[d.status] || { label: d.status, color: 'text-gray-500', bg: 'bg-gray-50' }
              return (
                <tr
                  key={d.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selected.has(d.id) ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggleSelect(d.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500" onClick={() => navigate(`/deductions/${d.id}`)}>#{d.id}</td>
                  <td className="px-4 py-2.5" onClick={() => navigate(`/deductions/${d.id}`)}>{d.company?.name || <span className="text-gray-400">Unknown</span>}</td>
                  <td className="px-4 py-2.5" onClick={() => navigate(`/deductions/${d.id}`)}>{d.retailer?.name || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2.5" onClick={() => navigate(`/deductions/${d.id}`)}>{d.reason?.label || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" onClick={() => navigate(`/deductions/${d.id}`)}>{d.invoiceNumber || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono" onClick={() => navigate(`/deductions/${d.id}`)}>{formatCurrency(d.amount)}</td>
                  <td className="px-4 py-2.5 text-gray-500" onClick={() => navigate(`/deductions/${d.id}`)}>{formatDate(d.deductedAt)}</td>
                  <td className="px-4 py-2.5" onClick={() => navigate(`/deductions/${d.id}`)}>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500" onClick={() => navigate(`/deductions/${d.id}`)}>
                    {d.handledBy && d.handledBy.length > 0
                      ? d.handledBy.map(u => u.name).join(', ')
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {response && response.data.length === 0 && (
          <div className="py-12 text-center">
            <Search size={32} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-700 mb-1">No deductions found</h3>
            <p className="text-xs text-gray-500">
              {search || statusFilter.length > 0 || retailerFilter || dateFrom || dateTo
                ? 'Try adjusting your filters or search terms.'
                : 'Create a new deduction or upload a CSV to get started.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            {response ? `${response.total} total deductions` : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1 rounded border border-gray-200 bg-white disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-600">
              Page {page} of {totalPages}
            </span>
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

      {/* ─── New Deduction Modal ─── */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">New Deduction</h3>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <SelectWithAdd
                  label="Company"
                  required
                  value={newCompanyId}
                  onChange={setNewCompanyId}
                  options={companies}
                  placeholder="Select company..."
                  addLabel="Add Company"
                  onAdd={async (name) => {
                    const c = await api<Company>('/companies', { method: 'POST', body: JSON.stringify({ name }) })
                    return c
                  }}
                  onOptionsUpdated={loadRefs}
                />
                <SelectWithAdd
                  label="Retailer"
                  required
                  value={newRetailerId}
                  onChange={setNewRetailerId}
                  options={retailers}
                  placeholder="Select retailer..."
                  addLabel="Add Retailer"
                  onAdd={async (name) => {
                    const r = await api<Retailer>('/retailers', { method: 'POST', body: JSON.stringify({ name }) })
                    return r
                  }}
                  onOptionsUpdated={loadRefs}
                />
              </div>

              <SelectWithAdd
                label="Reason"
                value={newReasonId}
                onChange={setNewReasonId}
                options={reasons.map(r => ({ id: r.id, name: r.label }))}
                placeholder="Select reason (optional)..."
                addLabel="Add Reason"
                onAdd={async (name) => {
                  const r = await api<Reason>('/dispute-reasons', { method: 'POST', body: JSON.stringify({ label: name }) })
                  return { id: r.id, name: r.label }
                }}
                onOptionsUpdated={loadRefs}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full text-sm border border-gray-200 rounded-md pl-7 pr-3 py-2"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Deduction Date *</label>
                  <input
                    type="date"
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Invoice Number</label>
                <input
                  type="text"
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 uppercase"
                  value={newInvoice}
                  onChange={(e) => setNewInvoice(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
                  placeholder="e.g. INV-12345"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Letters, numbers, and hyphens only</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Any additional context..."
                />
              </div>

              {duplicateWarning.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1.5">
                  <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                    <AlertCircle size={12} /> Possible duplicate{duplicateWarning.length > 1 ? 's' : ''} found
                  </p>
                  {duplicateWarning.map((d) => (
                    <p key={d.id} className="text-xs text-amber-700">
                      #{d.id} — {d.retailer?.name || 'Unknown'} — {formatCurrency(d.amount)} — {d.invoiceNumber || 'No invoice'} — <span className="capitalize">{d.status.replace(/_/g, ' ')}</span>
                    </p>
                  ))}
                  <p className="text-xs text-amber-600">Click "Create Anyway" to proceed, or cancel and review.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                disabled={formLoading}
                onClick={handleCreateDeduction}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : duplicateWarning.length > 0 ? 'Create Anyway' : 'Create Deduction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk Action Modal ─── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 capitalize">
                Bulk {bulkAction === 'park' ? 'Put On Hold' : bulkAction} — {selected.size} deduction{selected.size !== 1 ? 's' : ''}
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {bulkResult && (
                <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 border ${
                  bulkResult.type === 'success' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  {bulkResult.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {bulkResult.message}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notes *</label>
                <textarea
                  className={`w-full text-sm border rounded-md px-3 py-2 resize-none ${!bulkNotes.trim() ? 'border-red-300' : 'border-gray-200'}`}
                  rows={3}
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Explain why you are performing this action on all selected deductions..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                disabled={bulkLoading || !bulkNotes.trim()}
                onClick={handleBulkAction}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 capitalize"
              >
                {bulkLoading ? 'Processing...' : `${bulkAction === 'park' ? 'Put On Hold' : bulkAction} ${selected.size} Deduction${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CSV Upload Modal ─── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowUpload(false); setUploadResult(null); setCsvPreview(null); setCsvError('') }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {csvPreview ? `Preview — ${csvPreview.length} row${csvPreview.length !== 1 ? 's' : ''}` : 'Upload CSV'}
              </h3>
              <button onClick={() => { setShowUpload(false); setUploadResult(null); setCsvPreview(null); setCsvError('') }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {!csvPreview ? (
                <>
                  <p className="text-sm text-gray-600">
                    Upload a CSV file with deductions. You'll preview the data before importing.
                  </p>

                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Required columns:</p>
                    <code className="text-xs text-gray-600 block">company_id, retailer_id, amount, deducted_at</code>
                    <p className="text-xs font-medium text-gray-700 mt-2 mb-1">Optional columns:</p>
                    <code className="text-xs text-gray-600 block">reason_id, invoice_number, notes</code>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Valid IDs to use:</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Companies:</strong> {companies.map(c => `${c.id} (${c.name})`).join(', ')}</p>
                      <p><strong>Retailers:</strong> {retailers.map(r => `${r.id} (${r.name})`).join(', ')}</p>
                      <p><strong>Reasons:</strong> {reasons.map(r => `${r.id} (${r.label})`).join(', ')}</p>
                    </div>
                  </div>

                  {csvError && (
                    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <pre className="whitespace-pre-wrap text-xs">{csvError}</pre>
                    </div>
                  )}

                  {uploadResult && (
                    <div className={`flex items-start gap-2 text-sm rounded-md px-3 py-2 border ${
                      uploadResult.type === 'success'
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : 'text-red-600 bg-red-50 border-red-200'
                    }`}>
                      {uploadResult.type === 'success' ? <CheckCircle size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
                      <span>{uploadResult.message}</span>
                    </div>
                  )}

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleCSVParse(file)
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                    >
                      <Upload size={16} /> Choose CSV file
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Review the data below. All entries will be created with <strong>Open</strong> status. Invoice numbers are auto-normalized.
                  </p>
                  <div className="border border-gray-200 rounded-md overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Company</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Retailer</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-1.5">{companies.find(c => c.id === row.company_id)?.name || row.company_id}</td>
                            <td className="px-3 py-1.5">{retailers.find(r => r.id === row.retailer_id)?.name || row.retailer_id}</td>
                            <td className="px-3 py-1.5 text-right font-mono">${row.amount.toFixed(2)}</td>
                            <td className="px-3 py-1.5">{row.deducted_at}</td>
                            <td className="px-3 py-1.5 font-mono">{row.invoice_number || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              {csvPreview ? (
                <>
                  <button
                    onClick={() => setCsvPreview(null)}
                    className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    disabled={uploadLoading}
                    onClick={handleCSVConfirm}
                    className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {uploadLoading ? 'Importing...' : `Import ${csvPreview.length} Deduction${csvPreview.length !== 1 ? 's' : ''}`}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowUpload(false); setUploadResult(null); setCsvError('') }}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
