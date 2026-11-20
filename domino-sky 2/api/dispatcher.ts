/**
 * DOMINO SKY - Vercel Serverless Function: /api/dispatcher
 * Supports both Gemini API and Anthropic Claude API for AI recommendations.
 * Falls back to deterministic rule-based dispatcher if no API key is configured.
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { baseResult, candidates } = req.body || {};

    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!geminiKey && !anthropicKey) {
      return res.status(200).json({
        status: 'ok',
        mode: 'rule_based_fallback',
        message: 'No API key configured. Utilizing deterministic rule-based dispatcher.',
        useClientFallback: true,
      });
    }

    const prompt = `You are the Domino Sky AI Dispatcher, an expert airline operations coordinator.
A disruption has occurred. You are provided with the deterministic simulation engine's baseline result and scored candidate recovery actions.

GOLDEN RULE: Every number you state MUST match the numbers in this JSON. Never calculate or invent numbers. Pick and rank the top actions, and explain why in friendly, professional, clear English.

SIMULATION DATA:
${JSON.stringify({
  closure: baseResult?.params,
  metrics: baseResult?.metrics,
  candidateActions: (candidates || []).map((c: any) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    summary: c.summary,
    delayMinutesSaved: c.delta?.delayMinutesSaved,
    strandedPaxSaved: c.delta?.strandedPaxSaved,
    crewBreachesSaved: c.delta?.crewBreachesSaved,
    metricsAfter: c.metricsAfter,
  })),
}, null, 2)}

Respond with STRICT JSON ONLY matching this format:
{
  "recommendations": [
    {
      "actionId": "string (matching candidate id)",
      "rank": 1,
      "explanation": "One or two sentences explaining why this is the best move, using exact numbers from the data."
    }
  ],
  "summary": "Warm, calm executive summary of current network state and recommended recovery pathway."
}`;

    // Priority 1: Gemini API
    if (geminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(text);
        return res.status(200).json({
          status: 'ok',
          mode: 'ai_claude',
          recommendations: parsed.recommendations,
          summary: parsed.summary,
          rawOutput: parsed,
        });
      }
    }

    // Priority 2: Anthropic API
    if (anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const aiResult = await response.json();
        const textContent = aiResult.content?.[0]?.text || '';
        const cleanedJson = textContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsedAi = JSON.parse(cleanedJson);

        return res.status(200).json({
          status: 'ok',
          mode: 'ai_claude',
          recommendations: parsedAi.recommendations,
          summary: parsedAi.summary,
          rawOutput: parsedAi,
        });
      }
    }

    return res.status(200).json({
      status: 'fallback',
      mode: 'rule_based_fallback',
      message: 'AI API unavailable. Using deterministic fallback dispatcher.',
      useClientFallback: true,
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'fallback',
      mode: 'rule_based_fallback',
      error: err.message,
      useClientFallback: true,
    });
  }
}
