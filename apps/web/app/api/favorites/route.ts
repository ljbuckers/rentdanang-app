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
  const favorites = await query(
    `SELECT f.id, f.listing_id, f.created_at,
            l.title_en, l.price_vnd, l.area_name, l.thumbnail_url
     FROM favorites f
     JOIN v_properties l ON l.id = f.listing_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );

  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { listing_id } = await request.json();

  if (!listing_id) {
    return NextResponse.json({ error: "listing_id is required" }, { status: 400 });
  }

  const favorite = await queryOne(
    `INSERT INTO favorites (user_id, listing_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, listing_id) DO NOTHING
     RETURNING id, listing_id, created_at`,
    [userId, listing_id]
  );

  return NextResponse.json({ favorite }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const listingId = request.nextUrl.searchParams.get("listing_id");

  if (!listingId) {
    return NextResponse.json({ error: "listing_id is required" }, { status: 400 });
  }

  await queryOne(
    "DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2 RETURNING id",
    [userId, listingId]
  );

  return NextResponse.json({ deleted: true });
}
