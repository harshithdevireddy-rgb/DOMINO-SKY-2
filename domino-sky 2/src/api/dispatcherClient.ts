/**
 * DOMINO SKY - AI Dispatcher Client with Number Guard Integration
 */

import { CandidateAction } from '../engine/recovery';
import { SimulationResult } from '../engine/types';
import { generateFallbackDispatch, DispatcherResponse } from '../engine/fallbackDispatcher';
import { guardAIText, buildGroundTruthContext, NumberGuardAuditEntry } from '../engine/numberGuard';

export interface DispatcherClientResult {
  mode: 'ai_claude' | 'rule_based_fallback';
  summary: string;
  recommendations: Array<{
    actionId: string;
    rank: number;
    explanation: string;
    action: CandidateAction;
    wasModifiedByGuard: boolean;
    audits: NumberGuardAuditEntry[];
  }>;
  totalAudits: NumberGuardAuditEntry[];
  rawPayloadSent: unknown;
  rawResponseReceived: unknown;
}

export async function requestDispatcherRecommendations(
  baseResult: SimulationResult,
  candidates: CandidateAction[]
): Promise<DispatcherClientResult> {
  const payload = {
    baseResult: {
      params: baseResult.params,
      metrics: {
        totalFlights: baseResult.metrics.totalFlights,
        delayedCount: baseResult.metrics.delayedCount,
        cancelledCount: baseResult.metrics.cancelledCount,
        totalDelayMinutes: baseResult.metrics.totalDelayMinutes,
        maxDelayMinutes: baseResult.metrics.maxDelayMinutes,
        strandedPax: baseResult.metrics.strandedPax.total,
        crewBreachesCount: baseResult.metrics.crewBreachesCount,
      },
    },
    candidates: candidates.slice(0, 5),
  };

  let responseData: any = null;
  let mode: 'ai_claude' | 'rule_based_fallback' = 'rule_based_fallback';

  try {
    const res = await fetch('/api/dispatcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      responseData = await res.json();
      if (responseData.mode === 'ai_claude' && Array.isArray(responseData.recommendations)) {
        mode = 'ai_claude';
      }
    }
  } catch (e) {
    console.warn('Network call to /api/dispatcher failed, using client fallback:', e);
  }

  // Fallback if not successful from Claude
  let rawRecs: Array<{ actionId: string; rank: number; explanation: string }> = [];
  let summary = '';

  if (mode === 'ai_claude' && responseData) {
    rawRecs = responseData.recommendations;
    summary = responseData.summary || '';
  } else {
    const fallback = generateFallbackDispatch(baseResult, candidates);
    rawRecs = fallback.recommendations;
    summary = fallback.summary;
    mode = 'rule_based_fallback';
  }

  // Enforce Number Guard on all text
  const candidateMap = new Map<string, CandidateAction>();
  candidates.forEach((c) => candidateMap.set(c.id, c));

  const allAudits: NumberGuardAuditEntry[] = [];
  const processedRecommendations: DispatcherClientResult['recommendations'] = [];

  rawRecs.forEach((rec) => {
    const action = candidateMap.get(rec.actionId);
    if (!action) return;

    const groundTruth = buildGroundTruthContext(
      {
        totalDelayMinutes: baseResult.metrics.totalDelayMinutes,
        delayedCount: baseResult.metrics.delayedCount,
        cancelledCount: baseResult.metrics.cancelledCount,
        strandedPax: baseResult.metrics.strandedPax.total,
        crewBreaches: baseResult.metrics.crewBreachesCount,
      },
      action.metricsAfter
    );

    const guarded = guardAIText(rec.explanation, groundTruth, action.id);
    if (guarded.wasModified) {
      allAudits.push(...guarded.audits);
    }

    processedRecommendations.push({
      actionId: rec.actionId,
      rank: rec.rank,
      explanation: guarded.verifiedText,
      action,
      wasModifiedByGuard: guarded.wasModified,
      audits: guarded.audits,
    });
  });

  return {
    mode,
    summary,
    recommendations: processedRecommendations,
    totalAudits: allAudits,
    rawPayloadSent: payload,
    rawResponseReceived: responseData || { mode: 'rule_based_fallback' },
  };
}
