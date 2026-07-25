import { describe, it, expect } from 'vitest';
import { canTransition, VALID_TRANSITIONS } from '../lib/workflow.js';

describe('Workflow State Machine', () => {
  describe('canTransition', () => {
    // ─── Valid transitions ───
    it('allows open → accepted', () => {
      expect(canTransition('open', 'accepted')).toBe(true);
    });

    it('allows open → parked (on hold)', () => {
      expect(canTransition('open', 'parked')).toBe(true);
    });

    it('allows open → in_dispute', () => {
      expect(canTransition('open', 'in_dispute')).toBe(true);
    });

    it('allows parked → open (take off hold)', () => {
      expect(canTransition('parked', 'open')).toBe(true);
    });

    it('allows in_dispute → dispute_filed', () => {
      expect(canTransition('in_dispute', 'dispute_filed')).toBe(true);
    });

    it('allows dispute_filed → resolved_won', () => {
      expect(canTransition('dispute_filed', 'resolved_won')).toBe(true);
    });

    it('allows dispute_filed → resolved_lost', () => {
      expect(canTransition('dispute_filed', 'resolved_lost')).toBe(true);
    });

    it('allows dispute_filed → resolved_partial', () => {
      expect(canTransition('dispute_filed', 'resolved_partial')).toBe(true);
    });

    it('allows resolved_won → closed', () => {
      expect(canTransition('resolved_won', 'closed')).toBe(true);
    });

    it('allows resolved_lost → closed', () => {
      expect(canTransition('resolved_lost', 'closed')).toBe(true);
    });

    it('allows resolved_partial → closed', () => {
      expect(canTransition('resolved_partial', 'closed')).toBe(true);
    });

    // ─── Invalid transitions ───
    it('blocks open → closed (must go through dispute pipeline)', () => {
      expect(canTransition('open', 'closed')).toBe(false);
    });

    it('blocks accepted → open (accepted is terminal)', () => {
      expect(canTransition('accepted', 'open')).toBe(false);
    });

    it('blocks closed → open (closed is terminal)', () => {
      expect(canTransition('closed', 'open')).toBe(false);
    });

    it('blocks in_dispute → closed (must file first)', () => {
      expect(canTransition('in_dispute', 'closed')).toBe(false);
    });

    it('blocks parked → accepted (must go back to open first)', () => {
      expect(canTransition('parked', 'accepted')).toBe(false);
    });

    it('blocks dispute_filed → open (can only resolve)', () => {
      expect(canTransition('dispute_filed', 'open')).toBe(false);
    });

    it('blocks open → resolved_won (cannot skip dispute steps)', () => {
      expect(canTransition('open', 'resolved_won')).toBe(false);
    });

    // ─── Edge cases ───
    it('returns false for unknown source status', () => {
      expect(canTransition('unknown', 'open')).toBe(false);
    });

    it('returns false for empty strings', () => {
      expect(canTransition('', '')).toBe(false);
    });
  });

  describe('VALID_TRANSITIONS coverage', () => {
    it('defines transitions for all active statuses', () => {
      const expectedStatuses = [
        'open', 'parked', 'in_dispute', 'dispute_filed',
        'resolved_won', 'resolved_lost', 'resolved_partial',
      ];
      for (const status of expectedStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
        expect(VALID_TRANSITIONS[status]!.length).toBeGreaterThan(0);
      }
    });

    it('does not define transitions for terminal statuses', () => {
      expect(VALID_TRANSITIONS).not.toHaveProperty('accepted');
      expect(VALID_TRANSITIONS).not.toHaveProperty('closed');
    });
  });
});
