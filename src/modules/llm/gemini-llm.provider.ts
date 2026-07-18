import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, Schema } from '@google/generative-ai';
import { LlmProvider } from './llm.provider';

@Injectable()
export class GeminiLlmProvider extends LlmProvider {
  private ai: GoogleGenerativeAI;
  private logger = new Logger(GeminiLlmProvider.name);

  constructor() {
    super();
    // Use env var or empty string
    this.ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async generateStructured<T>(prompt: string, schema: Schema): Promise<T> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const model = this.ai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as T;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.ai.getGenerativeModel({ model: 'gemini-embedding-2' });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
    });
    return result.embedding.values;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const model = this.ai.getGenerativeModel({ 
      model: modelName,
      ...(systemInstruction ? { systemInstruction } : {})
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async generateFromAudio(audioBase64: string, mimeType: string, prompt: string, systemInstruction?: string): Promise<string> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const model = this.ai.getGenerativeModel({ 
      model: modelName,
      ...(systemInstruction ? { systemInstruction } : {})
    });
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType
        }
      },
      { text: prompt }
    ]);
    
    return result.response.text();
  }
}
