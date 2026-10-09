// Sheet of identical return-address labels on Avery 5160 / 8160 (30 per sheet).
// usage: node tools/return-labels.mjs <out.pdf> "line 1" "line 2" ["line 3"]
import PDFDocument from 'pdfkit';
import fs from 'fs';
const [,, outPdf, ...lines] = process.argv;
if(!outPdf||!lines.length){ console.error('usage: node tools/return-labels.mjs <out.pdf> "line 1" "line 2"'); process.exit(1); }
const IN=72, W=2.625*IN, H=1*IN, TOP=0.5*IN, LEFT=0.1875*IN, GAP=0.125*IN, PAD=0.14*IN;
const doc=new PDFDocument({size:'LETTER',margin:0}); doc.pipe(fs.createWriteStream(outPdf));
doc.font('Helvetica').fontSize(10).fillColor('#111');
const text=lines.join('\n'), lh=12, blockH=lines.length*lh;
for(let k=0;k<30;k++){
  const col=k%3, row=Math.floor(k/3);
  const x=LEFT+col*(W+GAP)+PAD, y=TOP+row*H+(H-blockH)/2;
  doc.text(text,x,y,{width:W-2*PAD,lineGap:lh-10});
}
doc.end(); console.log('30 return labels →',outPdf);
