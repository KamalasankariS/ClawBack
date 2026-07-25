export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  accepted: { label: 'Accepted', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
  parked: { label: 'On Hold', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  in_dispute: { label: 'In Dispute', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  dispute_filed: { label: 'Dispute Filed', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  resolved_won: { label: 'Won', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  resolved_lost: { label: 'Lost', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  resolved_partial: { label: 'Partial', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  closed: { label: 'Closed', color: 'text-gray-500', bg: 'bg-gray-100 border-gray-300' },
};
