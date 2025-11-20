import { GoogleGenAI, Type } from "@google/genai";
import { AgentRole, GroundingSource } from "../types";

// Initialize the client
// process.env.API_KEY is assumed to be available in the environment
const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const runResearcherAgent = async (topic: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  const ai = createClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using Flash for speed and tool capability
      contents: `Research the following topic in depth: "${topic}". 
      Focus on finding key facts, historical context, recent developments, and important figures. 
      Provide a comprehensive set of notes.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a world-class dedicated Research Agent. Your goal is to gather accurate, comprehensive information from the web using Google Search. Do not summarize heavily yet; simply gather high-quality, factual raw data and notes.",
      },
    });

    const text = response.text || "No information found.";
    
    // Extract sources from grounding chunks
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    // Remove duplicates based on URI
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

    return { text, sources: uniqueSources };
  } catch (error: any) {
    console.error("Researcher Agent Error:", error);
    throw new Error(error.message || "Failed to research topic.");
  }
};

export const runAnalystAgent = async (researchData: string): Promise<string> => {
  const ai = createClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following research notes and identify the key themes, trends, and most valuable insights. 
      Organize the information logically. 
      
      Research Notes:
      ${researchData}`,
      config: {
        systemInstruction: "You are a Senior Data Analyst. Your goal is to synthesize raw research data into a structured, logical analysis. Discard irrelevant noise and focus on the signal. Structure your output as a clear detailed brief for a writer.",
      },
    });

    return response.text || "Analysis failed to generate content.";
  } catch (error: any) {
    console.error("Analyst Agent Error:", error);
    throw new Error(error.message || "Failed to analyze data.");
  }
};

export const runWriterAgent = async (analysis: string, topic: string): Promise<string> => {
  const ai = createClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for better creative writing quality
      contents: `Write a high-quality, engaging blog post about "${topic}" based on the following analysis brief. 
      The post should use Markdown formatting (headers, bullet points, bold text).
      
      Analysis Brief:
      ${analysis}`,
      config: {
        systemInstruction: "You are a Lead Content Writer. Your goal is to craft an engaging, educational, and SEO-friendly blog post. Use a professional yet accessible tone. Ensure the flow is natural and the content is valuable to the reader.",
      },
    });

    return response.text || "Writing failed to generate content.";
  } catch (error: any) {
    console.error("Writer Agent Error:", error);
    throw new Error(error.message || "Failed to write blog post.");
  }
};