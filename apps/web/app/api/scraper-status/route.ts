import { NextResponse } from "next/server";
import Redis from "ioredis";

export async function GET() {
  let redis: Redis | null = null;
  try {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redis.connect();

    // Get health status
    const healthRaw = await redis.get("rentdanang:health");
    const health = healthRaw ? JSON.parse(healthRaw) : null;

    // Get recent job IDs
    const jobIds = await redis.lrange("rentdanang:jobs:recent", 0, 19);

    // Get job details
    const jobs = [];
    for (const id of jobIds) {
      const job = await redis.hgetall(`rentdanang:jobs:${id}`);
      if (job && job.id) {
        jobs.push({
          id: job.id,
          source_platform: job.source_platform,
          status: job.status,
          listings_found: parseInt(job.listings_found || "0"),
          listings_new: parseInt(job.listings_new || "0"),
          started_at: job.started_at || null,
          completed_at: job.completed_at || null,
          error_message: job.error_message || null,
        });
      }
    }

    // Queue sizes
    const queueSize = await redis.llen("rentdanang:listings:raw");
    const failedSize = await redis.llen("rentdanang:listings:failed");

    return NextResponse.json({
      health,
      recent_jobs: jobs,
      queue: {
        pending: queueSize,
        failed: failedSize,
      },
    });
  } catch (e: any) {
    console.error("Scraper status error:", e.message);
    return NextResponse.json(
      { health: null, recent_jobs: [], queue: { pending: 0, failed: 0 }, error: "Redis unavailable" },
      { status: 503 }
    );
  } finally {
    if (redis) {
      redis.disconnect();
    }
  }
}
