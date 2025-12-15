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
 * Generate a Premium Brochure-Style Itinerary PDF
 * Inspired by Apple, Airbnb, and modern agency design aesthetics
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

      // ═══════════════════════════════════════════════════════════════
      // PREMIUM COLOR PALETTE - Minimal & Elegant
      // Inspired by modern editorial design
      // ═══════════════════════════════════════════════════════════════
      const colors = {
        // Primary brand colors
        primary: '#0B4FA3',      // Professional blue (header/footer)
        secondary: '#16213E',    // Rich dark blue
        accent: '#E94560',       // Vibrant coral red
        
        // Text hierarchy
        text: {
          dark: '#1A1A2E',       // Primary text
          medium: '#4A5568',     // Secondary text
          light: '#718096',      // Tertiary/muted text
          white: '#FFFFFF',      // Light text on dark bg
        },
        
        // Background colors
        bg: {
          white: '#FFFFFF',
          offWhite: '#FAFAFA',   // Subtle off-white
          light: '#F7F8FA',      // Light grey
          card: '#FFFFFF',       // Card backgrounds
        },
        
        // Accent colors
        success: '#10B981',      // Teal green
        warning: '#F59E0B',      // Amber
        info: '#3B82F6',         // Blue
        
        // Subtle design elements
        border: '#E5E7EB',       // Light border
        divider: '#D1D5DB',      // Divider lines
      };

      // Typography scale (rem-like system for consistency)
      const type = {
        h1: 28,
        h2: 22,
        h3: 16,
        h4: 14,
        body: 11,
        small: 9,
        tiny: 8,
      };

      // Spacing system
      const space = {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
        xxl: 64,
      };

      // Page dimensions
      const page = {
        width: 595.28,
        height: 841.89,
        margin: 50,
        contentWidth: 495.28, // width - (margin * 2)
      };

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

      // Load footer logo
      const footerLogoPath = path.join(__dirname, '../assets/itenary/footerLogo.png');
      let footerLogoBuffer = null;
      
      try {
        if (fs.existsSync(footerLogoPath)) {
          footerLogoBuffer = fs.readFileSync(footerLogoPath);
        }
      } catch (e) {
        console.log('Footer logo not found:', e.message);
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

      const addImageSafe = (doc, imageBuffer, x, y, options) => {
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

      // ═══════════════════════════════════════════════════════════════
      // HELPER FUNCTIONS - Clean Design Components
      // ═══════════════════════════════════════════════════════════════

      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
      };

      const formatShortDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
      };

      // Draw elegant card with subtle shadow
      const drawCard = (doc, x, y, width, height, options = {}) => {
        const { 
          fill = colors.bg.card, 
          shadow = true, 
          radius = 0,
          borderColor = null 
        } = options;

        if (shadow) {
          // Subtle shadow effect
          doc.save();
          doc.opacity(0.04);
          doc.rect(x + 2, y + 2, width, height).fill('#000000');
          doc.restore();
        }
        
        // Main card
        doc.rect(x, y, width, height).fillColor(fill).fill();
        
        if (borderColor) {
          doc.rect(x, y, width, height)
             .strokeColor(borderColor)
             .lineWidth(1)
             .stroke();
        }
      };

      // Draw minimal divider line
      const drawDivider = (doc, x, y, width, color = colors.border) => {
        doc.moveTo(x, y)
           .lineTo(x + width, y)
           .strokeColor(color)
           .lineWidth(1)
           .stroke();
      };

      // Draw accent line (thicker, colored)
      const drawAccentLine = (doc, x, y, width, color = colors.accent) => {
        doc.moveTo(x, y)
           .lineTo(x + width, y)
           .strokeColor(color)
           .lineWidth(3)
           .stroke();
      };

      // ═══════════════════════════════════════════════════════════════
      // PREMIUM FOOTER - Clean & Minimal (no page number)
      // ═══════════════════════════════════════════════════════════════
      const addFooter = (doc, pageNum) => {
        const footerHeight = 55;
        const footerY = doc.page.height - footerHeight;
        
        // Clean background
        doc.rect(0, footerY, doc.page.width, footerHeight)
           .fillColor(colors.primary)
           .fill();
        
        // Subtle top accent line
        doc.moveTo(0, footerY)
           .lineTo(doc.page.width, footerY)
           .strokeColor(colors.accent)
           .lineWidth(2)
           .stroke();
        
        // Footer logo on left
        let contentX = page.margin;
        if (footerLogoBuffer) {
          try {
            doc.image(footerLogoBuffer, contentX, footerY + 8, { height: 38 });
            contentX += 60;
          } catch (e) {
            console.log('Footer logo error:', e.message);
          }
        }
        
        // Contact info - centered layout
        contentX += 15;
        doc.fontSize(type.tiny).fillColor(colors.text.white).font('Helvetica')
           .text('+91 97468 16609  |  info@yatrasutra.com  |  www.yatrasutra.com', 
                 contentX, footerY + 22, { lineGap: 0 });
        
        // Social links on right (no page number circle)
        const socialX = doc.page.width - page.margin - 140;
        doc.fontSize(type.tiny).fillColor(colors.text.white).font('Helvetica')
           .text('Follow us: ', socialX, footerY + 22);
        doc.fontSize(type.tiny).fillColor(colors.accent).font('Helvetica')
           .text('Facebook', socialX + 42, footerY + 22, { link: 'https://m.facebook.com/61574118189623/', underline: false });
        doc.fontSize(type.tiny).fillColor(colors.text.white).font('Helvetica')
           .text(' | ', socialX + 85, footerY + 22);
        doc.fontSize(type.tiny).fillColor(colors.accent).font('Helvetica')
           .text('Instagram', socialX + 95, footerY + 22, { link: 'https://www.instagram.com/yatra.sutra', underline: false });
      };

      // ═══════════════════════════════════════════════════════════════
      // HEADER COMPONENT - Modern with Image
      // For secondary pages, use footer-style header with tagline
      // ═══════════════════════════════════════════════════════════════
      const addHeader = (doc, isFirstPage = false) => {
        if (isFirstPage) {
          const headerHeight = 200;
          if (headerImage1Buffer) {
            try {
              doc.image(headerImage1Buffer, 0, 0, { 
                width: doc.page.width, 
                height: headerHeight
              });
            } catch (e) {
              // Fallback to solid color
              doc.rect(0, 0, doc.page.width, headerHeight)
                 .fillColor(colors.primary)
                 .fill();
            }
          } else {
            // Fallback header
            doc.rect(0, 0, doc.page.width, headerHeight)
               .fillColor(colors.primary)
               .fill();
            doc.fontSize(type.h2).fillColor(colors.text.white).font('Helvetica-Bold')
               .text('YATRASUTRA HOLIDAYS', page.margin, headerHeight / 2 - 10);
          }
          return headerHeight;
        } else {
          // Secondary header - footer-style design with elegant cursive tagline
          const headerHeight = 55;
          
          // Clean background matching footer
          doc.rect(0, 0, doc.page.width, headerHeight)
             .fillColor(colors.primary)
             .fill();
          
          // Subtle bottom accent line (like footer's top line)
          doc.moveTo(0, headerHeight)
             .lineTo(doc.page.width, headerHeight)
             .strokeColor(colors.accent)
             .lineWidth(2)
             .stroke();
          
          // Header logo on left
          let contentX = page.margin;
          if (footerLogoBuffer) {
            try {
              doc.image(footerLogoBuffer, contentX, 8, { height: 38 });
              contentX += 60;
            } catch (e) {
              console.log('Header logo error:', e.message);
            }
          }
          
          // Tagline - "We Handle The Chaos, You Just Pack" - modern elegant style with larger font
          contentX += 30;
          doc.fontSize(18).fillColor(colors.text.white).font('Helvetica-BoldOblique')
             .text('We Handle The Chaos, You Just Pack', 
                   contentX, 16, { characterSpacing: 1.0 });
          
          return headerHeight + 2; // Include accent line height
        }
      };

      // ═══════════════════════════════════════════════════════════════
      // PAGE 1: COVER PAGE - Premium Editorial Style
      // ═══════════════════════════════════════════════════════════════
      let currentPageNum = 1; // Page counter for proper numbering
      doc.addPage();
      let yPos = addHeader(doc, true);
      
      // Clean background
      doc.rect(0, yPos, doc.page.width, doc.page.height - yPos - 55)
         .fillColor(colors.bg.offWhite)
         .fill();
      
      yPos += space.lg;

      // Welcome section - minimal card
      drawCard(doc, page.margin, yPos, page.contentWidth, 80, { shadow: true });
      
      yPos += space.md;
      
      // Greeting with elegant typography
      doc.fontSize(type.h3).fillColor(colors.text.dark).font('Helvetica')
         .text('Dear ', page.margin + space.md, yPos, { continued: true })
         .font('Helvetica-Bold').fillColor(colors.accent)
         .text(`${formData.guestName || 'Valued Guest'},`);
      
      yPos += space.md;
      
      doc.fontSize(type.body).font('Helvetica').fillColor(colors.text.medium)
         .text(`Thank you for choosing Yatrasutra Holidays. Below is your personalized travel itinerary.`, 
               page.margin + space.md, yPos, { width: page.contentWidth - space.lg });
      
      yPos += space.xl + space.sm;
      
      // Accent line divider
      drawAccentLine(doc, page.margin + 80, yPos, page.contentWidth - 160, colors.accent);
      
      yPos += space.lg;

      // Trip Details - Grid Layout with clean design
      drawCard(doc, page.margin, yPos, page.contentWidth, 140, { shadow: true });
      
      const gridY = yPos + space.md;
      const colWidth = (page.contentWidth - space.lg) / 3;
      
      // Row 1
      const drawDetailItem = (label, value, x, y, accentColor = colors.accent) => {
        doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica-Bold')
           .text(label.toUpperCase(), x, y);
        doc.fontSize(type.h4).fillColor(colors.text.dark).font('Helvetica-Bold')
           .text(value, x, y + 14);
        // Accent underline
        drawAccentLine(doc, x, y + 38, colWidth - 30, accentColor);
      };
      
      const col1X = page.margin + space.md;
      const col2X = col1X + colWidth;
      const col3X = col2X + colWidth;
      
      drawDetailItem('DESTINATION', formData.destination || 'N/A', col1X, gridY, colors.accent);
      drawDetailItem('START DATE', formatDate(formData.startDate), col2X, gridY, colors.info);
      drawDetailItem('DURATION', formData.duration || 'N/A', col3X, gridY, colors.success);
      
      const row2Y = gridY + space.xl + space.sm;
      drawDetailItem('TRAVELERS', `${formData.adults || 0} Adults${formData.children ? ` + ${formData.children} Children` : ''}`, 
                     col1X, row2Y, colors.primary);
      drawDetailItem('TRIP ID', formData.tripId || 'N/A', col2X, row2Y, colors.secondary);

      yPos += 165;

      // Package Pricing Section
      doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica-Bold')
         .text('PACKAGE PRICING', page.margin + space.md, yPos);
      
      yPos += space.sm;

      // Price card with accent header
      drawCard(doc, page.margin, yPos, page.contentWidth, 85, { shadow: true });
      
      // Accent header bar
      doc.rect(page.margin, yPos, page.contentWidth, 32)
         .fillColor(colors.accent)
         .fill();
      
      doc.fontSize(type.body).fillColor(colors.text.white).font('Helvetica-Bold')
         .text('Premium Package', page.margin + space.md, yPos + 10);
      doc.fontSize(type.tiny).fillColor(colors.text.white).font('Helvetica')
         .text('All-Inclusive', doc.page.width - page.margin - 100, yPos + 12);
      
      yPos += 42;
      
      // Large price display (fix: use INR text to avoid font issues with rupee symbol)
      const formattedPrice = (formData.quotePrice || 0).toLocaleString('en-IN');
      
      // Draw rupee symbol separately to avoid font encoding issues
      doc.fontSize(type.h1).fillColor(colors.accent).font('Helvetica-Bold')
         .text('INR ', page.margin + space.md, yPos, { continued: true })
         .text(formattedPrice);
      
      doc.fontSize(type.small).fillColor(colors.text.light).font('Helvetica')
         .text('inclusive of all taxes', page.margin + space.md, yPos + 28);
      
      // Payment note (if exists)
      if (formData.paymentNote) {
        doc.fontSize(type.small).fillColor(colors.warning).font('Helvetica-Bold')
           .text(formData.paymentNote, doc.page.width - page.margin - 200, yPos + 10, {
             width: 180,
             align: 'right'
           });
      }

      addFooter(doc, currentPageNum);

      // ═══════════════════════════════════════════════════════════════
      // PAGE 2+: HOTELS - Magazine Style Layout
      // ═══════════════════════════════════════════════════════════════
      const hotels = formData.hotels || [];
      if (hotels.length > 0) {
        currentPageNum++;
        doc.addPage();
        yPos = addHeader(doc, false);
        
        // Background
        doc.rect(0, yPos, doc.page.width, doc.page.height - yPos - 55)
           .fillColor(colors.bg.offWhite)
           .fill();
        
        yPos += space.md;

        // Section header
        drawCard(doc, page.margin, yPos, page.contentWidth, 42, { shadow: false });
        drawAccentLine(doc, page.margin, yPos, page.contentWidth, colors.accent);
        
        doc.fontSize(type.h3).fillColor(colors.text.dark).font('Helvetica-Bold')
           .text('Hotels & Accommodations', page.margin + space.sm, yPos + 14);
        doc.fontSize(type.small).fillColor(colors.accent).font('Helvetica')
           .text('Premium Selection', doc.page.width - page.margin - 120, yPos + 16);
        
        yPos += 55;

        for (let i = 0; i < hotels.length; i++) {
          const hotel = hotels[i];
          
          // Check for page break
          if (yPos > 620) {
            addFooter(doc, currentPageNum);
            currentPageNum++;
            doc.addPage();
            yPos = addHeader(doc, false);
            doc.rect(0, yPos, doc.page.width, doc.page.height - yPos - 55)
               .fillColor(colors.bg.offWhite).fill();
            yPos += space.md;
          }

          // Hotel Card
          const cardHeight = 150;
          drawCard(doc, page.margin, yPos, page.contentWidth, cardHeight, { shadow: true });
          
          // Night indicator badges
          const nightStart = hotel.nightNumber || (i + 1);
          const nightEnd = hotel.nightEnd || nightStart;
          
          let badgeX = page.margin + space.sm;
          for (let n = nightStart; n <= nightEnd; n++) {
            doc.circle(badgeX + 12, yPos + 18, 12)
               .fillColor(colors.accent)
               .fill();
            doc.fontSize(type.small).fillColor(colors.text.white).font('Helvetica-Bold')
               .text(String(n), badgeX + 8, yPos + 13);
            badgeX += 28;
          }
          
          // Location text
          doc.fontSize(type.small).fillColor(colors.text.medium).font('Helvetica')
             .text(`Nights at `, badgeX + 5, yPos + 14, { continued: true })
             .font('Helvetica-Bold').fillColor(colors.text.dark)
             .text(hotel.location || formData.destination);
          
          // Check-in date
          doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica')
             .text(`Check-in: ${formatShortDate(hotel.checkInDate)}`, badgeX + 5, yPos + 30);

          yPos += 48;

          // Hotel name - prominent
          doc.fontSize(type.h3 + 2).fillColor(colors.accent).font('Helvetica-Bold')
             .text(hotel.name || 'Hotel Name', page.margin + space.sm, yPos);
          
          yPos += space.md;
          
          // Star rating - use text-based rating to avoid font encoding issues
          const stars = parseInt(hotel.starRating) || 3;
          
          // Draw star rating as text (avoids unicode symbol issues)
          doc.fontSize(type.body).fillColor(colors.warning).font('Helvetica-Bold')
             .text(`${stars}-Star`, page.margin + space.sm, yPos);
          
          // Draw "Hotel" text next to rating
          const ratingWidth = doc.widthOfString(`${stars}-Star`);
          doc.fontSize(type.body).fillColor(colors.text.medium).font('Helvetica')
             .text(' Hotel', page.margin + space.sm + ratingWidth, yPos);

          yPos += space.md;

          // Room details - clean grid
          const detailsY = yPos;
          doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica-Bold')
             .text('ROOMS', page.margin + space.sm, detailsY);
          doc.fontSize(type.body).fillColor(colors.text.dark).font('Helvetica-Bold')
             .text(`${hotel.numberOfRooms || 1} × ${hotel.roomType || 'Standard Room'}`, page.margin + space.sm, detailsY + 12);
          
          doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica-Bold')
             .text('MEAL PLAN', page.margin + 160, detailsY);
          doc.fontSize(type.body).fillColor(colors.text.dark).font('Helvetica-Bold')
             .text(hotel.mealPlan || 'Breakfast', page.margin + 160, detailsY + 12);
          
          // Pax info
          doc.fontSize(type.small).fillColor(colors.text.light).font('Helvetica')
             .text(hotel.paxDistribution || `${formData.adults || 2} Adults`, page.margin + space.sm, detailsY + 30);

          // Hotel image - modern framing
          if (imageCache[`hotel${i}`]) {
            const imgX = doc.page.width - page.margin - 145;
            const imgY = yPos - 70;
            
            addImageSafe(doc, imageCache[`hotel${i}`], imgX, imgY, {
              width: 130,
              height: 100,
              fit: [130, 100]
            });
          }

          yPos += 60;
          
          // Divider between hotels
          if (i < hotels.length - 1) {
            drawDivider(doc, page.margin + space.lg, yPos, page.contentWidth - space.xl, colors.border);
            yPos += space.md;
          }
        }
        
        addFooter(doc, currentPageNum);
      }

      // ═══════════════════════════════════════════════════════════════
      // DAY-WISE ITINERARY - Clean Timeline Style
      // ═══════════════════════════════════════════════════════════════
      const days = formData.days || [];
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        
        currentPageNum++;
        doc.addPage();
        const headerH = addHeader(doc, false);
        
        // Background
        doc.rect(0, headerH, doc.page.width, doc.page.height - headerH - 55)
           .fillColor(colors.bg.offWhite)
           .fill();
        
        yPos = headerH + space.md;

        // Day header
        drawCard(doc, page.margin, yPos, page.contentWidth, 45, { shadow: false });
        drawAccentLine(doc, page.margin, yPos, page.contentWidth, colors.info);
        
        // Day number badge
        doc.circle(page.margin + 25, yPos + 23, 15)
           .fillColor(colors.accent)
           .fill();
        doc.fontSize(type.body).fillColor(colors.text.white).font('Helvetica-Bold')
           .text(String(day.dayNumber || i + 1), page.margin + 20, yPos + 18);
        
        // Day label
        doc.fontSize(type.h4).fillColor(colors.text.dark).font('Helvetica-Bold')
           .text(`Day ${day.dayNumber || i + 1}`, page.margin + 50, yPos + 16);
        
        // Date on right
        if (day.date) {
          doc.fontSize(type.body).fillColor(colors.accent).font('Helvetica-Bold')
             .text(formatDate(day.date), doc.page.width - page.margin - 150, yPos + 17);
        }
        
        yPos += 60;

        // Day title - large and prominent
        doc.fontSize(type.h2).fillColor(colors.accent).font('Helvetica-Bold')
           .text(day.title || 'Day Itinerary', page.margin + space.sm, yPos);
        
        yPos += space.lg;
        
        // Description as bullet points
        const description = day.description || '';
        const bulletPoints = description.split('\n').filter(line => line.trim());
        
        if (bulletPoints.length > 0) {
          drawCard(doc, page.margin, yPos, page.contentWidth, 
                   Math.min(bulletPoints.length * 28 + 30, 350), { shadow: true });
          
          yPos += space.sm;
          
          doc.fontSize(type.body).fillColor(colors.text.dark).font('Helvetica');
          bulletPoints.forEach((point) => {
            if (yPos > 680) {
              addFooter(doc, currentPageNum);
              currentPageNum++;
              doc.addPage();
              yPos = addHeader(doc, false) + space.md;
              doc.rect(0, yPos - space.md, doc.page.width, doc.page.height - yPos + space.md - 55)
                 .fillColor(colors.bg.offWhite).fill();
            }
            
            const cleanPoint = point.replace(/^[•\-\*]\s*/, '').trim();
            
            // Minimal bullet point
            doc.circle(page.margin + space.sm + 3, yPos + 5, 3)
               .fillColor(colors.accent)
               .fill();
            
            doc.text(cleanPoint, page.margin + space.lg, yPos, {
              width: page.contentWidth - space.xl,
              lineGap: 3
            });
            yPos += 25;
          });
        }

        // Day image with clean presentation
        if (imageCache[`day${i}`]) {
          yPos += space.md;
          
          if (yPos > 550) {
            addFooter(doc, currentPageNum);
            currentPageNum++;
            doc.addPage();
            yPos = addHeader(doc, false) + space.md;
            doc.rect(0, yPos - space.md, doc.page.width, doc.page.height - yPos + space.md - 55)
               .fillColor(colors.bg.offWhite).fill();
          }
          
          const imgWidth = page.contentWidth - space.lg;
          const imgHeight = 180;
          
          // Clean image presentation
          addImageSafe(doc, imageCache[`day${i}`], page.margin + space.sm, yPos, {
            width: imgWidth,
            height: imgHeight,
            fit: [imgWidth, imgHeight]
          });
          
          yPos += imgHeight + space.sm;
        }

        addFooter(doc, currentPageNum);
      }

      // ═══════════════════════════════════════════════════════════════
      // INCLUSIONS & EXCLUSIONS - Two Column Layout
      // ═══════════════════════════════════════════════════════════════
      currentPageNum++;
      doc.addPage();
      const incExcHeaderH = addHeader(doc, false);
      
      doc.rect(0, incExcHeaderH, doc.page.width, doc.page.height - incExcHeaderH - 55)
         .fillColor(colors.bg.offWhite)
         .fill();
      
      yPos = incExcHeaderH + space.md;

      // Section header
      drawCard(doc, page.margin, yPos, page.contentWidth, 42, { shadow: false });
      drawAccentLine(doc, page.margin, yPos, page.contentWidth, colors.success);
      
      doc.fontSize(type.h3).fillColor(colors.text.dark).font('Helvetica-Bold')
         .text("What's Included & Excluded", page.margin + space.sm, yPos + 14);

      yPos += 55;

      const columnWidth = (page.contentWidth - space.md) / 2;
      
      // Inclusions Card
      const incCardX = page.margin;
      drawCard(doc, incCardX, yPos, columnWidth, 380, { shadow: true });
      
      // Green header
      doc.rect(incCardX, yPos, columnWidth, 32)
         .fillColor(colors.success)
         .fill();
      doc.fontSize(type.body).fillColor(colors.text.white).font('Helvetica-Bold')
         .text('✓  INCLUSIONS', incCardX + space.sm, yPos + 10);
      
      let incY = yPos + 45;
      
      doc.fontSize(type.small).fillColor(colors.text.dark).font('Helvetica');
      (formData.inclusions || []).forEach((item) => {
        const cleanItem = decodeHTMLEntities(item);
        
        // Green bullet
        doc.circle(incCardX + space.sm + 3, incY + 4, 3)
           .fillColor(colors.success)
           .fill();
        
        const textHeight = doc.heightOfString(cleanItem, { width: columnWidth - 45, lineGap: 3 });
        doc.text(cleanItem, incCardX + space.lg, incY, { width: columnWidth - 45, lineGap: 3 });
        incY += Math.max(textHeight + 12, 22);
      });

      // Exclusions Card
      const excCardX = page.margin + columnWidth + space.md;
      drawCard(doc, excCardX, yPos, columnWidth, 380, { shadow: true });
      
      // Red header
      doc.rect(excCardX, yPos, columnWidth, 32)
         .fillColor('#EF4444')
         .fill();
      doc.fontSize(type.body).fillColor(colors.text.white).font('Helvetica-Bold')
         .text('✗  EXCLUSIONS', excCardX + space.sm, yPos + 10);
      
      let excY = yPos + 45;
      
      doc.fontSize(type.small).fillColor(colors.text.dark).font('Helvetica');
      (formData.exclusions || []).forEach((item) => {
        const cleanItem = decodeHTMLEntities(item);
        
        // Red bullet
        doc.circle(excCardX + space.sm + 3, excY + 4, 3)
           .fillColor('#EF4444')
           .fill();
        
        const textHeight = doc.heightOfString(cleanItem, { width: columnWidth - 45, lineGap: 3 });
        doc.text(cleanItem, excCardX + space.lg, excY, { width: columnWidth - 45, lineGap: 3 });
        excY += Math.max(textHeight + 12, 22);
      });

      addFooter(doc, currentPageNum);

      // ═══════════════════════════════════════════════════════════════
      // TERMS & CONDITIONS - Clean List Style
      // ═══════════════════════════════════════════════════════════════
      currentPageNum++;
      doc.addPage();
      const termsHeaderH = addHeader(doc, false);
      
      doc.rect(0, termsHeaderH, doc.page.width, doc.page.height - termsHeaderH - 55)
         .fillColor(colors.bg.offWhite)
         .fill();
      
      yPos = termsHeaderH + space.md;

      // Section header
      drawCard(doc, page.margin, yPos, page.contentWidth, 42, { shadow: false });
      drawAccentLine(doc, page.margin, yPos, page.contentWidth, colors.primary);
      
      doc.fontSize(type.h3).fillColor(colors.text.dark).font('Helvetica-Bold')
         .text('Terms & Conditions', page.margin + space.sm, yPos + 14);

      yPos += 55;
      
      // Terms card
      drawCard(doc, page.margin, yPos, page.contentWidth, 480, { shadow: true });
      yPos += space.md;
      
      doc.fontSize(type.small).fillColor(colors.text.dark).font('Helvetica');
      bookingPolicy.termsAndConditions.forEach((term, idx) => {
        const cleanTerm = decodeHTMLEntities(term);
        const termHeight = doc.heightOfString(cleanTerm, { width: page.contentWidth - 60, lineGap: 4 });
        
        // Check for page break
        if (yPos + termHeight > 680) {
          addFooter(doc, currentPageNum);
          currentPageNum++;
          doc.addPage();
          yPos = addHeader(doc, false) + space.md;
          doc.rect(0, yPos - space.md, doc.page.width, doc.page.height - yPos + space.md - 55)
             .fillColor(colors.bg.offWhite).fill();
          drawCard(doc, page.margin, yPos, page.contentWidth, 480, { shadow: true });
          yPos += space.md;
        }
        
        // Numbered bullet - minimal circle
        doc.circle(page.margin + space.md, yPos + 5, 8)
           .fillColor(colors.bg.light)
           .fill();
        doc.fontSize(type.tiny).fillColor(colors.text.dark).font('Helvetica-Bold')
           .text(String(idx + 1), page.margin + space.md - 4, yPos + 2);
        
        doc.fontSize(type.small).fillColor(colors.text.dark).font('Helvetica')
           .text(cleanTerm, page.margin + 45, yPos, { width: page.contentWidth - 60, lineGap: 4 });
        yPos += termHeight + 16;
      });

      addFooter(doc, currentPageNum);

      // ═══════════════════════════════════════════════════════════════
      // CONSULTANT PAGE - Premium Sign-off
      // ═══════════════════════════════════════════════════════════════
      currentPageNum++;
      doc.addPage();
      const signoffHeaderH = addHeader(doc, false);
      
      doc.rect(0, signoffHeaderH, doc.page.width, doc.page.height - signoffHeaderH - 55)
         .fillColor(colors.bg.offWhite)
         .fill();
      
      yPos = signoffHeaderH + space.xl;

      // Main title
      doc.fontSize(type.h2).fillColor(colors.accent).font('Helvetica-Bold')
         .text('Your Travel Expert', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += space.sm;
      drawAccentLine(doc, (doc.page.width / 2) - 40, yPos, 80, colors.accent);

      yPos += space.lg;

      // Consultant card
      const consultantCardY = yPos;
      const cardWidth = 320;
      const cardX = (doc.page.width - cardWidth) / 2;
      
      drawCard(doc, cardX, consultantCardY, cardWidth, 260, { shadow: true });
      
      // Accent top bar
      doc.rect(cardX, consultantCardY, cardWidth, 6)
         .fillColor(colors.accent)
         .fill();

      yPos = consultantCardY + space.lg;
      
      // Consultant name
      doc.fontSize(type.h3).fillColor(colors.text.dark).font('Helvetica-Bold')
         .text(formData.consultantName || 'Travel Consultant', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += space.md;
      doc.fontSize(type.body).fillColor(colors.text.medium).font('Helvetica')
         .text(formData.consultantPosition || 'Senior Travel Advisor', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += space.lg;
      
      // Contact boxes
      const boxWidth = 180;
      const boxX = (doc.page.width - boxWidth) / 2;
      
      // Phone
      doc.rect(boxX, yPos, boxWidth, 35)
         .fillColor(colors.bg.light)
         .fill();
      doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica-Bold')
         .text('MOBILE', 0, yPos + 8, { align: 'center', width: doc.page.width });
      doc.fontSize(type.body).fillColor(colors.accent).font('Helvetica-Bold')
         .text(formData.consultantMobile || '+91 97468 16609', 0, yPos + 20, { align: 'center', width: doc.page.width });
      
      yPos += 45;
      
      // Email
      doc.rect(boxX, yPos, boxWidth, 35)
         .fillColor(colors.bg.light)
         .fill();
      doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica-Bold')
         .text('EMAIL', 0, yPos + 8, { align: 'center', width: doc.page.width });
      doc.fontSize(type.body).fillColor(colors.accent).font('Helvetica-Bold')
         .text(formData.consultantEmail || 'info@yatrasutra.com', 0, yPos + 20, { align: 'center', width: doc.page.width });
      
      yPos += space.xl;
      
      // Divider
      drawDivider(doc, cardX + 20, yPos, cardWidth - 40, colors.border);
      
      yPos += space.md;
      
      // Office address
      doc.fontSize(type.tiny).fillColor(colors.text.light).font('Helvetica-Bold')
         .text('OFFICE ADDRESS', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += 14;
      doc.fontSize(type.small).fillColor(colors.text.medium).font('Helvetica')
         .text('1st Floor, Penta Corner Building, Changampuzha Metro Station,', 0, yPos, { align: 'center', width: doc.page.width });
      
      yPos += 14;
      doc.text('Edapally, Kochi (Ernakulam) – Kerala, 682024, India', 0, yPos, { align: 'center', width: doc.page.width });

      yPos += space.xl;

      // Thank you message - clean banner
      const thankYouY = yPos;
      const bannerX = (doc.page.width - 400) / 2;
      
      doc.rect(bannerX, thankYouY, 400, 60)
         .fillColor(colors.accent)
         .fill();
      
      doc.fontSize(type.h4).fillColor(colors.text.white).font('Helvetica-Bold')
         .text('Thank You for Choosing Yatrasutra Holidays!', bannerX, thankYouY + 15, { 
           align: 'center', 
           width: 400 
         });
      
      doc.fontSize(type.small).fillColor(colors.text.white).font('Helvetica')
         .text("We're excited to create unforgettable memories with you.", bannerX, thankYouY + 38, { 
           align: 'center', 
           width: 400 
         });

      addFooter(doc, currentPageNum);

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

export default generateItineraryPDF;
