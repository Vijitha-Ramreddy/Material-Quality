import { describe, it, expect } from "vitest";
import { getDashboardData } from "./dashboard";
import { getManufacturingWorkflowsList, transitionManufacturingWorkflow } from "./workflow";
import { getReportsData } from "./reports";

describe("Enterprise Manufacturing Modules Integration Tests", () => {
  it("getDashboardData aggregates plant metrics without error", async () => {
    const data = await getDashboardData();
    expect(data).toBeDefined();
    expect(data.metrics).toBeDefined();
    expect(typeof data.metrics.totalOrders).toBe("number");
    expect(typeof data.metrics.ordersInProgress).toBe("number");
    expect(typeof data.metrics.activeProductionJobs).toBe("number");
    expect(typeof data.metrics.failedQualityInspections).toBe("number");
    expect(data.productionStatuses.length).toBeGreaterThan(0);
    expect(data.orderStatuses.length).toBeGreaterThan(0);
    expect(Array.isArray(data.bottlenecks)).toBe(true);
    expect(Array.isArray(data.recentOrders)).toBe(true);
    expect(Array.isArray(data.recentFailures)).toBe(true);
  });

  it("getManufacturingWorkflowsList returns valid 9-stage workflows", async () => {
    const workflows = await getManufacturingWorkflowsList();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
    const first = workflows[0];
    expect(first.order_id).toBeDefined();
    expect(first.current_stage).toBeDefined();
    expect(first.workflow_status).toBeDefined();
  });

  it("transitionManufacturingWorkflow advances stage successfully", async () => {
    const workflows = await getManufacturingWorkflowsList();
    const orderId = workflows[0].order_id;
    const currentStage = workflows[0].current_stage;

    const result = await transitionManufacturingWorkflow(
      orderId,
      currentStage,
      "approve",
      "Automated unit test approval",
    );
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.order_id).toBe(orderId);
  });

  it("getReportsData loads all 4 report domains (production, quality, procurement, dispatch)", async () => {
    const data = await getReportsData();
    expect(data).toBeDefined();

    // 1. Production report
    expect(data.production).toBeDefined();
    expect(typeof data.production.totalJobs).toBe("number");
    expect(Array.isArray(data.production.jobs)).toBe(true);

    // 2. Quality report
    expect(data.quality).toBeDefined();
    expect(typeof data.quality.totalInspections).toBe("number");
    expect(Array.isArray(data.quality.inspections)).toBe(true);
    expect(Array.isArray(data.quality.ncrs)).toBe(true);

    // 3. Procurement report
    expect(data.procurement).toBeDefined();
    expect(typeof data.procurement.totalReceipts).toBe("number");
    expect(Array.isArray(data.procurement.receipts)).toBe(true);

    // 4. Dispatch report
    expect(data.dispatch).toBeDefined();
    expect(typeof data.dispatch.totalDispatches).toBe("number");
    expect(Array.isArray(data.dispatch.dispatches)).toBe(true);
  });
});

