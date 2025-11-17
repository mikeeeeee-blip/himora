const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

// Product catalog
const PRODUCTS = [
  {
    name: "MC13 HYBRID PADDY",
    category: "Uncategorized",
    price: 1250.0,
  },
  {
    name: "PAC 501 JOWAR",
    category: "Plant accessories",
    price: 1008.9,
  },
  {
    name: "PAC837 HYBRID PADDY (RICE)",
    category: "Plant accessories",
    price: 8500.9,
  },
  {
    name: "SMART SILAGE INOCULANT",
    category: "Plant accessories",
    price: 2000.9,
  },
  {
    name: "Iris Hybrid Coriander Seeds",
    category: "Uncategorized",
    price: 120.0,
  },
  {
    name: "Iris Hybrid Okra Seeds",
    category: "Uncategorized",
    price: 110.0,
  },
  {
    name: "Katyayani Active Humic Acid, Fulvic Acid Fertilizer",
    category: "Uncategorized",
    price: 360.0,
  },
  {
    name: "Yellow Marigold Flower Seeds",
    category: "Plant accessories",
    price: 100.0,
  },
  {
    name: "Fat Boy (Multi-Cut Forage Sorghum)",
    category: "Uncategorized",
    price: 501.0,
  },
  {
    name: "Multistar RZ F1 Cucumber",
    category: "Plant accessories",
    price: 11001.9,
  },
  {
    name: "Surabhi Black Mustard Seeds",
    category: "Uncategorized",
    price: 749.0,
  },
  {
    name: "Surabhi Coriander Seeds",
    category: "Uncategorized",
    price: 100.0, // Default price for missing price
  },
];

/**
 * Selects products to match the transaction amount
 * Algorithm: Tries to get approximately 10 products per ₹1000
 * Uses discount to balance any difference
 */
function selectProductsForInvoice(transactionAmount) {
  // Calculate target product count: 10 products per ₹1000
  const targetProductCount = Math.max(
    1,
    Math.floor((transactionAmount / 1000) * 10)
  );
  const selectedProducts = [];
  let currentTotal = 0;

  // Filter out products with zero or invalid prices
  const availableProducts = PRODUCTS.filter((p) => p.price > 0);

  if (availableProducts.length === 0) {
    throw new Error("No valid products available for invoice generation");
  }

  // Sort products by price (ascending) for better distribution
  const sortedProducts = [...availableProducts].sort(
    (a, b) => a.price - b.price
  );

  // Calculate average price per product needed
  const avgPricePerProduct = transactionAmount / targetProductCount;

  // Select products to reach target count
  let productIndex = 0;
  while (
    selectedProducts.length < targetProductCount &&
    currentTotal < transactionAmount * 1.5
  ) {
    // Cycle through products to get variety
    const product = sortedProducts[productIndex % sortedProducts.length];
    const remainingAmount = transactionAmount - currentTotal;
    const remainingSlots = targetProductCount - selectedProducts.length;

    // Calculate ideal quantity for this product
    let quantity = 1;

    if (remainingSlots > 1) {
      // If we have multiple slots left, try to distribute evenly
      const idealPriceForRemaining = remainingAmount / remainingSlots;
      if (product.price <= idealPriceForRemaining) {
        quantity = Math.min(
          Math.floor(idealPriceForRemaining / product.price),
          Math.floor(remainingAmount / product.price),
          3 // Max 3 per product for variety
        );
        quantity = Math.max(1, quantity); // At least 1
      }
    } else {
      // Last product - use remaining amount
      quantity = Math.max(1, Math.floor(remainingAmount / product.price));
    }

    const itemTotal = product.price * quantity;

    // Only add if it doesn't exceed too much (we'll use discount to balance)
    if (itemTotal <= remainingAmount * 1.2 || selectedProducts.length === 0) {
      selectedProducts.push({
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: quantity,
      });
      currentTotal += itemTotal;
    } else {
      // If product is too expensive, add with quantity 1 and use discount
      selectedProducts.push({
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1,
      });
      currentTotal += product.price;
    }

    productIndex++;

    // Safety check to avoid infinite loop
    if (productIndex > sortedProducts.length * 2) {
      break;
    }
  }

  // If we still haven't reached target, fill with cheapest products
  while (selectedProducts.length < targetProductCount) {
    const cheapestProduct = sortedProducts[0];
    selectedProducts.push({
      name: cheapestProduct.name,
      category: cheapestProduct.category,
      price: cheapestProduct.price,
      quantity: 1,
    });
    currentTotal += cheapestProduct.price;
  }

  // Calculate subtotal
  const subtotal = selectedProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Calculate discount to balance the amount (if subtotal exceeds transaction amount)
  const discount = Math.max(0, subtotal - transactionAmount);
  const discountPercentage =
    subtotal > 0 ? ((discount / subtotal) * 100).toFixed(2) : 0;

  // Calculate final total
  const finalTotal = subtotal - discount;

  return {
    products: selectedProducts,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    discountPercentage: parseFloat(discountPercentage),
    total: parseFloat(finalTotal.toFixed(2)),
  };
}

/**
 * Format Indian Rupee with proper comma separation
 * Using "Rs." prefix to avoid font encoding issues
 */
function formatINR(value) {
  if (value == null || isNaN(value)) return "Rs. 0.00";
  const numValue = Number(value);
  const parts = numValue.toFixed(2).split(".");
  let intPart = parts[0];
  let last3 = intPart.slice(-3);
  let other = intPart.slice(0, -3);
  if (other !== "") last3 = "," + last3;
  const formatted =
    other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + last3 + "." + parts[1];
  // Use "Rs." instead of rupee symbol to avoid font issues
  return `Rs. ${formatted}`;
}

/**
 * Convert number to words (simplified version)
 */
function numberToWords(amount) {
  // Simplified version - can be enhanced with a proper library
  // Remove "Rs." from formatted amount for words
  const amountStr = formatINR(amount).replace(/Rs\./g, "").trim();
  return `Indian Rupee ${amountStr} Only`;
}

/**
 * Generates a PDF invoice for a transaction
 * Professional invoice layout matching React component design
 */
function generateInvoicePDF(transaction, invoiceData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
        info: {
          Title: `Invoice ${transaction.transactionId}`,
          Author: "Shakti Sewa Foundation",
          Subject: "Transaction Invoice",
        },
        autoFirstPage: true,
      });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 30;
      const contentWidth = pageWidth - margin * 2;
      let currentY = margin;

      // ============ HEADER SECTION ============
      // Logo and Company Info (Left Side)
      const logoPath = path.join(
        __dirname,
        "../../client/public/invoicelogo.png"
      );
      let logoX = margin;
      let companyX = margin;

      try {
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, logoX, currentY, {
            width: 64,
            height: 64,
            fit: [64, 64],
          });
          companyX = margin + 80;
        }
      } catch (err) {
        console.log("Logo not found, using text only:", err.message);
      }

      // Company Name and Details - Shakti Sewa Foundation
      doc
        .fontSize(18)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text("Shakti Sewa Foundation", companyX, currentY);

      let addressY = currentY + 18;
      doc
        .fontSize(8)
        .fillColor("#475569")
        .font("Helvetica")
        .text("353 mr3 road", companyX, addressY);

      addressY += 11;
      doc.text("Mahalakshmi nagar", companyX, addressY);

      addressY += 11;
      doc.text("Indore Madhya Pradesh 452001", companyX, addressY);

      addressY += 11;
      doc.text("India", companyX, addressY);

      addressY += 11;
      doc.text("CIN: U88100MP2025NPL079676", companyX, addressY);

      addressY += 15;
      doc.text("9243143997", companyX, addressY);

      addressY += 11;
      doc.text("foundationshaktisewa@gmail.com", companyX, addressY);

      // TAX INVOICE Box (Right Side)
      const invoiceBoxX = pageWidth - margin - 180;
      const invoiceBoxY = currentY;
      const invoiceBoxWidth = 180;
      const invoiceBoxHeight = 85;

      // Box background
      doc
        .rect(invoiceBoxX, invoiceBoxY, invoiceBoxWidth, invoiceBoxHeight)
        .fillColor("#F1F5F9")
        .fill()
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      const invoiceDate = new Date(transaction.paidAt || transaction.createdAt);
      const invoiceNumber = transaction.transactionId;

      // TAX INVOICE label - better styling
      doc
        .fontSize(9)
        .fillColor("#64748B")
        .font("Helvetica-Bold")
        .text("TAX INVOICE", invoiceBoxX + 10, invoiceBoxY + 10);

      // Invoice number - larger and bold
      doc
        .fontSize(8)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(invoiceNumber, invoiceBoxX + 10, invoiceBoxY + 24, {
          width: invoiceBoxWidth - 20,
        });

      // Invoice Date
      doc
        .fontSize(8)
        .fillColor("#475569")
        .font("Helvetica")
        .text("Invoice Date:", invoiceBoxX + 10, invoiceBoxY + 45);
      doc
        .fontSize(8)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(
          invoiceDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          invoiceBoxX + 10,
          invoiceBoxY + 57
        );

      //   // Terms
      //   doc
      //     .fontSize(8)
      //     .fillColor("#475569")
      //     .font("Helvetica")
      //     .text("Terms:", invoiceBoxX + 10, invoiceBoxY + 69);
      //   doc
      //     .fontSize(8)
      //     .fillColor("#000000")
      //     .font("Helvetica-Bold")
      //     .text("Due on Receipt", invoiceBoxX + 10, invoiceBoxY + 81);

      // ============ BILL TO SECTION ============
      currentY = invoiceBoxY + invoiceBoxHeight + 30;

      doc
        .fontSize(8)
        .fillColor("#64748B")
        .font("Helvetica")
        .text("Bill To", margin, currentY);

      currentY += 12;

      doc
        .fontSize(11)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(transaction.customerName || "Customer Name", margin, currentY);

      currentY += 14;

      doc.fontSize(9).fillColor("#475569").font("Helvetica");

      if (transaction.customerEmail) {
        doc.text(transaction.customerEmail, margin, currentY);
        currentY += 12;
      }
      if (transaction.customerPhone) {
        doc.text(transaction.customerPhone, margin, currentY);
        currentY += 12;
      }

      // Summary Box (Right Side - aligned with Bill To)
      const summaryBoxX = pageWidth - margin - 200;
      const summaryBoxY = invoiceBoxY + invoiceBoxHeight + 30;
      const summaryBoxWidth = 200;
      let summaryBoxHeight = 50;

      // Adjust height based on discount
      if (invoiceData.discount > 0) {
        summaryBoxHeight = 64;
      }

      doc
        .rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight)
        .fillColor("#FFFFFF")
        .fill()
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      let summaryY = summaryBoxY + 12;

      doc
        .fontSize(8)
        .fillColor("#475569")
        .font("Helvetica")
        .text("Sub Total", summaryBoxX + 10, summaryY, { width: 130 });
      doc
        .font("Helvetica-Bold")
        .fillColor("#1E293B")
        .text(formatINR(invoiceData.subtotal), summaryBoxX + 140, summaryY, {
          width: 50,
          align: "right",
        });

      summaryY += 14;

      // Discount (if applicable)
      if (invoiceData.discount > 0) {
        doc
          .font("Helvetica")
          .fillColor("#475569")
          .text("Discount", summaryBoxX + 10, summaryY, { width: 130 });
        doc
          .font("Helvetica-Bold")
          .fillColor("#DC2626")
          .text(
            `-${formatINR(invoiceData.discount)}`,
            summaryBoxX + 140,
            summaryY,
            { width: 50, align: "right" }
          );
        summaryY += 14;
      }

      const tax = 0; // No tax for now
      doc
        .font("Helvetica")
        .fillColor("#475569")
        .text("Tax", summaryBoxX + 10, summaryY, { width: 130 });
      doc
        .font("Helvetica-Bold")
        .fillColor("#1E293B")
        .text(formatINR(tax), summaryBoxX + 140, summaryY, {
          width: 50,
          align: "right",
        });

      // ============ ITEMS TABLE ============
      // Position table after Bill To and Summary sections
      const billToEndY = currentY;
      const summaryEndY = summaryBoxY + summaryBoxHeight;
      currentY = Math.max(billToEndY, summaryEndY) + 25;

      const tableTop = currentY;
      const tableLeft = margin;
      const tableWidth = contentWidth;

      // Calculate column widths - only Name, Category, Price
      const colWidths = {
        sno: 30,
        name: 280,
        category: 180,
        price: 120,
      };

      // Verify total width matches
      const totalColWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
      if (Math.abs(totalColWidth - tableWidth) > 5) {
        // Adjust name width to fit
        colWidths.name =
          tableWidth - colWidths.sno - colWidths.category - colWidths.price;
      }

      // Table Header Background
      doc.rect(tableLeft, tableTop, tableWidth, 28).fillColor("#F1F5F9").fill();

      // Table Header Text
      doc.fontSize(8).fillColor("#475569").font("Helvetica-Bold");

      // Calculate exact column positions
      let colX = tableLeft + 8;
      doc.text("#", colX, tableTop + 10, { width: colWidths.sno });

      colX = tableLeft + colWidths.sno + 13;
      doc.text("Product Name", colX, tableTop + 10, {
        width: colWidths.name - 10,
      });

      colX = tableLeft + colWidths.sno + colWidths.name + 3;
      doc.text("Category", colX, tableTop + 10, {
        width: colWidths.category - 10,
      });

      colX =
        tableLeft + colWidths.sno + colWidths.name + colWidths.category + 3;
      doc.text("Price", colX, tableTop + 10, {
        width: colWidths.price,
        align: "right",
      });

      // Table Rows - Use products from invoiceData
      let rowY = tableTop + 28;
      doc.fontSize(8).fillColor("#1E293B").font("Helvetica");

      invoiceData.products.forEach((product, index) => {
        const rowHeight = 30;

        // Row border (top)
        doc
          .moveTo(tableLeft, rowY)
          .lineTo(tableLeft + tableWidth, rowY)
          .strokeColor("#E2E8F0")
          .lineWidth(0.5)
          .stroke();

        // S.No
        colX = tableLeft + 8;
        doc.text((index + 1).toString(), colX, rowY + 10, {
          width: colWidths.sno,
        });

        // Product Name - use actual product name from array
        colX = tableLeft + colWidths.sno + 13;
        const maxNameWidth = colWidths.name - 10;
        let productName = product.name || "Product Name";

        // Ensure product name is not empty
        if (!productName || productName.trim() === "") {
          productName = `Product ${index + 1}`;
        }

        // For Hindi text, PDFKit may not render properly, but we'll try
        // If it's garbled, the user will need to use English names
        doc.text(productName, colX, rowY + 10, {
          width: maxNameWidth,
          ellipsis: true,
          lineGap: 2,
        });

        // Category
        colX = tableLeft + colWidths.sno + colWidths.name + 3;
        const category = product.category || "Uncategorized";
        doc.text(category, colX, rowY + 10, {
          width: colWidths.category - 10,
          ellipsis: true,
        });

        // Price
        colX =
          tableLeft + colWidths.sno + colWidths.name + colWidths.category + 3;
        doc.text(formatINR(product.price), colX, rowY + 10, {
          width: colWidths.price,
          align: "right",
        });

        rowY += rowHeight;
      });

      // Bottom border of table
      doc
        .moveTo(tableLeft, rowY)
        .lineTo(tableLeft + tableWidth, rowY)
        .strokeColor("#E2E8F0")
        .lineWidth(0.5)
        .stroke();

      // ============ TOTALS AND SIGNATURE SECTION ============
      currentY = rowY + 30;

      // Left Side: Total in Words and Notes
      const leftSectionWidth = contentWidth / 2 - 15;

      doc
        .fontSize(8)
        .fillColor("#475569")
        .font("Helvetica-Bold")
        .text("Total In Words", margin, currentY);

      currentY += 12;

      const wordsText = numberToWords(invoiceData.total);
      doc
        .fontSize(9)
        .fillColor("#1E293B")
        .font("Helvetica")
        .text(wordsText, margin, currentY, {
          width: leftSectionWidth,
          lineGap: 2,
        });

      currentY += 35;

      // Notes section
      doc
        .fontSize(8)
        .fillColor("#475569")
        .font("Helvetica")
        .text("Notes", margin, currentY);

      currentY += 12;

      const notesBoxHeight = 50;
      doc
        .rect(margin, currentY, leftSectionWidth, notesBoxHeight)
        .fillColor("#F1F5F9")
        .fill()
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(8)
        .fillColor("#1E293B")
        .font("Helvetica")
        .text("Thanks for your business.", margin + 8, currentY + 8, {
          width: leftSectionWidth - 16,
        });

      // Right Side: Total Amount Box (Dark box)
      const totalBoxX = pageWidth - margin - 250;
      const totalBoxY = rowY + 30;
      const totalBoxWidth = 250;
      const totalBoxHeight = 90;

      // Dark box background
      doc
        .rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight)
        .fillColor("#0F172A")
        .fill();

      let totalY = totalBoxY + 12;

      doc
        .fontSize(8)
        .fillColor("#E2E8F0")
        .font("Helvetica")
        .text("Total", totalBoxX + 15, totalY);

      totalY += 10;

      doc
        .fontSize(22)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(formatINR(invoiceData.total), totalBoxX + 15, totalY, {
          width: totalBoxWidth - 30,
        });

      totalY += 18;

      doc
        .fontSize(7)
        .fillColor("#CBD5E1")
        .font("Helvetica")
        .text("Balance Due", totalBoxX + 15, totalY, { width: 100 });
      doc
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(formatINR(invoiceData.total), totalBoxX + 115, totalY, {
          width: 120,
          align: "right",
        });

      // Signature section
      const signatureY = totalBoxY + totalBoxHeight + 15;

      doc
        .fontSize(8)
        .fillColor("#475569")
        .font("Helvetica")
        .text("Authorized Signature", totalBoxX, signatureY);

      const signatureBoxY = signatureY + 12;
      doc
        .rect(totalBoxX, signatureBoxY, 192, 40)
        .fillColor("#F1F5F9")
        .fill()
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      // ============ FOOTER ============
      const footerY = pageHeight - margin - 50;

      // Footer border
      doc
        .moveTo(margin, footerY)
        .lineTo(pageWidth - margin, footerY)
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(7)
        .fillColor("#64748B")
        .font("Helvetica-Bold")
        .text("Shakti Sewa Foundation", margin, footerY + 10);

      doc
        .font("Helvetica")
        .text(
          "353 mr3 road, Mahalakshmi nagar, Indore Madhya Pradesh 452001",
          margin,
          footerY + 20
        );

      doc.text(
        `9243143997 • foundationshaktisewa@gmail.com`,
        pageWidth - margin - 200,
        footerY + 20,
        { width: 200, align: "right" }
      );

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  selectProductsForInvoice,
  generateInvoicePDF,
};
