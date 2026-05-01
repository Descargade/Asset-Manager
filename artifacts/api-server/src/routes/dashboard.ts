import { Router } from "express";
import { db, tasksTable, activityLogsTable } from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

// GET /api/dashboard/summary
router.get("/summary", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalResult] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.userId, uid));

  const [completedTodayResult] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.userId, uid),
        eq(tasksTable.status, "completed"),
        gte(tasksTable.completedAt, today),
        lte(tasksTable.completedAt, tomorrow),
      ),
    );

  const [inProgressResult] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(and(eq(tasksTable.userId, uid), eq(tasksTable.status, "in_progress")));

  const [overdueResult] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.userId, uid),
        lte(tasksTable.dueDate, today),
        sql`${tasksTable.status} != 'completed'`,
      ),
    );

  const [completedAll] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(and(eq(tasksTable.userId, uid), eq(tasksTable.status, "completed")));

  const total = totalResult.count;
  const completionRate = total > 0 ? Math.round((completedAll.count / total) * 100) : 0;

  return res.json({
    totalTasks: total,
    completedToday: completedTodayResult.count,
    inProgress: inProgressResult.count,
    overdue: overdueResult.count,
    completionRate,
    streakDays: 0,
  });
});

// GET /api/dashboard/productivity
router.get("/productivity", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const [completedResult] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.userId, uid),
          eq(tasksTable.status, "completed"),
          gte(tasksTable.completedAt, date),
          lte(tasksTable.completedAt, nextDate),
        ),
      );

    const [createdResult] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.userId, uid),
          gte(tasksTable.createdAt, date),
          lte(tasksTable.createdAt, nextDate),
        ),
      );

    days.push({
      date: date.toISOString().split("T")[0],
      completed: completedResult.count,
      created: createdResult.count,
    });
  }

  return res.json(days);
});

// GET /api/dashboard/priority-breakdown
router.get("/priority-breakdown", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";

  const results = await db
    .select({ priority: tasksTable.priority, count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.userId, uid))
    .groupBy(tasksTable.priority);

  return res.json(results);
});

// GET /api/dashboard/status-breakdown
router.get("/status-breakdown", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";

  const results = await db
    .select({ status: tasksTable.status, count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.userId, uid))
    .groupBy(tasksTable.status);

  return res.json(results);
});

export default router;
