import { useAuth } from "@/_core/hooks/useAuth";
import { AuthPanel } from "@/components/AuthPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Check, Trash2, Plus, Calendar, History, ListTodo, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planType, setPlanType] = useState<"week" | "month">("week");
  const [showHistory, setShowHistory] = useState(false);

  // Get today's todos
  const { data: todos = [], isLoading: todosLoading, refetch } = trpc.todo.list.useQuery(
    { date: selectedDate },
    { enabled: isAuthenticated }
  );

  const {
    data: planItems = [],
    isLoading: planLoading,
    refetch: refetchPlan,
  } = trpc.plan.list.useQuery(
    { type: planType },
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

  const createPlanMutation = trpc.plan.create.useMutation({
    onSuccess: () => {
      setNewPlanTitle("");
      refetchPlan();
      toast.success("计划已添加");
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

  const togglePlanMutation = trpc.plan.toggle.useMutation({
    onSuccess: () => {
      refetchPlan();
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

  const deletePlanMutation = trpc.plan.delete.useMutation({
    onSuccess: () => {
      refetchPlan();
      toast.success("计划已删除");
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

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) {
      toast.error("请输入计划内容");
      return;
    }
    await createPlanMutation.mutateAsync({
      type: planType,
      title: newPlanTitle,
    });
  };

  const handleToggleTodo = (id: number) => {
    toggleMutation.mutate({ id });
  };

  const handleTogglePlan = (id: number) => {
    togglePlanMutation.mutate({ id });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleDeletePlan = (id: number) => {
    deletePlanMutation.mutate({ id });
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
        <AuthPanel subtitle="创建账号后即可开始管理待办" />
      </div>
    );
  }

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const pendingTodos = todos.filter((t) => !t.completed);
  const doneTodos = todos.filter((t) => t.completed);
  const planCompletedCount = planItems.filter((t) => t.completed).length;
  const planTotalCount = planItems.length;
  const planLabel = planType === "week" ? "本周计划" : "本月计划";
  const todoCompletionRate = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;
  const planCompletionRate = planTotalCount
    ? Math.round((planCompletedCount / planTotalCount) * 100)
    : 0;
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const focusHint = pendingTodos[0]?.title || "先添加一件最重要的事";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">今日待办</h1>
            <p className="text-sm text-muted-foreground">
              {user?.name
                ? `欢迎，${user.name}`
                : user?.username
                  ? `欢迎，${user.username}`
                  : "欢迎"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/history")}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              历史记录
            </Button>
            <Button variant="ghost" onClick={logout}>
              退出
            </Button>
          </div>
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

        {/* Dashboard */}
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {isToday ? "今日概览" : "所选日期概览"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {isToday ? "保持节奏，专注当下" : "复盘与规划更清晰"}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70 bg-gradient-to-br from-accent/10 via-card to-card">
              <CardHeader className="pb-2">
                <CardDescription>今日待办</CardDescription>
                <CardTitle className="text-3xl">
                  {completedCount}/{totalCount || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>完成率</span>
                  <span>{todoCompletionRate}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${todoCompletionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <CardDescription>待处理事项</CardDescription>
                <CardTitle className="text-3xl">{pendingTodos.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">优先处理：</div>
                <p className="mt-1 text-sm font-medium text-foreground truncate">
                  {focusHint}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <CardDescription>{planLabel}</CardDescription>
                <CardTitle className="text-3xl">
                  {planCompletedCount}/{planTotalCount || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>完成率</span>
                  <span>{planCompletionRate}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${planCompletionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/60">
              <CardHeader className="pb-2">
                <CardDescription>今日节奏</CardDescription>
                <CardTitle className="text-3xl">
                  {isToday ? "专注" : "复盘"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {isToday
                    ? "完成 1 件关键任务，就能显著提升进度感。"
                    : "回看这一天的完成情况，调整下一步计划。"}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Plan Section */}
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              variant={planType === "week" ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setPlanType("week");
                setNewPlanTitle("");
              }}
              className="h-7 px-3 text-xs"
            >
              本周计划
            </Button>
            <Button
              variant={planType === "month" ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setPlanType("month");
                setNewPlanTitle("");
              }}
              className="h-7 px-3 text-xs"
            >
              本月计划
            </Button>
          </div>

          {planTotalCount > 0 && (
            <div className="mb-4 bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  完成进度
                </span>
                <span className="text-sm text-muted-foreground">
                  {planCompletedCount}/{planTotalCount}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-300"
                  style={{
                    width: `${(planCompletedCount / planTotalCount) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          <form onSubmit={handleAddPlan} className="mb-6">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={`添加${planLabel}...`}
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                className="flex-1 bg-input border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent"
                disabled={createPlanMutation.isPending}
              />
              <Button
                type="submit"
                disabled={createPlanMutation.isPending || !newPlanTitle.trim()}
                className="bg-accent hover:opacity-90 text-accent-foreground font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                添加
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {planLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                <p className="mt-2 text-muted-foreground">加载中...</p>
              </div>
            ) : planItems.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-lg border border-border">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  还没有{planLabel}，先写几个重点吧
                </p>
              </div>
            ) : (
              planItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-accent/30 transition-all group ${
                    item.completed ? "opacity-60" : ""
                  }`}
                >
                  <button
                    onClick={() => handleTogglePlan(item.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? "bg-accent border-accent"
                        : "border-muted hover:border-accent"
                    }`}
                  >
                    {item.completed && (
                      <Check className="w-4 h-4 text-accent-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-foreground font-medium transition-all ${
                        item.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePlan(item.id)}
                    className="flex-shrink-0 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-destructive/10"
                    disabled={deletePlanMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">每日待办</h3>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              完成率 {todoCompletionRate}%
            </span>
          )}
        </div>

        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="mb-6">
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

        {/* Todo Tabs */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">
              <ListTodo className="w-4 h-4" />
              列表
            </TabsTrigger>
            <TabsTrigger value="board">
              <LayoutGrid className="w-4 h-4" />
              看板
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
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
          </TabsContent>
          <TabsContent value="board">
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
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/70">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">待办</CardTitle>
                      <Badge variant="outline">{pendingTodos.length}</Badge>
                    </div>
                    <CardDescription>优先完成最重要的几件事</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingTodos.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        已全部完成 🎉
                      </div>
                    ) : (
                      pendingTodos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
                        >
                          <button
                            onClick={() => handleToggleTodo(todo.id)}
                            className="mt-1 h-5 w-5 rounded-md border-2 border-muted hover:border-accent"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className="text-xs text-muted-foreground">
                                {todo.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card className="border-border/70">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">已完成</CardTitle>
                      <Badge variant="secondary">{doneTodos.length}</Badge>
                    </div>
                    <CardDescription>保持节奏，复盘今日收获</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {doneTodos.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        还没有完成的事项
                      </div>
                    ) : (
                      doneTodos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3 opacity-80"
                        >
                          <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-md bg-accent text-accent-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground line-through">
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className="text-xs text-muted-foreground">
                                {todo.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="ml-auto rounded-md p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
