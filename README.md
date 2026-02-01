# Sqyros - AV Setup & Maintenance Assistant

Sqyros is an AI-powered web application by avnova.ai that helps AV technicians and integrators with:

- **Integration Setup Guides** - Step-by-step instructions for connecting third-party devices to core AV systems
- **Maintenance Q&A Chatbot** - Quick answers to common AV maintenance tasks

## Features

- Intelligent model routing (Claude Opus 4.5 for complex guides, Sonnet 4.5 for quick Q&A)
- Support for 50+ AV devices from major brands (Shure, QSC, Crestron, Biamp, etc.)
- Save and organize generated guides
- Usage tracking and tiered pricing (Free/Pro)

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (Email/Password + Google OAuth)
- **Payments**: Stripe (subscriptions)
- **AI**: Claude API (Opus 4.5 + Sonnet 4.5)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Anthropic API key
- Stripe account (for payments)

### 1. Clone and Install

```bash
cd sqyros
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Run the migration in `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Enable Google OAuth in Authentication > Providers (optional)

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 4. Deploy Edge Functions

Install the Supabase CLI and deploy the functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID_PRO_MONTHLY=price_...
supabase secrets set APP_URL=https://sqyros.avnova.ai

# Deploy functions
supabase functions deploy claude-router
supabase functions deploy generate-guide
supabase functions deploy chat
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

### 5. Set Up Stripe

1. Create a product and price in Stripe Dashboard for the Pro plan ($29/month)
2. Set up a webhook endpoint pointing to your `stripe-webhook` function
3. Add the webhook secret to your Supabase secrets

### 6. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create Key" and copy it
5. Add to Supabase secrets as `ANTHROPIC_API_KEY`

### 7. Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3001

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

The `vercel.json` is already configured for proper SPA routing.

## Project Structure

```
sqyros/
├── src/
│   ├── api/              # Supabase client
│   ├── components/
│   │   ├── ui/           # Radix UI components
│   │   ├── guide/        # Guide generation components
│   │   ├── chat/         # Chat components
│   │   └── shared/       # Layout, navigation
│   ├── data/             # Device data
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Auth context, utilities
│   ├── pages/            # Page components
│   └── App.jsx           # Routes
├── functions/            # Supabase Edge Functions
│   ├── claude-router/    # AI model routing
│   ├── generate-guide/   # Guide generation
│   ├── chat/             # Chat endpoint
│   ├── create-checkout/  # Stripe checkout
│   └── stripe-webhook/   # Stripe webhooks
├── supabase/
│   └── migrations/       # Database schema
└── public/
```

## Pricing Tiers

### Free
- 3 integration guides per month
- 5 chat questions per day
- 5 saved guides
- Access to 20+ basic devices

### Pro ($29/month)
- Unlimited guides and questions
- Unlimited saved guides
- Access to 50+ devices
- Compatibility checks
- PDF export
- Priority support

## Support

For issues and feature requests, contact support@avnova.ai

## License

Proprietary - avnova.ai
