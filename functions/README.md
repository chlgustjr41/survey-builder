# Cloud Functions

## Prerequisites
- Firebase project must be on the **Blaze (pay-as-you-go)** plan
- [Get a Resend API key](https://resend.com) (free tier: 3,000 emails/month)

## Setup

### 1. Set the Resend API key as a Firebase environment variable
```bash
firebase functions:secrets:set RESEND_API_KEY
# Paste your Resend key when prompted (re_xxxxxxxxx)
```

### 2. Update the sender address in `src/onResponseCreated.ts`
```typescript
from: 'Survey Builder <noreply@yourdomain.com>'
```
Replace `yourdomain.com` with a domain you've verified in Resend.
For testing, Resend allows sending from `onboarding@resend.dev`.

### 3. Deploy
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## How it works
- Triggers on every new write to `/responses/{surveyId}/{responseId}`
- Fetches the survey's `emailConfig` from the database
- If `emailConfig.enabled = true` and the responder provided an email, sends via Resend
- Sets `emailSent: true` on the response record after a successful send
