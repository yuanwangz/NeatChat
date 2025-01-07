import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import md5 from "spark-md5";
import { getServerSideConfig } from "@/app/config/server";

const DB_DIR = "./db";

export async function GET(req: NextRequest) {
  const serverConfig = getServerSideConfig();
  const authToken =
    req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const hashedCode = md5.hash(authToken).trim();

  if (!serverConfig.codes.has(hashedCode)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const testPath = join(DB_DIR, "test");
    await mkdir(dirname(testPath), { recursive: true });
    await writeFile(testPath, "", "utf-8");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[LocalDb] check error", e);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
