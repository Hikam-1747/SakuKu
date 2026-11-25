import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  BusinessProfile,
  DashboardSummary,
  RabMetric,
  TransactionItem,
} from '../types/finance';
import {
  buildPdfFilename,
  detectImageFormatFromDataUrl,
  formatRupiah,
  normalizeBusinessProfile,
} from './finance';

export interface ExportPdfReportOptions {
  businessProfile: BusinessProfile;
  periodLabel: string;
  summary: DashboardSummary;
  rabMetrics: RabMetric[];
  transactions: TransactionItem[];
}

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

export async function exportFinancePdfReport(
  options: ExportPdfReportOptions
): Promise<string> {
  const profile = normalizeBusinessProfile(options.businessProfile);
  const filename = buildPdfFilename(profile.businessName, options.periodLabel);

  // Brief yield so React can paint the "Menyiapkan PDF..." loading label before PDF assembly
  await new Promise((resolve) => setTimeout(resolve, 120));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as JsPdfWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 14;

  // 1. Header Laporan
  let textStartX = marginX;
  const imgFormat = detectImageFormatFromDataUrl(profile.logoDataUrl);
  if (profile.logoDataUrl && imgFormat) {
    try {
      doc.addImage(profile.logoDataUrl, imgFormat, marginX, cursorY, 16, 16);
      textStartX = marginX + 20;
    } catch {
      textStartX = marginX;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.businessName, textStartX, cursorY + 5);

  let leftHeaderY = cursorY + 10;
  if (profile.tagline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(29, 78, 216);
    doc.text(profile.tagline, textStartX, leftHeaderY);
    leftHeaderY += 4.5;
  }

  if (profile.addressContact) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const wrappedAddress = doc.splitTextToSize(
      profile.addressContact,
      contentWidth * 0.56
    );
    doc.text(wrappedAddress, textStartX, leftHeaderY);
    leftHeaderY += wrappedAddress.length * 4;
  }

  const printedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('LAPORAN BUDGET BULANAN', pageWidth - marginX, cursorY + 5, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Periode: ${options.periodLabel}`,
    pageWidth - marginX,
    cursorY + 10,
    { align: 'right' }
  );
  doc.text(`Dicetak: ${printedDate}`, pageWidth - marginX, cursorY + 14.5, {
    align: 'right',
  });

  cursorY = Math.max(cursorY + 19, leftHeaderY + 2);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 6;

  // 2. Ringkasan Keuangan (4 KPI Cards)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Ringkasan Uang Saku & Budget', marginX, cursorY);
  cursorY += 3.5;

  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 18;
  const kpiCards: Array<{
    label: string;
    value: string;
    rgb: [number, number, number];
  }> = [
    {
      label: 'Total Pemasukan',
      value: formatRupiah(options.summary.totalIncome),
      rgb: [5, 150, 105],
    },
    {
      label: 'Jatah Anggaran',
      value: formatRupiah(options.summary.totalRabTarget),
      rgb: [29, 78, 216],
    },
    {
      label: 'Total Terpakai',
      value: formatRupiah(options.summary.totalExpense),
      rgb: [185, 28, 28],
    },
    {
      label: 'Sisa Uang Saku',
      value: formatRupiah(options.summary.netCashflow),
      rgb:
        options.summary.netCashflow >= 0 ? [15, 23, 42] : [185, 28, 28],
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = marginX + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cursorY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 3, cursorY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(card.rgb[0], card.rgb[1], card.rgb[2]);
    doc.text(card.value, x + 3, cursorY + 13.5, {
      maxWidth: cardWidth - 6,
    });
  });

  cursorY += cardHeight + 8;

  // 3. Tabel Perbandingan Jatah Anggaran vs Terpakai
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Perbandingan Jatah Anggaran vs Terpakai', marginX, cursorY);
  cursorY += 3;

  if (options.rabMetrics.length > 0) {
    const totalAllocated = options.rabMetrics.reduce((s, r) => s + r.allocated, 0);
    const totalSpent = options.rabMetrics.reduce((s, r) => s + r.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const totalPct =
      totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          'Kategori Budget',
          'Jatah Anggaran',
          'Terpakai',
          'Sisa Jatah',
          'Terpakai (%)',
          'Status',
        ],
      ],
      body: options.rabMetrics.map((item) => [
        item.category,
        formatRupiah(item.allocated),
        formatRupiah(item.spent),
        formatRupiah(item.remaining),
        `${item.utilizationPct.toFixed(1)}%`,
        item.status,
      ]),
      foot: [
        [
          'Total Budget Bulanan',
          formatRupiah(totalAllocated),
          formatRupiah(totalSpent),
          formatRupiah(totalRemaining),
          `${totalPct.toFixed(1)}%`,
          '',
        ],
      ],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 28 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw ?? '');
          if (val === 'Over-Budget') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Mendekati Limit') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY + 20) + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Belum ada data kategori budget pada laporan ini.', marginX, cursorY + 4);
    cursorY += 12;
  }

  // 4. Tabel Rincian Transaksi
  if (cursorY > pageHeight - 36) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Rincian Transaksi (${options.periodLabel})`,
    marginX,
    cursorY
  );
  cursorY += 3;

  const sortedTx = [...options.transactions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  if (sortedTx.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          'Tanggal',
          'Judul Transaksi',
          'Kategori / Sumber',
          'Jenis',
          'Nominal',
          'Metode / Status',
        ],
      ],
      body: sortedTx.map((tx) => [
        tx.date,
        tx.title,
        tx.category,
        tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `${tx.type === 'income' ? '+' : '-'}${formatRupiah(tx.amount)}`,
        `${tx.method} (${tx.status})`,
      ]),
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2.3,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 21 },
        1: { cellWidth: 48 },
        2: { cellWidth: 34 },
        3: { cellWidth: 22 },
        4: { halign: 'right', cellWidth: 28 },
        5: { cellWidth: 29 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const text = String(data.cell.raw ?? '');
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = text.startsWith('+')
            ? [5, 150, 105]
            : [185, 28, 28];
        }
      },
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Tidak ada transaksi tercatat pada periode ${options.periodLabel}.`,
      marginX,
      cursorY + 4
    );
  }

  // Page footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${profile.businessName} · Periode ${options.periodLabel}`,
      marginX,
      pageHeight - 8
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - marginX,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  doc.save(filename);
  return filename;
}
