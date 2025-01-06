import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_PATH = "./uploads"; // 固定上传目录

// 新的配置方式
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  try {
    if (!params.path || params.path.length < 2 || params.path[0] !== "file") {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const fileName = params.path[1];
    const filePath = join(process.cwd(), UPLOAD_PATH, fileName);

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 读取文件
    const fileBuffer = await readFile(filePath);

    // 根据文件扩展名设置Content-Type
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    let contentType = "application/octet-stream";

    // 常见文件类型的MIME类型映射
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      txt: "text/plain",
      json: "application/json",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      webm: "video/webm",
    };

    if (ext in mimeTypes) {
      contentType = mimeTypes[ext];
    }

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[File Download]", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 },
    );
  }
}
