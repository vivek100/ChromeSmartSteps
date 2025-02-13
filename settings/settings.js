let currentFlowId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const flowsList = document.getElementById('flowsList');
  const flowEditor = document.getElementById('flowEditor');
  const newFlowBtn = document.getElementById('newFlowBtn');
  const saveFlowBtn = document.getElementById('saveFlowBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const addStepBtn = document.getElementById('addStepBtn');
  const flowName = document.getElementById('flowName');
  const stepsList = document.getElementById('stepsList');
  const stepTemplate = document.getElementById('stepTemplate');

  async function loadFlows() {
    const { flows = [] } = await chrome.storage.local.get('flows');
    flowsList.innerHTML = '';
    
    flows.forEach(flow => {
      const flowItem = document.createElement('div');
      flowItem.className = 'flow-item';
      flowItem.innerHTML = `
        <span>${flow.name}</span>
        <div>
          <button onclick="editFlow('${flow.id}')">Edit</button>
          <button onclick="deleteFlow('${flow.id}')">Delete</button>
        </div>
      `;
      flowsList.appendChild(flowItem);
    });
  }

  function showEditor(isNew = true) {
    flowEditor.classList.remove('hidden');
    document.getElementById('editorTitle').textContent = isNew ? 'Create New Flow' : 'Edit Flow';
    if (isNew) {
      flowName.value = '';
      stepsList.innerHTML = '';
      currentFlowId = null;
    }
  }

  function hideEditor() {
    flowEditor.classList.add('hidden');
    currentFlowId = null;
  }

  function addStep(step = null) {
    const stepNode = stepTemplate.content.cloneNode(true);
    const stepItem = stepNode.querySelector('.step-item');
    
    if (step) {
      stepItem.querySelector('.step-title').value = step.title;
      stepItem.querySelector('.step-type').value = step.type;
      stepItem.querySelector('.step-prompt').value = step.prompt;
    }

    stepItem.querySelector('.remove-step-btn').addEventListener('click', (e) => {
      e.target.closest('.step-item').remove();
    });

    stepsList.appendChild(stepItem);
  }

  window.editFlow = async (flowId) => {
    const { flows = [] } = await chrome.storage.local.get('flows');
    const flow = flows.find(f => f.id === flowId);
    if (!flow) return;

    currentFlowId = flowId;
    flowName.value = flow.name;
    stepsList.innerHTML = '';
    flow.steps.forEach(step => addStep(step));
    showEditor(false);
  };

  window.deleteFlow = async (flowId) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;

    const { flows = [] } = await chrome.storage.local.get('flows');
    const updatedFlows = flows.filter(f => f.id !== flowId);
    await chrome.storage.local.set({ flows: updatedFlows });
    loadFlows();
  };

  newFlowBtn.addEventListener('click', () => showEditor());
  
  cancelBtn.addEventListener('click', hideEditor);
  
  addStepBtn.addEventListener('click', () => addStep());

  saveFlowBtn.addEventListener('click', async () => {
    const steps = Array.from(stepsList.children).map(stepEl => ({
      title: stepEl.querySelector('.step-title').value,
      type: stepEl.querySelector('.step-type').value,
      prompt: stepEl.querySelector('.step-prompt').value
    }));

    const { flows = [] } = await chrome.storage.local.get('flows');
    const newFlow = {
      id: currentFlowId || `flow_${Date.now()}`,
      name: flowName.value,
      steps
    };

    let updatedFlows;
    if (currentFlowId) {
      updatedFlows = flows.map(f => f.id === currentFlowId ? newFlow : f);
    } else {
      updatedFlows = [...flows, newFlow];
    }

    await chrome.storage.local.set({ flows: updatedFlows });
    hideEditor();
    loadFlows();
  });

  // Initial load
  loadFlows();
});
