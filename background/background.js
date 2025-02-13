// Handle installation
chrome.runtime.onInstalled.addListener(async () => {
  // Set up default flow
  const defaultFlow = {
    id: 'flow_default',
    name: 'Default Flow',
    steps: [
      {
        title: 'Plan Generation',
        type: 'CoT',
        prompt: 'Please provide a chain-of-thought plan in JSON format with sub-steps for solving the user\'s query.'
      },
      {
        title: 'Reflection',
        type: 'Normal',
        prompt: 'Reflect on the plan and its results. Are they correct? If not, propose corrections.'
      },
      {
        title: 'Final Answer',
        type: 'Normal',
        prompt: 'Now produce a concise final answer for the user\'s query, integrating the previous plan\'s results and the reflection.'
      }
    ]
  };

  const { flows = [] } = await chrome.storage.local.get('flows');
  if (!flows.length) {
    await chrome.storage.local.set({ 
      flows: [defaultFlow],
      activeFlow: defaultFlow.id,
      isEnabled: false
    });
  }
});
