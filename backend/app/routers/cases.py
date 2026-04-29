from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(tags=["cases"])


@router.get("/api/directories/{directory_id}/cases", response_model=schemas.PaginatedTestCases)
def list_cases(
    directory_id: str,
    keyword:   str | None = Query(default=None),
    owner:     str | None = Query(default=None),
    priority:  str | None = Query(default=None),
    page:      int        = Query(default=1,  ge=1),
    page_size: int        = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total, items = crud.get_cases(db, directory_id, keyword, owner, priority, page, page_size)
    return schemas.PaginatedTestCases(total=total, page=page, page_size=page_size, items=items)


@router.post("/api/directories/{directory_id}/cases", response_model=schemas.TestCaseOut, status_code=201)
def create_case(
    directory_id: str,
    body: schemas.TestCaseCreate,
    db: Session = Depends(get_db),
):
    body.directory_id = directory_id
    return crud.create_case(db, body)


@router.get("/api/cases/{case_id}", response_model=schemas.TestCaseOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = crud.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case



def update_case(case_id: str, body: schemas.TestCaseUpdate, db: Session = Depends(get_db)):
    case = crud.update_case(db, case_id, body)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.delete("/api/cases/{case_id}", status_code=204)
def delete_case(case_id: str, db: Session = Depends(get_db)):
    if not crud.soft_delete_case(db, case_id):
        raise HTTPException(status_code=404, detail="Case not found")
