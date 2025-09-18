# advisori_mcp_tool_transform (32 Zeilen)

Zweck: Request/Response‑Transformer (z. B. JavaScript) pro Tool/Direction zur Abbildung auf externe APIs (Graph, OData, SOAP, Redis …) und Rückformatierung.

## Schema
- id: uuid NOT NULL DEFAULT gen_random_uuid() (PK)
- tool_id: uuid NOT NULL (FK → advisori_mcp_tool_config.id)
- direction: text NOT NULL (CHECK: 'request' | 'response')
- lang: text NOT NULL (CHECK: z. B. 'js')
- version: integer NOT NULL DEFAULT 1
- code: text NOT NULL
- checksum: text NOT NULL
- is_active: boolean NOT NULL DEFAULT true
- created_at: timestamptz NOT NULL DEFAULT now()
- updated_at: timestamptz NOT NULL DEFAULT now()

## Indizes/Constraints
- UNIQUE (tool_id, direction) WHERE is_active
- FOREIGN KEY (tool_id) → advisori_mcp_tool_config(id)

## Beispiele (Auszug/gekürzt)
```json
[
  {
    "tool_id": "d34c4690-…",
    "direction": "request",
    "lang": "js",
    "is_active": true,
    "note": "Graph /me/mailFolders('inbox')/messages mit $top,$filter"
  },
  {
    "tool_id": "d34c4690-…",
    "direction": "response",
    "lang": "js",
    "is_active": true,
    "note": "Mappe Graph items → {id, subject, from, receivedAt, unread}"
  },
  {
    "tool_id": "5b8001cb-…",
    "direction": "request",
    "lang": "js",
    "is_active": true,
    "note": "Graph sendMail mit saveToSentItems"
  }
]
```

