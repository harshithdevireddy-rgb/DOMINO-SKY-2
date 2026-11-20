/**
 * DOMINO SKY - Number Guard
 * Golden Rule Enforcer:
 * Validates every number stated in AI dispatcher responses against the deterministic simulation truth.
 * Replaces mismatched numbers with ground-truth values and logs full audit trails for the debug panel.
 */

export interface NumberGuardAuditEntry {
  field: string;
  originalValue: string;
  correctedValue: string;
  context: string;
  actionId?: string;
  timestamp: string;
}

export interface NumberGuardResult {
  verifiedText: string;
  wasModified: boolean;
  audits: NumberGuardAuditEntry[];
}

export interface GroundTruthContext {
  delayMinutesSaved: number;
  totalDelayMinutesBefore: number;
  totalDelayMinutesAfter: number;
  strandedPaxBefore: number;
  strandedPaxAfter: number;
  strandedPaxSaved: number;
  delayedCountBefore: number;
  delayedCountAfter: number;
  cancelledCountBefore: number;
  cancelledCountAfter: number;
  crewBreachesBefore: number;
  crewBreachesAfter: number;
  crewBreachesSaved: number;
  allowedNumbers: Set<number>;
}

export function buildGroundTruthContext(
  beforeMetrics: {
    totalDelayMinutes: number;
    delayedCount: number;
    cancelledCount: number;
    strandedPax: number;
    crewBreaches: number;
  },
  afterMetrics: {
    totalDelayMinutes: number;
    delayedCount: number;
    cancelledCount: number;
    strandedPax: number;
    crewBreaches: number;
  },
  extraNumbers: number[] = []
): GroundTruthContext {
  const delayMinutesSaved = beforeMetrics.totalDelayMinutes - afterMetrics.totalDelayMinutes;
  const strandedPaxSaved = beforeMetrics.strandedPax - afterMetrics.strandedPax;
  const crewBreachesSaved = beforeMetrics.crewBreaches - afterMetrics.crewBreaches;

  const allowedNumbers = new Set<number>([
    beforeMetrics.totalDelayMinutes,
    afterMetrics.totalDelayMinutes,
    delayMinutesSaved,
    beforeMetrics.strandedPax,
    afterMetrics.strandedPax,
    strandedPaxSaved,
    beforeMetrics.delayedCount,
    afterMetrics.delayedCount,
    beforeMetrics.cancelledCount,
    afterMetrics.cancelledCount,
    beforeMetrics.crewBreaches,
    afterMetrics.crewBreaches,
    crewBreachesSaved,
    0, 1, 2, 3, 4, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, // common standard intervals & indices
    ...extraNumbers,
  ]);

  return {
    delayMinutesSaved,
    totalDelayMinutesBefore: beforeMetrics.totalDelayMinutes,
    totalDelayMinutesAfter: afterMetrics.totalDelayMinutes,
    strandedPaxBefore: beforeMetrics.strandedPax,
    strandedPaxAfter: afterMetrics.strandedPax,
    strandedPaxSaved,
    delayedCountBefore: beforeMetrics.delayedCount,
    delayedCountAfter: afterMetrics.delayedCount,
    cancelledCountBefore: beforeMetrics.cancelledCount,
    cancelledCountAfter: afterMetrics.cancelledCount,
    crewBreachesBefore: beforeMetrics.crewBreaches,
    crewBreachesAfter: afterMetrics.crewBreaches,
    crewBreachesSaved,
    allowedNumbers,
  };
}

/**
 * Validates text from AI against deterministic ground truth.
 * Identifies quantified phrases (e.g. "saved 150 minutes", "80 stranded passengers")
 * and corrects any AI hallucinated values with engine calculations.
 */
export function guardAIText(
  text: string,
  context: GroundTruthContext,
  actionId?: string
): NumberGuardResult {
  const audits: NumberGuardAuditEntry[] = [];
  let verifiedText = text;

  // Patterns for delay minutes saved
  const delaySavedPatterns = [
    /(?:save|saves|saving|saved|reduces?|cut)\s*(?:by|up to)?\s*(\d+)\s*(?:minutes?|mins?|m\b)/gi,
    /(\d+)\s*(?:minutes?|mins?|m)\s*(?:of delay saved|delay minutes saved|delay reduction)/gi,
  ];

  delaySavedPatterns.forEach((pattern) => {
    verifiedText = verifiedText.replace(pattern, (match, captured) => {
      const num = parseInt(captured, 10);
      if (num !== context.delayMinutesSaved && context.delayMinutesSaved >= 0) {
        audits.push({
          field: 'delayMinutesSaved',
          originalValue: `${num} min`,
          correctedValue: `${context.delayMinutesSaved} min`,
          context: match,
          actionId,
          timestamp: new Date().toLocaleTimeString(),
        });
        return match.replace(captured, context.delayMinutesSaved.toString());
      }
      return match;
    });
  });

  // Patterns for stranded passengers saved or remaining
  const paxSavedPatterns = [
    /(?:protects?|saves?|saving|saved)\s*(\d+)\s*(?:passengers?|pax)/gi,
    /(\d+)\s*(?:fewer stranded passengers|passengers saved)/gi,
  ];

  paxSavedPatterns.forEach((pattern) => {
    verifiedText = verifiedText.replace(pattern, (match, captured) => {
      const num = parseInt(captured, 10);
      if (num !== context.strandedPaxSaved && context.strandedPaxSaved >= 0) {
        audits.push({
          field: 'strandedPaxSaved',
          originalValue: `${num} pax`,
          correctedValue: `${context.strandedPaxSaved} pax`,
          context: match,
          actionId,
          timestamp: new Date().toLocaleTimeString(),
        });
        return match.replace(captured, context.strandedPaxSaved.toString());
      }
      return match;
    });
  });

  // Patterns for remaining stranded passengers
  const strandedRemainingPatterns = [
    /(\d+)\s*(?:passengers stranded|stranded passengers|stranded pax)/gi,
  ];

  strandedRemainingPatterns.forEach((pattern) => {
    verifiedText = verifiedText.replace(pattern, (match, captured) => {
      const num = parseInt(captured, 10);
      // If it mentions stranded passengers, it should match either before or after
      if (num !== context.strandedPaxAfter && num !== context.strandedPaxBefore && num !== context.strandedPaxSaved) {
        const bestTarget = context.strandedPaxAfter;
        audits.push({
          field: 'strandedPaxRemaining',
          originalValue: `${num} pax`,
          correctedValue: `${bestTarget} pax`,
          context: match,
          actionId,
          timestamp: new Date().toLocaleTimeString(),
        });
        return match.replace(captured, bestTarget.toString());
      }
      return match;
    });
  });

  return {
    verifiedText,
    wasModified: audits.length > 0,
    audits,
  };
}
