from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(tags=["runs"])


@router.post("/api/cases/{case_id}/runs", response_model=schemas.RunOut, status_code=201)
def create_run(case_id: str, body: schemas.RunCreate, db: Session = Depends(get_db)):
    if not crud.get_case(db, case_id):
        raise HTTPException(status_code=404, detail="Case not found")
    return crud.create_run(db, case_id, body)


@router.get("/api/cases/{case_id}/runs", response_model=schemas.PaginatedRuns)
def list_runs(
    case_id: str,
    page:      int = Query(default=1,  ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total, items = crud.get_runs(db, case_id, page, page_size)
    return schemas.PaginatedRuns(total=total, page=page, page_size=page_size, items=items)


@router.get("/api/runs/{run_id}", response_model=schemas.RunOut)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.patch("/api/runs/{run_id}/status", response_model=schemas.RunOut)
def update_run_status(run_id: str, body: schemas.RunStatusUpdate, db: Session = Depends(get_db)):
    run = crud.update_run_status(db, run_id, body)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.post("/api/runs/{run_id}/nodes", response_model=list[schemas.NodeResultOut])
def report_node_results(
    run_id: str, body: schemas.NodeResultBulkCreate, db: Session = Depends(get_db)
):
    if not crud.get_run(db, run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    return crud.bulk_upsert_node_results(db, run_id, body.results)


@router.get("/api/runs/{run_id}/nodes", response_model=list[schemas.NodeResultOut])
def get_node_results(run_id: str, db: Session = Depends(get_db)):
    run = crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run.node_results
