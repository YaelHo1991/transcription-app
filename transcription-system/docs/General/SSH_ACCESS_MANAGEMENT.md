# 🔑 SSH Access Management for Claude

## Overview
This document explains how to maintain SSH access for Claude (or any AI assistant) while following security best practices. It includes creating a dedicated user, managing SSH keys, and ensuring persistent access.

**Current Setup:** Root access with SSH key  
**Recommended:** Dedicated user with sudo privileges  
**Security Level:** Medium → High with separate user  

---

## Current SSH Configuration

### What's Currently Set Up

1. **SSH Key Location:** `C:\Users\ayelh\.ssh\id_rsa`
2. **SSH Config:** `C:\Users\ayelh\.ssh\config`
3. **Access Level:** Root (full access)
4. **Shortcuts:** `ssh do`, `ssh droplet`, `ssh transcription`

### Current Config File
```ssh
Host droplet
    HostName 146.190.57.51
    User root
    IdentityFile ~/.ssh/id_rsa

Host transcription
    HostName 146.190.57.51
    User root
    IdentityFile ~/.ssh/id_rsa

Host do
    HostName 146.190.57.51
    User root
    IdentityFile ~/.ssh/id_rsa
```

---

## Creating a Separate User for Claude (Recommended)

### Why Create a Separate User?

**Benefits:**
- ✅ Audit trail - all Claude's actions logged separately
- ✅ Revocable access - disable without affecting root
- ✅ Limited permissions - sudo only for specific commands
- ✅ Security - root access not exposed
- ✅ Compliance - follows security best practices

**Will it work the same?** YES, with proper setup

### Step-by-Step: Create Claude User

#### 1. Connect to Server as Root
```bash
ssh do
```

#### 2. Create New User
```bash
# Create user 'claude' with home directory
useradd -m -s /bin/bash claude

# Set a temporary password (will use SSH key instead)
passwd claude
# Enter a strong temporary password

# Add to sudo group
usermod -aG sudo claude

# Create .ssh directory
mkdir -p /home/claude/.ssh
chmod 700 /home/claude/.ssh
```

#### 3. Copy SSH Key
```bash
# Copy your existing authorized key
cp /root/.ssh/authorized_keys /home/claude/.ssh/
chmod 600 /home/claude/.ssh/authorized_keys
chown -R claude:claude /home/claude/.ssh
```

#### 4. Configure Sudo Without Password (Optional but Convenient)
```bash
# Edit sudoers file
visudo

# Add this line at the end:
claude ALL=(ALL) NOPASSWD: ALL

# Or for more security, limit to specific commands:
claude ALL=(ALL) NOPASSWD: /usr/bin/apt, /usr/bin/systemctl, /usr/bin/pm2, /usr/bin/npm
```

#### 5. Test New User Access
```bash
# From your local machine
ssh claude@146.190.57.51

# Test sudo
sudo ls /root
```

#### 6. Update Local SSH Config
```ssh
# Add to ~/.ssh/config
Host do-claude
    HostName 146.190.57.51
    User claude
    IdentityFile ~/.ssh/id_rsa

# Keep root access as backup
Host do-root
    HostName 146.190.57.51
    User root
    IdentityFile ~/.ssh/id_rsa
```

---

## Maintaining Claude's SSH Access

### Required Files to Preserve

**CRITICAL - Never Delete These:**

1. **SSH Private Key:** `C:\Users\ayelh\.ssh\id_rsa`
   - This is Claude's "password" to the server
   - Back it up securely
   - Never share or commit to git

2. **SSH Config:** `C:\Users\ayelh\.ssh\config`
   - Contains server shortcuts
   - Can be recreated if lost

3. **Known Hosts:** `C:\Users\ayelh\.ssh\known_hosts`
   - Contains server fingerprints
   - Can be recreated by accepting on first connect

### Backup Strategy

#### Create Backup of SSH Keys
```bash
# Windows (PowerShell)
Copy-Item -Path "$env:USERPROFILE\.ssh\id_rsa" -Destination "$env:USERPROFILE\Documents\ssh_backup_id_rsa"
Copy-Item -Path "$env:USERPROFILE\.ssh\id_rsa.pub" -Destination "$env:USERPROFILE\Documents\ssh_backup_id_rsa.pub"
Copy-Item -Path "$env:USERPROFILE\.ssh\config" -Destination "$env:USERPROFILE\Documents\ssh_backup_config"
```

#### Store Securely
- ✅ Password manager (1Password, LastPass)
- ✅ Encrypted USB drive
- ✅ Secure cloud storage (encrypted)
- ❌ Never in git repository
- ❌ Never in plain email

---

## Security Best Practices

### 1. Use Strong SSH Key
```bash
# Generate new strong key (if needed)
ssh-keygen -t ed25519 -C "claude@transcription-system"
# or
ssh-keygen -t rsa -b 4096 -C "claude@transcription-system"
```

### 2. Restrict SSH Access
```bash
# Edit SSH config on server
sudo nano /etc/ssh/sshd_config

# Add these security settings:
PermitRootLogin no  # After claude user is working
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
MaxSessions 2

# Restart SSH
sudo systemctl restart sshd
```

### 3. Set Up Fail2Ban
```bash
# Install fail2ban
sudo apt install fail2ban

# Configure for SSH
sudo nano /etc/fail2ban/jail.local

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

### 4. Monitor Access
```bash
# Check last logins
last

# Check current connections
who

# Check SSH log
sudo tail -f /var/log/auth.log

# Check for claude user activity
sudo grep "claude" /var/log/auth.log
```

---

## Access Recovery

### If Claude Loses Access

#### Option 1: Use Root Account (Backup)
```bash
# If claude user has issues, use root
ssh root@146.190.57.51

# Fix claude user permissions
chmod 700 /home/claude/.ssh
chmod 600 /home/claude/.ssh/authorized_keys
chown -R claude:claude /home/claude/.ssh
```

#### Option 2: Reset SSH Key
```bash
# Generate new key locally
ssh-keygen -t ed25519 -f ~/.ssh/claude_key

# Copy to server (need password once)
ssh-copy-id -i ~/.ssh/claude_key.pub claude@146.190.57.51
```

#### Option 3: Use Digital Ocean Console
1. Login to Digital Ocean dashboard
2. Go to Droplet → Access → Launch Console
3. Login with root credentials
4. Fix SSH configuration

---

## Testing Claude's Access

### Verification Checklist

```bash
# 1. Test basic connection
ssh claude@146.190.57.51 "echo 'Connection successful'"

# 2. Test sudo access
ssh claude@146.190.57.51 "sudo ls /root"

# 3. Test PM2 commands
ssh claude@146.190.57.51 "sudo pm2 list"

# 4. Test file editing
ssh claude@146.190.57.51 "sudo touch /tmp/test_claude && sudo rm /tmp/test_claude"

# 5. Test service management
ssh claude@146.190.57.51 "sudo systemctl status nginx"
```

### Expected Results
- ✅ All commands should work without password prompts
- ✅ Actions logged as 'claude' user
- ✅ Can manage application and services

---

## Implementation Script

Save as `setup-claude-user.sh` and run on server:

```bash
#!/bin/bash

# Setup Claude User Script
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up Claude user...${NC}"

# Create user
if id "claude" &>/dev/null; then
    echo "User 'claude' already exists"
else
    useradd -m -s /bin/bash claude
    echo -e "${GREEN}✅ User created${NC}"
fi

# Add to sudo
usermod -aG sudo claude

# Setup SSH
mkdir -p /home/claude/.ssh
chmod 700 /home/claude/.ssh

# Copy root's authorized keys
cp /root/.ssh/authorized_keys /home/claude/.ssh/
chmod 600 /home/claude/.ssh/authorized_keys
chown -R claude:claude /home/claude/.ssh

# Configure sudoers
echo "claude ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/claude
chmod 440 /etc/sudoers.d/claude

echo -e "${GREEN}✅ Claude user setup complete!${NC}"
echo ""
echo "Test with: ssh claude@$(hostname -I | cut -d' ' -f1)"
```

---

## FAQ

### Q: Will Claude work the same with a separate user?
**A:** Yes, with sudo privileges, Claude can perform all the same tasks. Just use `sudo` before commands that need root access.

### Q: Can I revoke Claude's access later?
**A:** Yes, simply disable or delete the claude user:
```bash
# Disable (reversible)
sudo usermod -L claude

# Delete (permanent)
sudo userdel -r claude
```

### Q: What if I lose the SSH key?
**A:** Use Digital Ocean's console access to add a new key or reset access.

### Q: Should I disable root login?
**A:** Yes, after confirming claude user works. Keep DO console as emergency backup.

### Q: Can Claude damage the system?
**A:** With sudo access, yes. But all actions are logged and you can review them:
```bash
sudo grep "claude" /var/log/auth.log
sudo journalctl -u sshd | grep claude
```

---

## Recommendations

### For Development
- ✅ Keep current root access
- ✅ Simple and fast
- ✅ No changes needed

### For Production
- ✅ Create claude user
- ✅ Disable root SSH login
- ✅ Use key-only authentication
- ✅ Monitor access logs
- ✅ Regular key rotation

### Best Practice
1. Create claude user now
2. Test thoroughly
3. Keep root as backup
4. Switch to claude user gradually
5. Disable root login when confident

---

## Important Notes

**For Claude to maintain access:**
1. **Never delete** `~/.ssh/id_rsa` on local machine
2. **Never delete** `/home/claude/.ssh/authorized_keys` on server
3. **Keep backup** of SSH key in secure location
4. **Document** in project that Claude needs SSH access
5. **Test** access after any SSH configuration changes

**Security reminder:** The SSH private key is like a password. Anyone with this file can access your server. Keep it secure!

---

## Contact & Recovery

If access is lost:
1. Use Digital Ocean web console
2. Check `/var/log/auth.log` for errors
3. Verify SSH service is running
4. Check firewall isn't blocking port 22
5. Restore from backed up SSH keys

**Created:** August 25, 2025  
**Purpose:** Maintain persistent, secure SSH access for Claude