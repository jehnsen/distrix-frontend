/**
 * One Zod schema per document type, shared by the React Hook Form resolver and
 * the mock layer's write validation. A rule stated here holds in both places.
 */

export * from "@/lib/schemas/common";
export * from "@/lib/schemas/masters";
export * from "@/lib/schemas/sales";
export * from "@/lib/schemas/purchasing";
