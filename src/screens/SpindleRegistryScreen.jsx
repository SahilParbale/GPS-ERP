import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { spindleModelService } from '../services/database/spindleModelService';
import { customerService } from '../services/database/customerService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Filter, Plus, Eye, Wrench, Download, 
  Disc, CheckCircle2, Shield, QrCode, RefreshCw, AlertCircle,
  ShieldAlert, Trash2, Edit3, Layers, Settings, Activity, 
  Clock, Box, Cpu, FileText, ChevronRight, X, Sparkles, Building2
} from 'lucide-react';

export default function SpindleRegistryScreen({ onNavigate, onSelectSpindle, onNotify }) {
  const { role, profile } = useAuth();
  const userRole = (profile?.role?.code || profile?.role || role?.code || role || '').toUpperCase();
  const canRegister = ['ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'].includes(userRole);

  const [spindles, setSpindles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Category Tab: 'all' | 'manufactured' | 'repair' | 'catalog'
  const [activeTab, setActiveTab] = useState('all');

  // Filters - All on one line
  const [searchQuery, setSearchQuery] = useState('');
  const [makeFilter, setMakeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // PDF Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [suggestedSerial, setSuggestedSerial] = useState('');

  // Form State for multi-category registration
  const [registerCategory, setRegisterCategory] = useState('manufactured'); // 'manufactured' | 'repair' | 'catalog'
  const [formData, setFormData] = useState({
    serialNumber: '',
    make: 'GPS Spindle',
    model: '',
    modelId: '',
    customer: '',
    customerId: '',
    machineTool: '',
    type: 'Motorized Electro-Spindle',
    taper: 'HSK-A63',
    rpm: '24,000 RPM',
    maxRpm: 24000,
    power: '15 kW',
    torque: '32 Nm',
    lubrication: 'Air-Oil Mist',
    bearings: 'Ceramic Hybrid (HC7008-E)',
    cooling: 'Water-Glycol Closed Circuit',
    status: 'In Production',
    stage: 'Machining',
    warrantyPeriod: 'Active (24 Months / 4,000h)',
    currentLocation: 'Pune Plant 1',
    defectReason: '',
    inwardJobNumber: '',
    targetDispatchDate: '',
    notes: ''
  });

  // Modal State for Service History / Technical Specs
  const [selectedSpindleForHistory, setSelectedSpindleForHistory] = useState(null);

  // Modal State for Quick Status / Stage Update
  const [selectedSpindleForUpdate, setSelectedSpindleForUpdate] = useState(null);
  const [updateFormData, setUpdateFormData] = useState({
    status: '',
    stage: '',
    runout: '',
    vibration: '',
    notes: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirmation Modal
  const [deleteConfirmSpindle, setDeleteConfirmSpindle] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSpindles = async () => {
    setIsLoading(true);
    setError(null);
    const res = await spindleModelService.getSpindles();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    setSpindles(res.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSpindles();

    const handleEntityUpdate = (e) => {
      if (e.detail?.entity === 'spindles') {
        loadSpindles();
      }
    };
    window.addEventListener('gps_entities_updated', handleEntityUpdate);
    return () => window.removeEventListener('gps_entities_updated', handleEntityUpdate);
  }, []);

  // Open Registration Modal
  const handleOpenRegister = async (presetCategory = 'manufactured') => {
    setIsRegisterOpen(true);
    setRegisterError(null);
    setRegisterCategory(presetCategory);
    setIsLoadingMeta(true);

    try {
      const [modelsRes, custRes, nextSerial] = await Promise.all([
        models.length > 0 ? Promise.resolve({ data: models }) : spindleModelService.getSpindleModels(),
        customers.length > 0 ? Promise.resolve({ data: customers }) : customerService.getCustomers({ select: 'id, company_name, customer_code' }),
        spindleModelService.getNextSuggestedSerial()
      ]);

      const loadedModels = modelsRes.data || [];
      const loadedCustomers = custRes.data || [];
      if (models.length === 0 && loadedModels.length > 0) setModels(loadedModels);
      if (customers.length === 0 && loadedCustomers.length > 0) setCustomers(loadedCustomers);

      setSuggestedSerial(nextSerial);

      if (presetCategory === 'manufactured') {
        const firstModel = loadedModels[0];
        setFormData({
          serialNumber: nextSerial,
          make: 'GPS Spindle',
          model: firstModel ? firstModel.model_code : 'GPS-HSK-A63-24K',
          modelId: firstModel ? firstModel.id : '',
          customer: '',
          customerId: '',
          machineTool: '',
          type: firstModel ? firstModel.spindle_type : 'Motorized Electro-Spindle',
          taper: firstModel ? firstModel.taper_standard : 'HSK-A63',
          rpm: `${firstModel?.max_rpm ? (firstModel.max_rpm / 1000).toFixed(0) : '24'}k RPM`,
          maxRpm: firstModel?.max_rpm || 24000,
          power: `${firstModel?.rated_power_kw || 15} kW`,
          torque: `${firstModel?.nominal_torque_nm || 32} Nm`,
          lubrication: firstModel?.lubrication_type || 'Air-Oil Mist',
          bearings: firstModel?.bearing_type || 'Ceramic Hybrid',
          cooling: firstModel?.cooling_type || 'Water-Glycol Closed Circuit',
          status: 'In Production',
          stage: 'Machining',
          warrantyPeriod: 'Active (24 Months / 4,000h)',
          currentLocation: 'Pune Plant 1',
          defectReason: '',
          inwardJobNumber: '',
          targetDispatchDate: '',
          notes: ''
        });
      } else if (presetCategory === 'repair') {
        const repairJobNo = `JOB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        setFormData({
          serialNumber: '',
          make: 'Franz Kessler',
          model: 'DMS 112.AL.4.FOS',
          modelId: '',
          customer: loadedCustomers[0]?.company_name || 'Force Motors Ltd',
          customerId: loadedCustomers[0]?.id || '',
          machineTool: 'Makino A51nx Horizontal Machining Center',
          type: 'Motorized Electro-Spindle',
          taper: 'HSK-A63',
          rpm: '20,000 RPM',
          maxRpm: 20000,
          power: '25 kW',
          torque: '68 Nm',
          lubrication: 'Air-Oil Mist',
          bearings: 'Ceramic Hybrid (Precision Pair)',
          cooling: 'Water Jacket Coolant',
          status: 'Under Service',
          stage: 'Under Inspection',
          warrantyPeriod: '6 Months Service Warranty',
          currentLocation: 'Pune Plant 1 (Precision Rebuild Bay)',
          defectReason: 'Spindle crash on B-axis; excessive nose runout (>12µm) and high vibration at 10,000 RPM',
          inwardJobNumber: repairJobNo,
          targetDispatchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Customer urgent requirement for engine cylinder head line.'
        });
      } else {
        // catalog fleet asset
        setFormData({
          serialNumber: `CAT-${Math.floor(1000 + Math.random() * 9000)}`,
          make: 'IBAG Switzerland',
          model: 'HSC 170-40/12',
          modelId: '',
          customer: 'OEM Benchmark Catalog',
          customerId: '',
          machineTool: 'Mikron / GF Machining Centers',
          type: 'High Frequency Direct Spindle',
          taper: 'HSK-E40',
          rpm: '42,000 RPM',
          maxRpm: 42000,
          power: '12 kW',
          torque: '4.8 Nm',
          lubrication: 'Air-Oil Micro-dosing',
          bearings: 'Ultra High Speed Ceramic Bearings',
          cooling: 'Integrated Chilled Coolant Sleeve',
          status: 'Cataloged Asset',
          stage: 'OEM Benchmark Reference',
          warrantyPeriod: 'OEM Benchmark Specifications',
          currentLocation: 'Engineering Database',
          defectReason: '',
          inwardJobNumber: '',
          targetDispatchDate: '',
          notes: 'Standard OEM benchmark profile with rebuild clearances on file.'
        });
      }
    } catch (err) {
      console.warn('[GPS-ERP Spindles] Failed loading metadata:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleRegisterCategoryChange = (newCat) => {
    setRegisterCategory(newCat);
    handleOpenRegister(newCat);
  };

  const handleModelSelect = (selectedModelId) => {
    const sel = models.find(m => m.id === selectedModelId);
    if (sel) {
      setFormData(prev => ({
        ...prev,
        modelId: sel.id,
        model: sel.model_code,
        type: sel.spindle_type || prev.type,
        taper: sel.taper_standard || prev.taper,
        rpm: `${sel.max_rpm ? (sel.max_rpm / 1000).toFixed(0) : '24'}k RPM`,
        maxRpm: sel.max_rpm || prev.maxRpm,
        power: `${sel.rated_power_kw || 15} kW`,
        torque: `${sel.nominal_torque_nm || 32} Nm`,
        lubrication: sel.lubrication_type || prev.lubrication,
        bearings: sel.bearing_type || prev.bearings,
        cooling: sel.cooling_type || prev.cooling
      }));
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.serialNumber.trim()) {
      setRegisterError('Serial number / Asset ID is required.');
      return;
    }
    if (registerCategory === 'manufactured' && !formData.modelId && !formData.model) {
      setRegisterError('Please select a spindle engineering model.');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);

    const payload = {
      serial_number: formData.serialNumber.trim(),
      category: registerCategory,
      make: formData.make || (registerCategory === 'manufactured' ? 'GPS Spindle' : 'Generic OEM'),
      model: formData.model || 'GPS-HSK-A63-24K',
      model_id: formData.modelId || null,
      customer: formData.customer || (registerCategory === 'catalog' ? 'Benchmark Catalog Asset' : 'Internal Stock'),
      customer_id: formData.customerId || null,
      machineTool: formData.machineTool,
      spindle_type: formData.type,
      taper_interface: formData.taper,
      max_rpm: formData.maxRpm,
      power_kw: parseFloat(formData.power) || 15,
      torque_nm: parseFloat(formData.torque) || 32,
      lubrication: formData.lubrication,
      bearings_spec: formData.bearings,
      cooling_spec: formData.cooling,
      warranty_period: formData.warrantyPeriod,
      status: formData.status,
      current_stage: formData.stage,
      current_location: formData.currentLocation,
      defectReason: formData.defectReason,
      inwardJobNumber: formData.inwardJobNumber,
      targetDispatchDate: formData.targetDispatchDate,
      notes: formData.notes
    };

    const res = await spindleModelService.registerSpindle(payload);

    if (res.error) {
      setRegisterError(res.error.message || res.error || 'Failed to register spindle');
      setIsRegistering(false);
      return;
    }

    setIsRegistering(false);
    setIsRegisterOpen(false);
    if (onNotify) {
      const typeLabel = registerCategory === 'manufactured' ? 'GPS Manufactured Spindle' : (registerCategory === 'repair' ? 'Inward Customer Repair Spindle' : 'Cataloged Fleet Asset');
      onNotify(`${typeLabel} [${res.data.serialNumber}] registered successfully into digital registry.`);
    }
    await loadSpindles();
  };

  // Open Quick Update Modal
  const handleOpenUpdateModal = (sp) => {
    setSelectedSpindleForUpdate(sp);
    setUpdateFormData({
      status: sp.status || 'In Production',
      stage: sp.stage || '',
      runout: sp.runout || '0.6 µm',
      vibration: sp.vibration || '0.27 mm/s',
      notes: sp.notes || ''
    });
  };

  const handleUpdateSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSpindleForUpdate) return;

    setIsUpdating(true);
    const res = await spindleModelService.updateSpindle(selectedSpindleForUpdate.id, {
      status: updateFormData.status,
      stage: updateFormData.stage,
      runout: updateFormData.runout,
      vibration: updateFormData.vibration,
      notes: updateFormData.notes
    });

    setIsUpdating(false);
    if (res.error) {
      if (onNotify) onNotify(`Update failed: ${res.error.message || 'Error updating spindle'}`);
      return;
    }

    if (onNotify) {
      onNotify(`Spindle ${selectedSpindleForUpdate.serialNumber} updated successfully.`);
    }
    setSelectedSpindleForUpdate(null);
    await loadSpindles();
  };

  // Delete Spindle Action
  const handleDeleteSpindle = async () => {
    if (!deleteConfirmSpindle) return;
    setIsDeleting(true);
    const res = await spindleModelService.deleteSpindle(deleteConfirmSpindle.id);
    setIsDeleting(false);

    if (res.error) {
      if (onNotify) onNotify(`Failed to delete spindle: ${res.error.message || 'Error'}`);
      return;
    }

    if (onNotify) {
      onNotify(`Spindle ${deleteConfirmSpindle.serialNumber} removed from registry.`);
    }
    setDeleteConfirmSpindle(null);
    await loadSpindles();
  };

  // Calculation of counts for tabs and KPI metrics
  const manufacturedSpindles = spindles.filter(s => s.category === 'manufactured');
  const repairSpindles = spindles.filter(s => s.category === 'repair');
  const catalogSpindles = spindles.filter(s => s.category === 'catalog');

  // Filtered List
  const filteredSpindles = spindles.filter((sp) => {
    // Tab filter
    if (activeTab === 'manufactured' && sp.category !== 'manufactured') return false;
    if (activeTab === 'repair' && sp.category !== 'repair') return false;
    if (activeTab === 'catalog' && sp.category !== 'catalog') return false;

    // Search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const matchSearch = 
        (sp.serialNumber || '').toLowerCase().includes(query) ||
        (sp.model || '').toLowerCase().includes(query) ||
        (sp.make || '').toLowerCase().includes(query) ||
        (sp.customer || '').toLowerCase().includes(query) ||
        (sp.machineTool || '').toLowerCase().includes(query) ||
        (sp.inwardJobNumber || '').toLowerCase().includes(query) ||
        (sp.type || '').toLowerCase().includes(query) ||
        (sp.taper || '').toLowerCase().includes(query);
      if (!matchSearch) return false;
    }

    // Make filter
    if (makeFilter !== 'all' && sp.make !== makeFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && (sp.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;

    // Type filter
    if (typeFilter !== 'all' && !(sp.type || '').toLowerCase().includes(typeFilter.toLowerCase())) return false;

    return true;
  });

  // Extract distinct makes for make filter
  const distinctMakes = Array.from(new Set(spindles.map(s => s.make).filter(Boolean)));

  const hasActiveFilters = searchQuery !== '' || makeFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setMakeFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  if (isLoading) {
    return <TablePageSkeleton columns={['140px', '180px', '120px', '140px', '100px', '80px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Spindle Fleet & Asset Registry" 
          subtitle="Unified master registry for precision spindles manufactured by GPS, customer units under repair, and cataloged OEM fleet models"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              Database Operation Notice
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to retrieve live spindle registry records from database.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={loadSpindles}>
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
        title="Spindle Fleet & Asset Registry" 
        subtitle="Dedicated master registry of all spindles: GPS manufactured models, customer overhaul & repair jobs, and known OEM fleet specifications"
        badge={`${spindles.length} Total Master Assets`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'MASTER SPINDLE FLEET & ASSET REGISTRY',
              id: `SPINDLE-REG-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Total Tracked Assets', value: spindles.length },
                { label: 'GPS Manufactured', value: manufacturedSpindles.length },
                { label: 'Customer Repairs & Overhauls', value: repairSpindles.length },
                { label: 'Cataloged OEM Fleet', value: catalogSpindles.length }
              ],
              headers: ['#', 'Serial / Job #', 'Category', 'Make & Model', 'Customer / Location', 'Taper / RPM', 'Status'],
              rows: filteredSpindles.map((s, idx) => [
                idx + 1,
                s.serialNumber || s.id,
                s.category === 'manufactured' ? 'GPS Built' : (s.category === 'repair' ? 'Repair Job' : 'OEM Catalog'),
                `${s.make} - ${s.model}`,
                s.customer,
                `${s.taper || 'HSK-A63'} • ${s.rpm}`,
                s.status
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span>Export Master Registry (PDF)</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => handleOpenRegister(activeTab === 'all' ? 'manufactured' : activeTab)}
          title={canRegister ? "Register Spindle Asset" : "Registration restricted to Production, QA, Service, or Admin"}
          disabled={!canRegister}
        >
          <Plus size={14} />
          <span>+ Register Spindle Asset</span>
        </button>
      </PageHeader>

      <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Top Operational Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '2px',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'all' ? 600 : 500,
              color: activeTab === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'all' ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={15} />
            <span>All Fleet Assets</span>
            <span style={{
              background: activeTab === 'all' ? '#fdf2f8' : '#f1f5f9',
              color: activeTab === 'all' ? 'var(--primary)' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {spindles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manufactured')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'manufactured' ? 600 : 500,
              color: activeTab === 'manufactured' ? '#7A1F3D' : 'var(--text-secondary)',
              borderBottom: activeTab === 'manufactured' ? '2px solid #7A1F3D' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Cpu size={15} />
            <span>Manufactured by GPS</span>
            <span style={{
              background: activeTab === 'manufactured' ? '#fdf2f8' : '#f1f5f9',
              color: activeTab === 'manufactured' ? '#7A1F3D' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {manufacturedSpindles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('repair')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'repair' ? 600 : 500,
              color: activeTab === 'repair' ? '#c2410c' : 'var(--text-secondary)',
              borderBottom: activeTab === 'repair' ? '2px solid #c2410c' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Wrench size={15} />
            <span>Repaired & Serviced Spindles</span>
            <span style={{
              background: activeTab === 'repair' ? '#fff7ed' : '#f1f5f9',
              color: activeTab === 'repair' ? '#c2410c' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {repairSpindles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'catalog' ? 600 : 500,
              color: activeTab === 'catalog' ? '#1d4ed8' : 'var(--text-secondary)',
              borderBottom: activeTab === 'catalog' ? '2px solid #1d4ed8' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Box size={15} />
            <span>Cataloged & Known Fleet</span>
            <span style={{
              background: activeTab === 'catalog' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'catalog' ? '#1d4ed8' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {catalogSpindles.length}
            </span>
          </button>
        </div>

        {/* 4 KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          <div className="section-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#fdf2f8',
              color: '#7A1F3D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total Fleet Assets
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {spindles.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Across {distinctMakes.length} spindle manufacturers
              </div>
            </div>
          </div>

          <div className="section-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#fdf2f8',
              color: '#9d174d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Manufactured by GPS
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#9d174d', lineHeight: 1.2 }}>
                {manufacturedSpindles.length}
              </div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>
                {manufacturedSpindles.filter(s => s.status === 'Ready' || s.status === 'Operational' || s.status === 'QC Passed').length} Passed QC / Active
              </div>
            </div>
          </div>

          <div className="section-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#fff7ed',
              color: '#c2410c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wrench size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Repairs & Overhauls
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#c2410c', lineHeight: 1.2 }}>
                {repairSpindles.length}
              </div>
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 500 }}>
                {repairSpindles.filter(s => s.status === 'Under Service').length} Currently in workshop
              </div>
            </div>
          </div>

          <div className="section-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Cataloged & Known Fleet
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#1d4ed8', lineHeight: 1.2 }}>
                {catalogSpindles.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                OEM models with full tech clearance
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="section-card">
          {/* Single-line Filter Bar */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-light, #fafafa)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'nowrap',
            width: '100%',
            overflowX: 'auto'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search serial, make, model, customer, job #..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
              />
            </div>

            {/* Make / OEM Filter */}
            <div style={{ flex: '0 0 170px', minWidth: '150px' }}>
              <CustomSelect 
                value={makeFilter}
                onChange={(e) => setMakeFilter(e.target.value)}
                placeholder="All Spindle Makes"
                options={[
                  { value: 'all', label: 'All Spindle Makes' },
                  ...distinctMakes.map(m => ({ value: m, label: m }))
                ]}
              />
            </div>

            {/* Operational Status Filter */}
            <div style={{ flex: '0 0 180px', minWidth: '160px' }}>
              <CustomSelect 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="All Statuses"
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'in production', label: 'In Production' },
                  { value: 'qc pending', label: 'QC Pending' },
                  { value: 'qc passed', label: 'QC Passed' },
                  { value: 'ready', label: 'Ready for Dispatch' },
                  { value: 'operational', label: 'Operational in Field' },
                  { value: 'under service', label: 'Under Service / Repair' },
                  { value: 'cataloged asset', label: 'Cataloged Asset' }
                ]}
              />
            </div>

            {/* Spindle Type Filter */}
            <div style={{ flex: '0 0 170px', minWidth: '150px' }}>
              <CustomSelect 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                placeholder="All Spindle Types"
                options={[
                  { value: 'all', label: 'All Spindle Types' },
                  { value: 'motorized', label: 'Motorized Electro-Spindle' },
                  { value: 'belt', label: 'Belt Driven' },
                  { value: 'high frequency', label: 'High Frequency Direct' },
                  { value: 'geared', label: 'High Torque Geared' },
                  { value: 'grinding', label: 'Internal Grinding' }
                ]}
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={resetFilters}
                style={{ flex: '0 0 auto', height: '36px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                title="Reset all filters"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}

            {/* Total Results Count */}
            <div style={{ flex: '0 0 auto', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
              Showing <strong>{filteredSpindles.length}</strong> of {spindles.length}
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '160px' }}>Serial / Job Number</th>
                  <th style={{ minWidth: '180px' }}>Make & Model</th>
                  <th style={{ minWidth: '160px' }}>Customer & Plant</th>
                  <th style={{ minWidth: '150px' }}>Interface & Tech</th>
                  <th style={{ minWidth: '130px' }}>Runout / Vib</th>
                  <th style={{ minWidth: '140px' }}>Status & Stage</th>
                  <th style={{ minWidth: '130px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpindles.map((sp) => {
                  const isMfg = sp.category === 'manufactured';
                  const isRepair = sp.category === 'repair';
                  const isCat = sp.category === 'catalog';

                  return (
                    <tr key={sp.serialNumber || sp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>
                            {sp.serialNumber}
                          </span>
                        </div>
                        {sp.inwardJobNumber ? (
                          <div className="mono" style={{ fontSize: '11px', color: '#c2410c', fontWeight: 600 }}>
                            {sp.inwardJobNumber}
                          </div>
                        ) : (
                          <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {sp.qrCode || sp.serialNumber}
                          </div>
                        )}
                        <div style={{ marginTop: '4px' }}>
                          {isMfg && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: '#fdf2f8',
                              color: '#7A1F3D',
                              border: '1px solid #fbcfe8'
                            }}>
                              <Cpu size={10} />
                              GPS Built
                            </span>
                          )}
                          {isRepair && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa'
                            }}>
                              <Wrench size={10} />
                              Customer Repair
                            </span>
                          )}
                          {isCat && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              <Box size={10} />
                              Fleet Catalog
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1'
                          }}>
                            {sp.make || 'GPS Spindle'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          {sp.model}
                        </div>
                        {sp.machineTool && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Tool: {sp.machineTool}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                          {sp.customer}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {sp.plantLocation || 'Pune Plant 1'}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--primary)' }}>{sp.taper || sp.interface || 'HSK-A63'}</span>
                          <span style={{ margin: '0 4px', color: '#cbd5e1' }}>•</span>
                          <span>{sp.rpm}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {sp.power} • {sp.torque || '32 Nm'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {sp.lubrication}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Runout:</span>
                          <span className="mono" style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: parseFloat(sp.runout || '0.6') <= 1.0 ? '#059669' : '#d97706'
                          }}>
                            {sp.runout || '0.6 µm'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vib:</span>
                          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {sp.vibration || '0.27 mm/s'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div>
                          <StatusBadge status={sp.status} />
                        </div>
                        {sp.stage && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Activity size={10} color="var(--primary)" />
                            <span>{sp.stage}</span>
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              if (onSelectSpindle) onSelectSpindle(sp);
                              onNavigate('spindle-detail');
                            }}
                            title="View Digital Twin Profile"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            <Eye size={12} />
                            <span>Twin</span>
                          </button>

                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => setSelectedSpindleForHistory(sp)}
                            title="View Technical Specifications & Overhaul Details"
                            style={{ padding: '4px 6px' }}
                          >
                            <FileText size={12} />
                          </button>

                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => handleOpenUpdateModal(sp)}
                            title="Quick Status & Stage Update"
                            style={{ padding: '4px 6px' }}
                          >
                            <Edit3 size={12} />
                          </button>

                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => setDeleteConfirmSpindle(sp)}
                            title="Delete Asset from Registry"
                            style={{ padding: '4px 6px', color: '#dc2626' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredSpindles.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                      <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>No spindle assets match your active filters</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        Try clearing filters or search term, or register a new spindle asset.
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={resetFilters}
                        style={{ marginTop: '12px' }}
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal 1: Register Any Spindle Asset (Manufactured, Repaired, Cataloged) */}
        <Modal
          isOpen={isRegisterOpen}
          onClose={() => !isRegistering && setIsRegisterOpen(false)}
          title="Register Spindle Asset into Master Registry"
          footer={
            <>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsRegisterOpen(false)}
                disabled={isRegistering}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleRegisterSubmit}
                disabled={isRegistering || !canRegister || !formData.serialNumber.trim()}
              >
                {isRegistering ? (
                  <>
                    <RefreshCw size={14} className="spin-icon" />
                    <span>Saving Asset...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Save to Master Registry</span>
                  </>
                )}
              </button>
            </>
          }
        >
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!canRegister && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} />
                <span>Permission Notice: Write authorization requires Production Manager (PROD_MGR), QA Manager, Service, or Administrator.</span>
              </div>
            )}

            {registerError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{registerError}</span>
              </div>
            )}

            {/* Category Selector Tabs inside Modal */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '4px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => handleRegisterCategoryChange('manufactured')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: registerCategory === 'manufactured' ? 700 : 500,
                  background: registerCategory === 'manufactured' ? '#7A1F3D' : 'transparent',
                  color: registerCategory === 'manufactured' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Cpu size={14} />
                <span>GPS Manufactured</span>
              </button>

              <button
                type="button"
                onClick={() => handleRegisterCategoryChange('repair')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: registerCategory === 'repair' ? 700 : 500,
                  background: registerCategory === 'repair' ? '#c2410c' : 'transparent',
                  color: registerCategory === 'repair' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Wrench size={14} />
                <span>Customer Repair Job</span>
              </button>

              <button
                type="button"
                onClick={() => handleRegisterCategoryChange('catalog')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: registerCategory === 'catalog' ? 700 : 500,
                  background: registerCategory === 'catalog' ? '#1d4ed8' : 'transparent',
                  color: registerCategory === 'catalog' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Box size={14} />
                <span>Known OEM Catalog</span>
              </button>
            </div>

            {isLoadingMeta ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin-icon" style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                <div>Loading engineering models and database directory...</div>
              </div>
            ) : (
              <div className="form-grid">
                {/* Field 1: Serial / Asset ID */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Serial Number / Asset ID *</span>
                    {suggestedSerial && registerCategory === 'manufactured' && (
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        onClick={() => setFormData(p => ({ ...p, serialNumber: suggestedSerial }))}
                      >
                        Reset ({suggestedSerial})
                      </button>
                    )}
                  </label>
                  <input 
                    type="text" 
                    className="form-control mono" 
                    value={formData.serialNumber}
                    onChange={(e) => setFormData(p => ({ ...p, serialNumber: e.target.value.toUpperCase() }))}
                    placeholder={registerCategory === 'manufactured' ? 'e.g. GPS-2026-0850' : (registerCategory === 'repair' ? 'e.g. KES-2024-9102' : 'e.g. CAT-IBAG-170')}
                    required
                  />
                </div>

                {/* Field 2: Make */}
                <div className="form-group">
                  <label className="form-label">Spindle Make / OEM *</label>
                  {registerCategory === 'manufactured' ? (
                    <input 
                      type="text" 
                      className="form-control" 
                      value="GPS Spindle" 
                      disabled 
                      style={{ background: '#f1f5f9' }}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.make}
                      onChange={(e) => setFormData(p => ({ ...p, make: e.target.value }))}
                      placeholder="e.g. Franz Kessler, Weiss, Fischer, Setco, IBAG..."
                      required
                    />
                  )}
                </div>

                {/* Field 3: Model */}
                {registerCategory === 'manufactured' ? (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Spindle Engineering Model Master *</label>
                    <CustomSelect 
                      value={formData.modelId}
                      onChange={(e) => handleModelSelect(e.target.value)}
                      placeholder="-- Select GPS Engineering Model --"
                      searchable={true}
                      required={true}
                      options={models.map(m => ({
                        value: m.id,
                        label: `${m.model_code} — ${m.model_name} (${m.max_rpm ? (m.max_rpm / 1000).toFixed(0) : '24'}k RPM, ${m.rated_power_kw} kW)`
                      }))}
                    />
                  </div>
                ) : (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Model Designation / Code *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.model}
                      onChange={(e) => setFormData(p => ({ ...p, model: e.target.value }))}
                      placeholder="e.g. DMS 112.AL.4.FOS or HSC 170-40/12"
                      required
                    />
                  </div>
                )}

                {/* Field 4: Customer / Machine */}
                <div className="form-group">
                  <label className="form-label">
                    {registerCategory === 'catalog' ? 'Benchmark Reference' : 'Customer Account / Client'}
                  </label>
                  {customers.length > 0 ? (
                    <CustomSelect 
                      value={formData.customerId}
                      onChange={(e) => {
                        const cust = customers.find(c => c.id === e.target.value);
                        setFormData(p => ({
                          ...p,
                          customerId: e.target.value,
                          customer: cust ? cust.company_name : ''
                        }));
                      }}
                      placeholder="-- Select Customer or Stock --"
                      searchable={true}
                      options={[
                        { value: '', label: registerCategory === 'catalog' ? '-- Benchmark Catalog Asset --' : '-- Internal Stock / Unallocated --' },
                        ...customers.map(c => ({
                          value: c.id,
                          label: `${c.company_name} (${c.customer_code})`
                        }))
                      ]}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.customer}
                      onChange={(e) => setFormData(p => ({ ...p, customer: e.target.value }))}
                      placeholder="Customer Company Name"
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Machine Tool / Application</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.machineTool}
                    onChange={(e) => setFormData(p => ({ ...p, machineTool: e.target.value }))}
                    placeholder="e.g. Makino A51nx, DMG Mori NHX 4000, Fanuc Robodrill..."
                  />
                </div>

                {/* Repair Specific Fields: Inward Job # and Defect */}
                {registerCategory === 'repair' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Inward Service Job Number</label>
                      <input 
                        type="text" 
                        className="form-control mono" 
                        value={formData.inwardJobNumber}
                        onChange={(e) => setFormData(p => ({ ...p, inwardJobNumber: e.target.value }))}
                        placeholder="e.g. JOB-2026-9102"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Dispatch / Delivery Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={formData.targetDispatchDate}
                        onChange={(e) => setFormData(p => ({ ...p, targetDispatchDate: e.target.value }))}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Reported Defect & Failure Symptoms</label>
                      <textarea 
                        className="form-control" 
                        rows={2}
                        value={formData.defectReason}
                        onChange={(e) => setFormData(p => ({ ...p, defectReason: e.target.value }))}
                        placeholder="e.g. Bearing seizure, heavy tool collision, taper damaged, runout >15µm, motor overheating..."
                      />
                    </div>
                  </>
                )}

                {/* Technical Specs: Taper, RPM, Power, Lubrication */}
                <div className="form-group">
                  <label className="form-label">Taper Interface</label>
                  <CustomSelect 
                    value={formData.taper}
                    onChange={(e) => setFormData(p => ({ ...p, taper: e.target.value }))}
                    options={[
                      { value: 'HSK-A63', label: 'HSK-A63' },
                      { value: 'HSK-A100', label: 'HSK-A100' },
                      { value: 'HSK-E40', label: 'HSK-E40' },
                      { value: 'HSK-E50', label: 'HSK-E50' },
                      { value: 'BT40 (Big Plus)', label: 'BT40 (Big Plus)' },
                      { value: 'BT50', label: 'BT50' },
                      { value: 'ISO 30', label: 'ISO 30' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Operating RPM</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={formData.maxRpm}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData(p => ({ ...p, maxRpm: val, rpm: `${val.toLocaleString()} RPM` }));
                    }}
                    placeholder="e.g. 24000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rated Power & Torque</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.power}
                      onChange={(e) => setFormData(p => ({ ...p, power: e.target.value }))}
                      placeholder="e.g. 15 kW"
                      style={{ flex: 1 }}
                    />
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.torque}
                      onChange={(e) => setFormData(p => ({ ...p, torque: e.target.value }))}
                      placeholder="e.g. 32 Nm"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Operational Status</label>
                  <CustomSelect 
                    value={formData.status}
                    onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                    options={[
                      { value: 'In Production', label: 'In Production' },
                      { value: 'QC Pending', label: 'QC Pending' },
                      { value: 'QC Passed', label: 'QC Passed' },
                      { value: 'Ready', label: 'Ready for Dispatch' },
                      { value: 'Operational', label: 'Operational in Field' },
                      { value: 'Under Service', label: 'Under Service / Repair' },
                      { value: 'Cataloged Asset', label: 'Cataloged Asset' }
                    ]}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Workshop Location / Facility</label>
                  <CustomSelect 
                    value={formData.currentLocation}
                    onChange={(e) => setFormData(p => ({ ...p, currentLocation: e.target.value }))}
                    options={[
                      { value: 'Pune Plant 1', label: 'Pune Plant 1 (Precision Spindle Works)' },
                      { value: 'Pune Plant 2', label: 'Pune Plant 2 (Heavy Machining)' },
                      { value: 'Bangalore Service Hub', label: 'Bangalore Service Hub' },
                      { value: 'Engineering Database', label: 'Engineering Technical Master Database' }
                    ]}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Technical Notes & Overhaul Scope</label>
                  <textarea 
                    className="form-control" 
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Assembly notes, bearing clearance standards, client purchase order reference..."
                  />
                </div>
              </div>
            )}
          </form>
        </Modal>

        {/* Modal 2: Service History & Technical Specs Modal */}
        {selectedSpindleForHistory && (
          <Modal
            isOpen={Boolean(selectedSpindleForHistory)}
            onClose={() => setSelectedSpindleForHistory(null)}
            title={`Spindle Asset Details: ${selectedSpindleForHistory.serialNumber}`}
            footer={
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedSpindleForHistory(null)}
              >
                Close
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              {/* Header Badge Card */}
              <div style={{
                padding: '14px',
                borderRadius: '8px',
                background: selectedSpindleForHistory.category === 'repair' ? '#fff7ed' : '#f8fafc',
                border: `1px solid ${selectedSpindleForHistory.category === 'repair' ? '#ffedd5' : '#e2e8f0'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {selectedSpindleForHistory.category === 'manufactured' ? 'GPS OEM Manufactured' : (selectedSpindleForHistory.category === 'repair' ? 'Customer Inward Overhaul Unit' : 'OEM Fleet Benchmark')}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedSpindleForHistory.make} — {selectedSpindleForHistory.model}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                    Customer: <strong>{selectedSpindleForHistory.customer}</strong> {selectedSpindleForHistory.machineTool ? `• Machine: ${selectedSpindleForHistory.machineTool}` : ''}
                  </div>
                </div>
                <div>
                  <StatusBadge status={selectedSpindleForHistory.status} />
                </div>
              </div>

              {/* Repair Diagnostics (if repair) */}
              {selectedSpindleForHistory.category === 'repair' && (
                <div style={{
                  padding: '12px',
                  borderRadius: '6px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e'
                }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Wrench size={14} />
                    <span>Inward Job Details: {selectedSpindleForHistory.inwardJobNumber || 'JOB-ACTIVE'}</span>
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                    <strong>Reported Fault / Symptoms:</strong> {selectedSpindleForHistory.defectReason || 'Bearing fatigue wear and high vibration under load. Scheduled complete overhaul and rebalancing.'}
                  </div>
                  {selectedSpindleForHistory.stage && (
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      <strong>Current Overhaul Stage:</strong> {selectedSpindleForHistory.stage}
                    </div>
                  )}
                </div>
              )}

              {/* Technical Specifications Grid */}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Engineering Specifications:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px 16px',
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px'
                }}>
                  <div><strong>Taper Interface:</strong> {selectedSpindleForHistory.taper || selectedSpindleForHistory.interface}</div>
                  <div><strong>Max Speed:</strong> {selectedSpindleForHistory.rpm}</div>
                  <div><strong>Rated Power:</strong> {selectedSpindleForHistory.power}</div>
                  <div><strong>Torque:</strong> {selectedSpindleForHistory.torque || '32 Nm'}</div>
                  <div><strong>Bearings:</strong> {selectedSpindleForHistory.bearings || 'Ceramic Hybrid Precision'}</div>
                  <div><strong>Lubrication:</strong> {selectedSpindleForHistory.lubrication || 'Air-Oil Mist'}</div>
                  <div><strong>Cooling Spec:</strong> {selectedSpindleForHistory.cooling || 'Water-Glycol Closed Circuit'}</div>
                  <div><strong>Warranty:</strong> {selectedSpindleForHistory.warranty || 'Standard'}</div>
                </div>
              </div>

              {/* Quality & Metrology Readings */}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  Metrology & Inspection Parameters:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nose Runout</div>
                    <div className="mono" style={{ fontWeight: 700, color: '#059669', fontSize: '13px' }}>
                      {selectedSpindleForHistory.runout || '0.6 µm'}
                    </div>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vibration RMS</div>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {selectedSpindleForHistory.vibration || '0.27 mm/s'}
                    </div>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Balance Grade</div>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {selectedSpindleForHistory.balanceGrade || 'ISO G0.4'}
                    </div>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clamp Force</div>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {selectedSpindleForHistory.clampForce || '18.4 kN'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSpindleForHistory.notes && (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Workshop & Engineering Notes:
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {selectedSpindleForHistory.notes}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Modal 3: Quick Status & Stage Update Modal */}
        {selectedSpindleForUpdate && (
          <Modal
            isOpen={Boolean(selectedSpindleForUpdate)}
            onClose={() => !isUpdating && setSelectedSpindleForUpdate(null)}
            title={`Update Spindle Asset: ${selectedSpindleForUpdate.serialNumber}`}
            footer={
              <>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedSpindleForUpdate(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleUpdateSubmit}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw size={14} className="spin-icon" />
                      <span>Saving Updates...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </>
            }
          >
            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '10px 12px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                lineHeight: 1.5
              }}>
                <div><strong>Make & Model:</strong> {selectedSpindleForUpdate.make} — {selectedSpindleForUpdate.model}</div>
                <div><strong>Customer:</strong> {selectedSpindleForUpdate.customer}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Operational Status</label>
                <CustomSelect 
                  value={updateFormData.status}
                  onChange={(e) => setUpdateFormData(p => ({ ...p, status: e.target.value }))}
                  options={[
                    { value: 'In Production', label: 'In Production' },
                    { value: 'QC Pending', label: 'QC Pending' },
                    { value: 'QC Passed', label: 'QC Passed' },
                    { value: 'Ready', label: 'Ready for Dispatch' },
                    { value: 'Operational', label: 'Operational in Field' },
                    { value: 'Under Service', label: 'Under Service / Repair' },
                    { value: 'Cataloged Asset', label: 'Cataloged Asset' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Workshop Stage</label>
                <CustomSelect 
                  value={updateFormData.stage}
                  onChange={(e) => setUpdateFormData(p => ({ ...p, stage: e.target.value }))}
                  options={[
                    { value: 'Under Inspection', label: 'Under Inspection & Strip-Down' },
                    { value: 'Shaft Grinding', label: 'Shaft Cylindrical Grinding' },
                    { value: 'New Bearings Fitting', label: 'Super-Precision Bearings Fitting' },
                    { value: 'Dynamic Balancing', label: 'High-Speed Dynamic Balancing (ISO G0.4)' },
                    { value: 'Final Run-in Test Bay', label: 'Final Run-in & Heat Run Test Bay' },
                    { value: 'Machining', label: 'Machining' },
                    { value: 'Assembly', label: 'Precision Assembly' },
                    { value: 'Final Inspection', label: 'Final Quality Inspection' },
                    { value: 'Dispatch Ready', label: 'Packaged & Ready for Dispatch' }
                  ]}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Runout Measured (µm)</label>
                  <input 
                    type="text" 
                    className="form-control mono" 
                    value={updateFormData.runout}
                    onChange={(e) => setUpdateFormData(p => ({ ...p, runout: e.target.value }))}
                    placeholder="e.g. 0.6 µm"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vibration RMS (mm/s)</label>
                  <input 
                    type="text" 
                    className="form-control mono" 
                    value={updateFormData.vibration}
                    onChange={(e) => setUpdateFormData(p => ({ ...p, vibration: e.target.value }))}
                    placeholder="e.g. 0.27 mm/s"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Workshop Progress Log & Notes</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  value={updateFormData.notes}
                  onChange={(e) => setUpdateFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Record recent test results, technician remarks, or delivery updates..."
                />
              </div>
            </form>
          </Modal>
        )}

        {/* Modal 4: Delete Asset Confirmation Modal */}
        {deleteConfirmSpindle && (
          <Modal
            isOpen={Boolean(deleteConfirmSpindle)}
            onClose={() => !isDeleting && setDeleteConfirmSpindle(null)}
            title="Confirm Spindle Deletion"
            footer={
              <>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setDeleteConfirmSpindle(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteSpindle}
                  disabled={isDeleting}
                  style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Spindle'}
                </button>
              </>
            }
          >
            <div style={{ padding: '12px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Are you sure you want to remove spindle <strong>{deleteConfirmSpindle.serialNumber}</strong> ({deleteConfirmSpindle.make} — {deleteConfirmSpindle.model}) from the master registry?
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                This will delete the asset record from the active ERP registry.
              </p>
            </div>
          </Modal>
        )}

        {/* Spindle Registry Pop-up PDF Preview Modal */}
        <DocumentPreviewModal 
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          doc={previewDoc}
          onNotify={onNotify}
        />
      </div>
    </div>
  );
}
