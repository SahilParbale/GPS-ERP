-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 015_security_helpers.sql
-- Module: Row Level Security Helper Functions & Privilege Escalation Triggers
-- ==============================================================================

-- 1. Get Current Profile ID (auth.uid wrapper)
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid();
$$;

-- 2. Get Current Employee ID
-- Resolves the employee record linked to the authenticated user via profile_id or email
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT e.id
    FROM public.employees e
    WHERE e.profile_id = auth.uid()
       OR e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    LIMIT 1;
$$;

-- 3. Get Current User Roles
-- Retrieves all role codes assigned to the active user across profiles, employees, and employee_roles
CREATE OR REPLACE FUNCTION public.get_current_user_roles()
RETURNS TABLE(role_code VARCHAR(50))
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Check role directly on user profile
    SELECT r.code
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    UNION
    -- Check primary role on linked employee record
    SELECT r.code
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.id
    WHERE e.profile_id = auth.uid()
       OR e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    UNION
    -- Check multi-role junction table (employee_roles)
    SELECT r.code
    FROM public.employees e
    JOIN public.employee_roles er ON e.id = er.employee_id
    JOIN public.roles r ON er.role_id = r.id
    WHERE e.profile_id = auth.uid()
       OR e.email = (SELECT email FROM auth.users WHERE id = auth.uid());
$$;

-- 4. Has Specific Role Check
CREATE OR REPLACE FUNCTION public.has_role(required_role VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.get_current_user_roles() WHERE role_code = required_role
    );
$$;

-- 5. Has Any Role Check (Variadic)
CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC required_roles VARCHAR(50)[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.get_current_user_roles() WHERE role_code = ANY(required_roles)
    );
$$;

-- 6. Is Administrator Check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role('ADMIN');
$$;

-- 7. Is Management Check (Admin or Executive Management)
CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_any_role('ADMIN', 'MANAGEMENT');
$$;

-- 8. Is Same Employee Check (Ownership evaluation)
CREATE OR REPLACE FUNCTION public.is_same_employee(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT check_employee_id IS NOT NULL 
       AND check_employee_id = public.get_current_employee_id();
$$;

-- 9. Has Permission Code Check
CREATE OR REPLACE FUNCTION public.has_permission(permission_code_check VARCHAR(100))
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin() OR EXISTS (
        SELECT 1
        FROM public.get_current_user_roles() ur
        JOIN public.roles r ON ur.role_code = r.code
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE p.code = permission_code_check
    );
$$;

-- 10. Privilege Escalation Defense: Profiles
-- Prevents ordinary authenticated users from altering role_id or user ID
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Only system administrators can modify profile roles.';
        END IF;
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Profile user identity is immutable.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 11. Privilege Escalation Defense: Employees
-- Prevents non-administrators from modifying authorization-sensitive employee fields
CREATE OR REPLACE FUNCTION public.prevent_employee_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Only administrators can reassign employee roles.';
        END IF;
        IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Employee badge codes are immutable.';
        END IF;
        IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Department transfers require administrative authorization.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_escalation ON public.employees;
CREATE TRIGGER trg_prevent_employee_escalation
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.prevent_employee_privilege_escalation();
