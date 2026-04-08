import logging
import os
import shutil
import subprocess
import tempfile
import asyncio
from typing import List, Optional
import pypdfium2 as pdfium
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
                # Fallback check if it's already in PATH
                pytesseract.get_tesseract_version()
                self.tesseract_available = True
            except Exception:
                logger.warning("Tesseract not found in standard paths or PATH environment variable.")

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

    async def extract_from_pdf(self, pdf_path: str) -> str:
        """
        Convert each page of a PDF to an image and perform OCR.
        :param pdf_path: Path to the scanned PDF file.
        :return: Consolidated text from all pages.
        """
        full_text = []
        try:
            pdf = pdfium.PdfDocument(pdf_path)
            for i in range(len(pdf)):
                page = pdf[i]
                # Render page to image (300 DPI for better OCR)
                bitmap = page.render(scale=4)  # 288 DPI approx
                pil_image = bitmap.to_pil()
                
                # Perform OCR with WinOCR priority, fallback to Tesseract
                text = await self._ocr_dispatch(pil_image)
                full_text.append(text)
                
            pdf.close()
            return "\n\n".join(full_text)
        except Exception as e:
            logger.error(f"Error during PDF OCR extraction: {str(e)}")
            return ""

    async def extract_from_image(self, image_path: str) -> str:
        """
        Perform OCR on a single image file.
        :param image_path: Path to the image file.
        :return: Extracted text.
        """
        try:
            pil_image = Image.open(image_path)
            return await self._ocr_dispatch(pil_image)
        except Exception as e:
            logger.error(f"Error during image OCR extraction: {str(e)}")
            return ""

    async def _ocr_dispatch(self, pil_image: Image.Image) -> str:
        """Internal dispatcher that tries WinOCR then Tesseract."""
        if os.name == 'nt':
            text = await self._extract_winocr(pil_image)
            if text.strip():
                return text

        if self.tesseract_available:
            # Run Tesseract in a thread to keep event loop free
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, pytesseract.image_to_string, pil_image)
        
        return ""

    async def _extract_winocr(self, pil_image: Image.Image) -> str:
        """Windows Native OCR via PowerShell Bridge."""
        temp_file = None
        try:
            # Save PIL image to temporary png
            fd, temp_path = tempfile.mkstemp(suffix=".png")
            os.close(fd)
            temp_file = temp_path
            pil_image.save(temp_file, format="PNG")

            # PowerShell snippet for Windows.Media.Ocr
            ps_script = f"""
            $ErrorActionPreference = 'Stop'
            [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] > $null
            [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] > $null
            [Windows.Storage.Streams.RandomAccessStreamReference, Windows.Storage.Streams, ContentType = WindowsRuntime] > $null

            async function Get-OcrText($path) {{
                $file = Get-Item $path
                $stream = [Windows.Storage.Streams.RandomAccessStreamReference]::CreateFromFile($file).OpenReadAsync().GetResults()
                $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetResults()
                $bitmap = $decoder.GetSoftwareBitmapAsync().GetResults()
                $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
                $result = $engine.RecognizeAsync($bitmap).GetResults()
                return $result.Text
            }}
            Get-OcrText "{temp_file.replace('\\', '/')}"
            """

            process = await asyncio.create_subprocess_exec(
                'powershell', '-Command', ps_script,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                return stdout.decode('utf-8').strip()
            else:
                logger.warning(f"WinOCR fallback: {stderr.decode('utf-8')}")
                return ""
        except Exception as e:
            logger.debug(f"WinOCR failed, falling back: {str(e)}")
            return ""
        finally:
            if temp_file and os.path.exists(temp_file):
                try: os.remove(temp_file)
                except: pass

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
                for page in pdf.pages[:2]:  # Check first 2 pages
                    text = page.extract_text()
                    if text:
                        total_text += text
                
                # If less than 50 characters extracted, treat as scanned
                return len(total_text.strip()) < 50
        except:
            return True
