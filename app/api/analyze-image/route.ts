import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert the image into Base64 text format so it can travel in the request
    const base64Image = buffer.toString("base64");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are explaining a medical report to a worried patient or their family member who has no medical background. Do not simply restate the numbers and values from the report — that's what the report already shows them.

Instead:
- Start with one sentence: overall, is this reassuring, or does something need attention?
- Explain what each key result actually MEANS for their health, in plain everyday language (e.g. instead of "HbA1c 5.6%", say something like "your blood sugar control looks healthy, no signs of diabetes risk")
- Use simple comparisons or analogies where helpful
- Clearly separate "Nothing to worry about" from "Worth discussing with your doctor"
- Avoid medical jargon; if you must use a technical term, immediately explain it in parentheses
- Keep it warm and reassuring in tone, but honest — don't hide anything genuinely concerning`;

    // Send both the image data AND our instruction together
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const summary = result.response.text();

    return NextResponse.json({ summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}