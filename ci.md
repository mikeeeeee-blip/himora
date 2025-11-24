# CI/CD Deployment Guide

## Server Information

**Server:** EC2 Instance (eu-north-1)  
**Host:** ec2-13-50-107-204.eu-north-1.compute.amazonaws.com  
**User:** ec2-user  
**Key File:** my-new-key.pem

## Deployment Steps

### 1. SSH into the Server

```bash
ssh -i my-new-key.pem ec2-user@ec2-13-50-107-204.eu-north-1.compute.amazonaws.com
```

### 2. Navigate to Project Directory

```bash
cd himora
```

### 3. Pull Latest Changes from Git

```bash
# Check current branch
git branch

# Pull latest changes from the branch you want to deploy
# For fix#15 branch:
git checkout fix#15
git pull origin fix#15

# For ptmversion(1.0.0) branch (production):
# git checkout ptmversion\(1.0.0\)
# git pull origin ptmversion\(1.0.0\)
```

### 4. Install/Update Dependencies (if needed)

```bash
# Server dependencies (if package.json changed)
cd server
npm install

# Client dependencies (if package.json changed)
cd ../client
npm install
```

### 5. Build Client Application

```bash
cd client
npm run build
```

**Note:** This creates the production build in `client/dist/` directory.

### 6. Restart Application with PM2

```bash
cd ..
pm2 restart all
pm2 save
```

**PM2 Commands:**
- `pm2 list` - View running processes
- `pm2 logs` - View application logs
- `pm2 restart all` - Restart all processes
- `pm2 stop all` - Stop all processes
- `pm2 save` - Save current process list

### 7. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs

# Check if server is responding
curl http://localhost:5000/health  # or your health check endpoint
```

### 8. Monitor Application

```bash
# Real-time logs
pm2 logs --lines 100

# Monitor resources
pm2 monit
```

## Deployment Checklist

- [ ] SSH into server successfully
- [ ] Pull latest code from correct branch
- [ ] Install/update dependencies (if needed)
- [ ] Build client application successfully
- [ ] Restart PM2 processes
- [ ] Save PM2 configuration
- [ ] Verify application is running
- [ ] Check application logs for errors
- [ ] Test critical endpoints
- [ ] Monitor for first few minutes

## Branch Strategy

### fix#15 Branch
- **Purpose:** Development/Feature branch
- **Use Case:** Testing new features before production
- **Deployment:** Deploy to staging/test environment

### ptmversion(1.0.0) Branch
- **Purpose:** Production branch
- **Use Case:** Live production environment
- **Deployment:** Deploy to production (main domain)

## Rollback Procedure

If deployment fails or issues are detected:

```bash
# 1. Check git log to find previous working commit
git log --oneline -10

# 2. Reset to previous commit
git reset --hard <previous-commit-hash>

# 3. Rebuild and restart
cd client && npm run build && cd ..
pm2 restart all
pm2 save
```

## Environment Variables

Ensure `.env` files are properly configured:
- `server/.env` - Backend environment variables
- `client/.env` - Frontend environment variables (if needed)

**Important:** Never commit `.env` files to git. Always verify environment variables are set correctly on the server.

## Troubleshooting

### Build Fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PM2 Process Not Starting
```bash
# Check PM2 logs
pm2 logs

# Delete and restart
pm2 delete all
pm2 start server/index.js --name "himora-server"
pm2 save
```

### Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process if needed
kill -9 <PID>
```

### Application Crashes
```bash
# Check logs
pm2 logs --err

# Restart with more memory (if needed)
pm2 restart all --max-memory-restart 1G
```

## Automated Deployment Script

An automated deployment script is available at `scripts/deploy-fix15.sh` that handles the entire deployment process.

### Using the Automated Script (Recommended)

**From your local machine:**
```bash
# Make sure you're in the project root directory
cd /path/to/himora

# Ensure the script is executable
chmod +x scripts/deploy-fix15.sh

# Run the deployment script
./scripts/deploy-fix15.sh
```

The script will:
1. Connect to the server via SSH
2. Switch to fix#15 branch
3. Pull latest changes
4. Install/update dependencies
5. Build the client application
6. Restart PM2 processes
7. Show deployment status and logs

### Manual Deployment (On Server)

If you prefer to deploy manually on the server:

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Starting deployment..."

# Pull latest code
git checkout 'fix#15'
git pull origin 'fix#15'

# Install dependencies (if needed)
cd server && npm install --production && cd ..
cd client && npm install && cd ..

# Build client
cd client
npm run build
cd ..

# Restart services
pm2 restart all
pm2 save

echo "✅ Deployment complete!"
pm2 status
```

Make it executable: `chmod +x deploy.sh`  
Run it: `./deploy.sh`

## Post-Deployment Verification

1. **Health Check:** Verify server is responding
2. **API Endpoints:** Test critical API endpoints
3. **Frontend:** Verify UI loads correctly
4. **Payment Links:** Test payment link creation
5. **Database:** Verify database connections
6. **Logs:** Monitor logs for any errors

## Notes

- Always deploy during low-traffic periods if possible
- Keep backups of working configurations
- Document any manual changes made during deployment
- Test in staging environment before production deployment
- Monitor application for at least 15-30 minutes after deployment

---

**Last Updated:** 2024-01-15  
**Maintained By:** Development Team
