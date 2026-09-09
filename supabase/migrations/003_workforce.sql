-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 003_workforce.sql
-- Module: Workforce, Auth Profiles, Roles, Shifts, Attendance & Leave
-- ==============================================================================

-- 1. ROLES (ERP Role Hierarchy)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SALES', 'PURCHASE', 'STORES', 'SERVICE', 'OPERATOR'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERMISSIONS (Granular Capability Flags)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'read', 'create', 'update', 'delete', 'approve', 'export'
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'production.work_orders.approve'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROLE_PERMISSIONS (Junction Table)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. USER PROFILES (1:1 Extension for Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SHIFTS (Shift A Morning, Shift B Evening, Night Shift)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    shift_code VARCHAR(30) UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_mins INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EMPLOYEES (Precision Workforce Master)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'GPS-EMP-101'
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(50),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    designation VARCHAR(150) NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    current_shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    date_of_joining DATE DEFAULT CURRENT_DATE,
    current_status VARCHAR(50) DEFAULT 'Available' CHECK (current_status IN ('Working', 'Break', 'Available', 'Completed', 'Idle', 'Overtime', 'Leave', 'Offline')),
    avatar_color VARCHAR(20) DEFAULT '#7A1F3D',
    skills TEXT[],
    qualifications TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from departments.head_of_department_id to employees
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_dept_head' AND table_name = 'departments'
    ) THEN
        ALTER TABLE public.departments 
        ADD CONSTRAINT fk_dept_head 
        FOREIGN KEY (head_of_department_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. EMPLOYEE_ROLES (Multi-Role Assignment Junction)
CREATE TABLE IF NOT EXISTS public.employee_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, role_id)
);

-- 8. ATTENDANCE (Daily Clock-in / Out Tracking)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Half Day', 'Absent', 'On Duty', 'Weekly Off', 'Holiday')),
    total_hours NUMERIC(5, 2) DEFAULT 0,
    overtime_hours NUMERIC(5, 2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, date)
);

-- 9. LEAVE_REQUESTS (Leave Management & Approvals)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('Casual Leave', 'Sick Leave', 'Privilege Leave', 'Unpaid Leave', 'Compensatory Off')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 1) NOT NULL CHECK (total_days > 0),
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for workforce queries
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(current_status);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_emp_status ON public.leave_requests(employee_id, status);
