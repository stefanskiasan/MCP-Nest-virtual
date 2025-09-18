# Health Reports (Zusammenfassung)

Quelle: Tabelle `advisori_mcp_health_report` (13 Einträge)

Hinweis: Vollständige Payloads sind sehr umfangreich (ERD, Scores, Findings, Scenarios). Nachfolgend eine verdichtete Übersicht der neuesten Berichte.

## 2025‑09‑15 20:50:54Z — Report a0b340c4‑… (server 67aa7ca9‑…)
- overall.grade: 4 (confidence 0.73)
- Kernaussagen:
  - Gute Playbooks/Beziehungsmodell, aber deutliche Lücken bei Enum‑/Feldabdeckung zentraler Properties (CustomersV3, ProductsV2, SalesProspects).
  - Mehrere abgeschnittene Tool‑Beschreibungen (z. B. search_redis_products, search_redis_pricecustomergroups).
  - Gemischte Sprachführung/uneinheitliche Benamung.
- Wichtige Findings (Auswahl):
  - Sehr geringe Enum‑Abdeckung CustomersV3.searchFields (19/317) und returnFields (66/303).
  - ProductsV2.returnFields: 0/31 beschrieben.
  - SalesProspects.searchFields/returnFields stark unterdokumentiert.

## 2025‑09‑15 20:42:54Z — Report 6b55dcfd‑… (server 67aa7ca9‑…)
- overall.grade: 4 (confidence 0.90)
- Kernaussagen:
  - Solide Struktur/Guidance, aber kritische Unterdeckung bei Enum‑Listen zentraler Tools.
  - Kontextgraph gut, dennoch Richtungsangaben teils missverständlich; ProductMasterNumber‑Inkonsistenz erwähnt.
- Wichtige Findings (Auswahl):
  - CustomersV3.searchFields 19/317, returnFields 66/303.
  - ProductsV2.returnFields 0/31.
  - SalesOrderHeaders.searchFields unvollständig (5/22).

## Empfehlungen (aus Berichten abgeleitet)
- Enum‑/Feldkataloge für zentrale Tools (CustomersV3, ProductsV2, SalesProspects) vervollständigen (Ziel ≥70 %).
- Abgeschnittene Tool‑Beschreibungen korrigieren (insbes. search_redis_products, search_redis_pricecustomergroups).
- Relationstexte präzisieren (FK→PK, Kardinalitäten) und Sortier/Limit‑Parameter formal typisieren.

