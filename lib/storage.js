
// Flow storage and state management
class StorageManager {
  static async getFlows() {
    const { flows = [] } = await chrome.storage.local.get('flows');
    return flows;
  }

  static async saveFlows(flows) {
    await chrome.storage.local.set({ flows });
  }

  static async saveFlowState(flowId, state) {
    const key = `flowState_${flowId}`;
    await chrome.storage.local.set({ [key]: state });
  }

  static async getFlowState(flowId) {
    const key = `flowState_${flowId}`;
    const { [key]: state } = await chrome.storage.local.get(key);
    return state || {};
  }

  static async saveReport(flowId, report) {
    const key = `flowReport_${flowId}`;
    await chrome.storage.local.set({ [key]: report });
  }

  static async getReport(flowId) {
    const key = `flowReport_${flowId}`;
    const { [key]: report } = await chrome.storage.local.get(key);
    return report;
  }
}

// Export for use in other files
window.StorageManager = StorageManager;
