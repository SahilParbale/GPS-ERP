import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import { workOrderService } from '../services/database/workOrderService';
import {
  INITIAL_WORKFORCE_KPIS,
  INITIAL_WORKFORCE_STAFF,
  INITIAL_ACTIVITY_FEED,
  INITIAL_DEPARTMENTS_WORKLOAD,
  INITIAL_WORKFORCE_ALERTS,
  INITIAL_SHIFT_SUMMARY
} from '../data/workforceData';
import { workforceService } from '../services/database/workforceService';
import { leaveService } from '../services/database/leaveService';
import { manufacturingService } from '../services/database/manufacturingService';
import {
  Search, Filter, Plus, Users, Clock, AlertTriangle,
  CheckCircle2, AlertCircle, ArrowRight, Eye, UserCheck,
  Briefcase, Activity, Shield, Cpu, ChevronRight, X,
  Calendar, CheckSquare, Layers, Wrench, RefreshCw,
  Download, Play, Pause, Check, Edit3, MessageSquare,
  FileText, TrendingUp, BarChart2, Info, ChevronDown, CornerDownRight, XCircle
} from 'lucide-react';

export default function WorkforceScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  // Main view tab
  const [activeTab, setActiveTab] = useState('live');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedShift, setSelectedShift] = useState('All');
  const [selectedBay, setSelectedBay] = useState('All');

  // Core Workforce State
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [staffError, setStaffError] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [activityFeed, setActivityFeed] = useState(INITIAL_ACTIVITY_FEED);
  const [bayAllocations, setBayAllocations] = useState([]);
  const [availableWorkOrders, setAvailableWorkOrders] = useState([]);

  // Phase 8: Daily Attendance & Leave Management State
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceError, setAttendanceError] = useState(null);
  const [leavesError, setLeavesError] = useState(null);

  // Modals for Attendance & Leave
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [clockInForm, setClockInForm] = useState({
    employeeId: '',
    shiftId: '',
    remarks: 'Punched in at shop floor station'
  });

  const [isSubmitLeaveModalOpen, setIsSubmitLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const loadWorkforceData = async () => {
    setIsLoadingStaff(true);
    setStaffError(null);
    const [staffRes, logsRes, baysRes, wosRes, attendanceRes, leavesRes] = await Promise.all([
      workforceService.getStaffList(),
      workforceService.getWorkLogs(),
      manufacturingService.getBayAssignments(),
      workOrderService.getWorkOrders(),
      workforceService.getAttendance(),
      leaveService.getLeaveRequests()
    ]);

    if (staffRes.error) {
      setStaffError(staffRes.error);
      setIsLoadingStaff(false);
      return;
    }

    const liveData = staffRes.data || [];
    const mergedStaff = liveData.map((emp, idx) => {
      const mock = INITIAL_WORKFORCE_STAFF.find(s => s.id === emp.id) || INITIAL_WORKFORCE_STAFF[idx % INITIAL_WORKFORCE_STAFF.length] || {};
      return {
        ...mock,
        ...emp,
        id: emp.id,
        name: emp.name,
        initials: emp.initials,
        department: emp.department,
        designation: emp.designation,
        role: emp.role,
        shift: emp.shift,
        status: emp.status,
        avatarColor: emp.avatarColor,
        skills: emp.skills,
        qualifications: emp.qualifications
      };
    });

    setStaffList(mergedStaff);
    if (logsRes.data) setWorkLogs(logsRes.data);
    if (baysRes.data) setBayAllocations(baysRes.data);
    if (wosRes.data) setAvailableWorkOrders(wosRes.data);

    if (attendanceRes.error) {
      setAttendanceError(attendanceRes.error);
    } else if (attendanceRes.data) {
      setAttendanceRecords(attendanceRes.data);
      setAttendanceError(null);
    }

    if (leavesRes.error) {
      setLeavesError(leavesRes.error);
    } else if (leavesRes.data) {
      setLeaveRequests(leavesRes.data);
      setLeavesError(null);
    }

    setIsLoadingStaff(false);
  };

  useEffect(() => {
    loadWorkforceData();
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
    bay: 'Bay 1 - Machining',
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
    bay: 'Bay 1 - Machining',
    expectedDuration: '2h 30m',
    remarks: 'Maintain strict runout limit <= 0.0010 mm on nose taper.'
  });

  // Form State: Pause Task
  const [pauseForm, setPauseForm] = useState({
    reason: 'Machine issue',
    remarks: 'Air pressure fluctuation detected on chuck actuator. Maintenance alerted.'
  });

  // Dynamic KPI Metrics
  const kpiData = useMemo(() => {
    const totalStaff = staffList.length;
    const workingNow = staffList.filter(s => s.status === 'Working' || s.status === 'Overtime').length;
    const onBreak = staffList.filter(s => s.status === 'Break' || s.status === 'On Break' || s.status === 'Paused').length;
    const available = staffList.filter(s => s.status === 'Available' || s.status === 'Idle').length;

    // Filter today's work logs
    const todayLogs = workLogs.filter(l => l.period === 'today' || l.date === '09 Sep 2026' || l.date === '2026-09-09');
    const tasksToday = todayLogs.length + workingNow;
    const completedToday = todayLogs.filter(l => l.status === 'Completed').length;

    // Calculate total hours
    const totalMinutes = todayLogs.reduce((acc, curr) => acc + (curr.durationMinutes || 90), 0);
    const totalHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

    const overdueCount = staffList.filter(s => (s.durationMinutes || 0) > 180 || s.status === 'Overtime').length;

    return [
      { id: 'total_employees', label: 'Total Employees', value: totalStaff.toString(), trend: 'Full Roster', isUp: true, icon: 'Users' },
      { id: 'working_now', label: 'Working Now', value: workingNow.toString(), trend: `${Math.round((workingNow / totalStaff) * 100)}% on bays`, isUp: true, icon: 'Cpu' },
      { id: 'on_break', label: 'On Break', value: onBreak.toString(), trend: 'Shift tea rotation', isUp: true, icon: 'Clock' },
      { id: 'available', label: 'Available', value: available.toString(), trend: 'Ready to deploy', isUp: true, icon: 'CheckCircle2' },
      { id: 'tasks_today', label: 'Tasks Today', value: tasksToday.toString(), trend: '+8 vs target', isUp: true, icon: 'CheckSquare' },
      { id: 'completed_today', label: 'Completed Today', value: completedToday.toString(), trend: `${Math.round((completedToday / Math.max(1, tasksToday)) * 100)}% completed`, isUp: true, icon: 'CheckCircle2' },
      { id: 'total_work_hours', label: 'Total Work Hours', value: totalHoursStr, trend: 'Plant shift sum', isUp: true, icon: 'Clock' },
      { id: 'overdue_tasks', label: 'Overdue Tasks', value: overdueCount.toString(), trend: 'Action required', alert: overdueCount > 0, isUp: false, icon: 'AlertTriangle' }
    ];
  }, [staffList, workLogs]);

  // Filtered Workforce Staff Table
  const filteredStaff = useMemo(() => {
    return staffList.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        emp.name.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        (emp.legacyId && emp.legacyId.toLowerCase().includes(q)) ||
        (emp.workOrder && emp.workOrder.toLowerCase().includes(q)) ||
        (emp.spindleSerial && emp.spindleSerial.toLowerCase().includes(q)) ||
        (emp.currentTask && emp.currentTask.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.role && emp.role.toLowerCase().includes(q))
      );

      const matchesDept = selectedDept === 'All' || emp.department.toLowerCase() === selectedDept.toLowerCase();
      const matchesStatus = selectedStatus === 'All' || emp.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesShift = selectedShift === 'All' || emp.shift.toLowerCase().includes(selectedShift.toLowerCase());
      const matchesBay = selectedBay === 'All' || (emp.bay && emp.bay.toLowerCase().includes(selectedBay.toLowerCase()));

      return matchesSearch && matchesDept && matchesStatus && matchesShift && matchesBay;
    });
  }, [staffList, searchQuery, selectedDept, selectedStatus, selectedShift, selectedBay]);

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
      if (logStatusFilter !== 'All' && log.status.toLowerCase() !== logStatusFilter.toLowerCase()) return false;
      if (logSearchQuery) {
        const q = logSearchQuery.toLowerCase();
        const matches = log.task.toLowerCase().includes(q) ||
          log.workOrder.toLowerCase().includes(q) ||
          log.spindle.toLowerCase().includes(q) ||
          log.machine.toLowerCase().includes(q) ||
          (log.remarks && log.remarks.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [selectedStaff, workLogs, logPeriodFilter, logStatusFilter, logSearchQuery]);

  // Reset Filters
  const hasActiveFilters = searchQuery !== '' || selectedDept !== 'All' || selectedStatus !== 'All' || selectedShift !== 'All' || selectedBay !== 'All';
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDept('All');
    setSelectedStatus('All');
    setSelectedShift('All');
    setSelectedBay('All');
  };

  // Helper: Open Work Order
  const handleViewWorkOrder = (woId) => {
    if (!woId || woId === '—') return;
    const foundWo = availableWorkOrders.find(w => w.id === woId);
    if (foundWo && onSelectWorkOrder && onNavigate) {
      onSelectWorkOrder(foundWo);
      onNavigate('work-order-detail');
    } else if (onNavigate) {
      onNavigate('production');
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
      bay: target.bay !== '—' ? target.bay : 'Bay 1 - Machining',
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

    setStaffList(prev => prev.map(s => {
      if (s.id === updateProgressTarget.id) {
        return {
          ...s,
          progress: newProgress,
          status: progressForm.status,
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
        status: progressForm.status
      }));
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        detail: `${updateProgressTarget.name} updated ${updateProgressTarget.workOrder} progress from ${oldProgress}% to ${newProgress}%.`
      },
      ...prev
    ]);

    setIsUpdateProgressModalOpen(false);
    if (onNotify) {
      onNotify(`${updateProgressTarget.name} updated ${updateProgressTarget.workOrder} progress from ${oldProgress}% to ${newProgress}%.`);
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
      bay: target?.bay && target.bay !== '—' ? target.bay : 'Bay 1 - Machining',
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
    const headers = [
      'Log ID',
      'Employee ID',
      'Employee Name',
      'Date',
      'Start Time',
      'End Time',
      'Duration',
      'Work Type',
      'Task',
      'Work Order',
      'Spindle',
      'Machine/Bay',
      'Department',
      'Progress %',
      'Status',
      'Remarks'
    ];

    const rows = workLogs.map(log => [
      `"${log.id}"`,
      `"${log.employeeId}"`,
      `"${log.employeeName}"`,
      `"${log.date}"`,
      `"${log.startTime}"`,
      `"${log.endTime}"`,
      `"${log.duration}"`,
      `"${log.workType || 'Production'}"`,
      `"${log.task.replace(/"/g, '""')}"`,
      `"${log.workOrder}"`,
      `"${log.spindle}"`,
      `"${log.machine} / ${log.bay}"`,
      `"${log.department}"`,
      `"${log.progress}%"`,
      `"${log.status}"`,
      `"${(log.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GPS_Spindle_Employee_Work_Log_September_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onNotify) {
      onNotify(`Exported ${workLogs.length} employee work logs to CSV.`);
    }
  };

  // ==========================================
  // ACTION: ATTENDANCE CLOCK-IN / CLOCK-OUT
  // ==========================================
  const handleOpenClockIn = () => {
    const firstEmp = staffList[0];
    setClockInForm({
      employeeId: firstEmp?.dbId || firstEmp?.id || '',
      shiftId: '',
      remarks: 'Clock-in recorded from shop floor station.'
    });
    setIsClockInModalOpen(true);
  };

  const handleSaveClockIn = async (e) => {
    e.preventDefault();
    if (!clockInForm.employeeId) {
      if (onNotify) onNotify('Please select an employee.', 'warning');
      return;
    }
    const res = await workforceService.clockIn({
      employeeId: clockInForm.employeeId,
      shiftId: clockInForm.shiftId || null,
      remarks: clockInForm.remarks
    });

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Duplicate clock-in or database error.', 'danger');
      return;
    }

    if (onNotify) onNotify('Technician clocked in successfully.');
    setIsClockInModalOpen(false);
    const attRes = await workforceService.getAttendance();
    if (attRes.data) setAttendanceRecords(attRes.data);
  };

  const handleClockOut = async (record) => {
    const res = await workforceService.clockOut({
      employeeId: record.employeeId,
      remarks: 'Shift completed. Verified by supervisor.'
    });

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Error clocking out.', 'danger');
      return;
    }

    if (onNotify) onNotify(`Clock-out recorded for ${record.employeeName}.`);
    const attRes = await workforceService.getAttendance();
    if (attRes.data) setAttendanceRecords(attRes.data);
  };

  // ==========================================
  // ACTION: LEAVE REQUESTS & APPROVALS
  // ==========================================
  const handleOpenSubmitLeave = () => {
    const firstEmp = staffList[0];
    const today = new Date().toISOString().split('T')[0];
    setLeaveForm({
      employeeId: firstEmp?.dbId || firstEmp?.id || '',
      leaveType: 'Casual Leave',
      startDate: today,
      endDate: today,
      reason: 'Personal leave request'
    });
    setIsSubmitLeaveModalOpen(true);
  };

  const handleSaveLeaveRequest = async (e) => {
    e.preventDefault();
    if (!leaveForm.employeeId || !leaveForm.reason.trim()) {
      if (onNotify) onNotify('Please provide employee and justification reason.', 'warning');
      return;
    }

    const res = await leaveService.createLeaveRequest({
      employee_id: leaveForm.employeeId,
      leave_type: leaveForm.leaveType,
      start_date: leaveForm.startDate,
      end_date: leaveForm.endDate,
      reason: leaveForm.reason
    });

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Failed to submit leave request.', 'danger');
      return;
    }

    if (onNotify) onNotify('Leave request submitted successfully for approval.');
    setIsSubmitLeaveModalOpen(false);
    const lvRes = await leaveService.getLeaveRequests();
    if (lvRes.data) setLeaveRequests(lvRes.data);
  };

  const handleApproveLeave = async (leave) => {
    const approver = staffList.find(s => s.roleCode === 'PLANT_HEAD' || s.roleCode === 'PROD_MGR') || staffList[0];
    const approverId = approver?.dbId || approver?.id;

    const res = await leaveService.approveLeaveRequest(leave.id, approverId);
    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Error approving leave request.', 'danger');
      return;
    }

    if (onNotify) onNotify(`Leave request approved and balance deducted successfully.`);
    const lvRes = await leaveService.getLeaveRequests();
    if (lvRes.data) setLeaveRequests(lvRes.data);
  };

  const handleRejectLeave = async (leave) => {
    const approver = staffList.find(s => s.roleCode === 'PLANT_HEAD' || s.roleCode === 'PROD_MGR') || staffList[0];
    const approverId = approver?.dbId || approver?.id;

    const res = await leaveService.rejectLeaveRequest(leave.id, approverId, 'Operational demands during spindle delivery rush.');
    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Error rejecting leave request.', 'danger');
      return;
    }

    if (onNotify) onNotify(`Leave request marked as rejected.`, 'warning');
    const lvRes = await leaveService.getLeaveRequests();
    if (lvRes.data) setLeaveRequests(lvRes.data);
  };

  if (isLoadingStaff) {
    return (
      <div className="content-area">
        <PageHeader
          title="Staff & Workforce"
          subtitle="Loading workforce personnel and roster from live database..."
          badge="Live Supabase"
        />
        <div className="section-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
          <div>Fetching active technicians, shifts, and department allocations...</div>
        </div>
      </div>
    );
  }

  if (staffError) {
    return (
      <div className="content-area">
        <PageHeader
          title="Staff & Workforce"
          subtitle="Employee Work Log & Daily Manufacturing Activity Tracking System"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {staffError.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {staffError.message || 'Unable to retrieve live workforce personnel records from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadStaff}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      {/* 1. TOP PAGE HEADER */}
      <PageHeader
        title="Staff & Workforce"
        subtitle="Employee Work Log & Daily Manufacturing Activity Tracking System"
        badge={
          <span className="live-indicator">
            <span className="live-pulse-dot" />
            Plant Shift Activity — Active
          </span>
        }
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportWorkLogs}
            title="Download full client-side CSV work log register"
          >
            <Download size={14} />
            <span>Export Work Log</span>
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
            <span>+ Add Work Log</span>
          </button>
        </div>
      </PageHeader>

      {/* 2. TOP 8 KPI CARDS */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))' }}>
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
      <div className="section-card" style={{ marginBottom: '14px' }}>
        <div className="card-header" style={{ padding: '10px 16px', background: 'var(--bg-surface-subtle)' }}>
          <div className="card-title" style={{ fontSize: '13px' }}>
            <Activity size={15} color="#7A1F3D" />
            <span>Today's Work Activity (Live Shop Floor Feed)</span>
          </div>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Showing {activityFeed.length} real-time shop floor events
          </span>
        </div>

        <div style={{ padding: '12px 16px', maxHeight: '165px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activityFeed.slice(0, 6).map((act) => (
            <div key={act.id} className="activity-feed-card">
              <div style={{ minWidth: '65px', textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="mono" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {act.time}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {act.action}
                </span>
              </div>

              <div style={{ width: '2px', background: 'var(--border-color)', borderRadius: '2px' }} />

              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                    <strong style={{ color: 'var(--primary)' }}>{act.employeeName}</strong> {act.action === 'started' ? 'started' : act.action === 'completed' ? 'completed' : 'updated'}:{' '}
                    <span style={{ fontWeight: 600 }}>{act.task}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                    {act.workOrder && act.workOrder !== '—' && (
                      <span className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        {act.workOrder}
                      </span>
                    )}
                    {act.spindle && act.spindle !== '—' && <span>• {act.spindle}</span>}
                    {act.machine && act.machine !== '—' && <span>• {act.machine}</span>}
                    <span>• {act.detail}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {act.progressBefore !== undefined && act.progressAfter !== undefined && (
                    <span className="mono" style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {act.progressBefore}% → {act.progressAfter}%
                    </span>
                  )}
                  <StatusBadge status={act.status} size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MAIN WORKFORCE NAVIGATION TABS */}
      <Tabs
        tabs={[
          { id: 'live', label: "Who's Working Now (Table)", count: staffList.filter(s => s.status === 'Working' || s.status === 'Overtime').length },
          { id: 'attendance', label: 'Daily Attendance & Time-Clock', count: attendanceRecords.length },
          { id: 'leaves', label: 'Leave Requests & Balances', count: leaveRequests.length },
          { id: 'bays', label: 'Shop Floor Bays & Machines', count: bayAllocations.length },
          { id: 'workload', label: 'Department Workload', count: INITIAL_DEPARTMENTS_WORKLOAD.length },
          { id: 'logs', label: 'All Work Logs (History)', count: workLogs.length },
          { id: 'shift', label: 'Shift Summary & Alerts', count: INITIAL_WORKFORCE_ALERTS.length }
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
          <select
            className="form-control"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ height: '32px', fontSize: '12px', padding: '0 8px', minWidth: '110px' }}
          >
            <option value="All">All Departments</option>
            <option value="Production">Production</option>
            <option value="Assembly">Assembly</option>
            <option value="Quality">Quality</option>
            <option value="Balancing">Balancing</option>
            <option value="Testing">Testing</option>
            <option value="Service">Service</option>
            <option value="Stores">Stores</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status:</span>
          <select
            className="form-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ height: '32px', fontSize: '12px', padding: '0 8px', minWidth: '100px' }}
          >
            <option value="All">All Statuses</option>
            <option value="Working">Working</option>
            <option value="Available">Available</option>
            <option value="Break">Break</option>
            <option value="Completed">Completed</option>
            <option value="Idle">Idle</option>
            <option value="Overtime">Overtime</option>
          </select>
        </div>

        {/* Shift Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Shift:</span>
          <select
            className="form-control"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            style={{ height: '32px', fontSize: '12px', padding: '0 8px', minWidth: '95px' }}
          >
            <option value="All">All Shifts</option>
            <option value="First Shift">First Shift</option>
            <option value="Second Shift">Second Shift</option>
          </select>
        </div>

        {/* Bay Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bay:</span>
          <select
            className="form-control"
            value={selectedBay}
            onChange={(e) => setSelectedBay(e.target.value)}
            style={{ height: '32px', fontSize: '12px', padding: '0 8px', minWidth: '95px' }}
          >
            <option value="All">All Bays</option>
            <option value="Bay 1">Bay 1 (Machining)</option>
            <option value="Bay 2">Bay 2 (Grinding)</option>
            <option value="Bay 3">Bay 3 (Cleanroom)</option>
            <option value="Bay 4">Bay 4 (Balancing)</option>
            <option value="Bay 5">Bay 5 (Testing)</option>
            <option value="Bay 6">Bay 6 (Metrology)</option>
            <option value="Bay 7">Bay 7 (Packaging)</option>
            <option value="Service Bay">Service Bay</option>
          </select>
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
                    <th>Current Task</th>
                    <th>Work Order</th>
                    <th>Machine / Bay</th>
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
                    filteredStaff.map((emp) => (
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

                        {/* Current Task */}
                        <td style={{ fontWeight: 600, fontSize: '12px' }}>
                          {emp.currentTask}
                        </td>

                        {/* Work Order (Clickable) */}
                        <td>
                          {emp.workOrder && emp.workOrder !== '—' ? (
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
                                handleViewWorkOrder(emp.workOrder);
                              }}
                              title="Open Work Order in Production"
                            >
                              {emp.workOrder}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Machine / Bay */}
                        <td style={{ fontSize: '11.5px' }}>
                          <span style={{ fontWeight: 600 }}>{emp.machine}</span>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{emp.bay}</div>
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
                        <td style={{ minWidth: '100px' }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenAddLog(emp)}
                              title="Add Work Log for this employee"
                              style={{ padding: '3px 7px', fontSize: '11px' }}
                            >
                              <Plus size={12} />
                              <span>Log</span>
                            </button>

                            {emp.status === 'Working' || emp.status === 'Overtime' ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenUpdateProgress(emp)}
                                title="Update Progress"
                                style={{ padding: '3px 7px', fontSize: '11px' }}
                              >
                                <Edit3 size={12} />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setSelectedStaff(emp)}
                              title="View Employee Activity Log"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                            >
                              <Eye size={12} />
                              <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MANAGER VIEW / WORKFORCE OVERVIEW SECTION */}
          <div className="section-card">
            <div className="card-header" style={{ padding: '10px 16px' }}>
              <div className="card-title" style={{ fontSize: '13px' }}>
                <Shield size={15} color="#7A1F3D" />
                <span>Workforce Overview & Management Insights</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Automated workload detection & shop-floor exceptions
              </span>
            </div>

            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {/* High Workload Box */}
              <div style={{ padding: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#b45309', marginBottom: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>High Workload (&gt;100%)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rahul Patil (CNC-03)</span>
                    <strong className="mono" style={{ color: '#b45309' }}>112% Workload</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Suresh Sawant (Studer S33)</span>
                    <strong className="mono" style={{ color: '#b45309' }}>108% Workload</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Amit Kulkarni (Assembly)</span>
                    <strong className="mono" style={{ color: '#b45309' }}>104% Workload</strong>
                  </div>
                </div>
              </div>

              {/* No Work Logged Box */}
              <div style={{ padding: '10px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <Clock size={14} />
                  <span>No Logged Work Today</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Vinod Gaikwad (GPS-EMP-160)</span>
                    <span className="badge-neutral" style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '10px' }}>Second Shift</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Nitin Bhosale (GPS-EMP-152)</span>
                    <span className="badge-neutral" style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '10px' }}>Standby</span>
                  </div>
                </div>
              </div>

              {/* Overtime Box */}
              <div style={{ padding: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>
                  <TrendingUp size={14} />
                  <span>Employees Working Overtime</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sneha Joshi (Quality)</span>
                    <strong className="mono" style={{ color: '#047857' }}>+1h 20m</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Suresh Sawant (Grinding)</span>
                    <strong className="mono" style={{ color: '#047857' }}>+45m</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rahul Patil (Production)</span>
                    <strong className="mono" style={{ color: '#047857' }}>+35m</strong>
                  </div>
                </div>
              </div>

              {/* Delayed & Blocked Tasks */}
              <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>
                  <AlertCircle size={14} />
                  <span>Delayed & Blocked Tasks</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>WO-2026-0148 (Shaft Turning)</span>
                    <strong className="mono" style={{ color: '#dc2626' }}>45m Delayed</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>WO-2026-0152 (Bearing Assembly)</span>
                    <strong className="mono" style={{ color: '#dc2626' }}>Blocked for QC</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DAILY ATTENDANCE & TIME-CLOCK                                        */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {attendanceError && (
            <div className="section-card" style={{ padding: '24px', textAlign: 'center' }}>
              <AlertCircle size={28} color="#dc2626" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                {attendanceError.message || 'Unable to retrieve live attendance records.'}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const res = await workforceService.getAttendance();
                  if (res.data) setAttendanceRecords(res.data);
                }}
              >
                <RefreshCw size={12} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {!attendanceError && (
            <div className="section-card">
              <div className="card-header">
                <div className="card-title">
                  <Clock size={16} color="#7A1F3D" />
                  <span>Daily Attendance & Plant Time-Clock Station</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {attendanceRecords.length} Attendance Logs Today
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenClockIn}
                  >
                    <Plus size={13} />
                    <span>+ Clock In Technician</span>
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Employee</th>
                      <th>Employee Code</th>
                      <th>Department</th>
                      <th>Shift</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Total Hours</th>
                      <th>Overtime</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No attendance records registered for today. Click "+ Clock In Technician" to record check-in.
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((att) => (
                        <tr key={att.id}>
                          <td className="mono" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                            {att.date}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                              {att.employeeName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {att.designation}
                            </div>
                          </td>
                          <td className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>
                            {att.employeeCode}
                          </td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              color: '#334155',
                              fontWeight: 600
                            }}>
                              {att.department}
                            </span>
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {att.shiftName}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px', color: '#047857', fontWeight: 600 }}>
                            {att.checkInTime}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px', color: att.checkOutRaw ? '#1e293b' : 'var(--text-muted)' }}>
                            {att.checkOutTime}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px', fontWeight: 700 }}>
                            {att.totalHours > 0 ? `${att.totalHours} hrs` : (
                              <span style={{ color: '#0284c7', fontWeight: 600 }}>Active</span>
                            )}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px', color: att.overtimeHours > 0 ? '#b45309' : 'var(--text-muted)' }}>
                            {att.overtimeHours > 0 ? `+${att.overtimeHours} hrs` : '—'}
                          </td>
                          <td>
                            <StatusBadge status={att.status} size="sm" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!att.checkOutRaw ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px', color: '#b45309' }}
                                onClick={() => handleClockOut(att)}
                                title="Clock out technician from station"
                              >
                                Clock Out
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: LEAVE REQUESTS & BALANCES                                            */}
      {/* ========================================================================= */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Leave Balances KPI Grid */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Privilege Leave (PL)</span>
                <div className="metric-icon-wrap"><Shield size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: 'var(--primary)' }}>18 Days</div>
              <div className="metric-footer" style={{ color: 'var(--text-muted)' }}>Annual earned balance</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Casual Leave (CL)</span>
                <div className="metric-icon-wrap"><Calendar size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: '#047857' }}>12 Days</div>
              <div className="metric-footer" style={{ color: '#047857' }}>Standard shop-floor allocation</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Medical / Sick Leave (SL)</span>
                <div className="metric-icon-wrap"><AlertTriangle size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: '#0284c7' }}>10 Days</div>
              <div className="metric-footer" style={{ color: '#0284c7' }}>Certified medical contingency</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Pending Requests</span>
                <div className="metric-icon-wrap"><Clock size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: '#b45309' }}>
                {leaveRequests.filter(l => l.status === 'Pending').length}
              </div>
              <div className="metric-footer" style={{ color: '#b45309' }}>Awaiting supervisor signoff</div>
            </div>
          </div>

          {leavesError && (
            <div className="section-card" style={{ padding: '24px', textAlign: 'center' }}>
              <AlertCircle size={28} color="#dc2626" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                {leavesError.message || 'Unable to retrieve live leave requests.'}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const res = await leaveService.getLeaveRequests();
                  if (res.data) setLeaveRequests(res.data);
                }}
              >
                <RefreshCw size={12} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {!leavesError && (
            <div className="section-card">
              <div className="card-header">
                <div className="card-title">
                  <Calendar size={16} color="#7A1F3D" />
                  <span>Employee Leave Applications & Management Review</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenSubmitLeave}
                >
                  <Plus size={13} />
                  <span>+ Submit Leave Request</span>
                </button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Leave ID</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Approver</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Management Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No leave applications recorded. Click "+ Submit Leave Request" to apply.
                        </td>
                      </tr>
                    ) : (
                      leaveRequests.map((leave) => (
                        <tr key={leave.id}>
                          <td className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>
                            {leave.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                              {leave.employeeName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {leave.employeeCode}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              color: '#334155',
                              fontWeight: 600
                            }}>
                              {leave.department}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', fontWeight: 600 }}>
                            {leave.leaveType}
                          </td>
                          <td className="mono" style={{ fontSize: '11px' }}>
                            {leave.startDate} → {leave.endDate}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px', fontWeight: 700 }}>
                            {leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}
                          </td>
                          <td style={{ fontSize: '11.5px', maxWidth: '200px' }} title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td style={{ fontSize: '11.5px', color: leave.approvedBy ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {leave.approvedBy || 'Pending Review'}
                          </td>
                          <td>
                            <StatusBadge status={leave.status} size="sm" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {leave.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '3px 7px', fontSize: '11px' }}
                                  onClick={() => handleApproveLeave(leave)}
                                  title="Approve leave and debit balance atomically"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 7px', fontSize: '11px', color: '#dc2626' }}
                                  onClick={() => handleRejectLeave(leave)}
                                  title="Reject leave request"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: leave.status === 'Approved' ? '#059669' : '#dc2626', fontWeight: 600 }}>
                                {leave.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHOP FLOOR BAYS & MACHINES ALLOCATION                              */}
      {/* ========================================================================= */}
      {activeTab === 'bays' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="#7A1F3D" />
              <span>Shop Floor Machine Allocation & Bay Utilization</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Real-time machine assignment, operator tracking, and spindle progress
            </span>
          </div>

          <div style={{ padding: '16px' }}>
            <div className="bay-grid">
              {bayAllocations.map((bay) => (
                <div key={bay.bayId} className="bay-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: bay.status === 'Overloaded' ? '#dc2626' : '#10b981'
                      }} />
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{bay.bayName}</span>
                    </div>
                    <span className="nav-badge" style={{
                      background: bay.status === 'Overloaded' ? '#fef2f2' : '#f1f5f9',
                      color: bay.status === 'Overloaded' ? '#dc2626' : '#334155',
                      fontSize: '10px'
                    }}>
                      {bay.machine.split(' ')[0]}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {bay.machine}
                  </div>

                  {/* Assigned Operator & Spindle Box */}
                  <div style={{
                    padding: '10px',
                    background: 'var(--bg-surface-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Operator:</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                        👤 {bay.assignedStaff}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Work Order / Spindle:</span>
                      <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>
                        {bay.workOrder} • {bay.spindleSerial}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Operation:</span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {bay.operation}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Started & Elapsed:</span>
                      <span className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>
                        {bay.started} ({bay.duration})
                      </span>
                    </div>
                  </div>

                  {/* Utilization / Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Task Progress</span>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {bay.progress}%
                      </span>
                    </div>
                    <ProgressBar progress={bay.progress} height={6} />
                  </div>
                </div>
              ))}
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
                  <th>Machine / Bay</th>
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
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{log.bay}</div>
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
      {/* TAB 5: SHIFT SUMMARY & ALERTS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'shift' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {/* Shift Summary Card */}
          <div className="section-card">
            <div className="card-header" style={{ padding: '10px 16px' }}>
              <div className="card-title" style={{ fontSize: '13px' }}>
                <Clock size={15} color="#7A1F3D" />
                <span>Shift Summary • {INITIAL_SHIFT_SUMMARY.shiftName}</span>
              </div>
              <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {INITIAL_SHIFT_SUMMARY.timing}
              </span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scheduled</div>
                  <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>{INITIAL_SHIFT_SUMMARY.staffScheduled}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present</div>
                  <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>{INITIAL_SHIFT_SUMMARY.staffPresent}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Working</div>
                  <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>{INITIAL_SHIFT_SUMMARY.staffWorking}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
                  <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#d97706' }}>{INITIAL_SHIFT_SUMMARY.completedTasks}</div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Shift Operations Target Progress</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{INITIAL_SHIFT_SUMMARY.progressPercentage}% Complete</span>
                </div>
                <ProgressBar progress={INITIAL_SHIFT_SUMMARY.progressPercentage} height={7} />
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <span>Shift Supervisor: <strong>{INITIAL_SHIFT_SUMMARY.supervisor}</strong></span>
                <span className="mono" style={{ color: 'var(--primary)' }}>{INITIAL_SHIFT_SUMMARY.openTasks} Open Work Items</span>
              </div>
            </div>
          </div>

          {/* Operational Warnings / Alerts */}
          <div className="section-card">
            <div className="card-header" style={{ padding: '10px 16px' }}>
              <div className="card-title" style={{ fontSize: '13px' }}>
                <AlertTriangle size={15} color="#d97706" />
                <span>Workforce Alerts & Operational Warnings</span>
              </div>
              <span className="nav-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>2 Urgent</span>
            </div>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {INITIAL_WORKFORCE_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    background: alert.type === 'danger' ? '#fef2f2' : alert.type === 'warning' ? '#fffbeb' : '#ecfdf5',
                    border: `1px solid ${alert.type === 'danger' ? '#fecaca' : alert.type === 'warning' ? '#fde68a' : '#a7f3d0'}`,
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                    {alert.type === 'danger' && <AlertTriangle size={14} color="#dc2626" />}
                    {alert.type === 'warning' && <Clock size={14} color="#d97706" />}
                    {alert.type === 'success' && <CheckCircle2 size={14} color="#059669" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{alert.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{alert.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                Joined {selectedStaff.joiningDate} • Shift: {selectedStaff.shift}
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
            {/* Header: Photo/Avatar, Name, ID, Department, Role, Shift, Station */}
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
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  📍 Current Station: <strong>{selectedStaff.location || selectedStaff.machine}</strong> • {selectedStaff.shift}
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

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenAddLog(selectedStaff)}
                  >
                    <Plus size={12} />
                    <span>Add Log Entry</span>
                  </button>
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

                  <select
                    className="form-control"
                    value={logStatusFilter}
                    onChange={(e) => setLogStatusFilter(e.target.value)}
                    style={{ height: '28px', fontSize: '11.5px', width: '120px' }}
                  >
                    <option value="All">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Paused">Paused</option>
                  </select>
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
                            <span>• Machine: <strong>{log.machine} ({log.bay})</strong></span>
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
              <label className="form-label">Work Order Reference</label>
              <select
                className="form-control mono"
                value={addLogForm.workOrder}
                onChange={(e) => {
                  const wo = availableWorkOrders.find(w => w.id === e.target.value);
                  setAddLogForm(prev => ({
                    ...prev,
                    workOrder: e.target.value,
                    spindle: wo ? wo.spindleSerial : prev.spindle
                  }));
                }}
              >
                {availableWorkOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.id} ({wo.customer?.split(' ')[0]} - {wo.spindleModel})
                  </option>
                ))}
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

            {/* Shop Bay */}
            <div className="form-group">
              <label className="form-label">Shop Floor Bay</label>
              <select
                className="form-control"
                value={addLogForm.bay}
                onChange={(e) => setAddLogForm(prev => ({ ...prev, bay: e.target.value }))}
              >
                <option value="Bay 1 - Machining">Bay 1 — CNC Lathe / Turning</option>
                <option value="Bay 2 - Grinding">Bay 2 — Studer S33 Grinder</option>
                <option value="Bay 3 - Cleanroom">Bay 3 — Cleanroom Assembly</option>
                <option value="Bay 4 - Balancing">Bay 4 — Schenck Balancing</option>
                <option value="Bay 5 - Testing">Bay 5 — Spindle Test Bench</option>
                <option value="Bay 6 - Metrology">Bay 6 — QC Metrology Lab</option>
                <option value="Bay 7 - Packaging">Bay 7 — Packaging & Dispatch</option>
                <option value="Service Bay">Service Bay</option>
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

              {/* Work Order */}
              <div className="form-group">
                <label className="form-label">Work Order</label>
                <select
                  className="form-control mono"
                  value={startTaskForm.workOrder}
                  onChange={(e) => {
                    const wo = availableWorkOrders.find(w => w.id === e.target.value);
                    setStartTaskForm(prev => ({
                      ...prev,
                      workOrder: e.target.value,
                      spindle: wo ? wo.spindleSerial : prev.spindle
                    }));
                  }}
                >
                  {availableWorkOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.id} ({wo.customer?.split(' ')[0]} - {wo.spindleModel})
                    </option>
                  ))}
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
      {/* 13. MODAL: CLOCK IN TECHNICIAN                                           */}
      {/* ========================================================================= */}
      {isClockInModalOpen && (
        <Modal
          isOpen={isClockInModalOpen}
          onClose={() => setIsClockInModalOpen(false)}
          title="Clock In Technician (Shop Floor Time-Clock)"
          maxWidth="480px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsClockInModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveClockIn}>
                <Check size={14} />
                <span>Confirm Clock In</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveClockIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Select Employee *</label>
              <select
                className="form-control"
                value={clockInForm.employeeId}
                onChange={(e) => setClockInForm(prev => ({ ...prev, employeeId: e.target.value }))}
                required
              >
                <option value="">-- Choose Employee --</option>
                {staffList.map((emp) => (
                  <option key={emp.id} value={emp.dbId || emp.id}>
                    {emp.name} ({emp.id}) — {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Station Remarks / Notes</label>
              <input
                type="text"
                className="form-control"
                value={clockInForm.remarks}
                onChange={(e) => setClockInForm(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Station check-in notes..."
              />
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
              Note: The database enforces <code>UNIQUE (employee_id, date)</code> to strictly prevent duplicate clock-ins on the same calendar day.
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 14. MODAL: SUBMIT LEAVE APPLICATION                                      */}
      {/* ========================================================================= */}
      {isSubmitLeaveModalOpen && (
        <Modal
          isOpen={isSubmitLeaveModalOpen}
          onClose={() => setIsSubmitLeaveModalOpen(false)}
          title="Submit Leave Application"
          maxWidth="500px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsSubmitLeaveModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveLeaveRequest}>
                <Check size={14} />
                <span>Submit Application</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveLeaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select
                className="form-control"
                value={leaveForm.employeeId}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, employeeId: e.target.value }))}
                required
              >
                <option value="">-- Select Employee --</option>
                {staffList.map((emp) => (
                  <option key={emp.id} value={emp.dbId || emp.id}>
                    {emp.name} ({emp.id}) — {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Leave Type *</label>
              <select
                className="form-control"
                value={leaveForm.leaveType}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, leaveType: e.target.value }))}
              >
                <option value="Casual Leave">Casual Leave (CL)</option>
                <option value="Sick Leave">Sick Leave (SL)</option>
                <option value="Privilege Leave">Privilege Leave (PL)</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
                <option value="Compensatory Off">Compensatory Off</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Justification / Reason *</label>
              <textarea
                className="form-control"
                rows={3}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for leave..."
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
