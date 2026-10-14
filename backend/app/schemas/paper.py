from pydantic import BaseModel, Field
from typing import List, Optional

class QuestionSchema(BaseModel):
    id: Optional[str] = None
    question_number: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str = Field(..., description="Must be A, B, C, or D")
    explanation: Optional[str] = ""
    option_a_explanation: Optional[str] = ""
    option_b_explanation: Optional[str] = ""
    option_c_explanation: Optional[str] = ""
    option_d_explanation: Optional[str] = ""
    marks: float = 1.0
    negative_marks: float = 0.0
    topic: Optional[str] = "General"
    difficulty: Optional[str] = "Medium"
    has_warning: bool = False
    warning_message: Optional[str] = None

class PaperCreateManual(BaseModel):
    title: str
    description: Optional[str] = ""
    raw_text: Optional[str] = None
    questions: Optional[List[QuestionSchema]] = None

class PaperUpdate(BaseModel):
    title: str
    description: Optional[str] = ""
    questions: List[QuestionSchema]

class PaperSummaryResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    original_filename: Optional[str] = None
    file_type: Optional[str] = None
    status: str
    total_questions: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ValidationWarning(BaseModel):
    question_number: int
    field: str
    message: str
    severity: str  # 'error' or 'warning'

class PaperValidationResult(BaseModel):
    is_valid: bool
    total_questions: int
    errors_count: int
    warnings_count: int
    issues: List[ValidationWarning]
    questions: List[QuestionSchema]
