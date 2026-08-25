import test from "node:test";
import assert from "node:assert/strict";
import {
  registerCsManagerNotificationHook,
  dispatchCsManagerNotification,
  registerDashboardExtensionHook,
  applyDashboardExtensions,
} from "../src/services/managerExtensions.service.js";

test("dispatchCsManagerNotification executes registered hooks", async () => {
  const events: string[] = [];
  const unregister = registerCsManagerNotificationHook(async (payload) => {
    events.push(`${payload.event}:${payload.companyId}`);
  });

  try {
    await dispatchCsManagerNotification({
      event: "incident:escalated",
      companyId: "company-1",
      incidentId: "incident-1",
      managerIds: ["manager-1"],
    });

    assert.deepEqual(events, ["incident:escalated:company-1"]);
  } finally {
    unregister();
  }
});

test("applyDashboardExtensions merges hook output into dashboard payload", async () => {
  const unregister = registerDashboardExtensionHook(({ companyId }) => ({
    csManagerWidget: {
      companyId,
      pendingCount: 4,
    },
  }));

  try {
    const result = await applyDashboardExtensions({
      companyId: "company-2",
      metrics: { managerDashboard: { openIncidents: 2 } },
    });

    assert.deepEqual(result, {
      csManagerWidget: {
        companyId: "company-2",
        pendingCount: 4,
      },
    });
  } finally {
    unregister();
  }
});
