from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.entities import Department, Ward, ComplaintCategory, SLARule

class MasterRepository:
    def __init__(self, db: Session):
        self.db = db

    # Departments
    def get_department_by_id(self, dept_id: int) -> Optional[Department]:
        return self.db.query(Department).filter(Department.id == dept_id).first()

    def get_department_by_code(self, code: str) -> Optional[Department]:
        return self.db.query(Department).filter(Department.code == code).first()

    def list_departments(self, only_active: bool = True) -> List[Department]:
        q = self.db.query(Department)
        if only_active:
            q = q.filter(Department.is_active == True)
        return q.order_by(Department.name_en).all()

    def create_department(self, dept: Department) -> Department:
        self.db.add(dept)
        self.db.commit()
        self.db.refresh(dept)
        return dept

    def update_department(self, dept: Department) -> Department:
        self.db.commit()
        self.db.refresh(dept)
        return dept

    # Wards
    def get_ward_by_id(self, ward_id: int) -> Optional[Ward]:
        return self.db.query(Ward).filter(Ward.id == ward_id).first()

    def get_ward_by_number(self, ward_number: int) -> Optional[Ward]:
        return self.db.query(Ward).filter(Ward.ward_number == ward_number).first()

    def list_wards(self, only_active: bool = True) -> List[Ward]:
        q = self.db.query(Ward)
        if only_active:
            q = q.filter(Ward.is_active == True)
        return q.order_by(Ward.ward_number).all()

    def create_ward(self, ward: Ward) -> Ward:
        self.db.add(ward)
        self.db.commit()
        self.db.refresh(ward)
        return ward

    def update_ward(self, ward: Ward) -> Ward:
        self.db.commit()
        self.db.refresh(ward)
        return ward

    # Categories
    def get_category_by_id(self, category_id: int) -> Optional[ComplaintCategory]:
        return self.db.query(ComplaintCategory).filter(ComplaintCategory.id == category_id).first()

    def list_categories(
        self, department_id: Optional[int] = None, only_active: bool = True
    ) -> List[ComplaintCategory]:
        q = self.db.query(ComplaintCategory)
        if only_active:
            q = q.filter(ComplaintCategory.is_active == True)
        if department_id:
            q = q.filter(ComplaintCategory.department_id == department_id)
        return q.order_by(ComplaintCategory.name_en).all()

    def create_category(self, cat: ComplaintCategory) -> ComplaintCategory:
        self.db.add(cat)
        self.db.commit()
        self.db.refresh(cat)
        return cat

    def update_category(self, cat: ComplaintCategory) -> ComplaintCategory:
        self.db.commit()
        self.db.refresh(cat)
        return cat

    # SLA Rules
    def list_sla_rules(self, category_id: Optional[int] = None) -> List[SLARule]:
        q = self.db.query(SLARule).filter(SLARule.is_active == True)
        if category_id:
            q = q.filter(SLARule.category_id == category_id)
        return q.all()

    def create_sla_rule(self, rule: SLARule) -> SLARule:
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def update_sla_rule(self, rule: SLARule) -> SLARule:
        self.db.commit()
        self.db.refresh(rule)
        return rule
