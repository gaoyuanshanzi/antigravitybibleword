import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { word, verseRef, apiKey } = body;

    if (!word || !verseRef || !apiKey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const prompt = `
You are a world-class biblical scholar and linguist. Analyze the following biblical word in its original language (Hebrew or Greek).

Target Word: ${word}
Context (Verse): ${verseRef}

Please provide a detailed etymological analysis formatted in Markdown. Include:
1. **Original Word**: The word in Hebrew/Greek and its transliteration.
2. **Strong's Number**: If applicable.
3. **Definition**: The literal and contextual meaning.
4. **Etymology / Root**: Where does this word come from? How was it formed?
5. **Contextual Usage**: How does this word impact the theological or historical understanding of ${verseRef}?

Keep the response scholarly, professional, and easy to read.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ analysis: response.text });
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: 'Failed to generate analysis. Please check your API key.' }, { status: 500 });
  }
}
