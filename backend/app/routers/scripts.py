from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(tags=["scripts"])


@router.get("/api/cases/{case_id}/script", response_model=schemas.ScriptOut)
def get_script(case_id: str, db: Session = Depends(get_db)):
    script = crud.get_script(db, case_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.put("/api/cases/{case_id}/script", response_model=schemas.ScriptOut)
def save_script(case_id: str, body: schemas.ScriptSave, db: Session = Depends(get_db)):
    if not crud.get_case(db, case_id):
        raise HTTPException(status_code=404, detail="Case not found")
    return crud.upsert_script(db, case_id, body)


@router.delete("/api/cases/{case_id}/script", status_code=204)
def delete_script(case_id: str, db: Session = Depends(get_db)):
    if not crud.delete_script(db, case_id):
        raise HTTPException(status_code=404, detail="Script not found")
