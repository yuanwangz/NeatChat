import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { ModelProvider, ACCESS_CODE_PREFIX } from "../../../constant";
import path from "path";
import fs from "fs";
import md5 from "spark-md5";

// 获取哈希后的文件名
function getHashedFilename(accessCode: string) {
  return `${md5.hash(accessCode.trim())}.json`;
}

export async function GET(req: NextRequest) {
  // 添加前缀再验证
  const authToken = req.headers.get("Authorization") ?? "";
  req.headers.set("Authorization", `${ACCESS_CODE_PREFIX}${authToken}`);

  const authResult = auth(req, ModelProvider.GPT);
  if (authResult.error) {
    return NextResponse.json(authResult, { status: 401 });
  }

  try {
    const dbPath = path.join(process.cwd(), "db");
    const filePath = path.join(dbPath, getHashedFilename(authToken));

    if (!fs.existsSync(filePath)) {
      return new NextResponse("", { status: 200 });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(content, { status: 200 });
  } catch (e) {
    console.error("[LocalDb] failed to read state:", e);
    return new NextResponse("", { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  // 添加前缀再验证
  const authToken = req.headers.get("Authorization") ?? "";
  req.headers.set("Authorization", `${ACCESS_CODE_PREFIX}${authToken}`);

  const authResult = auth(req, ModelProvider.GPT);
  if (authResult.error) {
    return NextResponse.json(authResult, { status: 401 });
  }

  try {
    const dbPath = path.join(process.cwd(), "db");
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    const content = await req.text();
    const filePath = path.join(dbPath, getHashedFilename(authToken));
    fs.writeFileSync(filePath, content, "utf-8");

    return new NextResponse("", { status: 200 });
  } catch (e) {
    console.error("[LocalDb] failed to write state:", e);
    return new NextResponse("", { status: 500 });
  }
}

export const runtime = "nodejs";
