import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { buildPrompt, STYLE_CONFIGS, StyleKey } from "@/lib/prompts";

export interface GenerateRequest {
  address: string;
  style: StyleKey;
}

export interface GenerateResponse {
  imageBase64: string; // data:image/png;base64,...
  prompt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { address, style } = body;

    // --- Input validation ---
    if (!address || typeof address !== "string" || address.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a valid property address (at least 5 characters)." },
        { status: 400 }
      );
    }

    if (!style || !STYLE_CONFIGS[style]) {
      return NextResponse.json(
        { error: "Invalid style selected." },
        { status: 400 }
      );
    }

    if (!process.env.HF_API_TOKEN) {
      return NextResponse.json(
        { error: "Hugging Face token not configured. Add HF_API_TOKEN to your .env.local file." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(address.trim(), style);

    const client = new InferenceClient(process.env.HF_API_TOKEN);

    // FLUX.1-dev — high quality, free on HF Inference API
    const result = await client.textToImage({
      model: "black-forest-labs/FLUX.1-dev",
      inputs: prompt,
      parameters: {
        width: 1024,
        height: 1024,
      },
    });

    // HF Inference returns a Blob
    const blob = result as unknown as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const imageBase64 = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    return NextResponse.json({ imageBase64, prompt } satisfies GenerateResponse);
  } catch (err: unknown) {
    console.error("[/api/generate] Error:", err);

    const message = err instanceof Error ? err.message : "An unexpected error occurred.";

    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      return NextResponse.json(
        { error: "Invalid Hugging Face token. Check HF_API_TOKEN in your .env.local file." },
        { status: 401 }
      );
    }

    if (message.includes("503") || message.toLowerCase().includes("loading")) {
      return NextResponse.json(
        { error: "Model is loading, please wait 20 seconds and try again." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
