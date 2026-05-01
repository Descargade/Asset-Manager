import { Router } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

// GET /api/activity
router.get("/", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";
  const limit = parseInt(req.query.limit as string) || 20;

  const entries = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.userId, uid))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(Math.min(limit, 100));

  return res.json(
    entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

export default router;
