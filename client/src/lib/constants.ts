export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25' },
  accepted: { label: 'Accepted', color: 'text-subtle', bg: 'bg-panel-hover border-edge' },
  parked: { label: 'On Hold', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25' },
  in_dispute: { label: 'In Dispute', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/25' },
  dispute_filed: { label: 'Dispute Filed', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/25' },
  resolved_won: { label: 'Won', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/25' },
  resolved_lost: { label: 'Lost', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25' },
  resolved_partial: { label: 'Partial', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/25' },
  closed: { label: 'Closed', color: 'text-subtle', bg: 'bg-panel-hover border-edge' },
};
