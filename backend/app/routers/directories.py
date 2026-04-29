from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/directories", tags=["directories"])


@router.get("", response_model=list[schemas.DirectoryOut])
def list_directories(
    group_id:  int | None = Query(default=None),
    parent_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_directories(db, group_id=group_id, parent_id=parent_id)


@router.post("", response_model=schemas.DirectoryOut, status_code=201)
def create_directory(body: schemas.DirectoryCreate, db: Session = Depends(get_db)):
    return crud.create_directory(db, body)


@router.patch("/{dir_id}", response_model=schemas.DirectoryOut)
def rename_directory(dir_id: str, body: schemas.DirectoryRename, db: Session = Depends(get_db)):
    directory = crud.rename_directory(db, dir_id, body)
    if not directory:
        raise HTTPException(status_code=404, detail="Directory not found")
    return directory


@router.delete("/{dir_id}", status_code=204)
def delete_directory(dir_id: str, db: Session = Depends(get_db)):
    total = crud.count_all_directories(db)
    if total <= 1:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete the last remaining directory",
        )
    if not crud.delete_directory(db, dir_id):
        raise HTTPException(status_code=404, detail="Directory not found")
