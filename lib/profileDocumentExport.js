export const formatThaiDate = (value) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export async function exportProfilePdf(element, filename) {
  if (!element) {
    return;
  }

  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf()
    .from(element)
    .set({
      margin: [8, 8, 8, 8],
      filename,
      html2canvas: { scale: 2.4, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .save();
}

export function exportProfileWord(element, filename) {
  if (!element) {
    return;
  }

  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Profile Document</title>
    </head>
    <body>${element.innerHTML}</body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
