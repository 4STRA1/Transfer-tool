const fileInput =
  document.getElementById('fileInput');

const dropArea =
  document.getElementById('dropArea');

const previewGrid =
  document.getElementById('previewGrid');

const convertBtn =
  document.getElementById('convertBtn');

const formatSelect =
  document.getElementById('formatSelect');

const progressBar =
  document.getElementById('progressBar');

const statusText =
  document.getElementById('status');

let files = [];
let results = [];
let downloadCompleted = false;

// ---------------------
// ファイル追加
// ---------------------
fileInput.addEventListener('change', e => {
  addFiles(e.target.files);
});

dropArea.addEventListener('click', () => {
  fileInput.click();
});

function addFiles(list) {
  files = [...files, ...list];
  renderFiles();
}

// ---------------------
// プレビュー
// ---------------------
function renderFiles() {
  
  previewGrid.innerHTML = '';
  
  files.forEach((file, i) => {
    
    const card = document.createElement('div');
    card.className = 'preview-card';
    
    const img = document.createElement('img');
    img.className = 'preview-image';
    
    const reader = new FileReader();
    reader.onload = e => img.src = e.target.result;
    reader.readAsDataURL(file);
    
    card.appendChild(img);
    
    // 削除
    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.textContent = '×';
    
    btn.onclick = () => {
      files.splice(i, 1);
      renderFiles();
    };
    
    card.appendChild(btn);
    
    previewGrid.appendChild(card);
  });
}

// ---------------------
// 変換
// ---------------------
convertBtn.addEventListener('click', async () => {
  
  results = [];
  downloadCompleted = false;
  
  const zip = new JSZip();
  const format = formatSelect.value;
  
  let mergedPdf = null;
  
  if (format === 'pdf') {
    const { jsPDF } = window.jspdf;
    mergedPdf = new jsPDF();
  }
  
  for (let i = 0; i < files.length; i++) {
    
    const file = files[i];
    
    const data = await file.arrayBuffer();
    
    const imgBlob = await process(file, format, mergedPdf, i);
    
    const name = file.name.replace(/\.[^/.]+$/, '') + '.' + format;
    
    results.push({
      blob: imgBlob,
      name
    });
    
    zip.file(name, imgBlob);
    
    progressBar.style.width =
      ((i + 1) / files.length * 100) + '%';
  }
  
  // PDF結合
  if (format === 'pdf') {
    const pdfBlob = mergedPdf.output('blob');
    zip.file('merged.pdf', pdfBlob);
    results.push({ blob: pdfBlob, name: 'merged.pdf' });
  }
  
  showResult();
  
});

// ---------------------
// 変換処理
// ---------------------
async function process(file, format, mergedPdf, index) {
  
  const img = new Image();
  
  const data = await new Promise(r => {
    const fr = new FileReader();
    fr.onload = e => r(e.target.result);
    fr.readAsDataURL(file);
  });
  
  img.src = data;
  
  await new Promise(r => img.onload = r);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // リサイズ
  let scale = img.width > 1920 ? 1920 / img.width : 1;
  
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  if (format === 'pdf') {
    
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    if (index > 0) mergedPdf.addPage();
    
    mergedPdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg');
    
  }
  
  return await new Promise(r => {
    canvas.toBlob(b => r(b), 'image/' + format, 0.9);
  });
}

// ---------------------
// 結果画面
// ---------------------
function showResult() {
  
  document.getElementById('resultPanel').classList.remove('hidden');
  
  const list = document.getElementById('resultList');
  
  list.innerHTML = '';
  
  results.forEach((r, i) => {
    
    const div = document.createElement('div');
    div.className = 'result-item';
    
    const input = document.createElement('input');
    input.value = r.name;
    
    input.oninput = e => {
      results[i].name = e.target.value;
    };
    
    const btn = document.createElement('button');
    btn.textContent = 'ダウンロード';
    
    btn.onclick = () => {
      download(r);
    };
    
    div.appendChild(input);
    div.appendChild(btn);
    
    list.appendChild(div);
  });
  
}

// ---------------------
// ダウンロード
// ---------------------
function download(item) {
  
  const url = URL.createObjectURL(item.blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = item.name;
  a.click();
  
  URL.revokeObjectURL(url);
  
  downloadCompleted = true;
  
  document.getElementById('backBtn').disabled = false;
}

// ---------------------
// 全DL
// ---------------------
document.getElementById('downloadAllBtn')
  .addEventListener('click', () => {
    
    results.forEach(download);
    downloadCompleted = true;
    
    document.getElementById('backBtn').disabled = false;
    
  });

// ---------------------
// 戻る
// ---------------------
document.getElementById('backBtn')
  .addEventListener('click', () => {
    
    document.getElementById('resultPanel').classList.add('hidden');
    
  });