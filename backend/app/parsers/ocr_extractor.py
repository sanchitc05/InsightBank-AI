import logging
import os
import shutil
import tempfile
import asyncio
from typing import List, Optional
try:
    import pypdfium2 as pdfium
except Exception:
    pdfium = None
    # Defer logging until logger exists; use print fallback
    try:
        logger = logging.getLogger(__name__)
        logger.info("pypdfium2 not available; PDF page rendering will be disabled")
    except Exception:
        pass
from PIL import Image
import pytesseract
import io

# Setup logger
logger = logging.getLogger(__name__)

class OCRExtractor:
    """Utility class to extract text from scanned PDFs or images using OCR."""

    def __init__(self, tesseract_path: Optional[str] = None):
        """
        Initialize the OCR extractor.
        :param tesseract_path: Optional path to the tesseract executable.
        """
        self.tesseract_available = False
        self.winocr_available = False
        tesseract_path = tesseract_path or os.getenv("TESSERACT_PATH")

        if not tesseract_path:
            tesseract_path = self._find_tesseract()

        if tesseract_path:
            try:
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
                pytesseract.get_tesseract_version()
                self.tesseract_available = True
                logger.info(f"Tesseract found and configured at: {tesseract_path}")
            except Exception as e:
                logger.warning(f"Tesseract configured at {tesseract_path} but failed to start: {e}")
        else:
            try:
                pytesseract.get_tesseract_version()
                self.tesseract_available = True
                logger.info("Tesseract found in PATH")
            except Exception:
                logger.info("Tesseract not found in PATH or standard locations")

    def _find_tesseract(self) -> Optional[str]:
        if os.name == 'nt':
            common_paths = [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Tesseract-OCR', 'tesseract.exe'),
            ]
            for path in common_paths:
                if os.path.exists(path):
                    return path
        return None

    @staticmethod
    def find_tesseract() -> Optional[str]:
        """Static method to check if Tesseract is available."""
        tesseract_path = os.getenv("TESSERACT_PATH")
        
        if tesseract_path and os.path.exists(tesseract_path):
            return tesseract_path
        
        # Check common installation paths on Windows
        if os.name == 'nt':
            common_paths = [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Tesseract-OCR', 'tesseract.exe'),
            ]
            for path in common_paths:
                if os.path.exists(path):
                    return path
        
        # Check system PATH using shutil (cross-platform)
        path = shutil.which("tesseract")
        if path:
            return path
        
        return None

    def extract_from_pdf(self, pdf_path: str) -> str:
        """
        Convert each page of a PDF to an image and perform OCR synchronously.
        :param pdf_path: Path to the scanned PDF file.
        :return: Consolidated text from all pages.
        """
        full_text = []
        try:
            logger.debug(f"Starting PDF OCR extraction for: {pdf_path}")
            pdf = pdfium.PdfDocument(pdf_path)
            for i in range(len(pdf)):
                page = pdf[i]
                # Render page to image (300 DPI for better OCR)
                bitmap = page.render(scale=4)  # 288 DPI approx
                pil_image = bitmap.to_pil()
                
                # Perform OCR with Tesseract
                text = self._ocr_dispatch(pil_image)
                full_text.append(text)
                
            pdf.close()
            
            # Combine non-empty page text
            full_text = [t for t in full_text if t and t.strip()]
            combined = "\n\n".join(full_text)
            
            logger.debug(f"Completed PDF OCR extraction, text length: {len(combined)}")
                
            return combined
        except Exception as e:
            logger.error(f"Error during PDF OCR extraction: {str(e)}")
            return ""

    def extract_from_image(self, image_path: str) -> str:
        """
        Perform OCR on a single image file synchronously.
        :param image_path: Path to the image file.
        :return: Extracted text.
        """
        try:
            pil_image = Image.open(image_path)
            return self._ocr_dispatch(pil_image)
        except Exception as e:
            logger.error(f"Error during image OCR extraction: {str(e)}")
            return ""

    def _ocr_dispatch(self, pil_image: Image.Image) -> str:
        """Internal dispatcher that uses Tesseract for OCR extraction."""
        if self.tesseract_available:
            logger.debug("Using Tesseract OCR (pytesseract)")
            return pytesseract.image_to_string(pil_image)

        logger.warning("No OCR engine available (Tesseract not found). Returning empty string.")
        return ""

    @staticmethod
    def is_likely_scanned(pdf_path: str) -> bool:
        """
        Check if a PDF is likely scanned (has little to no extractable text).
        Returns True if less than 50 characters are extractable from the first 2 pages.
        """
        import pdfplumber
        try:
            with pdfplumber.open(pdf_path) as pdf:
                total_text = ""
                for page in pdf.pages[:3]:  # Check first 3 pages
                    text = page.extract_text() or ""
                    total_text += text
                # If less than 100 characters extracted, treat as scanned
                return len(total_text.strip()) < 100
        except:
            return True
