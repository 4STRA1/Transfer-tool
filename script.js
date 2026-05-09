const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const fileList = document.getElementById('fileList');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const statusText = document.getElementById('status');

let files = [];

fileInput.addEventListener('change', (e) => {
  addFiles(e.target.files);
});

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    dropArea.style.borderColor = '#4da3ff';
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    dropArea.style.borderColor = '#666';
  });
});

dropArea.addEventListener('drop', e => {
  addFiles(e.dataTransfer.files);
});

selectFolderBtn.addEventListener('click', async () => {

  if (!window.showDirectoryPicker) {
    alert('このブラウザは保存先指定に対応していません');
    return;
  }

  try {

    outputDirectoryHandle = await window.showDirectoryPicker();

    savePath.textContent = `保存先: ${outputDirectoryHandle.name}`;

  } catch (err) {
    console.log(err);
  }
});

async function saveZipToFolder(blob) {

  if (!outputDirectoryHandle) {
    saveAs(blob, 'converted_files.zip');
    return;
  }

  const fileHandle = await outputDirectoryHandle.getFileHandle(
    'converted_files.zip',
    { create: true }
  );

  const writable = await fileHandle.createWritable();

  await writable.write(blob);

  await writable.close();
}

function addFiles(selectedFiles) {
  files = [...files, ...selectedFiles];
  renderFiles();
}

function renderFiles() {
  fileList.innerHTML = '';

  files.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-item';

    const size = (file.size / 1024 / 1024).toFixed(2);

    div.textContent = `${file.name} (${size} MB)`;

    fileList.appendChild(div);
  });
}

convertBtn.addEventListener('click', async () => {

  if (!files.length) {
    alert('ファイルを追加してください');
    return;
  }

  statusText.textContent = '変換中...';

  const targetFormat = formatSelect.value;

  const zip = new JSZip();

  for (const file of files) {

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      await convertPDF(file, targetFormat, zip);
    } else {
      await convertImage(file, targetFormat, zip);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });

  await saveZipToFolder(content);

  statusText.textContent = '変換完了';
});

async function convertImage(file, targetFormat, zip) {

  const img = new Image();

  const url = URL.createObjectURL(file);

  img.src = url;

  await new Promise(resolve => {
    img.onload = resolve;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);

  if (targetFormat === 'pdf') {

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width, img.height]
    });

    const data = canvas.toDataURL('image/png');

    pdf.addImage(data, 'PNG', 0, 0, img.width, img.height);

    const pdfBlob = pdf.output('blob');

    zip.file(changeExtension(file.name, 'pdf'), pdfBlob);

  } else {

    const mime = `image/${targetFormat}`;

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, mime, 0.95);
    });

    zip.file(changeExtension(file.name, targetFormat), blob);
  }

  URL.revokeObjectURL(url);
}

async function convertPDF(file, targetFormat, zip) {

  if (targetFormat === 'pdf') {
    zip.file(file.name, file);
    return;
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  const mime = `image/${targetFormat}`;

  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, mime, 0.95);
  });

  zip.file(changeExtension(file.name, targetFormat), blob);
}

function changeExtension(name, ext) {
  return name.replace(/\.[^/.]+$/, '') + '.' + ext;
}