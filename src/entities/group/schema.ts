import { z } from "zod";

export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "დასახელება აუცილებელია"),
  carNumber: z.string().trim(),
  worker1Name: z.string().trim(),
  worker2Name: z.string().trim()
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;
