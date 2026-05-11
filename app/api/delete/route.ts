import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    // Verify ownership and get image URL
    const { data: gen, error: fetchError } = await admin
      .from("generations")
      .select("id, image_url, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !gen) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Try to delete from Supabase storage
    try {
      const url = new URL(gen.image_url);
      const pathParts = url.pathname.split("/object/public/generations/");
      if (pathParts[1]) {
        await admin.storage.from("generations").remove([decodeURIComponent(pathParts[1])]);
      }
    } catch {
      // Storage delete failure is non-fatal — still remove the DB record
    }

    // Delete from DB — images_used is NOT decremented (credit was consumed)
    await admin.from("generations").delete().eq("id", id).eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/delete] Error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
