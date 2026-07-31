/**
 * The signed-in user and the company identity.
 *
 * There is no auth provider in this build, so "who is logged in" is a constant
 * rather than a session. Everything else the shell renders — warehouses, the
 * attention queue, search — comes from `src/lib/api`.
 */

export const CURRENT_USER = {
  id: "USR-002",
  name: "Marisol Bituin",
  role: "Sales Admin",
  email: "marisol.bituin@pacificpantry.ph",
} as const;

export const COMPANY_NAME = "Pacific Pantry Distribution Inc.";
