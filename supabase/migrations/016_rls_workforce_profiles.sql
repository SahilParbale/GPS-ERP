-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 016_rls_workforce_profiles.sql
-- Module: Row Level Security on Organization, Profiles, Roles, Employees & Workforce
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATION: companies, branches, departments, locations
-- ------------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- companies policies
DROP POLICY IF EXISTS p_companies_select ON public.companies;
CREATE POLICY p_companies_select ON public.companies
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_companies_write ON public.companies;
CREATE POLICY p_companies_write ON public.companies
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- branches policies
DROP POLICY IF EXISTS p_branches_select ON public.branches;
CREATE POLICY p_branches_select ON public.branches
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_branches_write ON public.branches;
CREATE POLICY p_branches_write ON public.branches
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- departments policies
DROP POLICY IF EXISTS p_departments_select ON public.departments;
CREATE POLICY p_departments_select ON public.departments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_departments_write ON public.departments;
CREATE POLICY p_departments_write ON public.departments
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- locations policies
DROP POLICY IF EXISTS p_locations_select ON public.locations;
CREATE POLICY p_locations_select ON public.locations
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_locations_write ON public.locations;
CREATE POLICY p_locations_write ON public.locations
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES: profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_profiles_select ON public.profiles;
CREATE POLICY p_profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_management());

DROP POLICY IF EXISTS p_profiles_insert ON public.profiles;
CREATE POLICY p_profiles_insert ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS p_profiles_update ON public.profiles;
CREATE POLICY p_profiles_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS p_profiles_delete ON public.profiles;
CREATE POLICY p_profiles_delete ON public.profiles
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. ROLES & PERMISSIONS: roles, permissions, role_permissions, employee_roles
-- (High Security Boundary — Writable ONLY by System Administrators)
-- ------------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;

-- roles: Read by authenticated; modify only by admin
DROP POLICY IF EXISTS p_roles_select ON public.roles;
CREATE POLICY p_roles_select ON public.roles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_roles_admin_write ON public.roles;
CREATE POLICY p_roles_admin_write ON public.roles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- permissions: Read by authenticated; modify only by admin
DROP POLICY IF EXISTS p_permissions_select ON public.permissions;
CREATE POLICY p_permissions_select ON public.permissions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_permissions_admin_write ON public.permissions;
CREATE POLICY p_permissions_admin_write ON public.permissions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- role_permissions: Read by authenticated; modify only by admin
DROP POLICY IF EXISTS p_role_permissions_select ON public.role_permissions;
CREATE POLICY p_role_permissions_select ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_role_permissions_admin_write ON public.role_permissions;
CREATE POLICY p_role_permissions_admin_write ON public.role_permissions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- employee_roles: Read by authenticated; insert/update/delete strictly ADMIN only (prevents Attack 2 & Attack 3)
DROP POLICY IF EXISTS p_employee_roles_select ON public.employee_roles;
CREATE POLICY p_employee_roles_select ON public.employee_roles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_employee_roles_admin_insert ON public.employee_roles;
CREATE POLICY p_employee_roles_admin_insert ON public.employee_roles
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_employee_roles_admin_update ON public.employee_roles;
CREATE POLICY p_employee_roles_admin_update ON public.employee_roles
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_employee_roles_admin_delete ON public.employee_roles;
CREATE POLICY p_employee_roles_admin_delete ON public.employee_roles
    FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. EMPLOYEES: employees
-- ------------------------------------------------------------------------------
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_employees_select ON public.employees;
CREATE POLICY p_employees_select ON public.employees
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_employees_insert ON public.employees;
CREATE POLICY p_employees_insert ON public.employees
    FOR INSERT TO authenticated WITH CHECK (public.is_management());

DROP POLICY IF EXISTS p_employees_update ON public.employees;
CREATE POLICY p_employees_update ON public.employees
    FOR UPDATE TO authenticated
    USING (public.is_management() OR public.is_same_employee(id))
    WITH CHECK (public.is_management() OR public.is_same_employee(id));

DROP POLICY IF EXISTS p_employees_delete ON public.employees;
CREATE POLICY p_employees_delete ON public.employees
    FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. SHIFTS: shifts
-- ------------------------------------------------------------------------------
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_shifts_select ON public.shifts;
CREATE POLICY p_shifts_select ON public.shifts
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_shifts_write ON public.shifts;
CREATE POLICY p_shifts_write ON public.shifts
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- ------------------------------------------------------------------------------
-- 6. ATTENDANCE: attendance
-- (Employees can only clock in/out their own record; prevents Attack 4)
-- ------------------------------------------------------------------------------
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_attendance_select ON public.attendance;
CREATE POLICY p_attendance_select ON public.attendance
    FOR SELECT TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_attendance_insert ON public.attendance;
CREATE POLICY p_attendance_insert ON public.attendance
    FOR INSERT TO authenticated
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_attendance_update ON public.attendance;
CREATE POLICY p_attendance_update ON public.attendance
    FOR UPDATE TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_attendance_delete ON public.attendance;
CREATE POLICY p_attendance_delete ON public.attendance
    FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. LEAVE REQUESTS: leave_requests
-- ------------------------------------------------------------------------------
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_leave_select ON public.leave_requests;
CREATE POLICY p_leave_select ON public.leave_requests
    FOR SELECT TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_leave_insert ON public.leave_requests;
CREATE POLICY p_leave_insert ON public.leave_requests
    FOR INSERT TO authenticated
    WITH CHECK (public.is_same_employee(employee_id) OR public.is_admin());

DROP POLICY IF EXISTS p_leave_update ON public.leave_requests;
CREATE POLICY p_leave_update ON public.leave_requests
    FOR UPDATE TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_leave_delete ON public.leave_requests;
CREATE POLICY p_leave_delete ON public.leave_requests
    FOR DELETE TO authenticated
    USING ((public.is_same_employee(employee_id) AND status = 'Pending') OR public.is_admin());
