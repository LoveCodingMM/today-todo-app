import { useAuth } from "@/_core/hooks/useAuth";
import { AuthPanel } from "@/components/AuthPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ArrowLeft, Check, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function History() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [daysBack, setDaysBack] = useState(7);

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data: historyTodos = [], isLoading } = trpc.todo.history.useQuery(
    {
      startDate,
      endDate,
    },
    { enabled: isAuthenticated }
  );

  // Group todos by date
  const groupedByDate = historyTodos.reduce(
    (acc, todo) => {
      const dateKey = new Date(todo.dueDate || todo.createdAt)
        .toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(todo);
      return acc;
    },
    {} as Record<string, typeof historyTodos>
  );

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "今天";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "昨天";
    }

    return date.toLocaleDateString("zh-CN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const stats = {
    total: historyTodos.length,
    completed: historyTodos.filter((t) => t.completed).length,
    pending: historyTodos.filter((t) => !t.completed).length,
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
        <AuthPanel title="历史记录" subtitle="登录后查看你的待办历史" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">历史记录</h1>
            <p className="text-sm text-muted-foreground">
              查看过去的待办事项
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">总计</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">已完成</p>
            <p className="text-3xl font-bold text-accent">{stats.completed}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-sm text-muted-foreground mb-1">待完成</p>
            <p className="text-3xl font-bold text-destructive">
              {stats.pending}
            </p>
          </Card>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {[7, 14, 30].map((days) => (
            <Button
              key={days}
              variant={daysBack === days ? "default" : "outline"}
              onClick={() => setDaysBack(days)}
              className={
                daysBack === days
                  ? "bg-accent text-accent-foreground"
                  : "border-border"
              }
            >
              过去 {days} 天
            </Button>
          ))}
        </div>

        {/* History List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              <p className="mt-2 text-muted-foreground">加载中...</p>
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">
                没有找到待办事项
              </p>
            </div>
          ) : (
            sortedDates.map((dateString) => {
              const todos = groupedByDate[dateString];
              const completedCount = todos.filter((t) => t.completed).length;
              const totalCount = todos.length;

              return (
                <div key={dateString}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      {formatDateHeader(dateString)}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {completedCount}/{totalCount} 完成
                    </span>
                  </div>

                  <div className="space-y-2">
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`flex items-start gap-3 p-3 bg-card rounded-lg border border-border ${
                          todo.completed ? "opacity-60" : ""
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
                            todo.completed
                              ? "bg-accent border-accent"
                              : "border-muted"
                          }`}
                        >
                          {todo.completed && (
                            <Check className="w-3 h-3 text-accent-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-foreground font-medium transition-all ${
                              todo.completed
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {todo.title}
                          </p>
                          {todo.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {todo.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(
                              todo.dueDate || todo.createdAt
                            ).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
