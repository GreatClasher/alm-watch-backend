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
    return JSON.parse(response.candidates[0].content.parts[0].text) as T;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.ai.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
    });
    return result.embedding.values;
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.ai.getGenerativeModel({ 
      model: modelName,
      ...(systemInstruction ? { systemInstruction } : {})
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.candidates[0].content.parts[0].text;
  }

  async generateFromAudio(audioBase64: string, mimeType: string, prompt: string, systemInstruction?: string): Promise<string> {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
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
    
    const response = await result.response;
    return response.candidates[0].content.parts[0].text;
  }
}
