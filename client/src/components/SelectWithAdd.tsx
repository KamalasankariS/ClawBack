import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface Option {
  id: number
  name?: string
  label?: string
}

interface Props {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  onAdd: (name: string) => Promise<Option>
  addLabel?: string
  onOptionsUpdated?: () => void
}

export function SelectWithAdd({
  label, required, value, onChange, options, placeholder, onAdd, addLabel = 'Add New', onOptionsUpdated,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    try {
      const created = await onAdd(newName.trim())
      onChange(created.id.toString())
      setShowAddForm(false)
      setNewName('')
      onOptionsUpdated?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <label className="text-xs font-medium text-subtle mb-1 block">
        {label}{required && ' *'}
      </label>

      {!showAddForm ? (
        <div className="flex gap-1.5">
          <select
            className="flex-1 text-sm border border-edge rounded-md px-3 py-2 bg-input-bg text-heading"
            value={value}
            onChange={(e) => {
              if (e.target.value === '__add__') {
                setShowAddForm(true)
              } else {
                onChange(e.target.value)
              }
            }}
          >
            <option value="">{placeholder || `Select ${label.toLowerCase()}...`}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.name || o.label}</option>
            ))}
            <option value="__add__">+ {addLabel}</option>
          </select>
        </div>
      ) : (
        <div className="border border-edge rounded-md p-2.5 bg-panel-hover space-y-2">
          <div className="flex items-center gap-1.5">
            <Plus size={12} className="text-faint" />
            <span className="text-xs font-medium text-prose">{addLabel}</span>
          </div>
          <input
            type="text"
            className="w-full text-sm border border-edge rounded px-3 py-1.5 bg-input-bg text-heading"
            placeholder={`Enter ${label.toLowerCase()} name...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); setError('') }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-prose border border-edge rounded hover:bg-panel-hover"
            >
              <X size={10} /> Cancel
            </button>
            <button
              disabled={adding || !newName.trim()}
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              <Plus size={10} /> {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
