-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 014_seed_data.sql
-- Module: Production Seed Data (Preserving Real ERP Relational Chains)
-- ==============================================================================

-- 1. COMPANY SEED
INSERT INTO public.companies (id, code, name, legal_name, tax_id, gstin, email, phone, website, address, city, state, postal_code)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'GPS-CORP',
    'General Precision Spindles',
    'General Precision Spindles Private Limited',
    'AAACG1492K',
    '27AABCG1492K1Z8',
    'contact@gpspindles.com',
    '+91 20 6791 4200',
    'https://gpspindles.com',
    'Plot B-12, Nanded City Industrial Complex, Sinhagad Road',
    'Pune',
    'Maharashtra',
    '411041'
) ON CONFLICT (code) DO NOTHING;

-- 2. BRANCH SEED
INSERT INTO public.branches (id, company_id, code, name, branch_type, gstin, address, city, state, postal_code)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'PLANT-1',
    'Nanded City Plant 1 (HQ)',
    'Manufacturing Plant',
    '27AABCG1492K1Z8',
    'Plot B-12, Nanded City Industrial Complex, Pune - 411041',
    'Pune',
    'Maharashtra',
    '411041'
) ON CONFLICT (code) DO NOTHING;

-- 3. DEPARTMENTS SEED
INSERT INTO public.departments (id, code, name, branch_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'DEPT-PROD', 'Production Machining', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000002', 'DEPT-ASSY', 'Cleanroom Assembly', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000003', 'DEPT-QA', 'Metrology & QA', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000004', 'DEPT-SRV', 'Service & Rebuild', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000005', 'DEPT-COMM', 'Sales & Commercial', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000006', 'DEPT-SCM', 'Procurement & Stores', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 4. LOCATIONS SEED
INSERT INTO public.locations (code, name, location_type, branch_id) VALUES
('LOC-BAY1', 'Bay 1: Heavy Rough Turning', 'Shop Floor Bay', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY2', 'Bay 2: Studer CNC Grinding Cell', 'Shop Floor Bay', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY3', 'Bay 3: ISO Class 6 Cleanroom', 'Cleanroom', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY4', 'Bay 4: Schenck Dynamic Balancing Rig', 'Test Cell', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY5', 'Bay 5: 4-Hour Thermal Endurance Stand', 'Test Cell', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY6', 'Bay 6: Precision Air Gauge Metrology', 'Inspection Metrology Lab', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 5. ROLES SEED
INSERT INTO public.roles (id, code, name, description, is_system_role) VALUES
('11111111-0000-0000-0000-000000000001', 'ADMIN', 'Plant Admin & Operations', 'Full administrative authority', TRUE),
('11111111-0000-0000-0000-000000000002', 'MANAGEMENT', 'Executive Management', 'Executive dashboards and reporting', TRUE),
('11111111-0000-0000-0000-000000000003', 'PROD_MGR', 'Production Manager', 'Shop floor scheduling and travelers', TRUE),
('11111111-0000-0000-0000-000000000004', 'QA_MGR', 'Quality Assurance Manager', 'Metrology sign-off and certificates', TRUE),
('11111111-0000-0000-0000-000000000005', 'SALES', 'Commercial & Sales Lead', 'Quotes, PI, Invoices and E-Way Bills', TRUE),
('11111111-0000-0000-0000-000000000006', 'PURCHASE', 'Procurement Controller', 'Suppliers, Requisitions and POs', TRUE),
('11111111-0000-0000-0000-000000000007', 'STORES', 'Warehouse & Inventory Lead', 'Stock movements and bin management', TRUE),
('11111111-0000-0000-0000-000000000008', 'SERVICE', 'Service & Rebuild Lead', 'Spindle 9-stage restoration pipeline', TRUE),
('11111111-0000-0000-0000-000000000009', 'OPERATOR', 'Shop Floor Precision Technician', 'Machine routing and work logs', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 6. SHIFTS SEED
INSERT INTO public.shifts (id, name, shift_code, start_time, end_time, branch_id) VALUES
('22222222-0000-0000-0000-000000000001', 'Shift A (Morning)', 'SHIFT-A', '07:00:00', '15:30:00', 'b0000000-0000-0000-0000-000000000001'),
('22222222-0000-0000-0000-000000000002', 'Shift B (Evening)', 'SHIFT-B', '15:30:00', '00:00:00', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (shift_code) DO NOTHING;

-- 7. EMPLOYEES SEED
INSERT INTO public.employees (id, employee_code, first_name, last_name, email, phone, designation, department_id, current_status, avatar_color, skills) VALUES
('e0000000-0000-0000-0000-000000000101', 'GPS-EMP-101', 'Rahul', 'Patil', 'rahul.patil@gpspindles.com', '+91 98220 14921', 'Plant Head & Operations', 'd0000000-0000-0000-0000-000000000001', 'Working', '#7A1F3D', ARRAY['CNC Machining', 'Production Scheduling', 'Six Sigma']),
('e0000000-0000-0000-0000-000000000102', 'GPS-EMP-102', 'Milind', 'Joshi', 'milind.joshi@gpspindles.com', '+91 98220 14922', 'Quality Assurance Lead', 'd0000000-0000-0000-0000-000000000003', 'Working', '#7A1F3D', ARRAY['Air Gauging', 'ISO 1940 Balancing', 'CMM Metrology']),
('e0000000-0000-0000-0000-000000000103', 'GPS-EMP-103', 'Suresh', 'Sawant', 'suresh.sawant@gpspindles.com', '+91 98220 14923', 'Sr. Precision Grinder', 'd0000000-0000-0000-0000-000000000001', 'Working', '#7A1F3D', ARRAY['Studer S33 Grinding', 'Taper Journal Lapping', 'Sub-micron Runout']),
('e0000000-0000-0000-0000-000000000104', 'GPS-EMP-104', 'Vikram', 'Shinde', 'vikram.shinde@gpspindles.com', '+91 98220 14924', 'Cleanroom Assembly Lead', 'd0000000-0000-0000-0000-000000000002', 'Working', '#7A1F3D', ARRAY['Ceramic Bearings', 'Preload Clamping', 'Class 1000 Cleanroom']),
('e0000000-0000-0000-0000-000000000105', 'GPS-EMP-105', 'Dinesh', 'More', 'dinesh.more@gpspindles.com', '+91 98220 14925', 'Inventory & Stores Lead', 'd0000000-0000-0000-0000-000000000006', 'Available', '#7A1F3D', ARRAY['Warehouse ERP', 'Bin Kitting', 'FIFO Control']),
('e0000000-0000-0000-0000-000000000106', 'GPS-EMP-106', 'Shreyas', 'Nair', 'shreyas.nair@gpspindles.com', '+91 98220 14926', 'Commercial & Sales Desk', 'd0000000-0000-0000-0000-000000000005', 'Available', '#7A1F3D', ARRAY['Quotation Costing', 'GST E-Way Bills', 'Client SLA Management'])
ON CONFLICT (employee_code) DO NOTHING;

-- 8. PRODUCTION BAYS SEED
INSERT INTO public.production_bays (id, code, name, bay_type, cleanliness_class, branch_id) VALUES
('33333333-0000-0000-0000-000000000001', 'BAY-1', 'Bay 1: Heavy Rough Turning', 'Machining', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000002', 'BAY-2', 'Bay 2: Studer CNC Grinding Cell', 'Machining', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000003', 'BAY-3', 'Bay 3: ISO Class 6 Cleanroom', 'Cleanroom Assembly', 'ISO Class 6', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000004', 'BAY-4', 'Bay 4: Schenck Dynamic Balancing Rig', 'Balancing Rig', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000005', 'BAY-5', 'Bay 5: 4-Hour Thermal Endurance Stand', 'Test Cell', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000006', 'BAY-6', 'Bay 6: Precision Air Gauge Metrology', 'Metrology QC', 'ISO Class 7', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 9. MACHINES SEED
INSERT INTO public.machines (id, bay_id, code, name, manufacturer, model_number, machine_type, precision_tolerance_microns, status) VALUES
('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'CNC-03', 'Doosan Puma 2600Y CNC Lathe', 'Doosan Machine Tools', 'Puma 2600Y', 'CNC Lathe', 1.5, 'Operating'),
('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'Studer S33', 'Studer S33 CNC Cylindrical Grinder', 'Fritz Studer AG', 'S33', 'CNC Cylindrical Grinder', 0.5, 'Operating'),
('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004', 'Schenck Rig-01', 'Schenck SmartBalancing Rig G0.4', 'Schenck RoTec GmbH', 'SmartBalance 2', 'Dynamic Balancing Stand', 0.2, 'Operating'),
('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000005', 'Test Stand 01', 'High-Speed Automated Test Stand', 'GPS Engineering', 'TS-24K', 'High-Speed Test Stand', 0.5, 'Operating'),
('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000006', 'QC-02', 'Mahr Federal Air Collet Taper Probe', 'Mahr Metrology', 'Federal Dimensionair', 'Air Metrology Gauge', 0.1, 'Operating')
ON CONFLICT (code) DO NOTHING;

-- 10. PRODUCTION OPERATIONS SEED
INSERT INTO public.production_operations (code, name, stage, default_bay_id, default_machine_id, standard_time_mins) VALUES
('OP-MATERIAL', 'Material Bar Stock Sawing & Inspection', 'Material', '33333333-0000-0000-0000-000000000001', NULL, 45),
('OP-ROUGH-TURN', 'Rough CNC Shaft Turning & Boring', 'Machining', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 120),
('OP-GRIND-TAPER', 'Studer Sub-Micron Taper & Bearing Grinding', 'Grinding', '33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002', 150),
('OP-ASSY-CLEAN', 'Class 1000 Cleanroom Bearing Assembly', 'Assembly', '33333333-0000-0000-0000-000000000003', NULL, 180),
('OP-BAL-G04', 'Dual-Plane Dynamic Balancing (ISO G0.4)', 'Balancing', '33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 90),
('OP-TEST-RUN', '4-Hour Thermal Run-In & Vibration Test', 'Testing', '33333333-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000004', 240),
('OP-QC-AIR', 'Final Air Gauging & Runout Certification', 'QC', '33333333-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000005', 60),
('OP-DISPATCH-PACK', 'Anti-Corrosion Crate Packaging & Desiccant Seal', 'Dispatch', '33333333-0000-0000-0000-000000000001', NULL, 60)
ON CONFLICT (code) DO NOTHING;

-- 11. SPINDLE MODELS SEED
INSERT INTO public.spindle_models (id, model_code, model_name, spindle_type, taper_standard, max_rpm, rated_power_kw, nominal_torque_nm, runout_taper_microns) VALUES
('55555555-0000-0000-0000-000000000063', 'GPS-HSK-A63', 'GPS Motorized High-Speed Spindle (24k)', 'Motorized Built-in', 'HSK-A63', 24000, 15.0, 32.0, 0.8),
('55555555-0000-0000-0000-000000000040', 'GPS-BT40', 'GPS Precision Machining Spindle (15k)', 'Belt Driven', 'BT40', 15000, 11.0, 48.0, 1.0),
('55555555-0000-0000-0000-000000000060', 'GPS-HF-60K', 'GPS Ultra High-Frequency PCB/Die Spindle', 'High Frequency', 'HSK-E25', 60000, 5.5, 4.2, 0.5),
('55555555-0000-0000-0000-000000000050', 'GPS-BT50', 'GPS Heavy Duty Geared Milling Spindle', 'Direct Drive', 'BT50', 8000, 22.0, 95.0, 1.2)
ON CONFLICT (model_code) DO NOTHING;

-- 12. CUSTOMERS SEED
INSERT INTO public.customers (id, customer_code, company_name, gstin, billing_address, state, primary_contact_name, primary_email, industry_segment) VALUES
('66666666-0000-0000-0000-000000000001', 'CUST-TATA', 'Tata Advanced Systems Ltd', '36AAACT2718E1ZQ', 'Aerospace SEZ, Adibatla, Hyderabad, Telangana 501510', 'Telangana', 'Naveen Reddy', 'procurement@tataadvanced.com', 'Aerospace Defense'),
('66666666-0000-0000-0000-000000000002', 'CUST-BFORGE', 'Bharat Forge Limited', '27AAACB0565F1ZS', 'Mundhwa Industrial Area, Pune, Maharashtra 411036', 'Maharashtra', 'Amit Kulkarni', 'spindle.maintenance@bharatforge.com', 'Automotive OEM'),
('66666666-0000-0000-0000-000000000003', 'CUST-LINAMAR', 'Linamar India Private Limited', '23AACCL5351J1ZM', 'Survey No. 332/3, Industrial Area-3, Dewas, MP 455001', 'Madhya Pradesh', 'Rajesh Verma', 'accounts@linamar.com', 'Precision Tooling'),
('66666666-0000-0000-0000-000000000004', 'CUST-KOEL', 'Kirloskar Oil Engines Ltd', '27AAACK1422G1ZZ', 'Laxmanrao Kirloskar Road, Khadki, Pune 411003', 'Maharashtra', 'Sunil Joshi', 'maintenance@kirloskar.com', 'Heavy Engineering')
ON CONFLICT (customer_code) DO NOTHING;

-- 13. CUSTOMER CONTACTS SEED
INSERT INTO public.customer_contacts (customer_id, name, email, phone, designation, department, is_primary, is_default_cc) VALUES
('66666666-0000-0000-0000-000000000001', 'Naveen Reddy', 'naveen.reddy@tataadvanced.com', '+91 94401 23456', 'Head of Procurement', 'Procurement', TRUE, FALSE),
('66666666-0000-0000-0000-000000000001', 'K. Venkat', 'k.venkat@tataadvanced.com', '+91 94401 23457', 'Finance Accounts Lead', 'Accounts', FALSE, TRUE),
('66666666-0000-0000-0000-000000000002', 'Amit Kulkarni', 'amit.kulkarni@bharatforge.com', '+91 98221 54321', 'Sr. Manager Spindle Cell', 'Plant Maintenance', TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- 14. SUPPLIERS SEED
INSERT INTO public.suppliers (id, supplier_code, name, contact_person, email, phone, payment_terms) VALUES
('77777777-0000-0000-0000-000000000001', 'SUP-SCHAEFFLER', 'Schaeffler India Limited (FAG Spindle Bearings)', 'Markus Weber', 'orders.precision@schaeffler.com', '+91 20 6608 4000', 'Net 30 Days'),
('77777777-0000-0000-0000-000000000002', 'SUP-JAKOB', 'OTT-Jakob Spanntechnik GmbH', 'Klaus Mueller', 'sales@ott-jakob.de', '+49 8333 9204-0', 'Advance Wire'),
('77777777-0000-0000-0000-000000000003', 'SUP-LENORD', 'Lenord+Bauer Precision Encoders', 'Hans Schmidt', 'support@lenord.de', '+49 208 9963-0', 'Net 45 Days')
ON CONFLICT (supplier_code) DO NOTHING;

-- 15. SPINDLES SEED (Physical Fleet Registry)
INSERT INTO public.spindles (id, serial_number, model_id, customer_id, customer_name, spindle_type, max_rpm, power_kw, taper_interface, status, current_stage, max_runout_measured_microns, vibration_overall_velocity_mms, thermal_rise_stabilized_celsius, clamping_force_measured_kn, qr_code) VALUES
('88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', '55555555-0000-0000-0000-000000000063', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'Motorized Built-in', 24000, 15.0, 'HSK-A63', 'Testing', 'Testing', 0.6, 0.42, 23.8, 18.2, 'GPS-2026-0842-HSK-A63-TASL'),
('88888888-0000-0000-0000-000000000841', 'GPS-2026-0841', '55555555-0000-0000-0000-000000000040', '66666666-0000-0000-0000-000000000002', 'Bharat Forge Limited', 'Belt Driven', 15000, 11.0, 'BT40', 'QC Passed', 'QC', 0.5, 0.38, 22.5, 12.2, 'GPS-2026-0841-BT40-BFL'),
('88888888-0000-0000-0000-000000000840', 'GPS-2026-0840', '55555555-0000-0000-0000-000000000060', '66666666-0000-0000-0000-000000000003', 'Linamar India Pvt Ltd', 'High Frequency', 60000, 5.5, 'HSK-E25', 'In Production', 'Machining', 0.8, 0.48, 24.1, 4.8, 'GPS-2026-0840-HF60K-LINAMAR')
ON CONFLICT (serial_number) DO NOTHING;

-- 16. DIGITAL TWINS SEED
INSERT INTO public.digital_twins (spindle_id, spindle_serial, operating_hours, current_rpm, bearing_front_temp_celsius, bearing_rear_temp_celsius, stator_temp_celsius, vibration_x_axis_mms, vibration_y_axis_mms, air_purge_pressure_bar, coolant_flow_rate_lpm, health_score_percent, telemetry_status) VALUES
('88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', 1240.5, 24000, 23.8, 22.1, 25.4, 0.26, 0.28, 2.5, 4.2, 98, 'Normal'),
('88888888-0000-0000-0000-000000000841', 'GPS-2026-0841', 2860.0, 15000, 22.5, 21.0, 24.0, 0.24, 0.27, 2.4, 3.8, 95, 'Normal')
ON CONFLICT (spindle_id) DO NOTHING;

-- 17. WORK ORDERS SEED
INSERT INTO public.work_orders (id, work_order_no, spindle_id, model_id, customer_id, customer_name, priority, current_stage, progress_percentage, assigned_bay_id, assigned_machine_id, lead_technician_id, planned_start_date, target_delivery_date, status) VALUES
('99999999-0000-0000-0000-000000000148', 'WO-2026-0148', '88888888-0000-0000-0000-000000000842', '55555555-0000-0000-0000-000000000063', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'High', 'Shaft Turning', 65, '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000101', '2026-02-18', '2026-03-15', 'In Progress'),
('99999999-0000-0000-0000-000000000147', 'WO-2026-0147', '88888888-0000-0000-0000-000000000841', '55555555-0000-0000-0000-000000000040', '66666666-0000-0000-0000-000000000002', 'Bharat Forge Limited', 'Medium', 'Cleanroom Assembly', 85, '33333333-0000-0000-0000-000000000003', NULL, 'e0000000-0000-0000-0000-000000000104', '2026-02-14', '2026-03-10', 'In Progress'),
('99999999-0000-0000-0000-000000000146', 'WO-2026-0146', '88888888-0000-0000-0000-000000000840', '55555555-0000-0000-0000-000000000060', '66666666-0000-0000-0000-000000000003', 'Linamar India Pvt Ltd', 'Critical', 'Dynamic Balancing', 92, '33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000102', '2026-02-10', '2026-03-08', 'In Progress')
ON CONFLICT (work_order_no) DO NOTHING;

-- 18. WORK ORDER ITEMS SEED
INSERT INTO public.work_order_items (work_order_id, sequence_no, step_name, bay_id, machine_id, assigned_employee_id, estimated_mins, actual_mins, status, qc_sign_off) VALUES
('99999999-0000-0000-0000-000000000148', 1, 'Material Bar Stock Inspection & Sawing', '33333333-0000-0000-0000-000000000001', NULL, 'e0000000-0000-0000-0000-000000000101', 45, 40, 'Completed', TRUE),
('99999999-0000-0000-0000-000000000148', 2, 'CNC Rough Shaft Turning & Center Bore', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000101', 120, 115, 'Completed', TRUE),
('99999999-0000-0000-0000-000000000148', 3, 'Studer S33 Sub-Micron Taper Grinding', '33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000103', 150, 140, 'In Progress', FALSE)
ON CONFLICT DO NOTHING;

-- 19. EMPLOYEE WORK LOGS SEED
INSERT INTO public.work_logs (employee_id, date, period, start_time, end_time, duration_mins, work_type, task_name, work_order_id, work_order_no, spindle_id, spindle_serial, machine_id, machine_name, production_bay_id, bay_name, quantity_completed, progress_percentage, status, remarks) VALUES
('e0000000-0000-0000-0000-000000000101', '2026-03-08', 'Shift A', '2026-03-08 07:30:00+05:30', '2026-03-08 10:00:00+05:30', 150, 'Rough Turning', 'Rough turning of main spindle shaft', '99999999-0000-0000-0000-000000000148', 'WO-2026-0148', '88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', '44444444-0000-0000-0000-000000000001', 'CNC-03 (Doosan Puma)', '33333333-0000-0000-0000-000000000001', 'Bay 1', 1, 65, 'Completed', 'Passes initial dimensional and concentricity checks'),
('e0000000-0000-0000-0000-000000000103', '2026-03-08', 'Shift A', '2026-03-08 10:30:00+05:30', '2026-03-08 13:30:00+05:30', 180, 'CNC Grinding', 'Precision taper grinding finish pass', '99999999-0000-0000-0000-000000000148', 'WO-2026-0148', '88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', '44444444-0000-0000-0000-000000000002', 'Studer S33 Grinder', '33333333-0000-0000-0000-000000000002', 'Bay 2', 1, 80, 'Completed', 'Taper runout holding steady at 0.6 microns'),
('e0000000-0000-0000-0000-000000000104', '2026-03-08', 'Shift A', '2026-03-08 08:00:00+05:30', '2026-03-08 10:00:00+05:30', 120, 'Cleanroom Assembly', 'Ceramic hybrid bearing pair installation in Class 1000 cleanroom', '99999999-0000-0000-0000-000000000147', 'WO-2026-0147', '88888888-0000-0000-0000-000000000841', 'GPS-2026-0841', NULL, 'Manual Precision Press', '33333333-0000-0000-0000-000000000003', 'Bay 3', 1, 85, 'Completed', 'Preload adjusted to 1.2 kN spec')
ON CONFLICT DO NOTHING;

-- 20. COMMERCIAL PIPELINE SEED (TASL Full Commercial Relationship)
-- 20A. Quotation
INSERT INTO public.quotations (id, quotation_number, customer_id, customer_name, customer_address, customer_gstin, place_of_supply, scope_of_work, subtotal, cgst_amount, sgst_amount, total_amount, status) VALUES
('aaaaaaaa-0000-0000-0000-000000000294', 'QTN/2026-27/294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'Aerospace SEZ, Adibatla, Hyderabad', '36AAACT2718E1ZQ', 'Telangana (36)', 'Complete rebuild & high-speed balancing of 24k HSK-A63 motorized spindle', 842000.00, 75780.00, 75780.00, 993560.00, 'Approved')
ON CONFLICT (quotation_number) DO NOTHING;

-- 20B. Sales Order
INSERT INTO public.sales_orders (id, sales_order_no, quotation_id, customer_id, customer_name, customer_po_reference, subtotal, cgst_amount, sgst_amount, total_amount, status) VALUES
('bbbbbbbb-0000-0000-0000-000000000041', 'SO-2026-041', 'aaaaaaaa-0000-0000-0000-000000000294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'PO-TASL-2026-8812', 842000.00, 75780.00, 75780.00, 993560.00, 'In Production')
ON CONFLICT (sales_order_no) DO NOTHING;

-- 20C. Proforma Invoice
INSERT INTO public.proforma_invoices (id, pi_number, sales_order_id, quotation_id, customer_id, customer_name, customer_email, subtotal, cgst_amount, sgst_amount, total_amount, advance_received, status) VALUES
('cccccccc-0000-0000-0000-000000000041', 'PI-2026-0041', 'bbbbbbbb-0000-0000-0000-000000000041', 'aaaaaaaa-0000-0000-0000-000000000294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'procurement@tataadvanced.com', 842000.00, 75780.00, 75780.00, 993560.00, 496780.00, 'Advance Paid'),
('cccccccc-0000-0000-0000-000000000018', 'PI-2026-018', 'bbbbbbbb-0000-0000-0000-000000000041', 'aaaaaaaa-0000-0000-0000-000000000294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'procurement@tataadvanced.com', 842000.00, 75780.00, 75780.00, 993560.00, 496780.00, 'Converted to Tax Invoice')
ON CONFLICT (pi_number) DO NOTHING;

-- 20D. Tax Invoice
INSERT INTO public.invoices (id, invoice_number, sales_order_id, proforma_invoice_id, customer_id, customer_name, customer_gstin, billing_address, subtotal, cgst_amount, sgst_amount, total_amount, paid_amount, status) VALUES
('dddddddd-0000-0000-0000-000000000019', 'INV-2026-019', 'bbbbbbbb-0000-0000-0000-000000000041', 'cccccccc-0000-0000-0000-000000000018', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', '36AAACT2718E1ZQ', 'Aerospace SEZ, Adibatla, Hyderabad', 842000.00, 75780.00, 75780.00, 993560.00, 496780.00, 'Pending Payment')
ON CONFLICT (invoice_number) DO NOTHING;

-- 20E. E-Way Bill
INSERT INTO public.eway_bills (id, ewb_number, invoice_id, invoice_number, customer_id, customer_name, customer_gstin, vehicle_number, transporter_name, distance_km, valid_until, total_invoice_value, status) VALUES
('eeeeeeee-0000-0000-0000-000000000042', '2418 9032 1198', 'dddddddd-0000-0000-0000-000000000019', 'INV-2026-019', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', '36AAACT2718E1ZQ', 'MH12AB1234', 'VRL Logistics Ltd', 540, NOW() + INTERVAL '2 days', 993560.00, 'Active')
ON CONFLICT (ewb_number) DO NOTHING;

-- 21. PROCUREMENT PIPELINE SEED
INSERT INTO public.purchase_orders (id, po_number, supplier_id, supplier_name, supplier_email, total_amount, status) VALUES
('ffffffff-0000-0000-0000-000000000087', 'PO-2026-0087', '77777777-0000-0000-0000-000000000001', 'Schaeffler India Limited (FAG Spindle Bearings)', 'orders.precision@schaeffler.com', 485000.00, 'Approved'),
('ffffffff-0000-0000-0000-000000000086', 'PO-2026-0086', '77777777-0000-0000-0000-000000000002', 'OTT-Jakob Spanntechnik GmbH', 'sales@ott-jakob.de', 320000.00, 'Sent')
ON CONFLICT (po_number) DO NOTHING;

-- 22. INVENTORY WAREHOUSES & PRODUCTS SEED
INSERT INTO public.product_categories (id, code, name) VALUES
('10101010-0000-0000-0000-000000000001', 'BEARINGS', 'Precision Spindle Bearings'),
('10101010-0000-0000-0000-000000000002', 'GRIPPERS', 'Drawbar Clamping Grippers'),
('10101010-0000-0000-0000-000000000003', 'ENCODERS', 'Speed & Angular Position Encoders')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.products (id, category_id, part_number, sku, name, unit_cost_inr, preferred_supplier_id) VALUES
('20202020-0000-0000-0000-000000000001', '10101010-0000-0000-0000-000000000001', 'FAG-HC7008-EDLR', 'SKU-BRG-001', 'FAG High-Speed Hybrid Ceramic Bearing HC7008', 42500.00, '77777777-0000-0000-0000-000000000001'),
('20202020-0000-0000-0000-000000000002', '10101010-0000-0000-0000-000000000002', 'OTT-JAKOB-95.600', 'SKU-GRP-002', 'OTT-Jakob Power Drawbar Collet Gripper HSK-A63', 34000.00, '77777777-0000-0000-0000-000000000002'),
('20202020-0000-0000-0000-000000000003', '10101010-0000-0000-0000-000000000003', 'LENORD-GEL-2444', 'SKU-ENC-003', 'Lenord+Bauer Mini-Coder High-Speed Spindle Encoder', 28500.00, '77777777-0000-0000-0000-000000000003')
ON CONFLICT (part_number) DO NOTHING;

INSERT INTO public.warehouses (id, branch_id, code, name, warehouse_type) VALUES
('30303030-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'STORES-CENTRAL', 'Central Stores & Raw Material Yard', 'General Stores'),
('30303030-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'BOM-KIT-BAY3', 'Cleanroom Kitting Store', 'Cleanroom Kitting')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.stock (product_id, warehouse_id, bin_location, quantity_on_hand, quantity_reserved) VALUES
('20202020-0000-0000-0000-000000000001', '30303030-0000-0000-0000-000000000002', 'BIN-CR-01', 48, 6),
('20202020-0000-0000-0000-000000000002', '30303030-0000-0000-0000-000000000001', 'RACK-B-04', 18, 2),
('20202020-0000-0000-0000-000000000003', '30303030-0000-0000-0000-000000000001', 'RACK-E-02', 12, 1)
ON CONFLICT (product_id, warehouse_id, bin_location) DO NOTHING;

-- 23. QUALITY INSPECTIONS SEED
INSERT INTO public.inspections (id, inspection_number, spindle_id, work_order_id, inspection_type, inspector_id, overall_result) VALUES
('40404040-0000-0000-0000-000000000412', 'QC-2026-0412', '88888888-0000-0000-0000-000000000842', '99999999-0000-0000-0000-000000000148', 'Final Metrology QA', 'e0000000-0000-0000-0000-000000000102', 'Pass')
ON CONFLICT (inspection_number) DO NOTHING;

INSERT INTO public.inspection_results (inspection_id, parameter_name, nominal_value, tolerance_min, tolerance_max, measured_value, unit_of_measure, result_status) VALUES
('40404040-0000-0000-0000-000000000412', 'Nose Taper Dynamic Runout', 0.0008, 0.0, 0.0010, 0.0006, 'µm', 'Pass'),
('40404040-0000-0000-0000-000000000412', 'Dynamic Balancing (ISO 1940)', 0.40, 0.0, 0.40, 0.28, 'ISO G', 'Pass'),
('40404040-0000-0000-0000-000000000412', '4-Hour Stabilized Thermal Rise', 20.0, 0.0, 25.0, 14.2, '°C', 'Pass')
ON CONFLICT DO NOTHING;

-- 24. LOGISTICS SEED
INSERT INTO public.transporters (id, code, name, contact_person, phone, rating) VALUES
('50505050-0000-0000-0000-000000000001', 'TRP-VRL', 'VRL Logistics Ltd', 'Santosh Pawar', '+91 98224 55112', 4.8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.vehicles (id, transporter_id, vehicle_number, driver_name, driver_phone) VALUES
('60606060-0000-0000-0000-000000000001', '50505050-0000-0000-0000-000000000001', 'MH12AB1234', 'Ramesh Yadav', '+91 97654 32109')
ON CONFLICT (vehicle_number) DO NOTHING;

INSERT INTO public.dispatches (dispatch_number, invoice_id, eway_bill_id, transporter_id, vehicle_id, customer_id, destination, status) VALUES
('DSP-2026-0091', 'dddddddd-0000-0000-0000-000000000019', 'eeeeeeee-0000-0000-0000-000000000042', '50505050-0000-0000-0000-000000000001', '60606060-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Aerospace SEZ, Adibatla, Hyderabad', 'In Transit')
ON CONFLICT (dispatch_number) DO NOTHING;
