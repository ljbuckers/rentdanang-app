import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const searches = await query(
    `SELECT id, name, filters, alert_enabled, alert_frequency,
            notify_email, notify_sms, notify_whatsapp,
            last_alerted_at, created_at
     FROM saved_searches
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return NextResponse.json({ searches });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const {
    name,
    filters,
    alert_enabled = true,
    alert_frequency = "instant",
    notify_email = true,
    notify_sms = false,
    notify_whatsapp = false,
  } = body;

  if (!filters || typeof filters !== "object") {
    return NextResponse.json({ error: "Filters are required" }, { status: 400 });
  }

  const search = await queryOne(
    `INSERT INTO saved_searches
      (user_id, name, filters, alert_enabled, alert_frequency,
       notify_email, notify_sms, notify_whatsapp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, filters, alert_enabled, alert_frequency,
               notify_email, notify_sms, notify_whatsapp, created_at`,
    [userId, name, JSON.stringify(filters), alert_enabled, alert_frequency,
     notify_email, notify_sms, notify_whatsapp]
  );

  return NextResponse.json({ search }, { status: 201 });
}
