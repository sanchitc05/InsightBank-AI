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

        # Quick check for PowerShell availability on Windows to indicate WinOCR possibility
        if os.name == 'nt':
            ps = shutil.which('powershell') or shutil.which('pwsh')
            self.winocr_available = bool(ps)
            if self.winocr_available:
                logger.info(f"WinOCR available via PowerShell: {ps}")
            else:
                logger.info("WinOCR not available (powershell/pwsh not found)")

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
            logger.debug(f"Starting PDF OCR extraction for: {pdf_path}")
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
            combined = "\n\n".join(full_text)
            logger.debug(f"Completed PDF OCR extraction, total chars: {len(combined)}")
            return combined
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
        """Internal dispatcher that prefers WinOCR on Windows, then Tesseract."""
        # Prefer WinOCR when available on Windows
        if os.name == 'nt' and self.winocr_available:
            try:
                text = await self._extract_winocr(pil_image)
                if text and text.strip():
                    logger.debug("WinOCR produced text; using WinOCR result")
                    return text
                logger.debug("WinOCR returned no text; falling back")
            except Exception as e:
                logger.warning(f"WinOCR attempt failed: {e}")

        # Next, try Tesseract if available
        if self.tesseract_available:
            logger.debug("Using Tesseract OCR (pytesseract)")
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: pytesseract.image_to_string(pil_image))

        logger.warning("No OCR engine available (WinOCR/Tesseract). Returning empty string.")
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

            function Get-OcrText($path) {{
                $file = Get-Item $path
                $stream = [Windows.Storage.Streams.RandomAccessStreamReference]::CreateFromFile($file).OpenReadAsync().GetResults()
                $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetResults()
                $bitmap = $decoder.GetSoftwareBitmapAsync().GetResults()
                $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
                $result = $engine.RecognizeAsync($bitmap).GetResults()
                return $result.Text
            }}
            Get-OcrText "{temp_file}"
            """

            process = await asyncio.create_subprocess_exec(
                'powershell', '-NoProfile', '-NonInteractive', '-Command', ps_script,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                return stdout.decode('utf-8').strip()
            else:
                logger.debug(f"WinOCR stderr: {stderr.decode('utf-8')}")
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
                for page in pdf.pages[:3]:  # Check first 3 pages
                    text = page.extract_text() or ""
                    total_text += text
                # If less than 100 characters extracted, treat as scanned
                return len(total_text.strip()) < 100
        except:
            return True
