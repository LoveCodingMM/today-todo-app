import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useEffect } from "react";
import { Check, Trash2, Plus, Calendar, History } from "lucide-react";
import { toast } from "sonner";
import { useRoute, useLocation } from "wouter";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false);

  // Get today's todos
  const { data: todos = [], isLoading: todosLoading, refetch } = trpc.todo.list.useQuery(
    { date: selectedDate },
    { enabled: isAuthenticated }
  );

  // Mutations
  const createMutation = trpc.todo.create.useMutation({
    onSuccess: () => {
      setNewTodoTitle("");
      refetch();
      toast.success("待办事项已添加");
    },
    onError: (error) => {
      toast.error(error.message || "添加失败");
    },
  });

  const toggleMutation = trpc.todo.toggle.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const deleteMutation = trpc.todo.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("待办事项已删除");
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) {
      toast.error("请输入待办事项内容");
      return;
    }
    await createMutation.mutateAsync({
      title: newTodoTitle,
      dueDate: selectedDate,
    });
  };

  const handleToggleTodo = (id: number) => {
    toggleMutation.mutate({ id });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "今天";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "昨天";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "明天";
    }
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-md w-full mx-4">
          <Card className="p-8 shadow-lg">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">今日待办</h1>
              <p className="text-muted-foreground">精美简约的个人任务管理</p>
            </div>
            <p className="text-center text-muted-foreground mb-6">
              登录后开始管理您的日常任务
            </p>
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="w-full bg-accent hover:opacity-90 text-accent-foreground font-semibold py-3 rounded-lg transition-all"
            >
              使用 Manus 登录
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">今日待办</h1>
            <p className="text-sm text-muted-foreground">
              {user?.name ? `欢迎，${user.name}` : "欢迎"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/history")}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            历史记录
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Date Navigation */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrevDay}
            className="px-3"
          >
            ←
          </Button>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {formatDate(selectedDate)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedDate.toLocaleDateString("zh-CN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleNextDay}
            className="px-3"
          >
            →
          </Button>
        </div>

        {selectedDate.toDateString() !== new Date().toDateString() && (
          <div className="mb-6 text-center">
            <Button
              variant="ghost"
              onClick={handleToday}
              className="text-accent hover:text-accent/80"
            >
              返回今天
            </Button>
          </div>
        )}

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-8 bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                完成进度
              </span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="添加新的待办事项..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              className="flex-1 bg-input border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent"
              disabled={createMutation.isPending}
            />
            <Button
              type="submit"
              disabled={createMutation.isPending || !newTodoTitle.trim()}
              className="bg-accent hover:opacity-90 text-accent-foreground font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              添加
            </Button>
          </div>
        </form>

        {/* Todos List */}
        <div className="space-y-3">
          {todosLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <p className="mt-2 text-muted-foreground">加载中...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">
                {selectedDate.toDateString() === new Date().toDateString()
                  ? "今天没有待办事项，放松一下吧！"
                  : "这一天没有待办事项"}
              </p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-accent/30 transition-all group ${
                  todo.completed ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => handleToggleTodo(todo.id)}
                  className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    todo.completed
                      ? "bg-accent border-accent"
                      : "border-muted hover:border-accent"
                  }`}
                >
                  {todo.completed && (
                    <Check className="w-4 h-4 text-accent-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-foreground font-medium transition-all ${
                      todo.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {todo.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="flex-shrink-0 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-destructive/10"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
