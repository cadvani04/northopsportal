# NorthOps Outreach MCP

MCP server for logging cold outreach touches (text + screenshots) into the NorthOps Sales CRM.

## Tools

| Tool | Description |
|------|-------------|
| `search_prospects` | Find prospects by company, contact, or email |
| `log_outreach` | Log a touch with notes and optional base64 screenshots |
| `get_outreach_queue` | List cold outreach accounts needing follow-up |
| `list_recent_touches` | Recent outreach history with attachments |

## Setup

1. Install dependencies from the repo root (database must be running):

```bash
cd mcp/outreach && npm install
```

2. Ensure `.env` in the project root has `DATABASE_URL` set (same as the Next.js app).

3. Optional: set `MCP_OWNER_USER_ID` to attribute logged touches to a specific user. Defaults to the first admin.

## Cursor configuration

Add to `.cursor/mcp.json` (or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "northops-outreach": {
      "command": "npx",
      "args": ["tsx", "mcp/outreach/src/index.ts"],
      "cwd": "/absolute/path/to/dashboardpt2",
      "env": {
        "DATABASE_URL": "your-postgres-url"
      }
    }
  }
}
```

## Example: log a LinkedIn touch with a screenshot

Use `log_outreach` with:

- `company`: `"Acme Corp"`
- `channel`: `"LINKEDIN"`
- `notes`: pasted message text
- `outcome`: `"SENT"`
- `images`: `["data:image/png;base64,..."]`

## Web portal

Use **Outreach Log** at `/sales/outreach` in the admin app for drag-and-drop screenshots and plain-text notes.
