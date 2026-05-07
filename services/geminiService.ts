import { GoogleGenAI, Chat } from "@google/genai";
import { GroundingSource } from "../types";
import { researchCache } from "./cacheService";

export type ChunkCallback = (chunk: string) => void;

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export const runResearcherAgent = async (
  topic: string,
  onChunk?: ChunkCallback
): Promise<{ text: string; sources: GroundingSource[]; fromCache: boolean }> => {
  // Check cache first — skips API call entirely if hit
  const cached = await researchCache.get(topic);
  if (cached) {
    if (onChunk) onChunk(cached.text);
    return { ...cached, fromCache: true };
  }

  return withRetry(async () => {
    const ai = createClient();
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: `Research the topic "${topic}" comprehensively. Your notes must cover ALL of the following dimensions:

1. **Core concepts & definitions** — What is it? Key terminology.
2. **Historical background** — Origin, key milestones, how it evolved.
3. **Current state (2024–2025)** — Latest developments, breakthroughs, news.
4. **Key figures & organizations** — Important people, companies, institutions.
5. **Data & statistics** — Concrete numbers, studies, market size, growth rates.
6. **Future outlook** — Emerging trends, predictions, open challenges.

Provide detailed, factual, well-sourced notes. Do not summarize yet — gather the richest raw data possible.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a world-class Research Agent with Google Search access. Gather accurate, comprehensive, multi-dimensional research notes. Cover all 6 dimensions listed. Prioritize authoritative and recent sources. Include specific facts, names, and numbers.",
      },
    });

    let fullText = '';
    let lastChunk: any = null;

    for await (const chunk of stream) {
      const t = chunk.text || '';
      fullText += t;
      if (onChunk && t) onChunk(t);
      lastChunk = chunk;
    }

    const sources: GroundingSource[] = [];
    const groundingChunks = lastChunk?.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      for (const c of groundingChunks) {
        if (c.web?.uri && c.web?.title) {
          sources.push({ title: c.web.title, uri: c.web.uri });
        }
      }
    }

    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
    const result = { text: fullText || "No information found.", sources: uniqueSources };

    // Save to cache for future calls
    await researchCache.set(topic, result);
    return { ...result, fromCache: false };
  });
};

export const runAnalystAgent = async (
  researchData: string,
  onChunk?: ChunkCallback
): Promise<string> => {
  return withRetry(async () => {
    const ai = createClient();
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: `Transform the following raw research notes into a structured strategic brief for a content writer.

Your brief MUST follow this exact structure:

## Executive Summary
(3–4 sentences capturing the single most important insight)

## Key Themes & Insights
(5–7 bullet points, each with a supporting detail or statistic)

## Compelling Stories & Examples
(2–3 vivid, concrete anecdotes or case studies from the research)

## Data & Statistics to Highlight
(The strongest numbers, growth rates, or study findings)

## Recommended Narrative Arc
(Suggested structure: opening hook → sections → conclusion)

## Tone & Angle
(e.g., "Authoritative but accessible, angle: how this affects everyday people")

---
RAW RESEARCH NOTES:
${researchData}`,
      config: {
        systemInstruction: "You are a Senior Data Analyst and Content Strategist. Transform raw research into a sharp, structured writer's brief. Identify the strongest narrative thread. Discard noise, amplify signal. Be specific — vague briefs produce vague articles.",
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const t = chunk.text || '';
      fullText += t;
      if (onChunk && t) onChunk(t);
    }
    return fullText || "Analysis failed to generate content.";
  });
};

export const runWriterAgent = async (
  analysis: string,
  topic: string,
  onChunk?: ChunkCallback
): Promise<string> => {
  return withRetry(async () => {
    const ai = createClient();
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: `Write a compelling, publication-ready blog post about "${topic}" based on the strategic brief below.

**Requirements:**
- Open with a powerful hook that immediately draws the reader in
- Include a **TL;DR** box near the top (2–3 sentences)
- Use H1 for the title, H2 for main sections, H3 for sub-points
- Weave in the specific examples and statistics from the brief — no vague generalities
- Use **bold** for key terms and important takeaways
- Vary sentence length for rhythm — mix short punchy sentences with longer explanatory ones
- End with a strong conclusion and a clear call-to-action
- Target: 1,200–1,800 words
- Format: Markdown

---
STRATEGIC BRIEF:
${analysis}`,
      config: {
        systemInstruction: "You are an award-winning Lead Content Writer whose work appears in top publications. Create blog posts that are deeply informative, engaging, and shareable. Use active voice. Ground every claim in the specific examples and data from the brief. Write like you're explaining to a smart friend, not lecturing.",
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const t = chunk.text || '';
      fullText += t;
      if (onChunk && t) onChunk(t);
    }
    return fullText || "Writing failed to generate content.";
  });
};

export const createFollowUpChat = (topic: string, blogContent: string, researchNotes: string): Chat => {
  const ai = createClient();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are a knowledgeable assistant helping a user explore a research report you just generated.

Topic: ${topic}

Blog Post:
${blogContent}

Raw Research Notes:
${researchNotes}

Answer follow-up questions concisely and accurately based on this context. If asked to expand a section, provide additional depth. If asked about something outside the research, say so clearly and offer what you do know.`,
    },
  });
};
