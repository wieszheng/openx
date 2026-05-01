import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, ForeignKey, Enum as SAEnum,
    DateTime, Text, Boolean, Index, JSON, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class MethodEnum(str, enum.Enum):
    Http = "Http"
    MQ   = "MQ"
    RPC  = "RPC"


class StatusEnum(str, enum.Enum):
    running  = "正常运行"
    debug    = "调试中"
    disabled = "已停用"

class CaseType(str, enum.Enum):
    ui = "ui"; api = "api"; mixed = "mixed"; manual = "manual"

class CasePriority(str, enum.Enum):
    p0 = "P0"
    p1 = "P1"
    p2 = "P2"
    p3 = "P3"


class LocatorMode(str, enum.Enum):
    dom    = "dom"
    visual = "visual"
    ocr    = "ocr"
    auto   = "auto"


class TaskStatus(str, enum.Enum):
    pending = "pending"; running = "running"; passed = "passed"
    failed  = "failed";  error   = "error";   cancelled = "cancelled"
 
class NodeStatus(str, enum.Enum):
    pending = "pending"; running = "running"; passed  = "passed"
    failed  = "failed";  skipped = "skipped"


class CaseGroup(Base):
    __tablename__ = "case_groups"

    id   : Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name : Mapped[str] = mapped_column(String(128), nullable=False)

    directories: Mapped[list["CaseDirectory"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class CaseDirectory(Base):
    """
    用例目录，支持无限层级。
    path 示例：
      根目录：   "root"
      一级目录：  "root.android"
      二级目录：  "root.android.login"
    """
    __tablename__ = "case_directories"

    id         : Mapped[str]           = mapped_column(String(36), primary_key=True,
                                                        default=lambda: str(uuid.uuid4()))
    parent_id  : Mapped[Optional[str]] = mapped_column(
                                          ForeignKey("case_directories.id", ondelete="RESTRICT"),
                                          nullable=True)
    name       : Mapped[str]           = mapped_column(String(100))
    path       : Mapped[str]           = mapped_column(Text)
    sort_order : Mapped[int]           = mapped_column(Integer, default=0)
    group_id   : Mapped[int]           = mapped_column(ForeignKey("case_groups.id"), nullable=False)
    created_by : Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)

    group    : Mapped["CaseGroup"]                = relationship(back_populates="directories")
    parent   : Mapped[Optional["CaseDirectory"]]  = relationship(
                   "CaseDirectory",
                   foreign_keys=[parent_id],
                   back_populates="children",
                   remote_side="CaseDirectory.id",
               )
    children : Mapped[list["CaseDirectory"]]      = relationship(
                   "CaseDirectory",
                   foreign_keys="CaseDirectory.parent_id",
                   back_populates="parent",
               )
    cases    : Mapped[list["TestCase"]]           = relationship(
                   "TestCase", back_populates="directory"
               )

    __table_args__ = (
        Index("ix_directories_parent_id", "parent_id"),
    )


class TestCase(Base):
    """
    测试用例 — 只存业务属性，不含自动化步骤。
    是否自动化由关联的 AutomationScript 是否存在决定，
    is_automated 字段冗余存储方便查询筛选。
    """
    __tablename__ = "test_cases"

    id             : Mapped[str]           = mapped_column(String(36), primary_key=True,
                                                            default=lambda: str(uuid.uuid4()))
    directory_id   : Mapped[Optional[str]] = mapped_column(
                                              ForeignKey("case_directories.id", ondelete="SET NULL"),
                                              nullable=True)
    case_type      : Mapped[CaseType]      = mapped_column(SAEnum(CaseType), default=CaseType.manual)
    name           : Mapped[str]           = mapped_column(String(200))
    description    : Mapped[str]           = mapped_column(Text, default="")
    priority       : Mapped[CasePriority]  = mapped_column(SAEnum(CasePriority), default=CasePriority.p2)
    tags           : Mapped[list]          = mapped_column(JSON, default=list)
    status         : Mapped[StatusEnum]    = mapped_column(SAEnum(StatusEnum), nullable=False)
    preconditions  : Mapped[str]           = mapped_column(Text, default="")
    # 手工测试步骤：[{seq, action, expected, note}]
    steps_manual   : Mapped[list]          = mapped_column(JSON, default=list)
    expected_result: Mapped[str]           = mapped_column(Text, default="")
    # 冗余字段，与 script 是否存在保持同步
    is_automated   : Mapped[bool]          = mapped_column(Boolean, default=False)
    created_by     : Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at     : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    updated_at     : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow,
                                                            onupdate=datetime.utcnow)
    version        : Mapped[int]           = mapped_column(Integer, default=1)
    is_deleted     : Mapped[bool]          = mapped_column(Boolean, default=False)

    directory : Mapped[Optional["CaseDirectory"]] = relationship("CaseDirectory",
                                                                   back_populates="cases")
    script    : Mapped[Optional["AutomationScript"]] = relationship("AutomationScript", back_populates="case", uselist=False)
    runs      : Mapped[list["TaskRun"]]              = relationship("TaskRun", back_populates="case")

    __table_args__ = (
        Index("ix_cases_directory_id",   "directory_id"),
        Index("ix_cases_is_deleted",     "is_deleted"),
        Index("ix_cases_priority",       "priority"),
        Index("ix_cases_is_automated",   "is_automated"),
    )


class AutomationScript(Base):
    """
    直接存 ReactFlow 画布数据：
      nodes: [{id, type, position, data:{label,action,...}, ...}]
      edges: [{id, source, target, ...}]

    执行时从 edges 拓扑排序得到执行序列，
    不做任何转换，前端存什么就是什么。

    env_config: 环境变量默认值 {"base_url":"https://xxx"}
    device_type: 含 app* 节点时生效
    """
    __tablename__ = "automation_scripts"
    id             : Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id        : Mapped[str]  = mapped_column(ForeignKey("test_cases.id", ondelete="CASCADE"), unique=True)
    nodes          : Mapped[list] = mapped_column(JSON, default=list)   # ReactFlow nodes
    edges          : Mapped[list] = mapped_column(JSON, default=list)   # ReactFlow edges
    env_config     : Mapped[dict] = mapped_column(JSON, default=dict)
    timeout_ms     : Mapped[int]  = mapped_column(Integer, default=60_000)
    retry_count    : Mapped[int]  = mapped_column(Integer, default=0)
    version        : Mapped[int]  = mapped_column(Integer, default=1)
    created_by     : Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    updated_at     : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case : Mapped["TestCase"]      = relationship("TestCase", back_populates="script")
    runs : Mapped[list["TaskRun"]] = relationship("TaskRun",  back_populates="script")
    __table_args__ = (Index("ix_script_case", "case_id"),)
 
 
# ── 执行记录 ──────────────────────────────────────────────────────
 
class TaskRun(Base):
    """
    nodes_snapshot / edges_snapshot：执行时快照，报告永远对得上画布。
    """
    __tablename__ = "task_runs"
    id              : Mapped[str]        = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id         : Mapped[str]        = mapped_column(ForeignKey("test_cases.id"))
    script_id       : Mapped[Optional[str]] = mapped_column(ForeignKey("automation_scripts.id"), nullable=True)
    serial          : Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status          : Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.pending)
    nodes_snapshot  : Mapped[list]       = mapped_column(JSON, default=list)
    edges_snapshot  : Mapped[list]       = mapped_column(JSON, default=list)
    script_version  : Mapped[int]        = mapped_column(Integer, default=1)
    env_snapshot    : Mapped[dict]       = mapped_column(JSON, default=dict)
    started_at      : Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at        : Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_ms     : Mapped[Optional[int]]      = mapped_column(Integer, nullable=True)
    error_msg       : Mapped[Optional[str]]      = mapped_column(Text, nullable=True)
    triggered_by    : Mapped[Optional[str]]      = mapped_column(String(50), nullable=True)

    case         : Mapped["TestCase"]         = relationship("TestCase",         back_populates="runs")
    script       : Mapped[Optional["AutomationScript"]] = relationship("AutomationScript", back_populates="runs")
    node_results : Mapped[list["NodeResult"]] = relationship("NodeResult", back_populates="run", order_by="NodeResult.exec_order")

    __table_args__ = (
        Index("ix_runs_case",   "case_id"),
        Index("ix_runs_status", "status"),
        Index("ix_runs_start",  "started_at"),
    )
 
# ── 节点执行结果 ──────────────────────────────────────────────────
 
class NodeResult(Base):
    """
    node_id 对应 ReactFlow node.id，报告可精确定位到画布节点。
    output JSON 按节点类型存不同内容。
    """
    __tablename__ = "node_results"
    id            : Mapped[str]        = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id        : Mapped[str]        = mapped_column(ForeignKey("task_runs.id", ondelete="CASCADE"))
    node_id       : Mapped[str]        = mapped_column(String(100))    # ReactFlow node.id
    node_type     : Mapped[str]        = mapped_column(String(50))
    exec_order    : Mapped[int]        = mapped_column(Integer)        # 拓扑排序后的执行序号
    desc          : Mapped[str]        = mapped_column(Text, default="")
    status        : Mapped[NodeStatus] = mapped_column(SAEnum(NodeStatus), default=NodeStatus.pending)
    output        : Mapped[dict]       = mapped_column(JSON, default=dict)
    duration_ms   : Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    screenshot_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_msg     : Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    run: Mapped["TaskRun"] = relationship("TaskRun", back_populates="node_results")

    __table_args__ = (
        Index("ix_node_run", "run_id"),
        UniqueConstraint("run_id", "node_id", name="uq_node_run_node"),
    )
 