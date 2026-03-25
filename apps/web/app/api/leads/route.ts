import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, budget_min, budget_max, preferred_area, move_in_date, source } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const lead = await queryOne(
      `INSERT INTO leads (name, email, budget_min, budget_max, preferred_area, move_in_date, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        name || null,
        email.trim().toLowerCase(),
        budget_min || null,
        budget_max || null,
        preferred_area || null,
        move_in_date || null,
        source || "website",
      ]
    );

    // Notify via internal webhook (picked up by monitoring)
    try {
      const notifyBody = JSON.stringify({
        type: "new_lead",
        id: lead?.id,
        name: name || "Anonymous",
        email: email.trim().toLowerCase(),
        budget: budget_max ? `${budget_min || 0}-${budget_max} VND` : "Not specified",
        area: preferred_area || "Any",
        move_in: move_in_date || "Not specified",
      });
      // Log for monitoring pickup
      console.log(`[LEAD] New lead #${lead?.id}: ${name || "Anon"} <${email}> budget:${budget_min}-${budget_max} area:${preferred_area}`);
    } catch (notifyErr) {
      // Don't fail the request if notification fails
      console.error("Lead notification error:", notifyErr);
    }

    return NextResponse.json({ success: true, id: lead?.id }, { status: 201 });
  } catch (e: any) {
    console.error("Leads API error:", e.message);
    return NextResponse.json(
      { error: "Failed to save lead" },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const page = Math.max(1, parseInt(params.get("page") || "1"));
    const perPage = Math.min(100, parseInt(params.get("per_page") || "50"));
    const offset = (page - 1) * perPage;

    let whereClause = "1=1";
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    const leads = await query(
      `SELECT * FROM leads
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, perPage, offset]
    );

    return NextResponse.json({ leads });
  } catch (e: any) {
    console.error("Leads API error:", e.message);
    return NextResponse.json(
      { leads: [], error: "Database unavailable" },
      { status: 503 }
    );
  }
}
