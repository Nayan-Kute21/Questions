import PDFParser from 'pdf2json';

/**
 * Extracts text from a PDF file using pdf2json
 * @param buffer - Buffer containing PDF data
 * @returns - Object containing extracted text and job title from the PDF
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string, jobTitle: string }> {
  try {
    // Create a new PDFParser instance
    const pdfParser = new PDFParser(null, true);
    
    // Create a promise to handle the parsing
    const parsingPromise = new Promise<{ text: string, jobTitle: string }>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData) => {
        console.error("PDF parsing error:", errData.parserError);
        reject(errData.parserError);
      });
      
      pdfParser.on("pdfParser_dataReady", () => {
        // Get raw text content
        let text = pdfParser.getRawTextContent();
        
        // Clean up the text by removing page break markers and other artifacts
        text = cleanupPdfText(text);
        
        console.log(`Successfully extracted and cleaned ${text.length} characters from PDF`);
        
        // Try to extract a potential job title from the first few lines
        let jobTitle = "Unspecified Position";
        const firstLines = text.split('\n').slice(0, 10).join(' ');
        
        // Look for common job title patterns in the beginning of the resume
        const titleMatches = firstLines.match(/(?:senior|junior|lead)?\s*(?:software|frontend|backend|fullstack|web)\s*(?:developer|engineer|architect)/i);
        if (titleMatches) {
          jobTitle = titleMatches[0];
        }
        
        resolve({ text, jobTitle });
      });
    });
    
    // Load and parse the PDF from buffer
    pdfParser.parseBuffer(buffer);
    return await parsingPromise;
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Cleans up the PDF text by removing page break markers and other artifacts
 * @param text - Raw text extracted from PDF
 * @returns Cleaned text
 */
function cleanupPdfText(text: string): string {
  // Remove page break markers (e.g., "n----------------Page (23) Break----------------")
  let cleaned = text.replace(/\n[-]+Page\s*\(\d+\)\s*Break[-]+/g, ' ');
  
  // Remove alternative page break formats (might vary based on PDF source)
  cleaned = cleaned.replace(/Page\s*\d+\s*of\s*\d+/g, ' ');
  
  // Remove PDF header/footer markers
  cleaned = cleaned.replace(/\[PDF\s*Header\]|\[PDF\s*Footer\]/g, ' ');
  
  // Remove excessive whitespace, including multiple consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove excessive spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Trim whitespace from the beginning and end
  cleaned = cleaned.trim();
  
  return cleaned;
}
