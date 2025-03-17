const core = require('@actions/core');
const github = require('@actions/github');
const { updateClickUpTasks } = require('./clickup');

async function run() {
  try {
    // Get inputs
    const githubToken = core.getInput('github-token');
    const clickupApiKey = core.getInput('clickup-api-key');
    
    // Get event payload
    const eventPayload = github.context.payload;
    
    // Check if this is a PR review event
    if (!eventPayload.review || !eventPayload.pull_request) {
      core.info('This is not a pull request review event. Skipping.');
      return;
    }
    
    // Check if the review state is approved or changes_requested
    const reviewState = eventPayload.review.state;
    if (reviewState !== 'approved' && reviewState !== 'changes_requested') {
      core.info(`PR review state is "${reviewState}". Skipping ClickUp update.`);
      return;
    }
    
    // Update ClickUp tasks
    await updateClickUpTasks(eventPayload, githubToken, clickupApiKey);
    
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run(); 