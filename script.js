// =====================
// 状態
// =====================
let files = [];
let results = [];
let idCounter = 0;

/* =====================
   DOM
===================== */
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const previewGrid = document.getElementById('previewGrid');
const convertBtn = document.getElementById('convertBtn');

const clearAllBtn = document.getElementById('clearAllBtn');

const formatSelect = document.getElementById('formatSelect');
const progressBar = document.getElementById('progressBar');
const prefixInput = document.getElementById('renamePrefix');

prefixInput.addEventListener('input', updatePreview);

formatSelect.addEventListener('change', updatePreview);

const app = document.querySelector('.app');
const resultPanel = document.getElementById('resultPanel');

/* =====================
   読み込み
===================== */
function readFile(file){
return new Promise(r=>{
const fr=new FileReader();
fr.onload=e=>r(e.target.result);
fr.readAsDataURL(file);
});
}

/* =====================
   追加
===================== */
dropArea.addEventListener('click',()=>fileInput.click());

fileInput.addEventListener('change',async e=>{

const newFiles = await Promise.all(
[...e.target.files].map(async f=>({
id:idCounter++,
file:f,
name:f.name,
src:await readFile(f)
}))
);

files = files.concat(newFiles);
render();

});

/* =====================
   並び替え
===================== */
function moveUp(i){
if(i<=0) return;
[files[i-1],files[i]]=[files[i],files[i-1]];
render();
}

function moveDown(i){
if(i>=files.length-1) return;
[files[i+1],files[i]]=[files[i],files[i+1]];
render();
}

function removeItem(i){
files.splice(i,1);
render();
}

/* =====================
   全削除
===================== */

clearAllBtn.onclick = () => {
   
   // 配列初期化
   files = [];
   
   // プレビュー削除
   previewGrid.innerHTML = '';
   
   // 進捗リセット
   progressBar.style.width = '0%';
   
   // ボタン状態更新
   updatePreview();
   
};

/* =====================
   render（完全再描画）
===================== */
function render(){

previewGrid.innerHTML='';

files.forEach((item,i)=>{

const card=document.createElement('div');
card.className='preview-card';

/* 左 */
const left=document.createElement('div');
left.className='left-controls';

const del=document.createElement('button');
del.className='move-btn';
del.textContent='×';
del.onclick=()=>removeItem(i);

left.appendChild(del);

/* 中 */
const center=document.createElement('div');
center.className='center-area';

const img = document.createElement('img');
img.src = item.src;

/* 拡大 */
img.onclick = () => {
   openImageModal(item.src);
};

const name=document.createElement('div');
name.className='file-name';
name.textContent=item.name;

center.appendChild(img);
center.appendChild(name);

/* 右 */
const right=document.createElement('div');
right.className='right-controls';

const up=document.createElement('button');
up.className='move-btn';
up.textContent='⬆';
up.onclick=()=>moveUp(i);

const down=document.createElement('button');
down.className='move-btn';
down.textContent='⬇';
down.onclick=()=>moveDown(i);

right.appendChild(up);
right.appendChild(down);

/* 組み立て */
card.appendChild(left);
card.appendChild(center);
card.appendChild(right);

previewGrid.appendChild(card);

});

updatePreview();

}

/* =====================
   リネーム表示
===================== */
function updatePreview(){

const prefix=prefixInput.value||'image';
const format=formatSelect.value;

document.getElementById('namePreview').innerHTML=
`(${prefix}_<span style="color:#666">001.${format}</span>)`;

}

/* =====================
   変換
===================== */
convertBtn.addEventListener('click',async()=>{

if (!files || files.length === 0) {
   alert("画像が選択されていません");
   return;
}

results=[];

const zip=new JSZip();
const format=formatSelect.value;

let pdf=null;

if(format==='pdf'){
const {jsPDF}=window.jspdf;
pdf=new jsPDF();
}

const prefix=prefixInput.value||'image';

for(let i=0;i<files.length;i++){

const item=files[i];

const blob=await convert(item.file,format,pdf,i);

if(blob){

const name=`${prefix}_${String(i+1).padStart(3,'0')}.${format}`;

results.push({blob,name});
zip.file(name,blob);

}

progressBar.style.width=((i+1)/files.length*100)+'%';

}

if(format==='pdf'){

const pdfBlob=pdf.output('blob');
zip.file(`${prefix}.pdf`,pdfBlob);

results.push({
blob:pdfBlob,
name:`${prefix}.pdf`
});

}

showResult();

});

/* =====================
   変換処理
===================== */
async function convert(file,format,pdf,i){

const data=await readFile(file);
const img=new Image();
img.src=data;
await new Promise(r=>img.onload=r);

const canvas=document.createElement('canvas');
const ctx=canvas.getContext('2d');

const preset = document.getElementById('resizePreset').value;

let targetWidth = img.width;

// プリセット判定
if (preset !== "original") {
   targetWidth = parseInt(preset);
}

// 比率維持
let scale = targetWidth / img.width;

// 拡大防止（必要なら削除OK）
if (scale > 1) scale = 1;

canvas.width = img.width * scale;
canvas.height = img.height * scale;
ctx.drawImage(img,0,0,canvas.width,canvas.height);

if(format==='pdf'){

const imgData=canvas.toDataURL('image/jpeg',0.9);

const w=pdf.internal.pageSize.getWidth();
const h=pdf.internal.pageSize.getHeight();

const ratio=Math.min(w/canvas.width,h/canvas.height);

const rw=canvas.width*ratio;
const rh=canvas.height*ratio;

const x=(w-rw)/2;
const y=(h-rh)/2;

if(i>0) pdf.addPage();

pdf.addImage(imgData,'JPEG',x,y,rw,rh);

return null;
}

return await new Promise(r=>{
canvas.toBlob(b=>r(b),'image/'+format,0.9);
});

}

/* =====================
   結果画面
===================== */
function showResult(){

app.style.display='none';
resultPanel.style.display='block';
resultPanel.classList.remove('hidden');

resultPanel.innerHTML='';

/* ===== 上部バー ===== */
const topbar=document.createElement('div');
topbar.className='result-topbar';

/* 戻る */
const backBtn=document.createElement('button');
backBtn.className='top-btn';
backBtn.id='backBtn';
backBtn.textContent='戻る';

backBtn.onclick=()=>{
resultPanel.style.display='none';
app.style.display='block';
};

/* 全DL */
const dlAll=document.createElement('button');
dlAll.className='top-btn';
dlAll.textContent='全DL';

dlAll.onclick = async () => {
   
   if (results.length === 0) {
      alert("変換画像がありません");
      return;
   }
   
   /* ZIP生成 */
   const zip = new JSZip();
   
   /* ファイル追加 */
   results.forEach((r) => {
      
      zip.file(r.name, r.blob);
      
   });
   
   /* ZIP化 */
   const content = await zip.generateAsync({
      type: 'blob'
   });
   
   /* DL */
   const a = document.createElement('a');
   
   a.href = URL.createObjectURL(content);
   
   /* ZIP名 */
   const prefix = prefixInput.value || 'image';
   
   a.download = `${prefix}.zip`;
   
   a.click();
   
   URL.revokeObjectURL(a.href);
   
};
topbar.appendChild(backBtn);
topbar.appendChild(dlAll);

resultPanel.appendChild(topbar);

/* ===== グリッド ===== */
const list=document.createElement('div');
list.id='resultList';

results.forEach((r,i)=>{

const div=document.createElement('div');
div.className='result-item';

const img = document.createElement('img');
img.className = 'result-thumb';

const previewUrl = URL.createObjectURL(r.blob);

img.src = previewUrl;

/* 拡大 */
img.onclick = () => {
   openImageModal(previewUrl);
};

const info=document.createElement('div');
info.className='result-info';

const input=document.createElement('input');
input.value=r.name;

input.oninput=e=>{
results[i].name=e.target.value;
};

const btn=document.createElement('button');
btn.textContent='DL';

btn.onclick=()=>{
const a=document.createElement('a');
a.href=URL.createObjectURL(r.blob);
a.download=r.name;
a.click();
};

info.appendChild(input);
info.appendChild(btn);

div.appendChild(img);
div.appendChild(info);

list.appendChild(div);

});

resultPanel.appendChild(list);

}


/* =====================
   画像拡大モーダル
===================== */

const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalClose = document.getElementById('modalClose');

/* 開く */
function openImageModal(src) {
   
   modalImage.src = src;
   imageModal.classList.add('show');
   
}

/* 閉じる */
function closeImageModal() {
   
   imageModal.classList.remove('show');
   
}

/* ボタン */
modalClose.onclick = closeImageModal;

/* 背景タップ */
imageModal.onclick = (e) => {
   
   if (e.target === imageModal) {
      closeImageModal();
   }
   
};

updatePreview();

/* =====================
   PWA
===================== */

if ('serviceWorker' in navigator) {
   
   window.addEventListener('load', () => {
      
      navigator.serviceWorker
         .register('./service-worker.js')
         .then(() => {
            console.log('Service Worker 登録成功');
         })
         .catch(err => {
            console.log('Service Worker 登録失敗', err);
         });
      
   });
   
}