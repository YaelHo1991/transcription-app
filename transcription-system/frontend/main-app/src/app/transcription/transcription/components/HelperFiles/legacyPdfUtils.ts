// PDF to image converter using legacy build (no worker needed)
export interface PDFPageImage {
  url: string;
  pageNumber: number;
  totalPages: number;
}

// Type declarations for PDF.js
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export async function convertPDFToImages(file: File): Promise<PDFPageImage[]> {
  try {
    console.log('Starting PDF conversion for:', file.name);
    
    // Dynamically load PDF.js legacy build from CDN
    if (!window.pdfjsLib) {
      await loadPdfJs();
    }
    
    const pdfjsLib = window.pdfjsLib;
    
    // Read file
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer 
    }).promise;
    
    const totalPages = pdf.numPages;
    console.log('PDF loaded with', totalPages, 'pages');
    
    const images: PDFPageImage[] = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render page
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert to image
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        images.push({
          url: dataUrl,
          pageNumber: pageNum,
          totalPages: totalPages
        });
        
        console.log('Converted page ' + pageNum + '/' + totalPages);
        
        // Cleanup
        page.cleanup();
      } catch (error) {
        console.error('Error processing page ' + pageNum + ':', error);
      }
    }
    
    return images;
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error('Failed to process PDF');
  }
}

// Load PDF.js from CDN
async function loadPdfJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Load the legacy build that includes everything
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js';
    script.onload = () => {
      console.log('PDF.js loaded successfully');
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load PDF.js'));
    };
    document.head.appendChild(script);
  });
}