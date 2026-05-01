import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  X,
  AlertCircle,
  Tag,
} from "lucide-react";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  getListTasksQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetProductivityStatsQueryKey,
  getListActivityQueryKey,
} from "@workspace/api-client-react";
import type { Task, ListTasksStatus, ListTasksPriority } from "@workspace/api-client-react";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  estimatedMinutes: z.coerce.number().optional(),
  tags: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

const STATUS_TABS = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

function TaskRow({
  task,
  onComplete,
  onDelete,
}: {
  task: Task;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const isCompleted = task.status === "completed";

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 group transition-colors hover:bg-secondary/30 ${
        isCompleted ? "opacity-60" : ""
      }`}
      data-testid="task-row"
    >
      <button
        onClick={() => !isCompleted && onComplete(task.id)}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        data-testid="task-complete-btn"
        aria-label="Complete task"
      >
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : task.status === "in_progress" ? (
          <Clock className="w-4 h-4 text-orange-400" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${
              PRIORITY_BADGE[task.priority]
            }`}
          >
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {task.dueDate && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {format(parseISO(task.dueDate), "MMM d")}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.estimatedMinutes}m
            </span>
          )}
          {task.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-muted-foreground" />
              {task.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        data-testid="task-delete-btn"
        aria-label="Delete task"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function CreateTaskModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { mutate: createTask, isPending } = useCreateTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getListActivityQueryKey() });
        toast.success("Task created");
        onClose();
        reset();
      },
      onError: () => toast.error("Failed to create task"),
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: "medium" },
  });

  if (!open) return null;

  const onSubmit = (data: CreateForm) => {
    createTask({
      data: {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
        estimatedMinutes: data.estimatedMinutes || undefined,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base">New Task</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Title *
            </label>
            <input
              {...register("title")}
              placeholder="What needs to be done?"
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              data-testid="task-title-input"
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <textarea
              {...register("description")}
              placeholder="Optional details..."
              rows={2}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Priority
              </label>
              <div className="relative">
                <select
                  {...register("priority")}
                  className="w-full appearance-none bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-8"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Due Date
              </label>
              <input
                type="date"
                {...register("dueDate")}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Est. Minutes
              </label>
              <input
                type="number"
                {...register("estimatedMinutes")}
                placeholder="30"
                min={1}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Tags (comma separated)
              </label>
              <input
                {...register("tags")}
                placeholder="work, project"
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border rounded-md py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="task-submit-btn"
            >
              {isPending ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<ListTasksStatus | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<ListTasksPriority | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useListTasks({
    status: statusFilter,
    priority: priorityFilter,
    search: search || undefined,
  });

  const { mutate: completeTask } = useCompleteTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getListActivityQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProductivityStatsQueryKey() });
        toast.success("Task completed");
      },
      onError: () => toast.error("Failed to complete task"),
    },
  });

  const { mutate: deleteTask } = useDeleteTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getListActivityQueryKey() });
        toast.success("Task deleted");
      },
      onError: () => toast.error("Failed to delete task"),
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          data-testid="new-task-btn"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-background border border-input rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            data-testid="task-search"
          />
        </div>

        <div className="relative">
          <select
            value={priorityFilter ?? ""}
            onChange={(e) =>
              setPriorityFilter((e.target.value as ListTasksPriority) || undefined)
            }
            className="appearance-none bg-background border border-input rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
            data-testid="priority-filter"
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(value as ListTasksStatus | undefined)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              statusFilter === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`status-tab-${label.toLowerCase().replace(" ", "-")}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading tasks...</span>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium">No tasks found</p>
              <p className="text-xs mt-1 opacity-70">
                {search || statusFilter || priorityFilter
                  ? "Try adjusting your filters"
                  : "Create your first task to get started"}
              </p>
            </div>
            {!search && !statusFilter && !priorityFilter && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Plus className="w-4 h-4" />
                Create task
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={(id) => completeTask({ id })}
              onDelete={(id) => deleteTask({ id })}
            />
          ))
        )}
      </div>

      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
