from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from .models import StatusEnum, CasePriority


# ── CaseGroup ─────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name: str

class GroupRename(BaseModel):
    name: str

class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:   int
    name: str


# ── CaseDirectory ─────────────────────────────────────────────────────────

class DirectoryCreate(BaseModel):
    name:       str
    group_id:   int
    parent_id:  Optional[str] = None
    sort_order: int = 0
    created_by: Optional[str] = None

class DirectoryRename(BaseModel):
    name: str

class DirectoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:         str
    name:       str
    group_id:   int
    parent_id:  Optional[str]
    path:       str
    sort_order: int
    created_at: datetime


# ── TestCase ──────────────────────────────────────────────────────────────

class TestCaseCreate(BaseModel):
    name:            str
    directory_id:    Optional[str] = None
    description:     str = ""
    priority:        CasePriority = CasePriority.p2
    tags:            list[str] = []
    status:          StatusEnum = StatusEnum.debug
    preconditions:   str = ""
    steps_manual:    list[dict] = []
    expected_result: str = ""
    created_by:      Optional[str] = None

class TestCaseUpdate(BaseModel):
    name:            Optional[str]            = None
    description:     Optional[str]            = None
    priority:        Optional[CasePriority]   = None
    tags:            Optional[list[str]]      = None
    status:          Optional[StatusEnum]     = None
    preconditions:   Optional[str]            = None
    steps_manual:    Optional[list[dict]]     = None
    expected_result: Optional[str]            = None
    is_automated:    Optional[bool]           = None

class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             str
    name:           str
    directory_id:   Optional[str]
    description:    str
    priority:       CasePriority
    tags:           list
    status:         StatusEnum
    preconditions:  str
    steps_manual:   list
    expected_result: str
    is_automated:   bool
    created_by:     Optional[str]
    created_at:     datetime
    updated_at:     datetime
    version:        int
    is_deleted:     bool

class PaginatedTestCases(BaseModel):
    total:     int
    page:      int
    page_size: int
    items:     list[TestCaseOut]
