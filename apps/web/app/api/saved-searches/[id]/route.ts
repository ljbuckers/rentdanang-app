import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const search = await queryOne(
    `SELECT id, name, filters, alert_enabled, alert_frequency,
            notify_email, notify_sms, notify_whatsapp,
            last_alerted_at, created_at
     FROM saved_searches
     WHERE id = $1 AND user_id = $2`,
    [params.id, userId]
  );

  if (!search) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ search });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();

  // Build SET clause dynamically from provided fields
  const allowed = [
    "name", "filters", "alert_enabled", "alert_frequency",
    "notify_email", "notify_sms", "notify_whatsapp",
  ];
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = $${idx++}`);
      values.push(key === "filters" ? JSON.stringify(body[key]) : body[key]);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(params.id, userId);
  const search = await queryOne(
    `UPDATE saved_searches SET ${sets.join(", ")}
     WHERE id = $${idx++} AND user_id = $${idx}
     RETURNING id, name, filters, alert_enabled, alert_frequency,
               notify_email, notify_sms, notify_whatsapp, created_at`,
    values
  );

  if (!search) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ search });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const result = await queryOne(
    "DELETE FROM saved_searches WHERE id = $1 AND user_id = $2 RETURNING id",
    [params.id, userId]
  );

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
