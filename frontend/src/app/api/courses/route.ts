import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

export async function POST(request: NextRequest) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_URL}/courses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to create course" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Course creation API error:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
