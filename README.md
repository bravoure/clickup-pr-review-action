# ClickUp PR Review Action

This GitHub Action automatically adds tags to ClickUp tasks and posts comments with review information when a related Pull Request is approved or when changes are requested on GitHub.

## How it works

1. When a Pull Request is approved or changes are requested on GitHub, this action is triggered.
2. The action extracts ClickUp task IDs from:
   - The branch name
   - The PR title
   - All commit messages in the PR
3. For each found task:
   - For approvals: Adds a "Pull request approved" tag via the ClickUp API
   - For requested changes: Adds a "Changes requested on pull request" tag via the ClickUp API
   - Posts a comment with the reviewer's name, a link to the PR, and for requested changes, the review comments are also added

## Usage

Add the following workflow to your repository in `.github/workflows/clickup-pr-review.yml`:

```yaml
name: ClickUp PR Review Integration
on:
  pull_request_review:
    types: [submitted]

jobs:
  update-clickup:
    runs-on: ubuntu-latest
    if: github.event.review.state == 'approved' || github.event.review.state == 'changes_requested'
    steps:
      - uses: bravoure/clickup-pr-review-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          clickup-api-key: ${{ secrets.CLICKUP_API_KEY }}
```

## Requirements

1. **ClickUp API Key**: You need to add your ClickUp API key as a GitHub repository secret named `CLICKUP_API_KEY`.

   To create this secret:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `CLICKUP_API_KEY`
   - Value: Your ClickUp API key

2. **ClickUp Tags**: Make sure the following tags exist in your ClickUp workspace:
   - `Pull request approved` - For approved PRs
   - `Changes requested on pull request` - For PRs where changes are requested

## Task ID Format

The action looks for ClickUp task IDs in the following formats:
- `CU-abc123` or `cu-abc123` (case insensitive)
- `CU_abc123` or `cu_abc123` (case insensitive)
- `#abc123`

Make sure your branch names, PR titles, or commit messages contain the task ID in one of these formats. 