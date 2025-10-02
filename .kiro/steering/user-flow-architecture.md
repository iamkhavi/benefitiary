# Benefitiary User Flow & Architecture

## 🌐 Two-Domain Architecture

Benefitiary uses a **dual-domain architecture** for optimal user experience and technical separation:

### **Marketing Domain**: `https://benefitiary.com`
- **Repository**: `benefitiary-marketing` 
- **Purpose**: Landing page, lead generation, SEO optimization
- **Technology**: Lightweight Next.js (no database dependencies)
- **Content**: Hero section, features, testimonials, pricing, CTAs

### **Console Domain**: `https://app.benefitiary.com`  
- **Repository**: `benefitiary` (console)
- **Purpose**: Full application functionality
- **Technology**: Next.js + Prisma + BetterAuth + DodoPayments
- **Content**: Authentication, onboarding, dashboard, grant management

---

## 🔄 Complete User Flow with Exact URLs

### **Step 1: Landing Page Entry**
```
User visits: https://benefitiary.com
```
**What happens:**
- User sees marketing content with hero widgets
- Interactive grant matching demo
- AI writing assistant preview
- Feature highlights and testimonials
- Multiple call-to-action buttons

### **Step 2: CTA Button Clicks**

**Primary CTAs redirect to signup:**
```
https://benefitiary.com → https://app.benefitiary.com/auth/signup
```

**Sources of signup redirects:**
- Hero section "Start Now" button
- Navbar "Get Started" button  
- Final CTA "Get Started Free" button

**Login redirect:**
```
https://benefitiary.com → https://app.benefitiary.com/auth/login
```

**Source:** Navbar "Sign In" button

### **Step 3: Authentication (Console App)**
```
URL: https://app.benefitiary.com/auth/signup
```
**What happens:**
- User fills signup form (name, email, password)
- BetterAuth creates user account
- DodoPayments customer created automatically
- User redirected to onboarding

### **Step 4: Onboarding Wizard**

**Organization Setup:**
```
URL: https://app.benefitiary.com/onboarding/organization
```
**Form fields:**
- Organization name
- Organization type (SME, Nonprofit, Academic, Healthcare, Other)
- Organization size (Solo, Micro, Small, Medium, Large)
- User position (CEO, Founder, Program Manager, etc.)
- Website (optional)
- Country and region

**Grant Preferences:**
```
URL: https://app.benefitiary.com/onboarding/preferences
```
**Categories (multi-select):**
- Healthcare & Public Health
- Education & Training  
- Agriculture & Food Security
- Climate & Environment
- Technology & Innovation
- Women & Youth Empowerment
- Arts & Culture
- Community Development
- Human Rights & Governance
- SME / Business Growth

### **Step 5: Dashboard Access**
```
URL: https://app.benefitiary.com/dashboard
```
**What user sees:**
- Personalized grant matches based on profile
- Application tracking
- AI proposal assistance
- Billing management
- Settings and preferences

---

## 🏗️ Technical Implementation

### **Landing Page CTAs**
```typescript
// MarketingCTAButton component
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.benefitiary.com';
const targetUrl = action === "login" 
  ? `${appUrl}/auth/login` 
  : `${appUrl}/auth/signup`;

// Opens in new tab with security attributes
<Link 
  href={targetUrl}
  target="_blank"
  rel="noopener noreferrer"
>
```

### **Environment Configuration**
```env
# Landing page (.env)
NEXT_PUBLIC_APP_URL=https://app.benefitiary.com
NEXT_PUBLIC_MARKETING_URL=https://benefitiary.com

# Console app (.env)  
BETTER_AUTH_URL=https://app.benefitiary.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.benefitiary.com
```

### **Onboarding Flow Logic**
```typescript
// After successful signup
router.push("/onboarding/organization");

// After organization setup
router.push("/onboarding/preferences");  

// After preferences completion
router.push("/dashboard");
```

---

## 🎯 User Experience Benefits

1. **SEO Optimized**: Main domain for marketing content
2. **Fast Loading**: Landing page has no database dependencies  
3. **Secure**: Authentication isolated in app subdomain
4. **Scalable**: Each domain optimized independently
5. **Professional**: Clean separation of marketing vs. application
6. **Conversion Focused**: Multiple CTAs guide users to signup

---

## 🔧 Development Workflow

### **Landing Page Development**
```bash
cd benefitiary-landing
npm run dev  # Runs on localhost:3000
```

### **Console App Development**  
```bash
cd console
npm run dev  # Runs on localhost:3001
```

### **Deployment**
- **Landing**: Auto-deploys to `benefitiary.com` via Vercel
- **Console**: Auto-deploys to `app.benefitiary.com` via Vercel

---

## 📊 Analytics & Tracking

**Landing Page Metrics:**
- Page views, bounce rate, time on site
- CTA click-through rates
- Conversion from visitor to signup

**Console App Metrics:**
- Signup completion rate
- Onboarding completion rate  
- User activation and retention
- Feature usage and engagement

This architecture ensures optimal user experience while maintaining clean code separation and deployment flexibility.