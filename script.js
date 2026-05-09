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

const statusText =
  document.getElementById('status');

const progressBar =
  document.getElementById('progressBar');

const selectFolderBtn =
  document.getElementById('selectFolderBtn');

const savePath =
  document.getElementById('savePath');

let files = [];

let convertedFiles = {};

let outputDirectoryHandle = null;

// ファイル追加
fileInput.addEventListener(
  'change',
  (e) => {
    addFiles(e.target.files);
  }
);

// ドラッグイベント
['dragenter', 'dragover']
.forEach(eventName => {

  dropArea.addEventListener(
    eventName,
    e => {

      e.preventDefault();

      dropArea.classList.add(
        'dragover'
      );
    }
  );
});

['dragleave', 'drop']
.forEach(eventName => {

  dropArea.addEventListener(
    eventName,
    e => {

      e.preventDefault();

      dropArea.classList.remove(
        'dragover'
      );
    }
  );
});

// ドロップ
dropArea.addEventListener(
  'drop',
  e => {

    addFiles(
      e.dataTransfer.files
    );
  }
);

// 保存先指定
selectFolderBtn.addEventListener(
  'click',
  async () => {

    if (
      !window.showDirectoryPicker
    ) {

      alert(
        'このブラウザは保存先指定に未対応です'
      );

      return;
    }

    try {

      outputDirectoryHandle =
        await window.showDirectoryPicker();

      savePath.textContent =
        `保存先: ${outputDirectoryHandle.name}`;

    } catch(err) {

      console.log(err);
    }
  }
);

// ファイル追加
function addFiles(selectedFiles) {

  files = [
    ...files,
    ...selectedFiles
  ];

  renderFiles();
}

// プレビュー描画
function renderFiles() {

  previewGrid.innerHTML = '';

  files.forEach((file, index) => {

    const card =
      document.createElement('div');

    card.className =
      'preview-card';

    // 削除ボタン
    const removeBtn =
      document.createElement('button');

    removeBtn.className =
      'remove-btn';

    removeBtn.textContent = '×';

    removeBtn.addEventListener(
      'click',
      () => {

        files.splice(index, 1);

        delete convertedFiles[file.name];

        renderFiles();
      }
    );

    card.appendChild(removeBtn);

    const ext =
      file.name
      .split('.')
      .pop()
      .toLowerCase();

    const isImage =
      ['png','jpg','jpeg','webp']
      .includes(ext);

    // 画像プレビュー
    if (isImage) {

      const img =
        document.createElement('img');

      img.className =
        'preview-image';

      const reader =
        new FileReader();

      reader.onload = (e) => {

        img.src = e.target.result;
      };

      reader.readAsDataURL(file);

      card.appendChild(img);

    } else {

      const pdfBox =
        document.createElement('div');

      pdfBox.className =
        'pdf-preview';

      pdfBox.textContent =
        '📄 PDF';

      card.appendChild(pdfBox);
    }

    // 情報
    const info =
      document.createElement('div');

    info.className =
      'preview-info';

    const name =
      document.createElement('div');

    name.className =
      'preview-name';

    name.textContent =
      file.name;

    const size =
      document.createElement('div');

    size.className =
      'preview-size';

    size.textContent =
      `${(
        file.size /
        1024 /
        1024
      ).toFixed(2)} MB`;

    info.appendChild(name);

    info.appendChild(size);

    card.appendChild(info);

    // ダウンロードボタン
    const downloadBtn =
      document.createElement('button');

    downloadBtn.className =
      'download-btn';

    downloadBtn.textContent =
      '⬇ ダウンロード';

    downloadBtn.disabled =
      !convertedFiles[file.name];

    downloadBtn.addEventListener(
      'click',
      () => {

        const converted =
          convertedFiles[file.name];

        if (!converted) return;

        const url =
          URL.createObjectURL(
            converted.blob
          );

        const a =
          document.createElement('a');

        a.href = url;

        a.download =
          converted.name;

        a.click();

        URL.revokeObjectURL(url);
      }
    );

    card.appendChild(downloadBtn);

    previewGrid.appendChild(card);
  });
}

// 変換開始
convertBtn.addEventListener(
  'click',
  async () => {

    if (!files.length) {

      alert(
        'ファイルを追加してください'
      );

      return;
    }

    convertedFiles = {};

    progressBar.style.width = '0%';

    statusText.textContent =
      '変換中...';

    const targetFormat =
      formatSelect.value;

    const zip =
      new JSZip();

    let mergedPdf = null;

    // PDF統合
    if (targetFormat === 'pdf') {

      const { jsPDF } =
        window.jspdf;

      mergedPdf =
        new jsPDF();
    }

    for (
      let i = 0;
      i < files.length;
      i++
    ) {

      const file =
        files[i];

      const ext =
        file.name
        .split('.')
        .pop()
        .toLowerCase();

      if (ext === 'pdf') {

        await convertPDF(
          file,
          targetFormat,
          zip
        );

      } else {

        await convertImage(
          file,
          targetFormat,
          zip,
          mergedPdf,
          i
        );
      }

      const progress =
        (
          (i + 1) /
          files.length
        ) * 100;

      progressBar.style.width =
        `${progress}%`;

      statusText.textContent =
        `変換中... ${i + 1} / ${files.length}`;
    }

    // 統合PDF生成
    if (
      targetFormat === 'pdf'
    ) {

      const pdfBlob =
        mergedPdf.output('blob');

      zip.file(
        'merged.pdf',
        pdfBlob
      );

      convertedFiles[
        'merged.pdf'
      ] = {

        blob: pdfBlob,

        name: 'merged.pdf'
      };
    }

    const content =
      await zip.generateAsync({
        type:'blob'
      });

    await saveZipToFolder(content);

    statusText.textContent =
      '変換完了';

    renderFiles();
  }
);

// 画像変換
async function convertImage(
  file,
  targetFormat,
  zip,
  mergedPdf,
  index
) {

  const img = new Image();

  const reader =
    new FileReader();

  const dataUrl =
    await new Promise(resolve => {

      reader.onload = e => {
        resolve(e.target.result);
      };

      reader.readAsDataURL(file);
    });

  img.src = dataUrl;

  await new Promise(resolve => {
    img.onload = resolve;
  });

  const canvas =
    document.createElement('canvas');

  const ctx =
    canvas.getContext('2d');

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(
    img,
    0,
    0
  );

  // PDF統合
  if (targetFormat === 'pdf') {

    const imgData =
      canvas.toDataURL(
        'image/jpeg',
        1.0
      );

    const pdfWidth =
      mergedPdf.internal
      .pageSize
      .getWidth();

    const pdfHeight =
      (
        img.height *
        pdfWidth
      ) / img.width;

    if (index !== 0) {

      mergedPdf.addPage();
    }

    mergedPdf.addImage(
      imgData,
      'JPEG',
      0,
      0,
      pdfWidth,
      pdfHeight
    );

    return;
  }

  // 通常画像変換
  const mime =
    `image/${targetFormat}`;

  const blob =
    await new Promise(resolve => {

      canvas.toBlob(
        resolve,
        mime,
        0.95
      );
    });

  const convertedName =
    changeExtension(
      file.name,
      targetFormat
    );

  zip.file(
    convertedName,
    blob
  );

  convertedFiles[file.name] = {

    blob,

    name: convertedName
  };
}

// PDF変換
async function convertPDF(
  file,
  targetFormat,
  zip
) {

  if (targetFormat === 'pdf') {

    zip.file(
      file.name,
      file
    );

    return;
  }

  const arrayBuffer =
    await file.arrayBuffer();

  const pdf =
    await pdfjsLib
    .getDocument({
      data: arrayBuffer
    })
    .promise;

  const page =
    await pdf.getPage(1);

  const viewport =
    page.getViewport({
      scale: 2
    });

  const canvas =
    document.createElement('canvas');

  const ctx =
    canvas.getContext('2d');

  canvas.width =
    viewport.width;

  canvas.height =
    viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  const mime =
    `image/${targetFormat}`;

  const blob =
    await new Promise(resolve => {

      canvas.toBlob(
        resolve,
        mime,
        0.95
      );
    });

  const convertedName =
    changeExtension(
      file.name,
      targetFormat
    );

  zip.file(
    convertedName,
    blob
  );

  convertedFiles[file.name] = {

    blob,

    name: convertedName
  };
}

// ZIP保存
async function saveZipToFolder(blob) {

  if (!outputDirectoryHandle) {

    saveAs(
      blob,
      'converted_files.zip'
    );

    return;
  }

  const fileHandle =
    await outputDirectoryHandle
    .getFileHandle(
      'converted_files.zip',
      {
        create:true
      }
    );

  const writable =
    await fileHandle
    .createWritable();

  await writable.write(blob);

  await writable.close();
}

// 拡張子変更
function changeExtension(
  name,
  ext
) {

  return (
    name.replace(
      /\.[^/.]+$/,
      ''
    ) +
    '.' +
    ext
  );
}