export const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['accepted', 'parked', 'in_dispute'],
  parked: ['open'],
  in_dispute: ['dispute_filed'],
  dispute_filed: ['resolved_won', 'resolved_lost', 'resolved_partial'],
  resolved_won: ['closed'],
  resolved_lost: ['closed'],
  resolved_partial: ['closed'],
};

export function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  accepted: 'Accepted',
  parked: 'Parked',
  in_dispute: 'In Dispute',
  dispute_filed: 'Dispute Filed',
  resolved_won: 'Won',
  resolved_lost: 'Lost',
  resolved_partial: 'Partial',
  closed: 'Closed',
};
