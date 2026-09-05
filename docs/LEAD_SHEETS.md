# The FSBO / expired lead sheets — what is actually in them

Three files so far: 08/27/2026 and two copies of 09/04/2026. Deduped on
`(MLS Number, Address)` they come to **83 unique properties** — 56 cancelled,
27 expired. Two of the three files were the same pull.

## Contact coverage — this answers the email question

| | Count | Of 83 |
|---|---|---|
| At least one email | **70** | 84% |
| Total emails | 169 | ~2 per owner |
| At least one phone | 81 | 98% |
| At least one **clean** phone (not DNC-flagged) | 70 | 84% |
| Mail-only, every phone DNC-flagged | 11 | 13% |
| Carries an Estimated Value | 72 | 87% |
| Owner-occupied Y / N | 52 / 31 | |

The emails were already here. The earlier plan to skip-trace for owner email on
the RESO income properties still stands — the MLS never carries owner email — but
for anything that comes through these lead sheets, no skip trace is needed.

Note also that the lead sheet schema carries a full foreclosure block: instrument
number, recording date, lender, servicer, trustee, auction date, default amount.
It is empty on all 83 of these rows, which means the vendor populates it only
when the property is *also* in default. Worth watching — a property that appears
on both an expired list and a foreclosure list is a different conversation
entirely, and the app should join the two.

## South Bay — 5 of 83

| Status | City | Address | Ask | DOM | Owner | Contact |
|---|---|---|---|---|---|---|
| Cancelled | Lomita | 2067 Glentree Dr | $1,549,000 | 178 | Mubin Khan (occupies) | 2 clean phones, 2 emails |
| Cancelled | Rolling Hills Estates | 28121 Highridge Rd #311 | $650,000 | 172 | Mauricio De Lima Araujo (occupies) | **mail only** — both phones DNC, no email |
| Cancelled | Gardena | 1450 W 146th St #2 | $509,000 | 104 | Flor M Cordon (occupies) | 1 clean phone |
| Cancelled | Manhattan Beach | 845 11th St | $7,999,999 | 56 | Thomas Lenner — **absentee**, mails to 220 38th St | 1 clean phone, 2 emails |
| Cancelled | Hawthorne | 11610 Chanera Ave | $745,000 | 46 | Rodney D Locke (occupies) | 5 clean phones, 3 emails |

Every one of the five is **Cancelled, not Expired**. Cancelled means the seller
pulled it — which is a different motive than a listing that ran out. Some
cancellations are a seller giving up, some are a seller switching agents, and
some are a relist that will be back next week. The app already rules out the
ones that came back; the ones that stay gone are the list.

All five are asking at or near their Estimated Value, so "you were overpriced" is
the wrong opening on all of them.

## Cadence

These arrive roughly twice a week, not daily — 21 emails over 45 days in Gmail.
The 08/27 pull added two South Bay names the 09/04 pull did not have. So the
files are worth keeping and merging rather than treating each as the current
list; the dedupe key handles it.
