"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

const TABLES = [...Array.from({ length: 16 }, (_, i) => i + 1), 21, 22, 23, 24, 31, 32, 33, 34];
const DRINKS = [
  { id: "antiquity", label: "Whisky Antiquity Blue", group: "Spiritueux & bière" },
  { id: "royal", label: "Whisky Royal Challenge", group: "Spiritueux & bière" },
  { id: "morpheus", label: "Brandy Morpheus", group: "Spiritueux & bière" },
  { id: "biere", label: "Bière", group: "Spiritueux & bière" },
  { id: "martini", label: "Martini", group: "Apéritifs & boissons festives" },
  { id: "punch", label: "Punch", group: "Apéritifs & boissons festives" },
  { id: "porto", label: "Porto", group: "Apéritifs & boissons festives" },
  { id: "breezer", label: "Bacardi Breezer", group: "Apéritifs & boissons festives" },
  { id: "eau", label: "Eau", group: "Boissons sans alcool" },
  { id: "coca", label: "Coca-Cola", group: "Boissons sans alcool" },
  { id: "jus", label: "Jus de fruits", group: "Boissons sans alcool" },
  { id: "soda", label: "Soda", group: "Boissons sans alcool" },
] as const;
const BOTTLE_DIVISORS: Record<string, number> = { antiquity: 12, royal: 12, morpheus: 12, biere: 1 };
const formatBottles = (servings: number, divisor: number) =>
  (servings / divisor).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const BUBBLE_X = [59, 65.5, 72, 78.5, 85, 91.5].map((n) => n / 100);
const BUBBLE_Y = [50.25, 56.75, 63.25, 69.75, 81.25, 87.75, 94.25, 100.75, 112.25, 118.75, 125.25, 131.75].map((n) => n / 150);

type Quantities = Record<string, number>;
type OrderRecord = { id: string; tableNo: number; orderNo: number; createdAt: string; quantities: Quantities; confidence: number; photo?: Blob };
const emptyQuantities = (): Quantities => Object.fromEntries(DRINKS.map((d) => [d.id, 0]));

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("anba-drinks", 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("orders")) request.result.createObjectStore("orders", { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function listOrders(): Promise<OrderRecord[]> { const db = await openDb(); return new Promise((resolve, reject) => { const r = db.transaction("orders", "readonly").objectStore("orders").getAll(); r.onsuccess = () => resolve(r.result as OrderRecord[]); r.onerror = () => reject(r.error); }); }
async function saveOrder(order: OrderRecord) { const db = await openDb(); await new Promise<void>((resolve, reject) => { const tx = db.transaction("orders", "readwrite"); tx.objectStore("orders").put(order); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
async function removeOrder(id: string) { const db = await openDb(); await new Promise<void>((resolve, reject) => { const tx = db.transaction("orders", "readwrite"); tx.objectStore("orders").delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
async function clearOrders() { const db = await openDb(); await new Promise<void>((resolve, reject) => { const tx = db.transaction("orders", "readwrite"); tx.objectStore("orders").clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
async function replaceOrders(orders: OrderRecord[]) { const db = await openDb(); await new Promise<void>((resolve, reject) => { const tx = db.transaction("orders", "readwrite"); const store=tx.objectStore("orders"); store.clear(); orders.forEach(order=>store.put(order)); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); }

type Point = { x: number; y: number };
type MarkerCandidate = Point & { size: number };
function findMarker(data: ImageData, region: { x0: number; y0: number; x1: number; y1: number },threshold=155): MarkerCandidate | null {
  const { width, height } = data, x0 = Math.max(0, Math.floor(region.x0 * width)), y0 = Math.max(0, Math.floor(region.y0 * height)), x1 = Math.min(width, Math.ceil(region.x1 * width)), y1 = Math.min(height, Math.ceil(region.y1 * height));
  const rw = x1 - x0, rh = y1 - y0, dark = new Uint8Array(rw * rh), visited = new Uint8Array(rw * rh);
  // Printed black is often medium grey in an iPhone photo. A threshold of 72
  // rejected genuine registration squares on ordinary office-paper prints.
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { const i = ((y + y0) * width + x + x0) * 4; const g = data.data[i] * .299 + data.data[i + 1] * .587 + data.data[i + 2] * .114; dark[y * rw + x] = g < threshold ? 1 : 0; }
  let best: { score: number; x: number; y: number; size: number } | null = null; const qx = new Int32Array(rw * rh), qy = new Int32Array(rw * rh);
  for (let sy = 0; sy < rh; sy++) for (let sx = 0; sx < rw; sx++) {
    const seed = sy * rw + sx; if (!dark[seed] || visited[seed]) continue;
    let head = 0, tail = 0, area = 0, sumX = 0, sumY = 0, minX = sx, maxX = sx, minY = sy, maxY = sy;
    qx[tail] = sx; qy[tail++] = sy; visited[seed] = 1;
    while (head < tail) { const x = qx[head], y = qy[head++]; area++; sumX += x; sumY += y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=rw||ny>=rh) continue; const ni=ny*rw+nx; if(dark[ni]&&!visited[ni]){visited[ni]=1; qx[tail]=nx; qy[tail++]=ny;} } }
    const bw=maxX-minX+1,bh=maxY-minY+1,ratio=bw/bh,fill=area/(bw*bh),score=area*fill;
    // The sheet may occupy only part of a portrait photo. Its printed squares
    // can then be below 2% of the image width, even though they remain clear.
    // Geometry and the two printed-word anchors provide the final safeguards.
    const markerSized=bw>width*.006&&bw<width*.075&&bh>width*.006&&bh<width*.075;
    if(area>18&&markerSized&&ratio>.55&&ratio<1.8&&fill>.48&&(!best||score>best.score)) best={score,x:x0+sumX/area,y:y0+sumY/area,size:Math.sqrt(bw*bh)};
  }
  return best ? { x: best.x, y: best.y, size: best.size } : null;
}
function findSheetMarkers(data:ImageData):Point[]|null{
  // Search overlapping windows across the whole photo. The sheet does not
  // have to fill the frame or sit in the photographic corners.
  const starts=[0,.16,.32,.48,.64,.70],points:MarkerCandidate[]=[];
  // A square touching a hand or a dark background can merge at one
  // threshold and become perfectly isolated at another. Keep both passes.
  for(const threshold of [100,128,155])for(const y0 of starts)for(const x0 of starts){const point=findMarker(data,{x0,y0,x1:Math.min(1,x0+.30),y1:Math.min(1,y0+.30)},threshold);if(point){const duplicate=points.findIndex(p=>Math.hypot(p.x-point.x,p.y-point.y)<data.width*.035);if(duplicate<0)points.push(point);else if(point.size>points[duplicate].size)points[duplicate]=point;}}
  if(points.length<4)return null;
  let winner:{score:number;markers:Point[]}|null=null;
  for(let a=0;a<points.length-3;a++)for(let b=a+1;b<points.length-2;b++)for(let c=b+1;c<points.length-1;c++)for(let d=c+1;d<points.length;d++){
    const four=[points[a],points[b],points[c],points[d]].sort((p,q)=>p.y-q.y),top=four.slice(0,2).sort((p,q)=>p.x-q.x),bottom=four.slice(2).sort((p,q)=>p.x-q.x),ordered=[top[0],top[1],bottom[0],bottom[1]];
    const topWidth=Math.hypot(top[1].x-top[0].x,top[1].y-top[0].y),bottomWidth=Math.hypot(bottom[1].x-bottom[0].x,bottom[1].y-bottom[0].y),leftHeight=Math.hypot(bottom[0].x-top[0].x,bottom[0].y-top[0].y),rightHeight=Math.hypot(bottom[1].x-top[1].x,bottom[1].y-top[1].y),avgWidth=(topWidth+bottomWidth)/2,avgHeight=(leftHeight+rightHeight)/2,ratio=avgWidth/avgHeight;
    if(avgWidth<data.width*.10||avgHeight<data.height*.13||ratio<.35||ratio>1.05)continue;
    const topTilt=Math.abs(top[0].y-top[1].y)/avgHeight,bottomTilt=Math.abs(bottom[0].y-bottom[1].y)/avgHeight,widthBalance=Math.min(topWidth,bottomWidth)/Math.max(topWidth,bottomWidth),heightBalance=Math.min(leftHeight,rightHeight)/Math.max(leftHeight,rightHeight),sizes=ordered.map(p=>p.size),sizeBalance=Math.min(...sizes)/Math.max(...sizes);
    if(topTilt>.20||bottomTilt>.20||widthBalance<.48||heightBalance<.55||sizeBalance<.55)continue;
    const shape=Math.exp(-4*Math.abs(Math.log(ratio/.635))),score=avgWidth*avgHeight*shape*widthBalance*heightBalance*sizeBalance*sizeBalance;
    if(!winner||score>winner.score)winner={score,markers:ordered.map(({x,y})=>({x,y}))};
  }
  return winner?.markers||null;
}
function solveLinear(a:number[][],b:number[]){const n=b.length;for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;[a[i],a[p]]=[a[p],a[i]];[b[i],b[p]]=[b[p],b[i]];const d=a[i][i];if(Math.abs(d)<1e-9)throw new Error("Repères non détectés");for(let k=i;k<n;k++)a[i][k]/=d;b[i]/=d;for(let j=0;j<n;j++)if(j!==i){const f=a[j][i];for(let k=i;k<n;k++)a[j][k]-=f*a[i][k];b[j]-=f*b[i];}}return b;}
function homography(source:{u:number;v:number}[],target:Point[]){const a:number[][]=[],b:number[]=[];source.forEach(({u,v},i)=>{const{x,y}=target[i];a.push([u,v,1,0,0,0,-x*u,-x*v]);b.push(x);a.push([0,0,0,u,v,1,-y*u,-y*v]);b.push(y);});const h=solveLinear(a,b);return(u:number,v:number):Point=>{const d=h[6]*u+h[7]*v+1;return{x:(h[0]*u+h[1]*v+h[2])/d,y:(h[3]*u+h[4]*v+h[5])/d};};}

let sheetFontReady:Promise<void>|null=null;
function loadSheetFont(){
  if(!sheetFontReady)sheetFontReady=(async()=>{const face=new FontFace("SheetCode","url('./DejaVuSans-Bold.ttf')");await face.load();document.fonts.add(face);await document.fonts.load("24px SheetCode");})();
  return sheetFontReady;
}
function dilate(mask:Uint8Array,width:number,height:number){const out=new Uint8Array(mask.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){let hit=0;for(let dy=-1;dy<=1&&!hit;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<width&&yy<height&&mask[yy*width+xx]){hit=1;break;}}out[y*width+x]=hit;}return out;}
function inkPixels(mask:Uint8Array){const out:number[]=[];for(let i=0;i<mask.length;i++)if(mask[i])out.push(i);return out;}
async function verifyFormAnchor(image:ImageData,map:(u:number,v:number)=>Point){
  await loadSheetFont();
  const ppm=6,xLeft=8,yTop=35,width=285,height=78,grey=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=map((xLeft+x/ppm)/100,(yTop+y/ppm)/150),xx=Math.max(0,Math.min(image.width-1,Math.round(p.x))),yy=Math.max(0,Math.min(image.height-1,Math.round(p.y))),i=(yy*image.width+xx)*4;grey[y*width+x]=Math.round(image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114);}
  const sorted=Array.from(grey).sort((a,b)=>a-b),paper=sorted[Math.floor(sorted.length*.72)],threshold=Math.max(100,Math.min(190,paper-30)),actual=new Uint8Array(grey.length);for(let i=0;i<grey.length;i++)actual[i]=grey[i]<threshold?1:0;
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d")!;ctx.fillStyle="white";ctx.fillRect(0,0,width,height);ctx.fillStyle="black";ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.font=`${Math.round(7.8/72*25.4*ppm)}px SheetCode`;ctx.fillText("BOISSON",(10-xLeft)*ppm,(40.1-yTop)*ppm);ctx.font=`${Math.round(7.2/72*25.4*ppm)}px SheetCode`;ctx.fillText("SPIRITUEUX & BIÈRE",(10-xLeft)*ppm,(45.55-yTop)*ppm);
  const pixels=ctx.getImageData(0,0,width,height).data,template=new Uint8Array(width*height);for(let i=0;i<template.length;i++)template[i]=pixels[i*4]<150?1:0;const templateInk=inkPixels(template),actualDilated=dilate(actual,width,height);let best=0;
  for(let sy=-5;sy<=5;sy++)for(let sx=-5;sx<=5;sx++){let hits=0;for(const index of templateInk){const x=index%width,y=Math.floor(index/width),xx=x+sx,yy=y+sy;if(xx>=0&&yy>=0&&xx<width&&yy<height&&actualDilated[yy*width+xx])hits++;}best=Math.max(best,hits/Math.max(1,templateInk.length));}
  // This is a supporting anchor, not a reason to reject a sheet whose four
  // registration squares already define a coherent rectangle. Lighting,
  // printer weight and small perspective differences can lower this score.
  return best>=.28;
}
async function readReference(image:ImageData,map:(u:number,v:number)=>Point){
  await loadSheetFont();
  const ppm=8,xLeft=35,xTop=20.5,width=240,height=72,grey=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=map((xLeft+x/ppm)/100,(xTop+y/ppm)/150),xx=Math.max(0,Math.min(image.width-1,Math.round(p.x))),yy=Math.max(0,Math.min(image.height-1,Math.round(p.y))),i=(yy*image.width+xx)*4;
    grey[y*width+x]=Math.round(image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114);
  }
  const sorted=Array.from(grey).sort((a,b)=>a-b),paper=sorted[Math.floor(sorted.length*.72)],threshold=Math.max(105,Math.min(190,paper-32)),actual=new Uint8Array(grey.length);
  for(let i=0;i<grey.length;i++)actual[i]=grey[i]<threshold?1:0;
  const tables=TABLES,candidates:{score:number;tableNo:number;orderNo:number}[]=[];
  for(const tableNo of tables)for(let orderNo=1;orderNo<=7;orderNo++){
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d")!;ctx.fillStyle="white";ctx.fillRect(0,0,width,height);ctx.fillStyle="black";const fontSize=Math.round(8/72*25.4*ppm),text=`T${String(tableNo).padStart(2,"0")}-C${String(orderNo).padStart(2,"0")}`,baseline=(25.5-xTop)*ppm;ctx.font=`${fontSize}px SheetCode`;ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.fillText(text,width/2,baseline);
    // Compare only the three digits that vary between the 168 references.
    // Comparing the whole common string made C02 and C03 look artificially
    // almost identical even when the final digit was clear.
    const start=width/2-ctx.measureText(text).width/2,focus=new Uint8Array(width*height);for(const position of [1,2,6]){const from=Math.max(0,Math.floor(start+ctx.measureText(text.slice(0,position)).width-2)),to=Math.min(width,Math.ceil(start+ctx.measureText(text.slice(0,position+1)).width+2)),top=Math.max(0,Math.floor(baseline-fontSize-3)),bottom=Math.min(height,Math.ceil(baseline+4));for(let y=top;y<bottom;y++)for(let x=from;x<to;x++)focus[y*width+x]=1;}
    const pixels=ctx.getImageData(0,0,width,height).data,template=new Uint8Array(width*height),actualFocused=new Uint8Array(width*height);for(let i=0;i<template.length;i++){template[i]=focus[i]&&pixels[i*4]<150?1:0;actualFocused[i]=focus[i]&&actual[i]?1:0;}
    const templateDilated=dilate(template,width,height),actualDilated=dilate(actualFocused,width,height),templateInk=inkPixels(template),actualInk=inkPixels(actualFocused);let best=0;
    for(let sy=-3;sy<=3;sy++)for(let sx=-3;sx<=3;sx++){
      let hitTemplate=0,hitActual=0;
      for(const index of templateInk){const x=index%width,y=Math.floor(index/width),xx=x+sx,yy=y+sy;if(xx>=0&&yy>=0&&xx<width&&yy<height&&actualDilated[yy*width+xx])hitTemplate++;}
      for(const index of actualInk){const x=index%width,y=Math.floor(index/width),xx=x-sx,yy=y-sy;if(xx>=0&&yy>=0&&xx<width&&yy<height&&templateDilated[yy*width+xx])hitActual++;}
      best=Math.max(best,(hitTemplate/Math.max(1,templateInk.length)+hitActual/Math.max(1,actualInk.length))/2);
    }
    candidates.push({score:best,tableNo,orderNo});
  }
  candidates.sort((a,b)=>b.score-a.score);const best=candidates[0],second=candidates[1];
  if(!best||best.score<.55||best.score-second.score<.002)throw new Error("La référence Table–Commande n’est pas assez nette pour être distinguée sans risque. Reprenez la photo.");
  return best;
}

async function analyzePhoto(file: File): Promise<{ quantities: Quantities; confidence: number; preview: string; blob: Blob; tableNo:number; orderNo:number }> {
  const bitmap=await createImageBitmap(file),scale=Math.min(1,1100/bitmap.width),canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext("2d",{willReadFrequently:true})!;ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const image=ctx.getImageData(0,0,canvas.width,canvas.height);
  const markers=findSheetMarkers(image),markerSources=[{u:.065,v:6.5/150},{u:.935,v:6.5/150},{u:.065,v:143.5/150},{u:.935,v:143.5/150}];
  if(!markers)throw new Error("Lecture refusée : impossible de regrouper les quatre carrés de la fiche. Vérifiez qu’ils sont tous visibles et reprenez la photo.");
  const map=homography(markerSources,markers);await verifyFormAnchor(image,map);const reference=await readReference(image,map),quantities=emptyQuantities();let certainty=0;
  DRINKS.forEach((drink,row)=>{
    // Keep the wider sampling geometry that correctly distinguishes columns
    // 1 to 6, but count only cool blue ballpoint ink. Printed black outlines,
    // table borders and shadows are therefore ignored completely.
    const samples=BUBBLE_X.map(u=>{
      const p=map(u,BUBBLE_Y[row]),radius=Math.max(3,canvas.width*.012);
      let blue=0,total=0;
      for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(dx*dx+dy*dy>radius*radius*.55)continue;
        const x=Math.round(p.x+dx),y=Math.round(p.y+dy);
        if(x<0||y<0||x>=image.width||y>=image.height)continue;
        const i=(y*image.width+x)*4,r=image.data[i],g=image.data[i+1],b=image.data[i+2],luma=r*.299+g*.587+b*.114;
        if(luma<180&&b-g>0&&b-r>-8)blue++;
        total++;
      }
      return total?blue/total:0;
    });
    const ranked=samples.map((score,i)=>({score,qty:i+1})).sort((a,b)=>b.score-a.score);
    const chosen=ranked[0].score>.05&&ranked[0].score-ranked[1].score>.03?ranked[0].qty:0;
    quantities[drink.id]=chosen;
    certainty+=chosen?Math.min(1,ranked[0].score*2.2):.82;
  });
  const thumb=document.createElement("canvas"),ts=Math.min(1,720/canvas.width);thumb.width=Math.round(canvas.width*ts);thumb.height=Math.round(canvas.height*ts);thumb.getContext("2d")!.drawImage(canvas,0,0,thumb.width,thumb.height);const blob=await new Promise<Blob>(resolve=>thumb.toBlob(b=>resolve(b!),"image/jpeg",.72));return{quantities,confidence:certainty/DRINKS.length,preview:URL.createObjectURL(blob),blob,tableNo:reference.tableNo,orderNo:reference.orderNo};
}

export default function Home(){
  const[view,setView]=useState<"scan"|"totals"|"history">("scan"),[orders,setOrders]=useState<OrderRecord[]>([]),[tableNo,setTableNo]=useState(1),[orderNo,setOrderNo]=useState(1),[quantities,setQuantities]=useState<Quantities>(emptyQuantities),[photo,setPhoto]=useState<Blob>(),[preview,setPreview]=useState<string>(),[confidence,setConfidence]=useState(0),[message,setMessage]=useState("Photographiez la fiche entière, avec les quatre repères noirs visibles."),[busy,setBusy]=useState(false),[online,setOnline]=useState(true),[offlineReady,setOfflineReady]=useState(false);const inputRef=useRef<HTMLInputElement>(null),backupRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{listOrders().then(rows=>setOrders(rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))));},[]);useEffect(()=>{setOnline(navigator.onLine);const update=()=>setOnline(navigator.onLine);addEventListener("online",update);addEventListener("offline",update);if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").then(async registration=>{await navigator.serviceWorker.ready;setOfflineReady(true);registration.update().catch(()=>undefined);}).catch(()=>undefined);return()=>{removeEventListener("online",update);removeEventListener("offline",update);};},[]);
  const id=`T${String(tableNo).padStart(2,"0")}-C${String(orderNo).padStart(2,"0")}`,duplicate=orders.find(o=>o.id===id),selectedCount=Object.values(quantities).reduce((a,b)=>a+b,0),totals=useMemo(()=>{const r=emptyQuantities();orders.forEach(o=>DRINKS.forEach(d=>{r[d.id]+=o.quantities[d.id]||0;}));return r;},[orders]);
  async function capture(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setBusy(true);setMessage("Lecture de la fiche et de sa référence…");try{const r=await analyzePhoto(file);setTableNo(r.tableNo);setOrderNo(r.orderNo);setQuantities(r.quantities);setConfidence(r.confidence);setPhoto(r.blob);if(preview)URL.revokeObjectURL(preview);setPreview(r.preview);setMessage(`Référence lue : T${String(r.tableNo).padStart(2,"0")}-C${String(r.orderNo).padStart(2,"0")}. Vérifiez les quantités avant validation.`);}catch(error){setQuantities(emptyQuantities());setConfidence(0);setPhoto(file);const url=URL.createObjectURL(file);if(preview)URL.revokeObjectURL(preview);setPreview(url);setMessage(error instanceof Error?error.message:"Lecture impossible. Reprenez la photo.");}finally{setBusy(false);}}
  async function validate(){if(duplicate){setMessage(`${id} a déjà été validée.`);return;}if(!selectedCount){setMessage("Aucune boisson n’est renseignée.");return;}if(!confirm(`1re validation : enregistrer ${id} avec ${selectedCount} boisson${selectedCount>1?"s":""} ?`))return;if(!confirm(`2e validation : confirmez définitivement ${id}.`))return;const record:OrderRecord={id,tableNo,orderNo,createdAt:new Date().toISOString(),quantities,confidence,photo};await saveOrder(record);setOrders(c=>[record,...c]);setQuantities(emptyQuantities());setPhoto(undefined);setConfidence(0);if(preview)URL.revokeObjectURL(preview);setPreview(undefined);if(inputRef.current)inputRef.current.value="";setMessage(`${id} validée et ajoutée aux totaux.`);}
  async function resetEverything(){
    const count=orders.length;
    if(!confirm(`Tout annuler ? ${count} validation${count>1?"s":""} et tous les totaux seront effacés.`))return;
    if(!confirm("Deuxième confirmation : voulez-vous vraiment effacer définitivement toutes les validations ?"))return;
    await clearOrders();setOrders([]);setQuantities(emptyQuantities());setPhoto(undefined);setConfidence(0);if(preview)URL.revokeObjectURL(preview);setPreview(undefined);if(inputRef.current)inputRef.current.value="";setMessage("Toutes les validations et tous les totaux ont été annulés.");setView("scan");
  }
  function exportCsv(){const header=["Référence","Table","Commande","Date",...DRINKS.map(d=>d.label)],rows=orders.map(o=>[o.id,o.tableNo,o.orderNo,new Date(o.createdAt).toLocaleString("fr-FR"),...DRINKS.map(d=>o.quantities[d.id]||0)]);rows.push(["TOTAL","","","",...DRINKS.map(d=>totals[d.id])]);const csv=[header,...rows].map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(";")).join("\n"),blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="consommation-boissons-anba.csv";a.click();URL.revokeObjectURL(a.href);}
  function exportBackup(){const payload={format:"anba-boissons",version:1,exportedAt:new Date().toISOString(),orders:orders.map(({photo:_,...order})=>order)},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`sauvegarde-boissons-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);}
  async function importBackup(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(payload?.format!=="anba-boissons"||!Array.isArray(payload.orders))throw new Error();const restored:OrderRecord[]=payload.orders.map((order:any)=>{if(typeof order.id!=="string"||!TABLES.includes(Number(order.tableNo))||order.orderNo<1||order.orderNo>7||typeof order.quantities!=="object")throw new Error();const clean=emptyQuantities();DRINKS.forEach(d=>clean[d.id]=Math.max(0,Math.min(6,Number(order.quantities[d.id])||0)));return{id:order.id,tableNo:Number(order.tableNo),orderNo:Number(order.orderNo),createdAt:String(order.createdAt||new Date().toISOString()),confidence:Number(order.confidence)||0,quantities:clean};});if(!confirm(`Restaurer ${restored.length} commande${restored.length>1?"s":""} ? Les données actuelles seront remplacées.`))return;if(!confirm("Deuxième confirmation : remplacer définitivement les données actuelles ?"))return;await replaceOrders(restored);setOrders(restored.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));setMessage("Sauvegarde restaurée.");setView("history");}catch{alert("Ce fichier de sauvegarde n’est pas valide.");}finally{e.target.value="";}}
  return <main className="app-shell"><header className="topbar"><div><span className="eyebrow">À nos belles Années</span><h1>Boissons ANBA</h1></div><div className="order-badge">{orders.length} validée{orders.length>1?"s":""}</div></header><div style={{margin:"0 0 12px",padding:"9px 12px",borderRadius:10,background:online?"#f3ead1":"#e4f3e8",color:online?"#684b18":"#185b31",fontWeight:800,fontSize:14}}>{online?(offlineReady?"✓ Prête à fonctionner sans Internet":"Préparation du mode hors connexion…"):"✓ Mode hors connexion actif"}</div><nav className="tabs" aria-label="Navigation principale"><button className={view==="scan"?"active":""} onClick={()=>setView("scan")}>Scanner</button><button className={view==="totals"?"active":""} onClick={()=>setView("totals")}>Totaux</button><button className={view==="history"?"active":""} onClick={()=>setView("history")}>Historique</button></nav>
  {!!orders.length&&<button className="reset-all" style={{width:"100%",minHeight:48,margin:"0 0 12px",border:"1px solid #b84949",borderRadius:11,background:"#fff1f1",color:"#a12a2a",fontWeight:850}} onClick={resetEverything}>Tout annuler ({orders.length} validation{orders.length>1?"s":""})</button>}
  {view==="scan"&&<section className="workspace"><div className="identity-card"><label>Table<select value={tableNo} onChange={e=>setTableNo(Number(e.target.value))}>{TABLES.map(n=><option key={n}>{n}</option>)}</select></label><label>Commande<select value={orderNo} onChange={e=>setOrderNo(Number(e.target.value))}>{[1,2,3,4,5,6,7].map(n=><option key={n}>{n}</option>)}</select></label><strong className={duplicate?"reference duplicate":"reference"}>{id}{duplicate?" · DÉJÀ VALIDÉE":""}</strong></div><label className="camera-button"><span>{busy?"Lecture en cours…":preview?"Reprendre la photo":"Photographier la fiche"}</span><input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={capture} disabled={busy}/></label><p className="status" role="status">{message}</p>{preview&&<img className="preview" src={preview} alt="Photographie de la fiche de commande"/>}<div className="quantity-list">{DRINKS.map((drink,index)=>{const newGroup=index===0||DRINKS[index-1].group!==drink.group;return <div key={drink.id} className="drink-block">{newGroup&&<h2>{drink.group}</h2>}<div className="drink-row"><span>{drink.label}</span><div className="stepper"><button aria-label={`Retirer un ${drink.label}`} onClick={()=>setQuantities(q=>({...q,[drink.id]:Math.max(0,q[drink.id]-1)}))}>−</button><output>{quantities[drink.id]}</output><button aria-label={`Ajouter un ${drink.label}`} onClick={()=>setQuantities(q=>({...q,[drink.id]:Math.min(6,q[drink.id]+1)}))}>+</button></div></div></div>;})}</div>{preview&&<div className="confidence">Lecture automatique : {Math.round(confidence*100)} % — à vérifier avant validation.</div>}<button className="validate" onClick={validate} disabled={busy||!!duplicate}>Valider {selectedCount?`${selectedCount} boisson${selectedCount>1?"s":""}`:"la commande"}</button></section>}
  {view==="totals"&&<section className="workspace"><div className="summary"><strong>{Object.values(totals).reduce((a,b)=>a+b,0)}</strong><span>boissons servies</span></div><div className="totals-list"><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 58px 58px",alignItems:"center",gap:8,background:"var(--gold-soft)",color:"#5e451b",fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:".04em"}}><span>Boisson</span><span style={{textAlign:"right"}}>Cons.</span><span style={{textAlign:"right"}}>Btl</span></div>{DRINKS.map(d=>{const divisor=BOTTLE_DIVISORS[d.id];return <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 58px 58px",alignItems:"center",gap:8}} key={d.id}><span>{d.label}</span><strong style={{textAlign:"right"}}>{totals[d.id]}</strong>{divisor?<strong style={{textAlign:"right",color:"var(--ink)"}}>{formatBottles(totals[d.id],divisor)}</strong>:<span aria-hidden="true"/>}</div>})}</div><button className="secondary" onClick={exportCsv} disabled={!orders.length}>Exporter le fichier Excel/CSV</button></section>}
  {view==="history"&&<section className="workspace">{!orders.length&&<p className="empty">Aucune commande validée.</p>}<div className="history-list">{orders.map(o=><article key={o.id}><div><strong>{o.id}</strong><time>{new Date(o.createdAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</time></div><p>{DRINKS.filter(d=>o.quantities[d.id]).map(d=>`${o.quantities[d.id]} ${d.label}`).join(" · ")}</p><button onClick={async()=>{if(confirm(`Annuler ${o.id} ?`)){await removeOrder(o.id);setOrders(rows=>rows.filter(row=>row.id!==o.id));}}}>Annuler cette validation</button></article>)}</div><button className="secondary" onClick={exportBackup} disabled={!orders.length}>Sauvegarder toutes les données</button><button className="secondary" onClick={()=>backupRef.current?.click()}>Restaurer une sauvegarde</button><input ref={backupRef} type="file" accept="application/json,.json" hidden onChange={importBackup}/>{!!orders.length&&<button className="danger" onClick={resetEverything}>Tout annuler</button>}<p className="empty" style={{marginTop:16}}>Installation sur iPhone : ouvrir cette adresse dans Safari, toucher Partager, puis « Sur l’écran d’accueil ». Ouvrir ensuite l’icône une première fois avec Internet.</p></section>}</main>;
}
