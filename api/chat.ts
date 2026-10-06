import { chatCompletion, ChatMessage } from './_providers';
import { checkLimit, recordUsage } from './_usage';
import { readJsonBody } from './_http';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check the daily free-usage limit; quota is consumed after a successful reply.
    const usage = await checkLimit(req, res);
    if (!usage) return; // 429 already sent

    try {
        const { history, context, userMessage } = readJsonBody(req);

        const systemInstruction = `You are a helpful teaching assistant and research aide.
You have access to the following source material (transcript or document):
---
${context ? context.slice(0, 50000) : ''} ... (truncated if too long)
---
Answer the user's questions based strictly on this context. Be concise, academic, and helpful.`;

        const messages: ChatMessage[] = [
            { role: 'system', content: systemInstruction },
            ...(history || []).map((h: any) => ({
                role: h.role === 'model' ? 'assistant' : 'user',
                content: h.text,
            })),
            { role: 'user', content: userMessage },
        ];

        const { content, provider } = await chatCompletion(messages, {
            maxTokens: 2048,
            temperature: 0.6,
        });

        await recordUsage(req, res);
        res.setHeader('x-ai-provider', provider);
        return res.status(200).json({ content: content || "I couldn't generate a response.", provider });
    } catch (error: any) {
        console.error('Chat API Error:', error);
        return res.status(503).json({ error: error.message || 'All AI providers are currently unavailable.' });
    }
}
