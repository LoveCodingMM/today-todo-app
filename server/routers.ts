import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createTodo, getTodosByUserId, getTodoById, updateTodo, deleteTodo, getTodosDateRange } from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
