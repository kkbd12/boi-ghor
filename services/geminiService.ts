import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    // According to guidelines, initialize with apiKey from process.env
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
}

export type GenerationType = 'summary' | 'authorIntro' | 'description';

export const generateBookInfo = async (
  title: string,
  author: string,
  type: GenerationType
): Promise<string> => {
  let prompt = '';
  switch (type) {
    case 'summary':
      prompt = `Provide a concise summary for the book titled "${title}" by ${author}. The summary should be for a digital library app and written in Bengali.`;
      break;
    case 'authorIntro':
      prompt = `Write a brief introduction about the author ${author}, who wrote the book "${title}". The introduction should be for a digital library app and written in Bengali.`;
      break;
    case 'description':
       prompt = `Write a short, engaging book description for "${title}" by ${author} for a digital library. The description should be in Bengali and about 2-3 sentences.`;
       break;
  }

  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash', // Basic text task model
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error(`Error generating ${type}:`, error);
    throw new Error(`Failed to generate ${type}. Please try again.`);
  }
};

export const extractBookInfoFromFile = async (
  filePart: { mimeType: string; data: string } | { text: string }
): Promise<{ title?: string; author?: string; genre?: string; publicationYear?: number }> => {
  const prompt = `
    Analyze the following content (which is either from a book's cover image or its first few pages of text) and extract the book's information.
    The book is in Bengali. Provide the response in JSON format.
    Extract the following fields:
    - title (string, in Bengali)
    - author (string, in Bengali)
    - genre (string, in Bengali, if available)
    - publicationYear (number, if available)

    If a field is not found, omit it from the JSON.
  `;

  const contents: any = { parts: [{ text: prompt }] };

  if ('text' in filePart) {
    contents.parts.push({ text: filePart.text });
  } else {
    contents.parts.push({
      inlineData: {
        mimeType: filePart.mimeType,
        data: filePart.data,
      },
    });
  }

  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-pro', // Use a more capable model for extraction and JSON formatting
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The title of the book in Bengali." },
            author: { type: Type.STRING, description: "The author of the book in Bengali." },
            genre: { type: Type.STRING, description: "The genre of the book in Bengali." },
            publicationYear: { type: Type.INTEGER, description: "The year the book was published." },
          },
        },
      },
    });

    const text = response.text.trim();
    if (!text) {
        throw new Error("AI returned an empty response.");
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error extracting book info:', error);
    throw new Error('Failed to extract book information from the file.');
  }
};