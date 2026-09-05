# web/

`magic-buyer.html` is the browser version — the whole tool in one self-contained
file, published as a Claude Artifact so Lauren can use it without installing
anything.

**Live:** https://claude.ai/code/artifact/7a848352-581e-4469-883c-dd4b8df867b1

It is not a copy of the Node app; it is a second front end over the same ideas,
built because installing Node turned out to be the real blocker. What it carries:

- The one-sentence buyer parser, the filter engine and the live count
- The fair housing screen, running on the typed description, the buyer note, and
  the finished copy
- The four channels, with Claude writing them when available and templates when not
- CSV loading with flexible column matching, so a title-rep farm list or a county
  export works unedited
- The CRMLS export, read once and used twice: actives excluded from Magic Buyer,
  expireds handed to Cannonball
- **Cannonball** — the home analysis report for listings that did not sell, with
  its own Code of Ethics screen
- Skip-trace CSV round trip, envelope labels, and letters as a print-ready PDF

Data stays in the browser. Nothing is uploaded anywhere.

## Editing it

Edit this file, then republish it to the same URL from a Claude Code session:
pass the URL above as `url` so it updates rather than creating a second artifact.
