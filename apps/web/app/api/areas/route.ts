import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const areas = await query(`
      SELECT
        a.id, a.name, a.name_vn, a.district,
        a.description, a.description_en,
        a.center_lat, a.center_lon,
        a.avg_price_1br, a.avg_price_2br,
        a.lifestyle_tags,
        (
          SELECT COUNT(*)
          FROM v_properties l
          WHERE l.area_name = a.name AND l.is_active = true AND l.is_duplicate = false
        ) AS listing_count
      FROM areas a
      ORDER BY a.id
    `);

    return NextResponse.json({ areas });
  } catch (e: any) {
    console.error("Areas API error:", e.message);
    return NextResponse.json({ areas: [], error: "Database unavailable" }, { status: 503 });
  }
}
