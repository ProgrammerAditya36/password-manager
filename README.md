This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### 🔐 Password Management

- Create, edit, delete, and view passwords
- Secure encryption and storage
- Password sharing with other users
- Import passwords from various sources

### 📤 CSV Export

- Export individual passwords to CSV
- Bulk export all passwords
- Selective export of chosen passwords
- Excel-compatible CSV format with proper encoding

### 🤖 AI-Powered Import

- Import passwords from multiple file formats:
  - **CSV files** - Direct parsing with AI fallback
  - **PDF documents** - AI text extraction and password parsing
  - **Image files** (JPG, PNG, GIF, BMP) - AI-powered OCR and password detection
  - **Text files** (TXT, MD) - AI content analysis
- Uses Gemini Flash model for intelligent password extraction
- Automatic field mapping and validation
- Preview imported passwords before confirmation

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/password_manager"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# AI Configuration (for password import)
GOOGLE_API_KEY=your_google_api_key_for_gemini
```

## AI Import Configuration

The password import feature uses Google's Gemini Flash model to intelligently extract password information from various file types. To use this feature:

1. Get a Google API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env.local` file as `GOOGLE_API_KEY`
3. The AI will automatically process your files and extract password data

### Supported Import Formats

- **CSV**: Standard comma-separated values with headers
- **PDF**: Documents containing password information
- **Images**: Screenshots or photos of password lists
- **Text**: Plain text files with password data

The AI model is trained to recognize various password formats and will automatically map fields like:

- Service/website names
- Usernames and login credentials
- Email addresses
- Passwords
- Website URLs
- Additional notes or descriptions

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Prerequisites

1. **Database**: Ensure you have a PostgreSQL database accessible from Vercel (e.g., Vercel Postgres, Supabase, Neon, or Railway)
2. **Environment Variables**: Set up all required environment variables in your Vercel project settings

### Environment Variables for Vercel

In your Vercel project settings, add these environment variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Environment
NODE_ENV=production
```

### Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `pnpm run build`
   - Install Command: `pnpm install`
   - Output Directory: `.next`
3. **Set Environment Variables**: Add all required environment variables
4. **Deploy**: Click deploy and wait for the build to complete

### Common Issues and Solutions

#### Prisma Client Generation Error

If you encounter the error `Cannot find module '.prisma/client/default'`:

1. **Check Build Logs**: Ensure the build command includes `prisma generate`
2. **Environment Variables**: Verify `DATABASE_URL` is correctly set
3. **Database Connection**: Ensure your database is accessible from Vercel's servers
4. **Rebuild**: Sometimes a fresh deployment resolves the issue

#### Database Connection Issues

1. **Connection Pooling**: For production databases, consider using connection pooling (e.g., PgBouncer)
2. **SSL Requirements**: Some databases require SSL connections in production
3. **IP Whitelisting**: Ensure Vercel's IP ranges are allowed if your database has IP restrictions

### Post-Deployment

1. **Database Migration**: Run `prisma db push` or `prisma migrate deploy` if needed
2. **Test Functionality**: Verify all features work correctly in production
3. **Monitor Logs**: Check Vercel function logs for any runtime errors

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
