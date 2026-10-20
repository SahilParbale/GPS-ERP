// GPS Spindle ERP — Clean Workforce Data Layer (Zero Seed Data)

export const INITIAL_WORKFORCE_KPIS = [
  { id: "total_employees", label: "Total Employees", value: "0", trend: "Clean Slate", isUp: true, icon: "Users" },
  { id: "working_now", label: "Working Now", value: "0", trend: "0 active on floor", isUp: true, icon: "Cpu" },
  { id: "on_break", label: "On Break", value: "0", trend: "None", isUp: true, icon: "Clock" },
  { id: "available", label: "Available", value: "0", trend: "None", isUp: true, icon: "CheckCircle2" },
  { id: "tasks_today", label: "Tasks Today", value: "0", trend: "0 tasks", isUp: true, icon: "CheckSquare" },
  { id: "completed_today", label: "Completed Today", value: "0", trend: "0% completion", isUp: true, icon: "CheckCircle2" },
  { id: "total_work_hours", label: "Total Work Hours", value: "0h 00m", trend: "0h avg", isUp: true, icon: "Clock" },
  { id: "overdue_tasks", label: "Overdue Tasks", value: "0", trend: "All clear", alert: false, isUp: true, icon: "AlertTriangle" }
];

export const INITIAL_WORKFORCE_STAFF = [];
export const INITIAL_WORK_LOGS = [];
export const INITIAL_ACTIVITY_FEED = [];

export const INITIAL_DEPARTMENTS_WORKLOAD = [
  { department: "Production", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Assembly", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Quality", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Testing", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Balancing", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Service", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Stores", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Engineering", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" }
];

export const INITIAL_BAY_ALLOCATIONS = [];
export const INITIAL_WORKFORCE_ALERTS = [];

export const INITIAL_SHIFT_SUMMARY = {
  shiftName: "First Shift",
  timing: "06:00 AM - 02:30 PM",
  staffScheduled: 0,
  staffPresent: 0,
  staffWorking: 0,
  staffOnBreak: 0,
  staffAvailable: 0,
  completedTasks: 0,
  tasksInProgress: 0,
  hoursLogged: "0h",
  overtimeHours: "0h",
  delayedTasks: 0,
  progressPercentage: 0,
  supervisor: "Rameshwar Kulkarni (Plant Lead)",
  openTasks: 0
};
