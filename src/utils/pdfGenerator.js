import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a Booking Confirmation PDF
 * @param {Object} formData - The form data to include in the PDF
 * @param {string} submissionId - The submission ID (used as Invoice No)
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generatePDF = (formData, submissionId) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        autoFirstPage: true
      });
      const buffers = [];

      // Collect PDF data chunks
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Calculate costs
      const costPerAdult = parseFloat(formData.costPerAdult) || 0;
      const numberOfAdults = parseInt(formData.numberOfAdults) || 0;
      const totalPackageValue = costPerAdult * numberOfAdults;
      const advanceAmount = parseFloat(formData.advanceAmount) || 0;
      const balancePayable = totalPackageValue - advanceAmount;
      
      // Calculate duration
      const duration = formData.duration || 3;
      const durationText = `${duration} Nights / ${parseInt(duration) + 1} Days`;

      // Format dates
      const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      const invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const travelDates = `${formatDate(formData.checkInDate)} - ${formatDate(formData.checkOutDate)}`;

      // Generate booking reference
      const bookingRef = `LKD/2026/15MAY`;

      // Colors
      const primaryColor = '#1e3a8a';
      const orangeColor = '#f97316';
      const tableBg = '#fbbf24';

      // Add watermark
      addWatermark(doc);

      // === HEADER SECTION WITH LOGO ===
      const logoPath = path.join(__dirname, '../assets/logo.png');
      
      try {
        doc.image(logoPath, 250, 40, { width: 95 });
      } catch (error) {
        doc
          .fontSize(20)
          .fillColor(orangeColor)
          .text('YATRASUTRA', 50, 50, { align: 'center', width: 495 });
      }

      // Title
      doc
        .fontSize(16)
        .fillColor(primaryColor)
        .text('BOOKING CONFIRMATION RECEIPT', 50, 95, { align: 'center', width: 495 });

      // Company header - moved to just after title
      doc
        .fontSize(8)
        .fillColor('#1e3a8a')
        .text('Registered Address: 2nd Floor, ABC Towers, MG Road, Kochi # 682016', 50, 118, { align: 'center', width: 495 })
        .text('Email: info@yatrasutra.com | Phone: +91 98765 43210 | Website: yatrasutra.com', 50, 128, { align: 'center', width: 495 });

      let yPosition = 148;

      // === INVOICE DETAILS TABLE ===
      drawSectionHeader(doc, yPosition, 'INVOICE DETAILS');
      yPosition += 18;

      drawCompactTable(doc, yPosition, [
        ['Invoice No.', `YS/INV/2025/071`],
        ['Invoice Date', invoiceDate],
        ['Payment Status', 'Advance Paid'],
        ['Payment Date', invoiceDate],
        ['Mode of Payment', `UPI - yatrasutra@upi`]
      ]);

      yPosition = doc.y + 8;

      // === CLIENT DETAILS TABLE ===
      drawSectionHeader(doc, yPosition, 'CLIENT DETAILS');
      yPosition += 18;

      drawCompactTable(doc, yPosition, [
        ['Client Name', formData.clientName || 'N/A'],
        ['Email', formData.email || 'N/A'],
        ['Contact No.', formData.contactNo || 'N/A'],
        ['Booking Reference', bookingRef]
      ]);

      yPosition = doc.y + 8;

      // === BOOKING SUMMARY TABLE ===
      drawSectionHeader(doc, yPosition, 'BOOKING SUMMARY');
      yPosition += 18;

      const packageTypeMap = {
        'deluxe': 'Deluxe',
        'standard': 'Standard',
        'premium': 'Premium',
        'luxury': 'Luxury'
      };

      drawWideTable(doc, yPosition, [
        ['Destination', 'Duration', 'Travel Dates', 'Guests', 'Package Type', 'Meal Plan'],
        [
          formData.destination || 'N/A',
          durationText,
          travelDates,
          `${numberOfAdults} Adults`,
          packageTypeMap[formData.packageType] || formData.packageType,
          formData.mealPlan || 'N/A'
        ]
      ]);

      yPosition = doc.y + 8;

      // === COST BREAKDOWN TABLE ===
      drawSectionHeader(doc, yPosition, 'COST BREAKDOWN');
      yPosition += 18;

      drawCostTable(doc, yPosition, [
        ['Particulars', 'Qty', 'Rate (INR)', 'Amount (INR)'],
        ['Tour Package Cost per Adult', numberOfAdults.toString(), costPerAdult.toLocaleString('en-IN'), totalPackageValue.toLocaleString('en-IN')],
        ['Additional Services (if any)', '', '', formData.additionalServices ? 'Included' : '-'],
        ['Total Package Value', '', '', totalPackageValue.toLocaleString('en-IN')],
        ['Advance Amount Received', '', '', advanceAmount.toLocaleString('en-IN')],
        ['Balance Payable (Due 10 Days Before Check-in)', '', '', balancePayable.toLocaleString('en-IN')]
      ]);

      yPosition = doc.y + 8;

      // === TERMS & NOTES ===
      drawSectionHeader(doc, yPosition, 'TERMS & NOTES (EDITABLE SECTION)');
      yPosition += 18;

      doc
        .fontSize(8)
        .fillColor('#000000')
        .text('• Advance payment confirms the booking.', 55, yPosition)
        .text(`• Balance payment of Rs.${balancePayable.toLocaleString('en-IN')} is due by ${formatDate(formData.checkInDate)} (10 days before check-in).`, 55, yPosition + 10)
        .text('• Package once confirmed is non-refundable as per the company cancellation policy.', 55, yPosition + 20)
        .text('• Any change in travel dates or number of guests is subject to availability and price revision.', 55, yPosition + 30)
        .text('• All communication and receipts are issued under Yatrasutra Holidays Pvt. Ltd.', 55, yPosition + 40);

      yPosition = doc.y + 15;

      // === AUTHORIZED SIGNATORY ===
      doc
        .fontSize(9)
        .fillColor('#000000')
        .text('Authorized Signatory', 55, yPosition)
        .text('(Seal & Signature)', 55, yPosition + 11)
        .text('For Yatrasutra Holidays Pvt. Ltd.', 55, yPosition + 22);

      // === FIXED FOOTER SECTION AT BOTTOM (NO ORANGE BAR) ===
      const pageHeight = doc.page.height;
      const sealSize = 100; // Bigger seal size (increased from 90)
      const footerTotalHeight = sealSize + 20; // seal + company name
      const footerStartY = pageHeight - footerTotalHeight - 10;
      
      // Check if current position is too close to footer - if so, add page
      if (doc.y > footerStartY) {
        doc.addPage();
        addWatermark(doc);
      }

      // Position seal at the bottom of the current page
      const sealY = pageHeight - footerTotalHeight;
      const sealPath = path.join(__dirname, '../assets/seal.png');
      
      try {
        const sealX = (doc.page.width - sealSize) / 2;
        doc.image(sealPath, sealX, sealY, { width: sealSize });
      } catch (error) {
        console.error('Seal image not found');
      }

      // Bottom company name - positioned below seal
      doc
        .fontSize(10)
        .fillColor('#000000')
        .text('YATRASUTRA HOLIDAYS PVT LTD', 0, sealY + sealSize + 8, { align: 'center', width: doc.page.width });

      // Finalize PDF - this ends the document
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Add watermark to the page
 */
function addWatermark(doc) {
  doc.save();
  doc
    .fontSize(70)
    .fillColor('#e5e7eb', 0.3)
    .rotate(-45, { origin: [300, 400] })
    .text('YATRASUTRA', 120, 360, { lineBreak: false });
  doc.restore();
}

/**
 * Draw section header
 */
function drawSectionHeader(doc, y, text) {
  doc
    .rect(50, y, 495, 15)
    .fillColor('#fbbf24')
    .fill();
  
  doc
    .fontSize(9)
    .fillColor('#000000')
    .text(text, 55, y + 3);
}

/**
 * Draw a compact table
 */
function drawCompactTable(doc, y, rows) {
  const cellHeight = 15;
  const col1Width = 200;
  const col2Width = 295;
  let currentY = y;

  rows.forEach((row) => {
    doc.rect(50, currentY, col1Width, cellHeight).stroke();
    doc.rect(50 + col1Width, currentY, col2Width, cellHeight).stroke();

    doc
      .fontSize(8)
      .fillColor('#000000')
      .text(row[0], 53, currentY + 4, { width: col1Width - 6 })
      .text(row[1], 53 + col1Width, currentY + 4, { width: col2Width - 6 });

    currentY += cellHeight;
  });

  doc.y = currentY;
}

/**
 * Draw a wide table with multiple columns
 */
function drawWideTable(doc, y, rows) {
  const cellHeight = 15;
  const colWidths = [80, 70, 100, 60, 90, 95];
  let currentY = y;

  rows.forEach((row) => {
    let currentX = 50;

    row.forEach((cell, colIndex) => {
      doc.rect(currentX, currentY, colWidths[colIndex], cellHeight).stroke();
      doc
        .fontSize(7)
        .fillColor('#000000')
        .text(cell, currentX + 2, currentY + 4, { width: colWidths[colIndex] - 4 });

      currentX += colWidths[colIndex];
    });

    currentY += cellHeight;
  });

  doc.y = currentY;
}

/**
 * Draw cost breakdown table
 */
function drawCostTable(doc, y, rows) {
  const cellHeight = 15;
  const colWidths = [250, 60, 90, 95];
  let currentY = y;

  rows.forEach((row, index) => {
    let currentX = 50;

    row.forEach((cell, colIndex) => {
      doc.rect(currentX, currentY, colWidths[colIndex], cellHeight).stroke();

      const fontSize = index === 0 ? 8 : 7;

      doc
        .fontSize(fontSize)
        .fillColor('#000000')
        .text(cell, currentX + 2, currentY + 4, { width: colWidths[colIndex] - 4 });

      currentX += colWidths[colIndex];
    });

    currentY += cellHeight;
  });

  doc.y = currentY;
}

export default generatePDF;