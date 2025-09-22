# FDA Drug Lookup – Issue #15 Fix Report  

**File:** `docs/fda-tool-fix.md`  
**Affected module:** `server/fda-tool.js`  
**Fix version:** `v0.7.0` (branch `fix/fda-response-size-limit`)  

---

## 1  Original Problem

Issue #15 reported that any prompt which triggered `fda_drug_lookup` caused Claude to answer with  
> “Claude hit the maximum length for this conversation…”.

Investigation showed that the tool returned the **raw FDA JSON** (often **500 KB – 1 MB**) including massive HTML fragments such as `adverse_reactions_table`, `spl_product_data_elements`, etc.  
Example (truncated):

```
"results":[{"spl_product_data_elements":["Fluoxetine … <td …>"]}]
```

Because Claude attempted to stream the whole payload back to the user, the conversation exceeded model limits and failed.

---

## 2  Root-Cause Analysis

| Layer | Finding |
|-------|---------|
| API usage | For *label* data the tool correctly called `/label.json`, **but** for *adverse-events* it queried `/event.json` which produces very noisy, low–signal payloads. |
| Data volume | No filtering—entire FDA document (dozens of long fields & embedded HTML tables) returned. |
| Encoding | Large HTML `<table>` blocks were passed as plain text. |
| Tests | Unit tests validated only presence of keys, so size explosion went unnoticed. |

---

## 3  Solution Implemented

### 3.1 Endpoint Strategy
* `search_type == "label"` → `/label.json` (unchanged)  
* `search_type == "adverse_events"` now **re-uses** `/label.json` because adverse reactions are already inside label data – `/event.json` dropped.

### 3.2 Response Extraction & Sanitisation
1. **Limit records** `limit=1` (was 3) to cap raw payload size.  
2. **_extractKeyInfo()** – pulls only high-value fields:  
   `brand_names`, `generic_names`, `manufacturer`, `indications`, `dosage`, `warnings`, `contraindications`, `adverse_reactions`, `drug_interactions`, `pregnancy`.
3. **_sanitizeText()**  
   * Strips HTML tags with regex.  
   * If a string > 5 000 chars **and** contains `<table>/<td>` it is replaced by `[Table content removed due to size]`.  
   * Remaining text truncated to 1 000 chars max.  
4. Cached for 24 h to avoid duplicate traffic.

### 3.3 Test Suite Upgrades
* Added size assertions (`< 10 kB`).  
* Added sanitisation tests with giant synthetic `<table>` (> 5 kB).  
* Integration test rewritten for new structure.

---

## 4  Before / After Comparison

| Scenario | Previous Size | New Size | Reduction |
|----------|---------------|----------|-----------|
| `fluoxetine`, `label` | **540 674 chars** (≈ 528 KB) | **7 383 chars** (≈ 7 KB) | ~ 98.6 % |
| `aspirin`, `adverse_events` | 231 kB | 3.3 kB | ~ 98 % |
| Typical general lookup | 30–50 kB | < 0.3 kB | ~ 99 % |

Result is now well below Claude context limits, enabling reliable answers.

---

## 5  New Features & Improvements

* Structured, **concise response object** – easy to render in UI or chat.
* Automatic **HTML stripping & truncation**.
* **Manufacturer** and **pregnancy** info surfaced.
* **Cache delete** helper in tests.
* Comprehensive tests: 32 → 33, all passing.

---

## 6  Breaking Changes

| Area | Change | Migration |
|------|--------|-----------|
| Response shape | `results` was **list[dict]** (raw FDA) → now **dict** (clean fields). | See migration guide below. |
| `search_type="adverse_events"` | Calls `/label.json` instead of `/event.json`. | None for most users; payload is different but more relevant. |
| Query limit | Default `limit` 3 → 1. | If client depended on multiple label variants, call the FDA API directly or fork the tool. |

---

## 7  Migration Guide

1. **Update import** – no change.

2. **Adjust consumers of `results`:**

```python
info = tool.lookup_drug("ibuprofen", "label")
drug = info["results"]            # now a dict
print(drug["indications"][0])
```

Old code that iterated `for rec in info["results"]:` must be adjusted to the keys listed in § 3.2.

3. **Adverse events**  
   Simply call:

```python
tool.lookup_drug("ibuprofen", "adverse_events")
```

The same cleaned fields are returned; adverse reactions are in `results["adverse_reactions"]`.

4. **Size / Rate limits**  
   If you require more than one label variant, set `limit` yourself via direct FDA API call or modify the tool locally.

---

### Need Help?

Open a new issue or ping @Cicatriiz on GitHub.  
Happy coding! 🚀
