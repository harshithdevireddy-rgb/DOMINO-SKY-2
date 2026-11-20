import { describe, it, expect } from 'vitest';
import { guardAIText, buildGroundTruthContext } from './numberGuard';

describe('Number Guard - Golden Rule Enforcer', () => {
  it('passes verified text when AI numbers match engine calculations', () => {
    const context = buildGroundTruthContext(
      { totalDelayMinutes: 500, delayedCount: 7, cancelledCount: 0, strandedPax: 37, crewBreaches: 0 },
      { totalDelayMinutes: 188, delayedCount: 3, cancelledCount: 0, strandedPax: 0, crewBreaches: 0 }
    );

    // delayMinutesSaved is 500 - 188 = 312
    // strandedPaxSaved is 37 - 0 = 37
    const aiText = 'Deploying this spare saves 312 minutes and protects 37 passengers with 0 stranded passengers.';
    const res = guardAIText(aiText, context);

    expect(res.wasModified).toBe(false);
    expect(res.verifiedText).toBe(aiText);
    expect(res.audits).toHaveLength(0);
  });

  it('detects hallucinated numbers and corrects them with exact ground truth', () => {
    const context = buildGroundTruthContext(
      { totalDelayMinutes: 500, delayedCount: 7, cancelledCount: 0, strandedPax: 37, crewBreaches: 0 },
      { totalDelayMinutes: 188, delayedCount: 3, cancelledCount: 0, strandedPax: 0, crewBreaches: 0 }
    );

    // AI hallucinates: claims saving 450 minutes and saving 50 passengers
    const hallucinatedText = 'This action saves 450 minutes and protects 50 passengers across Delhi.';
    const res = guardAIText(hallucinatedText, context, 'test-action-1');

    expect(res.wasModified).toBe(true);
    // Should be corrected to 312 minutes and 37 passengers
    expect(res.verifiedText).toContain('312 minutes');
    expect(res.verifiedText).toContain('37 passengers');
    expect(res.audits.length).toBeGreaterThanOrEqual(2);
    expect(res.audits[0].correctedValue).toBe('312 min');
    expect(res.audits[1].correctedValue).toBe('37 pax');
  });
});
