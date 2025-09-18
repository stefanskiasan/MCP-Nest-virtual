# advisori_mcp_health_report (13 Zeilen)

Zweck: Persistierte Qualitäts-/Gesundheitsberichte für MCP‑Server (Scores, Findings, ERD‑Hinweise) als JSON.

## Schema
- id: uuid NOT NULL DEFAULT gen_random_uuid() (PK)
- server_id: uuid NOT NULL (FK → advisori_mcp_server.id)
- overall_grade: integer NOT NULL
- payload: jsonb NOT NULL (umfangreiche Struktur mit ERD, scores, findings, scenarios, …)
- created_at: timestamptz NOT NULL DEFAULT now()

## Indizes
- advisori_mcp_health_report_pkey (btree id)
- advisori_mcp_health_report_server_id_idx (btree server_id)

## Beispiel (gekürzt)
```json
{
  "id": "a0b340c4-1fd2-4d43-a6cc-21c7909b6c98",
  "server_id": "67aa7ca9-bb66-464b-8c8c-a9018aa25c17",
  "overall_grade": 4,
  "created_at": "2025-09-15T20:50:54Z",
  "payload": {
    "overall": { "grade": 4, "confidence": 0.73 },
    "findings": [
      { "id": "customersv3-searchFields-coverage", "severity": "high" },
      { "id": "productsv2-returnFields-coverage", "severity": "high" }
    ]
  }
}
```

Siehe auch: Zusammenfassung der neuesten Reports in `health/README.md`.

