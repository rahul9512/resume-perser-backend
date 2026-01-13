import pdfplumber
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            if not pdf.pages:
                logger.warning(f"PDF has no pages: {file_path}")
                return ""
            
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                    
    except Exception as e:
        logger.error(f"Error reading PDF {file_path}: {str(e)}")
        # In a real app, you might want to re-raise a custom exception or return partial text
        return ""
        
    return text.strip()
