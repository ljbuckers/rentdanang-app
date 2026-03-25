import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [emailLower]
    );
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await queryOne<{ id: string; email: string; name: string }>(
      `INSERT INTO users (email, name, password_hash, auth_provider)
       VALUES ($1, $2, $3, 'credentials')
       RETURNING id, email, name`,
      [emailLower, name?.trim() || null, passwordHash]
    );

    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) {
    console.error("Signup error:", e.message);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
