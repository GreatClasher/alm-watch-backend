export abstract class LlmProvider {
  abstract generateStructured<T>(prompt: string, schema: any): Promise<T>;
  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract generateText(prompt: string, systemInstruction?: string): Promise<string>;
  abstract generateFromAudio(audioBase64: string, mimeType: string, prompt: string, systemInstruction?: string): Promise<string>;
  abstract generateEmbeddings(texts: string[]): Promise<number[][]>;
}
