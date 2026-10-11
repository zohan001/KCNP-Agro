# KCNP Agro — Middlemen Value-Chain Map (Coastal Kenya)

**Assignment answered:** *"Map the role of middlemen."* This document shows who stands
between the coastal farmer and the final buyer, **what each one actually does**, what they earn,
and which of their functions a software platform can replace versus must partner with.

**Thesis in one line:** the middleman is not a fee — he is a bundle of services (aggregation,
transport, grading, storage, price knowledge, and **cash advance**). A platform that deletes
him without replacing those services loses the farmer's buyer, transport and credit — which is
why most "remove the middleman" projects fail. KCNP Agro's defensible position is to
**digitise the information layer and make the chain accountable**, not to pretend the physical
and financial layers do not exist.

Companion: `RESEARCH-Assumptions-Register.md`. Sources `[S#]` listed at the end.

---

## 1. The coastal basket at a glance

Coastal Kenya = Kwale, Mombasa, Kilifi, Tana River, Lamu, Taita Taveta (~17% of Kenya's
population). Farms average **6–8 ha**; tree crops (cashew, coconut, citrus, mango) cover about
**50% of coastal arable land**; the region is largely rain-fed and salinity-prone `[S10]`.

| Crop | Where (coast) | Scale / value | Structure of the chain | Key weakness |
|---|---|---|---|---|
| **Mango** | Kilifi, Kwale, Mombasa hinterland | Coast + Eastern = ~90% of national output; main varietals Ngowe & Apple (coast 66%/53%) | Farm → broker → aggregator → Kongowea → wholesaler → retailer/hotel; some processor/export | 80–95% of smallholder mango sold via middlemen; PHL 25–44% `[S1]`,`[S2]` |
| **Cashew** | Kilifi (biggest), Kwale, Lamu, Tana River | ~2M trees; 23,058 ha; ~8,332 MT / KES 744.9M (2022) | Farm → village buyer → processor/exporter (mostly raw export) | Acute low farm-gate prices → farmer apathy, acreage falling, processors closed `[S7]`,`[S8]` |
| **Coconut** | Kilifi, Kwale, Mombasa, Lamu, Tana River, Taita Taveta | ~10M palms; ~KES 12.2 bn, largely **informal** `[S9]` | Farm → local buyer → small processors (oil, body butter) → retail/export | Little value addition on the coast; informal pricing |
| **Maize** | Kilifi, Kwale, Tana River (mostly subsistence/ASAL) | Deficit region, imports from highlands | Farm → local trader → wholesaler → posho miller/retail | Low volumes, price volatility, 20–36% loss `[S22]`,`[S6]` |
| **Rice** | Tana River delta, Kwale (irrigated schemes) | Irrigation-based; local miller | Farm → miller → wholesaler → retail | Scheme/co-op structure, import competition |

**Reality check on the market:** Kongowea (Mombasa) is the coast's largest wholesale/retail
produce market and **sets reference prices for the region**, but a large share of what sells
there arrives from **central Kenya, the Rift Valley and cross-border Tanzania/Uganda** — not
the coast `[S32]`. Coastal mango for Kongowea peaks **November–February** `[S32]`. So coastal
farmers compete against highland supply in their own biggest market; timing and price
transparency matter as much as access.

---

## 2. The chain and its actors (generic)

```
 FARM GATE
    │  (sells spot, cash, no search cost)                      ┌────────────┐
    ▼                                                          │  ADVISORY  │
 VILLAGE / FARM-GATE BROKER  ──advance cash, buys any volume──▶│  extension │
 ("mchuruzi")             ──links to buyer, takes margin──┐    │ / agro-dealer
    │                                                      │    └────────────┘
    ▼                                                      │
 LOCAL COLLECTOR / AGGREGATOR  ── bulks, sorts, sometimes stores
    │
    ▼
 TRANSPORTER (pickup / matatu / boda)  ── moves load to market
    │
    ▼
 WHOLESALE MARKET (e.g. Kongowea) ── commission agent / broker on the floor
    │
    ├──────────────▶ WHOLESALER ──▶ RETAILER / KIOSK / VENDOR ──▶ CONSUMER
    │
    ├──────────────▶ PROCESSOR (oil, crisps, nuts, posho mill) ──▶ CONSUMER / EXPORT
    │
    └──────────────▶ HOTELS / RESORTS / SUPERMARKETS / EXPORTERS (via aggregator)
```

Two actors the foten-missed but important:
- **The transporter** — even when a farmer "sells direct," someone must physically move
  perishable produce quickly. This is a cost and a risk no website removes.
- **The financing actor** — the broker/wholesaler who pays **before or at harvest**. In
  Kenya (and across SSA), middlemen extend pre-harvest contracts and advance credit because
  formal banks won't lend to smallholders `[S13]`,`[S14]`,`[S15]`. **This is the function
  that most "disintermediation" projects accidentally destroy.**

---

## 3. Actor-by-actor function table

| Actor | What they actually provide | How they're paid | Replace by software? | KCNP strategy |
|---|---|---|---|---|
| Farm-gate broker | Finds buyer, buys any volume, **pays cash today**, absorbs first-mile hassle | Margin on resale | **No** | **Verify + rate as an "aggregator partner"**; expose their margin |
| Local collector / aggregator | Bulking, basic sorting, sometimes storage | Margin / fee | Partially (matching, not bulking) | Register collection points; enable group listings |
| Transporter | Physical haulage, speed (perishability) | Per load/trip | **No** | Transport/collection-point registry; partner logistics |
| Market commission agent | Price discovery on the floor, buyer relationships | Commission | Partially (transparency) | Publish reference prices (`Price Board`) |
| Wholesaler | Bulk, storage, risk-bearing, credit to retailers | Margin | **No** | Off-take/partner role |
| Processor | Value addition (oil, nuts, mill) | Product margin | **No** | Channel raw supply via verified listings |
| Retailer/hotel/exporter | Final demand, quality standards | Product margin | **No** (but reachable directly) | Buyer accounts + bulk demand requests |
| **Credit provider** (overlaps broker/wholesaler) | **Advance cash / inputs before harvest** | Interest embedded in price | **Not alone** | Off-take reservation + escrow with a finance partner (SACCO/fintech) — roadmap |
| KCNP Agro | Information, matching, reputation, traceability, payment rails | Subscription/featured | — | **Owns the information layer only** |

---

## 4. Function matrix — what a platform can and cannot replace

| Function | Nature | Can KCNP do it? | Why |
|---|---|---|---|
| Price discovery / market information | Digital | ✅ **Yes (core)** | `Price Board` from real listings + trades |
| Matching farmers ↔ buyers | Digital | ✅ **Yes (core)** | Marketplace + demand board + offers |
| Verification / reputation / trust | Digital + fieldwork | ✅ Partly | ID verification + ratings after trades |
| Demand aggregation (signal) | Digital | ✅ Yes | Buyer requests show what to grow and when |
| Traceability (farm→lot→buyer) | Digital + process | ✅ Partly | Batch fields; enables premium/export |
| Payment / escrow | Financial | ⚠️ With partner | M-Pesa/Daraja + escrow; fee sensitivity `[S12]` |
| Assembly / bulking small volumes | Physical | ❌ Partner | Needs collection centres (cf. Makueni's 63 centres `[S17]`) |
| Transport / cold chain | Physical | ❌ Partner | Roads, trucks, cooling `[S3]` |
| Storage / grading / packaging | Physical | ❌ Partner | 83% of farmers lack storage `[S3]` |
| Working capital / advance credit | Financial | ❌ Partner | The middleman's killer feature `[S13]`,`[S14]`,`[S15]` |
| Risk-bearing (spoilage, default) | Financial | ❌ Partner/insurance | Needs a balance sheet KCNP doesn't have yet |
| County cess / KEBS / export compliance | Regulatory | ❌ Facilitate | Link buyers to compliant aggregators |

**Conclusion:** a pure marketplace can only credibly own ~4–5 of the 12 functions. The other
7 must be **partnered**, not promised. That is the difference between KCNP and the 40 projects.

---

## 5. Per-crop: who captures what

### Mango (the flagship)
BCG/KCDMS (2021), cited in `[S1]`, shows value added per kg along the chain:

| Stage | Value added (Ksh/kg) | Share of total |
|---|---|---|
| Production (farmer) | 16 | 22% |
| Aggregation | **6** | **8%** |
| Wholesale | 18 | 25% |
| Packhouse | 33 | 45% |
| Distribution | 23 | 68%* |
| Retail | 115 | 77%* |
| **Total** | **115** | — |

\*shares as reported; the headline finding is the asymmetry: **aggregators add only ~8% of
value but earn ~22% gross margin** `[S1]`. The farmer's problem is not only the aggregate
margin — it is that they sell **spot at the gate with no alternative buyer and no information**,
so they are price-takers `[S3]`. Coastal varietals (Ngowe, Apple) are poorly suited to the
high-value export market (which wants Tommy Atkins/Kent), so "just export it" is not a quick
fix `[S1]`.

### Cashew
Low farm-gate prices have caused **farmer apathy and falling acreage**, with processors
closing for lack of volume `[S7]`. Productivity is 10–30 kg/tree against a 70 kg potential
`[S8]`. Implication: **the binding constraint is price + productivity, not just market
access** — a marketplace that raises price will help only if volumes and quality follow.

### Coconut
~KES 12.2 bn, mostly informal `[S9]`. Value addition (oil, cosmetics, food) happens off-coast.
Opportunity: channel coastal raw nuts to local processors (e.g. Nala Foods) `[S33]`.

### Maize & rice
Low-volume, staple, price-volatile; the farm-gate→miller/wholesaler chain has thin margins
relative to horticulture, and coastal production is a deficit market `[S22]`. These crops are
useful for food security and volume aggregation but weak for a commission/subscription model.

---

## 6. Why projects like this fail (the 40+ problem)

| Failure pattern | Evidence | What it means for KCNP |
|---|---|---|
| **Information ≠ the bottleneck** | M-Farm: "the root problem was not pricing transparency but low volume and buyers' hassle" `[S24]` | Don't sell information alone; solve aggregation or demand |
| **Low, fragmented volume** | Smallholders <2 acres; average coastal farm 6–8 ha mixed `[S10]` | Bulk via groups/collection points; demand-led |
| **Logistics eats the margin** | Twiga (own trucks + 200,000 sq ft DC) cut 40% of staff, suspended Nairobi ops, pivoted from fresh produce to FMCG `[S23]` | Do not own logistics early; partner |
| **No working capital for farmers** | Middlemen provide advance cash; farmers need same-day money `[S14]`,`[S15]` | Escrow/off-take + finance partner are mandatory, not optional |
| **Trust & quality disputes** | Direct trades lack grading/weighing/recourse `[S3]` | Ratings, verification, dispute flow |
| **Channel mismatch** | Only ~53% of rural Kenyans own an internet phone `[S20]`; iCow won on USSD/SMS `[S25]` | Web + WhatsApp/USSD assist; field onboarding |
| **Weak willingness to pay** | Shareable info; affordability a named barrier `[S12]`,`[S30]` | Charge for transactions/value, not info |
| **No completed-trade data** | KCNP's own gap; view counts ≠ trades | Capture "mark as sold" and rating after every trade |
| **Donor/subsidy dependence** | Many pilots die post-grant `[S12]` | Revenue from day one of the pilot |
| **Competition already deeper** | AgriVesta (RFQ + escrow), TijaHub (logistics + certification) `[S31]` | Differentiate on coast specificity + aggregator accountability |

---

## 7. Strategic options

| Option | What it means | Risk | Verdict |
|---|---|---|---|
| **A. Disintermediation** | Bypass middlemen entirely; farmer sells to strangers online | **Very high** — loses credit, transport, buyer; proven failure mode | ❌ Not as the core model |
| **B. Re-intermediation** | KCNP becomes the aggregator (own/buy, store, truck) | High capital, thin margins | ⚠️ Only where a buyer contract exists |
| **C. Verified-aggregator network** | Partner with existing brokers/collectors; verify, rate, expose margins; farmer chooses | Low capex, uses existing logistics & credit | ✅ **Recommended core** |
| **D. Demand-led aggregation (hybrid)** | Aggregate only against a confirmed buyer order (RFQ first) | Moderate; matches supply to real demand | ✅ **Recommended operating rule** |
| **E. Transparency-first** | Start with price board + demand board, capture trades, add escrow later | Low; builds trust & data | ✅ Phase 1 |

**Recommended model = C + D + E:** *transparency and choice first, aggregation only against
confirmed demand, and middlemen re-framed as verified, rated service providers instead of
enemies.* This is also **already consistent with your own slide-notes** ("we're not removing
traders — we're giving farmers choice") — but it **contradicts your submission form and
elevator pitch**, which still say "eliminating middlemen." Fix the language everywhere.

---

## 8. How KCNP Agro maps onto the map (feature → function)

| Middleman function | KCNP feature (P0 = build now) | Judge/DD message |
|---|---|---|
| Price discovery | **Price Board** (P0) — asking/paid prices per crop, farm-gate vs Mombasa | "We expose the margin they used to hide" |
| Farmer choice (breaks the monopoly) | **Offers/Quotes on a listing** (P0) | "Three buyers bid; the farmer picks" |
| Demand visibility | **Demand Board** (P1) — buyers post needs | "We only aggregate against real demand" |
| Trust / reputation | **Ratings + verified buyers** (P0) | "Every trade builds a reputation both sides can see" |
| Proof of real trade | **Mark as sold** (P0) | "We report trades, not listings" |
| Physical logistics | Transport / collection-point registry (P1) | "Partnered, not pretended" |
| Credit | Off-take reservation → escrow (P2) | "Roadmap with a finance partner" |

---

## Sources (new in this document)

- `[S32]` Kongowea Market overview & trade — Divisi (https://divisi.africa/markets/kenya/kongowea-market) and Huduma Global (https://hudumaglobal.com/blog/kongowea-market-mombasa-fresh-produce-trade-hub): coast's largest wholesale/retail produce hub, sets regional reference prices, supply from central Kenya/Rift Valley/cross-border, mango peak Nov–Feb.
- `[S33]` Daily Nation / Seeds of Gold, *How former banker is creating wealth, jobs from coconut farming* (2026-05-15): Nala Foods Africa coconut value addition, coast.

All other sources `[S1]`–`[S31]` are listed in `RESEARCH-Assumptions-Register.md`.
