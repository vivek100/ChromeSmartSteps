class StorageManager {
  static async getFlows() {
    const { flows = [] } = await chrome.storage.local.get('flows');
    return flows;
  }

  static async getActiveFlow() {
    const { activeFlow } = await chrome.storage.local.get('activeFlow');
    return activeFlow;
  }

  static async isEnabled() {
    const { isEnabled = false } = await chrome.storage.local.get('isEnabled');
    return isEnabled;
  }

  static async saveFlow(flow) {
    const flows = await this.getFlows();
    const index = flows.findIndex(f => f.id === flow.id);
    
    if (index >= 0) {
      flows[index] = flow;
    } else {
      flows.push(flow);
    }

    await chrome.storage.local.set({ flows });
  }

  static async deleteFlow(flowId) {
    const flows = await this.getFlows();
    const updatedFlows = flows.filter(f => f.id !== flowId);
    await chrome.storage.local.set({ flows: updatedFlows });
  }

  static async setActiveFlow(flowId) {
    await chrome.storage.local.set({ activeFlow: flowId });
  }

  static async setEnabled(enabled) {
    await chrome.storage.local.set({ isEnabled: enabled });
  }
}
