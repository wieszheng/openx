import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, ForeignKey, Enum as SAEnum,
    DateTime, Text, Boolean, Index, JSON,
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
    pending   = "pending"
    running   = "running"
    passed    = "passed"
    failed    = "failed"
    error     = "error"
    cancelled = "cancelled"


class StepStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    passed  = "passed"
    failed  = "failed"
    skipped = "skipped"


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
    # script : Mapped[Optional["AutomationScript"]] = relationship(...)
    # runs   : Mapped[list["TaskRun"]]              = relationship(...)

    __table_args__ = (
        Index("ix_cases_directory_id",   "directory_id"),
        Index("ix_cases_is_deleted",     "is_deleted"),
        Index("ix_cases_priority",       "priority"),
        Index("ix_cases_is_automated",   "is_automated"),
    )
