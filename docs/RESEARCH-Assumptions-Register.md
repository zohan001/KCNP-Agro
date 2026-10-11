# KCNP Agro — Assumptions Register

**Purpose:** Audit every belief the KCNP Agro pitch treats as a fact, grade how well it is
proven, and define the cheapest way to prove or kill it. This is the direct answer to the
judges' first assignment ("what assumptions are you making?") and the due-diligence backbone
for investors.

**Companion documents:**
- `RESEARCH-Middlemen-Value-Chain-Map.md` (the second assignment)
- `RESEARCH-Brief-Judges-and-Investors.md` (2-page summary of both)

**Evidence legend**
- **Proven** — Kenyan/coastal-specific evidence exists and supports the claim.
- **Partial** — evidence exists but is off-region, old, or mixed.
- **Unproven** — no direct evidence; currently a guess. These are the dangerous ones.

**Kill-risk** = how badly the venture fails if the assumption is wrong. H / M / L.
**Min-size** = smallest missing hole (one sentence needed before a funder believes the claim).

All sources referenced as `[S#]` are listed at the end with links.

---

## 0. The headline (read this first)

The single most load-bearing assumption in the original pitch is:

> *"Farmers lose 30–50% of income to middlemen, so connecting them directly to buyers
> (eliminating middlemen) will raise their income."*

Both halves are **partly true and partly fatal**:

1. **The margin is real** — coastal/mango/horticulture farmers do sell at farm gate and
   capture a small share of final value (`[S1]`,`[S3]`). So the *problem* is real. ✅
2. **But "remove the middleman" is the exact strategy that has repeatedly failed in Kenya** —
   M-Farm, Twiga, Mkulima Young and most digital marketplace pilots either pivoted, shrank, or
   died, because the middleman also *is* the farmer's transport, storage, grading, buyer
   relationship **and cash advance** (`[S11]`,`[S12]`,`[S23]`,`[S24]`). ❌

**Therefore the assumption is not "middlemen are bad."** It is: *"a web marketplace can
replace the functions middlemen perform, at a lower cost, for farmers who mostly own feature
phones and need cash the same day."* That assumption, as written, is **Unproven and
High kill-risk.**

The rest of this document breaks that into testable pieces.

---

## 1. Demand-side / value-chain assumptions

| # | Assumption in the pitch | Status | Kill-risk | Cheapest way to test |
|---|---|---|---|---|
| A1 | Middlemen take 30–50% of the farmer's potential income | **Partial** — mango value chain: aggregators add only ~8% of value but earn ~22% gross margin; 80–95% of smallholder mango goes through middlemen `[S1]`. Horticulture farmers capture <30% of final value `[S3]`. | L (problem is real) | Already proven enough; quote precise sources, not "30–50%" loosely. |
| A2 | Farmers **want** to sell direct if given the chance | **Unproven** — only **8%** of Kenyan farmers used any digital marketplace to sell, and the study found **no strong farmer demand** for selling tools; demand is for information, peaking at selling time `[S11]`. | **H** | Interview 30 coastal farmers: "last 3 sales — to whom, at what price, paid when?" |
| A3 | Removing the middleman raises farm-gate price **without losing the buyer** | **Disproven as a strategy** — M-Farm's own lesson: "the root problem was not pricing transparency but that farmers produce in low volume and buyers don't want the hassle of multiple small farmers" `[S24]`. | **H** | Run one crop (mango) with 5 farmers + 3 buyers and measure delivered price *and* whether buyers return. |
| A4 | Buyers (traders, hotels, exporters) will buy small volumes direct from many smallholders | **Unproven / contrary evidence** — export/multinational buyers need consistent quality + volume; aggregators "absorb much of the value" precisely because they solve this `[S1]`. | **H** | Ask 10 Mombasa/Kongowea traders: "would you buy 50–200 kg direct, weekly, from a verified farmer?" |
| A5 | The middleman's cut is extraction, not payment for services | **Disproven** — middlemen provide aggregation, transport, storage, grading, market search, and pre-harvest **advance cash / credit** `[S13]`,`[S14]`,`[S15]`; farmers cite avoiding transport & market-search cost as why they sell at the gate `[S3]`. | **H** | Map the functions (see Value-Chain Map) and price each; then decide replace vs partner. |
| A6 | A flat subscription (KSh 800/mo) is affordable and acceptable to farmers | **Unproven / contrary** — smallholders often won't pay full cost for digital services (trust, shareable info); affordability is a named barrier in the draft national digital-ag policy `[S12]`,`[S30]`. | **H** | Price test with 30 farmers; ask "what did you pay last month for a phone/boda/input and why?" |
| A7 | Farmers will pay a subscription **before/at the point of selling** | **Unproven and internally inconsistent** — pitch says "free until first sale," the app gates posting behind a subscription. | **H** | Decide one model; test "free to list, pay after first trade" vs prepay. |
| A8 | Commission-free is better than a commission per trade | **Unproven** — Twiga's margin problems and the shift to asset-light/FMCG suggest per-unit economics, not pricing philosophy, decide survival `[S23]`. | M | Model both against one real trade's numbers. |

## 2. Farmer behaviour, literacy & device assumptions

| # | Assumption | Status | Kill-risk | Cheapest test |
|---|---|---|---|---|
| B1 | Coastal smallholders have a smartphone + data and will use a web app | **Partial** — Kenya smartphones ≈85% penetration of *devices*, but **feature phones are still ~30 million**; GSMA: only **53% of rural Kenyans own an internet-enabled phone**, **45%** adopt mobile internet, **24%** use it for diverse tasks `[S18]`,`[S20]`. | **H** | Ask 30 farmers directly: phone type, data spend, apps used. |
| B2 | A farmer can list produce "in under a minute" unaided | **Unproven** — literacy/numeracy limits digital use; farmers trade small quantities face-to-face `[S12]`. | M | Observed usability test: hand a phone to 10 farmers, time a listing with no help. |
| B3 | Swahili + English is enough for the target user | **Partial** — good for coast, but many rely on voice/WhatsApp and elder users prefer SiM. | M | Test with 10 farmers incl. 3 aged 55+. |
| B4 | Farmers will return repeatedly (retention), not just register once | **Unproven** — "high but inconsistent adoption": most digital-tool users don't use them across the season `[S11]`. | **H** | Instrument the live app: weekly active listers vs one-time registrations. |
| B5 | Climate-smart lessons will attract and hold farmers | **Unproven / contrary** — CSA adoption is driven by **yield, drought resilience, extension and access to credit**, not by content alone `[S28]`,`[S29]`. | M | Compare signups from education vs from a price/offer hook. |

## 3. Trust, verification & transaction assumptions

| # | Assumption | Status | Kill-risk | Cheapest test |
|---|---|---|---|---|
| C1 | ID + selfie verification builds enough trade trust | **Partial** — verification helps, but the binding constraint is delivery, quality and payment, not identity. | M | Ask traders what actually makes them buy from a new supplier. |
| C2 | Traders will transact with farmers they have never met | **Unproven** — informal trade runs on relationships and repeat dealing `[S12]`. | **H** | Pilot 1 crop with escrow/reputation and measure repeat rate. |
| C3 | One admin can verify users/quality at scale | **Unproven** | M | Track admin minutes per verified user; project to 1,000. |
| C4 | View/interest counts are a valid proxy for real demand | **Weak** — Marketplace activity ≠ trades; the pitch itself admits no completed-trade data is captured (see docs). | M | Add "mark as sold" and report actual traded volume. |
| C5 | Buyers will pay/pre-finance before delivery | **Unproven** — farmers need cash immediately after harvest; traders historically provide that cash `[S15]`. | **H** | Offer escrow pilot; measure how many buyers fund it first. |

## 4. Two-sided market (liquidity) assumptions

| # | Assumption | Status | Kill-risk | Cheapest test |
|---|---|---|---|---|
| D1 | 37 farmers + 13 traders + 52 listings is enough to clear trades | **Unproven** — thin two-sided markets fail on timing mismatch, not count. | **H** | Report listings→trades conversion; target one fully-cleared crop week. |
| D2 | Enough buyers and sellers are active **at the same time** | **Unproven** — the classic marketplace chicken-and-egg. | **H** | Demand-board pilot: post 20 buyer requests, see how many farmers respond. |
| D3 | Density in 3 counties (Msa/Kilifi/Kwale) is enough before expanding | **Partial** — sound focus strategy; county plans support market linkages `[S26]`,`[S27]`. | L | One-county, one-crop pilot with a stated liquidity target. |
| D4 | Wine of the two sides: charging farmers (supply) first is viable | **Unproven** — Twiga monetised the retail/FMCG side, not farmers `[S23]`. | M | Test a buyer-side premium (bulk alerts/verified supply) instead of farmer-only fees. |

## 5. Impact / climate / carbon assumptions

| # | Assumption | Status | Kill-risk | Cheapest test |
|---|---|---|---|---|
| E1 | "500+ farmers, 12 countries, 30 projects, 85 t CO₂" (Verdant deck) | **Contradicts your own traction numbers** (37 farmers / 13 traders). This is a **credibility kill-risk**, not just an accuracy one. | **H** | Align all decks to database-backed numbers only. |
| E2 | Carbon-credit revenue is achievable for smallholders | **Unproven** — aggregation + MRV costs are large; only viable at scale/cooperatives. | M | Treat as roadmap; scope MRV cost before promising income. |
| E3 | CSA practices will measurably cut post-harvest loss | **Partial** — PHL is caused mostly by *market/logistics* (85%), not farm practice `[S3]`; mango losses 25–44% `[S2]`. | M | Measure loss on pilot crop; expect gains only when coupled to logistics. |

## 6. Technical / operational assumptions

| # | Assumption | Status | Kill-risk | Cheapest test |
|---|---|---|---|---|
| F1 | Free tier (Render) + Atlas scales to 1,000+ users | **Unproven** — cold starts already visible; free tier sleeps. | M | Load test; budget the first paid tier. |
| F2 | Admin-verified M-Pesa payments scale | **Partial** — manual verification is fine for pilot, not for growth. | M | Time per verification; plan Daraja API. |
| F3 | A solo founder can run product + ops + verification + onboarding | **Unproven** — pitch itself names field officer as first hire. | M | Cost the first 2 hires into the ask. |
| F4 | Connectivity/browser support covers the coast (2G/3G, cheap phones) | **Partial** — 2G/3G coverage is ~98%, but device/literacy is the gap `[S19]`,`[S20]`. | M | Test on a KSh 5,000 phone over throttled 3G. |

## 7. Competition & moat assumptions

| # | Assumption | Status | Kill-risk | Cheapest test |
|---|---|---|---|---|
| G1 | "No one combines verified identity + CSA education + live insights + mobile money" | **Weakening** — close Kenyan competitors now exist: **AgriVesta** (listings + RFQs + M-Pesa escrow, 0% fee) and **TijaHub** (logistics + advisory + certification) `[S31]`. | **H** | Name them in the pitch; state your coastal-specific edge. |
| G2 | County agriculture offices will partner to onboard farmers | **Partial** — plans support market linkages/co-ops `[S26]`,`[S27]`; execution varies. | M | Get one written MOU/letter of intent before the finals. |
| G3 | Education content is a differentiator that others lack | **Weak** — iCow reaches 1.6M farmers with SMS/USSD extension `[S25]`; content alone is not a moat. | M | Position education as retention/appendix, not the core wedge. |

---

## 8. Top 10 kill-risks (if you remember nothing else)

1. **Only 8% of farmers use digital marketplaces to sell, and demand is weak** `[S11]`.
2. **Farmer volume is too small for buyers** — M-Farm's core finding `[S24]`.
3. **The middleman is the farmer's credit line** — removing him removes their cash `[S14]`,`[S15]`.
4. **Marketplace liquidity**: buyers and sellers not present at the same time.
5. **Willingness to pay** is low for shareable/trust-heavy digital info `[S12]`,`[S30]`.
6. **Retention** — one-time registration isn't traction `[S11]`.
7. **Device reality** — ~30M feature phones; only 53% of rural users own internet-capable phones `[S18]`,`[S20]`.
8. **Trust/disputes** in an anonymous direct trade with no escrow.
9. **Competition** already doing escrow + RFQ + logistics `[S31]`.
10. **Claim inconsistency** (500 farmers/12 countries vs 37/13) destroys judge trust.

---

## 9. 30-day validation plan (cheap, do-able before finals)

| Week | Experiment | Output metric | Kills/confirms |
|---|---|---|---|
| 1 | Interview 30 farmers (Msa/Kilifi/Kwale): last 3 sales, buyer, price, payment timing, phone, data spend | % who sold direct; median days-to-payment; % smartphone | A2, A6, B1, B4 |
| 1–2 | Trace **one mango** load farm-gate → Kongowea → retail; log every actor, cost, margin | margin split table | A1, A5 |
| 2 | Ask 10 traders/hotels: will you buy X kg direct, weekly, from verified farmers; what stops you | % yes; top 3 objections | A3, A4, C2 |
| 2–3 | Live price/offer test: 20 buyer requests posted, count farmer responses + completed deals | % listings that get an offer; # deals | D1, D2, C4 |
| 3–4 | Willingness-to-pay test: 3 price points, question after a real trade | % willing at each price | A6, A7, A8 |
| 4 | Align every public claim to DB counts; name AgriVesta/TijaHub | one consistent fact sheet | E1, G1 |

---

## Sources

- `[S1]` Harvard Kennedy School, *Unlocking the Kenyan Mango Value Chain* — https://www.hks.harvard.edu/sites/default/files/degree%20programs/MPAID/files/Bien,%20James%20&%20Isabella%20Soehn_SYPA.pdf (80–95% via middlemen; aggregators +8% value / 22% margin; value-added Ksh/kg 16-6-18-33-23-115, BCG KCDMS 2021; coast+eastern ≈90% of production).
- `[S2]` IFPRI/CGIAR, Ridolfi, Hoffmann & Baral (2018), *Post-harvest losses in fruits and vegetables: the Kenyan context* — https://cgspace.cgiar.org/items/871b609c-ef8c-4027-a13d-ccc15b748a9e (mango losses 25–44%, up to 60%).
- `[S3]` Frontiers in Horticulture (2024), *Unraveling smallholder food loss and value… Kiambu County* — https://www.frontiersin.org/journals/horticulture/articles/10.3389/fhort.2024.1474056/full (farmers capture <30% of value; 88%/79% sell to brokers; 96% no PH management; 15% trained; 85% PHL market-related; 17% storage).
- `[S4]` Daily Nation (2025-03-14), *Brokers, the Lords dictating Kenya's food prices* — https://nation.africa/kenya/business/brokers-the-lords-dictating-kenya-food-prices-4964448.
- `[S5]` AICCRA (2023), Kenya AgriHack — https://aiccra.cgiar.org/news/... (~40% of harvested crops lost/yr, USD 500M; maize 16.7%; horticulture up to 50%).
- `[S6]` WRI (2025), *Food loss and waste in maize, potato, fresh fruits and fish value chains in Kenya* (maize 20–36%; potato 19–23%).
- `[S7]` AFA, *Cashew Nuts* — https://www.afa.go.ke/cashew-nuts-nuts-oil-crops (counties; 2M trees; 23,058 ha; 8,331.69 MT/KES 744.9M in 2022; acreage falling on low farm-gate prices).
- `[S8]` KALRO via Kenya News Agency (2021) — coast cashew 10 kg/tree vs 70 potential; 14 varieties; 1,680 vs 500 kg/acre.
- `[S9]` AFA, *Coconuts* — https://afa.go.ke/coconuts-nuts-oil-crops (KES 12.2 bn, largely informal, ~10M palms).
- `[S10]` Nairobi Convention, *Sector Report on Coastal Agriculture* — https://www.nairobiconvention.org/... (6 counties = 17% of population; 6–8 ha farms; tree crops ~50% of arable land; middlemen exploit; food losses USD 4 bn/yr).
- `[S11]` 60 Decibels + Gates Foundation + Busara (2024), *Digital Farmer Services in Kenya: The Farmer Perspective* — https://agfundernews.com/smallholder-farmer-adoption-of-agtech-high-but-inconsistent-says-new-study-from-60-decibels-w-gates-foundation (>50% used a tool once; 46% info; **8% digital marketplace**; low demand for selling tools).
- `[S12]` CGIAR book chapter, *Digital innovations and agricultural transformation* — https://cgspace.cgiar.org/server/api/core/bitstreams/413e2dc2-7627-4036-bc75-d6aa1efce102/content (most innovations fail to scale; low WTP due to trust/shareability; literacy; mobile-money fees; farmers prefer cash).
- `[S13]` FSD Kenya (2023), *Evolving agricultural credit: a combi-model* — https://www.fsdkenya.org/article/evolving-agricultural-credit-a-combi-model-for-input-and-trade-financing.
- `[S14]` IGC working paper (Quartey et al. 2012), *Agricultural Financing and Credit Constraints* — https://www.theigc.org/sites/default/files/2014/09/Quartey-Et-Al-2012-Working-Paper.pdf (middlemen pre-harvest contracts / advance credit).
- `[S15]` WFP, *Pro-Smallholder Procurement* — https://cdn.wfp.org/... (immediate post-harvest cash needs; credit to pay members on delivery).
- `[S16]` FSD Kenya (2024), *Farmer Service Centres* — https://www.fsdkenya.org/blogs-publications/organising-smallholders-through-farmer-service-centres-what-role-can-finance-play (970 FSCs, 13 counties).
- `[S17]` Kenya News Agency (2024), Makueni aggregation centres (middlemen paid KSh 40 vs KSh 70 cost of production).
- `[S18]` Communications Authority of Kenya, Q1 FY2025/26 (Dec 2025) — https://www.ca.go.ke/index.php/mobile-broadband-use-surges-smartphone-penetration-climbs-ca-report-shows (smartphone penetration 85.2%, feature 57.9%; mobile money 92.8%; 4G = 84.8% of broadband).
- `[S19]` ITU DataHub, Kenya — https://datahub.itu.int/data?e=KEN (rural internet use 25% vs urban 56.6%; 2G/3G ~98%, 4G 97.3%).
- `[S20]` GSMA, *State of Mobile Internet Connectivity 2025* — https://www.gsma.com/somic/... (Kenya rural: 93% mobile ownership, 53% internet-enabled phone, 45% internet adoption, 36% daily, 24% diverse).
- `[S21]` CGIAR, *Cost Benefit Analysis of Agroecological Transition: Mango Value Chain in Kenya* (2024).
- `[S22]` MSU/Tegemeo, Kirimi et al., *Farm gate-to-consumer value chain analysis of Kenya's maize* — https://ageconsearch.umn.edu/bitstream/202597/2/WP44-A-Farm-Gate-to-Consumer-Value-Chain-Analysis-of-Kenya-M.pdf.
- `[S23]` Twiga Foods restructuring: TechCabal (2025-05-24) — https://techcabal.com/2025/05/24/twiga-foods-creates-holdco-lays-off-over-300-staff; Disrupt Africa (2025-06-11) — https://disruptafrica.com/2025/06/11/kenyas-twiga-foods-temporarily-suspends-nairobi-operations-amidst-business-overhaul.
- `[S24]` WSIS/Ashoka on M-Farm — https://www.itu.int/net4/wsis/stocktaking/Prizes/Prizes/Details/15440052798572445 and https://www.ashoka.org/en/fellow/jamila-abass (low volumes, buyers' hassle; brokers didn't use platform; site archived 2022).
- `[S25]` iCow — https://icow.co.ke/ (1.6M farmers; USSD/SMS/KaiOS distribution).
- `[S26]` Kilifi County CIDP 2023–2027 / Climate Change Action Plan 2023–2027 — https://maarifa.cog.go.ke/...
- `[S27]` Kwale County CIDP 2023–2027 / CADP FY2025-26 — https://kwale.go.ke/.
- `[S28]` EANSO, *Adoption Rate and Impacts of CSA Technologies in Semi-Arid Counties of Kenya* (2026) — https://journals.eanso.org/index.php/ajccrs/article/view/5006 (drivers: yield, drought resilience, extension).
- `[S29]` PMC (2021), *CSA practices in Masaba South, Kisii* — https://pmc.ncbi.nlm.nih.gov/articles/PMC8085708/ (adoption tied to income, credit access, extension).
- `[S30]` Ministry of Agriculture, *Kenya Agricultural Data, Information and Digital Policy* (draft, 2026) — https://www.kilimo.go.ke/wp-content/uploads/2026/03/Final-DRAFT-KENYA-AGRICULTURAL-DATA-INFORMATION-AND-DIGITAL-3.pdf (subscription fees = affordability barrier; digital divide).
- `[S31]` AgriVesta — https://agrivestakenya.co.ke/ ; TijaHub — https://tijahub.co.ke/ (RFQ/offers, M-Pesa escrow, 0% fee, logistics).
