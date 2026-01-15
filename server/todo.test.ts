import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    username: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("todo router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("create", () => {
    it("should create a new todo", async () => {
      const result = await caller.todo.create({
        title: "Test Todo",
        description: "This is a test todo",
        dueDate: new Date(),
      });

      expect(result).toBeDefined();
    });

    it("should reject empty title", async () => {
      try {
        await caller.todo.create({
          title: "",
          dueDate: new Date(),
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should reject title longer than 500 characters", async () => {
      try {
        await caller.todo.create({
          title: "a".repeat(501),
          dueDate: new Date(),
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("list", () => {
    it("should return empty list for new user", async () => {
      const todos = await caller.todo.list({ date: new Date() });
      expect(Array.isArray(todos)).toBe(true);
    });

    it("should list todos for a specific date", async () => {
      const today = new Date();
      await caller.todo.create({
        title: "Todo 1",
        dueDate: today,
      });

      const todos = await caller.todo.list({ date: today });
      expect(todos.length).toBeGreaterThan(0);
      expect(todos.some((t) => t.title === "Todo 1")).toBe(true);
    });
  });

  describe("toggle", () => {
    it("should toggle todo completion status", async () => {
      const created = await caller.todo.create({
        title: "Toggle Test",
        dueDate: new Date(),
      });

      // Get the created todo ID from the result
      const todos = await caller.todo.list({ date: new Date() });
      const todoId = todos.find((t) => t.title === "Toggle Test")?.id;

      if (!todoId) {
        expect.fail("Todo not found");
        return;
      }

      const toggled = await caller.todo.toggle({ id: todoId });
      expect(toggled?.completed).toBe(true);

      const toggledAgain = await caller.todo.toggle({ id: todoId });
      expect(toggledAgain?.completed).toBe(false);
    });

    it("should reject toggling non-existent todo", async () => {
      try {
        await caller.todo.toggle({ id: 99999 });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("delete", () => {
    it("should delete a todo", async () => {
      const today = new Date();
      await caller.todo.create({
        title: "Delete Test",
        dueDate: today,
      });

      const todos = await caller.todo.list({ date: today });
      const todoId = todos.find((t) => t.title === "Delete Test")?.id;

      if (!todoId) {
        expect.fail("Todo not found");
        return;
      }

      const result = await caller.todo.delete({ id: todoId });
      expect(result.success).toBe(true);

      const todosAfter = await caller.todo.list({ date: today });
      expect(todosAfter.find((t) => t.id === todoId)).toBeUndefined();
    });

    it("should reject deleting non-existent todo", async () => {
      try {
        await caller.todo.delete({ id: 99999 });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("update", () => {
    it("should update todo title", async () => {
      const today = new Date();
      await caller.todo.create({
        title: "Original Title",
        dueDate: today,
      });

      const todos = await caller.todo.list({ date: today });
      const todoId = todos.find((t) => t.title === "Original Title")?.id;

      if (!todoId) {
        expect.fail("Todo not found");
        return;
      }

      const updated = await caller.todo.update({
        id: todoId,
        title: "Updated Title",
      });

      expect(updated?.title).toBe("Updated Title");
    });

    it("should reject updating non-existent todo", async () => {
      try {
        await caller.todo.update({
          id: 99999,
          title: "New Title",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("history", () => {
    it("should return todos for date range", async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await caller.todo.create({
        title: "Today Todo",
        dueDate: today,
      });

      await caller.todo.create({
        title: "Tomorrow Todo",
        dueDate: tomorrow,
      });

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(tomorrow);
      endDate.setDate(endDate.getDate() + 1);

      const history = await caller.todo.history({
        startDate,
        endDate,
      });

      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("isolation", () => {
    it("should not allow user to access other user's todos", async () => {
      const user1Ctx = createAuthContext(1);
      const user2Ctx = createAuthContext(2);

      const user1Caller = appRouter.createCaller(user1Ctx);
      const user2Caller = appRouter.createCaller(user2Ctx);

      const today = new Date();

      // User 1 creates a todo
      await user1Caller.todo.create({
        title: "User 1 Todo",
        dueDate: today,
      });

      // User 2 lists todos
      const user2Todos = await user2Caller.todo.list({ date: today });

      // User 2 should not see User 1's todo
      expect(user2Todos.find((t) => t.title === "User 1 Todo")).toBeUndefined();
    });
  });
});
