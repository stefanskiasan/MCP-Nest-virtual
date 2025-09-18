# advisori_mcp_property_config (182 Zeilen)

Zweck: Dokumentation/Konfiguration von Tool‑Properties (z. B. `searchFields`, `returnFields`, `sortBy`, …) inkl. Beispiele/Items.

## Schema
- id: uuid NOT NULL DEFAULT gen_random_uuid() (PK)
- createdAt: timestamptz NOT NULL DEFAULT now()
- toolId: uuid NULL (FK → advisori_mcp_tool_config.id)
- propKey: text NULL
- description: text NULL
- examples: text[] NULL
- items: text[] NULL
- alias_name: text NULL

## Indizes/Constraints
- PRIMARY KEY (id)
- FOREIGN KEY (toolId) → advisori_mcp_tool_config(id)

## Beispiel‑Einträge (Auszug)
```json
[
  {
    "toolId": "9728e1b4-afa8-44d9-ad53-5d8289f066b6",
    "propKey": "searchFields",
    "items": ["SEGMENTCODE","SEGMENTDESCRIPTION"],
    "description": "SalesSegmentCodes searchable fields …"
  },
  {
    "toolId": "8a6ddc05-da49-4247-acb0-436b49c5ed23",
    "propKey": "searchFields",
    "examples": ["DeliveryAddressDescription","OrganizationName","CustomerAccount"],
    "description": "CustomersV3 – 315+ Felder für performante Suche"
  },
  {
    "toolId": "8a6ddc05-da49-4247-acb0-436b49c5ed23",
    "propKey": "returnFields",
    "examples": ["CustomerAccount","OrganizationName","AddressCity"],
    "description": "CustomersV3 – vollständiger Rückgabekatalog"
  },
  {
    "toolId": "2728e1b4-afa8-44d9-ad53-5d8289f066b6",
    "propKey": "searchValue",
    "examples": ["PURtech","000001","schwer entflammbar"],
    "description": "Produktsuche – case‑insensitive"
  },
  {
    "toolId": "9728e1b4-afa8-44d9-ad53-5d8289f066b6",
    "propKey": "returnFirst",
    "description": "Early‑Exit nach erstem Treffer"
  }
]
```

