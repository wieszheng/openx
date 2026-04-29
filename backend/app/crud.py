from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from . import models, schemas


# ── Groups ────────────────────────────────────────────────────────────────

def get_groups(db: Session) -> list[models.CaseGroup]:
    return db.scalars(select(models.CaseGroup)).all()


def create_group(db: Session, data: schemas.GroupCreate) -> models.CaseGroup:
    group = models.CaseGroup(name=data.name)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def rename_group(db: Session, group_id: int, data: schemas.GroupRename) -> models.CaseGroup | None:
    group = db.get(models.CaseGroup, group_id)
    if not group:
        return None
    group.name = data.name
    db.commit()
    db.refresh(group)
    return group


def delete_group(db: Session, group_id: int) -> bool:
    group = db.get(models.CaseGroup, group_id)
    if not group:
        return False
    db.delete(group)
    db.commit()
    return True


# ── Directories ───────────────────────────────────────────────────────────

def get_directories(
    db: Session,
    group_id: int | None = None,
    parent_id: str | None = None,
) -> list[models.CaseDirectory]:
    stmt = select(models.CaseDirectory)
    if group_id is not None:
        stmt = stmt.where(models.CaseDirectory.group_id == group_id)
    if parent_id is not None:
        stmt = stmt.where(models.CaseDirectory.parent_id == parent_id)
    return db.scalars(stmt.order_by(models.CaseDirectory.sort_order)).all()


def count_all_directories(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(models.CaseDirectory))


def create_directory(db: Session, data: schemas.DirectoryCreate) -> models.CaseDirectory:
    if data.parent_id:
        parent = db.get(models.CaseDirectory, data.parent_id)
        path = f"{parent.path}.{data.name}" if parent else data.name
    else:
        path = data.name

    directory = models.CaseDirectory(
        name=data.name,
        group_id=data.group_id,
        parent_id=data.parent_id,
        path=path,
        sort_order=data.sort_order,
        created_by=data.created_by,
    )
    db.add(directory)
    db.commit()
    db.refresh(directory)
    return directory


def rename_directory(
    db: Session, dir_id: str, data: schemas.DirectoryRename
) -> models.CaseDirectory | None:
    directory = db.get(models.CaseDirectory, dir_id)
    if not directory:
        return None
    directory.name = data.name
    db.commit()
    db.refresh(directory)
    return directory


def delete_directory(db: Session, dir_id: str) -> bool:
    directory = db.get(models.CaseDirectory, dir_id)
    if not directory:
        return False
    db.delete(directory)
    db.commit()
    return True


# ── TestCases ─────────────────────────────────────────────────────────────

def get_case(db: Session, case_id: str) -> models.TestCase | None:
    case = db.get(models.TestCase, case_id)
    if case and not case.is_deleted:
        return case
    return None


def get_cases(
    db: Session,
    directory_id: str,
    keyword: str | None = None,
    owner: str | None = None,
    priority: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[int, list[models.TestCase]]:
    stmt = select(models.TestCase).where(
        models.TestCase.directory_id == directory_id,
        models.TestCase.is_deleted == False,
    )
    if keyword:
        stmt = stmt.where(models.TestCase.name.contains(keyword))
    if owner:
        stmt = stmt.where(models.TestCase.created_by == owner)
    if priority:
        stmt = stmt.where(models.TestCase.priority == priority)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return total, list(items)


def create_case(db: Session, data: schemas.TestCaseCreate) -> models.TestCase:
    case = models.TestCase(**data.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def update_case(
    db: Session, case_id: str, data: schemas.TestCaseUpdate
) -> models.TestCase | None:
    case = db.get(models.TestCase, case_id)
    if not case:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    case.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(case)
    return case


def soft_delete_case(db: Session, case_id: str) -> bool:
    case = db.get(models.TestCase, case_id)
    if not case:
        return False
    case.is_deleted = True
    case.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return True
