import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "../../../test/utils";
import { MobileNavigation } from "../MobileNavigation";
import { useTabsStore } from "../../../stores";
import { createTabPane } from "../../../stores/tabsStore";

describe("MobileNavigation", () => {
  beforeEach(() => {
    useTabsStore.setState({
      tabs: [],
      rootPane: createTabPane([], null),
      closedTabs: [],
    });
  });

  it("opens the queue tab when Queue is tapped", () => {
    render(<MobileNavigation />);

    fireEvent.click(screen.getByRole("button", { name: "Queue" }));

    const { tabs, rootPane } = useTabsStore.getState();
    const activeTabId = rootPane.type === "tabs" ? rootPane.activeTabId : null;
    const queueTab = tabs.find((tab) => tab.type === "queue");

    expect(queueTab).toBeTruthy();
    expect(activeTabId).toBe(queueTab?.id);
  });
});
