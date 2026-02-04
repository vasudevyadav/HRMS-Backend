const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const html_to_pdf = require('html-pdf-node');

const generatePdfFromEjs = async (templateName, data = {}, outputFileName = 'output.pdf') => {
  try {
    const basePath = __dirname;

    // Render the EJS template to HTML string
    const templatePath = path.join(__dirname, '../views/templates', `${templateName}.ejs`);
    const htmlContent = ejs.render(fs.readFileSync(templatePath, 'utf8'), data);

    const options = {
      format: 'A4',
      base: `file://${basePath}/`,
    };

    const file = { content: htmlContent };
    const pdfBuffer = await html_to_pdf.generatePdf(file, options); // ⬅️ await here

    // const outputPath = path.join(basePath, outputFileName);
    
    // fs.writeFileSync(outputPath, pdfBuffer); // ✅ now this is a buffer

    // console.log('✅ PDF saved at:', outputPath);
    return pdfBuffer;
  } catch (err) {
    console.error('❌ Error generating PDF:', err);
    throw err;
  }
};

module.exports = { generatePdfFromEjs };
