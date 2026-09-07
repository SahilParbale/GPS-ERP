import React, { useState, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import { 
  WORKFORCE_KPIS, 
  WORKFORCE_STAFF, 
  DEPARTMENTS_WORKLOAD, 
  BAY_ALLOCATIONS, 
  WORKFORCE_ALERTS, 
  SHIFT_SUMMARY,
  WORK_ORDERS
} from '../data/mockData';
import { 
  Search, Filter, Plus, Users, Clock, AlertTriangle, 
  CheckCircle2, AlertCircle, ArrowRight, Eye, UserCheck, 
  Briefcase, Activity, Shield, Cpu, ChevronRight, X, 
  Calendar, CheckSquare, Layers, Wrench, RefreshCw
} from 'lucide-react';

export default function WorkforceScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  const [activeTab, setActiveTab] = useState('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedBay, setSelectedBay] = useState('All');

  // Staff state (supports local assignment updates)
  const [staffList, setStaffList] = useState(WORKFORCE_STAFF);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // New task form state
  const [assignForm, setAssignForm] = useState({
    employeeId: 'EMP-021',
    department: 'Grinding',
    workOrder: 'WO-2026-104',
    spindleSerial: 'GPS-2026-0842',
    operation: 'Taper Finish Grinding & Spark-Out',
    machine: 'Studer S33',
    bay: 'Bay 2',
    priority: 'High',
    duration: '2h 30m',
    notes: 'Maintain strict runout limit <= 0.0010 mm on nose taper.'
  });

  // Filtered employees
  const filteredStaff = useMemo(() => {
    return staffList.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        emp.name.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.workOrder.toLowerCase().includes(q) ||
        emp.spindleSerial.toLowerCase().includes(q) ||
        emp.currentTask.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );

      const matchesDept = selectedDept === 'All' || emp.department.toLowerCase() === selectedDept.toLowerCase();
      const matchesStatus = selectedStatus === 'All' || emp.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesBay = selectedBay === 'All' || emp.bay.toLowerCase().includes(selectedBay.toLowerCase());

      return matchesSearch && matchesDept && matchesStatus && matchesBay;
    });
  }, [staffList, searchQuery, selectedDept, selectedStatus, selectedBay]);

  // Working now count
  const workingCount = useMemo(() => {
    return staffList.filter(s => s.status === 'Working' || s.status === 'Overloaded').length;
  }, [staffList]);

  // Handle task assignment submission
  const handleAssignTask = (e) => {
    e.preventDefault();
    const targetEmp = staffList.find(s => s.id === assignForm.employeeId);
    const empName = targetEmp ? targetEmp.name : 'Technician';

    setStaffList(prev => prev.map(emp => {
      if (emp.id === assignForm.employeeId) {
        return {
          ...emp,
          department: assignForm.department || emp.department,
          workOrder: assignForm.workOrder,
          spindleSerial: assignForm.spindleSerial,
          currentTask: assignForm.operation,
          machine: assignForm.machine,
          bay: assignForm.bay,
          status: 'Working',
          progress: 5,
          started: 'Just now',
          duration: '0m',
          tasksToday: emp.tasksToday + 1,
          activity: [
            { time: 'Just now', title: `Assigned to ${assignForm.operation}`, detail: `WO ${assignForm.workOrder} • ${assignForm.notes || 'No extra notes'}` },
            ...emp.activity
          ]
        };
      }
      return emp;
    }));

    setIsAssignModalOpen(false);
    onNotify(`Task "${assignForm.operation}" assigned successfully to ${empName}`);
  };

  // Quick action from drawer to view work order
  const handleViewWorkOrder = (woId) => {
    if (woId === '—' || !woId) return;
    const foundWo = WORK_ORDERS.find(w => w.id === woId);
    if (foundWo && onSelectWorkOrder && onNavigate) {
      onSelectWorkOrder(foundWo);
      onNavigate('work-order-detail');
    } else if (onNavigate) {
      onNavigate('production');
    }
  };

  const hasActiveFilters = searchQuery !== '' || selectedDept !== 'All' || selectedStatus !== 'All' || selectedBay !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDept('All');
    setSelectedStatus('All');
    setSelectedBay('All');
  };

  return (
    <div className="content-area">
      {/* 1. TOP HEADER */}
      <PageHeader
        title="Staff & Workforce"
        subtitle="Live shop-floor workforce activity and task allocation"
        badge={
          <span className="live-indicator">
            <span className="live-pulse-dot" />
            Plant Activity — Live
          </span>
        }
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => setIsAssignModalOpen(true)}
          title="Allocate a shop-floor manufacturing task"
        >
          <Plus size={14} />
          <span>Assign Task</span>
        </button>
      </PageHeader>

      {/* 2. KPI CARDS */}
      <div className="metrics-grid">
        {WORKFORCE_KPIS.map((kpi) => (
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

      {/* 10 & 11. WORKLOAD ALERTS & SHIFT SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
        {/* Alerts Card */}
        <div className="section-card">
          <div className="card-header" style={{ padding: '10px 16px' }}>
            <div className="card-title" style={{ fontSize: '13px' }}>
              <AlertTriangle size={15} color="#d97706" />
              <span>Workforce Alerts & Operational Warnings</span>
            </div>
            <span className="nav-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>2 Urgent</span>
          </div>
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {WORKFORCE_ALERTS.map((alert) => (
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

        {/* Shift Summary Card */}
        <div className="section-card">
          <div className="card-header" style={{ padding: '10px 16px' }}>
            <div className="card-title" style={{ fontSize: '13px' }}>
              <Clock size={15} color="#0284c7" />
              <span>Today's Shift Summary • {SHIFT_SUMMARY.shiftName}</span>
            </div>
            <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              {SHIFT_SUMMARY.timing}
            </span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scheduled</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>{SHIFT_SUMMARY.staffScheduled}</div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>{SHIFT_SUMMARY.staffPresent}</div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Bays</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7' }}>{SHIFT_SUMMARY.staffWorking}</div>
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Done Tasks</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#d97706' }}>{SHIFT_SUMMARY.completedTasks}</div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shift Progress (Target: 46 Operations)</span>
                <span className="mono" style={{ fontWeight: 600 }}>{SHIFT_SUMMARY.progressPercentage}% Complete</span>
              </div>
              <ProgressBar progress={SHIFT_SUMMARY.progressPercentage} height={7} />
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <span>Shift Supervisor: <strong>{SHIFT_SUMMARY.supervisor}</strong></span>
              <span className="mono" style={{ color: 'var(--primary)' }}>{SHIFT_SUMMARY.openTasks} Open Work Items</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <Tabs
        tabs={[
          { id: 'live', label: "Who's Working Now & Bays", count: workingCount },
          { id: 'directory', label: 'Staff Directory & Skills', count: staffList.length },
          { id: 'workload', label: 'Department Workload', count: DEPARTMENTS_WORKLOAD.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 12. FILTERS BAR */}
      <div className="workforce-filter-bar">
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search employee, ID, WO, spindle..."
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
            <option value="Machining">Machining</option>
            <option value="Grinding">Grinding</option>
            <option value="Assembly">Assembly</option>
            <option value="Balancing">Balancing</option>
            <option value="Testing">Testing</option>
            <option value="Quality">Quality</option>
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
            <option value="On Break">On Break</option>
            <option value="Overloaded">Overloaded</option>
            <option value="In Meeting">In Meeting</option>
          </select>
        </div>

        {/* Bay Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bay:</span>
          <select 
            className="form-control" 
            value={selectedBay} 
            onChange={(e) => setSelectedBay(e.target.value)}
            style={{ height: '32px', fontSize: '12px', padding: '0 8px', minWidth: '90px' }}
          >
            <option value="All">All Bays</option>
            <option value="Bay 1">Bay 1 (CNC Lathe)</option>
            <option value="Bay 2">Bay 2 (Studer Grinder)</option>
            <option value="Bay 3">Bay 3 (Cleanroom)</option>
            <option value="Bay 4">Bay 4 (Balancing)</option>
            <option value="Bay 5">Bay 5 (Test Bench)</option>
            <option value="Bay 6">Bay 6 (Metrology)</option>
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
          Showing <strong>{filteredStaff.length}</strong> of {staffList.length} staff
        </div>
      </div>

      {/* TAB 1: LIVE WORKFORCE & BAY ALLOCATION */}
      {activeTab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 3. LIVE WORKFORCE OVERVIEW TABLE */}
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Users size={16} color="#0284c7" />
                <span>Who's Working Now</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Real-time task tracking & shop floor progress
              </span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Current Task</th>
                    <th>Work Order</th>
                    <th>Spindle</th>
                    <th>Machine / Bay</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="12" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No workforce members match your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((emp) => (
                      <tr 
                        key={emp.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedStaff(emp)}
                      >
                        {/* Employee Column with Avatar */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div 
                              className="staff-avatar" 
                              style={{ background: emp.avatarColor || '#0284c7' }}
                            >
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

                        {/* Current Task */}
                        <td style={{ fontWeight: 500, fontSize: '12px' }}>
                          {emp.currentTask}
                        </td>

                        {/* Work Order */}
                        <td>
                          {emp.workOrder !== '—' ? (
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
                              title="View Work Order in Production"
                            >
                              {emp.workOrder}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Spindle */}
                        <td className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {emp.spindleSerial}
                        </td>

                        {/* Machine / Bay */}
                        <td style={{ fontSize: '12px' }}>
                          <span style={{ fontWeight: 600 }}>{emp.bay}</span>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.machine}</div>
                        </td>

                        {/* Started */}
                        <td className="mono" style={{ fontSize: '11px' }}>
                          {emp.started}
                        </td>

                        {/* Duration */}
                        <td className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>
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

                        {/* Action */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStaff(emp);
                            }}
                            title="View Employee Activity Log"
                            style={{ padding: '3px 8px' }}
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. SHOP FLOOR STAFF MAP / BAY VIEW */}
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Layers size={16} color="#0284c7" />
                <span>Shop Floor Allocation & Bay Activity</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Direct machine assignment, active spindle & live bay utilization
              </span>
            </div>

            <div style={{ padding: '16px' }}>
              <div className="bay-grid">
                {BAY_ALLOCATIONS.map((bay) => (
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

                    {/* Assigned operator & spindle box */}
                    <div style={{ 
                      padding: '10px', 
                      background: 'var(--bg-surface-subtle)', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Staff:</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          👤 {bay.assignedStaff}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spindle / WO:</span>
                        <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>
                          {bay.spindleSerial} • {bay.workOrder}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Op:</span>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {bay.operation}
                        </span>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Bay Utilization</span>
                        <span className="mono" style={{ 
                          fontWeight: 700, 
                          color: bay.utilization >= 95 ? '#dc2626' : 'var(--primary)' 
                        }}>
                          {bay.utilization}%
                        </span>
                      </div>
                      <ProgressBar 
                        progress={bay.utilization} 
                        height={6} 
                        color={bay.utilization >= 95 ? '#dc2626' : undefined} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF DIRECTORY & SKILLS */}
      {activeTab === 'directory' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <UserCheck size={16} color="#0284c7" />
              <span>Shop Floor Staff Directory & Competency</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {filteredStaff.length} employees matching active filters
            </span>
          </div>

          <div style={{ padding: '16px' }}>
            <div className="staff-grid">
              {filteredStaff.map((emp) => (
                <div key={emp.id} className="staff-card">
                  {/* Top Bar: Avatar, Name, Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div className="staff-avatar" style={{ background: emp.avatarColor || '#0284c7' }}>
                        {emp.initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                          {emp.name}
                        </div>
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {emp.id} • {emp.department}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={emp.status} size="sm" />
                  </div>

                  {/* Designation & Skill Level */}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {emp.designation}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '3px', fontWeight: 600 }}>
                      {emp.skillLevel}
                    </span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', background: '#f8fafc', color: '#475569', borderRadius: '3px', border: '1px solid var(--border-color)' }}>
                      {emp.shift.split(' ')[0]}
                    </span>
                  </div>

                  {/* Current Assignment Snapshot */}
                  <div style={{ 
                    padding: '10px', 
                    background: 'var(--bg-surface-subtle)', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-color)',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Current Task:</span>
                      <span style={{ fontWeight: 600 }}>{emp.currentTask}</span>
                    </div>
                    {emp.workOrder !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Work Order:</span>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{emp.workOrder}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Station / Bay:</span>
                      <span>{emp.bay} ({emp.machine})</span>
                    </div>
                  </div>

                  {/* Tasks Today & Utilization */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Today: <strong>{emp.completedToday}</strong> of {emp.tasksToday} done
                      </span>
                      <span className="mono" style={{ fontWeight: 600 }}>
                        {emp.utilization}% Utilization
                      </span>
                    </div>
                    <ProgressBar progress={emp.utilization} height={5} />
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedStaff(emp)}
                    style={{ marginTop: 'auto', justifyContent: 'center' }}
                  >
                    <Eye size={12} />
                    <span>View Activity Log & Profile</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENT WORKLOAD */}
      {activeTab === 'workload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 5. DEPARTMENT WORKLOAD SECTION */}
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Briefcase size={16} color="#0284c7" />
                <span>Department Workload & Capacity Utilization</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Aggregated shop-floor resource loading across plant cells
              </span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Active Staff</th>
                    <th>Active Tasks</th>
                    <th>Completed Today</th>
                    <th>Capacity Utilization</th>
                    <th>Load Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS_WORKLOAD.map((dept) => {
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
        </div>
      )}

      {/* 8. STAFF DETAIL DRAWER / MODAL */}
      {selectedStaff && (
        <Modal
          isOpen={Boolean(selectedStaff)}
          onClose={() => setSelectedStaff(null)}
          title={`Employee Profile: ${selectedStaff.name} (${selectedStaff.id})`}
          width="640px"
          footer={
            <>
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
                onClick={() => {
                  setAssignForm(prev => ({
                    ...prev,
                    employeeId: selectedStaff.id,
                    department: selectedStaff.department
                  }));
                  setSelectedStaff(null);
                  setIsAssignModalOpen(true);
                }}
              >
                <Plus size={13} />
                <span>Assign New Task</span>
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Profile Overview Header */}
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
                style={{ width: '48px', height: '48px', fontSize: '18px', background: selectedStaff.avatarColor || '#0284c7' }}
              >
                {selectedStaff.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{selectedStaff.name}</h3>
                  <StatusBadge status={selectedStaff.status} size="sm" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedStaff.designation} • <strong className="mono">{selectedStaff.id}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedStaff.department} • {selectedStaff.skillLevel} • {selectedStaff.shift}
                </div>
              </div>
            </div>

            {/* CURRENT ASSIGNMENT BLOCK */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Current Assignment Details
              </div>

              <div style={{ 
                padding: '14px', 
                background: '#f8fafc', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Work Order</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                    {selectedStaff.workOrder}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spindle Serial</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: '13px' }}>
                    {selectedStaff.spindleSerial}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Operation / Task</div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {selectedStaff.currentTask}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Machine Station</div>
                  <div style={{ fontWeight: 600, fontSize: '12px' }}>{selectedStaff.machine}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shop Bay</div>
                  <div style={{ fontWeight: 600, fontSize: '12px' }}>{selectedStaff.bay}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Started Time</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: '12px' }}>{selectedStaff.started}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration Elapsed</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: '12px' }}>{selectedStaff.duration}</div>
                </div>

                <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Task Completion</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{selectedStaff.progress}%</span>
                  </div>
                  <ProgressBar progress={selectedStaff.progress} height={6} />
                </div>
              </div>
            </div>

            {/* TODAY'S ACTIVITY TIMELINE */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Today's Activity Log
              </div>

              <div className="timeline">
                {selectedStaff.activity?.map((act, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-point done" />
                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="timeline-title">{act.title}</span>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{act.time}</span>
                      </div>
                      <div className="timeline-meta">{act.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TASK HISTORY TABLE */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Completed Shift History
              </div>

              <table className="data-table" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <thead>
                  <tr>
                    <th>Work Order</th>
                    <th>Task Completed</th>
                    <th>Spindle</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStaff.taskHistory?.map((hist, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontWeight: 600 }}>{hist.wo}</td>
                      <td>{hist.task}</td>
                      <td className="mono" style={{ fontSize: '11px' }}>{hist.spindle}</td>
                      <td className="mono" style={{ fontSize: '11px' }}>{hist.duration}</td>
                      <td><StatusBadge status={hist.status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* 9. TASK ASSIGNMENT MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Shop Floor Task"
        width="560px"
        footer={
          <>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleAssignTask}
            >
              <CheckSquare size={13} />
              <span>Assign Task</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleAssignTask}>
          <div className="form-grid">
            {/* Employee Selection */}
            <div className="form-group">
              <label className="form-label">Employee / Technician</label>
              <select 
                className="form-control"
                value={assignForm.employeeId}
                onChange={(e) => {
                  const emp = staffList.find(s => s.id === e.target.value);
                  setAssignForm(prev => ({
                    ...prev,
                    employeeId: e.target.value,
                    department: emp ? emp.department : prev.department,
                    bay: emp ? emp.bay : prev.bay
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

            {/* Department */}
            <div className="form-group">
              <label className="form-label">Department</label>
              <select 
                className="form-control"
                value={assignForm.department}
                onChange={(e) => setAssignForm(prev => ({ ...prev, department: e.target.value }))}
              >
                <option value="Machining">Machining</option>
                <option value="Grinding">Grinding</option>
                <option value="Assembly">Assembly</option>
                <option value="Balancing">Balancing</option>
                <option value="Testing">Testing</option>
                <option value="Quality">Quality</option>
                <option value="Service">Service</option>
                <option value="Stores">Stores</option>
              </select>
            </div>

            {/* Work Order */}
            <div className="form-group">
              <label className="form-label">Work Order Reference</label>
              <select 
                className="form-control mono"
                value={assignForm.workOrder}
                onChange={(e) => {
                  const wo = WORK_ORDERS.find(w => w.id === e.target.value);
                  setAssignForm(prev => ({
                    ...prev,
                    workOrder: e.target.value,
                    spindleSerial: wo ? wo.spindleSerial : prev.spindleSerial
                  }));
                }}
              >
                {WORK_ORDERS.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.id} ({wo.customer.split(' ')[0]} - {wo.spindleModel})
                  </option>
                ))}
              </select>
            </div>

            {/* Spindle Serial */}
            <div className="form-group">
              <label className="form-label">Target Spindle Serial</label>
              <input 
                type="text" 
                className="form-control mono"
                value={assignForm.spindleSerial}
                onChange={(e) => setAssignForm(prev => ({ ...prev, spindleSerial: e.target.value }))}
                placeholder="GPS-2026-XXXX"
              />
            </div>

            {/* Operation / Task */}
            <div className="form-group full-width">
              <label className="form-label">Manufacturing Operation</label>
              <input 
                type="text" 
                className="form-control"
                value={assignForm.operation}
                onChange={(e) => setAssignForm(prev => ({ ...prev, operation: e.target.value }))}
                placeholder="e.g. Studer S33 Finish Grinding of Spindle Nose Taper"
              />
            </div>

            {/* Machine / Bay */}
            <div className="form-group">
              <label className="form-label">Machine Station</label>
              <input 
                type="text" 
                className="form-control"
                value={assignForm.machine}
                onChange={(e) => setAssignForm(prev => ({ ...prev, machine: e.target.value }))}
                placeholder="e.g. Studer S33 / Okuma LB3000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shop Bay</label>
              <select 
                className="form-control"
                value={assignForm.bay}
                onChange={(e) => setAssignForm(prev => ({ ...prev, bay: e.target.value }))}
              >
                <option value="Bay 1">Bay 1 — CNC Lathe / Turning</option>
                <option value="Bay 2">Bay 2 — Studer S33 Grinder</option>
                <option value="Bay 3">Bay 3 — Cleanroom Assembly</option>
                <option value="Bay 4">Bay 4 — Schenck Balancing</option>
                <option value="Bay 5">Bay 5 — Spindle Test Bench</option>
                <option value="Bay 6">Bay 6 — QC Metrology</option>
                <option value="Bay 7">Bay 7 — Packaging & Dispatch</option>
                <option value="Service Bay">Service Bay</option>
              </select>
            </div>

            {/* Priority & Duration */}
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select 
                className="form-control"
                value={assignForm.priority}
                onChange={(e) => setAssignForm(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Duration</label>
              <input 
                type="text" 
                className="form-control mono"
                value={assignForm.duration}
                onChange={(e) => setAssignForm(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g. 2h 30m"
              />
            </div>

            {/* Notes */}
            <div className="form-group full-width">
              <label className="form-label">Technical Instructions & Tolerance Notes</label>
              <textarea 
                className="form-control"
                rows="2"
                value={assignForm.notes}
                onChange={(e) => setAssignForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Air gauge verification, runout limits, tool setup details..."
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
