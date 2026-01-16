import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createSessionToken, hashPassword, sanitizeUser, verifyPassword } from "./_core/auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createTodo,
  createPlanItem,
  createUser,
  deleteTodo,
  deletePlanItem,
  getPlanItemById,
  getPlanItemsByPeriod,
  getTodoById,
  getTodosByUserId,
  getTodosDateRange,
  getUserByUsername,
  updateTodo,
  updatePlanItem,
  updateUserLastSignedIn,
} from "./db";

const planTypeSchema = z.enum(["week", "month"]);
type PlanType = z.infer<typeof planTypeSchema>;

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getPlanPeriodStart(type: PlanType, anchor = new Date()): Date {
  return type === "week" ? getWeekStart(anchor) : getMonthStart(anchor);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          username: z.string().trim().min(3, "Username is required").max(32),
          password: z.string().min(6, "Password must be at least 6 characters").max(128),
          name: z.string().trim().max(64).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already exists",
          });
        }

        const role =
          ENV.ownerUsername && input.username === ENV.ownerUsername
            ? "admin"
            : "user";
        const passwordHash = hashPassword(input.password);

        await createUser({
          username: input.username,
          passwordHash,
          name: input.name ?? null,
          role,
        });

        const user = await getUserByUsername(input.username);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        const sessionToken = await createSessionToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return sanitizeUser(user);
      }),
    login: publicProcedure
      .input(
        z.object({
          username: z.string().trim().min(3).max(32),
          password: z.string().min(6).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByUsername(input.username);
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        await updateUserLastSignedIn(user.id);
        const sessionToken = await createSessionToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return sanitizeUser(user);
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  plan: router({
    list: protectedProcedure
      .input(
        z.object({
          type: planTypeSchema,
        })
      )
      .query(async ({ ctx, input }) => {
        const periodStart = getPlanPeriodStart(input.type);
        return await getPlanItemsByPeriod(ctx.user.id, input.type, periodStart);
      }),
    create: protectedProcedure
      .input(
        z.object({
          type: planTypeSchema,
          title: z.string().min(1, "Title is required").max(500),
          description: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const periodStart = getPlanPeriodStart(input.type);
        return await createPlanItem(ctx.user.id, {
          periodType: input.type,
          periodStart,
          title: input.title,
          description: input.description,
        });
      }),
    toggle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const planItem = await getPlanItemById(ctx.user.id, input.id);
        if (!planItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan item not found",
          });
        }

        await updatePlanItem(ctx.user.id, input.id, {
          completed: !planItem.completed,
        });

        return await getPlanItemById(ctx.user.id, input.id);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const planItem = await getPlanItemById(ctx.user.id, input.id);
        if (!planItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan item not found",
          });
        }
        await deletePlanItem(ctx.user.id, input.id);
        return { success: true };
      }),
  }),

  todo: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1, "Title is required").max(500),
          description: z.string().max(2000).optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const todoData: any = {
          title: input.title,
          dueDate: input.dueDate || new Date(),
          completed: false,
        };
        if (input.description) {
          todoData.description = input.description;
        }
        const result = await createTodo(ctx.user.id, todoData);
        return result;
      }),

    list: protectedProcedure
      .input(
        z.object({
          date: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await getTodosByUserId(ctx.user.id, input.date);
      }),

    history: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await getTodosDateRange(ctx.user.id, input.startDate, input.endDate);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const todo = await getTodoById(input.id, ctx.user.id);
        if (!todo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Todo not found",
          });
        }
        return todo;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(500).optional(),
          description: z.string().max(2000).optional(),
          completed: z.boolean().optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const todo = await getTodoById(id, ctx.user.id);
        if (!todo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Todo not found",
          });
        }
        await updateTodo(id, ctx.user.id, updates as any);
        return await getTodoById(id, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const todo = await getTodoById(input.id, ctx.user.id);
        if (!todo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Todo not found",
          });
        }
        await deleteTodo(input.id, ctx.user.id);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const todo = await getTodoById(input.id, ctx.user.id);
        if (!todo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Todo not found",
          });
        }
        await updateTodo(input.id, ctx.user.id, { completed: !todo.completed });
        return await getTodoById(input.id, ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
