import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AuthPanelProps = {
  title?: string;
  subtitle?: string;
};

export function AuthPanel({ title, subtitle }: AuthPanelProps) {
  const utils = trpc.useUtils();
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (user) => {
      utils.auth.me.setData(undefined, user);
      void utils.todo.list.invalidate();
      void utils.todo.history.invalidate();
      setLoginPassword("");
      toast.success("登录成功");
    },
    onError: (error) => {
      toast.error(error.message || "登录失败");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (user) => {
      utils.auth.me.setData(undefined, user);
      void utils.todo.list.invalidate();
      void utils.todo.history.invalidate();
      setRegisterPassword("");
      setRegisterName("");
      toast.success("注册成功");
    },
    onError: (error) => {
      toast.error(error.message || "注册失败");
    },
  });

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    const username = loginUsername.trim();
    if (!username || !loginPassword) {
      toast.error("请输入账号和密码");
      return;
    }
    await loginMutation.mutateAsync({
      username,
      password: loginPassword,
    });
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    const username = registerUsername.trim();
    if (!username || !registerPassword) {
      toast.error("请输入账号和密码");
      return;
    }
    await registerMutation.mutateAsync({
      username,
      password: registerPassword,
      name: registerName.trim() || undefined,
    });
  };

  return (
    <div className="max-w-md w-full mx-4">
      <Card className="p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {title ?? "今日待办"}
          </h1>
          <p className="text-muted-foreground">
            {subtitle ?? "创建账号开始管理你的待办"}
          </p>
        </div>
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="text"
                placeholder="账号"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
              />
              <Input
                type="password"
                placeholder="密码"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-accent hover:opacity-90 text-accent-foreground font-semibold py-3 rounded-lg transition-all"
              >
                {loginMutation.isPending ? "登录中..." : "登录"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                type="text"
                placeholder="账号"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                autoComplete="username"
              />
              <Input
                type="text"
                placeholder="昵称（可选）"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                autoComplete="name"
              />
              <Input
                type="password"
                placeholder="密码"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-accent hover:opacity-90 text-accent-foreground font-semibold py-3 rounded-lg transition-all"
              >
                {registerMutation.isPending ? "注册中..." : "创建账号"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
