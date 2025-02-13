class FlowRunner {
  constructor() {
    this.responses = new Map();
    this.debug = false;
  }

  async executeFlow(flowId, userQuery) {
    try {
      const { flows } = await chrome.storage.local.get('flows');
      const flow = flows.find(f => f.id === flowId);
      if (!flow) throw new Error(`Flow not found: ${flowId}`);

      console.log(`Starting flow execution: ${flow.name}`);
      let currentQuery = userQuery;

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];
        console.log(`Executing step: ${step.title}`);
        
        // Update progress
        chrome.runtime.sendMessage({
          type: 'STEP_UPDATE',
          steps: flow.steps,
          currentStep: i
        });

        currentQuery = await this.executeStep(step, currentQuery);
        this.responses.set(step.title, currentQuery);
      }

      // Send completion message
      chrome.runtime.sendMessage({ type: 'FLOW_COMPLETE' });

      return currentQuery;
    } catch (error) {
      console.error('Flow execution failed:', error);
      throw error;
    }
  }

  async executeStep(step, userQuery) {
    try {
      const previousOutputs = Array.from(this.responses.values()).join('\n');
      const lastResponse = this.responses.get('lastResponse') || '';

      if (this.debug) {
        console.log('Step execution:', {
          title: step.title,
          type: step.type,
          previousOutputs,
          lastResponse
        });
      }

      let modifiedQuery;
      if (step.type === 'Normal') {
        modifiedQuery = this.buildNormalPrompt(step.prompt, userQuery, previousOutputs, lastResponse);
      } else if (step.type === 'CoT') {
        modifiedQuery = await this.buildCoTPrompt(step, userQuery, previousOutputs, lastResponse);
      } else {
        throw new Error(`Unknown step type: ${step.type}`);
      }

      if (this.debug) {
        console.log(`Modified query for ${step.title}:`, modifiedQuery);
      }

      return modifiedQuery;
    } catch (error) {
      console.error(`Step execution failed: ${step.title}`, error);
      throw error;
    }
  }

  buildNormalPrompt(systemPrompt, userQuery, previousOutputs, lastResponse) {
    return `${systemPrompt}

Previous outputs:
${previousOutputs}

Last response:
${lastResponse}

Query: ${userQuery}`.trim();
  }

  async buildCoTPrompt(step, userQuery, previousOutputs, lastResponse) {
    const basePrompt = `${step.prompt}
Please structure your response as a JSON plan with steps.

Previous outputs:
${previousOutputs}

Last response:
${lastResponse}

Query: ${userQuery}`.trim();

    // If we have a previous response in JSON format, we can process the next sub-step
    if (lastResponse) {
      try {
        const plan = JSON.parse(lastResponse);
        if (plan.steps && Array.isArray(plan.steps)) {
          // Find the next incomplete step
          const nextStep = plan.steps.find(s => !s.completed);
          if (nextStep) {
            return `Executing sub-step ${nextStep.id}: ${nextStep.description}

Original query: ${userQuery}`;
          }
        }
      } catch (e) {
        // If parsing fails, it means the last response wasn't JSON,
        // so we'll continue with the base prompt
      }
    }

    return basePrompt;
  }

  setDebug(enabled) {
    this.debug = enabled;
    if (enabled) {
      console.log('Debug mode enabled for FlowRunner');
    }
  }
}

// Make it available globally
window.FlowRunner = FlowRunner;