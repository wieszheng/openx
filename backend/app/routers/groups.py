from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=list[schemas.GroupOut])
def list_groups(db: Session = Depends(get_db)):
    return crud.get_groups(db)


@router.post("", response_model=schemas.GroupOut, status_code=201)
def create_group(body: schemas.GroupCreate, db: Session = Depends(get_db)):
    return crud.create_group(db, body)


@router.patch("/{group_id}", response_model=schemas.GroupOut)
def rename_group(group_id: int, body: schemas.GroupRename, db: Session = Depends(get_db)):
    group = crud.rename_group(db, group_id, body)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    if not crud.delete_group(db, group_id):
        raise HTTPException(status_code=404, detail="Group not found")
