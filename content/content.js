// Define supported chat interface selectors
const CHAT_INTERFACE_SELECTORS = {
  input: [
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="chat" i]',
    'textarea[aria-label*="chat" i]',
    'input[type="text"][placeholder*="message" i]',
    'div[contenteditable="true"]'
  ],
  container: [
    '#chat-container',
    '.chat-messages',
    '.conversation-container',
    '[aria-label*="chat" i]',
    'main'
  ],
  response: [
    '.assistant-message',
    '.ai-response',
    '.chat-message[data-role="assistant"]',
    '[data-message-author-role="assistant"]'
  ]
};

let isEnabled = false;
let activeFlow = null;
let flowRunner = null;
let waitingForResponse = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FLOW_STATE_CHANGED') {
    isEnabled = message.enabled;
    if (isEnabled) {
      flowRunner = new FlowRunner();
      flowRunner.setDebug(true); // Enable debug mode for development
    } else {
      flowRunner = null;
    }
  }
});

// Initialize state from storage
async function initializeState() {
  try {
    const state = await chrome.storage.local.get(['isEnabled', 'activeFlow']);
    isEnabled = state.isEnabled || false;
    activeFlow = state.activeFlow;
    if (isEnabled) {
      flowRunner = new FlowRunner();
      flowRunner.setDebug(true);
    }
  } catch (error) {
    console.error('Failed to initialize state:', error);
  }
}

function showError(message) {
  let errorElement = document.getElementById('flow-runner-error');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = 'flow-runner-error';
    errorElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(errorElement);
  }
  errorElement.textContent = message;

  setTimeout(() => {
    if (errorElement.parentNode) {
      errorElement.parentNode.removeChild(errorElement);
    }
  }, 5000);
}

// Find chat elements using our selectors
function findChatElement(selectorList) {
  for (const selector of selectorList) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

// Listen for AI responses
function setupResponseObserver() {
  const observer = new MutationObserver((mutations) => {
    if (waitingForResponse) {
      // Look for new response elements
      mutations
        .filter(mutation => mutation.addedNodes.length > 0)
        .forEach(mutation => {
          Array.from(mutation.addedNodes).forEach(node => {
            if (node instanceof HTMLElement) {
              // Check for response element using our selectors
              const responseElement = CHAT_INTERFACE_SELECTORS.response.reduce((found, selector) => {
                return found || (
                  node.matches(selector) ? node :
                  node.querySelector(selector)
                );
              }, null);

              if (responseElement) {
                waitingForResponse = false;
                console.log('AI response received:', responseElement.textContent);

                // Store the response for future steps if needed
                if (flowRunner) {
                  flowRunner.responses.set('lastResponse', responseElement.textContent);
                }
              }
            }
          });
        });
    }
  });

  // Find and observe the chat container
  const chatContainer = findChatElement(CHAT_INTERFACE_SELECTORS.container);
  if (chatContainer) {
    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    });
    console.log('Observing chat container:', chatContainer);
  } else {
    console.warn('Could not find chat container');
  }
}

// Intercept chat input
function setupChatInterception() {
  // Listen for both form submissions and input events
  document.addEventListener('submit', handleChatEvent, true);
  document.addEventListener('keydown', (e) => {
    // Common chat submit shortcuts (Enter without Shift)
    if (e.key === 'Enter' && !e.shiftKey && isEnabled) {
      const input = findChatElement(CHAT_INTERFACE_SELECTORS.input);
      if (input && input === document.activeElement) {
        handleChatEvent(e);
      }
    }
  }, true);
}

async function handleChatEvent(e) {
  if (!isEnabled || !activeFlow || !flowRunner) return;

  // Find input element using our selectors
  const inputElement = e.target.matches(CHAT_INTERFACE_SELECTORS.input.join(',')) ? 
    e.target : 
    findChatElement(CHAT_INTERFACE_SELECTORS.input);

  if (!inputElement) return;

  e.preventDefault();
  e.stopPropagation();

  try {
    const userQuery = inputElement.value || inputElement.textContent;
    console.log('Executing flow for query:', userQuery);

    const modifiedQuery = await flowRunner.executeFlow(activeFlow, userQuery);

    // Update input with modified query
    if (inputElement.value !== undefined) {
      inputElement.value = modifiedQuery;
    } else {
      inputElement.textContent = modifiedQuery;
    }

    // Set waiting flag before submitting
    waitingForResponse = true;

    // Trigger native submit or dispatch enter key
    if (e.type === 'submit') {
      const nativeSubmit = new Event('submit', { bubbles: true });
      e.target.dispatchEvent(nativeSubmit);
    } else {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true
      });
      inputElement.dispatchEvent(enterEvent);
    }
  } catch (error) {
    console.error('Flow execution failed:', error);
    showError(`Flow execution failed: ${error.message}`);
    waitingForResponse = false;

    // Submit original query
    if (e.type === 'submit') {
      const nativeSubmit = new Event('submit', { bubbles: true });
      e.target.dispatchEvent(nativeSubmit);
    }
  }
}

// Initialize
(async () => {
  try {
    await initializeState();
    setupChatInterception();
    setupResponseObserver();
    console.log('AI Flow extension initialized');
  } catch (error) {
    console.error('Failed to initialize AI Flow extension:', error);
  }
})();