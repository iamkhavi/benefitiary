# Benefitiary Development Guide

## 🏗️ Repository Structure

### **Two Separate Repositories**

**Marketing Site**: `benefitiary-marketing`
- **URL**: https://benefitiary.com
- **Purpose**: Landing page, lead generation
- **Tech**: Next.js (lightweight, no database)

**Console App**: `benefitiary` 
- **URL**: https://app.benefitiary.com
- **Purpose**: Full application functionality
- **Tech**: Next.js + Prisma + BetterAuth + DodoPayments

---

## 🚀 Development Commands

### **Marketing Site Development**
```bash
# Navigate to marketing repo
cd benefitiary-marketing

# Install dependencies
npm install

# Start development server
npm run dev  # http://localhost:3000

# Build for production
npm run build

# Deploy to Vercel
git push origin main  # Auto-deploys to benefitiary.com
```

### **Console App Development**
```bash
# Navigate to console repo  
cd benefitiary

# Install dependencies
npm install

# Set up database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev  # http://localhost:3000

# Build for production
npm run build

# Deploy to Vercel
git push origin main  # Auto-deploys to app.benefitiary.com
```

---

## 🔧 Environment Setup

### **Marketing Site (.env)**
```env
NEXT_PUBLIC_APP_URL=https://app.benefitiary.com
NEXT_PUBLIC_MARKETING_URL=https://benefitiary.com
```

### **Console App (.env)**
```env
# Database
DATABASE_URL=postgresql://...

# BetterAuth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://app.benefitiary.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.benefitiary.com

# DodoPayments
DODO_PAYMENTS_API_KEY=...
DODO_PAYMENTS_WEBHOOK_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## 🌐 User Flow Testing

### **Local Development Flow**
1. **Marketing**: http://localhost:3000 (marketing repo)
2. **Console**: http://localhost:3001 (console repo)
3. **Test CTAs**: Update `NEXT_PUBLIC_APP_URL` to `http://localhost:3001` in marketing

### **Production Flow**
1. **Landing**: https://benefitiary.com
2. **Signup**: https://app.benefitiary.com/auth/signup
3. **Onboarding**: https://app.benefitiary.com/onboarding/organization
4. **Dashboard**: https://app.benefitiary.com/dashboard

---

## 📝 Key Files to Know

### **Marketing Site**
- `src/app/page.tsx` - Main landing page
- `src/components/ui/smart-cta-button.tsx` - CTA buttons that redirect to console
- `src/components/layout/benefitiary-navbar.tsx` - Navigation with signup/login links
- `postcss.config.js` - Required for TailwindCSS processing
- `vercel.json` - Deployment configuration

### **Console App**
- `src/app/auth/signup/page.tsx` - User registration
- `src/app/onboarding/` - Two-step onboarding wizard
- `src/lib/auth.ts` - BetterAuth configuration
- `prisma/schema.prisma` - Database schema
- `src/lib/validations/onboarding.ts` - Form validation schemas

---

## 🐛 Common Issues & Solutions

### **Marketing Site CSS Not Loading**
```bash
# Ensure PostCSS config exists
ls postcss.config.js

# Check TailwindCSS processing
npm run build
ls .next/static/css/  # Should show CSS files
```

### **Console App Database Issues**
```bash
# Reset database
npm run db:push

# Generate Prisma client
npm run db:generate

# View database
npm run db:studio
```

### **Environment Variables**
- Marketing site: Only needs `NEXT_PUBLIC_*` variables
- Console app: Needs all auth, database, and payment variables
- Check Vercel dashboard for deployed environment variables

---

## 🔄 Deployment Process

### **Automatic Deployment**
Both repositories auto-deploy on `git push origin main`:
- Marketing → `benefitiary.com`
- Console → `app.benefitiary.com`

### **Manual Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy marketing site
cd benefitiary-marketing
vercel --prod

# Deploy console app
cd benefitiary  
vercel --prod
```

---

## 📊 Monitoring & Debugging

### **Check Deployment Status**
- Vercel Dashboard: https://vercel.com/dashboard
- Build logs available for each deployment
- Environment variables configured per project

### **Local Testing**
```bash
# Test production build locally
npm run build
npm run start

# Check for build errors
npm run build 2>&1 | grep -i error
```

This guide covers the essential development workflow for both repositories in the Benefitiary ecosystem.