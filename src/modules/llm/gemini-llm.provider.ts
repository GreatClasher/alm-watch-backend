import { Injectable, Logger } from '@nestjs/common';
import { VertexAI } from '@google-cloud/vertexai';
import { LlmProvider } from './llm.provider';

@Injectable()
export class GeminiLlmProvider extends LlmProvider {
  private ai: VertexAI;
  private logger = new Logger(GeminiLlmProvider.name);

  constructor() {
    super();
    this.ai = new VertexAI({ project: 'audiocube', location: 'asia-south1' });
  }

  async generateStructured<T>(prompt: string, schema: any): Promise<T> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.ai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text) as T;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0] || [];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    // Changing back to text-embedding-004 because it natively outputs 768 dimensions
    // matching your memory.entity.ts PostgreSQL vector(768) column perfectly.
    // (gemini-embedding-001 outputs 3072 dimensions, which crashes the DB insert).
    const modelName = 'text-embedding-004';
    const authClient = (this.ai as any).googleAuth;
    const token = await authClient.getAccessToken();
    const project = (this.ai as any).project;
    const location = (this.ai as any).location;
    
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelName}:predict`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instances: texts.map(text => ({ content: text })) })
    });
    
    const data = await res.json() as any;
    return (data.predictions || []).map((p: any) => p.embeddings?.values || []);
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.ai.getGenerativeModel({ 
      model: modelName,
      ...(systemInstruction ? { systemInstruction } : {})
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateFromAudio(audioBase64: string, mimeType: string, prompt: string, systemInstruction?: string): Promise<string> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.ai.getGenerativeModel({ 
      model: modelName,
      ...(systemInstruction ? { systemInstruction } : {})
    });
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      }]
    });
    
    const response = await result.response;
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
