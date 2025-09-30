# Benefitiary

A modern grant discovery platform connecting SMEs, nonprofits, and healthcare organizations with funding opportunities.

## Tech Stack

- **Framework**: Next.js 15 with App Router and TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **Database**: Prisma with Neon (PostgreSQL)
- **Icons**: Lucide React
- **Authentication**: BetterAuth (to be implemented)
- **Payments**: DodoPayments (to be implemented)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env` and fill in your database URL and other credentials.

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:migrate  # When you have a real database connection
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility functions and configurations
│   ├── prisma.ts       # Prisma client setup
│   └── utils.ts        # Utility functions
prisma/
├── schema.prisma       # Database schema
└── migrations/         # Database migrations
```

## Database Schema

The application includes models for:
- **Users**: Authentication and user management
- **Organizations**: Company/org profiles with type, size, location
- **UserPreferences**: Grant category preferences
- **Accounts/Sessions**: BetterAuth integration tables

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio

## Next Steps

1. Set up BetterAuth with DodoPayments integration
2. Implement the onboarding wizard
3. Build the grant discovery and matching system
4. Add AI-powered proposal assistance