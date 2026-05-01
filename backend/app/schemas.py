from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from .models import StatusEnum, CasePriority, TaskStatus, NodeStatus, CaseType


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


# ── AutomationScript ──────────────────────────────────────────────────────

class ScriptSave(BaseModel):
    """创建或全量更新脚本（PUT 语义）"""
    nodes:       list[dict] = []
    edges:       list[dict] = []
    env_config:  dict = {}
    timeout_ms:  int = 60_000
    retry_count: int = 0
    created_by:  Optional[str] = None

class ScriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          str
    case_id:     str
    nodes:       list
    edges:       list
    env_config:  dict
    timeout_ms:  int
    retry_count: int
    version:     int
    updated_at:  datetime


# ── TaskRun ───────────────────────────────────────────────────────────────

class RunCreate(BaseModel):
    triggered_by: Optional[str] = None
    env_snapshot: dict = {}

class RunStatusUpdate(BaseModel):
    status:      TaskStatus
    started_at:  Optional[datetime] = None
    ended_at:    Optional[datetime] = None
    duration_ms: Optional[int] = None
    error_msg:   Optional[str] = None

class NodeResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             str
    node_id:        str
    node_type:      str
    exec_order:     int
    desc:           str
    status:         NodeStatus
    output:         dict
    duration_ms:    Optional[int]
    screenshot_url: Optional[str]
    error_msg:      Optional[str]

class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             str
    case_id:        str
    script_id:      Optional[str]
    serial:         Optional[str]
    status:         TaskStatus
    script_version: int
    env_snapshot:   dict
    started_at:     Optional[datetime]
    ended_at:       Optional[datetime]
    duration_ms:    Optional[int]
    error_msg:      Optional[str]
    triggered_by:   Optional[str]
    node_results:   list[NodeResultOut] = []

class PaginatedRuns(BaseModel):
    total:     int
    page:      int
    page_size: int
    items:     list[RunOut]


# ── NodeResult ────────────────────────────────────────────────────────────

class NodeResultBulkCreate(BaseModel):
    """批量上报节点执行结果"""
    results: list[dict]
