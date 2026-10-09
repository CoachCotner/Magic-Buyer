// Title-rep CSV → normalized recipient list with size tier, occupancy, owner kind, recent-sale flag, portfolio grouping.
// usage: node tools/ingest-title.mjs <title.csv> <out.csv> [label]
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
const [,, inCsv, outCsv, label='list'] = process.argv;
const rows=parse(fs.readFileSync(inCsv,'utf8'),{columns:h=>h.map(x=>x.trim()),skip_empty_lines:true,relax_column_count:true,bom:true,relax_quotes:true});
const n=v=>{const x=parseFloat(String(v??'').replace(/[$,]/g,''));return Number.isFinite(x)?x:0;};
const tidy=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>tidy(s).toUpperCase().replace(/[.,#]/g,' ').replace(/\b(APT|UNIT|STE)\b/g,'').replace(/\s+/g,' ').trim();
const m=new Map(); for(const r of rows){const k=r['APN - UNFORMATTED']||r['APN - FORMATTED'];if(k&&!m.has(k))m.set(k,r);}
const occ=r=>norm(r['SITUS STREET ADDRESS']).replace(/\s[A-Z]$/,'')===norm(r['MAILING STREET ADDRESS']).replace(/\s[A-Z]$/,'')&&String(r['MAIL ZIP/ZIP+4']).slice(0,5)===String(r['SITUS ZIP CODE']).slice(0,5);
const yr=r=>{const x=String(r['LMS-RECORDING DATE']).match(/(\d{4})/);return x?+x[1]:null;};
const est=r=>{const sf=n(r['LIVING AREA']),bd=n(r['NUMBER OF BEDROOMS']);const byBd=bd>=99?null:Math.round(bd/1.4);const bySf=Math.round(sf/850);return byBd&&bySf?Math.round((byBd+bySf)/2):(bySf||byBd||0);};
const kind=o=>/\b(LP|L P|PARTNERS|APARTMENTS|APTS|COMMUNITY|VILLAS|MANOR|PMB|INC|CORP)\b/i.test(o)?'institutional':/\b(LLC|L L C|LTD|PROPERTIES|INVESTMENTS|VENTURES|HOLDINGS|EQUITIES|GROUP|COMPANY)\b/i.test(o)?'entity':/\b(TRUST|TR|TRS|QTIP|DECD)\b/i.test(o)?'trust':'individual';
const cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-18);
const out=[...m.values()].map(r=>{
  const u=est(r), d=r['LMS-RECORDING DATE']?new Date(r['LMS-RECORDING DATE']):null;
  const soldRecent=d&&d>=cutoff&&n(r['LMS-SALE PRICE'])>0;
  return {apn:r['APN - FORMATTED']||r['APN - UNFORMATTED'],address:tidy(r['SITUS STREET ADDRESS']),city:r['SITUS CITY'],state:r['SITUS STATE']||'CA',zip:String(r['SITUS ZIP CODE']).slice(0,5),
    owner:tidy(r['OWNERS (ALL)']),owner_kind:kind(r['OWNERS (ALL)']),value:n(r['ASSESSED TOTAL VALUE'])||'',type:occ(r)?'Owner':'Absentee',
    mail_addr:tidy(r['MAILING STREET ADDRESS']),mail_city:r['MAIL CITY'],mail_state:r['MAIL STATE'],mail_zip:String(r['MAIL ZIP/ZIP+4']).slice(0,5),
    beds:r['NUMBER OF BEDROOMS'],baths:r['NUMBER OF BATHS'],sqft:n(r['LIVING AREA'])||'',lot_sqft:n(r['LOT AREA'])||'',year_built:r['YEAR BUILT'],
    last_sale_date:r['LMS-RECORDING DATE'],last_sale_price:n(r['LMS-SALE PRICE'])||'',years_held:yr(r)?new Date().getFullYear()-yr(r):'',
    est_units:u,tier:u<=1?'1':u<=4?'2-4':u<=9?'5-9':u<=14?'10-14':u<=50?'15-50':u<=100?'51-100':'100+',
    on_market:soldRecent?'sold recently':'off market',market_note:soldRecent?`TITLE: sold ${r['LMS-RECORDING DATE']} $${n(r['LMS-SALE PRICE']).toLocaleString()}`:''};
});
const c=(f)=>{const o={};out.forEach(r=>{o[f(r)]=(o[f(r)]||0)+1});return o;};
console.log(label,'| rows',rows.length,'| unique APN',out.length);
console.log('tier',JSON.stringify(c(r=>r.tier)));
console.log('type',JSON.stringify(c(r=>r.type)),'| owner_kind',JSON.stringify(c(r=>r.owner_kind)));
console.log('sold in last 18 mo:',out.filter(r=>r.on_market!=='off market').length);
const g=new Map(); out.forEach(r=>{const k=(norm(r.mail_addr)+'|'+r.mail_zip);if(!g.has(k))g.set(k,[]);g.get(k).push(r);});
console.log('mailing addresses:',g.size,'| portfolios (2+ buildings):',[...g.values()].filter(x=>x.length>1).length);
out.sort((a,b)=>(+b.years_held||0)-(+a.years_held||0));
fs.writeFileSync(outCsv,stringify(out,{header:true}));
console.log('\nLLC / ENTITY OWNERS (need lookup):');
const seen=new Set(); out.filter(r=>r.owner_kind==='entity'||r.owner_kind==='institutional').forEach(r=>{const k=r.owner.toUpperCase();if(seen.has(k))return;seen.add(k);console.log('  ',r.owner,'|',r.address,'| mails to',r.mail_city,r.mail_state);});
console.log('\nTRUST / INDIVIDUAL (parse from title):');
const seen2=new Set(); out.filter(r=>r.owner_kind==='trust'||r.owner_kind==='individual').forEach(r=>{const k=r.owner.toUpperCase();if(seen2.has(k))return;seen2.add(k);console.log('  ',r.owner,'|',r.address);});
