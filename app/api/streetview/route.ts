import { NextRequest, NextResponse } from "next/server";

export interface StreetViewAngle {
  heading: number;  // -1 = satellite/aerial
  label: string;
  imageBase64: string;
  source: "streetview" | "satellite";
}

export interface StreetViewResponse {
  angles: StreetViewAngle[];
}

const ANGLES = [
  { heading: 0,   label: "North" },
  { heading: 90,  label: "East"  },
  { heading: 180, label: "South" },
  { heading: 270, label: "West"  },
];

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json() as { address: string };

    if (!address || address.trim().length < 5) {
      return NextResponse.json({ error: "Invalid address." }, { status: 400 });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: "Google Maps API key not configured." }, { status: 500 });
    }

    const encoded = encodeURIComponent(address.trim());
    const key = process.env.GOOGLE_MAPS_API_KEY;

    // Check Street View metadata first
    const metaRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encoded}&key=${key}`
    );
    const meta = await metaRes.json() as { status: string };

    if (meta.status !== "OK") {
      return NextResponse.json(
        { error: `No Street View imagery found for "${address.trim()}". Try a more specific address.` },
        { status: 422 }
      );
    }

    // Fetch all 4 street view angles + satellite in parallel
    const [streetViewResults, satelliteResult] = await Promise.all([
      Promise.all(
        ANGLES.map(async ({ heading, label }) => {
          const url =
            `https://maps.googleapis.com/maps/api/streetview` +
            `?size=600x600&location=${encoded}&fov=90&heading=${heading}&pitch=0&source=outdoor&key=${key}`;
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          const imageBase64 = `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
          return { heading, label, imageBase64, source: "streetview" as const };
        })
      ),
      (async () => {
        const url =
          `https://maps.googleapis.com/maps/api/staticmap` +
          `?center=${encoded}&zoom=19&size=600x600&maptype=satellite&key=${key}`;
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const imageBase64 = `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
        return { heading: -1, label: "Aerial View", imageBase64, source: "satellite" as const };
      })(),
    ]);

    const angles = [...streetViewResults, satelliteResult];
    return NextResponse.json({ angles } satisfies StreetViewResponse);
  } catch (err) {
    console.error("[/api/streetview] Error:", err);
    return NextResponse.json({ error: "Failed to fetch Street View images." }, { status: 500 });
  }
}
