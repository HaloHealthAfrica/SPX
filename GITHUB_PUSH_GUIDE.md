# GitHub Push Authentication Guide

## 🔐 Authentication Required

To push to GitHub, you need to authenticate. Here are your options:

---

## Option 1: GitHub CLI (Easiest)

### Install GitHub CLI (if not installed)
```powershell
# Via winget
winget install --id GitHub.cli

# Or download from: https://cli.github.com/
```

### Authenticate
```powershell
gh auth login
```

**Follow the prompts:**
- GitHub.com
- HTTPS
- Authenticate Git with your GitHub credentials? Yes
- Login with a web browser? Yes (or use token)

### Then Push
```powershell
git push -u origin main
```

---

## Option 2: Personal Access Token (Recommended)

### Create Token

1. **Go to GitHub**
   - Visit: [github.com/settings/tokens](https://github.com/settings/tokens)
   - Click **"Generate new token"** → **"Generate new token (classic)"**

2. **Configure Token**
   - **Note:** "SPX Deployment"
   - **Expiration:** 90 days (or your preference)
   - **Scopes:** Check:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (if using GitHub Actions)

3. **Generate and Copy**
   - Click **"Generate token"**
   - **⚠️ Copy the token immediately** (you won't see it again!)

### Use Token to Push

```powershell
# When prompted for password, use the token (not your GitHub password)
git push -u origin main

# Username: HaloHealthAfrica
# Password: [paste your token here]
```

### Or Set Token in URL (One-time)
```powershell
git remote set-url origin https://YOUR_TOKEN@github.com/HaloHealthAfrica/SPX.git
git push -u origin main
```

**⚠️ Replace YOUR_TOKEN with your actual token**

---

## Option 3: SSH (Most Secure)

### Generate SSH Key
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Enter passphrase (optional but recommended)
```

### Add to GitHub

1. **Copy Public Key**
   ```powershell
   cat ~/.ssh/id_ed25519.pub
   # Copy the output
   ```

2. **Add to GitHub**
   - Go to: [github.com/settings/keys](https://github.com/settings/keys)
   - Click **"New SSH key"**
   - **Title:** "SPX Development"
   - **Key:** Paste your public key
   - Click **"Add SSH key"**

### Update Remote to SSH
```powershell
git remote set-url origin git@github.com:HaloHealthAfrica/SPX.git
git push -u origin main
```

---

## ✅ Quick Solution (Fastest)

**Use Personal Access Token:**

1. Create token: [github.com/settings/tokens](https://github.com/settings/tokens)
2. Copy token
3. Run:
   ```powershell
   git push -u origin main
   ```
4. When prompted:
   - **Username:** `HaloHealthAfrica`
   - **Password:** [paste your token]

---

## 🔍 Verify Authentication

After authenticating, verify:
```powershell
git push -u origin main
```

Should push successfully!

---

## 📋 After Successful Push

Once code is on GitHub:

1. **Go to Vercel:** [vercel.com/new](https://vercel.com/new)
2. **Sign in with GitHub**
3. **Import:** `HaloHealthAfrica/SPX`
4. **Set environment variables**
5. **Deploy!**

---

**Need Help?** See authentication troubleshooting below.

