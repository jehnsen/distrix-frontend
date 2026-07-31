/**
 * The data layer. Feature components import from here and nowhere else — no
 * component reaches into `src/lib/mock/*` directly. Replacing the mock with a
 * real backend means rewriting these files and changing nothing above them.
 *
 * Every read returns a typed promise with 200–500ms of simulated latency.
 * `configureApi({ failureRate: 0.1 })` turns on the seeded failure mode so the
 * error states can be exercised without editing code.
 */

export {
  ApiError,
  NotFoundError,
  ValidationError,
  configureApi,
  getApiConfig,
  DEFAULT_PAGE_SIZE,
} from "@/lib/api/client";

export * from "@/lib/api/customers";
export * from "@/lib/api/products";
export * from "@/lib/api/orders";
export * from "@/lib/api/receivables";
export * from "@/lib/api/purchasing";
export * from "@/lib/api/dashboard";
