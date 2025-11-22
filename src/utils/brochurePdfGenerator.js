import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { destinationImages, bookingPolicy } from '../config/itineraryData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a Brochure PDF for Itinerary
 * @param {Object} formData - The itinerary data to include in the PDF
 * @param {string} submissionId - The submission ID
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateBrochurePDF = (formData, submissionId) => {
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

      // Colors matching the brochure design
      const primaryColor = '#1e3a8a'; // Dark blue
      const tealColor = '#3b9baa'; // Teal for headers
      const lightBg = '#e0f2f7'; // Light blue background

      // ============================================================
      // PAGE 1: ITINERARY DETAILS
      // ============================================================
      
      // Add watermark
      addWatermark(doc);

      // Header with company logo and info
      addCompanyHeader(doc, primaryColor);

      let yPosition = 155;

      // TENTATIVE ITINERARY Header
      doc
        .rect(0, yPosition, doc.page.width, 35)
        .fillColor(tealColor)
        .fill();
      
      doc
        .fontSize(18)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('TENTATIVE ITINERARY', 0, yPosition + 10, { align: 'center', width: doc.page.width });

      yPosition += 50;

      // Day-wise Itinerary Section
      const days = formData.days || [];
      
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        
        // Check if we need a new page
        if (yPosition > 650) {
          doc.addPage();
          addWatermark(doc);
          yPosition = 50;
        }

        // Day header row
        doc
          .rect(50, yPosition, 495, 20)
          .fillColor(lightBg)
          .fill();
        
        doc
          .fontSize(9)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text('DAY', 55, yPosition + 5, { width: 80, align: 'left' })
          .text('DAY WISE ITINERARY', 270, yPosition + 5, { width: 270, align: 'left' });

        yPosition += 20;

        // Day number and title
        doc
          .rect(50, yPosition, 495, 25)
          .fillColor('#ffffff')
          .fill()
          .stroke();

        doc
          .fontSize(8)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text(`DAY ${day.dayNumber}`, 55, yPosition + 8, { width: 80 });

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(day.title.toUpperCase(), 140, yPosition + 8, { width: 395 });

        yPosition += 25;

        // Day content with image and description
        const contentHeight = Math.max(120, Math.ceil(day.description.length / 3));
        
        doc
          .rect(50, yPosition, 495, contentHeight)
          .fillColor('#ffffff')
          .fill()
          .stroke();

        // Add destination image if available
        const destinationName = formData.destination.toUpperCase();
        const imageMap = destinationImages[destinationName] || destinationImages['DEFAULT'];
        const imageName = imageMap[`day${day.dayNumber}`] || imageMap['day1'];
        const imagePath = path.join(__dirname, `../assets/destinations/${imageName}`);
        
        try {
          const imageSize = 100;
          const imageX = 60;
          const imageY = yPosition + 10;
          doc.image(imagePath, imageX, imageY, { width: imageSize, height: imageSize });
        } catch (error) {
          console.log(`Destination image not found: ${imageName}`);
          // Draw placeholder rectangle for image
          doc
            .rect(60, yPosition + 10, 100, 100)
            .fillColor('#e5e7eb')
            .fill()
            .stroke();
        }

        // Description text
        doc
          .fontSize(7.5)
          .fillColor('#000000')
          .font('Helvetica')
          .text(day.description, 175, yPosition + 10, { 
            width: 355, 
            align: 'justify',
            lineGap: 2
          });

        yPosition += contentHeight + 5;
      }

      // ============================================================
      // PAGE 2: ACCOMMODATION & PRICING
      // ============================================================
      doc.addPage();
      addWatermark(doc);
      
      yPosition = 50;

      // Accommodation header section
      const destination = formData.destination.toUpperCase();
      const travelDate = formData.travelDate;
      const duration = `${formData.duration} NIGHT`;
      
      // Summary table
      const summaryTableY = yPosition;
      const summaryHeaders = ['DESTINATION', 'TRAVEL DATE', 'DURATION', 'NO.OF PASSENGERS', 'HOTEL CATEGORY', 'MEAL PLAN', 'TRANSFER PLAN'];
      const headerWidth = 70;
      
      // Draw header row
      doc
        .rect(50, summaryTableY, 495, 15)
        .fillColor(tealColor)
        .fill();
      
      let xPos = 55;
      summaryHeaders.forEach((header, idx) => {
        const colWidth = idx === 0 ? 75 : (idx === 3 ? 80 : headerWidth);
        doc
          .fontSize(6.5)
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .text(header, xPos, summaryTableY + 3, { width: colWidth - 5, align: 'center' });
        xPos += colWidth;
      });

      // Draw data row
      yPosition = summaryTableY + 15;
      doc
        .rect(50, yPosition, 495, 20)
        .fillColor('#ffffff')
        .fill()
        .stroke();

      const adults = formData.adults || 0;
      const children = formData.children || 0;
      const infants = formData.infants || 0;
      const passengers = `${adults}\n${children}\n${infants}`;

      const summaryData = [
        destination,
        travelDate,
        duration,
        `Adult\nChild\nINF`,
        formData.hotelCategory,
        formData.mealPlan,
        formData.transferPlan
      ];

      xPos = 55;
      summaryData.forEach((data, idx) => {
        const colWidth = idx === 0 ? 75 : (idx === 3 ? 80 : headerWidth);
        doc
          .fontSize(7)
          .fillColor('#000000')
          .font('Helvetica')
          .text(data, xPos, yPosition + 3, { width: colWidth - 5, align: 'center' });
        xPos += colWidth;
      });

      yPosition += 25;

      // ACCOMMODATION DETAILS & PER PERSON Header
      doc
        .rect(50, yPosition, 495, 15)
        .fillColor(tealColor)
        .fill();
      
      doc
        .fontSize(10)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('ACCOMMODATION DETAILS & PER PERSON', 0, yPosition + 3, { align: 'center', width: doc.page.width });

      yPosition += 15;

      // Hotel pricing table
      const hotels = formData.hotels || [];
      
      // Table headers
      doc
        .rect(50, yPosition, 495, 15)
        .fillColor(lightBg)
        .fill()
        .stroke();

      doc
        .fontSize(8)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('HOTEL NAME', 55, yPosition + 4, { width: 200 })
        .text('PACKAGE COST PER\nPERSON', 260, yPosition + 1, { width: 130, align: 'center' })
        .text('PACKAGE COST\nPER CHILD', 395, yPosition + 1, { width: 140, align: 'center' });

      yPosition += 15;

      // Hotel rows
      hotels.forEach((hotel, idx) => {
        doc
          .rect(50, yPosition, 495, 20)
          .fillColor('#ffffff')
          .fill()
          .stroke();

        doc
          .fontSize(7.5)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text(hotel.name, 55, yPosition + 6, { width: 200 });

        doc
          .fontSize(7.5)
          .font('Helvetica')
          .text(`${hotel.packageCostPerPerson.toLocaleString('en-IN')} /-`, 260, yPosition + 6, { width: 130, align: 'center' })
          .text(`${hotel.packageCostPerChild.toLocaleString('en-IN')} /-`, 395, yPosition + 6, { width: 140, align: 'center' });

        yPosition += 20;
      });

      yPosition += 10;

      // ============================================================
      // INCLUSIONS SECTION
      // ============================================================
      doc
        .rect(50, yPosition, 495, 15)
        .fillColor(tealColor)
        .fill();
      
      doc
        .fontSize(9)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('INCLUSIONS', 55, yPosition + 3);

      yPosition += 20;

      const inclusions = formData.inclusions || [];
      const customInclusions = formData.customInclusions || '';
      
      inclusions.forEach((inclusion, idx) => {
        doc
          .fontSize(7.5)
          .fillColor('#000000')
          .font('Helvetica')
          .text(`•   ${inclusion}`, 55, yPosition, { width: 480 });
        yPosition += 10;
      });

      // Add custom inclusions if any
      if (customInclusions.trim()) {
        customInclusions.split('\n').forEach(line => {
          if (line.trim()) {
            doc
              .fontSize(7.5)
              .fillColor('#000000')
              .font('Helvetica')
              .text(`•   ${line.trim()}`, 55, yPosition, { width: 480 });
            yPosition += 10;
          }
        });
      }

      yPosition += 5;

      // Check if we need a new page for exclusions
      if (yPosition > 600) {
        doc.addPage();
        addWatermark(doc);
        yPosition = 50;
      }

      // ============================================================
      // EXCLUSIONS SECTION
      // ============================================================
      doc
        .rect(50, yPosition, 495, 15)
        .fillColor(tealColor)
        .fill();
      
      doc
        .fontSize(9)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('EXCLUSIONS', 55, yPosition + 3);

      yPosition += 20;

      const exclusions = formData.exclusions || [];
      const customExclusions = formData.customExclusions || '';
      
      exclusions.forEach((exclusion, idx) => {
        doc
          .fontSize(7.5)
          .fillColor('#000000')
          .font('Helvetica')
          .text(`${idx + 1}.   ${exclusion}`, 55, yPosition, { width: 480 });
        yPosition += 10;
      });

      // Add custom exclusions if any
      if (customExclusions.trim()) {
        const startIdx = exclusions.length;
        customExclusions.split('\n').forEach((line, idx) => {
          if (line.trim()) {
            doc
              .fontSize(7.5)
              .fillColor('#000000')
              .font('Helvetica')
              .text(`${startIdx + idx + 1}.   ${line.trim()}`, 55, yPosition, { width: 480 });
            yPosition += 10;
          }
        });
      }

      yPosition += 15;

      // ============================================================
      // BOOKING POLICY SECTION
      // ============================================================
      
      // Check if we need a new page
      if (yPosition > 520) {
        doc.addPage();
        addWatermark(doc);
        yPosition = 50;
      }

      doc
        .rect(50, yPosition, 495, 15)
        .fillColor(tealColor)
        .fill();
      
      doc
        .fontSize(9)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('BOOKING POLICY', 55, yPosition + 3);

      yPosition += 20;

      // Cancellation policy table
      doc
        .fontSize(8)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('CANCELLATION NOTICE RECEIVED', 55, yPosition)
        .text('CANCELLATION CHARGES (PER PERSON)', 280, yPosition);

      yPosition += 15;

      bookingPolicy.cancellationPolicy.forEach(policy => {
        doc
          .fontSize(7.5)
          .fillColor('#000000')
          .font('Helvetica')
          .text(`•   ${policy.notice}`, 60, yPosition, { width: 200 })
          .text(`•   ${policy.charge}`, 285, yPosition, { width: 250 });
        yPosition += 12;
      });

      yPosition += 10;

      // Another booking policy section
      doc
        .rect(50, yPosition, 495, 15)
        .fillColor(tealColor)
        .fill();
      
      doc
        .fontSize(9)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('BOOKING POLICY', 55, yPosition + 3);

      yPosition += 20;

      bookingPolicy.paymentTerms.forEach(term => {
        doc
          .fontSize(7.5)
          .fillColor('#000000')
          .font('Helvetica')
          .text(`•   ${term}`, 60, yPosition, { width: 470, align: 'left' });
        yPosition += 15;
      });

      yPosition += 10;

      // ============================================================
      // TERMS & CONDITIONS SECTION
      // ============================================================
      
      // Check if we need a new page
      if (yPosition > 620) {
        doc.addPage();
        addWatermark(doc);
        yPosition = 50;
      }

      doc
        .rect(50, yPosition, 495, 15)
        .fillColor(tealColor)
        .fill();
      
      doc
        .fontSize(9)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('TERMS & CONDITIONS', 55, yPosition + 3);

      yPosition += 20;

      bookingPolicy.termsAndConditions.forEach(term => {
        doc
          .fontSize(7.5)
          .fillColor('#000000')
          .font('Helvetica')
          .text(`•   ${term}`, 60, yPosition, { width: 470, align: 'left' });
        yPosition += 12;
      });

      // Footer
      addFooter(doc);

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
 * Add company header with logo
 */
function addCompanyHeader(doc, primaryColor) {
  const headerHeight = 140;
  doc
    .rect(0, 0, doc.page.width, headerHeight)
    .fillColor(primaryColor)
    .fill();

  // Add logo on the left side of the header
  const logoPath = path.join(__dirname, '../assets/logo.png');
  try {
    const logoSize = 50;
    const logoX = 70;
    const logoY = 25;
    doc.image(logoPath, logoX, logoY, { width: logoSize });
  } catch (error) {
    console.log('Logo image not found');
  }

  // Register American Captain font for company name
  const americanCaptainPath = path.join(__dirname, '../assets/AmericanCaptain.otf');
  try {
    doc.registerFont('AmericanCaptain', americanCaptainPath);
    doc.font('AmericanCaptain');
  } catch (error) {
    doc.font('Helvetica-Bold');
  }

  // Company name in white
  doc
    .fontSize(20)
    .fillColor('#ffffff')
    .text('YATRASUTRA HOLIDAYS PVT. LTD.', 135, 40, { align: 'left' });
  
  // Reset to regular font
  doc.font('Helvetica');

  // Company details inside the blue header
  doc
    .fontSize(6.5)
    .fillColor('#ffffff')
    .text('Registered Address: 1st Floor, Penta Corner Building, Changampuzha Metro Station, Edapally, Kochi (Ernakulam) – Kerala, 682024, India', 0, 90, { align: 'center', width: doc.page.width })
    .text('Email: info@yatrasutra.com | Phone: +91 97468 16609 / +91 97468 26609 | Website: www.yatrasutra.com', 0, 100, { align: 'center', width: doc.page.width });
}

/**
 * Add footer with company branding
 */
function addFooter(doc) {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const footerBarHeight = 45;
  const orangeColor = '#f97316';
  const footerY = pageHeight - footerBarHeight - 70;

  // Add seal on the bottom right, above the footer bar
  const sealPath = path.join(__dirname, '../assets/seal.png');
  try {
    const sealSize = 150;
    const sealX = pageWidth - sealSize - 65;
    const sealY = footerY - sealSize - 5;
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
}

export default generateBrochurePDF;

