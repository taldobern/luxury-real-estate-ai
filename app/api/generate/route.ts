import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { GoogleGenAI } from "@google/genai";
import { buildPrompt, buildAerialDronePrompt, STYLE_CONFIGS, StyleKey } from "@/lib/prompts";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface GenerateRequest {
  address: string;
  style: StyleKey;
  heading?: number;
  uploadedImageBase64?: string;
}

export interface GenerateResponse {
  imageBase64: string;
  originalBase64: string;
  prompt: string;
}

async function fetchStreetView(address: string, heading = 0): Promise<Buffer> {
  const encoded = encodeURIComponent(address);
  const key = process.env.GOOGLE_MAPS_API_KEY;

  const svUrl =
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=1024x1024&location=${encoded}&fov=90&heading=${heading}&pitch=0&source=outdoor&key=${key}`;

  const response = await fetch(svUrl);
  if (!response.ok) throw new Error("Failed to fetch Street View image.");
  return Buffer.from(await response.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    // --- Auth check via Bearer token ---
    const admin = createAdminClient();
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Please sign in to generate images." }, { status: 401 });
    }

    const { data: { user }, error: authError } = await admin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in to generate images." }, { status: 401 });
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("images_used, images_limit, trial_ends_at, plan")
      .eq("id", user.id)
      .single();

    if (profile) {
      // Check trial expiry
      if (profile.plan === "trial" && new Date(profile.trial_ends_at) < new Date()) {
        return NextResponse.json(
          { error: "Your free trial has expired. Please contact us to continue." },
          { status: 403 }
        );
      }
      // Check image limit
      if (profile.images_used >= profile.images_limit) {
        return NextResponse.json(
          { error: `You've reached your ${profile.images_limit} image limit for this plan.` },
          { status: 403 }
        );
      }
    }

    // --- Input validation ---
    const body: GenerateRequest = await req.json();
    const { address, style, heading = 0, uploadedImageBase64 } = body;

    if (!address || typeof address !== "string" || address.trim().length < 5) {
      return NextResponse.json({ error: "Please provide a valid property address." }, { status: 400 });
    }

    if (!style || !STYLE_CONFIGS[style]) {
      return NextResponse.json({ error: "Invalid style selected." }, { status: 400 });
    }

    // --- Fetch / decode source image ---
    let prompt: string;
    let originalBase64: string;
    let imageBuffer: Buffer;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (style === "aerial" && uploadedImageBase64) {
      // Aerial/Drone: Gemini Nano Banana 2 (gemini-3.1-flash-image-preview)
      const base64Data = uploadedImageBase64.replace(/^data:image\/\w+;base64,/, "");
      const mimeType = uploadedImageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      originalBase64 = uploadedImageBase64;
      prompt = buildAerialDronePrompt(address.trim());

      const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

      const geminiResponse = await gemini.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } },
        ],
        config: {
          responseModalities: ["IMAGE"],
        },
      });

      const parts = geminiResponse.candidates?.[0]?.content?.parts ?? [];
      let geminiImageData: string | undefined;
      for (const part of parts) {
        if (part.inlineData?.data) {
          geminiImageData = part.inlineData.data;
          break;
        }
      }

      if (!geminiImageData) {
        return NextResponse.json({ error: "No image returned by Gemini." }, { status: 500 });
      }
      imageBuffer = Buffer.from(geminiImageData, "base64");

    } else {
      // All other styles: Street View + OpenAI gpt-image-1
      let streetViewBuffer: Buffer;
      try {
        streetViewBuffer = await fetchStreetView(address.trim(), heading);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not fetch Street View image.";
        return NextResponse.json({ error: message }, { status: 422 });
      }
      originalBase64 = `data:image/jpeg;base64,${streetViewBuffer.toString("base64")}`;
      prompt = buildPrompt(address.trim(), style);
      const imageFile = await toFile(streetViewBuffer, "property.jpg", { type: "image/jpeg" });
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      });
      const imageData = response.data?.[0];
      if (!imageData) return NextResponse.json({ error: "No image returned by OpenAI." }, { status: 500 });
      if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, "base64");
      } else if (imageData.url) {
        const imgRes = await fetch(imageData.url);
        imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      } else {
        return NextResponse.json({ error: "Unexpected API response format." }, { status: 500 });
      }
    }

    const imageBase64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

    // --- Upload to Supabase Storage ---
    const fileName = `${user.id}/${Date.now()}.png`;
    const { error: uploadError } = await admin.storage
      .from("generations")
      .upload(fileName, imageBuffer, { contentType: "image/png", upsert: false });

    let imageUrl = imageBase64; // fallback to base64 if upload fails

    if (!uploadError) {
      const { data: urlData } = admin.storage.from("generations").getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;

      // Save generation record + increment usage
      await Promise.all([
        admin.from("generations").insert({
          user_id: user.id,
          address: address.trim(),
          style,
          image_url: imageUrl,
          prompt,
        }),
        admin.from("profiles")
          .update({ images_used: (profile?.images_used ?? 0) + 1 })
          .eq("id", user.id),
      ]);
    }

    return NextResponse.json({ imageBase64, originalBase64, prompt } satisfies GenerateResponse);
  } catch (err: unknown) {
    console.error("[/api/generate] Error:", err);

    if (err instanceof OpenAI.APIError) {
      const msg =
        err.status === 429 ? "Rate limit reached. Please wait and try again." :
        err.status === 401 ? "Invalid OpenAI API key." :
        err.status === 400 ? "OpenAI rejected the image. Try a different address or style." :
        err.message || "OpenAI API error.";
      return NextResponse.json({ error: msg }, { status: err.status ?? 500 });
    }

    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
