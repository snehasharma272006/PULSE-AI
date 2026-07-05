import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // NEW: unpdf's two-step process — load the document, then extract its text
    const pdf = await getDocumentProxy(buffer);
    const { text: extractedText } = await extractText(pdf, { mergePages: true });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Summarize the key medical information in this document in simple, clear language:\n\n${extractedText}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({
      extractedTextPreview: extractedText.slice(0, 300),
      summary,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}