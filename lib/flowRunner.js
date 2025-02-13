class FlowRunner {
  constructor() {
    this.responses = new Map();
    this.debug = false;
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

  async executeFlow(flow, userQuery) {
    this.currentFlow = flow;
    this.currentStep = 0;
    this.report = {
      flowId: flow.id,
      flowName: flow.name,
      originalQuery: userQuery,
      steps: []
    };

    await StorageManager.saveFlowState(flow.id, {
      currentStep: 0,
      isRunning: true
    });

    try {
      let currentQuery = userQuery;

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];
        this.currentStep = i;

        await StorageManager.saveFlowState(flow.id, {
          currentStep: i,
          isRunning: true
        });

        const stepOutput = await this.executeStep(step, currentQuery);
        this.responses.set(step.title, stepOutput);

        this.report.steps.push({
          title: step.title,
          output: stepOutput
        });

        currentQuery = stepOutput;
      }

      await StorageManager.saveReport(flow.id, this.report);
      await StorageManager.saveFlowState(flow.id, {
        currentStep: flow.steps.length,
        isRunning: false,
        isComplete: true
      });

      return currentQuery;
    } catch (error) {
      await StorageManager.saveFlowState(flow.id, {
        currentStep: this.currentStep,
        isRunning: false,
        error: error.message
      });
      throw error;
    }
  }
}

// Make it available globally
window.FlowRunner = FlowRunner;