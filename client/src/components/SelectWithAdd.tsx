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
      <label className="text-xs font-medium text-gray-500 mb-1 block">
        {label}{required && ' *'}
      </label>

      {!showAddForm ? (
        <div className="flex gap-1.5">
          <select
            className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
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
            <option value="__add__">＋ {addLabel}</option>
          </select>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-md p-2.5 bg-gray-50 space-y-2">
          <div className="flex items-center gap-1.5">
            <Plus size={12} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-600">{addLabel}</span>
          </div>
          <input
            type="text"
            className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 bg-white"
            placeholder={`Enter ${label.toLowerCase()} name...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); setError('') }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
            >
              <X size={10} /> Cancel
            </button>
            <button
              disabled={adding || !newName.trim()}
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
            >
              <Plus size={10} /> {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
