document.addEventListener('DOMContentLoaded', async () => {
  const flowSelect = document.getElementById('flowSelect');
  const flowToggle = document.getElementById('flowToggle');
  const settingsBtn = document.getElementById('settingsBtn');
  const startBtn = document.getElementById('startBtn');
  const viewReportBtn = document.getElementById('viewReportBtn');
  const footer = document.getElementById('footer');
  const stepProgress = document.getElementById('stepProgress');
  const statusIndicator = document.querySelector('.status-indicator');

  // Add status indicator
  statusIndicator.className = 'status-indicator';
  statusIndicator.textContent = 'Ready';
  document.querySelector('.container').appendChild(statusIndicator);

  async function updateStatus(message, isError = false) {
    statusIndicator.textContent = message;
    statusIndicator.className = `status-indicator ${isError ? 'error' : ''}`;
  }

  try {
    // Load flows from storage
    const flows = await chrome.storage.local.get('flows');
    if (flows.flows) {
      flowSelect.innerHTML = ''; // Clear default option
      flows.flows.forEach(flow => {
        const option = document.createElement('option');
        option.value = flow.id;
        option.textContent = flow.name;
        flowSelect.appendChild(option);
      });
    }

    // Load active state
    const state = await chrome.storage.local.get(['activeFlow', 'isEnabled']);
    if (state.activeFlow) {
      flowSelect.value = state.activeFlow;
    }
    flowToggle.checked = state.isEnabled || false;

    // Event Listeners
    flowSelect.addEventListener('change', async (e) => {
      try {
        await chrome.storage.local.set({ activeFlow: e.target.value });
        updateStatus('Flow updated');
      } catch (error) {
        console.error('Failed to update active flow:', error);
        updateStatus('Failed to update flow', true);
      }
    });

    flowToggle.addEventListener('change', async (e) => {
      try {
        await chrome.storage.local.set({ isEnabled: e.target.checked });
        // Notify content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'FLOW_STATE_CHANGED',
            enabled: e.target.checked
          });
          updateStatus(e.target.checked ? 'Flow enabled' : 'Flow disabled');
        }
      } catch (error) {
        console.error('Failed to update flow state:', error);
        updateStatus('Failed to update state', true);
        // Revert toggle if failed
        flowToggle.checked = !e.target.checked;
      }
    });

    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    updateStatus('Ready');
  } catch (error) {
    console.error('Popup initialization failed:', error);
    updateStatus('Failed to initialize', true);
  }
});