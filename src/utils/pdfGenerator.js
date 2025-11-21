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
      const subtotal = costPerAdult * numberOfAdults;
      
      // Calculate discount
      let discountAmount = 0;
      const discountType = formData.discountType || 'none';
      const discountValue = parseFloat(formData.discountValue) || 0;
      
      if (discountType === 'percentage' && discountValue > 0) {
        discountAmount = (subtotal * discountValue) / 100;
      } else if (discountType === 'fixed' && discountValue > 0) {
        discountAmount = discountValue;
      }
      
      const totalPackageValue = subtotal - discountAmount;
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

      // ============================================================
      // SINGLE PAGE LAYOUT WITH ALL INFORMATION
      // ============================================================
      
      // Add watermark
      addWatermark(doc);

      // Dark blue header bar with increased height
      const headerHeight = 140;
      doc
        .rect(0, 0, doc.page.width, headerHeight)
        .fillColor(primaryColor)
        .fill();

      // Add logo on the left side of the header
      const logoPath = path.join(__dirname, '../assets/logo.png');
      try {
        const logoSize = 50;
        const logoX = 70; // Left side positioning
        const logoY = 25; // Aligned with company name
        doc.image(logoPath, logoX, logoY, { width: logoSize });
      } catch (error) {
        console.log('Logo image not found');
      }

      // Register American Captain font
      const americanCaptainPath = path.join(__dirname, '../assets/AmericanCaptain.otf');
      try {
        doc.registerFont('AmericanCaptain', americanCaptainPath);
        doc.font('AmericanCaptain');
      } catch (error) {
        doc.font('Helvetica-Bold');
      }

      // Company name in white with American Captain font (all caps) - positioned to the right of logo
      doc
        .fontSize(20)
        .fillColor('#ffffff')
        .text('YATRASUTRA HOLIDAYS PVT. LTD.', 135, 40, { align: 'left' });
      
      // Booking confirmation receipt text below company name
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#ffffff')
        .text('BOOKING CONFIRMATION RECEIPT', 0, 65, { align: 'center', width: doc.page.width });

      // Company details inside the blue header (white text)
      doc
        .fontSize(6.5)
        .fillColor('#ffffff')
        .text('Registered Address: 1st Floor, Penta Corner Building, Changampuzha Metro Station, Edapally, Kochi (Ernakulam) – Kerala, 682024, India', 0, 90, { align: 'center', width: doc.page.width })
        .text('Email: info@yatrasutra.com | Phone: +91 97468 16609 / +91 97468 26609 | Website: www.yatrasutra.com', 0, 100, { align: 'center', width: doc.page.width });
      
      // Reset to regular font
      doc.font('Helvetica');

      let yPosition = 155;

      // === INVOICE DETAILS TABLE ===
      drawSectionHeader(doc, yPosition, 'INVOICE DETAILS');
      yPosition += 12;

      drawCompactTable(doc, yPosition, [
        ['Invoice No.', `YS/INV/2025/071`],
        ['Invoice Date', invoiceDate],
        ['Payment Status', 'Advance Paid'],
        ['Payment Date', invoiceDate],
        ['Mode of Payment', `UPI - yatrasutra@upi`]
      ]);

      yPosition = doc.y + 4;

      // === CLIENT DETAILS TABLE ===
      drawSectionHeader(doc, yPosition, 'CLIENT DETAILS');
      yPosition += 12;

      drawCompactTable(doc, yPosition, [
        ['Client Name', formData.clientName || 'N/A'],
        ['Email', formData.email || 'N/A'],
        ['Contact No.', formData.contactNo || 'N/A'],
        ['Booking Reference', bookingRef]
      ]);

      yPosition = doc.y + 4;

      // === BOOKING SUMMARY TABLE ===
      drawSectionHeader(doc, yPosition, 'BOOKING SUMMARY');
      yPosition += 12;

      const packageTypeMap = {
        'deluxe': 'Deluxe',
        'standard': 'Standard',
        'premium': 'Premium',
        'luxury': 'Luxury'
      };

      // Add property name row if available
      const bookingSummaryRows = [
        ['Destination', 'Duration', 'Travel Dates', 'Guests', 'Package Type', 'Meal Plan'],
        [
          formData.destination || 'N/A',
          durationText,
          travelDates,
          `${numberOfAdults} Adults`,
          packageTypeMap[formData.packageType] || formData.packageType,
          formData.mealPlan || 'N/A'
        ]
      ];

      // Add property name as a separate row if it exists
      if (formData.propertyName) {
        bookingSummaryRows.push([
          'Property/Hotel',
          formData.propertyName,
          '',
          '',
          '',
          ''
        ]);
      }

      drawWideTable(doc, yPosition, bookingSummaryRows);

      yPosition = doc.y + 4;

      // === COST BREAKDOWN TABLE ===
      drawSectionHeader(doc, yPosition, 'COST BREAKDOWN');
      yPosition += 12;

      // Build cost breakdown rows dynamically
      const costRows = [
        ['Particulars', 'Qty', 'Rate (INR)', 'Amount (INR)'],
        ['Tour Package Cost per Adult', numberOfAdults.toString(), costPerAdult.toLocaleString('en-IN'), subtotal.toLocaleString('en-IN')],
        ['Additional Services (if any)', '', '', formData.additionalServices ? 'Included' : '-']
      ];
      
      // Add discount row if applicable
      if (discountAmount > 0) {
        let discountLabel = 'Discount';
        if (formData.discountReason) {
          discountLabel += ` (${formData.discountReason})`;
        } else if (discountType === 'percentage') {
          discountLabel += ` (${discountValue}%)`;
        }
        costRows.push([discountLabel, '', '', `- ${discountAmount.toLocaleString('en-IN')}`]);
      }
      
      costRows.push(
        ['Total Package Value', '', '', totalPackageValue.toLocaleString('en-IN')],
        ['Advance Amount Received', '', '', advanceAmount.toLocaleString('en-IN')],
        ['Balance Payable (Due 10 Days Before Check-in)', '', '', balancePayable.toLocaleString('en-IN')]
      );
      
      drawCostTable(doc, yPosition, costRows);

      yPosition = doc.y + 4;

      // === TERMS & NOTES ===
      drawSectionHeader(doc, yPosition, 'TERMS & NOTES');
      yPosition += 13;

      // Use custom terms and notes if provided, otherwise use default terms
      if (formData.termsAndNotes && formData.termsAndNotes.trim()) {
        // Display custom terms and notes
        doc
          .fontSize(7)
          .fillColor('#000000')
          .text(formData.termsAndNotes, 55, yPosition, { 
            width: 490, 
            align: 'left',
            lineGap: 1
          });
      } else {
        // Default terms and notes
        doc
          .fontSize(7)
          .fillColor('#000000')
          .text('• Advance payment confirms the booking.', 55, yPosition)
          .text(`• Balance payment of Rs.${balancePayable.toLocaleString('en-IN')} is due by ${formatDate(formData.checkInDate)} (10 days before check-in).`, 55, yPosition + 8)
          .text('• Package once confirmed is non-refundable as per the company cancellation policy.', 55, yPosition + 16)
          .text('• Any change in travel dates or number of guests is subject to availability and price revision.', 55, yPosition + 24)
          .text('• All communication and receipts are issued under Yatrasutra Holidays Pvt. Ltd.', 55, yPosition + 32);
      }

      yPosition = doc.y + 8;

      // === AUTHORIZED SIGNATORY (left) ===
      doc
        .fontSize(8)
        .fillColor('#000000')
        .text('Authorized Signatory', 55, yPosition)
        .text('(Seal & Signature)', 55, yPosition + 13)
        .text('For Yatrasutra Holidays Pvt. Ltd.', 55, yPosition + 26);

      // === FOOTER WITH ORANGE BAR ===
      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      const footerBarHeight = 45;
      const footerY = pageHeight - footerBarHeight - 70;

      // Add seal on the bottom right, above the footer bar
      const sealPath = path.join(__dirname, '../assets/seal.png');
      try {
        const sealSize = 150; // Increased from 85
        const sealX = pageWidth - sealSize - 65; // Positioned from right edge
        const sealY = footerY - sealSize - 5; // Above the footer bar
        doc.image(sealPath, sealX, sealY, { width: sealSize });
      } catch (error) {
        console.error('Seal image not found');
      }

      // Orange background bar
      doc
        .rect(50, footerY, 495, footerBarHeight)
        .fillColor(orangeColor)
        .fill();

      // Footer content on orange bar - left (phone)
      doc
        .fontSize(7.5)
        .fillColor('#ffffff')
        .text('+91 97468 16609', 60, footerY + 13)
        .text('+91 97468 26609', 60, footerY + 24);

      // Footer content - center (website)
      doc
        .fontSize(8)
        .fillColor('#ffffff')
        .text('yatrasutra.com', 50, footerY + 18, { align: 'center', width: 495 });

      // Footer content - right (email)
      doc
        .fontSize(7.5)
        .fillColor('#ffffff')
        .text('info@yatrasutra.com |', 370, footerY + 13)
        .text('bookings@yatrasutra.com', 360, footerY + 24);

      // Company name below orange bar
      doc
        .fontSize(9)
        .fillColor('#000000')
        .text('YATRASUTRA HOLIDAYS PVT LTD', 0, footerY + footerBarHeight + 8, { align: 'center', width: pageWidth });

      // Finalize PDF
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
    .rect(50, y, 495, 12)
    .fillColor('#fbbf24')
    .fill();
  
  doc
    .fontSize(8)
    .fillColor('#000000')
    .text(text, 55, y + 2);
}

/**
 * Draw a compact table
 */
function drawCompactTable(doc, y, rows) {
  const cellHeight = 12;
  const col1Width = 200;
  const col2Width = 295;
  let currentY = y;

  rows.forEach((row) => {
    doc.rect(50, currentY, col1Width, cellHeight).stroke();
    doc.rect(50 + col1Width, currentY, col2Width, cellHeight).stroke();

    doc
      .fontSize(7)
      .fillColor('#000000')
      .text(row[0], 53, currentY + 3, { width: col1Width - 6 })
      .text(row[1], 53 + col1Width, currentY + 3, { width: col2Width - 6 });

    currentY += cellHeight;
  });

  doc.y = currentY;
}

/**
 * Draw a wide table with multiple columns
 */
function drawWideTable(doc, y, rows) {
  const cellHeight = 12;
  const colWidths = [80, 70, 100, 60, 90, 95];
  let currentY = y;

  rows.forEach((row) => {
    let currentX = 50;

    row.forEach((cell, colIndex) => {
      doc.rect(currentX, currentY, colWidths[colIndex], cellHeight).stroke();
      doc
        .fontSize(6.5)
        .fillColor('#000000')
        .text(cell, currentX + 2, currentY + 3, { width: colWidths[colIndex] - 4 });

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
  const cellHeight = 12;
  const colWidths = [250, 60, 90, 95];
  let currentY = y;

  rows.forEach((row, index) => {
    let currentX = 50;

    row.forEach((cell, colIndex) => {
      doc.rect(currentX, currentY, colWidths[colIndex], cellHeight).stroke();

      const fontSize = index === 0 ? 7 : 6.5;

      doc
        .fontSize(fontSize)
        .fillColor('#000000')
        .text(cell, currentX + 2, currentY + 3, { width: colWidths[colIndex] - 4 });

      currentX += colWidths[colIndex];
    });

    currentY += cellHeight;
  });

  doc.y = currentY;
}

export default generatePDF;