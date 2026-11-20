import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import type { IncomingMessage, ServerResponse } from 'http';

// Load .env
dotenv.config();

function dispatcherApiPlugin() {
  return {
    name: 'dispatcher-api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/dispatcher', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { baseResult, candidates } = data;

            const geminiKey = process.env.GEMINI_API_KEY;
            const anthropicKey = process.env.ANTHROPIC_API_KEY;

            if ((!geminiKey || !geminiKey.trim()) && (!anthropicKey || !anthropicKey.trim())) {
              // Graceful fallback to deterministic rule engine
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'ok',
                mode: 'rule_based_fallback',
                message: 'No AI API key found in environment. Using deterministic fallback dispatcher.',
                useClientFallback: true,
              }));
              return;
            }

            const prompt = `You are the Domino Sky AI Dispatcher, a warm, calm, expert airline operations coordinator.
A disruption has occurred. You are provided with the deterministic simulation engine's baseline result and scored candidate recovery actions.

GOLDEN RULE: Every number you state MUST match the numbers in this JSON. Never calculate or invent numbers. Pick and rank the top actions, and explain why in friendly, professional, clear English.

SIMULATION DATA:
${JSON.stringify({
  closure: baseResult.params,
  metrics: baseResult.metrics,
  candidateActions: candidates.map((c: any) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    summary: c.summary,
    delayMinutesSaved: c.delta.delayMinutesSaved,
    strandedPaxSaved: c.delta.strandedPaxSaved,
    crewBreachesSaved: c.delta.crewBreachesSaved,
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

            if (geminiKey) {
              const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: 'application/json' },
                }),
              });

              if (geminiRes.ok) {
                const gData = await geminiRes.json();
                const text = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const parsedAi = JSON.parse(text);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  status: 'ok',
                  mode: 'ai_claude',
                  recommendations: parsedAi.recommendations,
                  summary: parsedAi.summary,
                  rawInput: { promptLength: prompt.length },
                  rawOutput: parsedAi,
                }));
                return;
              }
            }

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

            if (!response.ok) {
              const errText = await response.text();
              console.warn('Claude API returned error, falling back to rule-based dispatcher:', errText);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'fallback',
                mode: 'rule_based_fallback',
                apiError: errText,
                useClientFallback: true,
              }));
              return;
            }

            const aiResult = await response.json();
            const textContent = aiResult.content?.[0]?.text || '';
            const cleanedJson = textContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsedAi = JSON.parse(cleanedJson);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'ok',
              mode: 'ai_claude',
              recommendations: parsedAi.recommendations,
              summary: parsedAi.summary,
              rawInput: { promptLength: prompt.length },
              rawOutput: parsedAi,
            }));
          } catch (err: any) {
            console.error('Dispatcher error:', err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'fallback',
              mode: 'rule_based_fallback',
              error: err.message,
              useClientFallback: true,
            }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    dispatcherApiPlugin(),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
