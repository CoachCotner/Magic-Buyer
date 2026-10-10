// Avery 5160 / 8160 label sheet from a labels CSV.
// usage: node tools/labels-avery.mjs lists/out/90503_labels.csv lists/out/90503_LABELS.pdf [--no-re]
// 30 per sheet, 3 columns x 10 rows, 1in x 2.625in, top margin 0.5in, left 0.1875in, column gap 0.125in.
// Columns used: name, entity, address, city_state_zip. "Owner" as a name falls back to the entity.
import { parse } from 'csv-parse/sync';
import PDFDocument from 'pdfkit';
import fs from 'fs';
const [,, inCsv, outPdf, ...flags] = process.argv;
const showRe = !flags.includes('--no-re');   // --no-re drops the small 'Re: <address>' line at the bottom of each label
if(!inCsv||!outPdf){ console.error('usage: node tools/labels-avery.mjs <labels.csv> <out.pdf>'); process.exit(1); }
const rows=parse(fs.readFileSync(inCsv,'utf8'),{columns:true,bom:true});
const IN=72, W=2.625*IN, H=1*IN, TOP=0.5*IN, LEFT=0.1875*IN, GAP=0.125*IN, PAD=0.14*IN;
const doc=new PDFDocument({size:'LETTER',margin:0}); doc.pipe(fs.createWriteStream(outPdf));
doc.font('Helvetica').fillColor('#111');
const name=r=>{ if(r.name&&r.name!=='Owner') return r.name; const e=(r.entity||'').split(' / ')[0]; return e||'Owner'; };
rows.forEach((r,i)=>{
  const k=i%30; if(i>0&&k===0) doc.addPage();
  const col=k%3, row=Math.floor(k/3);
  const x=LEFT+col*(W+GAP)+PAD, y=TOP+row*H+PAD;
  const lines=[name(r), r.address, r.city_state_zip].filter(Boolean);
  let size=9.5; if(lines[0].length>34) size=8.5; if(lines[0].length>42) size=7.5;
  doc.fillColor('#111').fontSize(size).text(lines.join('\n'),x,y,{width:W-2*PAD,height:H-2*PAD,lineGap:0});
  if(showRe&&r.re){ const re=String(r.re).split(';')[0].trim()+(String(r.re).includes(';')?' +':'');
    doc.fillColor('#555').fontSize(6.5).text('Re: '+re,x,y+H-2*PAD-7,{width:W-2*PAD,height:8,lineBreak:false}); }
});
doc.end();
console.log('labels:',rows.length,'| sheets:',Math.ceil(rows.length/30));
