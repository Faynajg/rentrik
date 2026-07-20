import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { requireSubscription } from "../middleware/subscription";
import { ownedProperty } from "./properties.routes";
import { monthOrCurrent } from "../lib/dates";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

const CATEGORIES = ["fijo", "variable", "plataforma", "gestion"] as const;

const expenseSchema = z.object({
  category: z.enum(CATEGORIES),
  concept: z.string().min(1, "El concepto es obligatorio"),
  amount: z.number().nonnegative("El importe no puede ser negativo"),
  isPercent: z.boolean().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mes inválido (YYYY-MM)"),
});

// GET /api/properties/:id/expenses?month=YYYY-MM
router.get(
  "/:id/expenses",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const month = monthOrCurrent(req.query.month as string | undefined);
    const expenses = await prisma.expense.findMany({
      where: { propertyId: property.id, month },
      orderBy: { createdAt: "asc" },
    });
    res.json({ month, expenses });
  })
);

// POST /api/properties/:id/expenses
router.post(
  "/:id/expenses",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const data = expenseSchema.parse({ ...req.body, amount: Number(req.body.amount) });

    const expense = await prisma.expense.create({
      data: {
        propertyId: property.id,
        category: data.category,
        concept: data.concept,
        amount: data.amount,
        isPercent: data.isPercent ?? false,
        month: data.month,
      },
    });
    res.status(201).json({ expense });
  })
);

// PUT /api/properties/:id/expenses/bulk
// Reemplaza todos los gastos de un mes por el conjunto enviado (guardado del formulario).
router.put(
  "/:id/expenses/bulk",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const schema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      expenses: z.array(expenseSchema.omit({ month: true })),
    });
    const data = schema.parse(req.body);

    await prisma.$transaction([
      prisma.expense.deleteMany({ where: { propertyId: property.id, month: data.month } }),
      prisma.expense.createMany({
        data: data.expenses
          .filter((e) => e.amount > 0)
          .map((e) => ({
            propertyId: property.id,
            category: e.category,
            concept: e.concept,
            amount: e.amount,
            isPercent: e.isPercent ?? false,
            month: data.month,
          })),
      }),
    ]);

    const expenses = await prisma.expense.findMany({
      where: { propertyId: property.id, month: data.month },
    });
    res.json({ month: data.month, expenses });
  })
);

// DELETE /api/properties/:id/expenses/:expenseId
router.delete(
  "/:id/expenses/:expenseId",
  asyncHandler(async (req, res) => {
    const property = await ownedProperty(req.userId!, req.params.id);
    const e = await prisma.expense.findUnique({ where: { id: req.params.expenseId } });
    if (!e || e.propertyId !== property.id) throw new ApiError(404, "Gasto no encontrado");
    await prisma.expense.delete({ where: { id: e.id } });
    res.json({ ok: true });
  })
);

export default router;
