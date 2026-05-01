import { Router } from "express";
import { db, conversations, messages, tasksTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router = Router();

// GET /api/openai/conversations
router.get("/conversations", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, uid))
    .orderBy(desc(conversations.createdAt));
  return res.json(convs.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

// POST /api/openai/conversations
router.post("/conversations", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  const [conv] = await db
    .insert(conversations)
    .values({ userId: uid, title: parsed.data.title })
    .returning();
  return res.status(201).json({ ...conv, createdAt: conv.createdAt.toISOString() });
});

// GET /api/openai/conversations/:id
router.get("/conversations/:id", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";
  const id = parseInt(req.params.id);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, uid)));
  if (!conv) return res.status(404).json({ error: "Not found" });
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  return res.json({
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    messages: msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
});

// DELETE /api/openai/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";
  const id = parseInt(req.params.id);
  const [deleted] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, uid)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  return res.status(204).send();
});

// GET /api/openai/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";
  const id = parseInt(req.params.id);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, uid)));
  if (!conv) return res.status(404).json({ error: "Not found" });
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  return res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// POST /api/openai/conversations/:id/messages (SSE streaming)
router.post("/conversations/:id/messages", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";
  const id = parseInt(req.params.id);
  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, uid)));
  if (!conv) return res.status(404).json({ error: "Not found" });

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: parsed.data.content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content:
          "You are a productivity assistant helping users manage their tasks and improve their workflow. Be concise, actionable, and encouraging.",
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// POST /api/openai/optimize-day (SSE streaming)
router.post("/optimize-day", async (req, res) => {
  const { userId } = getAuth(req);
  const uid = userId ?? "anonymous";

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, uid))
    .orderBy(desc(tasksTable.createdAt))
    .limit(30);

  const taskSummary = tasks
    .map(
      (t) =>
        `- [${t.priority.toUpperCase()}] ${t.title} (${t.status})${t.dueDate ? ` - Due: ${t.dueDate.toLocaleDateString()}` : ""}${t.estimatedMinutes ? ` - Est: ${t.estimatedMinutes}min` : ""}`,
    )
    .join("\n");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2048,
    messages: [
      {
        role: "system",
        content:
          "You are an expert productivity coach. Analyze the user's tasks and provide specific, actionable recommendations. Format your response with clear sections: 1) Recommended Order (numbered list), 2) Productivity Tips (2-3 bullets), 3) Overload Warning (if applicable). Be specific and direct.",
      },
      {
        role: "user",
        content:
          tasks.length === 0
            ? "I have no tasks yet. Give me general productivity advice to get started."
            : `Here are my current tasks:\n\n${taskSummary}\n\nPlease optimize my day and provide recommendations.`,
      },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
