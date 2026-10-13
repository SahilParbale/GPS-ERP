import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { WorkforceScreenSkeleton } from '../components/common/Skeleton';
import { workOrderService } from '../services/database/workOrderService';
import {
  INITIAL_WORKFORCE_KPIS,
  INITIAL_WORKFORCE_STAFF,
  INITIAL_ACTIVITY_FEED,
  INITIAL_DEPARTMENTS_WORKLOAD,
  INITIAL_WORKFORCE_ALERTS
} from '../data/workforceData';
import { workforceService } from '../services/database/workforceService';

import { manufacturingService } from '../services/database/manufacturingService';
import { serviceService } from '../services/database/serviceService';
import { SERVICE_JOBS, PRODUCTION_PIPELINE_STAGES, SERVICE_PIPELINE_STAGES } from '../data/mockData';
import { exportWorkLogPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import {
  Search, Filter, Plus, Users, Clock, AlertTriangle,
  CheckCircle2, AlertCircle, ArrowRight, Eye, UserCheck,
  Briefcase, Activity, Shield, Cpu, ChevronRight, X, Cog,
  Calendar, CheckSquare, Layers, Wrench, RefreshCw,
  Download, Play, Pause, Check, Edit3, MessageSquare,
  FileText, TrendingUp, BarChart2, Info, ChevronDown, CornerDownRight, XCircle,
  User, MapPin, Gauge, Sliders, CheckCircle, ArrowUpRight
} from 'lucide-react';

// =========================================================================
// PIPELINE STAGES SPECIFICATION (8 Manufacturing & 9 Service Overhaul Stages)
// =========================================================================
export const MANUFACTURING_STAGES_DETAIL = [
  { step: 1, key: 'material', name: 'Material Prep & Billet Sawing', shortName: 'Material Prep', bay: 'Station 1 - Machining', machine: 'Bandsaw & Billet Furnace' },
  { step: 2, key: 'machining', name: 'CNC Rough & Finish Machining', shortName: 'CNC Machining', bay: 'Station 1 - Machining', machine: 'Okuma LB3000 Lathe' },
  { step: 3, key: 'grinding', name: 'Cylindrical & Journal Grinding', shortName: 'Precision Grinding', bay: 'Station 2 - Grinding', machine: 'Studer S33 Grinder' },
  { step: 4, key: 'assembly', name: 'Cleanroom Bearing Assembly', shortName: 'Cleanroom Assembly', bay: 'Station 3 - Assembly', machine: 'Cleanroom Class 1000' },
  { step: 5, key: 'balancing', name: 'Dynamic Balancing (G0.4)', shortName: 'Dynamic Balancing', bay: 'Station 4 - Balancing', machine: 'Schenck Balancing Rig' },
  { step: 6, key: 'testing', name: '4h Run-in & Thermal Audit', shortName: 'Run-in Testing', bay: 'Station 5 - Testing', machine: 'Run-in Test Bench 1' },
  { step: 7, key: 'qc', name: 'Final Metrology QC Sign-off', shortName: 'Final QC', bay: 'Station 6 - QC Metrology', machine: 'Zeiss CMM Metrology Lab' },
  { step: 8, key: 'dispatch', name: 'Protective Crate & Dispatch', shortName: 'Dispatch', bay: 'Station 7 - Dispatch', machine: 'Packaging & Dispatch Bay' }
];

export const SERVICE_STAGES_DETAIL = [
  { step: 1, key: 'complaint', name: 'Inward Complaint & Visual Log', shortName: 'Complaint Log', bay: 'Station 1 - Receiving', machine: 'Receiving Dock & Inspection Bench' },
  { step: 2, key: 'inspection', name: 'Runout & Radial Deflection Audit', shortName: 'Runout Audit', bay: 'Station 6 - QC Metrology', machine: 'Zeiss CMM & Runout Test Station' },
  { step: 3, key: 'diagnosis', name: 'Teardown, Strip & Failure Diagnosis', shortName: 'Teardown & Diagnosis', bay: 'Station 3 - Service Workshop', machine: 'Hydraulic Dismantling Press' },
  { step: 4, key: 'estimate', name: 'BOM Estimate & Quoting', shortName: 'BOM & Quoting', bay: 'Stores & Planning', machine: 'Service Planning Desk' },
  { step: 5, key: 'approval', name: 'Customer PO Approval', shortName: 'PO Approval', bay: 'Commercial / Service Desk', machine: 'Job Authorizer Desk' },
  { step: 6, key: 'repair', name: 'Shaft Re-grind & Cleanroom Rebuild', shortName: 'Rebuild & Grinding', bay: 'Station 2 - Grinding / Assembly', machine: 'Studer S33 & Assembly Bench' },
  { step: 7, key: 'testing', name: 'High-speed Balancing & 6h Run-in', shortName: 'Balancing & Run-in', bay: 'Station 4 & 5 - Balancing / Testing', machine: 'Schenck Rig & Run-in Bench' },
  { step: 8, key: 'qc', name: 'Final QA Metrology Sign-off', shortName: 'Final QC Sign-off', bay: 'Station 6 - QC Metrology', machine: 'Zeiss CMM Metrology Lab' },
  { step: 9, key: 'dispatch', name: 'Express Delivery & Handover', shortName: 'Express Delivery', bay: 'Station 7 - Dispatch', machine: 'Dispatch Bay & Courier Bay' }
];

export const getJobStageInfo = (job) => {
  if (!job) return {
    isService: false,
    stages: MANUFACTURING_STAGES_DETAIL,
    currentIndex: 1,
    currentStep: 2,
    totalSteps: 8,
    stageKey: 'machining',
    stageName: 'CNC Rough & Finish Machining',
    shortName: 'CNC Machining',
    defaultBay: 'Station 1 - Machining',
    defaultMachine: 'Okuma LB3000 Lathe'
  };

  const isService = job.type === 'service' || (job.id && job.id.startsWith('SR-'));
  const stages = isService ? SERVICE_STAGES_DETAIL : MANUFACTURING_STAGES_DETAIL;
  const currentKey = (job.currentStageKey || job.currentStage || '').toLowerCase();

  let matchIndex = stages.findIndex(s =>
    s.key.toLowerCase() === currentKey ||
    s.name.toLowerCase() === currentKey ||
    s.shortName.toLowerCase() === currentKey ||
    s.name.toLowerCase().includes(currentKey) ||
    currentKey.includes(s.key.toLowerCase())
  );
  if (matchIndex === -1) {
    matchIndex = isService ? 1 : 1;
  }

  const stageObj = stages[matchIndex] || stages[0];
  return {
    isService,
    stages,
    currentIndex: matchIndex,
    currentStep: matchIndex + 1,
    totalSteps: stages.length,
    stageKey: stageObj.key,
    stageName: stageObj.name,
    shortName: stageObj.shortName,
    defaultBay: stageObj.bay,
    defaultMachine: stageObj.machine
  };
};

export default function WorkforceScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  // Main view tab
  const [activeTab, setActiveTab] = useState('live');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Core Workforce State
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [staffError, setStaffError] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [activityFeed, setActivityFeed] = useState(INITIAL_ACTIVITY_FEED);
  const [stationAllocations, setStationAllocations] = useState([]);
  const [availableWorkOrders, setAvailableWorkOrders] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);

  // Active Jobs Tab State
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [jobPriorityFilter, setJobPriorityFilter] = useState('all');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobSortBy, setJobSortBy] = useState('priority');
  const [isAssignJobModalOpen, setIsAssignJobModalOpen] = useState(false);
  const [assignJobTarget, setAssignJobTarget] = useState(null);
  const [assignJobForm, setAssignJobForm] = useState({
    employeeId: '',
    stageKey: '',
    machine: '',
    bay: '',
    task: '',
    expectedDuration: '2h 00m',
    remarks: ''
  });

  // Stage Work Update Modal State (Assigned Staff & Admin Stage Progression)
  const [isStageWorkModalOpen, setIsStageWorkModalOpen] = useState(false);
  const [stageWorkTarget, setStageWorkTarget] = useState(null); // { job, staff, stageInfo }
  const [stageWorkForm, setStageWorkForm] = useState({
    stageKey: '',
    stageStatus: 'In Progress',
    progress: 70,
    advanceToNextStage: false,
    runoutMetric: '0.0008 mm',
    vibrationMetric: '0.38 mm/s',
    tempMetric: '32.5 °C',
    durationSpent: '1h 45m',
    notes: ''
  });

  // Dedicated Job Note Modal State (Technician Notes & Stage Remarks)
  const [isJobNoteModalOpen, setIsJobNoteModalOpen] = useState(false);
  const [jobNoteTarget, setJobNoteTarget] = useState(null); // { job, staff, stageInfo }
  const [jobNoteText, setJobNoteText] = useState('');



  const loadWorkforceData = async () => {
    setIsLoadingStaff(true);
    setStaffError(null);
    try {
      const [staffRes, logsRes, baysRes, wosRes, serviceRes] = await Promise.all([
        workforceService.getStaffList().catch(err => ({ error: err })),
        workforceService.getWorkLogs().catch(err => ({ error: err })),
        manufacturingService.getBayAssignments().catch(err => ({ error: err })),
        workOrderService.getWorkOrders().catch(err => ({ error: err })),
        serviceService.getServiceJobs().catch(err => ({ error: err }))
      ]);

      if (staffRes?.error) {
        console.warn('[WorkforceScreen] Error fetching staff from Supabase:', staffRes.error);
        setStaffError(staffRes.error);
      }

      const liveData = staffRes?.data || [];
      const sourceData = liveData.length > 0 ? liveData : INITIAL_WORKFORCE_STAFF;
      const mergedStaff = sourceData.map((emp, idx) => {
        const mock = INITIAL_WORKFORCE_STAFF.find(s => s.id === emp.id) || INITIAL_WORKFORCE_STAFF[idx % INITIAL_WORKFORCE_STAFF.length] || {};
        return {
          ...mock,
          ...emp,
          id: emp.id || mock.id,
          name: emp.name || mock.name || 'Technician',
          initials: emp.initials || mock.initials || 'GP',
          department: emp.department || mock.department || 'Production Machining',
          designation: emp.designation || mock.designation || 'Specialist',
          role: emp.role || mock.role || 'CNC Operator',
          workingHours: '08:30 - 17:30',
          status: emp.status || mock.status || 'Working',
          avatarColor: emp.avatarColor || mock.avatarColor || '#7A1F3D',
          skills: emp.skills || mock.skills || ['Machining'],
          qualifications: emp.qualifications || mock.qualifications || []
        };
      });

      setStaffList(mergedStaff);
      if (logsRes?.data) setWorkLogs(logsRes.data);
      if (baysRes?.data) setStationAllocations(baysRes.data);

      // Merge local storage work orders (created from ProductionScreen) with DB
      let localWos = [];
      try {
        localWos = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
      } catch (e) { localWos = []; }
      const dbWos = wosRes?.data || [];
      const combinedWos = [...localWos, ...dbWos.filter(dw => !localWos.some(lw => (lw.id || lw.workOrderNo) === (dw.id || dw.workOrderNo)))];
      setAvailableWorkOrders(combinedWos);

      const prodJobs = combinedWos.map(wo => ({
        id: wo.id || wo.workOrderNo,
        type: 'production',
        typeLabel: 'Production',
        serial: wo.spindleSerial || wo.serial || 'Spindle',
        model: wo.spindleModel || 'Motorized Spindle',
        customer: wo.customer || 'Customer',
        priority: wo.priority || 'Normal',
        status: wo.status || 'In Progress',
        currentStage: wo.currentStage || 'machining',
        currentStageKey: (wo.currentStage || 'machining').toLowerCase(),
        dueDate: wo.dueDate || '—',
        assignedTo: wo.assignedTo || wo.leadOperator || null,
        bay: wo.currentOperation || 'Station 1 - Machining',
        machine: wo.machine || 'Okuma LB3000 Lathe',
        progress: wo.progress || 25,
        notes: wo.notes || wo.technicianNotes || wo.remarks || '',
        technicianNotes: wo.technicianNotes || wo.notes || '',
        lastNoteBy: wo.lastNoteBy || null,
        lastNoteAt: wo.lastNoteAt || null,
        notesHistory: wo.notesHistory || wo.stageLogs || []
      }));

      // Merge local storage service jobs (created from ServiceScreen) with DB/mock
      let localSrv = [];
      try {
        localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]');
      } catch (e) { localSrv = []; }
      const servList = (serviceRes?.data && serviceRes.data.length > 0) ? serviceRes.data : SERVICE_JOBS;
      const combinedSrv = [...localSrv, ...servList.filter(ds => !localSrv.some(ls => ls.id === ds.id))];

      const srvJobs = combinedSrv.map(srv => ({
        id: srv.id || srv.srNumber,
        type: 'service',
        typeLabel: 'Service Repair',
        serial: srv.spindleSerial || 'Spindle',
        model: srv.spindleModel || 'Rebuild Spindle',
        customer: srv.customer || 'Customer',
        priority: srv.priority || 'Normal',
        status: srv.status || 'In Progress',
        currentStage: srv.currentStage || 'inspection',
        currentStageKey: (srv.currentStage || 'inspection').toLowerCase(),
        dueDate: srv.targetDate || srv.dueDate || '—',
        assignedTo: srv.assignedTo || srv.technician || null,
        bay: srv.bay || 'Station 6 - QC Metrology',
        machine: srv.machine || 'Zeiss CMM & Runout Test Station',
        progress: srv.progress || (srv.stageIndex ? Math.round((srv.stageIndex / 9) * 100) : 30),
        complaint: srv.complaint || srv.failure_description,
        notes: srv.notes || srv.technicianNotes || srv.remarks || '',
        technicianNotes: srv.technicianNotes || srv.notes || '',
        lastNoteBy: srv.lastNoteBy || null,
        lastNoteAt: srv.lastNoteAt || null,
        notesHistory: srv.notesHistory || srv.stageLogs || []
      }));

      setAvailableJobs([...prodJobs, ...srvJobs]);


    } catch (err) {
      console.error('[WorkforceScreen] Critical error loading workforce data:', err);
      setStaffList(INITIAL_WORKFORCE_STAFF);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadWorkforceData();

    // Auto sync when jobs are generated or updated in Production or Service screens
    const handleSync = (e) => {
      const entity = e?.detail?.entity;
      if (!entity || entity === 'workforce' || entity === 'production' || entity === 'service' || entity === 'work-orders') {
        loadWorkforceData();
      }
    };
    window.addEventListener('gps_entities_updated', handleSync);
    return () => window.removeEventListener('gps_entities_updated', handleSync);
  }, []);

  // Profile Drawer State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [profileTab, setProfileTab] = useState('summary');
  const [logPeriodFilter, setLogPeriodFilter] = useState('today');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('All');

  // Work Log Detail Modal
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  // Interactive Action Modals
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [addLogPreselectedStaffId, setAddLogPreselectedStaffId] = useState('');

  const [isUpdateProgressModalOpen, setIsUpdateProgressModalOpen] = useState(false);
  const [updateProgressTarget, setUpdateProgressTarget] = useState(null);

  const [isStartTaskModalOpen, setIsStartTaskModalOpen] = useState(false);
  const [startTaskTarget, setStartTaskTarget] = useState(null);

  const [isPauseTaskModalOpen, setIsPauseTaskModalOpen] = useState(false);
  const [pauseTaskTarget, setPauseTaskTarget] = useState(null);

  const [isCompleteTaskModalOpen, setIsCompleteTaskModalOpen] = useState(false);
  const [completeTaskTarget, setCompleteTaskTarget] = useState(null);

  // Form State: Add Work Log
  const [addLogForm, setAddLogForm] = useState({
    employeeId: 'GPS-EMP-104',
    date: '2026-09-09',
    startTime: '08:45',
    endTime: '10:30',
    workType: 'Production',
    task: 'Shaft Turning',
    workOrder: 'WO-2026-0148',
    spindle: 'SP-1042',
    machine: 'CNC-03',
    bay: 'Station 1 - Machining',
    quantityCompleted: '4',
    progress: 100,
    status: 'Completed',
    remarks: 'Shaft dimensions verified after turning operation. Runout within tolerance.'
  });

  // Form State: Update Progress
  const [progressForm, setProgressForm] = useState({
    progress: 80,
    status: 'Working',
    timeSpent: '2h 15m',
    remarks: 'Bearing seating verified. Proceeding with finishing pass.'
  });

  // Form State: Start Task
  const [startTaskForm, setStartTaskForm] = useState({
    employeeId: '',
    workOrder: 'WO-2026-0148',
    task: 'Shaft Turning',
    spindle: 'SP-1042',
    machine: 'CNC-03',
    bay: 'Station 1 - Machining',
    expectedDuration: '2h 30m',
    remarks: 'Maintain strict runout limit <= 0.0010 mm on nose taper.'
  });

  // Form State: Pause Task
  const [pauseForm, setPauseForm] = useState({
    reason: 'Machine issue',
    remarks: 'Air pressure fluctuation detected on chuck actuator. Maintenance alerted.'
  });

  // Dynamic KPI Metrics (Focused 4 Executive Operational Cards)
  const kpiData = useMemo(() => {
    const totalStaff = staffList.length;
    const workingNow = staffList.filter(s => s.status === 'Working' || s.status === 'Overtime').length;
    const available = staffList.filter(s => s.status === 'Available' || s.status === 'Idle').length;

    // Filter today's work logs & tasks
    const todayLogs = workLogs.filter(l => l.period === 'today' || l.date === '09 Sep 2026' || l.date === '2026-09-09');
    const tasksToday = todayLogs.length + workingNow;

    const overdueCount = staffList.filter(s => (s.durationMinutes || 0) > 180 || s.status === 'Overtime').length;
    const workingPercent = totalStaff > 0 ? Math.round((workingNow / totalStaff) * 100) : 0;

    return [
      {
        id: 'total_employees',
        label: 'Total Workforce',
        value: totalStaff.toString(),
        trend: `${available} Available for deployment`,
        isUp: true,
        icon: 'Users'
      },
      {
        id: 'working_now',
        label: 'Active on Jobs',
        value: workingNow.toString(),
        trend: `${workingPercent}% Workforce deployed`,
        isUp: true,
        icon: 'Cpu'
      },
      {
        id: 'tasks_today',
        label: 'Active Operations',
        value: tasksToday.toString(),
        trend: 'Manufacturing & Service',
        isUp: true,
        icon: 'CheckSquare'
      },
      {
        id: 'overdue_tasks',
        label: 'Attention Required',
        value: overdueCount.toString(),
        trend: overdueCount > 0 ? `${overdueCount} delayed / overtime` : 'All operations on schedule',
        alert: overdueCount > 0,
        isUp: overdueCount === 0,
        icon: 'AlertTriangle'
      }
    ];
  }, [staffList, workLogs]);

  // Filtered Workforce Staff Table
  const filteredStaff = useMemo(() => {
    return staffList.filter((emp) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const empName = (emp.name || '').toLowerCase();
      const empId = (emp.id || '').toString().toLowerCase();
      const legacyId = (emp.legacyId || '').toLowerCase();
      const workOrder = (emp.workOrder || '').toLowerCase();
      const spindleSerial = (emp.spindleSerial || '').toLowerCase();
      const currentTask = (emp.currentTask || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const roleStr = (emp.role || '').toLowerCase();

      const matchesSearch = !q || (
        empName.includes(q) ||
        empId.includes(q) ||
        legacyId.includes(q) ||
        workOrder.includes(q) ||
        spindleSerial.includes(q) ||
        currentTask.includes(q) ||
        dept.includes(q) ||
        roleStr.includes(q)
      );

      const matchesDept = selectedDept === 'All' || dept === selectedDept.toLowerCase();
      const matchesStatus = selectedStatus === 'All' || (emp.status || '').toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staffList, searchQuery, selectedDept, selectedStatus]);

  // Filtered Work Logs for Selected Employee in Profile
  const selectedStaffLogs = useMemo(() => {
    if (!selectedStaff) return [];
    return workLogs.filter(log => {
      const isEmployee = log.employeeId === selectedStaff.id || log.employeeName === selectedStaff.name;
      if (!isEmployee) return false;

      // Period filter
      if (logPeriodFilter === 'today' && log.period !== 'today') return false;
      if (logPeriodFilter === 'this_week' && log.period !== 'today' && log.period !== 'this_week') return false;
      if (logPeriodFilter === 'this_month' && log.period !== 'today' && log.period !== 'this_week' && log.period !== 'this_month') return false;

      // Search & Status filters
      const logStatus = (log.status || '').toLowerCase();
      if (logStatusFilter !== 'All' && logStatus !== logStatusFilter.toLowerCase()) return false;
      if (logSearchQuery) {
        const q = logSearchQuery.toLowerCase().trim();
        const matches = (log.task || '').toLowerCase().includes(q) ||
          (log.workOrder || '').toLowerCase().includes(q) ||
          (log.spindle || '').toLowerCase().includes(q) ||
          (log.machine || '').toLowerCase().includes(q) ||
          ((log.remarks || '').toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [selectedStaff, workLogs, logPeriodFilter, logStatusFilter, logSearchQuery]);

  // Reset Filters
  const hasActiveFilters = searchQuery !== '' || selectedDept !== 'All' || selectedStatus !== 'All';
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDept('All');
    setSelectedStatus('All');
  };

  // Helper: Open Job Traveler / Case File (Production or Service)
  const handleViewJobCaseFile = (jobOrId) => {
    const jobId = typeof jobOrId === 'string' ? jobOrId : (jobOrId?.id || jobOrId?.workOrderNo);
    if (!jobId || jobId === '—') return;

    const isService = jobId.startsWith('SR-') ||
      (typeof jobOrId === 'object' && jobOrId?.type === 'service') ||
      availableJobs.some(j => j.id === jobId && j.type === 'service') ||
      SERVICE_JOBS.some(s => s.id === jobId);

    if (isService) {
      localStorage.setItem('gps_active_service_job_id', jobId);
      if (onNavigate) onNavigate('service');
    } else {
      const foundWo = availableWorkOrders.find(w => w.id === jobId || w.workOrderNo === jobId);
      if (foundWo && onSelectWorkOrder && onNavigate) {
        onSelectWorkOrder(foundWo);
        onNavigate('work-order-detail');
      } else if (onNavigate) {
        onNavigate('production');
      }
    }
  };

  // Backwards compatibility alias
  const handleViewWorkOrder = handleViewJobCaseFile;

  // Open Stage Work Update Modal for a Job
  const handleOpenStageWork = (job, staff = null) => {
    if (!job) return;
    const assignedStaff = staff || staffList.find(s => s.workOrder === job.id || s.name === job.assignedTo);
    const stageInfo = getJobStageInfo(job);

    setStageWorkTarget({ job, staff: assignedStaff, stageInfo });
    setStageWorkForm({
      stageKey: stageInfo.stageKey,
      stageStatus: 'In Progress',
      progress: job.progress || 60,
      advanceToNextStage: false,
      runoutMetric: job.runoutMetric || '0.0008 mm',
      vibrationMetric: job.vibrationMetric || '0.35 mm/s',
      tempMetric: job.tempMetric || '32.5 °C',
      durationSpent: assignedStaff?.duration !== '—' ? assignedStaff?.duration : '1h 45m',
      notes: job.notes || job.technicianNotes || ''
    });
    setIsStageWorkModalOpen(true);
  };

  // Open Dedicated Job Note Modal for a Job
  const handleOpenJobNote = (job, staff = null) => {
    if (!job) return;
    const assignedStaff = staff || staffList.find(s => s.workOrder === job.id || s.name === job.assignedTo);
    const stageInfo = getJobStageInfo(job);
    setJobNoteTarget({ job, staff: assignedStaff, stageInfo });
    setJobNoteText('');
    setIsJobNoteModalOpen(true);
  };

  // Open Dedicated Job Note Modal from Staff Row
  const handleOpenJobNoteForStaff = (emp) => {
    if (!emp || !emp.workOrder || emp.workOrder === '—') {
      if (onNotify) onNotify('This employee is not currently assigned to an active job.', 'info');
      return;
    }
    const jobId = emp.workOrder;
    let foundJob = availableJobs.find(j => j.id === jobId);
    if (!foundJob) {
      const wo = availableWorkOrders.find(w => w.id === jobId || w.workOrderNo === jobId);
      if (wo) {
        foundJob = {
          id: wo.id || wo.workOrderNo,
          type: 'production',
          typeLabel: 'Production',
          serial: wo.spindleSerial || wo.serial || 'Spindle',
          model: wo.spindleModel || 'Motorized Spindle',
          customer: wo.customer || 'Customer',
          currentStage: wo.currentStage || emp.currentTask,
          bay: wo.currentOperation || emp.bay,
          machine: wo.machine || emp.machine,
          progress: wo.progress || emp.progress || 50,
          notes: wo.notes || wo.technicianNotes || emp.notes || '',
          notesHistory: wo.notesHistory || []
        };
      } else {
        const isService = jobId.startsWith('SR-');
        foundJob = {
          id: jobId,
          type: isService ? 'service' : 'production',
          typeLabel: isService ? 'Service Repair' : 'Production',
          serial: emp.spindleSerial !== '—' ? emp.spindleSerial : 'Spindle',
          model: 'High-Speed Spindle',
          customer: 'GPS Client',
          currentStage: emp.currentTask,
          bay: emp.bay,
          machine: emp.machine,
          progress: emp.progress || 40,
          notes: emp.notes || '',
          notesHistory: []
        };
      }
    }
    handleOpenJobNote(foundJob, emp);
  };

  // Save Dedicated Job Note
  const handleSaveJobNote = (e) => {
    if (e) e.preventDefault();
    if (!jobNoteTarget || !jobNoteText.trim()) {
      if (onNotify) onNotify('Please enter a note before saving.', 'warning');
      return;
    }
    const { job, staff, stageInfo } = jobNoteTarget;
    const isService = job.type === 'service' || (job.id && job.id.startsWith('SR-'));
    const noteText = jobNoteText.trim();
    const authorName = staff?.name || 'Shop Floor Staff';
    const authorRole = staff?.role || 'Technician';
    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newNoteEntry = {
      id: `note-${Date.now()}`,
      stageKey: stageInfo?.stageKey || 'general',
      stageName: stageInfo?.stageName || job.currentStage || 'General Stage',
      author: authorName,
      role: authorRole,
      text: noteText,
      timestamp: timestampStr
    };

    // 1. Update availableJobs
    setAvailableJobs(prev => prev.map(j => {
      if (j.id === job.id) {
        return {
          ...j,
          notes: noteText,
          technicianNotes: noteText,
          lastNoteBy: authorName,
          lastNoteAt: timestampStr,
          notesHistory: [newNoteEntry, ...(j.notesHistory || [])]
        };
      }
      return j;
    }));

    // 2. Persist in localStorage & availableWorkOrders
    if (isService) {
      try {
        const localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]');
        const updatedLocal = localSrv.map(s => {
          if (s.id === job.id) {
            return {
              ...s,
              notes: noteText,
              technicianNotes: noteText,
              lastNoteBy: authorName,
              lastNoteAt: timestampStr,
              notesHistory: [newNoteEntry, ...(s.notesHistory || [])]
            };
          }
          return s;
        });
        localStorage.setItem('gps_local_service_jobs', JSON.stringify(updatedLocal));
      } catch (err) { console.error(err); }
    } else {
      setAvailableWorkOrders(prev => prev.map(w => {
        if (w.id === job.id || w.workOrderNo === job.id) {
          return {
            ...w,
            notes: noteText,
            technicianNotes: noteText,
            lastNoteBy: authorName,
            lastNoteAt: timestampStr,
            notesHistory: [newNoteEntry, ...(w.notesHistory || [])]
          };
        }
        return w;
      }));

      try {
        const localWos = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
        const updatedLocal = localWos.map(w => {
          if (w.id === job.id || w.workOrderNo === job.id) {
            return {
              ...w,
              notes: noteText,
              technicianNotes: noteText,
              lastNoteBy: authorName,
              lastNoteAt: timestampStr,
              notesHistory: [newNoteEntry, ...(w.notesHistory || [])]
            };
          }
          return w;
        });
        localStorage.setItem('gps_local_work_orders', JSON.stringify(updatedLocal));
      } catch (err) { console.error(err); }
    }

    // 3. Update staff record notes if staff exists
    if (staff) {
      setStaffList(prev => prev.map(s => {
        if (s.id === staff.id) {
          return {
            ...s,
            notes: noteText,
            lastNote: noteText
          };
        }
        return s;
      }));
    }

    // 4. Log to activity feed
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: authorName,
        employeeId: staff?.id || 'GPS-STAFF',
        action: 'note added',
        task: job.currentStage || 'Stage Operation',
        workOrder: job.id,
        spindle: job.serial || '—',
        machine: job.machine || '—',
        bay: job.bay || '—',
        progressBefore: job.progress || 0,
        progressAfter: job.progress || 0,
        status: job.status || 'In Progress',
        detail: `${authorName} logged technician note on ${job.id}: "${noteText}"`
      },
      ...prev
    ]);

    // 5. Global sync event
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: isService ? 'service' : 'production' } }));

    setIsJobNoteModalOpen(false);
    if (onNotify) onNotify(`Technician note saved on ${job.id} by ${authorName}!`);
  };

  // Open Stage Work Update Modal from Staff Row
  const handleOpenStageWorkForStaff = (emp) => {
    if (!emp || !emp.workOrder || emp.workOrder === '—') {
      if (onNotify) onNotify('This employee is not currently assigned to an active job.', 'info');
      return;
    }

    const jobId = emp.workOrder;
    let foundJob = availableJobs.find(j => j.id === jobId);
    if (!foundJob) {
      const wo = availableWorkOrders.find(w => w.id === jobId || w.workOrderNo === jobId);
      if (wo) {
        foundJob = {
          id: wo.id || wo.workOrderNo,
          type: 'production',
          typeLabel: 'Production',
          serial: wo.spindleSerial || wo.serial || 'Spindle',
          model: wo.spindleModel || 'Motorized Spindle',
          customer: wo.customer || 'Customer',
          currentStage: wo.currentStage || emp.currentTask,
          bay: wo.currentOperation || emp.bay,
          machine: wo.machine || emp.machine,
          progress: wo.progress || emp.progress || 50
        };
      } else {
        const isService = jobId.startsWith('SR-');
        foundJob = {
          id: jobId,
          type: isService ? 'service' : 'production',
          typeLabel: isService ? 'Service Repair' : 'Production',
          serial: emp.spindleSerial !== '—' ? emp.spindleSerial : 'Spindle',
          model: 'High-Speed Spindle',
          customer: 'GPS Client',
          currentStage: emp.currentTask,
          bay: emp.bay,
          machine: emp.machine,
          progress: emp.progress || 40
        };
      }
    }

    handleOpenStageWork(foundJob, emp);
  };

  // Unassign Worker / Free Up (Admin Superpower)
  const handleUnassignWorker = (jobOrStaff) => {
    let jobId = null;
    let staffId = null;

    if (jobOrStaff?.id && jobOrStaff.id.toString().startsWith('GPS-EMP')) {
      staffId = jobOrStaff.id;
      jobId = jobOrStaff.workOrder;
    } else {
      jobId = jobOrStaff?.id;
      const foundStaff = staffList.find(s => s.workOrder === jobId || s.name === jobOrStaff?.assignedTo);
      if (foundStaff) staffId = foundStaff.id;
    }

    if (staffId) {
      setStaffList(prev => prev.map(s => {
        if (s.id === staffId) {
          return {
            ...s,
            status: 'Available',
            workOrder: '—',
            currentTask: 'Standby for Assignment',
            spindleSerial: '—',
            duration: '0m',
            durationMinutes: 0,
            progress: 0
          };
        }
        return s;
      }));
    }

    if (jobId && jobId !== '—') {
      setAvailableWorkOrders(prev => prev.map(wo => {
        if (wo.id === jobId || wo.workOrderNo === jobId) {
          return { ...wo, assignedTo: null, leadOperator: null };
        }
        return wo;
      }));

      setAvailableJobs(prev => prev.map(j => {
        if (j.id === jobId) {
          return { ...j, assignedTo: null, leadOperator: null, technician: null };
        }
        return j;
      }));

      try {
        const localWos = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
        const updatedWos = localWos.map(wo => {
          if (wo.id === jobId || wo.workOrderNo === jobId) {
            return { ...wo, assignedTo: null, leadOperator: null };
          }
          return wo;
        });
        localStorage.setItem('gps_local_work_orders', JSON.stringify(updatedWos));
      } catch (e) { console.error(e); }

      try {
        const localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]');
        const updatedSrv = localSrv.map(srv => {
          if (srv.id === jobId) {
            return { ...srv, assignedTo: null, technician: null };
          }
          return srv;
        });
        localStorage.setItem('gps_local_service_jobs', JSON.stringify(updatedSrv));
      } catch (e) { console.error(e); }
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: 'Admin Supervisor',
        employeeId: 'GPS-ADMIN',
        action: 'unassigned',
        task: 'Worker Unassigned',
        workOrder: jobId || '—',
        spindle: '—',
        machine: '—',
        bay: '—',
        progressBefore: 0,
        progressAfter: 0,
        status: 'Available',
        detail: `Worker unassigned from ${jobId || 'job'}. Worker is now Available for redeployment.`
      },
      ...prev
    ]);

    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'service' } }));
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'workforce' } }));

    if (isStageWorkModalOpen) setIsStageWorkModalOpen(false);
    if (onNotify) onNotify(`Worker unassigned from ${jobId || 'job'}. Status updated to Available.`);
  };

  // Submit Stage Work Update & Progression
  const handleSaveStageWork = (e) => {
    if (e) e.preventDefault();
    if (!stageWorkTarget) return;

    const { job, staff } = stageWorkTarget;
    const isService = job.type === 'service' || (job.id && job.id.startsWith('SR-'));
    const stages = isService ? SERVICE_STAGES_DETAIL : MANUFACTURING_STAGES_DETAIL;

    const currentStageIndex = stages.findIndex(s => s.key === stageWorkForm.stageKey) !== -1
      ? stages.findIndex(s => s.key === stageWorkForm.stageKey)
      : 0;

    let nextStageIndex = currentStageIndex;
    let hasAdvanced = false;

    if (stageWorkForm.advanceToNextStage || stageWorkForm.stageStatus === 'Stage Completed' || Number(stageWorkForm.progress) >= 100) {
      if (currentStageIndex < stages.length - 1) {
        nextStageIndex = currentStageIndex + 1;
        hasAdvanced = true;
      }
    }

    const activeStageObj = stages[nextStageIndex];
    const nextStageKey = activeStageObj.key;
    const nextStageName = activeStageObj.name;
    const nextBay = activeStageObj.bay;
    const nextMachine = activeStageObj.machine;

    const newOverallProgress = Math.min(100, Math.round(((nextStageIndex + (hasAdvanced ? 0.2 : Number(stageWorkForm.progress) / 100)) / stages.length) * 100));

    const noteText = stageWorkForm.notes?.trim() || '';
    const authorName = staff?.name || 'Staff Technician';
    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newNoteEntry = noteText ? {
      id: `note-${Date.now()}`,
      stageKey: nextStageKey,
      stageName: nextStageName,
      author: authorName,
      role: staff?.role || 'Technician',
      text: noteText,
      runout: stageWorkForm.runoutMetric,
      vibration: stageWorkForm.vibrationMetric,
      temp: stageWorkForm.tempMetric,
      timestamp: timestampStr
    } : null;

    // Update job in state
    setAvailableJobs(prev => prev.map(j => {
      if (j.id === job.id) {
        const updatedHistory = newNoteEntry ? [newNoteEntry, ...(j.notesHistory || [])] : (j.notesHistory || []);
        return {
          ...j,
          currentStage: nextStageName,
          currentStageKey: nextStageKey,
          bay: nextBay,
          machine: nextMachine,
          progress: newOverallProgress,
          status: (hasAdvanced && nextStageIndex === stages.length - 1) ? 'Dispatch Ready' : (hasAdvanced ? 'In Progress' : j.status),
          notes: noteText || j.notes || '',
          technicianNotes: noteText || j.technicianNotes || '',
          lastNoteBy: noteText ? authorName : (j.lastNoteBy || null),
          lastNoteAt: noteText ? timestampStr : (j.lastNoteAt || null),
          notesHistory: updatedHistory
        };
      }
      return j;
    }));

    if (isService) {
      try {
        const localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]');
        const updatedLocal = localSrv.map(s => {
          if (s.id === job.id) {
            const updatedHistory = newNoteEntry ? [newNoteEntry, ...(s.notesHistory || [])] : (s.notesHistory || []);
            return {
              ...s,
              currentStage: nextStageKey,
              stageIndex: nextStageIndex + 1,
              progress: newOverallProgress,
              status: (hasAdvanced && nextStageIndex === stages.length - 1) ? 'Dispatch Ready' : s.status,
              notes: noteText || s.notes || '',
              technicianNotes: noteText || s.technicianNotes || '',
              lastNoteBy: noteText ? authorName : (s.lastNoteBy || null),
              lastNoteAt: noteText ? timestampStr : (s.lastNoteAt || null),
              notesHistory: updatedHistory
            };
          }
          return s;
        });
        localStorage.setItem('gps_local_service_jobs', JSON.stringify(updatedLocal));
      } catch (err) { console.error(err); }
    } else {
      setAvailableWorkOrders(prev => prev.map(w => {
        if (w.id === job.id || w.workOrderNo === job.id) {
          const updatedHistory = newNoteEntry ? [newNoteEntry, ...(w.notesHistory || [])] : (w.notesHistory || []);
          return {
            ...w,
            currentStage: nextStageKey,
            currentOperation: nextBay,
            machine: nextMachine,
            progress: newOverallProgress,
            status: (hasAdvanced && nextStageIndex === stages.length - 1) ? 'QC Pending' : w.status,
            notes: noteText || w.notes || '',
            technicianNotes: noteText || w.technicianNotes || '',
            lastNoteBy: noteText ? authorName : (w.lastNoteBy || null),
            lastNoteAt: noteText ? timestampStr : (w.lastNoteAt || null),
            notesHistory: updatedHistory
          };
        }
        return w;
      }));

      try {
        const localWos = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
        const updatedLocal = localWos.map(w => {
          if (w.id === job.id || w.workOrderNo === job.id) {
            const updatedHistory = newNoteEntry ? [newNoteEntry, ...(w.notesHistory || [])] : (w.notesHistory || []);
            return {
              ...w,
              currentStage: nextStageKey,
              currentOperation: nextBay,
              machine: nextMachine,
              progress: newOverallProgress,
              status: (hasAdvanced && nextStageIndex === stages.length - 1) ? 'QC Pending' : w.status,
              notes: noteText || w.notes || '',
              technicianNotes: noteText || w.technicianNotes || '',
              lastNoteBy: noteText ? authorName : (w.lastNoteBy || null),
              lastNoteAt: noteText ? timestampStr : (w.lastNoteAt || null),
              notesHistory: updatedHistory
            };
          }
          return w;
        });
        localStorage.setItem('gps_local_work_orders', JSON.stringify(updatedLocal));
      } catch (err) { console.error(err); }
    }

    // Update staff record
    if (staff) {
      setStaffList(prev => prev.map(s => {
        if (s.id === staff.id) {
          return {
            ...s,
            currentTask: hasAdvanced ? `${nextStageObj.shortName} Operation` : `${activeStageObj.shortName} (${stageWorkForm.progress}%)`,
            bay: nextBay,
            machine: nextMachine,
            duration: stageWorkForm.durationSpent || s.duration,
            progress: hasAdvanced ? 20 : Number(stageWorkForm.progress),
            status: 'Working',
            notes: noteText || s.notes || '',
            lastNote: noteText || s.lastNote || ''
          };
        }
        return s;
      }));
    }

    // Create work log entry
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newLog = {
      id: `WL-${Date.now().toString().slice(-6)}`,
      employeeId: staff?.id || 'GPS-ADMIN',
      employeeName: staff?.name || 'Shop Floor Supervisor',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      period: 'today',
      startTime: staff?.started || '08:30 AM',
      endTime: nowTime,
      duration: stageWorkForm.durationSpent || '1h 30m',
      durationMinutes: 90,
      workType: isService ? 'Service Repair' : 'Production',
      task: `${activeStageObj.name} [${stageWorkForm.progress}%]`,
      workOrder: job.id,
      spindle: job.serial || '—',
      machine: activeStageObj.machine,
      bay: activeStageObj.bay,
      progress: Number(stageWorkForm.progress),
      status: hasAdvanced ? 'Completed' : 'Working',
      remarks: `${stageWorkForm.notes || 'Stage execution logged.'} Runout: ${stageWorkForm.runoutMetric}, Vib: ${stageWorkForm.vibrationMetric}, Temp: ${stageWorkForm.tempMetric}.`
    };
    setWorkLogs(prev => [newLog, ...prev]);

    // Add activity feed entry
    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: staff?.name || 'Supervisor',
        employeeId: staff?.id || 'GPS-ADMIN',
        action: hasAdvanced ? 'stage advanced' : 'stage updated',
        task: activeStageObj.name,
        workOrder: job.id,
        spindle: job.serial || '—',
        machine: activeStageObj.machine,
        bay: activeStageObj.bay,
        progressBefore: Number(job.progress) || 0,
        progressAfter: newOverallProgress,
        status: hasAdvanced ? 'Stage Advanced' : 'In Progress',
        detail: hasAdvanced
          ? `${job.id} advanced to Step ${nextStageIndex + 1}/${stages.length}: ${nextStageName}. Logged by ${staff?.name || 'Admin'}.`
          : `${staff?.name || 'Technician'} updated ${job.id} ${activeStageObj.shortName} to ${stageWorkForm.progress}%. Metrology logged.`
      },
      ...prev
    ]);

    // Dispatch global sync events
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'service' } }));
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'workforce' } }));

    setIsStageWorkModalOpen(false);
    if (onNotify) {
      onNotify(hasAdvanced
        ? `Job ${job.id} advanced to Step ${nextStageIndex + 1}: ${nextStageName}!`
        : `Stage work progress updated for ${job.id} (${activeStageObj.shortName} at ${stageWorkForm.progress}%).`
      );
    }
  };

  // ==========================================
  // ACTION 1: OPEN ADD WORK LOG MODAL
  // ==========================================
  const handleOpenAddLog = (staff) => {
    const target = staff || (selectedStaff || staffList[0]);
    setAddLogPreselectedStaffId(target.id);
    setAddLogForm(prev => ({
      ...prev,
      employeeId: target.id,
      department: target.department,
      workOrder: target.workOrder !== '—' ? target.workOrder : 'WO-2026-0148',
      spindle: target.spindleSerial !== '—' ? target.spindleSerial : 'SP-1042',
      machine: target.machine !== '—' ? target.machine : 'CNC-03',
      bay: target.bay !== '—' ? target.bay : 'Station 1 - Machining',
      task: target.currentTask !== '—' ? target.currentTask : 'Shaft Turning',
      progress: target.progress || 100,
      status: 'Completed'
    }));
    setIsAddLogModalOpen(true);
  };

  // SUBMIT ADD WORK LOG
  const handleSaveWorkLog = (e) => {
    e.preventDefault();
    const emp = staffList.find(s => s.id === addLogForm.employeeId) || staffList[0];

    // Compute duration
    const startParts = addLogForm.startTime.split(':');
    const endParts = addLogForm.endTime.split(':');
    let durMinutes = 90;
    if (startParts.length === 2 && endParts.length === 2) {
      const sMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
      const eMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
      durMinutes = Math.max(15, eMin - sMin);
    }
    const durHours = Math.floor(durMinutes / 60);
    const durMins = durMinutes % 60;
    const durationStr = `${durHours > 0 ? `${durHours}h ` : ''}${durMins}m`;

    const newLog = {
      id: `WL-${Date.now().toString().slice(-6)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: '09 Sep 2026',
      period: 'today',
      startTime: addLogForm.startTime,
      endTime: addLogForm.endTime,
      duration: durationStr,
      durationMinutes: durMinutes,
      workType: addLogForm.workType,
      task: addLogForm.task,
      workOrder: addLogForm.workOrder,
      spindle: addLogForm.spindle,
      machine: addLogForm.machine,
      bay: addLogForm.bay,
      department: emp.department,
      quantityCompleted: Number(addLogForm.quantityCompleted) || 1,
      progress: Number(addLogForm.progress),
      status: addLogForm.status,
      remarks: addLogForm.remarks
    };

    // Prepend to workLogs and persist to Supabase
    setWorkLogs(prev => [newLog, ...prev]);
    workforceService.startWorkLog({
      employeeId: emp.id,
      task: addLogForm.task,
      workOrder: addLogForm.workOrder,
      spindle: addLogForm.spindle,
      machine: addLogForm.machine,
      bay: addLogForm.bay,
      remarks: addLogForm.remarks
    }).catch(err => console.error('Failed to persist work log:', err));

    // Update staff record
    setStaffList(prev => prev.map(s => {
      if (s.id === emp.id) {
        const newCompleted = addLogForm.status === 'Completed' ? s.completedToday + 1 : s.completedToday;
        return {
          ...s,
          tasksToday: s.tasksToday + 1,
          completedToday: newCompleted,
          status: addLogForm.status === 'Completed' ? 'Available' : s.status,
          currentTask: addLogForm.status === 'Completed' ? `Completed ${addLogForm.task}` : addLogForm.task,
          progress: addLogForm.progress,
          todaySummary: {
            ...s.todaySummary,
            tasksAssigned: s.todaySummary.tasksAssigned + 1,
            tasksCompleted: newCompleted
          }
        };
      }
      return s;
    }));

    // If selected staff is open, update it
    if (selectedStaff && selectedStaff.id === emp.id) {
      setSelectedStaff(prev => ({
        ...prev,
        tasksToday: prev.tasksToday + 1,
        completedToday: addLogForm.status === 'Completed' ? prev.completedToday + 1 : prev.completedToday,
        progress: addLogForm.progress
      }));
    }

    // Add entry to activity feed
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: emp.name,
        employeeId: emp.id,
        action: 'added work log',
        task: addLogForm.task,
        workOrder: addLogForm.workOrder,
        spindle: addLogForm.spindle,
        machine: addLogForm.machine,
        bay: addLogForm.bay,
        progressBefore: 0,
        progressAfter: addLogForm.progress,
        status: addLogForm.status,
        detail: addLogForm.remarks || `Logged ${durationStr} on ${addLogForm.task}`
      },
      ...prev
    ]);

    setIsAddLogModalOpen(false);
    if (onNotify) {
      onNotify(`Work log added successfully for ${emp.name}.`);
    }
  };

  // ==========================================
  // ACTION 2: LIVE TASK PROGRESS UPDATE
  // ==========================================
  const handleOpenUpdateProgress = (staff) => {
    const target = staff || selectedStaff;
    if (!target) return;
    setUpdateProgressTarget(target);
    setProgressForm({
      progress: target.progress || 65,
      status: target.status || 'Working',
      timeSpent: target.duration || '2h 15m',
      remarks: `Progress updated on ${target.currentTask}. Operation running to tolerance specifications.`
    });
    setIsUpdateProgressModalOpen(true);
  };

  const handleSaveProgressUpdate = (e) => {
    e.preventDefault();
    if (!updateProgressTarget) return;

    const oldProgress = updateProgressTarget.progress || 0;
    const newProgress = Number(progressForm.progress);

    const remarksNote = progressForm.remarks?.trim() || '';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + nowTime;

    setStaffList(prev => prev.map(s => {
      if (s.id === updateProgressTarget.id) {
        return {
          ...s,
          progress: newProgress,
          status: progressForm.status,
          notes: remarksNote || s.notes || '',
          lastNote: remarksNote || s.lastNote || '',
          todaySummary: {
            ...s.todaySummary,
            avgProgress: Math.round((s.todaySummary.avgProgress + newProgress) / 2)
          }
        };
      }
      return s;
    }));

    if (selectedStaff && selectedStaff.id === updateProgressTarget.id) {
      setSelectedStaff(prev => ({
        ...prev,
        progress: newProgress,
        status: progressForm.status,
        notes: remarksNote || prev.notes || '',
        lastNote: remarksNote || prev.lastNote || ''
      }));
    }

    // Also update linked job notes if remark provided
    if (remarksNote && updateProgressTarget.workOrder && updateProgressTarget.workOrder !== '—') {
      const targetJobId = updateProgressTarget.workOrder;
      const isService = targetJobId.startsWith('SR-');
      const progressNoteEntry = {
        id: `note-${Date.now()}`,
        stageKey: 'progress',
        stageName: updateProgressTarget.currentTask || 'Task Progress',
        author: updateProgressTarget.name,
        role: updateProgressTarget.role || 'Technician',
        text: remarksNote,
        timestamp: timestampStr
      };

      setAvailableJobs(prev => prev.map(j => {
        if (j.id === targetJobId) {
          return {
            ...j,
            notes: remarksNote,
            technicianNotes: remarksNote,
            lastNoteBy: updateProgressTarget.name,
            lastNoteAt: timestampStr,
            notesHistory: [progressNoteEntry, ...(j.notesHistory || [])]
          };
        }
        return j;
      }));

      if (isService) {
        try {
          const localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]');
          const updated = localSrv.map(s => s.id === targetJobId ? {
            ...s,
            notes: remarksNote,
            technicianNotes: remarksNote,
            lastNoteBy: updateProgressTarget.name,
            lastNoteAt: timestampStr,
            notesHistory: [progressNoteEntry, ...(s.notesHistory || [])]
          } : s);
          localStorage.setItem('gps_local_service_jobs', JSON.stringify(updated));
        } catch (e) { }
      } else {
        try {
          const localWos = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
          const updated = localWos.map(w => (w.id === targetJobId || w.workOrderNo === targetJobId) ? {
            ...w,
            notes: remarksNote,
            technicianNotes: remarksNote,
            lastNoteBy: updateProgressTarget.name,
            lastNoteAt: timestampStr,
            notesHistory: [progressNoteEntry, ...(w.notesHistory || [])]
          } : w);
          localStorage.setItem('gps_local_work_orders', JSON.stringify(updated));
        } catch (e) { }
      }
    }

    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: updateProgressTarget.name,
        employeeId: updateProgressTarget.id,
        action: 'updated',
        task: updateProgressTarget.currentTask,
        workOrder: updateProgressTarget.workOrder,
        spindle: updateProgressTarget.spindleSerial,
        machine: updateProgressTarget.machine,
        bay: updateProgressTarget.bay,
        progressBefore: oldProgress,
        progressAfter: newProgress,
        status: progressForm.status,
        detail: remarksNote
          ? `${updateProgressTarget.name} updated ${updateProgressTarget.workOrder} to ${newProgress}%: "${remarksNote}"`
          : `${updateProgressTarget.name} updated ${updateProgressTarget.workOrder} progress from ${oldProgress}% to ${newProgress}%.`
      },
      ...prev
    ]);

    setIsUpdateProgressModalOpen(false);
    if (onNotify) {
      onNotify(`${updateProgressTarget.name} updated ${updateProgressTarget.workOrder} progress to ${newProgress}%.`);
    }
  };

  // ==========================================
  // ACTION 3: START TASK (Available -> Working)
  // ==========================================
  const handleOpenStartTask = (staff) => {
    const target = staff || selectedStaff;
    setStartTaskTarget(target);
    setStartTaskForm({
      employeeId: target ? target.id : 'GPS-EMP-104',
      workOrder: 'WO-2026-0148',
      task: 'Shaft Turning',
      spindle: 'SP-1042',
      machine: target?.machine && target.machine !== '—' ? target.machine : 'CNC-03',
      bay: target?.bay && target.bay !== '—' ? target.bay : 'Station 1 - Machining',
      expectedDuration: '2h 30m',
      remarks: 'Mounted workpiece, verified chuck pressure and alignment.'
    });
    setIsStartTaskModalOpen(true);
  };

  const handleSaveStartTask = (e) => {
    e.preventDefault();
    const empId = startTaskForm.employeeId || (startTaskTarget ? startTaskTarget.id : staffList[0].id);
    const emp = staffList.find(s => s.id === empId) || staffList[0];

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setStaffList(prev => prev.map(s => {
      if (s.id === emp.id) {
        return {
          ...s,
          status: 'Working',
          currentTask: startTaskForm.task,
          workOrder: startTaskForm.workOrder,
          spindleSerial: startTaskForm.spindle,
          machine: startTaskForm.machine,
          bay: startTaskForm.bay,
          started: nowTime,
          duration: '0m',
          durationMinutes: 0,
          progress: 5,
          tasksToday: s.tasksToday + 1
        };
      }
      return s;
    }));

    if (selectedStaff && selectedStaff.id === emp.id) {
      setSelectedStaff(prev => ({
        ...prev,
        status: 'Working',
        currentTask: startTaskForm.task,
        workOrder: startTaskForm.workOrder,
        spindleSerial: startTaskForm.spindle,
        machine: startTaskForm.machine,
        bay: startTaskForm.bay,
        started: nowTime,
        duration: '0m',
        progress: 5,
        tasksToday: prev.tasksToday + 1
      }));
    }

    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: emp.name,
        employeeId: emp.id,
        action: 'started',
        task: startTaskForm.task,
        workOrder: startTaskForm.workOrder,
        spindle: startTaskForm.spindle,
        machine: startTaskForm.machine,
        bay: startTaskForm.bay,
        progressBefore: 0,
        progressAfter: 5,
        status: 'Working',
        detail: `${emp.name} started ${startTaskForm.task} on ${startTaskForm.workOrder} (${startTaskForm.machine}).`
      },
      ...prev
    ]);

    // Persist active task to live database
    workforceService.startWorkLog({
      employeeId: emp.id,
      task: startTaskForm.task,
      workOrder: startTaskForm.workOrder,
      spindle: startTaskForm.spindle,
      machine: startTaskForm.machine,
      bay: startTaskForm.bay,
      remarks: `Started ${startTaskForm.task}`
    }).catch(err => console.error('Failed to start work log in Supabase:', err));

    setIsStartTaskModalOpen(false);
    if (onNotify) {
      onNotify(`Task "${startTaskForm.task}" started for ${emp.name}. Status updated to Working.`);
    }
  };

  // ==========================================
  // ACTION 4: PAUSE TASK (Working -> Paused/Break)
  // ==========================================
  const handleOpenPauseTask = (staff) => {
    const target = staff || selectedStaff;
    if (!target) return;
    setPauseTaskTarget(target);
    setPauseForm({
      reason: 'Machine issue',
      remarks: 'Machine station paused for technical inspection and gauge calibration.'
    });
    setIsPauseTaskModalOpen(true);
  };

  const handleSavePauseTask = (e) => {
    e.preventDefault();
    if (!pauseTaskTarget) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setStaffList(prev => prev.map(s => {
      if (s.id === pauseTaskTarget.id) {
        return {
          ...s,
          status: 'Break',
          currentTask: `${s.currentTask} (Paused: ${pauseForm.reason})`
        };
      }
      return s;
    }));

    if (selectedStaff && selectedStaff.id === pauseTaskTarget.id) {
      setSelectedStaff(prev => ({
        ...prev,
        status: 'Break',
        currentTask: `${prev.currentTask} (Paused: ${pauseForm.reason})`
      }));
    }

    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: pauseTaskTarget.name,
        employeeId: pauseTaskTarget.id,
        action: 'paused',
        task: pauseTaskTarget.currentTask,
        workOrder: pauseTaskTarget.workOrder,
        spindle: pauseTaskTarget.spindleSerial,
        machine: pauseTaskTarget.machine,
        bay: pauseTaskTarget.bay,
        progressBefore: pauseTaskTarget.progress,
        progressAfter: pauseTaskTarget.progress,
        status: 'Break',
        detail: `Task paused: ${pauseForm.reason}. ${pauseForm.remarks}`
      },
      ...prev
    ]);

    // Persist pause status to Supabase
    if (pauseTaskTarget.dbId || pauseTaskTarget.id) {
      workforceService.updateStaffStatus(pauseTaskTarget.dbId || pauseTaskTarget.id, 'Break')
        .catch(err => console.error('Failed to update staff status:', err));
    }

    setIsPauseTaskModalOpen(false);
    if (onNotify) {
      onNotify(`Task paused for ${pauseTaskTarget.name} (${pauseForm.reason}).`);
    }
  };

  // ==========================================
  // ACTION 5: COMPLETE TASK (Working -> Completed -> Available)
  // ==========================================
  const handleOpenCompleteTask = (staff) => {
    const target = staff || selectedStaff;
    if (!target) return;
    setCompleteTaskTarget(target);
    setIsCompleteTaskModalOpen(true);
  };

  const handleConfirmCompleteTask = () => {
    if (!completeTaskTarget) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Create a completed work log entry
    const completedLog = {
      id: `WL-${Date.now().toString().slice(-6)}`,
      employeeId: completeTaskTarget.id,
      employeeName: completeTaskTarget.name,
      date: '09 Sep 2026',
      period: 'today',
      startTime: completeTaskTarget.started !== '—' ? completeTaskTarget.started : '08:45 AM',
      endTime: nowTime,
      duration: completeTaskTarget.duration !== '—' ? completeTaskTarget.duration : '2h 15m',
      durationMinutes: completeTaskTarget.durationMinutes || 135,
      workType: 'Production',
      task: completeTaskTarget.currentTask,
      workOrder: completeTaskTarget.workOrder,
      spindle: completeTaskTarget.spindleSerial,
      machine: completeTaskTarget.machine,
      bay: completeTaskTarget.bay,
      department: completeTaskTarget.department,
      quantityCompleted: 1,
      progress: 100,
      status: 'Completed',
      remarks: `Task successfully completed and signed off. All tolerances met.`
    };

    setWorkLogs(prev => [completedLog, ...prev]);

    // Persist completed task to Supabase
    workforceService.completeWorkLog(completedLog.id, completedLog.remarks)
      .catch(err => console.error('Failed to complete work log in Supabase:', err));

    // 2. Set employee to Available
    setStaffList(prev => prev.map(s => {
      if (s.id === completeTaskTarget.id) {
        return {
          ...s,
          status: 'Available',
          currentTask: 'Standby for Assignment',
          workOrder: '—',
          spindleSerial: '—',
          progress: 100,
          completedToday: s.completedToday + 1,
          todaySummary: {
            ...s.todaySummary,
            tasksCompleted: s.todaySummary.tasksCompleted + 1,
            tasksInProgress: Math.max(0, s.todaySummary.tasksInProgress - 1)
          }
        };
      }
      return s;
    }));

    if (selectedStaff && selectedStaff.id === completeTaskTarget.id) {
      setSelectedStaff(prev => ({
        ...prev,
        status: 'Available',
        currentTask: 'Standby for Assignment',
        workOrder: '—',
        spindleSerial: '—',
        progress: 100,
        completedToday: prev.completedToday + 1
      }));
    }

    // 3. Add activity feed entry
    setActivityFeed(prev => [
      {
        id: `act-${Date.now()}`,
        time: nowTime,
        timestamp: new Date().toISOString(),
        employeeName: completeTaskTarget.name,
        employeeId: completeTaskTarget.id,
        action: 'completed',
        task: completeTaskTarget.currentTask,
        workOrder: completeTaskTarget.workOrder,
        spindle: completeTaskTarget.spindleSerial,
        machine: completeTaskTarget.machine,
        bay: completeTaskTarget.bay,
        progressBefore: completeTaskTarget.progress,
        progressAfter: 100,
        status: 'Completed',
        detail: `${completeTaskTarget.name} completed ${completeTaskTarget.currentTask} on ${completeTaskTarget.workOrder}.`
      },
      ...prev
    ]);

    setIsCompleteTaskModalOpen(false);
    if (onNotify) {
      onNotify(`Task completed successfully for ${completeTaskTarget.name}. Work log recorded.`);
    }
  };

  // ==========================================
  // ACTION 6: EXPORT CSV WORK LOG
  // ==========================================
  const handleExportWorkLogs = () => {
    try {
      exportWorkLogPdf(workLogs);
      if (onNotify) {
        onNotify(`Technician Work Log Report downloaded (PDF) for ${workLogs.length} employee records.`);
      }
    } catch (err) {
      console.error('Failed to export work log PDF:', err);
      if (onNotify) onNotify('Failed to download work log PDF', 'error');
    }
  };





  if (isLoadingStaff) {
    return <WorkforceScreenSkeleton />;
  }

  if (staffError) {
    return (
      <div className="content-area">
        <PageHeader
          title="Staff & Workforce"
          subtitle="Employee Work Log & Daily Manufacturing Activity Tracking System"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              {staffError.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {staffError.message || 'Unable to retrieve live workforce personnel records from PostgreSQL database.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={loadWorkforceData}>
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
      {/* 1. TOP PAGE HEADER */}
      <PageHeader
        title="Staff & Workforce"
        subtitle="Central Assignment & Stage Management Hub • Assign staff to 8 Manufacturing & 9 Service stages, update stage work progress, and inspect case files"
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {onNavigate && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate('production')}
                title="Go to Production Management"
                style={{ fontSize: '11px', padding: '5px 10px' }}
              >
                <Cog size={13} />
                <span>Production</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate('service')}
                title="Go to Service & Repair"
                style={{ fontSize: '11px', padding: '5px 10px' }}
              >
                <Wrench size={13} />
                <span>Service</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportWorkLogs}
            title="Download official PDF work log register"
          >
            <Download size={14} />
            <span>Export Work Log (PDF)</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenStartTask(null)}
            title="Start or allocate a task to an available technician"
          >
            <Play size={14} />
            <span>Start Task</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenAddLog(null)}
            title="Record an employee work log entry"
          >
            <Plus size={14} />
            <span>Add Work Log</span>
          </button>
        </div>
      </PageHeader>

      <div className="content-body">

        {/* 2. TOP 4 EXECUTIVE OPERATIONAL KPI CARDS */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {kpiData.map((kpi) => (
            <MetricCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              isUp={kpi.isUp}
              alert={kpi.alert}
              icon={kpi.icon}
            />
          ))}
        </div>

        {/* 3. TODAY'S WORK ACTIVITY FEED BANNER */}


        {/* 4. MAIN WORKFORCE NAVIGATION TABS */}
        <Tabs
          tabs={[
            { id: 'live', label: "Who's Working Now", count: staffList.filter(s => s.status === 'Working' || s.status === 'Overtime').length },
            { id: 'jobs', label: 'Active Jobs & Assign', count: availableJobs.length },
            { id: 'workload', label: 'Dept Workload', count: INITIAL_DEPARTMENTS_WORKLOAD.length },
            { id: 'logs', label: 'Work Logs (History)', count: workLogs.length }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* 5. UNIVERSAL SEARCH & FILTER BAR */}
        <div className="workforce-filter-bar">
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search employee, ID, role, WO, spindle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '32px', fontSize: '12px' }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Dept:</span>
            <CustomSelect
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ minWidth: '130px' }}
              options={[
                { value: 'All', label: 'All Departments' },
                { value: 'Production', label: 'Production' },
                { value: 'Assembly', label: 'Assembly' },
                { value: 'Quality', label: 'Quality' },
                { value: 'Balancing', label: 'Balancing' },
                { value: 'Testing', label: 'Testing' },
                { value: 'Service', label: 'Service' },
                { value: 'Stores', label: 'Stores' }
              ]}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status:</span>
            <CustomSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ minWidth: '120px' }}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Working', label: 'Working' },
                { value: 'Available', label: 'Available' },
                { value: 'Break', label: 'Break' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Idle', label: 'Idle' },
                { value: 'Overtime', label: 'Overtime' }
              ]}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetFilters}
              style={{ height: '32px', fontSize: '11px' }}
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredStaff.length}</strong> of {staffList.length} employees
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: WHO'S WORKING NOW — EMPLOYEE WORKFORCE TABLE                       */}
        {/* ========================================================================= */}
        {activeTab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Main Workforce Table Card */}
            <div className="section-card">
              <div className="card-header">
                <div className="card-title">
                  <Users size={16} color="#7A1F3D" />
                  <span>Employee Workforce & Live Activity Register</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Click any employee row to open their full work history drawer
                </span>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>ID</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Stream & Active Stage</th>
                      <th>Work Order / Case File</th>
                      <th>Machine / Workstation</th>
                      <th>Started</th>
                      <th>Duration</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan="12" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No employees match your active filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((emp) => {
                        const isWorking = emp.status === 'Working' || emp.status === 'Overtime';
                        const hasJob = emp.workOrder && emp.workOrder !== '—';
                        const isService = hasJob && (emp.workOrder.startsWith('SR-') || (emp.department || '').toLowerCase().includes('service'));
                        const stageInfo = hasJob ? getJobStageInfo({ id: emp.workOrder, type: isService ? 'service' : 'production', currentStage: emp.currentTask }) : null;

                        return (
                          <tr
                            key={emp.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedStaff(emp)}
                          >
                            {/* Employee Avatar + Name */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                <div className="staff-avatar" style={{ background: emp.avatarColor || '#7A1F3D' }}>
                                  {emp.initials}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                                    {emp.name}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {emp.designation}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* ID */}
                            <td className="mono" style={{ fontWeight: 600, fontSize: '11px' }}>
                              {emp.id}
                            </td>

                            {/* Department */}
                            <td>
                              <span style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#334155',
                                fontWeight: 600
                              }}>
                                {emp.department}
                              </span>
                            </td>

                            {/* Role */}
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {emp.role}
                            </td>

                            {/* Stream & Active Stage */}
                            <td>
                              {hasJob && stageInfo ? (
                                <div>
                                  <div style={{ marginBottom: '3px' }}>
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      background: isService ? '#ede9fe' : '#dbeafe',
                                      color: isService ? '#6d28d9' : '#1d4ed8',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      {isService ? <Wrench size={9} /> : <Cpu size={9} />}
                                      {isService ? `SERVICE · Step ${stageInfo.currentStep}/9` : `PROD · Step ${stageInfo.currentStep}/8`}
                                    </span>
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: '11.5px', color: 'var(--text-main)' }}>
                                    {stageInfo.shortName}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                    {emp.currentTask}
                                  </div>
                                  {emp.notes && (
                                    <div
                                      style={{
                                        marginTop: '4px',
                                        fontSize: '10.5px',
                                        color: '#334155',
                                        background: '#f8fafc',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        maxWidth: '220px'
                                      }}
                                      title={`Technician Note: ${emp.notes}`}
                                    >
                                      <MessageSquare size={10} color="#7A1F3D" style={{ flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {emp.notes}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Standby / Ready</span>
                              )}
                            </td>

                            {/* Work Order & Case File Link */}
                            <td>
                              {hasJob ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    className="mono"
                                    style={{
                                      fontWeight: 700,
                                      color: 'var(--primary)',
                                      textDecoration: 'underline',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewJobCaseFile(emp.workOrder);
                                    }}
                                    title="Open Job Traveler / Case File"
                                  >
                                    {emp.workOrder}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '2px 5px', fontSize: '10px', height: '22px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewJobCaseFile(emp.workOrder);
                                    }}
                                    title="View Case File"
                                  >
                                    <FileText size={11} color="#7A1F3D" />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>

                            {/* Machine / Workstation */}
                            <td style={{ fontSize: '11.5px' }}>
                              <span style={{ fontWeight: 600 }}>{emp.machine}</span>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{emp.bay?.replace(/Bay/gi, 'Station')}</div>
                            </td>

                            {/* Started */}
                            <td className="mono" style={{ fontSize: '11px' }}>
                              {emp.started}
                            </td>

                            {/* Duration */}
                            <td className="mono" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                              {emp.duration}
                            </td>

                            {/* Progress */}
                            <td style={{ minWidth: '95px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <ProgressBar progress={emp.progress} height={5} />
                                </div>
                                <span className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>
                                  {emp.progress}%
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td>
                              <StatusBadge status={emp.status} size="sm" />
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                {isWorking ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleOpenStageWorkForStaff(emp)}
                                      title="Update active stage work & precision measurements"
                                      style={{ padding: '3px 8px', fontSize: '11px' }}
                                    >
                                      <Edit3 size={11} />
                                      <span>Update Work</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleOpenJobNoteForStaff(emp)}
                                      title="Add or view technician notes for this employee's active job"
                                      style={{ padding: '3px 7px', fontSize: '11px' }}
                                    >
                                      <MessageSquare size={11} color="#7A1F3D" />
                                      <span>Note</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleViewJobCaseFile(emp.workOrder)}
                                      title="Inspect Case File / Traveler"
                                      style={{ padding: '3px 7px', fontSize: '11px' }}
                                    >
                                      <FileText size={11} color="#7A1F3D" />
                                      <span>Case File</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleUnassignWorker(emp)}
                                      title="Unassign / Free Technician (Admin Action)"
                                      style={{ padding: '3px 6px', fontSize: '11px', color: '#dc2626' }}
                                    >
                                      <XCircle size={12} color="#dc2626" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                      setAssignJobTarget(null);
                                      setAssignJobForm(prev => ({ ...prev, employeeId: emp.id }));
                                      setIsAssignJobModalOpen(true);
                                    }}
                                    title="Deploy worker to active job"
                                    style={{ padding: '3px 8px', fontSize: '11px' }}
                                  >
                                    <UserCheck size={11} />
                                    <span>Assign Job</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenAddLog(emp)}
                                  title="Add Work Log for this employee"
                                  style={{ padding: '3px 6px', fontSize: '11px' }}
                                >
                                  <Plus size={11} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setSelectedStaff(emp)}
                                  title="View Employee Activity Log"
                                  style={{ padding: '3px 6px', fontSize: '11px' }}
                                >
                                  <Eye size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}






        {/* ========================================================================= */}
        {/* TAB 3: DEPARTMENT WORKLOAD                                                */}
        {/* ========================================================================= */}
        {activeTab === 'workload' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Briefcase size={16} color="#7A1F3D" />
                <span>Department Workload & Operational Capacity</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Cross-department staff loading, open operations, and logged hours
              </span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Employees</th>
                    <th>Active Tasks</th>
                    <th>Completed Today</th>
                    <th>Hours Logged</th>
                    <th>Workload %</th>
                    <th>Capacity Status</th>
                  </tr>
                </thead>
                <tbody>
                  {INITIAL_DEPARTMENTS_WORKLOAD.map((dept) => {
                    const isHigh = dept.utilization >= 90;
                    return (
                      <tr key={dept.department}>
                        <td style={{ fontWeight: 600, fontSize: '13px' }}>
                          {dept.department}
                        </td>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {dept.staffCount} staff
                        </td>
                        <td className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          {dept.activeTasks} tasks
                        </td>
                        <td className="mono" style={{ color: '#059669', fontWeight: 600 }}>
                          {dept.completedToday} ops
                        </td>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {dept.hoursLogged}
                        </td>
                        <td style={{ minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar
                                progress={dept.utilization}
                                height={7}
                                color={isHigh ? '#dc2626' : undefined}
                              />
                            </div>
                            <span className="mono" style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: isHigh ? '#dc2626' : 'var(--text-main)',
                              width: '40px',
                              textAlign: 'right'
                            }}>
                              {dept.utilization}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            status={isHigh ? 'Overloaded' : dept.utilization >= 80 ? 'Operating' : 'Available'}
                            size="sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ALL WORK LOGS (ENTERPRISE REGISTER)                                 */}
        {/* ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <FileText size={16} color="#7A1F3D" />
                <span>Plant-Wide Employee Work Log Register</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportWorkLogs}
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenAddLog(null)}
                >
                  <Plus size={13} />
                  <span>+ Add Work Log</span>
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Task</th>
                    <th>Work Order</th>
                    <th>Spindle</th>
                    <th>Machine / Workstation</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {workLogs.map((log) => (
                    <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLogDetail(log)}>
                      <td className="mono" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {log.date}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{log.employeeName}</div>
                        <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{log.employeeId}</div>
                      </td>
                      <td className="mono" style={{ fontSize: '11px' }}>{log.startTime}</td>
                      <td className="mono" style={{ fontSize: '11px' }}>{log.endTime}</td>
                      <td className="mono" style={{ fontSize: '11.5px', fontWeight: 600 }}>{log.duration}</td>
                      <td style={{ fontWeight: 600, fontSize: '12px' }}>{log.task}</td>
                      <td>
                        <span
                          className="mono"
                          style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewWorkOrder(log.workOrder);
                          }}
                        >
                          {log.workOrder}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '11px' }}>{log.spindle}</td>
                      <td style={{ fontSize: '11.5px' }}>
                        <span>{log.machine}</span>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{log.bay?.replace(/Bay/gi, 'Station')}</div>
                      </td>
                      <td style={{ minWidth: '90px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1 }}>
                            <ProgressBar progress={log.progress} height={5} />
                          </div>
                          <span className="mono" style={{ fontSize: '10.5px', fontWeight: 600 }}>{log.progress}%</span>
                        </div>
                      </td>
                      <td><StatusBadge status={log.status} size="sm" /></td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.remarks}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogDetail(log);
                          }}
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ACTIVE JOBS & PRIORITY ASSIGNMENT COMMAND CENTER                     */}
        {/* ========================================================================= */}
        {activeTab === 'jobs' && (() => {
          const PRIORITY_ORDER = { 'Critical': 0, 'High': 1, 'Normal': 2, 'Low': 3 };
          const PRIORITY_COLORS = {
            Critical: { bg: '#fef2f2', border: '#fca5a5', badge: '#dc2626', text: '#991b1b' },
            High: { bg: '#fff7ed', border: '#fdba74', badge: '#ea580c', text: '#9a3412' },
            Normal: { bg: '#eff6ff', border: '#93c5fd', badge: '#2563eb', text: '#1d4ed8' },
            Low: { bg: '#f0fdf4', border: '#86efac', badge: '#16a34a', text: '#15803d' }
          };
          const STATUS_COLORS = {
            'In Progress': { bg: '#eff6ff', color: '#1d4ed8' },
            'Active': { bg: '#eff6ff', color: '#1d4ed8' },
            'QC Pending': { bg: '#fef9c3', color: '#92400e' },
            'Under Diagnosis': { bg: '#fdf4ff', color: '#7e22ce' },
            'Under Inspection': { bg: '#fdf4ff', color: '#7e22ce' },
            'Dispatch Ready': { bg: '#f0fdf4', color: '#15803d' },
            'Completed': { bg: '#f0fdf4', color: '#15803d' },
            'Paused': { bg: '#fafafa', color: '#6b7280' },
            'On Hold': { bg: '#fafafa', color: '#6b7280' },
          };

          const productionJobs = availableWorkOrders.map(wo => ({
            id: wo.id || wo.workOrderNo || `WO-${Math.random().toString(36).slice(2, 8)}`,
            type: 'production',
            typeLabel: 'Production',
            serial: wo.spindleSerial || wo.serial || 'Spindle',
            model: wo.spindleModel || 'Motorized Spindle',
            customer: wo.customer || 'Customer',
            priority: wo.priority || 'Normal',
            status: wo.status || 'In Progress',
            currentStage: wo.currentStage || 'machining',
            currentStageKey: (wo.currentStage || 'machining').toLowerCase(),
            dueDate: wo.dueDate || '—',
            assignedTo: wo.assignedTo || wo.leadOperator || staffList.find(s => s.workOrder === (wo.id || wo.workOrderNo))?.name || null,
            bay: wo.currentOperation || 'Station 1 - Machining',
            machine: wo.machine || 'Okuma LB3000 Lathe',
            progress: wo.progress || 0,
            notes: wo.notes || wo.technicianNotes || wo.remarks || '',
            lastNoteBy: wo.lastNoteBy || null,
            lastNoteAt: wo.lastNoteAt || null,
            notesHistory: wo.notesHistory || wo.stageLogs || []
          }));

          let localSrv = [];
          try { localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]'); } catch (e) { }
          const allSrvData = [...localSrv, ...SERVICE_JOBS.filter(s => !localSrv.some(ls => ls.id === s.id))];

          const serviceJobsAll = allSrvData.map(sr => ({
            id: sr.id,
            type: 'service',
            typeLabel: 'Service Repair',
            serial: sr.spindleSerial || 'Spindle',
            model: sr.spindleModel || 'Service Spindle',
            customer: sr.customer || 'Customer',
            priority: sr.priority || 'Normal',
            status: sr.status || 'In Progress',
            currentStage: sr.currentStage || sr.lifecycle?.find(l => l.active)?.name || 'Incoming Inspection',
            currentStageKey: (sr.currentStage || 'inspection').toLowerCase(),
            dueDate: sr.targetDate || sr.dueDate || '—',
            assignedTo: sr.assignedTo || sr.technician || staffList.find(s => s.workOrder === sr.id)?.name || null,
            bay: sr.bay || 'Station 6 - QC Metrology',
            machine: sr.machine || 'Zeiss CMM & Runout Test Station',
            progress: sr.progress || (sr.stageIndex ? Math.round((sr.stageIndex / 9) * 100) : 30),
            complaint: sr.complaint || sr.failure_description,
            notes: sr.notes || sr.technicianNotes || sr.remarks || '',
            lastNoteBy: sr.lastNoteBy || null,
            lastNoteAt: sr.lastNoteAt || null,
            notesHistory: sr.notesHistory || sr.stageLogs || []
          }));

          const rawAllJobs = [...productionJobs, ...serviceJobsAll];
          const totalJobsCount = rawAllJobs.length;
          const totalProdCount = rawAllJobs.filter(j => j.type === 'production').length;
          const totalSrvCount = rawAllJobs.filter(j => j.type === 'service').length;
          const totalUnassignedCount = rawAllJobs.filter(j => !j.assignedTo).length;
          const totalCriticalCount = rawAllJobs.filter(j => j.priority === 'Critical').length;

          let allJobs = [...rawAllJobs];

          // Filters
          if (jobTypeFilter !== 'all') allJobs = allJobs.filter(j => j.type === jobTypeFilter);
          if (jobPriorityFilter !== 'all') allJobs = allJobs.filter(j => (j.priority || '').toLowerCase() === jobPriorityFilter.toLowerCase());
          if (jobStatusFilter !== 'all') {
            if (jobStatusFilter === 'unassigned') {
              allJobs = allJobs.filter(j => !j.assignedTo);
            } else {
              allJobs = allJobs.filter(j => j.status.toLowerCase().includes(jobStatusFilter.toLowerCase()));
            }
          }
          if (jobSearchQuery.trim()) {
            const q = jobSearchQuery.toLowerCase().trim();
            allJobs = allJobs.filter(j =>
              j.id.toLowerCase().includes(q) ||
              j.serial.toLowerCase().includes(q) ||
              j.customer.toLowerCase().includes(q) ||
              j.model.toLowerCase().includes(q) ||
              (j.assignedTo || '').toLowerCase().includes(q) ||
              (j.currentStage || '').toLowerCase().includes(q)
            );
          }

          // Sort
          if (jobSortBy === 'priority') {
            allJobs.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));
          } else if (jobSortBy === 'due') {
            allJobs.sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
          } else if (jobSortBy === 'progress_asc') {
            allJobs.sort((a, b) => a.progress - b.progress);
          } else if (jobSortBy === 'type') {
            allJobs.sort((a, b) => a.type.localeCompare(b.type));
          }

          const hasActiveJobFilters = jobTypeFilter !== 'all' || jobPriorityFilter !== 'all' || jobStatusFilter !== 'all' || jobSearchQuery.trim() !== '';

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Quick Filter Pills & Search Bar */}
              <div className="workforce-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Top Row: Quick Category Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${jobTypeFilter === 'all' && jobPriorityFilter === 'all' && jobStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setJobTypeFilter('all'); setJobPriorityFilter('all'); setJobStatusFilter('all'); setJobSearchQuery(''); }}
                    style={{ height: '28px', fontSize: '11px', padding: '0 10px', borderRadius: '4px' }}
                  >
                    All Jobs ({totalJobsCount})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${jobTypeFilter === 'production' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setJobTypeFilter(jobTypeFilter === 'production' ? 'all' : 'production')}
                    style={{ height: '28px', fontSize: '11px', padding: '0 10px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Cpu size={11} />
                    Production ({totalProdCount})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${jobTypeFilter === 'service' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setJobTypeFilter(jobTypeFilter === 'service' ? 'all' : 'service')}
                    style={{ height: '28px', fontSize: '11px', padding: '0 10px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Wrench size={11} />
                    Service Repairs ({totalSrvCount})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${jobStatusFilter === 'unassigned' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setJobStatusFilter(jobStatusFilter === 'unassigned' ? 'all' : 'unassigned')}
                    style={{
                      height: '28px',
                      fontSize: '11px',
                      padding: '0 10px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: totalUnassignedCount > 0 && jobStatusFilter !== 'unassigned' ? '#dc2626' : undefined,
                      borderColor: totalUnassignedCount > 0 && jobStatusFilter !== 'unassigned' ? '#fca5a5' : undefined
                    }}
                  >
                    <AlertTriangle size={11} />
                    Unassigned ({totalUnassignedCount})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${jobPriorityFilter === 'critical' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setJobPriorityFilter(jobPriorityFilter === 'critical' ? 'all' : 'critical')}
                    style={{
                      height: '28px',
                      fontSize: '11px',
                      padding: '0 10px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: totalCriticalCount > 0 && jobPriorityFilter !== 'critical' ? '#dc2626' : undefined
                    }}
                  >
                    <AlertCircle size={11} />
                    Critical ({totalCriticalCount})
                  </button>
                  <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Showing <strong>{allJobs.length}</strong> of {totalJobsCount} jobs
                  </div>
                </div>

                {/* Bottom Row: Detailed Search & Select Filters */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search job ID, serial, customer, technician..."
                      value={jobSearchQuery}
                      onChange={e => setJobSearchQuery(e.target.value)}
                      style={{ paddingLeft: '32px', height: '32px', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Type:</span>
                    <CustomSelect
                      value={jobTypeFilter}
                      onChange={e => setJobTypeFilter(e.target.value)}
                      style={{ minWidth: '130px' }}
                      options={[
                        { value: 'all', label: 'All Types' },
                        { value: 'production', label: 'Production (WO)' },
                        { value: 'service', label: 'Service (SR)' }
                      ]}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Priority:</span>
                    <CustomSelect
                      value={jobPriorityFilter}
                      onChange={e => setJobPriorityFilter(e.target.value)}
                      style={{ minWidth: '120px' }}
                      options={[
                        { value: 'all', label: 'All Priorities' },
                        { value: 'critical', label: 'Critical' },
                        { value: 'high', label: 'High' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'low', label: 'Low' }
                      ]}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status:</span>
                    <CustomSelect
                      value={jobStatusFilter}
                      onChange={e => setJobStatusFilter(e.target.value)}
                      style={{ minWidth: '140px' }}
                      options={[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'unassigned', label: 'Unassigned Only' },
                        { value: 'progress', label: 'In Progress' },
                        { value: 'qc', label: 'QC Pending' },
                        { value: 'diagnosis', label: 'Under Diagnosis' },
                        { value: 'dispatch', label: 'Dispatch Ready' }
                      ]}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sort:</span>
                    <CustomSelect
                      value={jobSortBy}
                      onChange={e => setJobSortBy(e.target.value)}
                      style={{ minWidth: '135px' }}
                      options={[
                        { value: 'priority', label: 'Priority' },
                        { value: 'due', label: 'Due Date' },
                        { value: 'progress_asc', label: 'Progress ↑' },
                        { value: 'type', label: 'Type' }
                      ]}
                    />
                  </div>

                  {hasActiveJobFilters && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setJobTypeFilter('all');
                        setJobPriorityFilter('all');
                        setJobStatusFilter('all');
                        setJobSearchQuery('');
                      }}
                      style={{ height: '32px', fontSize: '11px' }}
                    >
                      <X size={12} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Jobs List Table (Matching Who's Working Now structure) */}
              <div className="section-card">
                <div className="card-header">
                  <div className="card-title">
                    <Briefcase size={16} color="#7A1F3D" />
                    <span>Active Jobs & Stage Assignment Register</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Click any job row to open engineering traveler or update active stage work
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Job Order & Stream</th>
                        <th>Customer & Spindle Unit</th>
                        <th>Stream & Active Stage</th>
                        <th>Workstation / Machine</th>
                        <th>Assigned Technician</th>
                        <th>Priority</th>
                        <th>Due Date</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allJobs.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No active jobs match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        allJobs.map((job) => {
                          const pc = PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.Normal;
                          const sc = STATUS_COLORS[job.status] || { bg: '#f8fafc', color: '#64748b' };
                          const assignedStaff = staffList.find(s => s.name === job.assignedTo);
                          const stageInfo = getJobStageInfo(job);

                          return (
                            <tr
                              key={job.id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleViewJobCaseFile(job)}
                            >
                              {/* 1. Job Order ID & Stream */}
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span
                                      className="mono"
                                      style={{
                                        fontWeight: 700,
                                        fontSize: '12.5px',
                                        color: 'var(--primary)',
                                        textDecoration: 'underline'
                                      }}
                                    >
                                      {job.id}
                                    </span>
                                  </div>
                                  <span style={{
                                    fontSize: '9.5px',
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    background: job.type === 'production' ? '#dbeafe' : '#ede9fe',
                                    color: job.type === 'production' ? '#1d4ed8' : '#6d28d9',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    width: 'fit-content'
                                  }}>
                                    {job.type === 'production' ? <Cpu size={9} /> : <Wrench size={9} />}
                                    {job.type === 'production' ? 'PROD · 8 STAGES' : 'SERVICE · 9 STAGES'}
                                  </span>
                                </div>
                              </td>

                              {/* 2. Customer & Spindle Unit */}
                              <td>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                                  {job.customer}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  {job.model} · <span className="mono" style={{ fontWeight: 600 }}>{job.serial}</span>
                                </div>
                                {job.type === 'service' && job.complaint && (
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      color: 'var(--text-muted)',
                                      fontStyle: 'italic',
                                      maxWidth: '220px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={job.complaint}
                                  >
                                    "{job.complaint}"
                                  </div>
                                )}
                              </td>

                              {/* 3. Stream & Active Stage */}
                              <td>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      fontWeight: 700
                                    }}>
                                      Step {stageInfo.currentStep}/{stageInfo.totalSteps}
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: '11.5px', color: 'var(--text-main)' }}>
                                      {stageInfo.shortName}
                                    </span>
                                  </div>
                                  <div
                                    style={{ display: 'flex', gap: '2px', alignItems: 'center', maxWidth: '130px', marginTop: '3px' }}
                                    title={`Step ${stageInfo.currentStep}: ${stageInfo.name}`}
                                  >
                                    {stageInfo.stages.map((stg, sIdx) => {
                                      const isDone = sIdx < stageInfo.currentIndex;
                                      const isCurrent = sIdx === stageInfo.currentIndex;
                                      return (
                                        <div
                                          key={stg.key}
                                          title={`Step ${stg.step}: ${stg.name}`}
                                          style={{
                                            flex: 1,
                                            height: '4px',
                                            borderRadius: '2px',
                                            background: isDone ? '#16a34a' : (isCurrent ? '#7A1F3D' : '#e2e8f0')
                                          }}
                                        />
                                      );
                                    })}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {job.currentStage}
                                  </div>
                                  {job.notes && (
                                    <div
                                      style={{
                                        marginTop: '4px',
                                        fontSize: '10.5px',
                                        color: '#334155',
                                        background: '#f8fafc',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        maxWidth: '220px'
                                      }}
                                      title={`Technician Note: ${job.notes}${job.lastNoteBy ? ` (by ${job.lastNoteBy})` : ''}`}
                                    >
                                      <MessageSquare size={10} color="#7A1F3D" style={{ flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {job.notes}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 4. Machine / Workstation */}
                              <td style={{ fontSize: '11.5px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                  {job.machine || stageInfo.defaultMachine}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                  {(job.bay || stageInfo.defaultBay)?.replace(/Bay/gi, 'Station')}
                                </div>
                              </td>

                              {/* 5. Assigned Technician */}
                              <td>
                                {job.assignedTo ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '50%',
                                      background: assignedStaff?.avatarColor || '#7A1F3D',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      color: '#fff',
                                      flexShrink: 0
                                    }}>
                                      {assignedStaff?.initials || job.assignedTo.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#166534' }}>
                                        {job.assignedTo}
                                      </div>
                                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                        {assignedStaff ? `${assignedStaff.role}` : `Step ${stageInfo.currentStep}`}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fca5a5',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <AlertTriangle size={11} /> Unassigned
                                  </span>
                                )}
                              </td>

                              {/* 6. Priority */}
                              <td>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: pc.bg,
                                  color: pc.text,
                                  border: `1px solid ${pc.border}`,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {job.priority}
                                </span>
                              </td>

                              {/* 7. Due Date */}
                              <td className="mono" style={{ fontSize: '11.5px', fontWeight: 600, color: '#b45309' }}>
                                {job.dueDate}
                              </td>

                              {/* 8. Progress */}
                              <td style={{ minWidth: '95px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ flex: 1 }}>
                                    <ProgressBar progress={job.progress} height={5} />
                                  </div>
                                  <span className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>
                                    {job.progress}%
                                  </span>
                                </div>
                              </td>

                              {/* 9. Status */}
                              <td>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: sc.bg,
                                  color: sc.color,
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {job.status}
                                </span>
                              </td>

                              {/* 10. Actions */}
                              <td style={{ textAlign: 'center' }}>
                                <div
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className={job.assignedTo ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                                    onClick={() => {
                                      setAssignJobTarget(job);
                                      setAssignJobForm({
                                        employeeId: assignedStaff?.id || '',
                                        stageKey: stageInfo.stageKey,
                                        machine: stageInfo.defaultMachine,
                                        bay: stageInfo.defaultBay,
                                        task: `${stageInfo.shortName} Operation`,
                                        expectedDuration: '2h 00m',
                                        remarks: `Assigned to ${job.id} (${job.customer}) on Stage ${stageInfo.currentStep}: ${stageInfo.shortName}.`
                                      });
                                      setIsAssignJobModalOpen(true);
                                    }}
                                    title={job.assignedTo ? "Reassign staff to this job" : "Assign staff to this job"}
                                    style={{ padding: '3px 8px', fontSize: '11px' }}
                                  >
                                    <UserCheck size={11} />
                                    <span>{job.assignedTo ? 'Reassign' : 'Assign'}</span>
                                  </button>

                                  {job.assignedTo && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleOpenStageWork(job, assignedStaff)}
                                      title="Update active stage work progress & precision measurements"
                                      style={{ padding: '3px 8px', fontSize: '11px', borderColor: '#7A1F3D', color: '#7A1F3D' }}
                                    >
                                      <Edit3 size={11} color="#7A1F3D" />
                                      <span>Stage Work</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleOpenJobNote(job, assignedStaff)}
                                    title="Add or view technician notes for this job"
                                    style={{ padding: '3px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <MessageSquare size={11} color="#7A1F3D" />
                                    <span>Note</span>
                                    {job.notesHistory?.length > 0 && (
                                      <span style={{
                                        fontSize: '9px',
                                        background: '#7A1F3D',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        padding: '0 4px',
                                        lineHeight: '13px'
                                      }}>
                                        {job.notesHistory.length}
                                      </span>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleViewJobCaseFile(job)}
                                    title="Open Engineering Traveler / Service Case File"
                                    style={{ padding: '3px 7px', fontSize: '11px' }}
                                  >
                                    <FileText size={11} color="#7A1F3D" />
                                    <span>Traveler</span>
                                  </button>

                                  {job.assignedTo && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleUnassignWorker(job)}
                                      title="Unassign technician from job (Admin control)"
                                      style={{ padding: '3px 6px', fontSize: '11px', color: '#dc2626' }}
                                    >
                                      <XCircle size={12} color="#dc2626" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Available Workers Pool */}
              <div className="section-card">
                <div className="card-header">
                  <div className="card-title">
                    <Users size={15} color="#7A1F3D" />
                    <span>Available Workers Pool — Ready to Deploy</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {staffList.filter(s => s.status === 'Available' || s.status === 'Idle').length} technicians available
                  </span>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {staffList.filter(s => s.status === 'Available' || s.status === 'Idle').length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
                      No workers currently available. All deployed on active tasks.
                    </div>
                  ) : (
                    staffList.filter(s => s.status === 'Available' || s.status === 'Idle').map(emp => (
                      <div
                        key={emp.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setAssignJobForm(prev => ({ ...prev, employeeId: emp.id }));
                          setIsAssignJobModalOpen(true);
                          setAssignJobTarget(null);
                        }}
                        title={`Click to assign ${emp.name} to a job`}
                      >
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: emp.avatarColor || '#7A1F3D',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, color: '#fff'
                        }}>
                          {emp.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12px', color: '#166534' }}>{emp.name}</div>
                          <div style={{ fontSize: '10px', color: '#15803d' }}>{emp.role} · {emp.bay?.replace(/Bay/gi, 'Station')}</div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 700
                        }}>AVAILABLE</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="section-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowRight size={14} color="#7A1F3D" />
                  Quick Navigation — Jump to Related Modules
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: 'Production Management', screen: 'production', icon: Cpu, desc: 'Work Orders & Operations' },
                    { label: 'Service & Repairs', screen: 'service', icon: Wrench, desc: 'Customer RMA & Overhaul' },
                    { label: 'Quality Control', screen: 'quality', icon: Shield, desc: 'Inspection & Metrology' },
                    { label: 'Inventory & Stores', screen: 'inventory', icon: Layers, desc: 'Parts & Components' },
                    { label: 'Dashboard', screen: 'dashboard', icon: BarChart2, desc: 'Plant Overview' },
                  ].map(link => {
                    const LinkIcon = link.icon;
                    return (
                      onNavigate && (
                        <button
                          key={link.screen}
                          type="button"
                          className="btn btn-secondary"
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 14px', gap: '2px', minWidth: '160px', textAlign: 'left' }}
                          onClick={() => onNavigate(link.screen)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
                            <LinkIcon size={14} color="#7A1F3D" />
                            {link.label}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '20px' }}>{link.desc}</div>
                        </button>
                      )
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* 6. EMPLOYEE PROFILE / DETAIL DRAWER MODAL                                 */}
        {/* ========================================================================= */}
        {selectedStaff && (
          <Modal
            isOpen={Boolean(selectedStaff)}
            onClose={() => setSelectedStaff(null)}
            title={`Employee Profile: ${selectedStaff.name} (${selectedStaff.id})`}
            maxWidth="920px"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Joined {selectedStaff.joiningDate} • Hours: 08:30 - 17:30
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenAddLog(selectedStaff)}
                  >
                    <Plus size={13} />
                    <span>+ Add Work Log</span>
                  </button>

                  {selectedStaff.workOrder !== '—' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        handleViewWorkOrder(selectedStaff.workOrder);
                        setSelectedStaff(null);
                      }}
                    >
                      <ArrowRight size={13} />
                      <span>Open Work Order {selectedStaff.workOrder}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setSelectedStaff(null)}
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header: Photo/Avatar, Name, ID, Department, Role, Station */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                background: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                <div
                  className="staff-avatar"
                  style={{ width: '52px', height: '52px', fontSize: '20px', background: selectedStaff.avatarColor || '#7A1F3D' }}
                >
                  {selectedStaff.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{selectedStaff.name}</h3>
                    <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{selectedStaff.id}</span>
                    <StatusBadge status={selectedStaff.status} size="sm" />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {selectedStaff.designation} • <strong>{selectedStaff.department}</strong> ({selectedStaff.subDepartment})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={11} /> Current Station: <strong>{selectedStaff.location || selectedStaff.machine}</strong> • Hours: 08:30 - 17:30
                  </div>
                </div>
              </div>

              {/* Profile Navigation Sub-Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => setProfileTab('summary')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: profileTab === 'summary' ? '2px solid var(--primary)' : '2px solid transparent',
                    padding: '6px 0',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: profileTab === 'summary' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Today's Summary & Current Task
                </button>

                <button
                  type="button"
                  onClick={() => setProfileTab('worklog')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: profileTab === 'worklog' ? '2px solid var(--primary)' : '2px solid transparent',
                    padding: '6px 0',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: profileTab === 'worklog' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Work Log History ({selectedStaffLogs.length})
                </button>

                <button
                  type="button"
                  onClick={() => setProfileTab('timeline')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: profileTab === 'timeline' ? '2px solid var(--primary)' : '2px solid transparent',
                    padding: '6px 0',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: profileTab === 'timeline' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Work Log Timeline
                </button>

                <button
                  type="button"
                  onClick={() => setProfileTab('analytics')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: profileTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent',
                    padding: '6px 0',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: profileTab === 'analytics' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Productivity & Hours
                </button>
              </div>

              {/* TAB CONTENT 1: SUMMARY & CURRENT TASK */}
              {profileTab === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* 1. Today's Summary Card */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Today's Performance Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', textAlign: 'center' }}>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Assigned</div>
                        <div className="mono" style={{ fontSize: '15px', fontWeight: 700 }}>{selectedStaff.todaySummary?.tasksAssigned || selectedStaff.tasksToday}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Completed</div>
                        <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#059669' }}>{selectedStaff.todaySummary?.tasksCompleted || selectedStaff.completedToday}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>In Progress</div>
                        <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>{selectedStaff.todaySummary?.tasksInProgress || (selectedStaff.status === 'Working' ? 1 : 0)}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Hours Logged</div>
                        <div className="mono" style={{ fontSize: '15px', fontWeight: 700 }}>{selectedStaff.todaySummary?.hoursLogged || selectedStaff.hoursLogged}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Overtime</div>
                        <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: selectedStaff.overtime !== '0m' ? '#d97706' : 'var(--text-main)' }}>{selectedStaff.todaySummary?.overtime || selectedStaff.overtime}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg Progress</div>
                        <div className="mono" style={{ fontSize: '15px', fontWeight: 700 }}>{selectedStaff.todaySummary?.avgProgress || selectedStaff.progress}%</div>
                      </div>
                    </div>
                  </div>

                  {/* 2. DEDICATED CURRENT TASK CARD */}
                  <div style={{
                    padding: '14px',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={16} color="var(--primary)" />
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>Current Active Task</span>
                      </div>
                      <StatusBadge status={selectedStaff.status} size="sm" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Task Name</div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                          {selectedStaff.currentTask}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Work Order</div>
                        <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {selectedStaff.workOrder}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Spindle</div>
                        <div className="mono" style={{ fontWeight: 700 }}>
                          {selectedStaff.spindleSerial}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Machine / Station</div>
                        <div style={{ fontWeight: 600 }}>{selectedStaff.machine}</div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Started & Elapsed</div>
                        <div className="mono" style={{ fontWeight: 600 }}>
                          {selectedStaff.started} • {selectedStaff.duration}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expected Completion</div>
                        <div className="mono" style={{ fontWeight: 600 }}>{selectedStaff.expectedCompletion}</div>
                      </div>

                      <div style={{ gridColumn: 'span 3', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Current Progress</span>
                          <span className="mono" style={{ fontWeight: 700 }}>{selectedStaff.progress}%</span>
                        </div>
                        <ProgressBar progress={selectedStaff.progress} height={7} />
                      </div>
                    </div>

                    {/* Task Fast Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-color)',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenUpdateProgress(selectedStaff)}
                        title="Update percentage completion"
                      >
                        <Edit3 size={13} />
                        <span>Update Progress</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenAddLog(selectedStaff)}
                        title="Log completed work session"
                      >
                        <Plus size={13} />
                        <span>+ Add Work Log</span>
                      </button>

                      {selectedStaff.status === 'Available' || selectedStaff.status === 'Idle' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenStartTask(selectedStaff)}
                        >
                          <Play size={13} />
                          <span>Start Task</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenPauseTask(selectedStaff)}
                          >
                            <Pause size={13} />
                            <span>Pause Task</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenCompleteTask(selectedStaff)}
                            style={{ background: '#059669', borderColor: '#059669' }}
                          >
                            <Check size={13} />
                            <span>Complete Task</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 3. Qualifications Snapshot */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Certified Competencies & Accreditations
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {selectedStaff.qualifications?.map((q, idx) => (
                        <div key={idx} style={{ fontSize: '11.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={12} color="#059669" />
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 2: WORK LOG HISTORY */}
              {profileTab === 'worklog' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Period Selector Tabs */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['today', 'this_week', 'this_month', 'all'].map((period) => (
                        <button
                          key={period}
                          type="button"
                          className={`btn btn-sm ${logPeriodFilter === period ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setLogPeriodFilter(period)}
                          style={{ textTransform: 'capitalize', fontSize: '11px', padding: '3px 10px' }}
                        >
                          {period === 'this_week' ? 'This Week' : period === 'this_month' ? 'This Month' : period === 'all' ? 'All History' : 'Today'}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setPreviewDoc({
                            type: 'Report',
                            reportTitle: `EMPLOYEE WORK LOG & PRODUCTIVITY DOSSIER: ${selectedStaff.name} (${selectedStaff.id})`,
                            id: `LOG-${selectedStaff.id}-${new Date().toISOString().split('T')[0]}`,
                            metrics: [
                              { label: 'Department', value: selectedStaff.department },
                              { label: 'Workstation', value: `${selectedStaff.location || selectedStaff.machine || 'Shop Floor Main'}` },
                              { label: 'Logged Entries', value: selectedStaffLogs.length },
                              { label: 'Hours Logged', value: selectedStaff.hoursLogged || '8.2h' }
                            ],
                            headers: ['#', 'Date & Time', 'Duration', 'Task & Operation', 'Work Order', 'Spindle Serial', 'Progress', 'Status'],
                            rows: selectedStaffLogs.map((log, idx) => [
                              idx + 1,
                              `${log.date} ${log.startTime}–${log.endTime}`,
                              log.duration,
                              log.task,
                              log.workOrder,
                              log.spindle,
                              `${log.progress}%`,
                              log.status
                            ])
                          });
                          setIsPreviewOpen(true);
                        }}
                        title="Preview & Export Official Work Log Report (PDF)"
                      >
                        <Download size={12} />
                        <span>Export Log (PDF)</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenAddLog(selectedStaff)}
                      >
                        <Plus size={12} />
                        <span>Add Log Entry</span>
                      </button>
                    </div>
                  </div>

                  {/* Log Search & Filter */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Filter by task, WO, machine, remarks..."
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        style={{ paddingLeft: '28px', height: '28px', fontSize: '11.5px' }}
                      />
                    </div>

                    <CustomSelect
                      value={logStatusFilter}
                      onChange={(e) => setLogStatusFilter(e.target.value)}
                      style={{ width: '130px' }}
                      options={[
                        { value: 'All', label: 'All Status' },
                        { value: 'Completed', label: 'Completed' },
                        { value: 'In Progress', label: 'In Progress' },
                        { value: 'Paused', label: 'Paused' }
                      ]}
                    />
                  </div>

                  {/* Work Log Table */}
                  <div className="table-responsive" style={{ maxHeight: '320px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Duration</th>
                          <th>Task</th>
                          <th>Work Order</th>
                          <th>Spindle</th>
                          <th>Station</th>
                          <th>Progress</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStaffLogs.length === 0 ? (
                          <tr>
                            <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No work logs recorded for this period. Click "+ Add Work Log" to create an entry.
                            </td>
                          </tr>
                        ) : (
                          selectedStaffLogs.map((log) => (
                            <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLogDetail(log)}>
                              <td className="mono" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{log.date}</td>
                              <td className="mono" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{log.startTime}–{log.endTime}</td>
                              <td className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>{log.duration}</td>
                              <td style={{ fontWeight: 600, fontSize: '11.5px' }}>{log.task}</td>
                              <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>{log.workOrder}</td>
                              <td className="mono" style={{ fontSize: '11px' }}>{log.spindle}</td>
                              <td style={{ fontSize: '11px' }}>{log.machine}</td>
                              <td style={{ minWidth: '70px' }}>
                                <span className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>{log.progress}%</span>
                              </td>
                              <td><StatusBadge status={log.status} size="sm" /></td>
                              <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.remarks}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: VISUAL WORK LOG TIMELINE */}
              {profileTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Chronological progression of tasks and operations performed by {selectedStaff.name} today (09 Sep 2026):
                  </div>

                  <div className="worklog-timeline" style={{ marginTop: '10px' }}>
                    {selectedStaffLogs.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No timeline entries available for today.</div>
                    ) : (
                      selectedStaffLogs.map((log, idx) => (
                        <div key={log.id} className="worklog-timeline-item">
                          <div className={`worklog-timeline-node ${log.status === 'Completed' ? 'completed' : 'active'}`} />
                          <div style={{
                            padding: '10px 14px',
                            background: '#ffffff',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="mono" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--primary)' }}>
                                  {log.startTime} – {log.endTime} ({log.duration})
                                </span>
                                <StatusBadge status={log.status} size="sm" />
                              </div>
                              <span className="mono" style={{ fontSize: '11.5px', fontWeight: 700 }}>
                                {log.progress}% Completed
                              </span>
                            </div>

                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {log.task}
                            </div>

                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span>Work Order: <strong className="mono" style={{ color: 'var(--primary)' }}>{log.workOrder}</strong></span>
                              <span>• Spindle: <strong className="mono">{log.spindle}</strong></span>
                              <span>• Machine: <strong>{log.machine} ({log.bay?.replace(/Bay/gi, 'Station')})</strong></span>
                            </div>

                            {log.remarks && (
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', background: 'var(--bg-surface-subtle)', padding: '6px 8px', borderRadius: '4px', marginTop: '4px' }}>
                                "{log.remarks}"
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT 4: PRODUCTIVITY & HOURS ANALYTICS */}
              {profileTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* 6 Key Analytics Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Total Hours Logged</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{selectedStaff.analytics?.totalHours || '8.2h'}</div>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Productive Hours</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>{selectedStaff.analytics?.productiveHours || '7.5h'}</div>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Break Time</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#d97706', marginTop: '2px' }}>{selectedStaff.analytics?.breakTime || '40m'}</div>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Overtime Logged</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#047857', marginTop: '2px' }}>{selectedStaff.analytics?.overtime || '35m'}</div>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Tasks Completed</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>{selectedStaff.analytics?.tasksCompleted || '5'}</div>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Avg Task Duration</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{selectedStaff.analytics?.avgTaskDuration || '1h 30m'}</div>
                    </div>
                  </div>

                  {/* CSS Bar Visualizations: Daily Hours & Tasks Completed */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {/* Daily Hours Chart */}
                    <div style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Daily Work Hours (Week)</span>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--primary)' }}>Target: 8.0h / day</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                        {(selectedStaff.analytics?.dailyHours || [
                          { day: 'Mon', hours: 7.2 },
                          { day: 'Tue', hours: 8.1 },
                          { day: 'Wed', hours: 7.8 },
                          { day: 'Thu', hours: 0 },
                          { day: 'Fri', hours: 0 }
                        ]).map((d) => {
                          const pct = Math.min(100, Math.round((d.hours / 9.0) * 100));
                          return (
                            <div key={d.day} className="chart-bar-container">
                              <span className="mono" style={{ fontSize: '10px', fontWeight: 600 }}>{d.hours > 0 ? `${d.hours}h` : '—'}</span>
                              <div className="chart-bar-bg">
                                <div className="chart-bar-fill" style={{ height: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{d.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tasks Completed Chart */}
                    <div style={{ padding: '12px 14px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tasks Completed per Day</span>
                        <span className="mono" style={{ fontSize: '11px', color: '#059669' }}>Avg: 5.8 / day</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                        {(selectedStaff.analytics?.dailyHours || [
                          { day: 'Mon', tasks: 5 },
                          { day: 'Tue', tasks: 7 },
                          { day: 'Wed', tasks: 6 },
                          { day: 'Thu', tasks: 0 },
                          { day: 'Fri', tasks: 0 }
                        ]).map((d) => {
                          const pct = Math.min(100, Math.round(((d.tasks || 0) / 8.0) * 100));
                          return (
                            <div key={d.day} className="chart-bar-container">
                              <span className="mono" style={{ fontSize: '10px', fontWeight: 600 }}>{d.tasks > 0 ? d.tasks : '—'}</span>
                              <div className="chart-bar-bg">
                                <div className="chart-bar-fill secondary" style={{ height: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{d.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* 7. MODAL: ADD WORK LOG (+ Add Work Log)                                    */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isAddLogModalOpen}
          onClose={() => setIsAddLogModalOpen(false)}
          title="Record Employee Work Log"
          maxWidth="680px"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAddLogModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveWorkLog}
              >
                <CheckSquare size={13} />
                <span>Save Work Log</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveWorkLog}>
            <div className="form-grid">
              {/* Employee Selection */}
              <div className="form-group">
                <label className="form-label">Employee / Technician</label>
                <select
                  className="form-control"
                  value={addLogForm.employeeId}
                  onChange={(e) => {
                    const emp = staffList.find(s => s.id === e.target.value);
                    setAddLogForm(prev => ({
                      ...prev,
                      employeeId: e.target.value,
                      department: emp ? emp.department : prev.department,
                      machine: emp && emp.machine !== '—' ? emp.machine : prev.machine,
                      bay: emp && emp.bay !== '—' ? emp.bay : prev.bay
                    }));
                  }}
                >
                  {staffList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) — {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={addLogForm.date}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              {/* Start Time */}
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={addLogForm.startTime}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>

              {/* End Time */}
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={addLogForm.endTime}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>

              {/* Work Type */}
              <div className="form-group">
                <label className="form-label">Work Type</label>
                <select
                  className="form-control"
                  value={addLogForm.workType}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, workType: e.target.value }))}
                >
                  <option value="Production">Production</option>
                  <option value="Assembly">Assembly</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Testing">Testing</option>
                  <option value="Service">Service</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Rework">Rework</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Task */}
              <div className="form-group">
                <label className="form-label">Task Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={addLogForm.task}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="e.g. Shaft Turning / Bearing Assembly / Runout Inspection"
                />
              </div>

              {/* Work Order */}
              <div className="form-group">
                <label className="form-label">Job Reference (Production or Service)</label>
                <select
                  className="form-control mono"
                  value={addLogForm.workOrder}
                  onChange={(e) => {
                    const job = availableJobs.find(w => w.id === e.target.value);
                    setAddLogForm(prev => ({
                      ...prev,
                      workOrder: e.target.value,
                      spindle: job ? job.serial : prev.spindle,
                      machine: job ? job.defaultMachine : prev.machine,
                      bay: job ? job.defaultBay : prev.bay
                    }));
                  }}
                >
                  <optgroup label="Production Work Orders (New Builds)">
                    {availableJobs.filter(j => j.type === 'production').map((wo) => (
                      <option key={wo.id} value={wo.id}>
                        {wo.id} — {wo.customer?.split(' ')[0]} ({wo.model} / {wo.serial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Service & Repair Jobs (Overhauls)">
                    {availableJobs.filter(j => j.type === 'service').map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.id} — {srv.customer?.split(' ')[0]} ({srv.model} / {srv.serial})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Spindle Serial */}
              <div className="form-group">
                <label className="form-label">Spindle Serial / Product</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={addLogForm.spindle}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, spindle: e.target.value }))}
                  placeholder="e.g. SP-1042 / GPS-2026-0842"
                />
              </div>

              {/* Machine */}
              <div className="form-group">
                <label className="form-label">Machine Station</label>
                <input
                  type="text"
                  className="form-control"
                  value={addLogForm.machine}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, machine: e.target.value }))}
                  placeholder="e.g. CNC-03 / Studer S33 / QC-02"
                />
              </div>

              {/* Shop Workstation */}
              <div className="form-group">
                <label className="form-label">Shop Floor Workstation</label>
                <select
                  className="form-control"
                  value={addLogForm.bay}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, bay: e.target.value }))}
                >
                  <option value="Station 1 - Machining">Station 1 — CNC Lathe / Turning</option>
                  <option value="Station 2 - Grinding">Station 2 — Studer S33 Grinder</option>
                  <option value="Station 3 - Cleanroom">Station 3 — Cleanroom Assembly</option>
                  <option value="Station 4 - Balancing">Station 4 — Schenck Balancing</option>
                  <option value="Station 5 - Testing">Station 5 — Spindle Test Bench</option>
                  <option value="Station 6 - Metrology">Station 6 — QC Metrology Lab</option>
                  <option value="Station 7 - Packaging">Station 7 — Packaging & Dispatch</option>
                  <option value="Service Workshop">Service Workshop</option>
                </select>
              </div>

              {/* Quantity Completed */}
              <div className="form-group">
                <label className="form-label">Quantity Completed</label>
                <input
                  type="number"
                  min="0"
                  className="form-control mono"
                  value={addLogForm.quantityCompleted}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, quantityCompleted: e.target.value }))}
                  placeholder="e.g. 1"
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Session Status</label>
                <select
                  className="form-control"
                  value={addLogForm.status}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Paused">Paused</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              {/* Progress Slider */}
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Progress</label>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{addLogForm.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={addLogForm.progress}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, progress: Number(e.target.value) }))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Remarks */}
              <div className="form-group full-width">
                <label className="form-label">Remarks & Operational Observations</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={addLogForm.remarks}
                  onChange={(e) => setAddLogForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="e.g. Minor vibration observed during initial run. Rechecked bearing seating before continuing."
                />
              </div>
            </div>
          </form>
        </Modal>

        {/* ========================================================================= */}
        {/* 8. MODAL: LIVE TASK PROGRESS UPDATE                                       */}
        {/* ========================================================================= */}
        {isUpdateProgressModalOpen && updateProgressTarget && (
          <Modal
            isOpen={isUpdateProgressModalOpen}
            onClose={() => setIsUpdateProgressModalOpen(false)}
            title={`Update Work Progress: ${updateProgressTarget.name}`}
            maxWidth="520px"
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsUpdateProgressModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveProgressUpdate}
                >
                  <Check size={13} />
                  <span>Save Progress Update</span>
                </button>
              </>
            }
          >
            <form onSubmit={handleSaveProgressUpdate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                  <div>Task: <strong>{updateProgressTarget.currentTask}</strong></div>
                  <div style={{ marginTop: '2px' }}>Work Order: <strong className="mono" style={{ color: 'var(--primary)' }}>{updateProgressTarget.workOrder}</strong> • Spindle: <span className="mono">{updateProgressTarget.spindleSerial}</span></div>
                  <div style={{ marginTop: '2px' }}>Station: <strong>{updateProgressTarget.machine}</strong></div>
                </div>

                {/* Progress Slider */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Current Completion Progress</label>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                      {updateProgressTarget.progress}% → {progressForm.progress}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressForm.progress}
                    onChange={(e) => setProgressForm(prev => ({ ...prev, progress: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label">Task Status</label>
                  <select
                    className="form-control"
                    value={progressForm.status}
                    onChange={(e) => setProgressForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Working">Working</option>
                    <option value="Break">Break</option>
                    <option value="Completed">Completed</option>
                    <option value="Overtime">Overtime</option>
                  </select>
                </div>

                {/* Remarks */}
                <div className="form-group">
                  <label className="form-label">Progress Remarks</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={progressForm.remarks}
                    onChange={(e) => setProgressForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Dimensional check complete. Runout limit certified."
                  />
                </div>
              </div>
            </form>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* 9. MODAL: START TASK                                                      */}
        {/* ========================================================================= */}
        {isStartTaskModalOpen && (
          <Modal
            isOpen={isStartTaskModalOpen}
            onClose={() => setIsStartTaskModalOpen(false)}
            title="Start Work / Assign Task"
            maxWidth="540px"
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsStartTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveStartTask}
                >
                  <Play size={13} />
                  <span>Start Task (Set Working)</span>
                </button>
              </>
            }
          >
            <form onSubmit={handleSaveStartTask}>
              <div className="form-grid">
                {/* Employee */}
                <div className="form-group full-width">
                  <label className="form-label">Assign To Employee</label>
                  <select
                    className="form-control"
                    value={startTaskForm.employeeId}
                    onChange={(e) => setStartTaskForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  >
                    {staffList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id}) — Status: {emp.status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Assignment */}
                <div className="form-group">
                  <label className="form-label">Job Assignment (Production or Service)</label>
                  <select
                    className="form-control mono"
                    value={startTaskForm.workOrder}
                    onChange={(e) => {
                      const job = availableJobs.find(w => w.id === e.target.value);
                      const isSrv = job?.type === 'service';
                      setStartTaskForm(prev => ({
                        ...prev,
                        workOrder: e.target.value,
                        spindle: job ? job.serial : prev.spindle,
                        machine: job ? job.defaultMachine : prev.machine,
                        bay: job ? job.defaultBay : prev.bay,
                        task: isSrv ? 'Taper Re-grind & Bearing Overhaul' : (prev.task || 'CNC Machining')
                      }));
                    }}
                  >
                    <optgroup label="Production Work Orders (New Spindles)">
                      {availableJobs.filter(j => j.type === 'production').map((wo) => (
                        <option key={wo.id} value={wo.id}>
                          {wo.id} — {wo.customer?.split(' ')[0]} ({wo.model || 'Spindle'} • {wo.serial})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Service & Repair Jobs (Customer Repairs)">
                      {availableJobs.filter(j => j.type === 'service').map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.id} — {srv.customer?.split(' ')[0]} ({srv.model || 'Repair'} • {srv.serial})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Task */}
                <div className="form-group">
                  <label className="form-label">Operation / Task</label>
                  <input
                    type="text"
                    className="form-control"
                    value={startTaskForm.task}
                    onChange={(e) => setStartTaskForm(prev => ({ ...prev, task: e.target.value }))}
                    placeholder="e.g. Shaft Turning"
                  />
                </div>

                {/* Spindle */}
                <div className="form-group">
                  <label className="form-label">Spindle Serial</label>
                  <input
                    type="text"
                    className="form-control mono"
                    value={startTaskForm.spindle}
                    onChange={(e) => setStartTaskForm(prev => ({ ...prev, spindle: e.target.value }))}
                    placeholder="SP-1042"
                  />
                </div>

                {/* Machine */}
                <div className="form-group">
                  <label className="form-label">Machine Station</label>
                  <input
                    type="text"
                    className="form-control"
                    value={startTaskForm.machine}
                    onChange={(e) => setStartTaskForm(prev => ({ ...prev, machine: e.target.value }))}
                    placeholder="CNC-03"
                  />
                </div>

                {/* Expected Duration */}
                <div className="form-group">
                  <label className="form-label">Expected Duration</label>
                  <input
                    type="text"
                    className="form-control mono"
                    value={startTaskForm.expectedDuration}
                    onChange={(e) => setStartTaskForm(prev => ({ ...prev, expectedDuration: e.target.value }))}
                    placeholder="2h 30m"
                  />
                </div>

                {/* Remarks */}
                <div className="form-group full-width">
                  <label className="form-label">Starting Remarks</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={startTaskForm.remarks}
                    onChange={(e) => setStartTaskForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Tooling setup verified, ready to run..."
                  />
                </div>
              </div>
            </form>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* 10. MODAL: PAUSE TASK                                                     */}
        {/* ========================================================================= */}
        {isPauseTaskModalOpen && pauseTaskTarget && (
          <Modal
            isOpen={isPauseTaskModalOpen}
            onClose={() => setIsPauseTaskModalOpen(false)}
            title={`Pause Task: ${pauseTaskTarget.name}`}
            maxWidth="480px"
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPauseTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePauseTask}
                >
                  <Pause size={13} />
                  <span>Confirm Pause</span>
                </button>
              </>
            }
          >
            <form onSubmit={handleSavePauseTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Active Task: <strong>{pauseTaskTarget.currentTask}</strong> ({pauseTaskTarget.workOrder})
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Pausing</label>
                  <select
                    className="form-control"
                    value={pauseForm.reason}
                    onChange={(e) => setPauseForm(prev => ({ ...prev, reason: e.target.value }))}
                  >
                    <option value="Machine issue">Machine issue</option>
                    <option value="Material unavailable">Material unavailable</option>
                    <option value="Waiting for QC">Waiting for QC</option>
                    <option value="Supervisor instruction">Supervisor instruction</option>
                    <option value="Break">Break</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Details / Remarks</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={pauseForm.remarks}
                    onChange={(e) => setPauseForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Explain why the task was paused..."
                  />
                </div>
              </div>
            </form>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* 11. MODAL: COMPLETE TASK CONFIRMATION                                     */}
        {/* ========================================================================= */}
        {isCompleteTaskModalOpen && completeTaskTarget && (
          <Modal
            isOpen={isCompleteTaskModalOpen}
            onClose={() => setIsCompleteTaskModalOpen(false)}
            title="Mark Task as Completed?"
            maxWidth="500px"
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCompleteTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmCompleteTask}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  <Check size={13} />
                  <span>Yes, Complete Task</span>
                </button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                Are you sure you want to mark this active task as completed?
              </div>

              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Employee</div>
                  <strong>{completeTaskTarget.name} ({completeTaskTarget.id})</strong>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Work Order</div>
                  <strong className="mono" style={{ color: 'var(--primary)' }}>{completeTaskTarget.workOrder}</strong>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Task</div>
                  <strong>{completeTaskTarget.currentTask}</strong>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Elapsed Duration</div>
                  <strong className="mono">{completeTaskTarget.duration}</strong>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Result</div>
                  <div style={{ color: '#059669', fontWeight: 600 }}>
                    Progress will become 100%, work log recorded to employee history, and employee will become Available.
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* 12. MODAL: WORK LOG RECORD DETAIL                                         */}
        {/* ========================================================================= */}
        {selectedLogDetail && (
          <Modal
            isOpen={Boolean(selectedLogDetail)}
            onClose={() => setSelectedLogDetail(null)}
            title={`Work Activity Detail: ${selectedLogDetail.id}`}
            maxWidth="560px"
            footer={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedLogDetail(null)}
              >
                Close
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                padding: '14px',
                background: '#f8fafc',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Task</div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{selectedLogDetail.task}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Employee</div>
                  <div style={{ fontWeight: 600 }}>{selectedLogDetail.employeeName} ({selectedLogDetail.employeeId})</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Work Order</div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedLogDetail.workOrder}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Spindle Serial</div>
                  <div className="mono" style={{ fontWeight: 600 }}>{selectedLogDetail.spindle}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Machine Station</div>
                  <div style={{ fontWeight: 600 }}>{selectedLogDetail.machine}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Date & Timing</div>
                  <div className="mono" style={{ fontWeight: 600 }}>{selectedLogDetail.date} • {selectedLogDetail.startTime} - {selectedLogDetail.endTime}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Duration Elapsed</div>
                  <div className="mono" style={{ fontWeight: 700 }}>{selectedLogDetail.duration}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Quantity Completed</div>
                  <div className="mono" style={{ fontWeight: 600 }}>{selectedLogDetail.quantityCompleted || 1} units</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Progress</div>
                  <div className="mono" style={{ fontWeight: 700 }}>{selectedLogDetail.progress}%</div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Status</div>
                  <StatusBadge status={selectedLogDetail.status} size="sm" />
                </div>

                <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Operational Remarks</div>
                  <div style={{ padding: '8px', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '2px' }}>
                    {selectedLogDetail.remarks || 'No remarks recorded.'}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}





        {/* ========================================================================= */}
        {/* MODAL: ASSIGN WORKER TO JOB (Stage-Aware for 8 Prod & 9 Service Stages)   */}
        {/* ========================================================================= */}
        {isAssignJobModalOpen && (() => {
          const stageInfo = assignJobTarget ? getJobStageInfo(assignJobTarget) : {
            isService: false,
            stages: MANUFACTURING_STAGES_DETAIL,
            currentIndex: 0,
            currentStep: 1,
            totalSteps: 8,
            stageKey: 'machining',
            stageName: 'CNC Machining',
            shortName: 'CNC Machining',
            defaultBay: 'Station 1 - Machining',
            defaultMachine: 'Okuma LB3000 Lathe'
          };

          return (
            <Modal
              isOpen={isAssignJobModalOpen}
              onClose={() => setIsAssignJobModalOpen(false)}
              title={assignJobTarget ? `Assign Staff — ${assignJobTarget.id} (${stageInfo.isService ? '9-Stage Service' : '8-Stage Production'})` : 'Assign Staff to Job Order'}
              maxWidth="560px"
              footer={
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAssignJobModalOpen(false)}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const emp = staffList.find(s => s.id === assignJobForm.employeeId);
                      if (!emp) { if (onNotify) onNotify('Please select a technician.', 'warning'); return; }

                      const jobId = assignJobTarget?.id || '—';
                      const activeStageKey = assignJobForm.stageKey || stageInfo.stageKey;
                      const matchedStage = stageInfo.stages.find(s => s.key === activeStageKey) || stageInfo.stages[0];

                      const jobBay = assignJobForm.bay || matchedStage.bay || emp.bay || 'Station 1 - Machining';
                      const jobMachine = assignJobForm.machine || matchedStage.machine || emp.machine || 'CNC Machine';
                      const taskName = assignJobForm.task || `${matchedStage.shortName} Operation`;

                      // 1. Update staff status & active task
                      setStaffList(prev => prev.map(s => {
                        if (s.id === emp.id) {
                          return {
                            ...s,
                            status: 'Working',
                            workOrder: jobId,
                            currentTask: taskName,
                            bay: jobBay,
                            machine: jobMachine,
                            started: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            duration: '0m',
                            durationMinutes: 0,
                            progress: 10
                          };
                        }
                        return s;
                      }));

                      // 2. Update job in state & local storage
                      const isService = assignJobTarget?.type === 'service' || jobId.startsWith('SR-');
                      if (isService) {
                        setAvailableJobs(prev => prev.map(j => {
                          if (j.id === jobId) {
                            return {
                              ...j,
                              assignedTo: emp.name,
                              technician: emp.name,
                              currentStage: matchedStage.name,
                              currentStageKey: matchedStage.key,
                              bay: jobBay,
                              machine: jobMachine
                            };
                          }
                          return j;
                        }));

                        try {
                          const localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]');
                          const updatedSrv = localSrv.map(srv => {
                            if (srv.id === jobId) {
                              return {
                                ...srv,
                                assignedTo: emp.name,
                                technician: emp.name,
                                currentStage: matchedStage.key,
                                bay: jobBay,
                                machine: jobMachine
                              };
                            }
                            return srv;
                          });
                          localStorage.setItem('gps_local_service_jobs', JSON.stringify(updatedSrv));
                        } catch (e) { console.error(e); }
                      } else {
                        setAvailableWorkOrders(prev => prev.map(wo => {
                          if (wo.id === jobId || wo.workOrderNo === jobId) {
                            return {
                              ...wo,
                              assignedTo: emp.name,
                              leadOperator: emp.name,
                              currentStage: matchedStage.key,
                              currentOperation: jobBay,
                              machine: jobMachine
                            };
                          }
                          return wo;
                        }));

                        setAvailableJobs(prev => prev.map(j => {
                          if (j.id === jobId) {
                            return {
                              ...j,
                              assignedTo: emp.name,
                              leadOperator: emp.name,
                              currentStage: matchedStage.name,
                              currentStageKey: matchedStage.key,
                              bay: jobBay,
                              machine: jobMachine
                            };
                          }
                          return j;
                        }));

                        try {
                          const localWos = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
                          const updatedWos = localWos.map(wo => {
                            if (wo.id === jobId || wo.workOrderNo === jobId) {
                              return {
                                ...wo,
                                assignedTo: emp.name,
                                leadOperator: emp.name,
                                currentStage: matchedStage.key,
                                currentOperation: jobBay,
                                machine: jobMachine
                              };
                            }
                            return wo;
                          });
                          localStorage.setItem('gps_local_work_orders', JSON.stringify(updatedWos));
                        } catch (e) { console.error(e); }
                      }

                      // 3. Log activity
                      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      setActivityFeed(prev => [
                        {
                          id: `act-${Date.now()}`,
                          time: nowTime,
                          timestamp: new Date().toISOString(),
                          employeeName: emp.name,
                          employeeId: emp.id,
                          action: 'started',
                          task: taskName,
                          workOrder: jobId,
                          spindle: assignJobTarget?.serial || '—',
                          machine: jobMachine,
                          bay: jobBay,
                          progressBefore: 0,
                          progressAfter: 10,
                          status: 'Working',
                          detail: `${emp.name} deployed to ${jobId} on Step ${matchedStage.step}: ${matchedStage.name}.`
                        },
                        ...prev
                      ]);

                      // 4. Global synchronization
                      window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));
                      window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'service' } }));
                      window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'workforce' } }));

                      setIsAssignJobModalOpen(false);
                      if (onNotify) onNotify(`${emp.name} assigned to ${jobId} on Step ${matchedStage.step}: ${matchedStage.shortName}!`);
                    }}
                  >
                    <Check size={14} />
                    <span>Confirm Assignment</span>
                  </button>
                </>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {assignJobTarget && (
                  <div style={{
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono">{assignJobTarget.id}</span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: stageInfo.isService ? '#ede9fe' : '#dbeafe',
                        color: stageInfo.isService ? '#6d28d9' : '#1d4ed8',
                        fontWeight: 700
                      }}>
                        {stageInfo.isService ? 'SERVICE (9 STAGES)' : 'PRODUCTION (8 STAGES)'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {assignJobTarget.model} · <span className="mono">{assignJobTarget.serial}</span>
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Customer: <strong style={{ color: 'var(--text-main)' }}>{assignJobTarget.customer}</strong></span>
                      <span>Current Stage: <strong style={{ color: '#7A1F3D' }}>Step {stageInfo.currentStep}: {stageInfo.shortName}</strong></span>
                    </div>
                  </div>
                )}

                {/* Pipeline Stage Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Assign to Pipeline Stage *</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {stageInfo.isService ? '9 Spindle Overhaul Stages' : '8 Manufacturing Stages'}
                    </span>
                  </label>
                  <select
                    className="form-control"
                    value={assignJobForm.stageKey || stageInfo.stageKey}
                    onChange={e => {
                      const selectedKey = e.target.value;
                      const stg = stageInfo.stages.find(s => s.key === selectedKey);
                      if (stg) {
                        setAssignJobForm(prev => ({
                          ...prev,
                          stageKey: stg.key,
                          machine: stg.machine,
                          bay: stg.bay,
                          task: `${stg.shortName} Operation`
                        }));
                      }
                    }}
                    required
                  >
                    {stageInfo.stages.map(stg => (
                      <option key={stg.key} value={stg.key}>
                        Step {stg.step}: {stg.name} — ({stg.machine})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Technician Selector */}
                <div className="form-group">
                  <label className="form-label">Select Technician / Staff Member *</label>
                  <select
                    className="form-control"
                    value={assignJobForm.employeeId}
                    onChange={e => setAssignJobForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose Technician --</option>
                    <optgroup label="Available (Ready to Deploy)">
                      {staffList.filter(s => s.status === 'Available' || s.status === 'Idle').map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.id}) — {emp.role} · {emp.department}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Working (Reassign / Override)">
                      {staffList.filter(s => s.status === 'Working' || s.status === 'Overtime').map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.id}) — {emp.role} · Currently on {emp.workOrder}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Workstation & Machine */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Assigned Workstation / Bay</label>
                    <input
                      type="text"
                      className="form-control"
                      value={assignJobForm.bay || stageInfo.defaultBay}
                      onChange={e => setAssignJobForm(prev => ({ ...prev, bay: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Machine / Test Bench</label>
                    <input
                      type="text"
                      className="form-control"
                      value={assignJobForm.machine || stageInfo.defaultMachine}
                      onChange={e => setAssignJobForm(prev => ({ ...prev, machine: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Task Description */}
                <div className="form-group">
                  <label className="form-label">Task / Operation Description *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={assignJobForm.task || `${stageInfo.shortName} Operation`}
                    onChange={e => setAssignJobForm(prev => ({ ...prev, task: e.target.value }))}
                    placeholder="Operation details, tolerances..."
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Expected Duration</label>
                    <input
                      type="text"
                      className="form-control"
                      value={assignJobForm.expectedDuration}
                      onChange={e => setAssignJobForm(prev => ({ ...prev, expectedDuration: e.target.value }))}
                      placeholder="e.g. 2h 30m"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <input
                      type="text"
                      className="form-control"
                      value={assignJobTarget?.priority || 'Normal'}
                      readOnly
                      style={{ background: 'var(--bg-surface-subtle)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assignment Remarks / Instructions</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={assignJobForm.remarks}
                    onChange={e => setAssignJobForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Tolerance requirements, safety notes, customer special notes..."
                  />
                </div>
              </div>
            </Modal>
          );
        })()}

        {/* ========================================================================= */}
        {/* MODAL: UPDATE STAGE WORK & PROGRESSION (Assigned Staff & Admin Hub)        */}
        {/* ========================================================================= */}
        {isStageWorkModalOpen && stageWorkTarget && (() => {
          const { job, staff, stageInfo } = stageWorkTarget;
          const currentStageObj = stageInfo.stages.find(s => s.key === stageWorkForm.stageKey) || stageInfo.stages[stageInfo.currentIndex] || stageInfo.stages[0];
          const nextStageObj = stageInfo.stages[currentStageObj.step] || null;

          return (
            <Modal
              isOpen={isStageWorkModalOpen}
              onClose={() => setIsStageWorkModalOpen(false)}
              title={`Update Stage Work — ${job.id}`}
              maxWidth="620px"
              footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626' }}
                    onClick={() => handleUnassignWorker(job)}
                    title="Unassign worker from this job"
                  >
                    <XCircle size={13} color="#dc2626" />
                    <span>Unassign Worker</span>
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsStageWorkModalOpen(false)}>Cancel</button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveStageWork}
                    >
                      <Check size={14} />
                      <span>Save & Update Stage Work</span>
                    </button>
                  </div>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Job & Worker Info Card */}
                <div style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>{job.id}</span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: stageInfo.isService ? '#ede9fe' : '#dbeafe',
                        color: stageInfo.isService ? '#6d28d9' : '#1d4ed8',
                        fontWeight: 700
                      }}>
                        {stageInfo.isService ? 'SERVICE (9 STAGES)' : 'PRODUCTION (8 STAGES)'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {job.model} · <span className="mono">{job.serial}</span> · <strong>{job.customer}</strong>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Assigned Staff: <strong style={{ color: '#166534' }}>{staff?.name || job.assignedTo || 'Unassigned'}</strong>
                      {staff ? ` (${staff.role})` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px', flexShrink: 0 }}
                    onClick={() => handleViewJobCaseFile(job)}
                    title="Open Case File in new context"
                  >
                    <FileText size={12} color="#7A1F3D" />
                    <span>Case File</span>
                  </button>
                </div>

                {/* Stage Stepper Banner */}
                <div style={{ background: '#fdf2f4', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11.5px' }}>
                    <span style={{ fontWeight: 700, color: '#7A1F3D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={13} /> Active Step {currentStageObj.step} of {stageInfo.totalSteps}: {currentStageObj.name}
                    </span>
                    <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {currentStageObj.machine}
                    </span>
                  </div>

                  {/* Track Stepper */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {stageInfo.stages.map((stg) => {
                      const isDone = stg.step < currentStageObj.step;
                      const isCurrent = stg.step === currentStageObj.step;
                      return (
                        <div
                          key={stg.key}
                          title={`Step ${stg.step}: ${stg.name} (${stg.machine})`}
                          style={{
                            flex: 1,
                            height: '8px',
                            borderRadius: '4px',
                            background: isDone ? '#16a34a' : (isCurrent ? '#7A1F3D' : '#cbd5e1'),
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            setStageWorkForm(prev => ({
                              ...prev,
                              stageKey: stg.key,
                              notes: `Switched active stage to Step ${stg.step}: ${stg.name}.`
                            }));
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Admin Stage Override Dropdown */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stage Override / Jump (Admin & Lead)</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click or select any stage</span>
                  </label>
                  <select
                    className="form-control"
                    value={stageWorkForm.stageKey || currentStageObj.key}
                    onChange={e => {
                      const newKey = e.target.value;
                      const matched = stageInfo.stages.find(s => s.key === newKey);
                      if (matched) {
                        setStageWorkForm(prev => ({
                          ...prev,
                          stageKey: matched.key,
                          notes: `Working on Step ${matched.step}: ${matched.name}.`
                        }));
                      }
                    }}
                  >
                    {stageInfo.stages.map(stg => (
                      <option key={stg.key} value={stg.key}>
                        Step {stg.step}: {stg.name} ({stg.bay})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progress Slider + Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', alignItems: 'flex-start' }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Stage Progress</label>
                      <span className="mono" style={{ fontWeight: 700, color: '#7A1F3D', fontSize: '13px' }}>
                        {stageWorkForm.progress}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="form-control"
                      style={{ padding: '0', height: '24px' }}
                      value={stageWorkForm.progress}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setStageWorkForm(prev => ({
                          ...prev,
                          progress: val,
                          advanceToNextStage: val === 100 ? true : prev.advanceToNextStage
                        }));
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {[25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, padding: '1px 0', fontSize: '10px' }}
                          onClick={() => setStageWorkForm(prev => ({
                            ...prev,
                            progress: pct,
                            advanceToNextStage: pct === 100 ? true : prev.advanceToNextStage
                          }))}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stage Execution Status</label>
                    <select
                      className="form-control"
                      value={stageWorkForm.stageStatus}
                      onChange={e => {
                        const stat = e.target.value;
                        setStageWorkForm(prev => ({
                          ...prev,
                          stageStatus: stat,
                          advanceToNextStage: stat === 'Stage Completed' ? true : prev.advanceToNextStage
                        }));
                      }}
                    >
                      <option value="In Progress">In Progress (Active Work)</option>
                      <option value="Stage Completed">Stage Completed (QC Passed)</option>
                      <option value="QC Metrology Review">QC Metrology Review</option>
                      <option value="On Hold">On Hold / Tolerance Audit</option>
                    </select>
                  </div>
                </div>

                {/* Shop Floor Metrology & Precision Measurements */}
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Gauge size={13} color="#7A1F3D" />
                    <span>Precision Metrology & Logged Measurements</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Runout / Taper (mm)</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '11.5px', height: '30px' }}
                        value={stageWorkForm.runoutMetric}
                        onChange={e => setStageWorkForm(prev => ({ ...prev, runoutMetric: e.target.value }))}
                        placeholder="e.g. 0.0008 mm"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dynamic Vibration</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '11.5px', height: '30px' }}
                        value={stageWorkForm.vibrationMetric}
                        onChange={e => setStageWorkForm(prev => ({ ...prev, vibrationMetric: e.target.value }))}
                        placeholder="e.g. 0.38 mm/s"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Bearing Temp Rise</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '11.5px', height: '30px' }}
                        value={stageWorkForm.tempMetric}
                        onChange={e => setStageWorkForm(prev => ({ ...prev, tempMetric: e.target.value }))}
                        placeholder="e.g. 32.5 °C"
                      />
                    </div>
                  </div>
                </div>

                {/* Duration Spent */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Duration Spent on this Stage</label>
                  <input
                    type="text"
                    className="form-control"
                    value={stageWorkForm.durationSpent}
                    onChange={e => setStageWorkForm(prev => ({ ...prev, durationSpent: e.target.value }))}
                    placeholder="e.g. 2h 15m"
                  />
                </div>

                {/* Technician Notes & Observations */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MessageSquare size={13} color="#7A1F3D" />
                      <span>Technician & Stage Execution Notes</span>
                      <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Author: <strong style={{ color: '#166534' }}>{staff?.name || 'Assigned Technician'}</strong>
                    </span>
                  </div>

                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ fontSize: '12px', lineHeight: '1.5', resize: 'vertical' }}
                    value={stageWorkForm.notes}
                    onChange={e => setStageWorkForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter stage observations, measured runout, bearing preloads, torque applied, replaced parts, or handover instructions for next technician..."
                  />

                  {/* Quick Preset Shop Floor Chips */}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Quick Preset Chips (Click to append):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {[
                        '✓ Radial runout < 0.001 mm certified',
                        '✓ Bearings preloaded & seated to 12.5 kN',
                        '✓ Dynamic balancing ISO 1940 G0.4 passed',
                        '✓ 4h thermal run-in test temperature stable (temp rise ≤ 14°C)',
                        '✓ Journal shaft ground within ±0.002 mm tolerance',
                        '⚠ Awaiting replacement drawbar collet from stores',
                        '⚠ Minor journal fretting polished to spec',
                        '✓ Cleanroom inspection passed; ready for handover'
                      ].map((presetNote, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 7px',
                            height: 'auto',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            borderColor: '#e2e8f0'
                          }}
                          onClick={() => {
                            setStageWorkForm(prev => ({
                              ...prev,
                              notes: prev.notes ? `${prev.notes} • ${presetNote}` : presetNote
                            }));
                          }}
                        >
                          + {presetNote}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chronological Notes History for this Job */}
                {((job.notesHistory && job.notesHistory.length > 0) || job.notes) && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    maxHeight: '130px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="#7A1F3D" />
                      <span>Previous Notes & Handover Log ({job.notesHistory?.length || (job.notes ? 1 : 0)})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {(job.notesHistory && job.notesHistory.length > 0
                        ? job.notesHistory
                        : [{ text: job.notes, author: job.lastNoteBy || 'Technician', timestamp: 'Initial Log' }]
                      ).map((n, idx) => (
                        <div key={idx} style={{
                          fontSize: '11px',
                          padding: '5px 8px',
                          background: '#ffffff',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          color: '#334155'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>
                            <span><strong>{n.author || 'Staff'}</strong> {n.stageName ? `(${n.stageName})` : ''}</span>
                            <span className="mono">{n.timestamp}</span>
                          </div>
                          <div>{n.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advance to Next Stage Toggle */}
                <div style={{
                  padding: '10px 14px',
                  background: stageWorkForm.advanceToNextStage ? '#ecfdf5' : '#f8fafc',
                  border: `1px solid ${stageWorkForm.advanceToNextStage ? '#6ee7b7' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: stageWorkForm.advanceToNextStage ? '#065f46' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={13} color={stageWorkForm.advanceToNextStage ? '#059669' : '#64748b'} />
                      <span>Advance Job to Next Pipeline Stage upon Saving</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {nextStageObj ? (
                        <span>Advances from <strong>Step {currentStageObj.step}: {currentStageObj.shortName}</strong> &rarr; <strong>Step {nextStageObj.step}: {nextStageObj.name}</strong> ({nextStageObj.machine})</span>
                      ) : (
                        <span>Final stage! Marking this will complete the job order and set status to <strong>Dispatch Ready</strong>.</span>
                      )}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={stageWorkForm.advanceToNextStage}
                    onChange={e => setStageWorkForm(prev => ({ ...prev, advanceToNextStage: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7A1F3D' }}
                  />
                </div>
              </div>
            </Modal>
          );
        })()}

        {/* ========================================================================= */}
        {/* MODAL: DEDICATED TECHNICIAN NOTE ENTRY (Shop Floor Quick Note Modal)       */}
        {/* ========================================================================= */}
        {isJobNoteModalOpen && jobNoteTarget && (() => {
          const { job, staff, stageInfo } = jobNoteTarget;
          const isService = job.type === 'service' || (job.id && job.id.startsWith('SR-'));

          return (
            <Modal
              isOpen={isJobNoteModalOpen}
              onClose={() => setIsJobNoteModalOpen(false)}
              title={`Technician Notes & Stage Log — ${job.id}`}
              maxWidth="580px"
              footer={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsJobNoteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveJobNote}
                    style={{ background: '#7A1F3D', borderColor: '#7A1F3D' }}
                  >
                    <Check size={14} />
                    <span>Save Technician Note</span>
                  </button>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Job Context Header */}
                <div style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>{job.id}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: isService ? '#ede9fe' : '#dbeafe',
                      color: isService ? '#6d28d9' : '#1d4ed8',
                      fontWeight: 700
                    }}>
                      {isService ? 'SERVICE (9 STAGES)' : 'PRODUCTION (8 STAGES)'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {job.model} · <span className="mono">{job.serial}</span> · <strong>{job.customer}</strong>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Current Stage: <strong style={{ color: '#7A1F3D' }}>{job.currentStage}</strong> • Assigned: <strong style={{ color: '#166534' }}>{staff?.name || job.assignedTo || 'Unassigned'}</strong>
                  </div>
                </div>

                {/* Note Author & Input */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MessageSquare size={13} color="#7A1F3D" />
                      <span>Add New Technician / Operational Note</span>
                      <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Author: <strong style={{ color: '#166534' }}>{staff?.name || 'Shop Floor Staff'}</strong>
                    </span>
                  </div>

                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ fontSize: '12px', lineHeight: '1.5' }}
                    value={jobNoteText}
                    onChange={e => setJobNoteText(e.target.value)}
                    placeholder="Enter stage observations, measured runout, bearing seating status, temperature readings, tolerance check, or shift handover notes..."
                    autoFocus
                  />

                  {/* Preset Shop Floor Chips */}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Quick Preset Chips:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {[
                        '✓ Radial runout < 0.001 mm certified',
                        '✓ Bearings preloaded & torqued to spec',
                        '✓ Dynamic balancing ISO 1940 G0.4 passed',
                        '✓ 4h thermal run-in test temperature stable',
                        '✓ Journal shaft ground within ±0.002 mm tolerance',
                        '⚠ Awaiting replacement drawbar collet from stores',
                        '⚠ Minor journal fretting polished to spec',
                        '✓ Cleanroom inspection passed; ready for handover'
                      ].map((presetNote, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 7px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            borderColor: '#e2e8f0'
                          }}
                          onClick={() => {
                            setJobNoteText(prev => prev ? `${prev} • ${presetNote}` : presetNote);
                          }}
                        >
                          + {presetNote}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chronological Notes History */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '12px',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} color="#7A1F3D" />
                    <span>Chronological Notes & Handover Log ({job.notesHistory?.length || (job.notes ? 1 : 0)})</span>
                  </div>

                  {(!job.notesHistory || job.notesHistory.length === 0) && !job.notes ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                      No prior notes recorded on this job order yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(job.notesHistory && job.notesHistory.length > 0
                        ? job.notesHistory
                        : [{ text: job.notes, author: job.lastNoteBy || 'Technician', stageName: job.currentStage, timestamp: 'Initial Log' }]
                      ).map((n, idx) => (
                        <div key={idx} style={{
                          fontSize: '11px',
                          padding: '7px 10px',
                          background: '#ffffff',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          color: '#334155'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', marginBottom: '3px' }}>
                            <span>
                              <strong style={{ color: '#166534' }}>{n.author || 'Staff'}</strong>
                              {n.stageName ? ` • ${n.stageName}` : ''}
                            </span>
                            <span className="mono">{n.timestamp}</span>
                          </div>
                          <div style={{ lineHeight: '1.4' }}>{n.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          );
        })()}

        {/* Workforce Work Log Pop-up Preview Modal */}
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
