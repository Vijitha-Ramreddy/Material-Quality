import { describe, expect, it } from "vitest";
import { canAccessRoute, USER_ROLES } from "./permissions";

describe("role route permissions", () => {
  it("allows every role to access the dashboard", () => {
    for (const role of USER_ROLES) expect(canAccessRoute(role, "/dashboard")).toBe(true);
  });

  it("restricts engineering drawings to engineering and authorized roles", () => {
    expect(canAccessRoute("engineering", "/engineering/drawings")).toBe(true);
    expect(canAccessRoute("logistics", "/engineering/drawings")).toBe(false);
  });

  it("restricts dispatch to admin and logistics", () => {
    expect(canAccessRoute("admin", "/dispatch")).toBe(true);
    expect(canAccessRoute("logistics", "/dispatch")).toBe(true);
    expect(canAccessRoute("quality_assurance", "/dispatch")).toBe(false);
  });

  it("restricts user administration to admins", () => {
    expect(canAccessRoute("admin", "/users")).toBe(true);
    expect(canAccessRoute("sales_projects", "/users")).toBe(false);
  });

  it("denies unknown routes unless the user is an admin", () => {
    expect(canAccessRoute("sales_projects", "/unknown")).toBe(false);
    expect(canAccessRoute("admin", "/unknown")).toBe(true);
  });
});
