from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class ParserErrorResponse(BaseModel):
    detail: str = Field(..., description="A human-readable description of the error")
    parser: Optional[str] = Field(None, description="The name of the parser that failed")
    line: Optional[int] = Field(None, description="The line number where the error occurred, if applicable")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context about the error")

class StatementParsingException(Exception):
    def __init__(self, detail: str, parser: str = None, line: int = None, context: dict = None):
        self.detail = detail
        self.parser = parser
        self.line = line
        self.context = context
        super().__init__(self.detail)
