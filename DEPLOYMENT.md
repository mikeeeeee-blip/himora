# Deployment Guide

Complete CI/CD pipeline and deployment documentation for Ninex Group Payment Gateway Platform.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Initial Setup](#initial-setup)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Manual Deployment](#manual-deployment)
5. [Rollback Procedure](#rollback-procedure)
6. [Server Access](#server-access)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Bump Version & Tag

```bash
# Bump patch version (default)
./scripts/release.sh patch

# Bump minor version
./scripts/release.sh minor

# Bump major version
./scripts/release.sh major
```

This will:
- Bump version in `server/package.json` and `client/package.json`
- Update `CHANGELOG.md`
- Create a git tag
- Push to master (triggers CI/CD)

### 2. Push Master + Tags

The release script automatically pushes to master and creates tags. If you need to do it manually:

```bash
git push origin master
git push origin --tags
```

### 3. Create GitHub Release

The CI/CD pipeline automatically creates a GitHub release from the tag. You can also create it manually:

1. Go to GitHub → Releases → Draft a new release
2. Choose the tag (e.g., `v1.0.0`)
3. Title: `Release v1.0.0`
4. Description: Copy from `CHANGELOG.md` for that version
5. Publish release

### 4. Monitor Deployment

Watch the GitHub Actions workflow:
- Go to Actions tab in GitHub
- Monitor the "Deploy to Production" workflow
- Check logs for any errors

### 5. Smoke Tests

After deployment, verify:

```bash
# Health check
curl https://api.himora.art/api/health

# Test authentication
curl -X POST https://api.himora.art/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Check API documentation page loads
curl https://app.ninex-group.com/api-docs
```

**Manual Smoke Tests:**
- ✅ Login flow works
- ✅ Dashboard loads correctly
- ✅ API calls from client to server succeed
- ✅ No console/network errors in browser
- ✅ Webhook configurations visible
- ✅ Payment links generate correctly

### 6. Quick Rollback (if needed)

```bash
./scripts/rollback.sh v1.0.0
```

## Initial Setup

### Prerequisites

- GitHub repository with Actions enabled
- EC2 server access (see [Server Access](#server-access))
- SSH keys configured
- PM2 installed on server (`npm install -g pm2`)
- Nginx configured for client serving

### Step 1: Generate Deploy Key

```bash
chmod +x scripts/setup-deploy-key.sh
./scripts/setup-deploy-key.sh
```

This generates:
- `~/.ssh/github-actions-deploy-key` (private key)
- `~/.ssh/github-actions-deploy-key.pub` (public key)

### Step 2: Configure GitHub

#### Add Deploy Key

1. Go to: **Repository → Settings → Deploy keys → Add deploy key**
2. Title: `Production Server Deploy Key`
3. Key: Paste the **public key** from `~/.ssh/github-actions-deploy-key.pub`
4. ☑️ Check "Allow write access" (needed for tags)
5. Click "Add key"

#### Add GitHub Secret

1. Go to: **Repository → Settings → Secrets and variables → Actions → New repository secret**
2. Name: `SSH_PRIVATE_KEY`
3. Value: Paste the **entire private key** from `~/.ssh/github-actions-deploy-key`
   - Include the `-----BEGIN OPENSSH PRIVATE KEY-----` header
   - Include the `-----END OPENSSH PRIVATE KEY-----` footer
   - Include all lines in between
4. Click "Add secret"

### Step 3: Configure Server

#### Add Public Key to Server

```bash
# Copy public key to server
cat ~/.ssh/github-actions-deploy-key.pub | \
  ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com \
  "cat >> ~/.ssh/authorized_keys"
```

#### Setup Server Directory

```bash
ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com

# Create deployment directory
mkdir -p /home/ec2-user/ninex-group
cd /home/ec2-user/ninex-group

# Clone repository
git clone https://github.com/your-org/himora.git .

# Install dependencies
cd server
npm install --production

# Setup PM2
pm2 start server/index.js --name ninex-group-api
pm2 save
pm2 startup
```

#### Setup Client Build Directory

```bash
# Create nginx web directory
sudo mkdir -p /var/www/html/ninex-group
sudo chown ec2-user:ec2-user /var/www/html/ninex-group
```

## CI/CD Pipeline

### Workflow Overview

The GitHub Actions workflow (`.github/workflows/deploy.yml`) performs:

1. **Bump Version** (on push to master)
   - Automatically bumps version
   - Updates CHANGELOG.md
   - Creates git tag
   - Commits and pushes

2. **Deploy Server**
   - SSH to server
   - Pull latest code
   - Install dependencies
   - Restart PM2 process
   - Health check

3. **Deploy Client**
   - Build React app
   - Copy build files to server
   - Update nginx-served files

4. **Create Release**
   - Generate release notes from CHANGELOG
   - Create GitHub release

5. **Smoke Tests**
   - Run automated health checks
   - Verify deployment success

### Manual Trigger

You can manually trigger deployment:

1. Go to **Actions → Deploy to Production → Run workflow**
2. Optionally specify a version
3. Click "Run workflow"

### Workflow Status

Monitor deployment:
- Green checkmark = Success
- Red X = Failed (check logs)
- Yellow circle = In progress

## Manual Deployment

If CI/CD is unavailable, deploy manually:

### Server Deployment

```bash
# SSH to server
ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com

# Navigate to project
cd /home/ec2-user/ninex-group

# Pull latest code
git fetch --all --tags
git checkout master
git pull origin master

# Install dependencies
cd server
npm ci --production

# Restart server
pm2 restart ninex-group-api
pm2 save
```

### Client Deployment

```bash
# Build locally
cd client
npm ci
npm run build

# Copy to server
scp -i my-new-key.pem -r dist/* \
  ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com:/var/www/html/ninex-group/
```

## Rollback Procedure

### Quick Rollback

```bash
./scripts/rollback.sh v1.0.0
```

### Manual Rollback

```bash
ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com

cd /home/ec2-user/ninex-group
git fetch --all --tags
git checkout v1.0.0  # Replace with desired version

cd server
npm ci --production
pm2 restart ninex-group-api
```

### Rollback Checklist

- [ ] Identify the version to rollback to
- [ ] Run rollback script or manual steps
- [ ] Verify health check passes
- [ ] Test critical user flows
- [ ] Monitor error logs
- [ ] Notify team of rollback

## Server Access

### SSH Access

```bash
ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com
```

### MongoDB Tunnel

```bash
ssh -i my-new-key.pem -L 27017:127.0.0.1:27017 \
  ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com
```

Then connect to MongoDB at `mongodb://localhost:27017`

### Server Details

- **Host**: `ec2-13-50-107-204.eu-north-1.compute.amazonaws.com`
- **User**: `ec2-user`
- **Region**: `eu-north-1`
- **SSH Key**: `my-new-key.pem`
- **Deploy Path**: `/home/ec2-user/ninex-group`
- **Client Path**: `/var/www/html/ninex-group`
- **Port**: `5001` (server), `80/443` (nginx)

## Environment Variables

### Server Environment Variables

Create `.env` file on server:

```bash
# MongoDB
MONGO_URI=mongodb://localhost:27017/ninexgroup

# JWT
JWT_SECRET=your-jwt-secret-here

# URLs
FRONTEND_URL=https://app.ninex-group.com
BACKEND_URL=https://api.himora.art

# Cashfree
CASHFREE_BASE_URL=https://sandbox.cashfree.com/pg
CASHFREE_APP_ID=your-app-id
CASHFREE_SECRET_KEY=your-secret-key
CASHFREE_PAYOUT_URL=https://payout-api.cashfree.com

# Razorpay
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# PhonePe
PHONEPE_APP_UNIQUE_ID=your-app-unique-id
PHONEPE_MERCHANT_ID=your-merchant-id
PHONEPE_SALT_KEY=your-salt-key

# Server
PORT=5001
NODE_ENV=production
```

### Client Environment Variables

Update `client/src/constants/api.js`:

```javascript
export const BASE_URL = 'https://api.himora.art/api';
```

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**
   - Go to Actions tab
   - Click on failed workflow
   - Review error messages

2. **Check server logs**
   ```bash
   ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com
   pm2 logs ninex-group-api
   ```

3. **Verify SSH key**
   - Ensure `SSH_PRIVATE_KEY` secret is set correctly
   - Verify deploy key has write access

### Server Won't Start

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs ninex-group-api

# Restart
pm2 restart ninex-group-api

# Check environment variables
cd /home/ec2-user/ninex-group/server
cat .env
```

### Client Not Updating

1. **Clear browser cache**
2. **Check nginx configuration**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
3. **Verify files copied**
   ```bash
   ls -la /var/www/html/ninex-group/
   ```

### Health Check Fails

```bash
# Check if server is running
curl http://localhost:5001/api/health

# Check PM2
pm2 status

# Check port
netstat -tlnp | grep 5001
```

### Rollback Fails

```bash
# List available tags
git tag -l

# Checkout specific commit
git log --oneline
git checkout <commit-hash>

# Manual PM2 restart
pm2 restart ninex-group-api --update-env
```

## Security Notes

- ⚠️ **Never commit SSH keys or `.env` files**
- ⚠️ **Use GitHub Secrets for sensitive data**
- ⚠️ **Rotate deploy keys periodically**
- ⚠️ **Use strong JWT secrets**
- ⚠️ **Enable firewall rules on EC2**
- ⚠️ **Use HTTPS in production**
- ⚠️ **Regular security updates**

## Support

For issues or questions:
1. Check GitHub Issues
2. Review deployment logs
3. Contact DevOps team

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0

