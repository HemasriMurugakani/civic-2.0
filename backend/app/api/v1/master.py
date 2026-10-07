from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_roles
from app.models.entities import (
    User, UserRole, Department, Ward, ComplaintCategory, SLARule
)
from app.repositories.master_repo import MasterRepository
from app.repositories.user_repo import UserRepository
from app.schemas.master import (
    DepartmentCreate, DepartmentResponse,
    WardCreate, WardResponse,
    CategoryCreate, CategoryResponse,
    SLARuleCreate, SLARuleResponse
)
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/master", tags=["Master Administration"])

# --- Departments ---
@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    repo = MasterRepository(db)
    return repo.list_departments()

@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    payload: DepartmentCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    if repo.get_department_by_code(payload.code):
        raise HTTPException(status_code=400, detail="Department code already exists")
    dept = Department(**payload.model_dump())
    return repo.create_department(dept)

@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    payload: DepartmentCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    dept = repo.get_department_by_id(dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for k, v in payload.model_dump().items():
        setattr(dept, k, v)
    return repo.update_department(dept)

# --- Wards ---
@router.get("/wards", response_model=List[WardResponse])
def list_wards(db: Session = Depends(get_db)):
    repo = MasterRepository(db)
    return repo.list_wards()

@router.post("/wards", response_model=WardResponse)
def create_ward(
    payload: WardCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    if repo.get_ward_by_number(payload.ward_number):
        raise HTTPException(status_code=400, detail="Ward number already exists")
    ward = Ward(**payload.model_dump())
    return repo.create_ward(ward)

@router.put("/wards/{ward_id}", response_model=WardResponse)
def update_ward(
    ward_id: int,
    payload: WardCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    ward = repo.get_ward_by_id(ward_id)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    for k, v in payload.model_dump().items():
        setattr(ward, k, v)
    return repo.update_ward(ward)

# --- Categories ---
@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    cats = repo.list_categories(department_id=department_id)
    return [
        CategoryResponse(
            id=c.id,
            department_id=c.department_id,
            department_name=c.department.name_en if c.department else None,
            code=c.code,
            name_en=c.name_en,
            name_ta=c.name_ta,
            sla_hours=c.sla_hours,
            default_priority=c.default_priority,
            is_active=c.is_active,
            created_at=c.created_at,
        )
        for c in cats
    ]

@router.post("/categories", response_model=CategoryResponse)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN)),
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    cat = ComplaintCategory(**payload.model_dump())
    created = repo.create_category(cat)
    return CategoryResponse(
        id=created.id,
        department_id=created.department_id,
        department_name=created.department.name_en if created.department else None,
        code=created.code,
        name_en=created.name_en,
        name_ta=created.name_ta,
        sla_hours=created.sla_hours,
        default_priority=created.default_priority,
        is_active=created.is_active,
        created_at=created.created_at,
    )

# --- Officers for reassignment ---
@router.get("/officers", response_model=List[UserResponse])
def list_officers_for_assignment(
    department_id: Optional[int] = None,
    ward_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Dept admins can only list officers in their department
    if current_user.role == UserRole.DEPT_ADMIN:
        department_id = current_user.department_id

    user_repo = UserRepository(db)
    officers = user_repo.list_officers(department_id=department_id, ward_id=ward_id)
    return [UserResponse.model_validate(o) for o in officers]

# --- SLA Rules ---
@router.get("/sla-rules", response_model=List[SLARuleResponse])
def list_sla_rules(
    category_id: Optional[int] = None,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    rules = repo.list_sla_rules(category_id=category_id)
    return [SLARuleResponse.model_validate(r) for r in rules]

@router.post("/sla-rules", response_model=SLARuleResponse)
def create_sla_rule(
    payload: SLARuleCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    repo = MasterRepository(db)
    rule = SLARule(**payload.model_dump())
    return repo.create_sla_rule(rule)
