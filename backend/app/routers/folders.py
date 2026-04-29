from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.get("", response_model=list[schemas.FolderOut])
def list_folders(
    group_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_folders(db, group_id=group_id)


@router.post("", response_model=schemas.FolderOut, status_code=201)
def create_folder(body: schemas.FolderCreate, db: Session = Depends(get_db)):
    return crud.create_folder(db, body)


@router.patch("/{folder_id}", response_model=schemas.FolderOut)
def rename_folder(folder_id: int, body: schemas.FolderRename, db: Session = Depends(get_db)):
    folder = crud.rename_folder(db, folder_id, body)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return folder


@router.delete("/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    total = crud.count_all_folders(db)
    if total <= 1:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete the last remaining folder",
        )
    if not crud.delete_folder(db, folder_id):
        raise HTTPException(status_code=404, detail="Folder not found")
