import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrintService {
  printHtml(html: string, title = 'Ticket') {
    const popup = window.open('', '_blank', 'width=360,height=600,noopener,noreferrer');
    if (!popup) return;

    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 12px; }
    h1,h2,h3,h4,h5 { margin: 0 0 8px 0; font-weight: 600; }
    .line { display:flex; justify-content:space-between; margin: 4px 0; }
    .muted { color: #666; font-size: 12px; }
    .items { border-top: 1px dashed #999; border-bottom: 1px dashed #999; margin: 12px 0; padding: 8px 0; }
    .total { font-weight: 700; font-size: 18px; margin-top: 6px; }
    .qty { color:#666; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${html}
  <script>window.addEventListener('load', () => { window.print(); window.close(); });</script>
</body>
</html>`);
    popup.document.close();
  }

  async printHtmlAsPdf(html: string, filename = 'ticket.pdf', options?: { fullWidth?: boolean, singlePage?: boolean }) {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = options && options.fullWidth ? '800px' : '300px';
      container.innerHTML = html;
      document.body.appendChild(container);

      await new Promise(r => setTimeout(r, 50));

      const canvas = await html2canvas(container, { scale: 2 });

      const unit = 'px';
      const margin = 20;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const tempPdf = new jsPDF({ unit, format: 'a4' });
      const pageWidth = tempPdf.internal.pageSize.getWidth();
      const pageHeight = tempPdf.internal.pageSize.getHeight();
      const availableWidth = pageWidth - margin * 2;
      const scale = availableWidth / imgWidth;
      const renderedHeight = imgHeight * scale;

      const singlePage = options && options.singlePage !== undefined ? options.singlePage : true;

      if (singlePage) {
        const pdf = new jsPDF({ unit, format: [pageWidth, Math.ceil(renderedHeight + margin * 2)] });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, renderedHeight);
        pdf.save(filename);
      } else {
        const pdf = new jsPDF({ unit, format: 'a4' });
        if (renderedHeight <= pageHeight - margin * 2) {
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, renderedHeight);
        } else {
          const sliceHeightPx = Math.floor((pageHeight - margin * 2) / scale);
          let y = 0;
          while (y < imgHeight) {
            const h = Math.min(sliceHeightPx, imgHeight - y);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = imgWidth;
            sliceCanvas.height = h;
            const ctx = sliceCanvas.getContext('2d')!;
            ctx.drawImage(canvas, 0, y, imgWidth, h, 0, 0, imgWidth, h);
            const imgData = sliceCanvas.toDataURL('image/png');
            const hRendered = h * scale;
            pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, hRendered);
            y += h;
            if (y < imgHeight) pdf.addPage();
          }
        }
        pdf.save(filename);
      }

      container.remove();
    } catch (e) {
      console.error('PDF generation failed, falling back to print:', e);
      this.printHtml(html);
    }
  }
}
