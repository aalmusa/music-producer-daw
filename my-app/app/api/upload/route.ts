// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeToDrive } from "../context/analyzeSongProcess";

// Ensure Node runtime
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid files field" },
        { status: 400 }
      );
    }

    // Process all files
    const filePaths: string[] = [];
    for (const file of files) {
      if (file instanceof File) {
        const savedPath = await writeToDrive(file);
        filePaths.push(savedPath);
      }
    }

    if (filePaths.length === 0) {
      return NextResponse.json(
        { error: "No valid files were processed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      filePaths: filePaths,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
