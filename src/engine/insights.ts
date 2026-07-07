/**
 * Read-only helpers that explain what a loan is waiting on and roughly how
 * long it will take — shown in the loan detail modal so the player never
 * stares at a stalled card wondering why (M8.1 playtest feedback).
 */
import { PLAYER_SOLO_SPEED, STAGE_HOURS_REQUIRED, TECH_SPEED_BONUS_PER_TIER } from './constants';
import { effectiveness } from './employees';
import { missingDocs } from './loans';
import { docDeliveryCadence } from './tick';
import { tiersOwned } from './upgrades';
import type { GameState, Loan, Role } from './types';

export interface LoanOutlook {
  kind: 'delayed' | 'documents' | 'working' | 'unstaffed' | 'done';
  /** Estimated in-game hours until the next visible progress. */
  hours: number | null;
  assigneeName: string | null;
  assigneeRole: Role | null;
}

export function loanOutlook(state: GameState, loan: Loan): LoanOutlook {
  const worker = loan.assignedEmployeeId ? state.employees[loan.assignedEmployeeId] : undefined;
  const base = {
    assigneeName: worker?.name ?? null,
    assigneeRole: worker?.role ?? null,
  };

  if (loan.stage === 'completed') return { ...base, kind: 'done', hours: null };
  if (loan.delayed) return { ...base, kind: 'delayed', hours: null };

  if (loan.stage === 'documentCollection') {
    const owed = missingDocs(loan);
    if (owed.length > 0) {
      const customer = state.customers[loan.customerId];
      const hasRequested = owed.some((key) => loan.documents[key] === 'requested');
      // M9 — solo with nothing requested: the file waits on YOU, not the customer.
      if (!worker && !hasRequested) return { ...base, kind: 'unstaffed', hours: null };
      const cadence = docDeliveryCadence(customer, hasRequested);
      const untilNext = cadence - (Math.floor(loan.progressHours) % cadence);
      return { ...base, kind: 'documents', hours: untilNext };
    }
  }

  // M9 — unstaffed stages move at the founder's own solo pace.
  const speed = worker
    ? effectiveness(worker) * (1 + TECH_SPEED_BONUS_PER_TIER * tiersOwned(state, 'technology'))
    : PLAYER_SOLO_SPEED;
  const remaining = Math.max(0, STAGE_HOURS_REQUIRED[loan.stage] - loan.progressHours);
  return { ...base, kind: 'working', hours: Math.max(1, Math.ceil(remaining / speed)) };
}
