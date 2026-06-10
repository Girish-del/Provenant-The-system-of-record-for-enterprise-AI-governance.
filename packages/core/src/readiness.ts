import type { ControlStatus } from './controls';

/** The state of one required control for a use case, used to compute readiness. */
export interface ControlState {
  controlId: string;
  code: string;
  mapped: boolean;
  status: ControlStatus | null;
  cleanEvidenceCount: number;
}

export interface Gap {
  controlId: string;
  code: string;
  reason: string;
}

export interface ReadinessSummary {
  required: number;
  satisfied: number;
  readinessPct: number; // 0-100, 100 when nothing is required
  byStatus: Record<ControlStatus, number>; // counts among mapped controls
  gaps: Gap[];
}

/**
 * A required control is satisfied when it is either explicitly marked
 * NOT_APPLICABLE (a valid, justified disposition) or IMPLEMENTED with at least
 * one clean (scanned) piece of evidence. Everything else is a gap.
 */
function isSatisfied(state: ControlState): boolean {
  if (!state.mapped) {
    return false;
  }
  if (state.status === 'NOT_APPLICABLE') {
    return true;
  }
  return state.status === 'IMPLEMENTED' && state.cleanEvidenceCount > 0;
}

function gapReason(state: ControlState): string {
  if (!state.mapped) {
    return 'control not mapped to this use case';
  }
  switch (state.status) {
    case 'IN_PROGRESS':
      return 'implementation in progress';
    case 'IMPLEMENTED':
      return 'implemented but missing verified (clean) evidence';
    case 'NOT_STARTED':
    default:
      return 'mapped but not started';
  }
}

export function computeReadiness(states: ControlState[]): ReadinessSummary {
  const byStatus: Record<ControlStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    IMPLEMENTED: 0,
    NOT_APPLICABLE: 0,
  };
  let satisfied = 0;
  const gaps: Gap[] = [];

  for (const state of states) {
    if (state.mapped && state.status) {
      byStatus[state.status] += 1;
    }
    if (isSatisfied(state)) {
      satisfied += 1;
    } else {
      gaps.push({ controlId: state.controlId, code: state.code, reason: gapReason(state) });
    }
  }

  const required = states.length;
  const readinessPct = required === 0 ? 100 : Math.round((satisfied / required) * 100);
  return { required, satisfied, readinessPct, byStatus, gaps };
}
