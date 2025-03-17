const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');

// Function to extract ClickUp task IDs from text
function extractClickUpTaskIds(text) {
  if (!text) return [];
  
  // Common patterns for ClickUp task IDs
  // Example: feature/CU-abc123-task-description or fix/cu_abc123_fix-bug
  const patterns = [
    /[cC][uU][-_]([a-zA-Z0-9]+)/g,  // Matches CU-abc123 or cu_abc123
    /#([a-zA-Z0-9]+)/g              // Matches #abc123
  ];
  
  let taskIds = [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        taskIds.push(match[1]);
      }
    }
  }
  
  return taskIds;
}

// Function to add a tag to a ClickUp task
async function addTagToTask(taskId, tagName, apiKey) {
  try {
    const response = await axios.post(
      `https://api.clickup.com/api/v2/task/${taskId}/tag/${tagName}`,
      {},
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    core.info(`Successfully added "${tagName}" tag to ClickUp task ${taskId}.`);
    return true;
  } catch (error) {
    core.error(`Error adding tag to task ${taskId}:`);
    if (error.response) {
      core.error(`Status: ${error.response.status}`);
      core.error(`Response: ${JSON.stringify(error.response.data)}`);
    } else {
      core.error(error.message);
    }
    return false;
  }
}

// Function to add a comment to a ClickUp task
async function addCommentToTask(taskId, comment, apiKey) {
  try {
    const response = await axios.post(
      `https://api.clickup.com/api/v2/task/${taskId}/comment`,
      { comment_text: comment },
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    core.info(`Successfully added comment to ClickUp task ${taskId}.`);
    return true;
  } catch (error) {
    core.error(`Error adding comment to task ${taskId}:`);
    if (error.response) {
      core.error(`Status: ${error.response.status}`);
      core.error(`Response: ${JSON.stringify(error.response.data)}`);
    } else {
      core.error(error.message);
    }
    return false;
  }
}

// Function to fetch commit messages from a PR
async function getCommitMessages(prNumber, repoOwner, repoName, token) {
  try {
    const octokit = github.getOctokit(token);
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner: repoOwner,
      repo: repoName,
      pull_number: prNumber
    });
    
    return commits.map(commit => commit.commit.message);
  } catch (error) {
    core.error('Error fetching commit messages:');
    if (error.response) {
      core.error(`Status: ${error.response.status}`);
      core.error(`Response: ${JSON.stringify(error.response.data)}`);
    } else {
      core.error(error.message);
    }
    return [];
  }
}

// Function to fetch review comments from a PR
async function getReviewComments(prNumber, reviewId, repoOwner, repoName, token) {
  try {
    const octokit = github.getOctokit(token);
    const { data: comments } = await octokit.rest.pulls.listCommentsForReview({
      owner: repoOwner,
      repo: repoName,
      pull_number: prNumber,
      review_id: reviewId
    });
    
    return comments.map(comment => ({
      body: comment.body,
      path: comment.path,
      position: comment.position
    }));
  } catch (error) {
    core.error('Error fetching review comments:');
    if (error.response) {
      core.error(`Status: ${error.response.status}`);
      core.error(`Response: ${JSON.stringify(error.response.data)}`);
    } else {
      core.error(error.message);
    }
    return [];
  }
}

// Main function to update ClickUp tasks
async function updateClickUpTasks(event, githubToken, clickupApiKey) {
  // Get PR details
  const prTitle = event.pull_request.title;
  const branchName = event.pull_request.head.ref;
  const prNumber = event.pull_request.number;
  const repoOwner = event.repository.owner.login;
  const repoName = event.repository.name;
  const prUrl = event.pull_request.html_url;
  const reviewerName = event.review.user.login;
  const reviewId = event.review.id;
  const reviewBody = event.review.body || '';
  const reviewState = event.review.state;
  
  core.info(`PR #${prNumber}: ${prTitle}`);
  core.info(`Branch Name: ${branchName}`);
  core.info(`Review by: ${reviewerName}`);
  core.info(`Review state: ${reviewState}`);
  
  // Collect task IDs from branch name and PR title
  let taskIds = [
    ...extractClickUpTaskIds(branchName),
    ...extractClickUpTaskIds(prTitle)
  ];
  
  // Get commit messages and extract task IDs from them
  const commitMessages = await getCommitMessages(prNumber, repoOwner, repoName, githubToken);
  core.info(`Found ${commitMessages.length} commits in the PR.`);
  
  for (const message of commitMessages) {
    const idsFromCommit = extractClickUpTaskIds(message);
    if (idsFromCommit.length > 0) {
      taskIds.push(...idsFromCommit);
    }
  }
  
  // Remove duplicates
  taskIds = [...new Set(taskIds)];
  
  if (taskIds.length === 0) {
    core.info('No ClickUp task IDs found in branch name, PR title, or commit messages.');
    return;
  }
  
  core.info(`Found ${taskIds.length} unique ClickUp Task IDs: ${taskIds.join(', ')}`);
  
  // Get review comments if available
  let reviewComments = [];
  if (reviewState === 'changes_requested') {
    reviewComments = await getReviewComments(prNumber, reviewId, repoOwner, repoName, githubToken);
    core.info(`Found ${reviewComments.length} review comments.`);
  }
  
  // Create comment text based on review state
  let commentText = '';
  let tagName = '';
  
  if (reviewState === 'approved') {
    commentText = `${reviewerName} has approved → ${prUrl}`;
    tagName = 'Pull request approved';
  } else if (reviewState === 'changes_requested') {
    commentText = `${reviewerName} has requested changes → ${prUrl}\n\n`;
    
    // Add review body if available
    if (reviewBody.trim()) {
      commentText += `**Review comment:**\n${reviewBody}\n\n`;
    }
    
    // Add review comments if available
    if (reviewComments.length > 0) {
      commentText += `**Requested changes:**\n`;
      reviewComments.forEach((comment, index) => {
        commentText += `${index + 1}. **${comment.path}** - ${comment.body}\n`;
      });
    }
    
    tagName = 'Changes requested on pull request';
  }
  
  // Add tag and comment to all found ClickUp tasks
  let tagSuccessCount = 0;
  let commentSuccessCount = 0;
  
  for (const taskId of taskIds) {
    // Add tag
    const tagSuccess = await addTagToTask(taskId, tagName, clickupApiKey);
    if (tagSuccess) tagSuccessCount++;
    
    // Add comment with reviewer name, PR link, and review comments
    const commentSuccess = await addCommentToTask(taskId, commentText, clickupApiKey);
    if (commentSuccess) commentSuccessCount++;
  }
  
  core.info(`Successfully tagged ${tagSuccessCount} out of ${taskIds.length} ClickUp tasks with "${tagName}".`);
  core.info(`Successfully added comments to ${commentSuccessCount} out of ${taskIds.length} ClickUp tasks.`);
}

module.exports = {
  updateClickUpTasks
}; 