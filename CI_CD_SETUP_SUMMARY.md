# CI/CD Pipeline Setup Summary

## ✅ What Has Been Created

### 1. GitHub Actions Workflow
- **File**: `.github/workflows/deploy.yml`
- **Features**:
  - Automatic version bumping on push to master
  - Server deployment via SSH
  - Client build and deployment
  - GitHub release creation
  - Smoke tests

### 2. Deployment Scripts
- **`scripts/bump-version.sh`** - Bump version in package.json files
- **`scripts/release.sh`** - Complete release process (bump, tag, push)
- **`scripts/rollback.sh`** - Rollback to previous version
- **`scripts/setup-deploy-key.sh`** - Generate SSH deploy key

### 3. Documentation
- **`DEPLOYMENT.md`** - Complete deployment guide
- **`SETUP_CREDENTIALS.md`** - SSH keys and setup credentials
- **`server/README.md`** - Updated with deployment info

### 4. Health Check Endpoint
- **Added**: `/api/health` endpoint in `server/index.js`
- **Returns**: Server status, uptime, environment

### 5. Git Configuration
- **`.gitignore`** - Updated to exclude credentials and keys

## 🚀 Quick Start Guide

### Step 1: Setup GitHub Deploy Key

1. **Generate key** (already done):
   ```bash
   ./scripts/setup-deploy-key.sh
   ```

2. **Add to GitHub**:
   - Go to: Repository → Settings → Deploy keys → Add deploy key
   - Title: `Production Server Deploy Key`
   - Key: Copy from `~/.ssh/github-actions-deploy-key.pub`
   - ☑️ Allow write access
   - See `SETUP_CREDENTIALS.md` for full instructions

### Step 2: Add GitHub Secret

1. Go to: Repository → Settings → Secrets → Actions → New secret
2. Name: `SSH_PRIVATE_KEY`
3. Value: Copy entire private key from `~/.ssh/github-actions-deploy-key`
4. See `SETUP_CREDENTIALS.md` for the exact key

### Step 3: Setup Server

```bash
# Add public key to server
cat ~/.ssh/github-actions-deploy-key.pub | \
  ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com \
  "cat >> ~/.ssh/authorized_keys"

# Initial server setup
ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com
mkdir -p /home/ec2-user/ninex-group
cd /home/ec2-user/ninex-group
git clone <your-repo-url> .
cd server
npm install --production
pm2 start server/index.js --name ninex-group-api
pm2 save
```

### Step 4: Release New Version

```bash
# Bump version and create release
./scripts/release.sh patch   # or minor, major

# This will:
# 1. Bump version in package.json files
# 2. Update CHANGELOG.md
# 3. Create git tag
# 4. Push to master (triggers CI/CD)
# 5. GitHub Actions will automatically deploy
```

## 📋 Release Workflow

### Automatic (Recommended)
1. Make changes and commit
2. Run `./scripts/release.sh patch`
3. CI/CD automatically:
   - Builds client
   - Deploys server
   - Creates GitHub release
   - Runs smoke tests

### Manual Steps (if needed)
1. Bump version: `./scripts/bump-version.sh patch`
2. Update CHANGELOG.md manually
3. Commit: `git commit -m "chore: release v1.0.1"`
4. Tag: `git tag -a v1.0.1 -m "Release v1.0.1"`
5. Push: `git push origin master && git push origin v1.0.1`

## 🔄 Rollback

```bash
# Quick rollback
./scripts/rollback.sh v1.0.0
```

## 🧪 Smoke Tests

After deployment, verify:

```bash
# Health check
curl https://api.ninex-group.com/api/health

# Manual tests:
# - Login flow
# - Dashboard loads
# - API calls work
# - No console errors
# - Webhook configs visible
```

## 📁 File Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── scripts/
│   ├── bump-version.sh         # Version bumping
│   ├── release.sh              # Release process
│   ├── rollback.sh             # Rollback script
│   └── setup-deploy-key.sh     # SSH key generator
├── DEPLOYMENT.md               # Complete deployment guide
├── SETUP_CREDENTIALS.md        # SSH keys and credentials
└── server/
    ├── index.js                # (added /api/health endpoint)
    └── README.md               # (updated with deployment info)
```

## 🔐 Security Credentials

**Location**: `SETUP_CREDENTIALS.md`

- ⚠️ **DO NOT commit** `SETUP_CREDENTIALS.md` to public repos
- ⚠️ **DO NOT commit** SSH keys (`.pem`, `github-actions-deploy-key`)
- ✅ Keys are in `.gitignore`

## 📝 Next Steps

1. ✅ **Setup GitHub Deploy Key** (see SETUP_CREDENTIALS.md)
2. ✅ **Add GitHub Secret** (SSH_PRIVATE_KEY)
3. ✅ **Configure Server** (initial setup)
4. ✅ **Test Deployment** (run `./scripts/release.sh patch`)
5. ✅ **Monitor GitHub Actions** (check workflow runs)

## 🆘 Troubleshooting

See `DEPLOYMENT.md` → Troubleshooting section for:
- Deployment failures
- Server won't start
- Client not updating
- Health check failures
- Rollback issues

## 📚 Documentation

- **Full Guide**: `DEPLOYMENT.md`
- **Credentials**: `SETUP_CREDENTIALS.md`
- **Server Info**: `server/README.md`

---

**Setup Complete!** 🎉

You can now:
- Push to master → Auto-deploy
- Run `./scripts/release.sh` → Full release process
- Run `./scripts/rollback.sh` → Quick rollback

