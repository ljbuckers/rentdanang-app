import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { lead_id, company_name, company_email, referral_fee } = body;

    if (!lead_id || !company_name) {
      return NextResponse.json(
        { error: "lead_id and company_name are required" },
        { status: 400 }
      );
    }

    const referral = await queryOne(
      `INSERT INTO referrals (lead_id, company_name, company_email, referral_fee)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [
        lead_id,
        company_name,
        company_email || null,
        referral_fee || null,
      ]
    );

    return NextResponse.json(
      { success: true, id: referral?.id },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("Referrals API error:", e.message);
    return NextResponse.json(
      { error: "Failed to save referral" },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const paid = params.get("paid");

    let whereClause = "1=1";
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND r.status = $${paramIndex++}`;
      values.push(status);
    }
    if (paid !== null && paid !== "") {
      whereClause += ` AND r.paid = $${paramIndex++}`;
      values.push(paid === "true");
    }

    const referrals = await query(
      `SELECT r.*, l.name as lead_name, l.email as lead_email
       FROM referrals r
       LEFT JOIN leads l ON l.id = r.lead_id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC`,
      values
    );

    return NextResponse.json({ referrals });
  } catch (e: any) {
    console.error("Referrals API error:", e.message);
    return NextResponse.json(
      { referrals: [], error: "Database unavailable" },
      { status: 503 }
    );
  }
}
