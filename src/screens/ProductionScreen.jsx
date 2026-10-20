import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Modal from '../components/common/Modal';
import Tabs from '../components/common/Tabs';
import CustomSelect from '../components/common/CustomSelect';
import { PRODUCTION_PIPELINE_STAGES, SEED_QUOTATIONS, CUSTOMERS } from '../data/mockData';
import { workOrderService } from '../services/database/workOrderService';
import { manufacturingService } from '../services/database/manufacturingService';
import { salesService, customerService } from '../services/database';
import { TablePageSkeleton } from '../components/common/Skeleton';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import {
  Plus, Search, Filter, Eye, ArrowRight, Cog,
  Wrench, Layers, Factory, Check, RefreshCw, AlertCircle, Download,
  Activity, Thermometer, Gauge, Zap, CheckCircle2, ShieldCheck, Clock,
  FileText, X, Sparkles, Building2, Hash, Calendar, Tag, AlertTriangle, Users,
  MessageSquare, UserPlus, UserCheck, User, HardHat, CheckCircle
} from 'lucide-react';
import { workforceService } from '../services/database/workforceService';
import { DEFAULT_SHOP_STAFF } from './WorkOrderDetailScreen';

export default function ProductionScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedStage, setSelectedStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('table');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isNewWoOpen, setIsNewWoOpen] = useState(false);
  const [isSubmittingWo, setIsSubmittingWo] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sales Quotations integration state for Quick-Fill
  const [quotationsList, setQuotationsList] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [quoteFilterApprovedOnly, setQuoteFilterApprovedOnly] = useState(true);
  const [customersList, setCustomersList] = useState([]);

  // Comprehensive Production Job Order Form State
  const [newWo, setNewWo] = useState({
    workOrderNo: '',
    spindleModel: 'GPS-HSK-A63-24K',
    customModel: '',
    customer: '',
    serial: '',
    priority: 'Normal',
    dueDate: '',
    initialStage: 'material',
    quantity: 1,
    value: '',
    assignedOperator: '',
    notes: ''
  });

  // Assign Staff Operator Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetWo, setAssignTargetWo] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffDeptFilter, setStaffDeptFilter] = useState('all');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignShift, setAssignShift] = useState('General (08:30 - 17:30)');
  const [assignStation, setAssignStation] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const loadProductionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Read locally created work orders from browser storage
    let localWos = [];
    try {
      const stored = localStorage.getItem('gps_local_work_orders');
      if (stored) localWos = JSON.parse(stored);
    } catch (e) {
      console.warn('Could not parse local work orders:', e);
    }

    const [wosRes, quotesRes, custRes, staffRes] = await Promise.allSettled([
      workOrderService.getWorkOrders(),
      salesService.getQuotations(),
      customerService.getCustomers(),
      workforceService.getStaffList()
    ]);

    const wosData = wosRes.status === 'fulfilled' && !wosRes.value.error ? (wosRes.value.data || []) : [];
    const quotesData = quotesRes.status === 'fulfilled' && !quotesRes.value.error ? (quotesRes.value.data || []) : [];
    const custData = custRes.status === 'fulfilled' && !custRes.value.error ? (custRes.value.data || []) : [];

    // Load staff roster
    let localStaff = [];
    try {
      const stored = localStorage.getItem('gps_local_workforce_staff');
      if (stored) localStaff = JSON.parse(stored);
    } catch (_e) {}

    const liveStaff = staffRes.status === 'fulfilled' && !staffRes.value.error ? (staffRes.value.data || []) : [];
    const baseStaff = liveStaff.length > 0 ? liveStaff : DEFAULT_SHOP_STAFF;
    const mergedStaff = baseStaff.map(emp => {
      const local = localStaff.find(l => l.id === emp.id || l.employeeCode === emp.employeeCode);
      return local ? { ...emp, ...local } : emp;
    });
    setStaffList(mergedStaff);

    // Merge API/mock work orders with locally updated/created work orders
    // Local updates take precedence because operator assignment and stage progression happen in Workforce
    const localMap = new Map();
    localWos.forEach(w => {
      if (w.id) localMap.set(w.id, w);
      if (w.workOrderNo) localMap.set(w.workOrderNo, w);
    });

    const mergedWosData = wosData.map(dw => {
      const idKey = dw.id || dw.workOrderNo;
      const localMatch = localMap.get(idKey);
      return localMatch ? { ...dw, ...localMatch } : dw;
    });

    const seenIds = new Set(mergedWosData.map(w => w.id || w.workOrderNo));
    const extraLocal = localWos.filter(w => !seenIds.has(w.id || w.workOrderNo));
    const combinedWos = [...extraLocal, ...mergedWosData];

    setWorkOrders(combinedWos.length > 0 ? combinedWos : []);

    // Quotations for Quick-Fill
    if (quotesData.length > 0) {
      setQuotationsList(quotesData);
    } else if (SEED_QUOTATIONS && SEED_QUOTATIONS.length > 0) {
      setQuotationsList(SEED_QUOTATIONS);
    }

    // Customers for suggestions
    if (custData.length > 0) {
      setCustomersList(custData.map(c => c.company_name || c.name));
    } else if (CUSTOMERS && CUSTOMERS.length > 0) {
      setCustomersList(CUSTOMERS.map(c => c.name || c.company_name));
    }

    setIsLoading(false);
  }, []);

  // Filtered staff list for the Assign Modal
  const filteredStaffForAssignment = useMemo(() => {
    return staffList.filter(staff => {
      const q = staffSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || (
        staff.name?.toLowerCase().includes(q) ||
        staff.designation?.toLowerCase().includes(q) ||
        staff.department?.toLowerCase().includes(q) ||
        staff.role?.toLowerCase().includes(q) ||
        (staff.employeeCode && staff.employeeCode.toLowerCase().includes(q)) ||
        (staff.id && String(staff.id).toLowerCase().includes(q)) ||
        (Array.isArray(staff.skills) && staff.skills.some(sk => sk.toLowerCase().includes(q)))
      );

      const matchesDept = staffDeptFilter === 'all' || 
        (staff.department && staff.department.toLowerCase().includes(staffDeptFilter.toLowerCase())) ||
        (staff.role && staff.role.toLowerCase().includes(staffDeptFilter.toLowerCase()));

      return matchesSearch && matchesDept;
    });
  }, [staffList, staffSearchQuery, staffDeptFilter]);

  // Open Assign Modal for a Work Order
  const handleOpenAssignModal = (wo) => {
    setAssignTargetWo(wo);
    const rawOp = wo.leadOperator || wo.assignedOperator || wo.assignedTo || '';
    const cleanOpName = rawOp ? rawOp.replace(/\s*\(.*\)/, '').trim().toLowerCase() : '';
    const matched = staffList.find(s => 
      s.name?.toLowerCase() === cleanOpName || 
      (cleanOpName && s.name?.toLowerCase().includes(cleanOpName)) ||
      (cleanOpName && cleanOpName.includes(s.name?.toLowerCase()))
    );
    setSelectedStaffId(matched?.id || staffList[0]?.id || '');
    setAssignStation(wo.machine || (wo.currentStage === 'machining' ? 'Okuma LB3000 CNC Lathe' : 'Saw & Pit Furnace'));
    setAssignShift('General (08:30 - 17:30)');
    setAssignNotes(wo.notes || wo.technicianNotes || `Assigned to ${wo.id} for ${wo.currentOperation || 'Machining'}.`);
    setStaffSearchQuery('');
    setStaffDeptFilter('all');
    setIsAssignModalOpen(true);
  };

  // Save Operator Assignment
  const handleSaveAssignment = async () => {
    if (!assignTargetWo || !selectedStaffId) return;
    const selectedStaff = staffList.find(s => s.id === selectedStaffId);
    if (!selectedStaff) {
      if (onNotify) onNotify('Please select a staff member to assign.');
      return;
    }

    setIsSavingAssignment(true);
    try {
      const operatorFormatted = `${selectedStaff.name} (${selectedStaff.designation || selectedStaff.role || 'Specialist'})`;
      const woId = assignTargetWo.id || assignTargetWo.workOrderNo;

      // 1. Update localStorage 'gps_local_work_orders'
      let localWos = [];
      try {
        const stored = localStorage.getItem('gps_local_work_orders');
        if (stored) localWos = JSON.parse(stored);
      } catch (e) {}

      const updatedWo = {
        ...assignTargetWo,
        leadOperator: selectedStaff.name,
        assignedOperator: operatorFormatted,
        assignedTo: selectedStaff.name,
        machine: assignStation || assignTargetWo.machine,
        technicianNotes: assignNotes || assignTargetWo.notes
      };

      const existingIdx = localWos.findIndex(w => (w.id || w.workOrderNo) === woId);
      if (existingIdx >= 0) {
        localWos[existingIdx] = { ...localWos[existingIdx], ...updatedWo };
      } else {
        localWos.push(updatedWo);
      }
      localStorage.setItem('gps_local_work_orders', JSON.stringify(localWos));

      // 2. Update local state
      setWorkOrders(prev => prev.map(wo => {
        if ((wo.id || wo.workOrderNo) === woId) {
          return { ...wo, ...updatedWo };
        }
        return wo;
      }));

      // 3. Update staff in 'gps_local_workforce_staff'
      let localStaff = [];
      try {
        localStaff = JSON.parse(localStorage.getItem('gps_local_workforce_staff') || '[]');
      } catch (e) {}
      const updatedStaff = staffList.map(s => {
        if (s.id === selectedStaff.id) {
          return {
            ...s,
            status: 'Working',
            workOrder: woId,
            currentTask: `${assignTargetWo.currentOperation || 'Production'} Operation`,
            machine: assignStation || s.machine
          };
        }
        return s;
      });
      setStaffList(updatedStaff);
      localStorage.setItem('gps_local_workforce_staff', JSON.stringify(updatedStaff));

      // 4. Also attempt database update if dbId exists
      if (assignTargetWo.dbId) {
        try {
          await workOrderService.updateWorkOrderStatus(assignTargetWo.dbId, assignTargetWo.status || 'In Progress');
        } catch (dbErr) {
          console.warn('[ProductionScreen] Database update warning:', dbErr);
        }
      }

      if (onNotify) {
        onNotify(`Successfully assigned ${selectedStaff.name} as Lead Operator for ${woId}`);
      }
      setIsAssignModalOpen(false);
    } catch (err) {
      console.error('[ProductionScreen] Failed to assign staff:', err);
      if (onNotify) onNotify(`Failed to assign staff: ${err.message}`);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  useEffect(() => {
    loadProductionData();

    // Listen for live updates across ERP screens (Sales, Quotations, Customers, Work Orders, Workforce)
    const handleEntityUpdate = (e) => {
      const entity = e.detail?.entity;
      if (!entity || entity === 'work-orders' || entity === 'production' || entity === 'workforce' || entity === 'quotations' || entity === 'sales') {
        loadProductionData();
      }
    };
    window.addEventListener('gps_entities_updated', handleEntityUpdate);
    return () => window.removeEventListener('gps_entities_updated', handleEntityUpdate);
  }, [loadProductionData]);

  // Dynamic pipeline stage counts based on live work orders
  const dynamicStages = PRODUCTION_PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: workOrders.filter(w => (w.currentStage || '').toLowerCase() === stage.key.toLowerCase()).length
  }));

  const filteredOrders = workOrders.filter((wo) => {
    const matchesStage = selectedStage === 'all' || (wo.currentStage || '').toLowerCase() === selectedStage.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || (wo.priority || '').toLowerCase() === priorityFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      (wo.id || '').toLowerCase().includes(query) ||
      (wo.spindleSerial || '').toLowerCase().includes(query) ||
      (wo.customer || '').toLowerCase().includes(query) ||
      (wo.spindleModel || '').toLowerCase().includes(query);
    return matchesStage && matchesPriority && matchesSearch;
  });

  // Executive KPI summary metrics
  const productionStats = useMemo(() => {
    const total = workOrders.length;
    const criticalHigh = workOrders.filter(w => w.priority === 'Critical' || w.priority === 'High').length;
    const assemblyTest = workOrders.filter(w => ['assembly', 'balancing', 'testing'].includes((w.currentStage || w.stage || '').toLowerCase())).length;
    const onTimeCount = workOrders.filter(w => (Number(w.progress) || 0) >= 50 || w.status === 'Completed').length;
    const slaRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 98;
    return { total, criticalHigh, assemblyTest, slaRate };
  }, [workOrders]);

  // Live count of approved quotations available for job creation
  const approvedQuotesCount = useMemo(() => {
    return quotationsList.filter(q => {
      const st = (q.status || q.rawStatus || '').toLowerCase();
      return st === 'approved';
    }).length;
  }, [quotationsList]);

  // Filtered quotations matching search term and approval filter
  const filteredQuotations = useMemo(() => {
    const query = (quoteSearchQuery || '').trim().toLowerCase();
    return quotationsList.filter(q => {
      const isApproved = (q.status || q.rawStatus || '').toLowerCase() === 'approved';
      if (quoteFilterApprovedOnly && !isApproved) return false;
      if (!query) return true;

      const estNo = (q.estimateNo || q.id || '').toLowerCase();
      const cust = (q.customer || q.customer_name || '').toLowerCase();
      const serial = (q.spindleSerial || q.spindle_serial || '').toLowerCase();
      const contact = (q.contactPerson || '').toLowerCase();
      const items = (q.items || []).map(it => `${it.name || ''} ${it.desc || ''}`).join(' ').toLowerCase();
      const scope = Array.isArray(q.scopeOfWork) ? q.scopeOfWork.join(' ').toLowerCase() : (q.scopeOfWork || '').toLowerCase();

      return estNo.includes(query) ||
        cust.includes(query) ||
        serial.includes(query) ||
        contact.includes(query) ||
        items.includes(query) ||
        scope.includes(query);
    });
  }, [quotationsList, quoteSearchQuery, quoteFilterApprovedOnly]);

  // Auto-fill Production Job details from an approved commercial quotation
  const handleSelectQuotation = (quote) => {
    setSelectedQuotation(quote);

    const itemsText = (quote.items || []).map(i => `${i.name || ''} ${i.desc || ''}`).join(' ');
    const scopeText = Array.isArray(quote.scopeOfWork) ? quote.scopeOfWork.join(' ') : (quote.scopeOfWork || '');
    const combinedText = `${quote.spindleSerial || ''} ${itemsText} ${scopeText}`.toLowerCase();

    // Spindle Model Family detection
    let detectedModel = 'GPS-HSK-A63-24K';
    let customModel = '';
    if (combinedText.includes('kesslar') || combinedText.includes('kessler')) {
      detectedModel = '__custom__';
      customModel = 'Kessler HSK-63 Motorized Spindle';
    } else if (combinedText.includes('bt50') || combinedText.includes('bt-50')) {
      detectedModel = 'GPS-BT50-10K';
    } else if (combinedText.includes('bt40') || combinedText.includes('bt-40')) {
      detectedModel = 'GPS-BT40-15K';
    } else if (combinedText.includes('hf-60k') || combinedText.includes('60,000') || combinedText.includes('hsk-e25')) {
      detectedModel = 'GPS-HF-60K';
    } else if (combinedText.includes('hsk-e40') || combinedText.includes('42,000') || combinedText.includes('e25-42k')) {
      detectedModel = 'GPS-HSK-E25-42K';
    } else if (combinedText.includes('hsk-a63') || combinedText.includes('hsk63') || combinedText.includes('hsk-63')) {
      detectedModel = 'GPS-HSK-A63-24K';
    }

    const rawCost = Number(quote.totalAmount || quote.subtotal || 0);
    const formattedVal = rawCost > 0 ? `₹${rawCost.toLocaleString('en-IN')}` : '₹8,45,000';

    let totalQty = 1;
    if (Array.isArray(quote.items) && quote.items.length > 0) {
      const spindleItem = quote.items.find(i => (i.name || i.desc || '').toLowerCase().includes('spindle'));
      if (spindleItem && spindleItem.qty) totalQty = Number(spindleItem.qty) || 1;
    }

    let quoteNotes = '';
    if (Array.isArray(quote.scopeOfWork) && quote.scopeOfWork.length > 0) {
      quoteNotes = `Quoted Scope: ${quote.scopeOfWork.slice(0, 4).join('; ')}`;
    } else if (quote.items && quote.items.length > 0) {
      const itemNames = quote.items.map(i => i.desc || i.name).filter(Boolean).slice(0, 3).join(', ');
      quoteNotes = `Quoted Specifications: ${itemNames}`;
    }

    setNewWo(prev => ({
      ...prev,
      customer: quote.customer || prev.customer,
      spindleModel: detectedModel,
      customModel: customModel,
      serial: quote.spindleSerial || prev.serial,
      dueDate: quote.validUntil || prev.dueDate,
      priority: 'High',
      value: formattedVal,
      quantity: totalQty,
      notes: quoteNotes ? `${quoteNotes}` : `Imported from Approved Quotation ${quote.estimateNo || quote.id}. Quoted Value: ${formattedVal}. Date: ${quote.date || 'Recent'}.`
    }));

    if (onNotify) {
      onNotify(`Auto-filled production order details from Quotation ${quote.estimateNo || quote.id} (${quote.customer})`, 'info');
    }
  };

  const handleClearSelectedQuotation = () => {
    setSelectedQuotation(null);
  };

  // Open New Work Order / Production Job Order modal with computed defaults
  const handleOpenNewWoModal = () => {
    setSelectedQuotation(null);
    setQuoteSearchQuery('');
    setQuoteFilterApprovedOnly(true);

    const existingNums = workOrders
      .map(w => {
        const m = (w.id || w.workOrderNo || '').match(/WO-\d+-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : (workOrders.length + 104);
    const nextWoNum = `WO-2026-${String(maxNum + 1).padStart(3, '0')}`;
    const nextSerialNum = `GPS-2026-${String(850 + maxNum + 1).padStart(4, '0')}`;
    const targetDate = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0];

    const defaultCustomer = customersList[0] || '';

    setNewWo({
      workOrderNo: nextWoNum,
      spindleModel: 'GPS-HSK-A63-24K',
      customModel: '',
      customer: defaultCustomer,
      serial: '',
      priority: 'Normal',
      dueDate: targetDate,
      initialStage: 'material',
      quantity: 1,
      value: '',
      assignedOperator: '',
      notes: ''
    });
    setIsNewWoOpen(true);
  };

  const handleCreateWo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newWo.customer?.trim()) {
      if (onNotify) onNotify('Please enter or select a customer organization.', 'warning');
      return;
    }
    if (!newWo.serial?.trim()) {
      if (onNotify) onNotify('Please enter a spindle serial number.', 'warning');
      return;
    }

    try {
      setIsSubmittingWo(true);
      const woNumber = newWo.workOrderNo?.trim() || `WO-2026-${String(100 + workOrders.length + 1).padStart(3, '0')}`;
      const resolvedModel = newWo.spindleModel === '__custom__' ? (newWo.customModel || 'Custom Spindle') : newWo.spindleModel;
      const cleanValueNum = Number(String(newWo.value || '').replace(/[^0-9]/g, '')) || 845000;
      const formattedValue = `₹${cleanValueNum.toLocaleString('en-IN')}`;
      const initialStageKey = newWo.initialStage || 'material';

      const newWoRecord = {
        id: woNumber,
        dbId: `wo-${Date.now()}`,
        workOrderNo: woNumber,
        spindleSerial: newWo.serial.trim(),
        spindleModel: resolvedModel,
        customer: newWo.customer.trim(),
        customerId: 'CUST-01',
        quotationNo: selectedQuotation ? (selectedQuotation.estimateNo || selectedQuotation.id) : null,
        linkedQuotationId: selectedQuotation ? selectedQuotation.id : null,
        currentOperation: initialStageKey === 'material' ? 'Raw Bar Stock Cutting & Stress Relieving' : `Stage: ${initialStageKey}`,
        currentStage: initialStageKey,
        machine: 'Saw & Pit Furnace / Okuma CNC',
        assignedOperator: newWo.assignedOperator || 'D. Shinde (Machining Specialist)',
        priority: newWo.priority || 'High',
        dueDate: newWo.dueDate || new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
        progress: 0,
        status: 'Planned',
        totalOps: 8,
        completedOps: 0,
        bomShortage: false,
        value: formattedValue,
        quantity: Number(newWo.quantity) || 1,
        notes: selectedQuotation
          ? (newWo.notes?.trim()
            ? `[Linked Quote: ${selectedQuotation.estimateNo || selectedQuotation.id}] ${newWo.notes.trim()}`
            : `Linked to Approved Quotation ${selectedQuotation.estimateNo || selectedQuotation.id}. Value: ${formattedValue}.`)
          : (newWo.notes?.trim() || `Production job order initiated for ${newWo.customer}. Model: ${resolvedModel}.`),
        specifications: {
          maxSpeed: resolvedModel.includes('60K') ? '60,000 RPM' : (resolvedModel.includes('42K') ? '42,000 RPM' : (resolvedModel.includes('15K') ? '15,000 RPM' : (resolvedModel.includes('10K') ? '10,000 RPM' : '24,000 RPM'))),
          ratedPower: resolvedModel.includes('10K') ? '22.0 kW' : (resolvedModel.includes('15K') ? '11.0 kW' : (resolvedModel.includes('60K') ? '5.5 kW' : '15.0 kW (S1 continuous)')),
          torque: resolvedModel.includes('10K') ? '160 Nm' : (resolvedModel.includes('15K') ? '48 Nm' : '32 Nm'),
          toolTaper: resolvedModel.includes('BT50') ? 'BT50' : (resolvedModel.includes('BT40') ? 'BT40 Dual Contact' : (resolvedModel.includes('E25') ? 'HSK-E25' : 'HSK-A63 DIN 69893')),
          taperRunoutLimit: '≤ 0.0010 mm',
          arborRunoutLimit: '≤ 0.0030 mm @ 300mm',
          drawbarForce: resolvedModel.includes('BT50') ? '25.0 kN ± 1.0' : (resolvedModel.includes('BT40') ? '12.0 kN ± 0.5' : '18.0 kN ± 1.0'),
          bearingArrangement: 'Matched Precision Ceramic Hybrid Bearing Set'
        },
        operations: [
          { id: 1, name: "Raw Bar Stock Cutting & Stress Relieving", machine: "Saw & Pit Furnace", operator: "D. Shinde", status: "In Progress", date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
          { id: 2, name: "CNC Rough Turning & Deep Hole Gun Drilling", machine: "Okuma LB3000 Lathe", operator: "R. Patil", status: "Upcoming", date: "Est. Day +2" },
          { id: 3, name: "Case Carburizing & Cryogenic Tempering (60-62 HRC)", machine: "Heat Treatment Facility", operator: "Heat Tech Pune", status: "Upcoming", date: "Est. Day +5" },
          { id: 4, name: "Cylindrical Grinding of Bearing Journals & Nose", machine: "Studer S33 CNC Grinder", operator: "S. Sawant", status: "Upcoming", date: "Est. Day +8" },
          { id: 5, name: "Class 1000 Cleanroom Bearing Assembly (Hot Induction)", machine: "Clean Room Assembly", operator: "V. Shinde", status: "Upcoming", date: "Est. Day +12" },
          { id: 6, name: "Dynamic Balancing to ISO 1940 Grade G0.4", machine: "Schenck Dynamic Rig", operator: "A. Kulkarni", status: "Upcoming", date: "Est. Day +14" },
          { id: 7, name: "4-Hour Dynamic Run-in & Thermal Stabilization Bench", machine: "Run-in Test Bench 2", operator: "R. Deshmukh", status: "Upcoming", date: "Est. Day +16" },
          { id: 8, name: "Final QC Air Gauging, Micron Inspection & Packing", machine: "Metrology Lab", operator: "M. Joshi (QC Lead)", status: "Upcoming", date: "Est. Day +18" },
        ]
      };

      // Try database insert in background
      try {
        await workOrderService.createWorkOrder({
          work_order_no: woNumber,
          serial: newWoRecord.spindleSerial,
          spindleModel: resolvedModel,
          customer: newWoRecord.customer,
          priority: newWoRecord.priority,
          dueDate: newWoRecord.dueDate,
          initialStage: initialStageKey,
          quantity: newWoRecord.quantity,
          notes: newWoRecord.notes
        });
      } catch (dbErr) {
        console.warn('Backend DB insert skipped, saving locally:', dbErr);
      }

      // Update local state
      const updatedWos = [newWoRecord, ...workOrders];
      setWorkOrders(updatedWos);

      // Save to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
        localStorage.setItem('gps_local_work_orders', JSON.stringify([newWoRecord, ...stored]));
        localStorage.setItem(`gps_wo_operations_${newWoRecord.id}`, JSON.stringify(newWoRecord.operations));
      } catch (e) {
        console.warn('Could not save work order to localStorage:', e);
      }

      // Emit global entity sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gps_entities_updated', {
          detail: { entity: 'work-orders', woId: newWoRecord.id }
        }));
      }

      setIsNewWoOpen(false);
      const linkedQuoteNo = selectedQuotation ? (selectedQuotation.estimateNo || selectedQuotation.id) : null;
      setSelectedQuotation(null);

      if (onNotify) {
        if (linkedQuoteNo) {
          onNotify(`Production Job Order ${woNumber} generated with Case File from Approved Quote ${linkedQuoteNo}! Manage technician assignment and stage progression in Staff & Workforce.`, 'success');
        } else {
          onNotify(`Production Job Order ${woNumber} generated with Case File! Manage technician assignment and stage progression in Staff & Workforce.`, 'success');
        }
      }
    } catch (err) {
      console.error('Failed to create production work order:', err);
      if (onNotify) onNotify(err.message || 'Failed to create work order', 'error');
    } finally {
      setIsSubmittingWo(false);
    }
  };

  // Loading State
  if (isLoading) {
    return <TablePageSkeleton columns={['100px', '110px', '160px', '140px', '120px', '90px', '90px', '70px']} rows={7} />;
  }

  // Error State
  if (error) {
    return (
      <div className="content-area">
        <PageHeader
          title="Production Management & Shop Floor Operations"
          subtitle="Live routing of precision spindles across 8 manufacturing stages"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '32px 24px', borderLeft: '4px solid var(--danger, #dc2626)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Unable to Load Production Operations
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {error.sanitizedMessage || error.message || 'Database connection error. Please verify authorization.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={loadProductionData}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader
        title="Production Management & Shop Floor Operations"
        subtitle="Generate production job orders & inspect engineering case files • Technician assignment & stage progress managed in Staff & Workforce"
        badge={`${workOrders.length} Active Orders`}
      >
        {onNavigate && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('workforce')}
            title="Manage technician assignments and stage progress in Staff & Workforce"
          >
            <Users size={14} />
            <span className="desktop-only-inline">Staff & Workforce</span>
            <span className="mobile-only-inline">Workforce</span>
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'SHOP FLOOR PRODUCTION SCHEDULE & ROUTING',
              id: `PROD-SCH-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Active Work Orders', value: workOrders.length },
                { label: 'Critical Priority', value: workOrders.filter(w => w.priority === 'Critical').length },
                { label: 'In Assembly / Test', value: workOrders.filter(w => ['assembly', 'balancing', 'testing'].includes(w.stage)).length }
              ],
              headers: ['#', 'WO Number', 'Spindle Model & Serial', 'Customer', 'Current Stage / Cell', 'Target Due Date', 'Priority'],
              rows: workOrders.map((wo, idx) => [
                idx + 1,
                wo.id || wo.workOrderNumber,
                `${wo.spindleModel} (${wo.serial || '—'})`,
                wo.customer,
                wo.currentStage || wo.stage || 'In Progress',
                wo.dueDate || '—',
                wo.priority
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span className="desktop-only-inline">Production Schedule (PDF)</span>
          <span className="mobile-only-inline">Schedule</span>
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenNewWoModal}
          style={{ background: '#7A1F3D', borderColor: '#7A1F3D' }}
        >
          <Plus size={14} />
          <span className="desktop-only-inline">Add Production Job Order</span>
          <span className="mobile-only-inline">+ Add Order</span>
        </button>
      </PageHeader>

      <div className="content-body">

        {/* ── KPI Executive Metrics Grid ── */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Active Work Orders</span>
              <div className="metric-icon-wrap" style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
                <Factory size={15} />
              </div>
            </div>
            <div className="metric-value">{productionStats.total}</div>
            <div className="metric-footer" style={{ color: 'var(--primary)' }}>
              Live Shop Floor Routing
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Critical & High Priority</span>
              <div className="metric-icon-wrap" style={{ color: '#dc2626', background: '#fee2e2' }}>
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#dc2626' }}>{productionStats.criticalHigh}</div>
            <div className="metric-footer" style={{ color: '#dc2626' }}>
              Line-Down Client Expedites
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">In Assembly & Testing</span>
              <div className="metric-icon-wrap" style={{ color: '#0284c7', background: '#e0f2fe' }}>
                <Gauge size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#0284c7' }}>{productionStats.assemblyTest}</div>
            <div className="metric-footer" style={{ color: '#0284c7' }}>
              Clean Room & Dynamic Rig
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">On-Time Completion Rate</span>
              <div className="metric-icon-wrap" style={{ color: '#059669', background: '#d1fae5' }}>
                <ShieldCheck size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#059669' }}>{productionStats.slaRate}%</div>
            <div className="metric-footer" style={{ color: '#059669' }}>
              Precision Manufacturing SLA
            </div>
          </div>
        </div>

        {/* Visual 8-Stage Interactive Pipeline */}
        <div className="section-card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div className="card-title">
              <Factory size={16} color="#7A1F3D" />
              <span>Manufacturing Flow: Raw Stock to Final Metrology</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${selectedStage === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedStage('all')}
              >
                All Stages ({workOrders.length})
              </button>
            </div>
          </div>
          <div style={{ padding: '16px 20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <PipelineVisualizer
              stages={dynamicStages}
              activeStage={selectedStage === 'all' ? null : selectedStage}
              onSelectStage={(stageKey) => {
                setSelectedStage(stageKey === selectedStage ? 'all' : stageKey);
              }}
            />
          </div>
        </div>

        {/* Tabs: Table View vs Kanban */}
        <Tabs
          tabs={[
            { id: 'table', label: 'Work Orders Directory', count: filteredOrders.length },
            { id: 'kanban', label: 'Stage Board Overview' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'table' && (
          <div className="section-card">
            {/* Filters Bar */}
            <div className="filter-bar">
              <div className="filter-group">
                <div className="search-input-wrap">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Filter by WO, Serial, Customer, Model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <CustomSelect
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Priorities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium / Normal' },
                    { value: 'low', label: 'Low' }
                  ]}
                />

                {(searchQuery || priorityFilter !== 'all' || selectedStage !== 'all') && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSearchQuery('');
                      setPriorityFilter('all');
                      setSelectedStage('all');
                    }}
                    style={{ height: '34px', whiteSpace: 'nowrap' }}
                  >
                    <X size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="filter-summary-count">
                Showing <strong>{filteredOrders.length}</strong> of {workOrders.length} work orders
              </div>
            </div>

            {/* Desktop & Tablet Table */}
            <div className="table-responsive desktop-table-view">
              <table className="data-table" style={{ minWidth: '1360px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px', minWidth: '130px' }}>WO Number</th>
                    <th style={{ width: '135px', minWidth: '135px' }}>Spindle Serial</th>
                    <th style={{ width: '150px', minWidth: '150px' }}>Model Family</th>
                    <th style={{ width: '200px', minWidth: '200px' }}>Customer</th>
                    <th style={{ width: '220px', minWidth: '220px' }}>Current Operation & Machine</th>
                    <th style={{ width: '190px', minWidth: '190px' }}>Lead Operator</th>
                    <th style={{ width: '100px', minWidth: '100px' }}>Priority</th>
                    <th style={{ width: '120px', minWidth: '120px' }}>Target Due Date</th>
                    <th style={{ width: '140px', minWidth: '140px' }}>Progress</th>
                    <th style={{ width: '115px', minWidth: '115px' }}>Status</th>
                    <th style={{ width: '180px', minWidth: '180px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((wo) => {
                    const rawOperator = wo.leadOperator || wo.assignedTo || wo.assignedOperator || '';
                    const opName = rawOperator ? rawOperator.replace(/\s*\(.*\)/, '').trim() : '';
                    const opRole = rawOperator && rawOperator.includes('(')
                      ? rawOperator.match(/\((.*?)\)/)?.[1]
                      : (rawOperator ? 'Assigned Specialist' : null);

                    return (
                      <tr key={wo.id || wo.dbId}>
                        <td
                          className="mono"
                          style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', fontSize: '13px', cursor: 'pointer' }}
                          onClick={() => {
                            if (onSelectWorkOrder) onSelectWorkOrder(wo);
                            if (onNavigate) onNavigate('work-order-detail');
                          }}
                          title={`Open Traveler for ${wo.id || wo.workOrderNo}`}
                        >
                          {wo.id}
                          {wo.quotationNo && (
                            <span
                              className="badge badge-neutral mono"
                              style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px', color: '#7A1F3D', border: '1px solid #e2ccd5' }}
                              title={`Linked to Quotation ${wo.quotationNo}`}
                            >
                              Quote: {wo.quotationNo}
                            </span>
                          )}
                        </td>
                        <td className="mono" style={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {wo.spindleSerial}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: '12px' }}>
                          {wo.spindleModel}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.35 }}>
                            {wo.customer}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              width: 'fit-content',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--primary-light)',
                              color: 'var(--primary)',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {wo.currentOperation || 'Material Preparation & Sawing'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                              {wo.machine || (wo.currentStage === 'machining' ? 'Okuma LB3000 CNC Lathe' : (wo.currentStage === 'grinding' ? 'Studer S33 CNC Grinder' : (wo.currentStage === 'assembly' ? 'Clean Room Class 1000' : (wo.currentStage === 'balancing' ? 'Schenck Balancing Rig' : 'Saw & Pit Furnace'))))}
                            </span>
                            {(wo.notes || wo.technicianNotes) && (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10.5px',
                                  color: '#7A1F3D',
                                  background: '#fdf2f4',
                                  border: '1px solid #f9d8e1',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  marginTop: '4px',
                                  maxWidth: '210px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={wo.notes || wo.technicianNotes}
                              >
                                <MessageSquare size={10} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{wo.notes || wo.technicianNotes}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div>
                              <div
                                style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}
                                onClick={() => handleOpenAssignModal(wo)}
                                title="Click to assign or change operator"
                              >
                                {opName ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                                    {opName}
                                  </span>
                                ) : (
                                  <span style={{ color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} />
                                    Unassigned
                                  </span>
                                )}
                              </div>
                              {opRole ? (
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {opRole}
                                </div>
                              ) : (
                                <div
                                  style={{ fontSize: '10px', color: 'var(--primary)', marginTop: '2px', cursor: 'pointer', fontWeight: 600 }}
                                  onClick={() => handleOpenAssignModal(wo)}
                                  title="Assign staff operator"
                                >
                                  + Assign Operator
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleOpenAssignModal(wo)}
                              style={{
                                padding: '3px 8px',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                color: 'var(--primary)',
                                borderColor: 'var(--border-color)',
                                borderRadius: '4px',
                                flexShrink: 0
                              }}
                              title={`Assign operator to ${wo.id}`}
                            >
                              <UserPlus size={11} />
                              <span>{opName ? 'Change' : 'Assign'}</span>
                            </button>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <StatusBadge status={wo.priority} size="sm" />
                        </td>
                        <td className="mono" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {wo.dueDate}
                        </td>
                        <td>
                          <div style={{ minWidth: '120px' }}>
                            <ProgressBar progress={wo.progress} />
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <StatusBadge status={wo.status} />
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                padding: '5px 10px',
                                gap: '5px',
                                fontWeight: 600,
                                fontSize: '11.5px',
                                background: '#7A1F3D',
                                borderColor: '#7A1F3D'
                              }}
                              onClick={() => handleOpenAssignModal(wo)}
                              title={`Assign or reassign staff operator to ${wo.id || wo.workOrderNo}`}
                            >
                              <UserPlus size={12} />
                              <span>{opName ? 'Reassign' : 'Assign'}</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 10px', gap: '5px', fontWeight: 600, fontSize: '11.5px', color: 'var(--primary)', borderColor: 'var(--border-color)' }}
                              onClick={() => {
                                if (onSelectWorkOrder) onSelectWorkOrder(wo);
                                if (onNavigate) onNavigate('work-order-detail');
                              }}
                              title={`Open Engineering Traveler & Case File for ${wo.id || wo.workOrderNo}`}
                            >
                              <FileText size={12} color="#7A1F3D" />
                              <span>Case File</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <div>No active work orders matching the selected filter criteria.</div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '12px', background: '#7A1F3D', borderColor: '#7A1F3D' }}
                          onClick={handleOpenNewWoModal}
                        >
                          <Plus size={13} />
                          <span>Add Production Job Order</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed View (≤ 768px) */}
            <div className="mobile-card-view" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  <div>No active work orders matching filter criteria.</div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '12px', background: '#7A1F3D', borderColor: '#7A1F3D' }}
                    onClick={handleOpenNewWoModal}
                  >
                    <Plus size={13} />
                    <span>Add Production Job Order</span>
                  </button>
                </div>
              ) : (
                filteredOrders.map((wo) => {
                  const rawOperator = wo.leadOperator || wo.assignedTo || wo.assignedOperator || '';
                  const opName = rawOperator ? rawOperator.replace(/\s*\(.*\)/, '').trim() : '';

                  return (
                    <div
                      key={wo.id || wo.dbId}
                      className="prod-mobile-card"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {/* Top Row: WO Number + Linked Quote + Priority */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            className="mono"
                            style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px', cursor: 'pointer' }}
                            onClick={() => {
                              if (onSelectWorkOrder) onSelectWorkOrder(wo);
                              if (onNavigate) onNavigate('work-order-detail');
                            }}
                          >
                            {wo.id}
                          </span>
                          {wo.quotationNo && (
                            <span
                              className="badge badge-neutral mono"
                              style={{ fontSize: '9.5px', padding: '1px 5px', color: '#7A1F3D', border: '1px solid #e2ccd5' }}
                            >
                              Quote: {wo.quotationNo}
                            </span>
                          )}
                        </div>
                        <StatusBadge status={wo.priority} size="sm" />
                      </div>

                      {/* Second Row: Model & Serial */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                          {wo.spindleModel}
                        </div>
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          SN: <strong>{wo.spindleSerial}</strong>
                        </div>
                      </div>

                      {/* Third Row: Customer */}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Customer: <strong style={{ color: 'var(--text-main)' }}>{wo.customer}</strong>
                      </div>

                      {/* Fourth Row: Current Operation & Machine */}
                      <div style={{
                        background: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                          Current Operation &amp; Machine
                        </div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)' }}>
                          {wo.currentOperation || 'Material Preparation & Sawing'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {wo.machine || 'Saw & Pit Furnace'}
                        </div>
                      </div>

                      {/* Fifth Row: Assigned Operator + Target Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Operator: </span>
                          {opName ? (
                            <strong style={{ color: 'var(--text-main)' }}>{opName}</strong>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Unassigned</span>
                          )}
                        </div>
                        <div className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          Due: <strong style={{ color: 'var(--text-main)' }}>{wo.dueDate}</strong>
                        </div>
                      </div>

                      {/* Sixth Row: Progress Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '2px', color: 'var(--text-muted)' }}>
                          <span>Stage Progress</span>
                          <span className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{wo.progress}%</span>
                        </div>
                        <ProgressBar progress={wo.progress} />
                      </div>

                      {/* Bottom Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, justifyContent: 'center', fontSize: '11.5px', padding: '5px' }}
                          onClick={() => handleOpenAssignModal(wo)}
                        >
                          <UserPlus size={12} />
                          <span>{opName ? 'Reassign' : 'Assign'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, justifyContent: 'center', fontSize: '11.5px', padding: '5px', background: '#7A1F3D', borderColor: '#7A1F3D' }}
                          onClick={() => {
                            if (onSelectWorkOrder) onSelectWorkOrder(wo);
                            if (onNavigate) onNavigate('work-order-detail');
                          }}
                        >
                          <FileText size={12} />
                          <span>Case File</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Kanban Board View */}
        {activeTab === 'kanban' && (
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '16px', minWidth: 0 }}>
            {dynamicStages.map((stage, idx) => {
              const stageWos = workOrders.filter(w => (w.currentStage || '').toLowerCase() === stage.key.toLowerCase());
              return (
                <div
                  key={stage.key}
                  style={{
                    minWidth: '240px',
                    width: '240px',
                    flexShrink: 0,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    boxShadow: 'var(--shadow-xs)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>0{idx + 1}</span>
                      <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.03em' }}>{stage.name}</strong>
                    </div>
                    <span className="nav-badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>{stageWos.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stageWos.map((wo) => (
                      <div
                        key={wo.id || wo.dbId}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                        onClick={() => {
                          if (onSelectWorkOrder) onSelectWorkOrder(wo);
                          onNavigate('work-order-detail');
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="mono" style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>{wo.id}</span>
                            {wo.quotationNo && (
                              <span
                                className="badge badge-neutral mono"
                                style={{ fontSize: '9px', padding: '0 4px', color: '#7A1F3D', border: '1px solid #e2ccd5' }}
                                title={`Linked to Quote ${wo.quotationNo}`}
                              >
                                Quote
                              </span>
                            )}
                          </div>
                          <StatusBadge status={wo.priority} size="sm" />
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '6px', color: 'var(--text-main)' }}>{wo.spindleModel}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{(wo.customer || '').split(' ')[0]}</div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{wo.currentOperation || 'In Progress'}</span>
                          <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>{wo.progress}%</span>
                        </div>
                        {(wo.notes || wo.technicianNotes) && (
                          <div
                            style={{
                              marginTop: '6px',
                              fontSize: '10.5px',
                              color: '#7A1F3D',
                              background: '#fdf2f4',
                              border: '1px solid #f9d8e1',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={wo.notes || wo.technicianNotes}
                          >
                            <MessageSquare size={10} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{wo.notes || wo.technicianNotes}</span>
                          </div>
                        )}

                        {/* Operator Assignment in Kanban */}
                        {(() => {
                          const rawOp = wo.leadOperator || wo.assignedTo || wo.assignedOperator;
                          return (
                            <div style={{ marginTop: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Lead</span>
                              <span
                                style={{ fontWeight: 600, color: rawOp ? 'var(--text-main)' : 'var(--primary)', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAssignModal(wo);
                                }}
                                title="Click to assign staff operator"
                              >
                                {rawOp ? rawOp.replace(/\s*\(.*\)/, '').trim() : '+ Assign'}
                              </span>
                            </div>
                          );
                        })()}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', marginTop: '8px', fontSize: '11px', padding: '4px 8px', justifyContent: 'center', gap: '5px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectWorkOrder) onSelectWorkOrder(wo);
                            onNavigate('work-order-detail');
                          }}
                        >
                          <FileText size={12} color="#7A1F3D" />
                          <span>View Case File</span>
                        </button>
                      </div>
                    ))}
                    {stageWos.length === 0 && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        No Active Work Orders
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* New Work Order / Production Job Order Modal */}
        <Modal
          isOpen={isNewWoOpen}
          onClose={() => setIsNewWoOpen(false)}
          title="Initialize New Spindle Production Job Order"
          maxWidth="920px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                WO: <strong className="mono" style={{ color: '#7A1F3D' }}>{newWo.workOrderNo}</strong> • Serial: <strong className="mono">{newWo.serial}</strong>
                {selectedQuotation && (
                  <span style={{ marginLeft: '8px', color: '#15803d', fontWeight: 600 }}>
                    • Linked to Quote: <strong className="mono">{selectedQuotation.estimateNo || selectedQuotation.id}</strong>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewWoOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateWo}
                  disabled={isSubmittingWo}
                  style={{ background: '#7A1F3D', borderColor: '#7A1F3D' }}
                >
                  <Plus size={14} />
                  <span>{isSubmittingWo ? 'Launching Order...' : 'Launch Production Job Order'}</span>
                </button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleCreateWo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Job Generation & Case File Notice */}
            <div style={{
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FileText size={18} color="#7A1F3D" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-main)' }}>Production Job Generation:</strong> Submitting this form generates the official Work Order and creates its engineering <strong>Case File & Traveler</strong>. Live technician allocation, workstation assignment, and stage work updates are managed centrally in <strong>Staff & Workforce</strong>.
              </div>
            </div>

            {/* Quick-Fill from Approved Quotation (Sales & Quotes) */}
            <div style={{
              border: '1.5px solid #e2ccd5',
              borderRadius: '8px',
              padding: '14px 16px',
              background: '#fdfafb',
              boxShadow: '0 1px 3px rgba(122, 31, 61, 0.04)'
            }}>
              {/* Header with Title & Approved Counter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#F5E8ED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7A1F3D'
                  }}>
                    <FileText size={15} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#7A1F3D', fontWeight: 700, fontSize: '13px' }}>
                        Quick-Fill from Approved Quotation (Sales & Quotes)
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 7px' }}>
                        <CheckCircle2 size={11} style={{ marginRight: '3px' }} />
                        {approvedQuotesCount} Approved Available
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      Import customer, spindle model, target dispatch & commercial value directly from an approved quotation
                    </div>
                  </div>
                </div>

                {selectedQuotation && (
                  <button
                    type="button"
                    onClick={handleClearSelectedQuotation}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px', height: '26px', color: '#b91c1c', borderColor: '#fca5a5' }}
                    title="Unlink and clear quotation data"
                  >
                    <X size={12} />
                    <span>Clear Linked Quote</span>
                  </button>
                )}
              </div>

              {/* Active Linked Quotation Confirmation Banner */}
              {selectedQuotation ? (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#14532d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Linked Quote: <strong className="mono">{selectedQuotation.estimateNo || selectedQuotation.id}</strong></span>
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>Approved</span>
                        <span style={{ fontSize: '11px', color: '#166534', fontWeight: 500 }}>
                          • Quoted: <strong>₹{Number(selectedQuotation.totalAmount || selectedQuotation.subtotal || 0).toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                        Customer: <strong>{selectedQuotation.customer}</strong> • Spindle Serial: <strong className="mono">{selectedQuotation.spindleSerial || 'To Assign'}</strong> • Date: {selectedQuotation.date || 'Recent'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedQuotation(null)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 9px', height: '28px', background: '#ffffff' }}
                    >
                      <Search size={12} />
                      <span>Pick Another Quote</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Quotation Search & Select Browser */
                <div>
                  {/* Search Input & Filter Toggle */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                      <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-control"
                        style={{
                          height: '32px',
                          paddingLeft: '30px',
                          paddingRight: quoteSearchQuery ? '28px' : '10px',
                          fontSize: '11.5px',
                          borderColor: '#e2ccd5'
                        }}
                        placeholder="Search quotations by Quote #, Customer, Serial, Spindle Model, or Scope..."
                        value={quoteSearchQuery}
                        onChange={(e) => setQuoteSearchQuery(e.target.value)}
                      />
                      {quoteSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setQuoteSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Filter Toggle: Approved Only vs All Quotations */}
                    <div style={{ display: 'flex', borderRadius: '4px', border: '1px solid #e2ccd5', overflow: 'hidden', flexShrink: 0, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setQuoteFilterApprovedOnly(true)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: quoteFilterApprovedOnly ? '#7A1F3D' : '#ffffff',
                          color: quoteFilterApprovedOnly ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={11} />
                        <span>Approved Only ({approvedQuotesCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuoteFilterApprovedOnly(false)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: !quoteFilterApprovedOnly ? '#7A1F3D' : '#ffffff',
                          color: !quoteFilterApprovedOnly ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none',
                          borderLeft: '1px solid #e2ccd5',
                          cursor: 'pointer'
                        }}
                      >
                        All Quotes ({quotationsList.length})
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Quotation Cards List */}
                  <div style={{
                    maxHeight: '190px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingRight: '2px'
                  }}>
                    {filteredQuotations.length === 0 ? (
                      <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        background: '#ffffff',
                        borderRadius: '6px',
                        border: '1px dashed #d1d5db',
                        color: 'var(--text-muted)',
                        fontSize: '11.5px'
                      }}>
                        {quoteSearchQuery ? (
                          <>No quotations matching "<strong>{quoteSearchQuery}</strong>". Try clearing search or toggling "All Quotes".</>
                        ) : quoteFilterApprovedOnly ? (
                          <>
                            No quotations currently marked as "Approved". Toggle to <strong>All Quotes ({quotationsList.length})</strong> or approve quotes in Sales & Quotes.
                          </>
                        ) : (
                          <>No quotations found in the system.</>
                        )}
                      </div>
                    ) : (
                      filteredQuotations.map((quote) => {
                        const isApproved = (quote.status || quote.rawStatus || '').toLowerCase() === 'approved';
                        const totalCost = Number(quote.totalAmount || quote.subtotal || 0);
                        const itemsSummary = (quote.items || []).map(i => i.desc || i.name).filter(Boolean).slice(0, 2).join(' • ');

                        return (
                          <div
                            key={quote.id || quote.estimateNo}
                            onClick={() => handleSelectQuotation(quote)}
                            style={{
                              padding: '9px 12px',
                              background: '#ffffff',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#7A1F3D';
                              e.currentTarget.style.background = '#FDF6F8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                <span className="mono" style={{ fontWeight: 700, fontSize: '12px', color: '#7A1F3D' }}>
                                  {quote.estimateNo || quote.id}
                                </span>
                                <span className={`badge ${isApproved ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                  {quote.status || 'Quote'}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {quote.date || '2026'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: 'var(--text-main)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600 }}>
                                  {quote.customer}
                                </span>
                                {quote.spindleSerial && (
                                  <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                    Serial: <strong>{quote.spindleSerial}</strong>
                                  </span>
                                )}
                                {quote.contactPerson && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                    Attn: {quote.contactPerson}
                                  </span>
                                )}
                              </div>

                              {itemsSummary && (
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {itemsSummary}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div className="mono" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-main)' }}>
                                ₹{totalCost.toLocaleString('en-IN')}
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{
                                  marginTop: '4px',
                                  fontSize: '10.5px',
                                  padding: '2px 8px',
                                  height: '24px',
                                  background: '#7A1F3D',
                                  borderColor: '#7A1F3D'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectQuotation(quote);
                                }}
                              >
                                <Plus size={11} />
                                <span>Use This Quote</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{ marginTop: '6px', fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Click any quotation above to auto-fill the order, or enter production job details manually below.
                  </div>
                </div>
              )}
            </div>

            {/* Section 1: Work Order & Production Schedule */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <Hash size={14} />
                <span>Work Order Tracking & Pipeline Stage</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Work Order Number *</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '12px', fontWeight: 700, color: '#7A1F3D' }}
                    value={newWo.workOrderNo}
                    onChange={(e) => setNewWo({ ...newWo, workOrderNo: e.target.value })}
                    placeholder="e.g. WO-2026-112"
                    required
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Target Dispatch Date *</label>
                  <input
                    type="date"
                    className="form-control mono"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '11.5px' }}
                    value={newWo.dueDate}
                    onChange={(e) => setNewWo({ ...newWo, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Priority *</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '11.5px', fontWeight: 600 }}
                    value={newWo.priority}
                    onChange={(e) => setNewWo({ ...newWo, priority: e.target.value })}
                  >
                    <option value="Critical">Critical Line-Down</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium / Normal</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Sequential Production Rule Notice */}
              <div style={{
                marginTop: '10px',
                padding: '6px 10px',
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                <span className="badge badge-primary mono" style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                  Stage 01
                </span>
                <span>
                  All jobs initiate strictly at <strong>01 Material Preparation & Sawing</strong>. Stages progress sequentially via technician operations in Staff & Workforce.
                </span>
              </div>
            </div>

            {/* Section 2: Customer Organization */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                  <Building2 size={14} />
                  <span>Customer & Client Particulars</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Select registered customer or enter enterprise account
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Customer Account</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '11.5px', borderColor: '#7A1F3D', fontWeight: 600 }}
                    value={customersList.includes(newWo.customer) ? newWo.customer : (newWo.customer ? '__custom__' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setNewWo(prev => ({ ...prev, customer: '' }));
                      } else if (val) {
                        setNewWo(prev => ({ ...prev, customer: val }));
                      }
                    }}
                  >
                    <option value="">-- Choose Registered Customer --</option>
                    {customersList.map((cName, idx) => (
                      <option key={idx} value={cName}>
                        {cName}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter New / Unlisted Customer Manually...</option>
                  </select>
                </div>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Customer / Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '12px', fontWeight: 600 }}
                    value={newWo.customer}
                    onChange={(e) => setNewWo({ ...newWo, customer: e.target.value })}
                    placeholder="e.g. Tata Advanced Systems Ltd"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Spindle Product Specifications & Lot */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <Cog size={14} />
                <span>Spindle Model, Serial & Manufacturing Lot</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Spindle Model Family *</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '11.5px', fontWeight: 600 }}
                    value={newWo.spindleModel}
                    onChange={(e) => setNewWo({ ...newWo, spindleModel: e.target.value })}
                  >
                    <option value="GPS-HSK-A63-24K">GPS-HSK-A63-24K (Motorized 24,000 RPM)</option>
                    <option value="GPS-BT40-15K">GPS-BT40-15K (Belt Milling 15,000 RPM)</option>
                    <option value="GPS-BT50-10K">GPS-BT50-10K (Heavy Geared 10,000 RPM)</option>
                    <option value="GPS-HF-60K">GPS-HF-60K (High Frequency 60,000 RPM)</option>
                    <option value="GPS-HSK-E25-42K">GPS-HSK-E25-42K (Micro High Speed 42k)</option>
                    <option value="GPS-BBT40-12K">GPS-BBT40-12K (Dual Contact 12k)</option>
                    <option value="__custom__">+ Other / Custom Spindle Model...</option>
                  </select>
                </div>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Spindle Serial Number *</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '12px', fontWeight: 600 }}
                    value={newWo.serial}
                    onChange={(e) => setNewWo({ ...newWo, serial: e.target.value })}
                    placeholder="e.g. GPS-2026-0850"
                    required
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Build Qty</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control mono"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '12px' }}
                    value={newWo.quantity || 1}
                    onChange={(e) => setNewWo({ ...newWo, quantity: e.target.value })}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Order Value (₹)</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '12px', fontWeight: 600 }}
                    value={newWo.value}
                    onChange={(e) => setNewWo({ ...newWo, value: e.target.value })}
                    placeholder="8,45,000"
                  />
                </div>
              </div>

              {newWo.spindleModel === '__custom__' && (
                <div style={{ marginTop: '8px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>Custom Model / OEM Make *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', boxSizing: 'border-box', height: '32px', fontSize: '12px' }}
                    value={newWo.customModel || ''}
                    onChange={(e) => setNewWo({ ...newWo, customModel: e.target.value })}
                    placeholder="e.g. Kessler HSK-63 / Fischer 30,000 RPM"
                    required
                  />
                </div>
              )}
            </div>

            {/* Section 4: Notes, Secondary Issues & Special Instructions */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                  <FileText size={14} />
                  <span>Job Notes, Other Issues & Special Instructions</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Log any additional defects, manufacturing notes, or client special requests
                </span>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
                  Notes / Special Manufacturing Requirements
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', height: '65px', padding: '8px 10px', fontSize: '12px', resize: 'vertical' }}
                  value={newWo.notes || ''}
                  onChange={(e) => setNewWo({ ...newWo, notes: e.target.value })}
                  placeholder="Write any other issue, shopfloor observations, client special requests (e.g., Pre-assembly dynamic runout test required; Customer witness run-in test; Dual-contact BBT blue matching ≥85%; Class 1000 cleanroom assembly certificate required)..."
                />

                {/* Quick-Append Note Suggestions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Quick append:</span>
                  {[
                    'Pre-assembly dynamic runout test required',
                    'Customer witnessing dynamic balance run',
                    'Dual-contact BBT blue matching ≥85% required',
                    'Stator high-frequency chiller jacket leak test',
                    'Class 1000 cleanroom assembly certificate required',
                    'Urgent delivery required (client line-down breakdown)'
                  ].map((noteTag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewWo(prev => {
                          const cur = (prev.notes || '').trim();
                          if (!cur) return { ...prev, notes: noteTag };
                          if (cur.includes(noteTag)) return prev;
                          return { ...prev, notes: `${cur}\n• ${noteTag}` };
                        });
                      }}
                      style={{
                        background: '#F8FAF9',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      + {noteTag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </Modal>



        {/* Production Schedule Pop-up Preview Modal */}
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          doc={previewDoc}
          onNotify={onNotify}
        />

        {/* Modal: Assign Staff Operator to Work Order */}
        {isAssignModalOpen && (
          <Modal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            title={assignTargetWo ? `Assign Staff Operator — ${assignTargetWo.id}` : 'Assign Staff Operator'}
            maxWidth="680px"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isSavingAssignment}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveAssignment}
                  disabled={isSavingAssignment || !selectedStaffId}
                  style={{
                    background: '#7A1F3D',
                    borderColor: '#7A1F3D',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={14} />
                  <span>{isSavingAssignment ? 'Assigning...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            }
          >
            {assignTargetWo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Target Work Order Context Card */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: '#fffafb',
                  border: '1px solid #f9d8e1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ fontWeight: 700, color: '#7A1F3D', fontSize: '13px' }}>
                        {assignTargetWo.id}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>
                        {assignTargetWo.spindleModel}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Client: <strong>{assignTargetWo.customer}</strong> • Target Date: <strong>{assignTargetWo.dueDate || 'Standard SLA'}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Current Operation
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#7A1F3D' }}>
                      {assignTargetWo.currentOperation || 'Material Prep & Billet Sawing'}
                    </div>
                  </div>
                </div>

                {/* Staff Search & Filter Header */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                    Select Certified Technician / Operator from Roster:
                  </label>
                  
                  {/* Search Bar */}
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search staff by name, role, department or trade (e.g., Sawant, Machining, Studer)..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      style={{ paddingLeft: '32px', fontSize: '12px' }}
                    />
                  </div>

                  {/* Department Filter Chips */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {[
                      { id: 'all', label: 'All Staff' },
                      { id: 'machining', label: 'Machining' },
                      { id: 'grinding', label: 'Grinding' },
                      { id: 'assembly', label: 'Cleanroom' },
                      { id: 'quality', label: 'QC Metrology' },
                      { id: 'balancing', label: 'Balancing' },
                      { id: 'service', label: 'Service' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStaffDeptFilter(tab.id)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: staffDeptFilter === tab.id ? '#7A1F3D' : 'var(--border-color)',
                          background: staffDeptFilter === tab.id ? '#7A1F3D' : '#ffffff',
                          color: staffDeptFilter === tab.id ? '#ffffff' : 'var(--text-secondary)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Staff Selection Roster Cards */}
                  <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '6px',
                    background: 'var(--bg-subtle, #f8fafc)'
                  }}>
                    {filteredStaffForAssignment.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No staff members match the current search or department filter.
                      </div>
                    ) : (
                      filteredStaffForAssignment.map(staff => {
                        const isSelected = selectedStaffId === staff.id;
                        return (
                          <div
                            key={staff.id}
                            onClick={() => setSelectedStaffId(staff.id)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #7A1F3D' : '1px solid var(--border-color)',
                              background: isSelected ? '#fffafb' : '#ffffff',
                              boxShadow: isSelected ? '0 1px 4px rgba(122,31,61,0.08)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.1s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {/* Staff Avatar / Initials */}
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: staff.avatarColor || (isSelected ? '#7A1F3D' : '#e2e8f0'),
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0
                              }}>
                                {staff.initials || (staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'GP')}
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '12.5px', color: isSelected ? '#7A1F3D' : 'var(--text-main)' }}>
                                    {staff.name}
                                  </span>
                                  {staff.employeeCode && (
                                    <span className="badge badge-neutral mono" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                      {staff.employeeCode}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {staff.designation || staff.role || 'Specialist'} • <span style={{ color: 'var(--text-secondary)' }}>{staff.department || 'Production'}</span>
                                </div>
                                {staff.machine && (
                                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Station: <strong style={{ color: 'var(--text-main)' }}>{staff.machine}</strong>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span 
                                className="badge"
                                style={{
                                  fontSize: '10.5px',
                                  background: staff.status === 'Working' ? '#ecfdf5' : '#f1f5f9',
                                  color: staff.status === 'Working' ? '#059669' : 'var(--text-muted)'
                                }}
                              >
                                {staff.status || 'Available'}
                              </span>
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => setSelectedStaffId(staff.id)}
                                style={{ accentColor: '#7A1F3D', cursor: 'pointer', width: '15px', height: '15px' }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Assignment Form Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                      Assigned Shift:
                    </label>
                    <select
                      className="form-control"
                      value={assignShift}
                      onChange={(e) => setAssignShift(e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      <option value="General (08:30 - 17:30)">General Shift (08:30 - 17:30)</option>
                      <option value="Morning Shift A (06:00 - 14:30)">Morning Shift A (06:00 - 14:30)</option>
                      <option value="Evening Shift B (14:30 - 23:00)">Evening Shift B (14:30 - 23:00)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                      Station / Machine:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Okuma LB3000 CNC Lathe"
                      value={assignStation}
                      onChange={(e) => setAssignStation(e.target.value)}
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                </div>

                {/* Instructions / Notes */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                    Operator Instructions / Work Traveler Notes:
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Provide specific spindle instructions, micron tolerance benchmarks, or setup notes..."
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}
