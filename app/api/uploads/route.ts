import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { nanoid } from "nanoid";
import { getServerSideConfig } from "@/app/config/server";

const serverConfig = getServerSideConfig();
const UPLOAD_PATH = "./uploads"; // 固定上传目录
const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ACCESS_CODES = (process.env.CODE || "")
  .split(",")
  .map((code) => code.trim());

// 新的配置方式
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 验证访问令牌
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token || !ACCESS_CODES.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "";
    const fileName = `${nanoid()}.${ext}`;
    const relativePath = join(UPLOAD_PATH, fileName);
    const absolutePath = join(process.cwd(), relativePath);

    await mkdir(dirname(absolutePath), { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(absolutePath, buffer);

    // 构建完整的URL
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "";
    const fileUrl = `${protocol}://${host}/api/uploads/file/${fileName}`;

    return NextResponse.json({ code: 0, data: fileUrl });
  } catch (error) {
    console.error("[File Upload]", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
