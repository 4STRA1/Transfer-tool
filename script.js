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

// ----------------------
// 追加
// ----------------------
dropArea.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', e => {
  addFiles(e.target.files);
});

function addFiles(list) {
  files = [...files, ...list];
  render();
}

// ----------------------
// プレビュー
// ----------------------
function render() {
  
  previewGrid.innerHTML = '';
  
  files.forEach((file, i) => {
    
    const card = document.createElement('div');
    card.className = 'preview-card';
    
    const img = document.createElement('img');
    
    const fr = new FileReader();
    fr.onload = e => img.src = e.target.result;
    fr.readAsDataURL(file);
    
    card.appendChild(img);
    
    // 削除
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.className = 'remove-btn';
    
    btn.onclick = () => {
      files.splice(i, 1);
      render();
    };
    
    card.appendChild(btn);
    
    previewGrid.appendChild(card);
  });
}

// ----------------------
// 変換
// ----------------------
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
    
    const blob = await convert(files[i], format, mergedPdf, i);
    
    // PDF以外のみ
    if (blob) {
      
      const name =
        files[i].name.replace(/\.[^/.]+$/, '') +
        '.' + format;
      
      results.push({
        blob,
        name
      });
      
      zip.file(name, blob);
    }
    
    progressBar.style.width =
      ((i + 1) / files.length * 100) + '%';
    
  }
  
  if (format === 'pdf') {
    
    const pdfBlob = mergedPdf.output('blob');
    
    zip.file('merged.pdf', pdfBlob);
    
    results.push({
      blob: pdfBlob,
      name: 'merged.pdf'
    });
  }
  
  showResult();
  
});

// ----------------------
// 変換処理（修正版）
// ----------------------
async function convert(file, format, mergedPdf, index) {
  
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
  
  // PDF結合
  if (format === 'pdf') {
    
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    if (index > 0) mergedPdf.addPage();
    
    mergedPdf.addImage(
      imgData,
      'JPEG',
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    return null;
  }
  
  // 画像変換（重要：Blob統一）
  return await new Promise(resolve => {
    
    let mime =
      format === 'jpg' ? 'image/jpeg' :
      'image/' + format;
    
    canvas.toBlob(blob => {
      resolve(blob);
    }, mime, 0.9);
    
  });
  
}

// ----------------------
// 結果画面
// ----------------------
function showResult() {
  
  document.getElementById('resultPanel')
    .classList.remove('hidden');
  
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

// ----------------------
// ダウンロード
// ----------------------
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

// ----------------------
// 全DL
// ----------------------
document.getElementById('downloadAllBtn')
  .addEventListener('click', () => {
    
    results.forEach(download);
    downloadCompleted = true;
    
    document.getElementById('backBtn').disabled = false;
    
  });

// ----------------------
// 戻る
// ----------------------
document.getElementById('backBtn')
  .addEventListener('click', () => {
    
    document.getElementById('resultPanel')
      .classList.add('hidden');
    
  });