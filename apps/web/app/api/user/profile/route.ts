import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const user = await queryOne(
    `SELECT name, email, phone, whatsapp_enabled, email_verified,
            phone_verified, auth_provider, avatar_url, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();

  const allowed = ["name", "phone", "whatsapp_enabled"];
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = $${idx++}`);
      values.push(body[key]);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(userId);
  const user = await queryOne(
    `UPDATE users SET ${sets.join(", ")}
     WHERE id = $${idx}
     RETURNING name, email, phone, whatsapp_enabled, email_verified,
               phone_verified, auth_provider, avatar_url`,
    values
  );

  return NextResponse.json({ user });
}
