import express, { Router } from "express";
import { db, tasksTable, activityLogsTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  ListTasksQueryParams,
} from "@workspace/api-zod";
import { eq, and, ilike, arrayContains, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

function getUserId(req: express.Request): string {
  const { userId } = getAuth(req);
  return userId ?? "anonymous";
}

async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId?: number,
  metadata?: Record<string, unknown>,
) {
  await db.insert(activityLogsTable).values({
    userId,
    action,
    entityType,
    entityId,
    metadata,
  });
}

// GET /api/tasks
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }
  const { status, priority, search, tag } = parsed.data;

  const conditions = [eq(tasksTable.userId, userId)];
  if (status) conditions.push(eq(tasksTable.status, status));
  if (priority) conditions.push(eq(tasksTable.priority, priority));
  if (search) conditions.push(ilike(tasksTable.title, `%${search}%`));
  if (tag) conditions.push(arrayContains(tasksTable.tags, [tag]));

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(...conditions))
    .orderBy(desc(tasksTable.createdAt));

  return res.json(tasks.map(serializeTask));
});

// POST /api/tasks
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const body = parsed.data;
  const [task] = await db
    .insert(tasksTable)
    .values({
      userId,
      title: body.title,
      description: body.description,
      status: (body.status as "pending" | "in_progress" | "completed") ?? "pending",
      priority: (body.priority as "low" | "medium" | "high" | "urgent") ?? "medium",
      dueDate: body.dueDate ?? undefined,
      estimatedMinutes: body.estimatedMinutes,
      tags: body.tags ?? [],
    })
    .returning();
  await logActivity(userId, "created_task", "task", task.id, { title: task.title });
  return res.status(201).json(serializeTask(task));
});

// GET /api/tasks/:id
router.get("/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id);
  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  if (!task) return res.status(404).json({ error: "Task not found" });
  return res.json(serializeTask(task));
});

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const body = parsed.data;
  const [task] = await db
    .update(tasksTable)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && {
        status: body.status as "pending" | "in_progress" | "completed",
      }),
      ...(body.priority !== undefined && {
        priority: body.priority as "low" | "medium" | "high" | "urgent",
      }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ?? undefined }),
      ...(body.estimatedMinutes !== undefined && {
        estimatedMinutes: body.estimatedMinutes,
      }),
      ...(body.actualMinutes !== undefined && { actualMinutes: body.actualMinutes }),
      ...(body.tags !== undefined && { tags: body.tags }),
      updatedAt: new Date(),
    })
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .returning();
  if (!task) return res.status(404).json({ error: "Task not found" });
  await logActivity(userId, "updated_task", "task", task.id, { title: task.title });
  return res.json(serializeTask(task));
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id);
  const [deleted] = await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Task not found" });
  await logActivity(userId, "deleted_task", "task", id, { title: deleted.title });
  return res.status(204).send();
});

// POST /api/tasks/:id/complete
router.post("/:id/complete", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id);
  const [task] = await db
    .update(tasksTable)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
    .returning();
  if (!task) return res.status(404).json({ error: "Task not found" });
  await logActivity(userId, "completed_task", "task", task.id, { title: task.title });
  return res.json(serializeTask(task));
});

function serializeTask(task: typeof tasksTable.$inferSelect) {
  return {
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export default router;
