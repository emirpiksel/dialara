# Clinic Call Management System

## Setup Instructions

1. Start the webhook server:
   ```bash
   npm run webhook
   ```

2. When the server starts, it will show you a public URL like:
   ```
   Public URL: https://xyz-123.loca.lt/webhook
   ```

3. Copy this URL and go to your Vapi dashboard

4. In Vapi:
   - Click on your AI agent
   - Go to the "Messaging" section
   - Paste the URL into the "Server URL" field
   - Save the changes

Now your system will:
- Receive call data from Vapi
- Store calls in your database
- Show call history in the dashboard
- Display agent information

The webhook server handles:
- Receiving call data
- Storing it in Supabase
- Real-time updates to your dashboard