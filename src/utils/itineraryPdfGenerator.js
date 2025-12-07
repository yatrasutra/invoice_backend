import PDFDocument from 'pdfkit';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { bookingPolicy } from '../config/itineraryData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate an Itinerary PDF following We Care Holidays specification
 * @param {Object} formData - The itinerary data
 * @param {string} submissionId - The submission ID
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateItineraryPDF = async (formData, submissionId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 0,
        size: 'A4',
        autoFirstPage: false
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Brand colors matching the reference PDF design
      const blue = '#1976D2'; // Blue for header and footer bar - matching header
      const pink = '#E91E8C'; // Pink/rose for section headers
      const darkText = '#2d3748';
      const white = '#ffffff';
      const grey = '#6b7280';
      const lightGrey = '#f9f9f9';
      const lightPink = '#FCE4EC'; // Light pink for backgrounds

      // Load header images
      const headerImage1Path = path.join(__dirname, '../assets/itenary/itenaryHeader.png');
      const headerImage2Path = path.join(__dirname, '../assets/itenary/itenaryImage2.png');
      let headerImage1Buffer = null;
      let headerImage2Buffer = null;
      
      try {
        if (fs.existsSync(headerImage1Path)) {
          headerImage1Buffer = fs.readFileSync(headerImage1Path);
        }
      } catch (e) {
        console.log('Header image 1 not found:', e.message);
      }
      
      try {
        if (fs.existsSync(headerImage2Path)) {
          headerImage2Buffer = fs.readFileSync(headerImage2Path);
        }
      } catch (e) {
        console.log('Header image 2 not found:', e.message);
      }

      // Helper function to download image from URL
      const downloadImage = (url) => {
        return new Promise((resolve, reject) => {
          if (!url || !url.trim()) {
            resolve(null);
            return;
          }
          const imageUrl = url.includes('|') ? url.split('|')[1] : url;
          const protocol = imageUrl.startsWith('https') ? https : http;
          protocol.get(imageUrl, (response) => {
            if (response.statusCode !== 200) {
              resolve(null);
              return;
            }
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
          }).on('error', () => resolve(null));
        });
      };


      const addImageSafeSync = (doc, imageBuffer, x, y, options) => {
        try {
          if (imageBuffer) {
            doc.image(imageBuffer, x, y, options);
            return true;
          }
        } catch (error) {
          console.log('Image add error:', error.message);
        }
        return false;
      };

      // Helper function to decode HTML entities
      const decodeHTMLEntities = (text) => {
        if (!text) return '';
        return text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ');
      };

      // Pre-download all images
      const imageCache = {};
      const imageUrls = [];
      
      if (formData.coverHeroImageUrl) imageUrls.push({ key: 'cover', url: formData.coverHeroImageUrl });
      (formData.days || []).forEach((day, idx) => {
        if (day.imageUrl) imageUrls.push({ key: `day${idx}`, url: day.imageUrl });
      });
      (formData.hotels || []).forEach((hotel, idx) => {
        if (hotel.imageUrl) imageUrls.push({ key: `hotel${idx}`, url: hotel.imageUrl });
      });

      await Promise.all(imageUrls.map(async ({ key, url }) => {
        try {
          imageCache[key] = await downloadImage(url);
        } catch (error) {
          imageCache[key] = null;
        }
      }));

      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}, ${date.getFullYear()}`;
      };

      const formatShortDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
      };

      const getOrdinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      // Add styled footer to every page
      const addStyledFooter = (doc, pageNum) => {
        const footerHeight = 40;
        const footerY = doc.page.height - footerHeight;
        
        // Blue footer background - matching header
        doc.rect(0, footerY, doc.page.width, footerHeight).fillColor(blue).fill();
        
        // Contact info on left
        doc.fontSize(9).fillColor(white).font('Helvetica')
           .text('+91 97468 16609', 50, footerY + 14);
        
        // Website on right  
        doc.fontSize(9).fillColor(white)
           .text('www.yatrasutra.com', doc.page.width - 180, footerY + 14);
        
        // Page number center
        doc.fontSize(9).fillColor(white)
           .text(String(pageNum), 0, footerY + 14, { align: 'center', width: doc.page.width });
      };

      // Add header image to page
      const addHeader = (doc, isFirstPage = false) => {
        const headerHeight = isFirstPage ? 200 : 60;
        const headerBuffer = isFirstPage ? headerImage1Buffer : headerImage2Buffer;
        
        if (headerBuffer) {
          try {
            // Render image to fill full page width without fit constraints
            doc.image(headerBuffer, 0, 0, { 
              width: doc.page.width, 
              height: headerHeight
            });
          } catch (e) {
            doc.rect(0, 0, doc.page.width, headerHeight).fillColor(blue).fill();
          }
        } else {
          doc.rect(0, 0, doc.page.width, headerHeight).fillColor(blue).fill();
          doc.fontSize(24).fillColor(white).font('Helvetica-Bold')
             .text('YATRASUTRA HOLIDAYS', 50, headerHeight / 2 - 10);
        }
        return headerHeight;
      };

      // ============================================================
      // PAGE 1: COVER PAGE
      // ============================================================
      doc.addPage();
      let yPos = addHeader(doc, true);
      yPos += 30;

      // Greeting
      doc.fontSize(14).fillColor(darkText).font('Helvetica')
         .text('Dear ', 50, yPos, { continued: true })
         .font('Helvetica-Bold').text(`${formData.guestName || 'Guest'},`);
      
      yPos += 30;
      doc.fontSize(11).font('Helvetica').fillColor(darkText)
         .text('Greetings from ', 50, yPos, { continued: true })
         .font('Helvetica-Bold').text('Yatrasutra Holidays.');
      
      yPos += 25;
      doc.fontSize(10).font('Helvetica').fillColor(darkText)
         .text('Thank you for choosing ', 50, yPos, { continued: true, width: doc.page.width - 100 })
         .font('Helvetica-Bold').text('Yatrasutra Holidays', { continued: true })
         .font('Helvetica').text('. Below is your customized travel package. It\'s fully customizable to ensure it meets your desires. We\'re here to make your vacation unforgettable!', { width: doc.page.width - 100, lineGap: 4 });
      
      yPos += 45;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(darkText)
         .text('You can find your personal trip planner\'s contact details at the end of the page.', 50, yPos, { width: doc.page.width - 100 });
      
      yPos += 25;
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(grey)
         .text('Should you have any questions or require further assistance, please don\'t hesitate to reach out.', 50, yPos, { width: doc.page.width - 100 });

      yPos += 40;

      // Trip Details Grid
      const gridY = yPos;
      const colWidth = (doc.page.width - 100) / 3;
      
      // Row 1
      doc.fontSize(8).fillColor(grey).font('Helvetica').text('DESTINATION', 50, gridY);
      doc.fontSize(8).text('START DATE', 50 + colWidth, gridY);
      doc.fontSize(8).text('DURATION', 50 + colWidth * 2, gridY);
      
      doc.fontSize(13).fillColor(darkText).font('Helvetica-Bold')
         .text(formData.destination || 'N/A', 50, gridY + 15)
         .text(formatDate(formData.startDate), 50 + colWidth, gridY + 15)
         .text(formData.duration || 'N/A', 50 + colWidth * 2, gridY + 15);

      yPos = gridY + 45;

      // Row 2
      doc.fontSize(8).fillColor(grey).font('Helvetica').text('PAX', 50, yPos);
      doc.fontSize(8).text('TRIP ID', 50 + colWidth, yPos);
      
      const paxText = `${formData.adults || 0} Adults${formData.children ? `, ${formData.children} Children` : ''}${formData.infants ? `, ${formData.infants} Infants` : ''}`;
      doc.fontSize(13).fillColor(darkText).font('Helvetica-Bold')
         .text(paxText, 50, yPos + 15)
         .text(formData.tripId || 'N/A', 50 + colWidth, yPos + 15);

      yPos += 55;

      // Divider line
      doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).strokeColor('#e0e0e0').lineWidth(1).stroke();

      yPos += 15;

      // Quote Price Section
      doc.fontSize(9).fillColor(grey).font('Helvetica')
         .text('QUOTE PRICE (2 PACKAGE CATEGORIES/OPTIONS)', 50, yPos);
      
      yPos += 20;

      // Price table header
      doc.rect(50, yPos, doc.page.width - 100, 25).fillColor(lightGrey).fill();
      doc.fontSize(9).fillColor(darkText).font('Helvetica-Bold')
         .text('#', 60, yPos + 8)
         .text('Option', 90, yPos + 8)
         .text('Total (INR)', 300, yPos + 8);

      yPos += 25;

      // Price row
      doc.rect(50, yPos, doc.page.width - 100, 65).fillColor(white).fill().strokeColor('#e0e0e0').lineWidth(1).stroke();
      doc.fontSize(10).fillColor(darkText).font('Helvetica')
         .text('1', 60, yPos + 22);
      doc.font('Helvetica-Bold').text('Premium Package', 90, yPos + 22);
      
      // Price display
      doc.fontSize(22).fillColor(pink).font('Helvetica-Bold')
         .text(`${(formData.quotePrice || 0).toLocaleString('en-IN')} /-`, 300, yPos + 14);
      doc.fontSize(8).fillColor(grey).font('Helvetica')
         .text('(including GST)', 300, yPos + 38);
      
      if (formData.paymentNote) {
        doc.fontSize(8).fillColor('#D32F2F').font('Helvetica-Bold')
           .text(formData.paymentNote, 300, yPos + 50);
      }

      addStyledFooter(doc, 1);

      // ============================================================
      // PAGE 2+: HOTELS / ACCOMMODATIONS
      // ============================================================
      const hotels = formData.hotels || [];
      if (hotels.length > 0) {
        doc.addPage();
        yPos = addHeader(doc, false);
        yPos += 20;

        // Section header with pink bar
        doc.rect(50, yPos, doc.page.width - 100, 35).fillColor(lightPink).fill();
        doc.fontSize(13).fillColor(pink).font('Helvetica-Bold')
           .text('Hotels / Accommodations', 60, yPos + 10);
        doc.fontSize(11).fillColor(pink).text('Option 1: Premium Package', 360, yPos + 11);
        
        yPos += 45;

        for (let i = 0; i < hotels.length; i++) {
          const hotel = hotels[i];
          
          if (yPos > 620) {
            addStyledFooter(doc, 2);
            doc.addPage();
            yPos = addHeader(doc, false);
            yPos += 30;
          }

          // Night badges
          const nightStart = hotel.nightNumber || (i + 1);
          const nightEnd = hotel.nightEnd || nightStart;
          
          let badgeX = 50;
          for (let n = nightStart; n <= nightEnd; n++) {
            const badgeText = getOrdinal(n);
            doc.rect(badgeX, yPos, 38, 22).fillColor(pink).fill();
            doc.fontSize(9).fillColor(white).font('Helvetica-Bold')
               .text(badgeText, badgeX + 7, yPos + 6);
            badgeX += 43;
          }
          
          doc.fontSize(11).fillColor(darkText).font('Helvetica')
             .text(`Nights at `, badgeX + 5, yPos + 4, { continued: true })
             .font('Helvetica-Bold').text(hotel.location || formData.destination);
          
          doc.fontSize(8).fillColor(grey).font('Helvetica')
             .text(`Check-in on ${formatShortDate(hotel.checkInDate)}`, 50, yPos + 28);

          yPos += 50;

          // Hotel name and star rating
          doc.fontSize(15).fillColor(pink).font('Helvetica-Bold')
             .text(hotel.name || 'Hotel Name', 50, yPos);
          
          yPos += 20;
          
          // Star rating display
          const stars = parseInt(hotel.starRating) || 3;
          let starText = '';
          for (let s = 0; s < 5; s++) {
            starText += s < stars ? '★' : '☆';
          }
          doc.fontSize(13).fillColor('#FFA726').text(starText, 50, yPos);

          yPos += 27;

          // Room details in two columns
          const leftCol = 50;
          const rightCol = 180;
          
          doc.fontSize(9).fillColor(grey).font('Helvetica').text('ROOMS', leftCol, yPos);
          doc.text('MEAL PLAN', rightCol, yPos);
          
          yPos += 14;
          doc.fontSize(11).fillColor(darkText).font('Helvetica-Bold')
             .text(`${hotel.numberOfRooms || 1} ${hotel.roomType || 'Standard Room'}`, leftCol, yPos);
          doc.text(hotel.mealPlan || 'Breakfast', rightCol, yPos);
          
          yPos += 16;
          doc.fontSize(9).fillColor(grey).font('Helvetica')
             .text(hotel.paxDistribution || `${formData.adults || 2} Pax + 1 Child without Extra Bed/Mattress`, leftCol, yPos, { width: 120 });

          // Hotel image on right - larger and better positioned
          if (imageCache[`hotel${i}`]) {
            const imgX = doc.page.width - 200;
            const imgY = yPos - 85;
            addImageSafeSync(doc, imageCache[`hotel${i}`], imgX, imgY, {
              width: 150,
              height: 110,
              fit: [150, 110]
            });
          }

          yPos += 35;
          
          // Divider
          doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).strokeColor('#e0e0e0').lineWidth(1).stroke();
          yPos += 20;
        }
        
        addStyledFooter(doc, 2);
      }

      // ============================================================
      // DAY-WISE ITINERARY
      // ============================================================
      const days = formData.days || [];
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        
        doc.addPage();
        yPos = addHeader(doc, false);
        yPos += 20;

        // Day section header with pink background
        doc.rect(50, yPos, doc.page.width - 100, 35).fillColor(lightPink).fill();
        doc.fontSize(13).fillColor(pink).font('Helvetica-Bold')
           .text(`${getOrdinal(day.dayNumber || i + 1)} Day`, 60, yPos + 10);
        
        if (day.date) {
          doc.fontSize(11).fillColor(pink).text(formatDate(day.date), doc.page.width - 200, yPos + 11);
        }

        yPos += 50;

        // Day title
        yPos += 10;
        doc.fontSize(16).fillColor(pink).font('Helvetica-Bold')
           .text(day.title || 'Day Itinerary', 50, yPos);
        
        yPos += 30;
        
        // Day description
        const description = day.description || '';
        const bulletPoints = description.split('\n').filter(line => line.trim());
        
        doc.fontSize(10).fillColor(darkText).font('Helvetica');
        bulletPoints.forEach((point) => {
          if (yPos > 680) {
            addStyledFooter(doc, 3 + i);
            doc.addPage();
            yPos = addHeader(doc, false);
            yPos += 30;
          }
          
          const cleanPoint = point.replace(/^[•\-\*]\s*/, '').trim();
          doc.text(`• ${cleanPoint}`, 60, yPos, {
            width: doc.page.width - 120,
            lineGap: 4
          });
          yPos += 20;
        });

        // Day image - larger and more prominent
        if (imageCache[`day${i}`]) {
          yPos += 25;
          addImageSafeSync(doc, imageCache[`day${i}`], 50, yPos, {
            width: doc.page.width - 100,
            height: 220,
            fit: [doc.page.width - 100, 220]
          });
          yPos += 230;
        }

        addStyledFooter(doc, 3 + i);
      }

      // ============================================================
      // INCLUSIONS & EXCLUSIONS
      // ============================================================
      doc.addPage();
      yPos = addHeader(doc, false);
      yPos += 20;

      doc.rect(50, yPos, doc.page.width - 100, 35).fillColor(lightPink).fill();
      doc.fontSize(13).fillColor(pink).font('Helvetica-Bold')
         .text('Inclusions and Exclusions', 60, yPos + 10);

      yPos += 50;

      const columnWidth = (doc.page.width - 120) / 2;
      
      // Inclusions
      doc.fontSize(12).fillColor(pink).font('Helvetica-Bold').text('INCLUSIONS', 50, yPos);
      let incY = yPos + 22;
      
      doc.fontSize(10).fillColor(darkText).font('Helvetica');
      (formData.inclusions || []).forEach((item) => {
        const cleanItem = decodeHTMLEntities(item);
        doc.text(`• ${cleanItem}`, 55, incY, { width: columnWidth - 10, lineGap: 2 });
        incY += 18;
      });

      // Exclusions
      doc.fontSize(12).fillColor(pink).font('Helvetica-Bold').text('EXCLUSIONS', 50 + columnWidth + 20, yPos);
      let excY = yPos + 22;
      
      doc.fontSize(10).fillColor(darkText).font('Helvetica');
      (formData.exclusions || []).forEach((item) => {
        const cleanItem = decodeHTMLEntities(item);
        doc.text(`• ${cleanItem}`, 55 + columnWidth + 20, excY, { width: columnWidth - 10, lineGap: 2 });
        excY += 18;
      });

      addStyledFooter(doc, 4 + days.length);

      // ============================================================
      // TERMS & CONDITIONS + POLICIES
      // ============================================================
      doc.addPage();
      yPos = addHeader(doc, false);
      yPos += 20;

      doc.rect(50, yPos, doc.page.width - 100, 35).fillColor(lightPink).fill();
      doc.fontSize(13).fillColor(pink).font('Helvetica-Bold')
         .text('Terms and Conditions', 60, yPos + 10);

      yPos += 50;
      
      doc.fontSize(10).fillColor(darkText).font('Helvetica');
      bookingPolicy.termsAndConditions.forEach((term) => {
        if (yPos > 680) {
          addStyledFooter(doc, 5 + days.length);
          doc.addPage();
          yPos = addHeader(doc, false);
          yPos += 30;
        }
        
        const cleanTerm = decodeHTMLEntities(term);
        doc.text(`• ${cleanTerm}`, 60, yPos, { width: doc.page.width - 120, lineGap: 2, align: 'left' });
        yPos += 22;
      });

      addStyledFooter(doc, 5 + days.length);

      // ============================================================
      // CONSULTANT SIGN-OFF
      // ============================================================
      doc.addPage();
      yPos = addHeader(doc, false);
      yPos += 40;

      doc.fontSize(18).fillColor(pink).font('Helvetica-Bold')
         .text('Your Trip Planner', 50, yPos, { align: 'center', width: doc.page.width - 100 });

      yPos += 55;

      // Consultant card
      doc.rect(100, yPos, doc.page.width - 200, 180).fillColor(lightPink).fill()
         .strokeColor(pink).lineWidth(2).stroke();

      yPos += 35;
      doc.fontSize(16).fillColor(darkText).font('Helvetica-Bold')
         .text(formData.consultantName || 'Travel Consultant', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += 28;
      doc.fontSize(11).fillColor(grey).font('Helvetica')
         .text(formData.consultantPosition || 'Senior Travel Advisor', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += 32;
      doc.fontSize(10).fillColor(grey).font('Helvetica')
         .text('Mobile:', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += 15;
      doc.fontSize(11).fillColor(darkText).font('Helvetica-Bold')
         .text(formData.consultantMobile || '+91 97468 16609', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += 20;
      doc.fontSize(10).fillColor(grey).font('Helvetica')
         .text('Email:', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += 15;
      doc.fontSize(11).fillColor(darkText).font('Helvetica-Bold')
         .text(formData.consultantEmail || 'info@yatrasutra.com', 0, yPos, { align: 'center', width: doc.page.width });

      yPos += 65;

      doc.fontSize(14).fillColor(pink).font('Helvetica-Bold')
         .text('Thank you for choosing Yatrasutra Holidays!', 50, yPos, { align: 'center', width: doc.page.width - 100 });
      
      yPos += 25;
      doc.fontSize(10).fillColor(grey).font('Helvetica')
         .text('We look forward to creating unforgettable memories with you.', 50, yPos, { align: 'center', width: doc.page.width - 100 });

      addStyledFooter(doc, 6 + days.length);

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

export default generateItineraryPDF;
