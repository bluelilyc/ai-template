# How to Grant GitHub Copilot Read Access to Bloom Repository

## Overview

To allow GitHub Copilot Workspace to access your private `bloom` repository, you need to grant the appropriate permissions. The exact method depends on how GitHub Copilot is accessing repositories in your environment.

## Method 1: GitHub App Permissions (Most Likely)

GitHub Copilot Workspace typically uses a GitHub App for repository access. Here's how to grant access:

### Step 1: Identify the GitHub App

1. Go to your repository settings for `aipm` (where Copilot is currently working)
2. Navigate to **Settings** → **Integrations** → **GitHub Apps**
3. Look for an app related to GitHub Copilot or the workspace you're using
4. Note the app name (might be "GitHub Copilot" or similar)

### Step 2: Grant Access to Bloom Repository

1. Navigate to your **Bloom repository**: https://github.com/bluelilyc/bloom
2. Click on **Settings** (you need admin access to the repository)
3. In the left sidebar, click **Integrations** → **GitHub Apps**
4. Find the same GitHub App you identified in Step 1
5. Click **Configure** next to the app
6. Scroll down to **Repository access**
7. Either:
   - Select **All repositories** (grants access to all your repos), OR
   - Select **Only select repositories** and add `bloom` to the list
8. Click **Save**

## Method 2: Add as Collaborator (Alternative)

If GitHub Copilot uses a specific user account or bot account:

1. Navigate to the **Bloom repository**: https://github.com/bluelilyc/bloom
2. Click **Settings** → **Collaborators and teams**
3. Click **Add people** or **Add teams**
4. Search for the GitHub Copilot service account name
5. Select **Read** permission level
6. Send the invitation

## Method 3: Organization-Level Access

If both `aipm` and `bloom` are in the same organization:

1. Go to your **Organization settings**
2. Navigate to **Third-party access** → **GitHub Apps**
3. Find the GitHub Copilot app
4. Configure its repository access to include `bloom`

## Method 4: Personal Access Token (For Testing)

If the above methods don't work and you want to test quickly:

**⚠️ Note:** This method may not work with GitHub Copilot Workspace automatically, but you could share information manually.

1. Create a Personal Access Token with `repo` scope
2. Use it to clone/access bloom locally
3. Share the relevant files with me through Option 2 (manual sharing)

## How to Verify Access

After granting access, I can verify by running:

```bash
# I'll attempt to access the repository again
github-mcp-server-get_file_contents owner:bluelilyc repo:bloom path:/
```

If successful, I should be able to list the repository contents instead of getting a 404 error.

## What Happens After Access is Granted

Once I have read access to the Bloom repository, I will:

1. ✅ Explore the `.github/` directory structure
2. ✅ Review `plans/` and `specs/` directories
3. ✅ Read `AGENTS.md`, `README.md`, `CONTRIBUTING.md`
4. ✅ Examine any skills, agents, prompts, and instructions
5. ✅ Understand the Blue Lily application architecture
6. ✅ Update the PRD with concrete, accurate examples
7. ✅ Create templates that match your actual structure
8. ✅ Proceed with MVP1 implementation

## Troubleshooting

### "I don't see any GitHub Apps in my repository settings"
- GitHub Copilot might be accessing repos through your personal credentials
- Try adding the workspace as a collaborator instead
- Contact GitHub support for help with Copilot workspace permissions

### "The app doesn't have a repository access section"
- Some GitHub Apps have different permission models
- Check the app's **Permissions & events** section
- You may need to reinstall or reconfigure the app

### "I'm not sure which app to grant access to"
- Look for apps with names like: "GitHub Copilot", "Copilot Workspace", "GitHub for VS Code"
- Check which apps currently have access to `aipm`
- When in doubt, grant access to all GitHub-related apps

## Need Help?

If you're having trouble granting access:

1. **Check current apps**: Navigate to Settings → Integrations in the `aipm` repo and let me know what apps you see
2. **Share screenshots**: Screenshots of your repository settings can help identify the right approach
3. **Try Option 2**: If permissions are complex, you can fall back to manually sharing file contents
4. **Organization admin**: If this is an organization repo, you might need organization admin help

## Security Note

Granting read access to a private repository is safe because:
- ✅ It only grants **read** permissions (I cannot modify the bloom repository)
- ✅ I'm working in a sandboxed GitHub environment
- ✅ Access is specific to this workspace session
- ✅ You can revoke access at any time
- ✅ All my actions are auditable through GitHub's audit log

---

**Ready to proceed?** Once you've granted access, let me know and I'll verify access and start exploring the Bloom repository!
