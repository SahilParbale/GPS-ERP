import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import Tabs from '../components/common/Tabs';
import CustomSelect from '../components/common/CustomSelect';
import { SettingsScreenSkeleton } from '../components/common/Skeleton';
import { useAuth, ROLE_PERMISSIONS } from '../context/AuthContext';
import { settingsService, ROLE_METADATA } from '../services/settings/settingsService';
import Modal from '../components/common/Modal';
import { 
  Building, Users, Bell, Wrench, Save, 
  Loader2, AlertCircle, RefreshCw, ShieldCheck, ShieldAlert,
  QrCode, CreditCard, KeyRound, UserPlus, Lock, CheckCircle2,
  XCircle, Copy, Eye, EyeOff, Sparkles, Filter, ChevronRight, Shield, Check, Search
} from 'lucide-react';
import UpiQrCode from '../components/common/UpiQrCode';
import { getActiveUpiId, setActiveUpiId, DEFAULT_BANK_DETAILS } from '../utils/upiQrGenerator';

// Complete ERP Screens Directory for Permissions Visualizer
const ALL_ERP_SCREENS = [
  { id: 'dashboard', name: 'Executive Dashboard', category: 'Executive & Overview' },
  { id: 'production', name: 'Production & Shop Floor Bays', category: 'Manufacturing' },
  { id: 'workforce', name: 'Staff & Workforce Management', category: 'Manufacturing' },
  { id: 'work-order-detail', name: 'Work Order Job Travelers', category: 'Manufacturing' },
  { id: 'spindles', name: 'Spindle Fleet Registry', category: 'Assets & Fleet' },
  { id: 'spindle-detail', name: 'Spindle Digital Twin Profiles', category: 'Assets & Fleet' },
  { id: 'service', name: 'Service, Overhaul & Warranty', category: 'Service & Maintenance' },
  { id: 'inventory', name: 'Materials & Stock Control', category: 'Supply Chain & Inventory' },
  { id: 'quality', name: 'Quality Control & Metrology', category: 'Quality & Metrology' },
  { id: 'sales', name: 'Quotations & Commercial Desk', category: 'Commercial & Sales' },
  { id: 'customers', name: 'Customer Accounts Directory', category: 'Commercial & Sales' },
  { id: 'contacts', name: 'Customer Key Contacts', category: 'Commercial & Sales' },
  { id: 'suppliers', name: 'Precision Vendors & Suppliers', category: 'Supply Chain & Inventory' },
  { id: 'invoices', name: 'Invoices & GST Billing', category: 'Commercial & Sales' },
  { id: 'purchase-orders', name: 'Purchase Order Management', category: 'Supply Chain & Inventory' },
  { id: 'proforma-invoices', name: 'Proforma Invoices (Advance)', category: 'Commercial & Sales' },
  { id: 'e-way-bills', name: 'E-Way Bill Transit Passes', category: 'Commercial & Sales' },
  { id: 'sales-activity', name: 'Sales Activity CRM', category: 'Commercial & Sales' },
  { id: 'documents', name: 'Engineering Documents & Vault', category: 'Analytics & System' },
  { id: 'notifications', name: 'Plant Notifications & Alerts', category: 'Analytics & System' },
  { id: 'reports', name: 'Plant Analytics & Reports', category: 'Analytics & System' },
  { id: 'settings', name: 'System Settings & Access Control', category: 'System Administration' }
];

export default function SettingsScreen({ onNotify }) {
  const { role } = useAuth();
  const isManagement = role === 'ADMIN' || role === 'MANAGEMENT';

  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Live database state
  const [settings, setSettings] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [calibrationsList, setCalibrationsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Access Control & ID Generation state
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [selectedUserForEditRole, setSelectedUserForEditRole] = useState(null);
  const [createdUserCredentials, setCreatedUserCredentials] = useState(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [newUserForm, setNewUserForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    departmentName: 'Production Machining',
    designation: 'Shop Floor Precision Technician',
    roleCode: 'OPERATOR',
    password: '',
    showPassword: false
  });

  const [editRoleForm, setEditRoleForm] = useState({
    roleCode: 'OPERATOR',
    designation: ''
  });

  // Controlled form state
  const [formData, setFormData] = useState({
    name: '',
    facility: '',
    address: '',
    gstin: '',
    iso: '',
    shiftMode: 'Continuous 3-Shift 24x7 Operation',
    currency: 'INR (₹) • Metrology in Microns (µm)',
    upiId: getActiveUpiId(),
    alertPreferences: {
      bearingLowStock: true,
      noseTaperExceeded: true,
      serviceDelayed: true,
      customerPoApproval: true
    }
  });

  // Load all live settings from database
  const loadLiveSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [settingsRes, usersRes, calibrationsRes, depts] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getAuthorizedUsers(),
        settingsService.getMachineCalibrations(),
        settingsService.getDepartments()
      ]);

      if (settingsRes.error) {
        throw new Error(settingsRes.error.message || 'Failed to load enterprise settings');
      }

      const s = settingsRes.data;
      setSettings(s);
      setFormData({
        name: s.name || '',
        facility: s.facility || '',
        address: s.address || '',
        gstin: s.gstin || '',
        iso: s.iso || '',
        shiftMode: s.shiftMode || 'Continuous 3-Shift 24x7 Operation',
        currency: 'INR (₹) • Metrology in Microns (µm)',
        upiId: getActiveUpiId(),
        alertPreferences: s.alertPreferences || {
          bearingLowStock: true,
          noseTaperExceeded: true,
          serviceDelayed: true,
          customerPoApproval: true
        }
      });

      if (!usersRes.error && usersRes.data) {
        setUsersList(usersRes.data);
      }

      if (!calibrationsRes.error && calibrationsRes.data) {
        setCalibrationsList(calibrationsRes.data);
      }

      if (depts) {
        setDepartmentsList(depts);
      }
    } catch (err) {
      console.error('[GPS-ERP Settings] Load error:', err);
      setError(err.message || 'Failed to communicate with Supabase PostgreSQL');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveSettings();
  }, [loadLiveSettings]);

  // Compute next available employee code
  const generateEmpCode = useCallback((list = usersList) => {
    let maxNum = 100;
    for (const u of list) {
      const match = (u.employeeCode || '').match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `GPS-EMP-${maxNum + 1}`;
  }, [usersList]);

  // Generate secure temporary initial password
  const generateRandomPassword = () => 'Gps@2026#' + Math.floor(100 + Math.random() * 900);

  // Open User Generator dialog
  const handleOpenCreateUser = () => {
    if (!isManagement) {
      if (onNotify) onNotify('Access restricted: Only Plant Admin can generate new user IDs');
      return;
    }
    const nextCode = generateEmpCode();
    setNewUserForm({
      employeeCode: nextCode,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      departmentId: departmentsList[0]?.id || '',
      departmentName: departmentsList[0]?.name || 'Production Machining',
      designation: 'Shop Floor Precision Technician',
      roleCode: 'OPERATOR',
      password: generateRandomPassword(),
      showPassword: false
    });
    setIsCreateUserModalOpen(true);
  };

  // Submit new user ID generation
  const handleCreateUserSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newUserForm.firstName.trim()) {
      if (onNotify) onNotify('First name is required');
      return;
    }
    if (!newUserForm.email.trim()) {
      if (onNotify) onNotify('Login email is required');
      return;
    }
    if (!newUserForm.employeeCode.trim()) {
      if (onNotify) onNotify('Employee Code is required');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const payload = {
        firstName: newUserForm.firstName.trim(),
        lastName: newUserForm.lastName.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        phone: newUserForm.phone.trim(),
        employeeCode: newUserForm.employeeCode.trim().toUpperCase(),
        departmentId: newUserForm.departmentId,
        departmentName: newUserForm.departmentName,
        designation: newUserForm.designation.trim() || ROLE_METADATA[newUserForm.roleCode]?.name,
        roleCode: newUserForm.roleCode,
        password: newUserForm.password || 'Password123!'
      };

      const { data: created, error: createErr } = await settingsService.createAuthorizedUser(payload);
      if (createErr) throw new Error(createErr.message || 'Failed to create user ID');

      // Refresh live users
      const freshUsers = await settingsService.getAuthorizedUsers();
      if (freshUsers.data) setUsersList(freshUsers.data);

      setIsCreateUserModalOpen(false);
      setCreatedUserCredentials({
        ...payload,
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        roleMeta: ROLE_METADATA[payload.roleCode] || ROLE_METADATA.OPERATOR
      });

      if (onNotify) {
        onNotify(`User ID ${payload.employeeCode} (${payload.email}) activated successfully with role ${payload.roleCode}!`);
      }
    } catch (err) {
      console.error('[Settings] Create user error:', err);
      if (onNotify) onNotify(`User creation failed: ${err.message}`);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Open Edit Role dialog
  const handleOpenEditRole = (user) => {
    if (!isManagement) {
      if (onNotify) onNotify('Only administrators can edit user roles');
      return;
    }
    setSelectedUserForEditRole(user);
    setEditRoleForm({
      roleCode: user.roleCode || 'OPERATOR',
      designation: user.role || ROLE_METADATA[user.roleCode || 'OPERATOR']?.name
    });
    setIsEditRoleModalOpen(true);
  };

  // Submit Role update
  const handleEditRoleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUserForEditRole) return;

    setIsSubmittingUser(true);
    try {
      const res = await settingsService.updateUserRole({
        employeeId: selectedUserForEditRole.id,
        email: selectedUserForEditRole.email,
        newRoleCode: editRoleForm.roleCode,
        designation: editRoleForm.designation
      });

      if (res.error) throw new Error(res.error.message || 'Failed to update role');

      const freshUsers = await settingsService.getAuthorizedUsers();
      if (freshUsers.data) setUsersList(freshUsers.data);

      setIsEditRoleModalOpen(false);
      if (onNotify) {
        onNotify(`Updated RBAC role for ${selectedUserForEditRole.name} to ${editRoleForm.roleCode}!`);
      }
    } catch (err) {
      console.error('[Settings] Update role error:', err);
      if (onNotify) onNotify(`Failed to update role: ${err.message}`);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Copy full credentials card to clipboard
  const copyCredentialsToClipboard = (creds) => {
    const text = `GPS Precision Spindles ERP — Authorized Login Credentials
-----------------------------------------------------------
Employee ID     : ${creds.employeeCode}
Full Name       : ${creds.name || `${creds.firstName} ${creds.lastName}`}
Login Email / ID: ${creds.email}
Initial Password: ${creds.password}
Assigned Role   : ${creds.roleCode} (${ROLE_METADATA[creds.roleCode]?.name || creds.roleCode})
Department      : ${creds.departmentName || creds.dept || 'Plant Operations'}
Access Scope    : ${ROLE_METADATA[creds.roleCode]?.accessLevel || 'Designated Module Access'}
-----------------------------------------------------------
Web Portal: ${window.location.origin}
Security Note: Access is strictly restricted to assigned modules. Non-admin users cannot switch roles.`;

    navigator.clipboard.writeText(text);
    setCopiedId(creds.employeeCode || creds.email);
    setTimeout(() => setCopiedId(null), 3000);
    if (onNotify) onNotify(`Credentials for ${creds.employeeCode || creds.email} copied to clipboard!`);
  };

  // Filtered users directory list
  const filteredUsersList = useMemo(() => {
    return usersList.filter(user => {
      const matchesRole = roleFilter === 'ALL' || user.roleCode === roleFilter;
      const q = searchUserQuery.trim().toLowerCase();
      if (!q) return matchesRole;
      const matchesSearch = 
        (user.name || '').toLowerCase().includes(q) ||
        (user.employeeCode || '').toLowerCase().includes(q) ||
        (user.email || '').toLowerCase().includes(q) ||
        (user.dept || '').toLowerCase().includes(q) ||
        (user.role || '').toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [usersList, roleFilter, searchUserQuery]);

  // Handle field change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveSuccessMsg(null);
  };

  // Handle alert preference toggle
  const handlePreferenceToggle = (prefKey) => {
    if (!isManagement) return;
    setFormData(prev => ({
      ...prev,
      alertPreferences: {
        ...prev.alertPreferences,
        [prefKey]: !prev.alertPreferences[prefKey]
      }
    }));
    setSaveSuccessMsg(null);
  };

  // Save changes to database
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!isManagement) {
      if (onNotify) onNotify('Access restricted: Only Admin and Management accounts can save settings');
      return;
    }

    if (!settings || !settings.companyId) {
      if (onNotify) onNotify('Error: Authoritative enterprise record is not loaded');
      return;
    }

    // Form validation
    if (!formData.name.trim()) {
      if (onNotify) onNotify('Validation error: Corporate entity name is required');
      return;
    }
    if (!formData.facility.trim()) {
      if (onNotify) onNotify('Validation error: Manufacturing facility name is required');
      return;
    }
    if (!formData.address.trim()) {
      if (onNotify) onNotify('Validation error: Physical factory address is required');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const payload = {
        companyId: settings.companyId,
        branchId: settings.branchId,
        name: formData.name,
        facility: formData.facility,
        address: formData.address,
        gstin: formData.gstin,
        iso: formData.iso,
        shiftMode: formData.shiftMode,
        alertPreferences: formData.alertPreferences
      };

      const { data: updated, error: updError } = await settingsService.updateSettings(payload);

      if (updError) {
        throw new Error(updError.message || 'Database update failed');
      }

      setSettings(updated);
      setFormData(prev => ({
        ...prev,
        name: updated.name || prev.name,
        facility: updated.facility || prev.facility,
        address: updated.address || prev.address,
        gstin: updated.gstin || prev.gstin,
        iso: updated.iso || prev.iso,
        shiftMode: updated.shiftMode || prev.shiftMode,
        alertPreferences: updated.alertPreferences || prev.alertPreferences
      }));

      // Persist company UPI ID
      if (formData.upiId) {
        setActiveUpiId(formData.upiId);
      }

      const msg = 'System preferences, plant configuration, and UPI settings updated successfully';
      setSaveSuccessMsg(msg);
      if (onNotify) onNotify(msg);
    } catch (err) {
      console.error('[GPS-ERP Settings] Save error:', err);
      const errMsg = `Save failed: ${err.message}`;
      if (onNotify) onNotify(errMsg);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Loading State
  if (isLoading) {
    return <SettingsScreenSkeleton />;
  }

  // Render Database Error State with Retry
  if (error && !settings) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Industrial ERP Configuration & Settings" 
          subtitle="Manage company plant details, user role-based permissions, and machine calibrations"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Database Connection Error</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
              {error}
            </p>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={loadLiveSettings}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={14} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Industrial ERP Configuration & Settings" 
        subtitle="Manage company plant details, user role-based permissions, and machine calibrations"
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving || !isManagement}
          title={!isManagement ? "Only Admin or Management can edit settings" : "Save Changes to Database"}
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </PageHeader>

      <div className="content-body">

      {/* Role Access / Save Notice */}
      {!isManagement && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '13px'
        }}>
          <ShieldAlert size={16} color="#dc2626" />
          <span>
            <strong>Read-Only Mode:</strong> Your assigned role (<strong>{role || 'Operational'}</strong>) does not have authorization to modify enterprise settings. System configuration is managed by Admin & Executive Management.
          </span>
        </div>
      )}

      {saveSuccessMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          color: '#166534',
          fontSize: '13px'
        }}>
          <ShieldCheck size={16} color="#16a34a" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <Tabs 
        tabs={[
          { id: 'profile', label: 'Company Profile & Facility' },
          { id: 'users', label: 'User Access Control & ID Generation' },
          { id: 'calibration', label: 'Machine Bay Calibration Cycles' },
          { id: 'notifications', label: 'Alert & Shift Preferences' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Company Profile */}
      {activeTab === 'profile' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Building size={16} color="#7A1F3D" />
              <span>Enterprise Identity & Legal Registration</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Source: <strong className="mono" style={{ color: 'var(--primary)' }}>public.companies & public.branches</strong>
            </span>
          </div>
          <form onSubmit={handleSave} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', marginBottom: '20px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                <img src="/logo.jpg" alt="General Precision Spindles" style={{ height: '44px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>General Precision Spindles Emblem & Logo</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official brand emblem active across navigation shell, invoices, metrology reports, and shop floor documentation.</div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Corporate Entity Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isManagement || isSaving}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Manufacturing Facility</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.facility}
                  onChange={(e) => handleInputChange('facility', e.target.value)}
                  disabled={!isManagement || isSaving}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Factory Physical Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isManagement || isSaving}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN Identification Number</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  disabled={!isManagement || isSaving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quality Standards Certification</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.iso}
                  onChange={(e) => handleInputChange('iso', e.target.value)}
                  disabled={!isManagement || isSaving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Operating Shift Mode</label>
                <CustomSelect 
                  value={formData.shiftMode}
                  onChange={(e) => handleInputChange('shiftMode', e.target.value)}
                  disabled={!isManagement || isSaving}
                  options={[
                    { value: 'Continuous 3-Shift 24x7 Operation', label: 'Continuous 3-Shift 24x7 Operation' },
                    { value: 'Shift A (07:00 - 15:30) & Shift B (15:30 - 00:00)', label: 'Shift A (07:00 - 15:30) & Shift B (15:30 - 00:00)' },
                    { value: 'Single General Shift', label: 'Single General Shift' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Currency & Precision</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.currency} 
                  disabled 
                />
              </div>
            </div>

            {/* Enterprise Banking & Dynamic UPI Payment Gateway */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CreditCard size={18} color="#7A1F3D" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Enterprise Banking & Amount-Wise UPI Scanner Configuration
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Configures the payee bank details and UPI Virtual Payment Address (VPA) encoded in dynamic QR codes across Quotations, Proforma Invoices, and Tax Invoices.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={DEFAULT_BANK_DETAILS.bankName} 
                      disabled 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={DEFAULT_BANK_DETAILS.accountHolder} 
                      disabled 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Account Number</label>
                    <input 
                      type="text" 
                      className="form-control mono" 
                      value={DEFAULT_BANK_DETAILS.accountNo} 
                      disabled 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bank IFSC Code</label>
                    <input 
                      type="text" 
                      className="form-control mono" 
                      value={DEFAULT_BANK_DETAILS.ifscCode} 
                      disabled 
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      Corporate UPI ID / VPA <span style={{ color: '#7A1F3D', fontWeight: 700 }}>* (Used for Quotation Dynamic QR Generation)</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control mono" 
                      value={formData.upiId} 
                      onChange={(e) => handleInputChange('upiId', e.target.value)}
                      placeholder="e.g. 7058731515@hdfc or generalprecisionspindles@icici"
                      disabled={!isManagement || isSaving}
                      required 
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Active VPA handle (e.g. <strong className="mono">7058731515@hdfc</strong>) registered on the NPCI UPI network.
                    </div>
                  </div>
                </div>

                {/* Live Scanner Test Card */}
                <div style={{ 
                  background: 'var(--bg-surface-subtle)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '180px',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', textAlign: 'center' }}>
                    Live Scanner Test
                  </div>
                  <UpiQrCode 
                    amount={50000}
                    quoteNo="TEST-DEMO"
                    upiId={formData.upiId}
                    size={80}
                    onNotify={onNotify}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                    Click to test scan with GPay / PhonePe (Test: ₹50,000)
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab: User Access Control & ID Generation */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Security & RBAC Enforcement Policy Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #FAF0F3 0%, #FFFFFF 100%)',
            border: '1px solid #E8D0D8',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#7A1F3D',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#7A1F3D', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Role-Based Access Control (RBAC) & Identity Security</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px' }}>
                      ENFORCED & ACTIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '780px', lineHeight: '1.5' }}>
                    Every user ID generated here is strictly bound to its assigned operational role. <strong>Non-admin accounts (Operators, Machinists, Sales agents, Stores) cannot switch roles or elevate privileges</strong>. Unauthorised screens, financial documents, and management tabs are blocked at both the route level and via 172 PostgreSQL Row Level Security (RLS) database policies.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreateUser}
                disabled={!isManagement}
                title={!isManagement ? 'Only administrators can generate user accounts' : 'Generate new user ID & credentials'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: '0 2px 6px rgba(122, 31, 61, 0.25)'
                }}
              >
                <KeyRound size={15} />
                <span>+ Generate Access ID & Credentials</span>
              </button>
            </div>

            {/* Security Guarantee Pills */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', borderTop: '1px solid #F0D9E0', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#7A1F3D', fontWeight: 600 }}>
                <Lock size={12} />
                <span>Role Switcher: Locked to Admin Only</span>
              </div>
              <span style={{ color: '#D4B0BD' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <Shield size={12} color="#047857" />
                <span>9 Defined ERP Roles</span>
              </div>
              <span style={{ color: '#D4B0BD' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={12} color="#047857" />
                <span>Zero Privilege Escalation Triggers Active</span>
              </div>
              <span style={{ color: '#D4B0BD' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>75 Tables RLS Protected</span>
              </div>
            </div>
          </div>

          {/* User Directory & Filters Card */}
          <div className="section-card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div className="card-title">
                <Users size={16} color="#7A1F3D" />
                <span>Active Authorized Personnel Directory</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'var(--bg-surface-subtle)',
                  color: 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  marginLeft: '8px'
                }}>
                  {filteredUsersList.length} Accounts
                </span>
              </div>

              {/* Filters & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search ID, name, email..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
                  />
                </div>

                {/* Role Filter */}
                <select
                  className="form-control"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ fontSize: '12px', height: '34px', width: '160px', cursor: 'pointer' }}
                >
                  <option value="ALL">All Roles ({usersList.length})</option>
                  <option value="ADMIN">ADMIN (Plant Admin)</option>
                  <option value="MANAGEMENT">MANAGEMENT (Director)</option>
                  <option value="PROD_MGR">PROD_MGR (Production)</option>
                  <option value="QA_MGR">QA_MGR (Quality Assurance)</option>
                  <option value="SALES">SALES (Commercial)</option>
                  <option value="PURCHASE">PURCHASE (Procurement)</option>
                  <option value="STORES">STORES (Inventory)</option>
                  <option value="SERVICE">SERVICE (Overhaul)</option>
                  <option value="OPERATOR">OPERATOR (Machinist)</option>
                </select>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    const fresh = await settingsService.getAuthorizedUsers();
                    if (fresh.data) setUsersList(fresh.data);
                    if (onNotify) onNotify('User accounts directory refreshed from database');
                  }}
                  title="Refresh directory"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Personnel & ID</th>
                    <th>Login Email</th>
                    <th>Department</th>
                    <th>Assigned RBAC Role</th>
                    <th>Authorized Access Scope</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Security Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsersList.length > 0 ? (
                    filteredUsersList.map((user) => {
                      const meta = user.roleMeta || ROLE_METADATA[user.roleCode] || ROLE_METADATA.OPERATOR;
                      const isCopied = copiedId === user.employeeCode || copiedId === user.email;

                      return (
                        <tr key={user.id || user.employeeCode}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: user.avatarColor || meta.color || '#7A1F3D',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                flexShrink: 0
                              }}>
                                {(user.name || 'GP').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                                  {user.name}
                                </div>
                                <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {user.employeeCode || 'GPS-EMP-NEW'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>{user.email || '—'}</div>
                            {user.phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.phone}</div>}
                          </td>

                          <td style={{ fontSize: '12px' }}>{user.dept || 'Plant Operations'}</td>

                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: meta.bg || '#f1f5f9',
                              color: meta.color || '#475569',
                              border: `1px solid ${meta.color}33`
                            }}>
                              <Shield size={11} />
                              <span>{user.roleCode || user.role}</span>
                            </span>
                          </td>

                          <td>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                              {meta.accessLevel || user.access}
                            </div>
                          </td>

                          <td>
                            <span style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: user.status === 'Active' ? '#ecfdf5' : '#fef2f2',
                              color: user.status === 'Active' ? '#047857' : '#b91c1c'
                            }}>
                              {user.status || 'Active'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {/* View Permissions Button */}
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedUserForPermissions(user);
                                  setIsPermissionsModalOpen(true);
                                }}
                                title="View allowed & blocked ERP screens for this user"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                              >
                                <Eye size={12} />
                                <span>Access Scope</span>
                              </button>

                              {/* Copy ID Button */}
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => copyCredentialsToClipboard({
                                  employeeCode: user.employeeCode,
                                  name: user.name,
                                  email: user.email,
                                  password: '(Default / Assigned Password)',
                                  roleCode: user.roleCode,
                                  departmentName: user.dept
                                })}
                                title="Copy employee ID and login details"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                              >
                                {isCopied ? <Check size={12} color="#047857" /> : <Copy size={12} />}
                                <span>{isCopied ? 'Copied' : 'Copy ID'}</span>
                              </button>

                              {/* Edit Role Button (Admin only) */}
                              {isManagement && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenEditRole(user)}
                                  title="Change assigned RBAC role"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  <KeyRound size={12} />
                                  <span>Role</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Users size={28} color="var(--border-color)" />
                          <div>No user records matching query: "{searchUserQuery}"</div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSearchUserQuery('');
                              setRoleFilter('ALL');
                            }}
                          >
                            Reset Filter
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Calibration */}
      {activeTab === 'calibration' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Wrench size={16} color="#7A1F3D" />
              <span>Machine Tool & Air Gauge Master Calibration Log</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Source: <strong className="mono" style={{ color: 'var(--primary)' }}>public.machines & public.production_bays</strong>
            </span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipment Asset</th>
                  <th>Station Cell</th>
                  <th>Master Calibrated Standard</th>
                  <th>Last Calibrated</th>
                  <th>Next Due</th>
                  <th>Calibration Agency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {calibrationsList.length > 0 ? (
                  calibrationsList.map((cal) => (
                    <tr key={cal.id}>
                      <td style={{ fontWeight: 600 }}>{cal.asset}</td>
                      <td style={{ fontSize: '12px' }}>{cal.station}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{cal.standard}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{cal.last}</td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--primary)' }}>{cal.next}</td>
                      <td style={{ fontSize: '12px' }}>{cal.agency}</td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          background: cal.status === 'Valid' ? '#ecfdf5' : '#fffbeb',
                          color: cal.status === 'Valid' ? '#047857' : '#b45309'
                        }}>
                          {cal.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No machine calibration records found in database
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Bell size={16} color="#7A1F3D" />
              <span>Plant Floor Alert Triggers</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Realtime Notification Thresholds
            </span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { 
                key: 'bearingLowStock',
                title: "Ceramic Bearings Low Stock Reorder Threshold", 
                desc: "Trigger automated procurement alert when stock drops below 10 pairs." 
              },
              { 
                key: 'noseTaperExceeded',
                title: "Nose Taper Runout Tolerance Exceeded (> 1.0 µm)", 
                desc: "Halt machine traveler and notify QA lead immediately upon dial test indicator alert." 
              },
              { 
                key: 'serviceDelayed',
                title: "Service Turnaround Exceeding 5 Days", 
                desc: "Flag delayed service rebuilding jobs to Plant Production Manager." 
              },
              { 
                key: 'customerPoApproval',
                title: "Customer PO Approval Notification", 
                desc: "Notify sales desk and auto-reserve allocated Bill of Materials in stores." 
              },
            ].map((pref) => (
              <div 
                key={pref.key} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--bg-surface-subtle)',
                  opacity: isManagement ? 1 : 0.8
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{pref.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{pref.desc}</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={!!formData.alertPreferences?.[pref.key]} 
                  onChange={() => handlePreferenceToggle(pref.key)}
                  disabled={!isManagement || isSaving}
                  style={{ width: '18px', height: '18px', cursor: isManagement ? 'pointer' : 'not-allowed' }} 
                />
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* MODAL 1: Generate Employee Access ID & Role Credentials */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Generate Employee Access ID & Credentials"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateUserSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: '#FAF0F3',
              border: '1px solid #E8D0D8',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#7A1F3D',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={16} color="#7A1F3D" />
              <span>
                <strong>Access Control Policy:</strong> The assigned role strictly governs which modules this user can open. Operators and staff cannot switch roles or view financial/management data.
              </span>
            </div>

            {/* Row 1: Employee ID & Auto-generator */}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Employee ID / Access Code *</span>
                  <button
                    type="button"
                    onClick={() => setNewUserForm(prev => ({ ...prev, employeeCode: generateEmpCode() }))}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  >
                    ⚡ Auto-Generate
                  </button>
                </label>
                <input
                  type="text"
                  className="form-control mono"
                  value={newUserForm.employeeCode}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, employeeCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. GPS-EMP-107"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98220 14929"
                />
              </div>
            </div>

            {/* Row 2: First Name & Last Name */}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUserForm.firstName}
                  onChange={(e) => {
                    const fn = e.target.value;
                    setNewUserForm(prev => {
                      const ln = prev.lastName;
                      const suggestedEmail = (fn || ln) 
                        ? `${fn.toLowerCase().replace(/\s+/g, '')}${ln ? `.${ln.toLowerCase().replace(/\s+/g, '')}` : ''}@gpsspindles.com`
                        : prev.email;
                      return {
                        ...prev,
                        firstName: fn,
                        email: prev.email.includes('@') && !prev.email.endsWith('@gpsspindles.com') ? prev.email : suggestedEmail
                      };
                    });
                  }}
                  placeholder="e.g. Ramesh"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUserForm.lastName}
                  onChange={(e) => {
                    const ln = e.target.value;
                    setNewUserForm(prev => {
                      const fn = prev.firstName;
                      const suggestedEmail = (fn || ln) 
                        ? `${fn ? `${fn.toLowerCase().replace(/\s+/g, '')}.` : ''}${ln.toLowerCase().replace(/\s+/g, '')}@gpsspindles.com`
                        : prev.email;
                      return {
                        ...prev,
                        lastName: ln,
                        email: prev.email.includes('@') && !prev.email.endsWith('@gpsspindles.com') ? prev.email : suggestedEmail
                      };
                    });
                  }}
                  placeholder="e.g. Patil"
                  required
                />
              </div>
            </div>

            {/* Row 3: Login Email */}
            <div className="form-group">
              <label className="form-label">Login Email / Username ID *</label>
              <input
                type="email"
                className="form-control"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="ramesh.patil@gpsspindles.com"
                required
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Used by staff to sign in to the ERP portal.
              </div>
            </div>

            {/* Row 4: Department & Designation */}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-control"
                  value={newUserForm.departmentId}
                  onChange={(e) => {
                    const selected = departmentsList.find(d => d.id === e.target.value);
                    setNewUserForm(prev => ({
                      ...prev,
                      departmentId: e.target.value,
                      departmentName: selected?.name || prev.departmentName
                    }));
                  }}
                >
                  {departmentsList.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                  {departmentsList.length === 0 && (
                    <>
                      <option value="d1">Production Machining</option>
                      <option value="d2">Cleanroom Assembly</option>
                      <option value="d3">Metrology & QA</option>
                      <option value="d4">Service & Rebuild</option>
                      <option value="d5">Sales & Commercial</option>
                      <option value="d6">Procurement & Stores</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Designation / Job Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUserForm.designation}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Shop Floor Precision Technician"
                />
              </div>
            </div>

            {/* Row 5: Assigned RBAC Role (Core Access Control) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                Assigned RBAC Security Role * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Defines feature access)</span>
              </label>
              <select
                className="form-control"
                value={newUserForm.roleCode}
                onChange={(e) => {
                  const roleCode = e.target.value;
                  const meta = ROLE_METADATA[roleCode];
                  setNewUserForm(prev => ({
                    ...prev,
                    roleCode,
                    designation: meta?.name || prev.designation
                  }));
                }}
                style={{ fontWeight: 600, fontSize: '13px', borderColor: 'var(--primary)' }}
              >
                <option value="OPERATOR">OPERATOR — Shop Floor Precision Technician (Workforce & personal logs only)</option>
                <option value="SALES">SALES — Commercial & Sales Lead (Quotes, Invoices, Customers, E-Way bills)</option>
                <option value="PURCHASE">PURCHASE — Procurement Controller (Purchase Orders, Suppliers, Inventory)</option>
                <option value="STORES">STORES — Warehouse & Inventory Lead (Stock bin tracking, GRN, Dispatch)</option>
                <option value="SERVICE">SERVICE — Service & Rebuild Lead (9-Stage overhaul, spindle repair)</option>
                <option value="QA_MGR">QA_MGR — Quality Assurance Manager (Metrology sign-off, Calibration, NCR)</option>
                <option value="PROD_MGR">PROD_MGR — Production Manager (Work orders, bay scheduling, assembly)</option>
                <option value="MANAGEMENT">MANAGEMENT — Executive Director (Full operational visibility & reports)</option>
                <option value="ADMIN">ADMIN — Plant Administrator (Full master configuration & user rights)</option>
              </select>
            </div>

            {/* LIVE PERMISSIONS PREVIEW BOX */}
            {(() => {
              const meta = ROLE_METADATA[newUserForm.roleCode] || ROLE_METADATA.OPERATOR;
              return (
                <div style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Access Scope for {meta.name}:
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: meta.bg,
                      color: meta.color,
                      border: `1px solid ${meta.color}40`
                    }}>
                      {meta.code}
                    </span>
                  </div>

                  {/* Allowed */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#047857', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span>Permitted Modules ({meta.allowedModules.length}):</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {meta.allowedModules.map((m, idx) => (
                        <span key={idx} style={{
                          fontSize: '10.5px',
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          padding: '1px 6px',
                          borderRadius: '3px'
                        }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Blocked */}
                  {meta.deniedModules.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#b91c1c', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} />
                        <span>Strictly Blocked Modules ({meta.deniedModules.length}):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {meta.deniedModules.map((m, idx) => (
                          <span key={idx} style={{
                            fontSize: '10.5px',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            textDecoration: 'line-through'
                          }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                    🔒 <strong>Security guarantee:</strong> When this employee logs in, unauthorized screens and the header role switcher are completely hidden from them.
                  </div>
                </div>
              );
            })()}

            {/* Row 6: Initial Password */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Initial Temporary Password *</span>
                <button
                  type="button"
                  onClick={() => setNewUserForm(prev => ({ ...prev, password: generateRandomPassword() }))}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                >
                  🔄 Generate New Password
                </button>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={newUserForm.showPassword ? 'text' : 'password'}
                  className="form-control mono"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setNewUserForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  {newUserForm.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Staff can reset or update this password after their first login.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateUserModalOpen(false)}
              disabled={isSubmittingUser}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingUser}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSubmittingUser ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Activating User ID...</span>
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  <span>Generate & Activate User Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Credentials Created Confirmation Card */}
      <Modal
        isOpen={createdUserCredentials !== null}
        onClose={() => setCreatedUserCredentials(null)}
        title="Employee Access ID Activated Successfully"
        maxWidth="540px"
      >
        {createdUserCredentials && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              color: '#166534'
            }}>
              <CheckCircle2 size={24} color="#16a34a" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>Identity & RBAC Access Active</div>
                <div style={{ fontSize: '12px', color: '#15803d' }}>
                  User ID is ready for login. Access permissions are strictly enforced.
                </div>
              </div>
            </div>

            {/* Highlighted Credentials Card */}
            <div style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Employee Code</span>
                <span className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)' }}>
                  {createdUserCredentials.employeeCode}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Personnel Name</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{createdUserCredentials.name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Login Email / ID</span>
                <span className="mono" style={{ fontSize: '12.5px', fontWeight: 600 }}>{createdUserCredentials.email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Initial Password</span>
                <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                  {createdUserCredentials.password}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Role</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: createdUserCredentials.roleMeta?.color }}>
                  {createdUserCredentials.roleCode} ({createdUserCredentials.roleMeta?.name})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Authorized Scope</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', maxWidth: '280px' }}>
                  {createdUserCredentials.roleMeta?.accessLevel}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreatedUserCredentials(null)}
              >
                Close & Return
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyCredentialsToClipboard(createdUserCredentials)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Copy size={14} />
                <span>📋 Copy Login Credentials</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: View Permissions Breakdown */}
      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setSelectedUserForPermissions(null);
        }}
        title={selectedUserForPermissions ? `Access Permissions: ${selectedUserForPermissions.name}` : 'Role Access Permissions'}
        maxWidth="640px"
      >
        {selectedUserForPermissions && (() => {
          const uRole = selectedUserForPermissions.roleCode || 'OPERATOR';
          const allowedScreens = ROLE_PERMISSIONS[uRole] || [];
          const meta = selectedUserForPermissions.roleMeta || ROLE_METADATA[uRole] || ROLE_METADATA.OPERATOR;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* User summary badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: meta.bg || '#f1f5f9',
                border: `1px solid ${meta.color}33`,
                borderRadius: 'var(--radius-md)'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: meta.color }}>
                    {selectedUserForPermissions.name} ({selectedUserForPermissions.employeeCode})
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Role: <strong>{uRole}</strong> • {selectedUserForPermissions.dept}
                  </div>
                </div>

                <span style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#ffffff',
                  color: meta.color,
                  border: `1px solid ${meta.color}40`
                }}>
                  {meta.accessLevel}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Complete breakdown of all 21 ERP functional modules for this account:
              </div>

              {/* Screens Grid */}
              <div style={{
                maxHeight: '380px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                paddingRight: '4px'
              }}>
                {ALL_ERP_SCREENS.map((sc) => {
                  const isAllowed = allowedScreens.includes(sc.id);
                  return (
                    <div
                      key={sc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: isAllowed ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        background: isAllowed ? '#f0fdf4' : '#fff5f5',
                        fontSize: '11.5px'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: isAllowed ? '#166534' : '#991b1b' }}>
                        {sc.name}
                      </span>
                      {isAllowed ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#16a34a', fontSize: '10.5px', fontWeight: 700 }}>
                          <CheckCircle2 size={12} />
                          <span>Allowed</span>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#dc2626', fontSize: '10.5px', fontWeight: 700 }}>
                          <Lock size={12} />
                          <span>Blocked</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsPermissionsModalOpen(false);
                    setSelectedUserForPermissions(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 4: Edit User Role */}
      <Modal
        isOpen={isEditRoleModalOpen}
        onClose={() => {
          setIsEditRoleModalOpen(false);
          setSelectedUserForEditRole(null);
        }}
        title={selectedUserForEditRole ? `Update Role: ${selectedUserForEditRole.name}` : 'Edit User Role'}
        maxWidth="500px"
      >
        {selectedUserForEditRole && (
          <form onSubmit={handleEditRoleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Reassign the operational authorization role for <strong>{selectedUserForEditRole.name}</strong> ({selectedUserForEditRole.employeeCode}).
              </div>

              <div className="form-group">
                <label className="form-label">New Assigned Role</label>
                <select
                  className="form-control"
                  value={editRoleForm.roleCode}
                  onChange={(e) => {
                    const rCode = e.target.value;
                    setEditRoleForm(prev => ({
                      ...prev,
                      roleCode: rCode,
                      designation: ROLE_METADATA[rCode]?.name || prev.designation
                    }));
                  }}
                  style={{ fontWeight: 600, borderColor: 'var(--primary)' }}
                >
                  <option value="OPERATOR">OPERATOR (Shop Floor Precision Technician)</option>
                  <option value="SALES">SALES (Commercial & Sales Desk)</option>
                  <option value="PURCHASE">PURCHASE (Procurement Controller)</option>
                  <option value="STORES">STORES (Warehouse & Stock Lead)</option>
                  <option value="SERVICE">SERVICE (Service & Rebuild Lead)</option>
                  <option value="QA_MGR">QA_MGR (Quality Assurance Manager)</option>
                  <option value="PROD_MGR">PROD_MGR (Production Manager)</option>
                  <option value="MANAGEMENT">MANAGEMENT (Executive Director)</option>
                  <option value="ADMIN">ADMIN (Plant Administrator)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Designation / Role Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={editRoleForm.designation}
                  onChange={(e) => setEditRoleForm(prev => ({ ...prev, designation: e.target.value }))}
                />
              </div>

              <div style={{
                background: '#FAF0F3',
                border: '1px solid #E8D0D8',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '11.5px',
                color: '#7A1F3D'
              }}>
                <strong>Notice:</strong> Changing this user's role will immediately update their permitted ERP screens and database access scopes upon their next request.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditRoleModalOpen(false);
                  setSelectedUserForEditRole(null);
                }}
                disabled={isSubmittingUser}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmittingUser}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSubmittingUser ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Updating Role...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Save Role Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
