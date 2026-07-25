import { useEffect, useState, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { formatCurrency, formatDate, timeAgo } from '../lib/utils'
import { STATUS_CONFIG } from '../lib/constants'
import { ArrowLeft, CheckCircle, AlertTriangle, PauseCircle, Send, Trophy, XCircle, Minus, Lock, MessageSquare, X, Pencil, Paperclip, FileText as FileIcon } from 'lucide-react'
import { SelectWithAdd } from '../components/SelectWithAdd'

interface Activity {
  id: number
  action: string
  fromStatus: string | null
  toStatus: string | null
  details: any
  attachments: any
  createdAt: string
  user: { name: string }
}

interface Deduction {
  id: number
  companyId: number | null
  retailerId: number | null
  reasonId: number | null
  amount: string
  status: string
  invoiceNumber: string | null
  deductedAt: string | null
  notes: string | null
  recoveredAmount: string | null
  resolutionType: string | null
  resolutionNotes: string | null
  rawData: any
  company: { name: string } | null
  retailer: { name: string } | null
  reason: { label: string; code: string; typicallyDisputable: boolean } | null
  activities: Activity[]
}

const ACTION_LABELS: Record<string, string> = {
  imported: 'Imported from spreadsheet',
  triage_accept: 'Accepted as legitimate',
  triage_dispute: 'Flagged for dispute',
  triage_park: 'Put on hold',
  unpark: 'Taken off hold, moved back to Open',
  status_change: 'Status changed',
  file_dispute: 'Dispute filed',
  resolve_won: 'Dispute won — full recovery',
  resolve_lost: 'Dispute lost — no recovery',
  resolve_partial: 'Dispute partially recovered',
  close: 'Closed',
  note_added: 'Note added',
  created: 'Created',
  edited: 'Details edited',
}

interface AttachmentMeta { filename: string; originalName: string; size: number }

// ─── Confirmation Modal ───
function ActionModal({
  open, onClose, title, description, confirmLabel, confirmColor, onConfirm, loading, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel: string
  confirmColor: string
  onConfirm: (notes: string, attachments: AttachmentMeta[]) => void
  loading: boolean
  children?: ReactNode
}) {
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setNotes(''); setAttachments([]) } }, [open])

  const handleFileUpload = async (files: FileList) => {
    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('files', f))
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('confido_token') || ''}` },
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const uploaded: AttachmentMeta[] = await res.json()
      setAttachments(prev => [...prev, ...uploaded])
    } catch {
      alert('File upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">{description}</p>

          {children}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 ${
                notes.trim() ? 'border-gray-200' : 'border-red-200'
              }`}
              rows={3}
              placeholder="Required — explain the reasoning behind this action..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
            {!notes.trim() && (
              <p className="text-[10px] text-red-400 mt-0.5">Notes are required before you can proceed</p>
            )}
          </div>

          {/* File upload */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Supporting Documents <span className="text-gray-400">(optional)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
            >
              <Paperclip size={12} /> {uploading ? 'Uploading...' : 'Attach files'}
            </button>
            {attachments.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                    <span className="flex items-center gap-1 text-gray-600 truncate">
                      <FileIcon size={10} /> {a.originalName}
                    </span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            disabled={loading || !notes.trim() || uploading}
            onClick={() => onConfirm(notes, attachments)}
            className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${confirmColor}`}
          >
            {loading ? 'Submitting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface RefCompany { id: number; name: string }
interface RefRetailer { id: number; name: string }
interface RefReason { id: number; code: string; label: string }

// ─── Main Page ───
export function DeductionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deduction, setDeduction] = useState<Deduction | null>(null)
  const [loading, setLoading] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Reference data for edit form
  const [companies, setCompanies] = useState<RefCompany[]>([])
  const [retailers, setRetailers] = useState<RefRetailer[]>([])
  const [reasons, setReasons] = useState<RefReason[]>([])

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [editCompanyId, setEditCompanyId] = useState('')
  const [editRetailerId, setEditRetailerId] = useState('')
  const [editReasonId, setEditReasonId] = useState('')
  const [editInvoice, setEditInvoice] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Modal state
  const [modal, setModal] = useState<{
    type: 'dispute' | 'accept' | 'park' | 'unpark' | 'file' | 'resolve' | 'close'
  } | null>(null)

  // Resolution form state (used inside resolve modal)
  const [resolutionType, setResolutionType] = useState<'won' | 'lost' | 'partial'>('won')
  const [recoveredAmount, setRecoveredAmount] = useState('')

  const reload = () => {
    api<Deduction>(`/deductions/${id}`).then(setDeduction)
  }

  useEffect(() => { reload() }, [id])

  const loadRefs = () => {
    api<RefCompany[]>('/companies').then(setCompanies)
    api<RefRetailer[]>('/retailers').then(setRetailers)
    api<RefReason[]>('/dispute-reasons').then(setReasons)
  }

  useEffect(() => { loadRefs() }, [])

  const openEditModal = () => {
    if (!deduction) return
    setEditCompanyId(deduction.companyId?.toString() ?? '')
    setEditRetailerId(deduction.retailerId?.toString() ?? '')
    setEditReasonId(deduction.reasonId?.toString() ?? '')
    setEditInvoice(deduction.invoiceNumber ?? '')
    setEditAmount(deduction.amount?.toString() ?? '')
    setEditDate(deduction.deductedAt ? deduction.deductedAt.slice(0, 10) : '')
    setShowEdit(true)
  }

  const handleSaveEdit = async () => {
    setEditLoading(true)
    try {
      await api(`/deductions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          companyId: editCompanyId ? parseInt(editCompanyId) : null,
          retailerId: editRetailerId ? parseInt(editRetailerId) : null,
          reasonId: editReasonId ? parseInt(editReasonId) : null,
          invoiceNumber: editInvoice || null,
          amount: editAmount ? parseFloat(editAmount) : undefined,
          deductedAt: editDate || null,
        }),
      })
      setShowEdit(false)
      reload()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setEditLoading(false)
    }
  }

  if (!deduction) return <div className="text-gray-500">Loading...</div>

  const sc = STATUS_CONFIG[deduction.status] || { label: deduction.status, color: 'text-gray-500', bg: 'bg-gray-50' }

  const doAction = async (path: string, body: object) => {
    setLoading(true)
    try {
      await api(`/deductions/${id}${path}`, { method: 'PATCH', body: JSON.stringify(body) })
      setModal(null)
      reload()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!noteText.trim()) return
    await api(`/deductions/${id}/notes`, { method: 'POST', body: JSON.stringify({ notes: noteText }) })
    setNoteText('')
    reload()
  }

  const modalConfig: Record<string, { title: string; description: string; confirmLabel: string; confirmColor: string }> = {
    dispute: {
      title: 'Dispute This Deduction',
      description: `You're disputing ${formatCurrency(deduction.amount)} from ${deduction.retailer?.name || 'this retailer'}. Why do you believe this deduction is incorrect?`,
      confirmLabel: 'Start Dispute',
      confirmColor: 'bg-orange-600 hover:bg-orange-700',
    },
    accept: {
      title: 'Accept This Deduction',
      description: `You're accepting ${formatCurrency(deduction.amount)} as a legitimate deduction. This means we won't dispute it.`,
      confirmLabel: 'Accept Deduction',
      confirmColor: 'bg-gray-700 hover:bg-gray-800',
    },
    park: {
      title: 'Put On Hold',
      description: `Putting this deduction on hold for later review. What information do you need before making a decision?`,
      confirmLabel: 'Put On Hold',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    },
    unpark: {
      title: 'Take Off Hold',
      description: `Moving this deduction back to Open for triage. What changed?`,
      confirmLabel: 'Move to Open',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
    },
    file: {
      title: 'File Dispute',
      description: `Filing a formal dispute for ${formatCurrency(deduction.amount)} with ${deduction.retailer?.name || 'the retailer'}. Give some details to support the dispute.`,
      confirmLabel: 'File Dispute',
      confirmColor: 'bg-purple-600 hover:bg-purple-700',
    },
    resolve: {
      title: 'Record Resolution',
      description: `How was the dispute for ${formatCurrency(deduction.amount)} resolved?`,
      confirmLabel: 'Submit Resolution',
      confirmColor: 'bg-green-600 hover:bg-green-700',
    },
    close: {
      title: 'Close This Deduction',
      description: `Closing this deduction permanently. Any final notes?`,
      confirmLabel: 'Close',
      confirmColor: 'bg-gray-800 hover:bg-gray-900',
    },
  }

  const handleModalConfirm = (notes: string, attachments: AttachmentMeta[]) => {
    if (!modal) return
    const atts = attachments.length ? attachments : undefined

    switch (modal.type) {
      case 'dispute':
        return doAction('/triage', { action: 'dispute', notes, attachments: atts })
      case 'accept':
        return doAction('/triage', { action: 'accept', notes, attachments: atts })
      case 'park':
        return doAction('/triage', { action: 'park', notes, attachments: atts })
      case 'unpark':
        return doAction('/unpark', { notes, attachments: atts })
      case 'file':
        return doAction('/status', { status: 'dispute_filed', notes, attachments: atts })
      case 'resolve':
        return doAction('/resolve', {
          resolutionType,
          recoveredAmount: resolutionType === 'partial' ? parseFloat(recoveredAmount) : undefined,
          notes, attachments: atts,
        })
      case 'close':
        return doAction('/close', { notes, attachments: atts })
    }
  }

  const currentModalConfig = modal ? modalConfig[modal.type] : null

  return (
    <div>
      {/* Header */}
      <button onClick={() => navigate('/deductions')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to Deductions
      </button>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Main Info */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{formatCurrency(deduction.amount)}</h2>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">Deduction #{deduction.id}</p>
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 hover:bg-gray-50"
                >
                  <Pencil size={10} /> Edit
                </button>
              </div>
            </div>
            {deduction.reason?.typicallyDisputable && deduction.status === 'open' && (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                <AlertTriangle size={12} /> Typically Disputable
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-gray-500">Company</span>
              <p className="font-medium">{deduction.company?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Retailer</span>
              <p className="font-medium">{deduction.retailer?.name || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Reason</span>
              <p className="font-medium">{deduction.reason?.label || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Invoice</span>
              <p className="font-medium font-mono">{deduction.invoiceNumber || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Deducted Date</span>
              <p className="font-medium">{formatDate(deduction.deductedAt)}</p>
            </div>
            {deduction.recoveredAmount && (
              <div>
                <span className="text-gray-500">Recovered</span>
                <p className="font-medium text-green-700">{formatCurrency(deduction.recoveredAmount)}</p>
              </div>
            )}
            {deduction.resolutionNotes && (
              <div className="col-span-2">
                <span className="text-gray-500">Resolution Notes</span>
                <p className="font-medium">{deduction.resolutionNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>

          {deduction.status === 'open' && (
            <div className="space-y-2">
              <button
                onClick={() => setModal({ type: 'dispute' })}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
              >
                <AlertTriangle size={14} /> Dispute
              </button>
              <button
                onClick={() => setModal({ type: 'accept' })}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-gray-700 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <CheckCircle size={14} /> Accept
              </button>
              <button
                onClick={() => setModal({ type: 'park' })}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-gray-700 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <PauseCircle size={14} /> Put On Hold
              </button>
            </div>
          )}

          {deduction.status === 'parked' && (
            <button
              onClick={() => setModal({ type: 'unpark' })}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <ArrowLeft size={14} /> Take Off Hold
            </button>
          )}

          {deduction.status === 'in_dispute' && (
            <button
              onClick={() => setModal({ type: 'file' })}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
            >
              <Send size={14} /> File Dispute
            </button>
          )}

          {deduction.status === 'dispute_filed' && (
            <button
              onClick={() => { setResolutionType('won'); setRecoveredAmount(''); setModal({ type: 'resolve' }) }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              <Trophy size={14} /> Record Resolution
            </button>
          )}

          {['resolved_won', 'resolved_lost', 'resolved_partial'].includes(deduction.status) && (
            <button
              onClick={() => setModal({ type: 'close' })}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900"
            >
              <Lock size={14} /> Close
            </button>
          )}

          {['accepted', 'closed'].includes(deduction.status) && (
            <p className="text-xs text-gray-500 text-center py-4">No actions available — this deduction is {deduction.status}.</p>
          )}

          {/* Add Note */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <button onClick={addNote} className="px-2 py-1.5 bg-gray-100 rounded hover:bg-gray-200">
                <MessageSquare size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Activity Timeline</h3>
        <div className="space-y-0">
          {deduction.activities.map((a, i) => {
            const isLast = i === deduction.activities.length - 1
            return (
              <div key={a.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                  {!isLast && <div className="w-px flex-1 bg-gray-200" />}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {a.user.name}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(a.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {ACTION_LABELS[a.action] || a.action}
                    {a.fromStatus && a.toStatus && a.action === 'status_change' && (
                      <span className="text-gray-400">
                        {' '}({STATUS_CONFIG[a.fromStatus]?.label} → {STATUS_CONFIG[a.toStatus]?.label})
                      </span>
                    )}
                  </p>
                  {a.details?.notes && (
                    <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                      {a.details.notes}
                    </p>
                  )}
                  {a.details?.note && (
                    <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                      {a.details.note}
                    </p>
                  )}
                  {a.details?.recoveredAmount != null && a.details.recoveredAmount > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Recovered: {formatCurrency(a.details.recoveredAmount)}
                    </p>
                  )}
                  {a.attachments && Array.isArray(a.attachments) && (a.attachments as AttachmentMeta[]).length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {(a.attachments as AttachmentMeta[]).map((att, j) => (
                        <a
                          key={j}
                          href={`/api/uploads/${att.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Paperclip size={10} /> {att.originalName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {deduction.activities.length === 0 && (
            <p className="text-sm text-gray-400">No activity yet.</p>
          )}
        </div>
      </div>

      {/* ─── Action Confirmation Modal ─── */}
      {currentModalConfig && (
        <ActionModal
          open={!!modal}
          onClose={() => setModal(null)}
          title={currentModalConfig.title}
          description={currentModalConfig.description}
          confirmLabel={currentModalConfig.confirmLabel}
          confirmColor={currentModalConfig.confirmColor}
          onConfirm={handleModalConfirm}
          loading={loading}
        >
          {/* Extra fields for resolve modal */}
          {modal?.type === 'resolve' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Resolution Type</label>
                <div className="flex gap-1.5">
                  {(['won', 'lost', 'partial'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setResolutionType(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                        resolutionType === t
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t === 'won' && <Trophy size={12} />}
                      {t === 'lost' && <XCircle size={12} />}
                      {t === 'partial' && <Minus size={12} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {resolutionType === 'partial' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Recovered Amount (of {formatCurrency(deduction.amount)})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full text-sm border border-gray-200 rounded-md pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      value={recoveredAmount}
                      onChange={(e) => setRecoveredAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
              {resolutionType === 'won' && (
                <p className="text-xs text-green-600 bg-green-50 rounded px-2 py-1.5">
                  Full amount of {formatCurrency(deduction.amount)} will be marked as recovered.
                </p>
              )}
              {resolutionType === 'lost' && (
                <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">
                  No amount will be recovered. The deduction stands.
                </p>
              )}
            </div>
          )}
        </ActionModal>
      )}

      {/* ─── Edit Deduction Modal ─── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Edit Deduction #{deduction.id}</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-500">Fix missing or incorrect data. All changes are logged in the activity timeline.</p>

              <div className="grid grid-cols-2 gap-3">
                <SelectWithAdd
                  label="Company"
                  value={editCompanyId}
                  onChange={setEditCompanyId}
                  options={companies}
                  placeholder="Unknown"
                  addLabel="Add Company"
                  onAdd={async (name) => {
                    const c = await api<RefCompany>('/companies', { method: 'POST', body: JSON.stringify({ name }) })
                    return c
                  }}
                  onOptionsUpdated={loadRefs}
                />
                <SelectWithAdd
                  label="Retailer"
                  value={editRetailerId}
                  onChange={setEditRetailerId}
                  options={retailers}
                  placeholder="Select retailer..."
                  addLabel="Add Retailer"
                  onAdd={async (name) => {
                    const r = await api<RefRetailer>('/retailers', { method: 'POST', body: JSON.stringify({ name }) })
                    return r
                  }}
                  onOptionsUpdated={loadRefs}
                />
              </div>

              <SelectWithAdd
                label="Reason"
                value={editReasonId}
                onChange={setEditReasonId}
                options={reasons.map(r => ({ id: r.id, name: r.label }))}
                placeholder="Select reason..."
                addLabel="Add Reason"
                onAdd={async (name) => {
                  const r = await api<RefReason>('/dispute-reasons', { method: 'POST', body: JSON.stringify({ label: name }) })
                  return { id: r.id, name: r.label }
                }}
                onOptionsUpdated={loadRefs}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full text-sm border border-gray-200 rounded-md pl-7 pr-3 py-2"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Deduction Date</label>
                  <input
                    type="date"
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Invoice Number</label>
                <input
                  type="text"
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
                  value={editInvoice}
                  onChange={(e) => setEditInvoice(e.target.value)}
                  placeholder="e.g. INV-12345"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                disabled={editLoading}
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
