# Status — the four tactics, side by side

The first three are Jimmy Mackin's. The fourth is ours. All four live in the same
artifact: https://claude.ai/code/artifact/7a848352-581e-4469-883c-dd4b8df867b1

| Tactic | What it is | Built? | What it needs from Lauren to mail the first letter |
|---|---|---|---|
| **Magic Buyer** | One real buyer → letter to every matching homeowner in a drawn area. *"I have a buyer for your street."* Non-distress. | Yes | **Realist export for area 128 (Riviera)** — owner, mailing address, APN, beds/baths/sqft, year built, last sale, estimated value. Then draw, filter, generate, mail. |
| **Cannonball** | Expired and cancelled listings, ranked by days on market, ruled out against what has since sold or come back. | Yes | **Nothing.** The lead sheets already carry 83 properties with names, mailing addresses, and emails on 84%. Five are South Bay. Mail them. |
| **Deal of the Week** | One real listing per week, sent to the owners around it. | Yes | A real listing from CRMLS each week. (The Vista Del Mar one was a test fixture, not real.) |
| **Foreclosure** | NOD/NOT filings, sorted, flagged, with an options-not-opportunity letter and a VIP code that lands on getyourhomeoptions.com. | **Not yet** — analysis and two letter drafts are done; the mode is specified in BUILD_NOTES and not built. | Broker's four answers (see below). Then the 4 remaining South Bay filings get the letter at the address on file. |

## This week — seven contacts, zero research

1. **Tuesday:** Audrey Ave. Check 833-561-0243 (file 00000010810489), then call
   (310) 791-5200. Script in `letters/foreclosure_drafts.md`.
2. **This week:** mail the 11th Street letter to Milan Botica. Same file.
3. **This week:** mail the five South Bay Cannonball letters from the lead sheets —
   Glentree (Lomita), Highridge #311 (RHE), 146th St (Gardena), 11th St
   (Manhattan Beach, absentee — mails to 220 38th St), Chanera (Hawthorne).
   All at or near estimated value, so the letter does not say "overpriced."

## Next — the Riviera buyer

Realist export for area 128, uploaded to Magic Buyer mode. This is the one that
most resembles the paid tool and it is the one that has never run. It is one
export away.

## Then — the foreclosure mode

Build it to the spec in BUILD_NOTES: join by APN, flag reverse mortgages, HOA
liens, stale owners, and auctions inside the mail window; mint VIP codes;
produce three letter variants. Verification against the recorder happens when
someone responds, not before.

## Broker email — send once, covers everything distress

> I want to prospect homeowners with recorded NODs and trustee sale notices in
> the South Bay and list the ones that make sense to sell.
> 1. Any required disclosure or addendum on a listing with a recorded notice?
> 2. Required form for third-party authorization to speak with a servicer?
> 3. Broker review needed before soliciting an owner in foreclosure?
> 4. If I bring an investor buyer, that buyer is an equity purchaser under Civil
>    Code §1695 — five-business-day rescission, required contract and notice.
>    What form does eXp want, and does E&O cover me on that side?

## Struck, and why

- **2414 Alvord Ln** — sold 08/19/2026, lien reconveyed. Filing was already over.
- **23030 Kathryn Ave** — owner of record is a licensed salesperson and loan
  officer at the foreclosing lender. Not a lead.
- **Four HOA liens** — Carson ×2, Hawthorne, Redondo N PCH. Four-figure
  association liens, not mortgage defaults. Not distress.

## Rules learned this week, now in the docs

- Key on **APN**, never on address. (`docs/FORECLOSURE.md`)
- Lead-sheet owner names are stale in both directions. (`docs/FORECLOSURE.md`)
- A HECM records a companion $1 deed of trust to HUD; also `loan ÷ 1.5` = the
  FHA limit for the origination year. Suppress LTV on those rows.
  (`docs/REVERSE_MORTGAGE.md`)
- Recorded documents carry death certificates. Read for status only. Never
  into a letter or export. (`BUILD_NOTES.md`)
- Contact vendors: not yet. The gap was 9 records, not 99. (`BUILD_NOTES.md`)
