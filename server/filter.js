// Filter engine. Turns criteria into a parcel match, and — just as importantly —
// into a live count.
//
// Every selection surface in the source tool shows a running count ("26
// properties found", "50 homes inside"). It is not decoration: with no target
// list size, watching the count is how the agent steers to a mailable number.

/** Point-in-polygon, ray casting. ring = [[lat, lon], ...] */
export function insidePolygon(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lonI] = ring[i];
    const [latJ, lonJ] = ring[j];
    const straddles = latI > lat !== latJ > lat;
    if (straddles && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI) inside = !inside;
  }
  return inside;
}

const R_MILES = 3958.8;
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in miles. */
export function distanceMiles(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.sqrt(a));
}

const n = (v) => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(x) ? x : null;
};

/**
 * @param {object[]} parcels
 * @param {object} c criteria from parse-buyer, plus optional area
 * @param {object} [opts]
 * @param {Set<string>} [opts.excludeAddresses] on-market / withdrawn, normalized
 * @returns {{matches: object[], count: number, excluded: object}}
 */
export function applyFilters(parcels, c = {}, opts = {}) {
  const excluded = { area: 0, criteria: 0, onMarket: 0 };
  const exclude = opts.excludeAddresses;
  const matches = [];

  for (const p of parcels) {
    // --- area, when one is drawn
    if (c.area) {
      const lat = n(p.lat), lon = n(p.lon);
      if (lat == null || lon == null) { excluded.area++; continue; }
      let inArea = true;
      if (c.area.type === 'polygon') inArea = insidePolygon(lat, lon, c.area.ring);
      else if (c.area.type === 'radius') {
        inArea = distanceMiles(lat, lon, c.area.lat, c.area.lon) <= c.area.miles;
      } else if (c.area.type === 'zips') {
        inArea = c.area.zips.includes(String(p.zip || '').trim());
      }
      if (!inArea) { excluded.area++; continue; }
    }

    if (!matchesCriteria(p, c)) { excluded.criteria++; continue; }

    // --- off-market: excludes actives, pendings AND withdrawn. A withdrawn
    // listing is still under an agency agreement — contacting that owner is a
    // violation, not a courtesy issue.
    if (exclude && exclude.has(normalizeAddress(p.address, p.zip))) {
      excluded.onMarket++;
      continue;
    }

    matches.push(p);
  }

  return { matches, count: matches.length, excluded };
}

export function matchesCriteria(p, c) {
  const between = (value, min, max) => {
    const v = n(value);
    if (v == null) return min == null && max == null;
    if (min != null && v < min) return false;
    if (max != null && v > max) return false;
    return true;
  };

  if (!between(p.value, c.price_min, c.price_max)) return false;
  if (!between(p.sqft, c.sqft_min, c.sqft_max)) return false;
  if (!between(p.lot_sqft, c.lot_min, c.lot_max)) return false;
  if (!between(p.year_built, c.year_built_min, c.year_built_max)) return false;

  // Beds and baths are minimums — "3 bed" means 3 or more.
  if (c.beds != null && (n(p.beds) ?? -1) < c.beds) return false;
  if (c.baths != null && (n(p.baths) ?? -1) < c.baths) return false;

  if (c.property_type && String(p.property_type || '').toLowerCase() !== c.property_type.toLowerCase()) return false;
  if (c.city && String(p.city || '').toLowerCase() !== c.city.toLowerCase()) return false;
  if (c.state && String(p.state || '').toUpperCase() !== c.state.toUpperCase()) return false;
  if (c.zip && String(p.zip || '').trim() !== String(c.zip).trim()) return false;
  if (c.owner_status && c.owner_status !== 'Any' && p.type !== c.owner_status) return false;

  if (c.years_owned && c.years_owned !== 'Any') {
    const min = parseInt(c.years_owned, 10);
    const owned = n(p.years_owned);
    if (!Number.isFinite(min)) return true;
    if (owned == null || owned < min) return false;
  }
  return true;
}

/** Occupancy from mailing vs situs address — the owner/absentee flag. */
export function deriveOwnerType(parcel) {
  const situs = normalizeAddress(parcel.address, parcel.zip);
  const mail = normalizeAddress(parcel.mail_addr, parcel.mail_zip ?? parcel.zip);
  if (!parcel.mail_addr) return 'Owner';
  return situs === mail ? 'Owner' : 'Absentee';
}

/** Loose normalization for address matching against an MLS export. */
export function normalizeAddress(address, zip) {
  const street = String(address || '')
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\b(street|str)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'av')
    .replace(/\b(drive)\b/g, 'dr')
    .replace(/\b(road)\b/g, 'rd')
    .replace(/\b(boulevard|blvd)\b/g, 'bl')
    .replace(/\b(lane)\b/g, 'ln')
    .replace(/\b(court)\b/g, 'ct')
    .replace(/\b(place)\b/g, 'pl')
    .replace(/\b(terrace)\b/g, 'ter')
    .replace(/\b(north|south|east|west)\b/g, (m) => m[0])
    .replace(/\s+/g, ' ')
    .trim();
  return `${street}|${String(zip || '').trim().slice(0, 5)}`;
}
