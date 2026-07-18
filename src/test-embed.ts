import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json() as any;
    console.log(data.models.map((m: any) => m.name));
  } catch (e: any) {
    console.error(e);
  }
}
run();
