import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { ModelProvider } from "../../../constant";

export async function POST(req: NextRequest) {
  const authResult = auth(req, ModelProvider.GPT);
  return NextResponse.json(authResult);
}
