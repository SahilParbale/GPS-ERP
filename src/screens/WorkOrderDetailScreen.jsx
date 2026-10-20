import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Tabs from '../components/common/Tabs';
import { workOrderService } from '../services/database/workOrderService';
import { spindleModelService } from '../services/database/spindleModelService';
import { workforceService } from '../services/database/workforceService';
import { DetailScreenSkeleton } from '../components/common/Skeleton';
import { exportJobTravelerPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import Modal from '../components/common/Modal';
import {
  ArrowLeft, FileText, CheckCircle, Clock, ShieldCheck,
  User, Printer, Check, Download, AlertCircle, Wrench,
  Users, ArrowRight, RefreshCw, MessageSquare, Plus,
  Upload, Trash2, Eye, Paperclip, Building2, Sparkles, ExternalLink
} from 'lucide-react';

export const MANUFACTURING_PIPELINE_STAGES = [
  { id: 1, key: 'material', name: 'Material Prep & Billet Sawing', shortName: 'Material Prep', bay: 'Station 1 - Machining', machine: 'Bandsaw & Billet Furnace' },
  { id: 2, key: 'machining', name: 'CNC Rough & Finish Machining', shortName: 'CNC Machining', bay: 'Station 1 - Machining', machine: 'Okuma LB3000 Lathe' },
  { id: 3, key: 'grinding', name: 'Cylindrical & Journal Grinding', shortName: 'Precision Grinding', bay: 'Station 2 - Grinding', machine: 'Studer S33 Grinder' },
  { id: 4, key: 'assembly', name: 'Cleanroom Bearing Assembly', shortName: 'Cleanroom Assembly', bay: 'Station 3 - Assembly', machine: 'Cleanroom Class 1000' },
  { id: 5, key: 'balancing', name: 'Dynamic Balancing (G0.4)', shortName: 'Dynamic Balancing', bay: 'Station 4 - Balancing', machine: 'Schenck Balancing Rig' },
  { id: 6, key: 'testing', name: '4h Run-in & Thermal Audit', shortName: 'Run-in Testing', bay: 'Station 5 - Testing', machine: 'Run-in Test Bench 1' },
  { id: 7, key: 'qc', name: 'Final Metrology QC Sign-off', shortName: 'Final QC', bay: 'Station 6 - QC Metrology', machine: 'Zeiss CMM Metrology Lab' },
  { id: 8, key: 'dispatch', name: 'Protective Crate & Dispatch', shortName: 'Dispatch', bay: 'Station 7 - Dispatch', machine: 'Packaging & Dispatch Bay' }
];

export const PROD_STAGE_KEYS_ORDER = [
  'material',
  'machining',
  'grinding',
  'assembly',
  'balancing',
  'testing',
  'qc',
  'dispatch'
];

export const getNormalizedStageKey = (rawStage) => {
  if (!rawStage) return 'material';
  const s = String(rawStage).toLowerCase().trim();
  if (s.includes('material') || s.includes('sawing') || s.includes('bar stock')) return 'material';
  if (s.includes('machin') || s.includes('turning') || s.includes('boring')) return 'machining';
  if (s.includes('grind')) return 'grinding';
  if (s.includes('assembl') || s.includes('cleanroom')) return 'assembly';
  if (s.includes('balanc')) return 'balancing';
  if (s.includes('test') || s.includes('run-in')) return 'testing';
  if (s.includes('qc') || s.includes('metrology') || s.includes('inspect')) return 'qc';
  if (s.includes('dispatch') || s.includes('crate') || s.includes('ship')) return 'dispatch';
  return 'material';
};

// Verified plant workforce roster baseline (synced with Supabase employees table)
export const DEFAULT_SHOP_STAFF = [
  { id: 'GPS-EMP-101', employeeCode: 'GPS-EMP-101', name: 'Rahul Patil', role: 'Plant Head & Operations', department: 'Plant Management', designation: 'Plant Head', status: 'Working', avatarColor: '#7A1F3D', initials: 'RP', bay: 'Plant Operations HQ', machine: 'Central Command', skills: ['Production Planning', 'Operations', 'Metrology'] },
  { id: 'GPS-EMP-100', employeeCode: 'GPS-EMP-100', name: 'V. R. Kulkarni', role: 'Production Head & Director', department: 'Production Machining', designation: 'Production Director', status: 'Working', avatarColor: '#5a1329', initials: 'VK', bay: 'Station 1 - Machining', machine: 'Okuma LB3000 CNC Lathe', skills: ['Precision Machining', 'Spindle Design'] },
  { id: 'GPS-EMP-103', employeeCode: 'GPS-EMP-103', name: 'Suresh Sawant', role: 'Sr. Precision Machining Lead', department: 'Production Machining', designation: 'Precision Grinder Lead', status: 'Working', avatarColor: '#7A1F3D', initials: 'SS', bay: 'Station 2 - Grinding', machine: 'Studer S33 CNC Grinder', skills: ['Sub-Micron Grinding', 'Studer S33'] },
  { id: 'GPS-EMP-102', employeeCode: 'GPS-EMP-102', name: 'Milind Joshi', role: 'Quality Assurance Lead', department: 'Quality Assurance', designation: 'QC Lead', status: 'Working', avatarColor: '#7A1F3D', initials: 'MJ', bay: 'Station 6 - QC Metrology', machine: 'Zeiss CMM & Air Gauges', skills: ['Zeiss CMM', 'Air Gauging', 'ISO G0.4'] },
  { id: 'GPS-EMP-104', employeeCode: 'GPS-EMP-104', name: 'Vikram Shinde', role: 'Cleanroom Assembly Technician', department: 'Cleanroom Assembly', designation: 'Assembly Specialist', status: 'Working', avatarColor: '#7A1F3D', initials: 'VS', bay: 'Station 3 - Assembly', machine: 'Bearing Induction Heater', skills: ['Bearing Induction', 'Cleanroom ISO Class 6'] },
  { id: 'GPS-EMP-108', employeeCode: 'GPS-EMP-108', name: 'Pramod Jadhav', role: 'Sr. Spindle Service Engineer', department: 'Service & Spindle Repair', designation: 'Senior Engineer', status: 'Working', avatarColor: '#7A1F3D', initials: 'PJ', bay: 'Station 5 - Testing', machine: 'Run-in Test Bench 1', skills: ['Run-in Testing', 'Vibration FFT Analysis'] },
  { id: 'GPS-EMP-105', employeeCode: 'GPS-EMP-105', name: 'Dinesh More', role: 'Inventory & Stores Lead', department: 'Supply Chain & Stores', designation: 'Stores Lead', status: 'Available', avatarColor: '#7A1F3D', initials: 'DM', bay: 'Station 1 - Material Prep', machine: 'Bandsaw Unit', skills: ['BOM Allocation', 'Material Prep'] },
  { id: 'GPS-EMP-107', employeeCode: 'GPS-EMP-107', name: 'Anand Deshmukh', role: 'Dynamic Balancing Lead', department: 'Balancing & Testing', designation: 'Balancing Specialist', status: 'Working', avatarColor: '#7A1F3D', initials: 'AD', bay: 'Station 4 - Balancing', machine: 'Schenck Balancing Rig', skills: ['ISO 1940 G0.4', 'Dynamic Balancing'] }
];

export const generateStandardOperations = (wo) => {
  const currentStageKey = getNormalizedStageKey(wo?.currentStage);
  const currentStageIdx = PROD_STAGE_KEYS_ORDER.indexOf(currentStageKey);
  const activeIdx = currentStageIdx >= 0 ? currentStageIdx : 0;
  const leadOp = wo?.leadOperator || wo?.assignedOperator || wo?.assignedTo || 'D. Shinde';

  return MANUFACTURING_PIPELINE_STAGES.map((stage, idx) => {
    let status = 'Upcoming';
    let date = `Est. Day +${idx * 2 + 1}`;
    let operator = stage.id === 1 ? leadOp : (stage.id === 2 ? 'R. Patil' : (stage.id === 3 ? 'S. Sawant' : (stage.id === 4 ? 'V. Shinde' : (stage.id === 5 ? 'A. Kulkarni' : (stage.id === 6 ? 'R. Deshmukh' : (stage.id === 7 ? 'M. Joshi (QC)' : 'Dispatch Team'))))));

    if (idx < activeIdx) {
      status = 'Completed';
      date = 'Passed';
    } else if (idx === activeIdx) {
      status = 'In Progress';
      date = 'Active Station';
      operator = leadOp;
    }

    return {
      id: stage.id,
      sequenceNo: stage.id,
      name: stage.name,
      machine: stage.machine,
      bay: stage.bay,
      operator: operator,
      status: status,
      date: date,
      qcSignOff: idx < activeIdx
    };
  });
};

export const generateStandardBom = (wo) => {
  const model = String(wo?.spindleModel || 'HSK-A63');
  const isBT50 = model.includes('BT50');
  const isBT40 = model.includes('BT40');
  const is60K = model.includes('60K');

  return [
    {
      id: 'BOM-01',
      partNo: is60K ? 'BRG-7004-HC-P2' : (isBT50 ? 'BRG-7014-HC-P4' : 'BRG-7008-HC-P4'),
      name: 'Angular Contact Ceramic Hybrid Bearing Set (Tandem Matched Pair)',
      supplier: 'GMN Germany / SKF Precision',
      batch: `LOT-${new Date().getFullYear()}-B81`,
      tolerance: '0.4 µm',
      status: 'Fitted'
    },
    {
      id: 'BOM-02',
      partNo: isBT50 ? 'SFT-50CRMO4-HD' : 'SFT-42CRMO4-GR',
      name: 'Precision Case-Hardened & Cryogenic Ground Spindle Shaft',
      supplier: 'GPS In-House Machining Bay',
      batch: 'HEAT-9942',
      tolerance: '0.5 µm',
      status: 'Fitted'
    },
    {
      id: 'BOM-03',
      partNo: isBT50 ? 'COL-BT50-OTT' : (isBT40 ? 'COL-BT40-OTT' : 'COL-HSK63-OTT'),
      name: `Automatic Tool Clamping Collet & Drawbar Mechanism (${isBT50 ? 'BT50' : (isBT40 ? 'BT40' : 'HSK-A63')})`,
      supplier: 'OTT-Jakob Germany / Römheld',
      batch: 'OTT-8831',
      tolerance: '1.0 µm',
      status: 'Fitted'
    },
    {
      id: 'BOM-04',
      partNo: is60K ? 'MOT-HF-5.5KW' : (isBT50 ? 'MOT-SYN-22KW' : 'MOT-SYN-15KW'),
      name: `High Frequency Synchronous Stator-Rotor Core (${is60K ? '5.5 kW' : (isBT50 ? '22 kW' : '15 kW')})`,
      supplier: 'Siemens / Kessler OEM',
      batch: 'MOT-4401',
      tolerance: 'Class H',
      status: 'Fitted'
    },
    {
      id: 'BOM-05',
      partNo: isBT50 ? 'SEAL-LAB-BT50' : 'SEAL-LAB-A63',
      name: 'Front Air Purge Non-Contact Labyrinth Sealing Ring',
      supplier: 'GPS Precision Shop',
      batch: `SEAL-${new Date().getFullYear()}`,
      tolerance: '0.8 µm',
      status: 'Fitted'
    }
  ];
};

export const generateDefaultDocs = (wo) => [
  {
    id: `doc-cad-${wo?.id || 'wo'}`,
    name: `Approved CAD Manufacturing Drawing DWG-${wo?.spindleModel || 'HSK-A63'}-REV4.pdf`,
    type: 'CAD Drawing',
    size: '4.8 MB',
    date: '15-Feb-2026',
    author: 'Engineering Design Team',
    status: 'Approved',
    isOfficialTraveler: false
  },
  {
    id: `doc-traveler-${wo?.id || 'wo'}`,
    name: `Official Shop Floor Manufacturing Traveler (${wo?.id || 'WO-2026-105'}).pdf`,
    type: 'Job Traveler',
    size: '1.4 MB',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    author: 'Production Control Desk',
    status: 'Live',
    isOfficialTraveler: true
  },
  {
    id: `doc-heat-${wo?.id || 'wo'}`,
    name: `Heat Treatment Hardness & Microstructure Report (${wo?.spindleSerial || 'SN-54355'}).pdf`,
    type: 'Metallurgical QC',
    size: '1.2 MB',
    date: '24-Feb-2026',
    author: 'Heat Tech Pune QA',
    status: 'Verified',
    isOfficialTraveler: false
  },
  {
    id: `doc-gauge-${wo?.id || 'wo'}`,
    name: `Studer In-Process Air Gauge Dial Inspection Sheet (${wo?.spindleSerial || 'SN-54355'}).pdf`,
    type: 'Metrology QC',
    size: '840 KB',
    date: '26-Feb-2026',
    author: 'Studer S33 Cell Lead',
    status: 'In-Process',
    isOfficialTraveler: false
  }
];

export default function WorkOrderDetailScreen({ workOrder, onNavigate, onNotify }) {
  const [woData, setWoData] = useState(workOrder || null);
  const [operations, setOperations] = useState([]);
  const [bom, setBom] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [allStaff, setAllStaff] = useState(DEFAULT_SHOP_STAFF);
  const [isLoading, setIsLoading] = useState(!workOrder);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('operations');
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Workforce Integration State
  const [assignedWorker, setAssignedWorker] = useState(null);
  const [orderWorkLogs, setOrderWorkLogs] = useState([]);

  // Operation Sign-off & Technician Note Modal State
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [selectedOpForSignOff, setSelectedOpForSignOff] = useState(null);
  const [signOffNoteText, setSignOffNoteText] = useState('');
  const [signOffOperator, setSignOffOperator] = useState('');

  // General Shop Floor Handover Note Modal State
  const [isGeneralNoteModalOpen, setIsGeneralNoteModalOpen] = useState(false);
  const [generalNoteText, setGeneralNoteText] = useState('');
  const [generalNoteAuthor, setGeneralNoteAuthor] = useState('');

  // Engineering Document Upload Modal State
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('CAD Manufacturing Drawing');
  const [newDocFile, setNewDocFile] = useState(null);
  const [newDocNotes, setNewDocNotes] = useState('');

  // BOM Component Modal State
  const [isAddBomModalOpen, setIsAddBomModalOpen] = useState(false);
  const [newBomPartNo, setNewBomPartNo] = useState('');
  const [newBomName, setNewBomName] = useState('');
  const [newBomSupplier, setNewBomSupplier] = useState('');
  const [newBomBatch, setNewBomBatch] = useState('');
  const [newBomTolerance, setNewBomTolerance] = useState('');

  // Cross-page deep linking helper to Workforce
  const handleNavigateToWorkforce = (action = 'assign') => {
    if (typeof window !== 'undefined' && woData) {
      localStorage.setItem('gps_active_workforce_job_id', woData.id || woData.workOrderNo);
      localStorage.setItem('gps_workforce_action', action);
    }
    if (onNavigate) onNavigate('workforce');
  };

  // Handle Reassigning Lead Operator
  const handleAssignStaffAsLead = (staffMember) => {
    if (!staffMember || !woData) return;
    const updatedLead = {
      ...staffMember,
      workOrder: woData.id,
      bay: woData.currentOperation || staffMember.bay || 'Station 1 - Machining',
      machine: woData.machine || staffMember.machine || 'Saw & Pit Furnace / Okuma CNC',
      status: 'Working'
    };
    setAssignedWorker(updatedLead);

    const updatedWo = {
      ...woData,
      leadOperator: staffMember.name,
      assignedOperator: `${staffMember.name} (${staffMember.role || staffMember.designation || 'Specialist'})`,
      assignedTo: staffMember.name
    };
    setWoData(updatedWo);

    try {
      const stored = localStorage.getItem('gps_local_work_orders');
      if (stored) {
        const wos = JSON.parse(stored);
        const nextWos = wos.map(w => (w.id === updatedWo.id || w.dbId === updatedWo.id) ? updatedWo : w);
        localStorage.setItem('gps_local_work_orders', JSON.stringify(nextWos));
      }

      const localStaff = JSON.parse(localStorage.getItem('gps_local_workforce_staff') || '[]');
      const staffIdx = localStaff.findIndex(s => s.id === staffMember.id || s.name === staffMember.name);
      if (staffIdx >= 0) {
        localStaff[staffIdx] = { ...localStaff[staffIdx], workOrder: updatedWo.id, status: 'Working' };
      } else {
        localStaff.push({ ...staffMember, workOrder: updatedWo.id, status: 'Working' });
      }
      localStorage.setItem('gps_local_workforce_staff', JSON.stringify(localStaff));
    } catch (e) {
      console.warn('Error persisting lead reassignment:', e);
    }

    if (onNotify) onNotify(`${staffMember.name} assigned as Active Lead for ${updatedWo.id}`);
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'workforce' } }));
  };

  // Handle Engineering Document Download
  const handleDownloadDoc = (doc) => {
    if (doc.isOfficialTraveler) {
      handleDirectDownloadPdf(woData);
      return;
    }
    const content = `GPS PRECISION METROLOGY & ENGINEERING DOCUMENT\n==================================================\nDOCUMENT: ${doc.name}\nCATEGORY: ${doc.type || 'Engineering CAD / QA Report'}\nWORK ORDER: ${woData?.id || 'WO-2026-105'}\nSPINDLE MODEL: ${woData?.spindleModel || 'HSK-A63'}\nSPINDLE SERIAL: ${woData?.spindleSerial || 'SN-54355'}\nCUSTOMER: ${woData?.customer || 'Client'}\nAUTHOR / CELL: ${doc.author || 'GPS Engineering Desk'}\nREVISION: REV-04\nDATE: ${doc.date || new Date().toLocaleDateString()}\nSTATUS: ${doc.status || 'Approved & Verified'}\n\nTOLERANCES & QUALITY SPECS:\n- Nose Taper Runout Limit: ${woData?.specifications?.taperRunoutLimit || '≤ 0.0010 mm'} (Air Gauge Calibrated)\n- Max Speed: ${woData?.specifications?.maxSpeed || '24,000 RPM'}\n- Clamping Drawbar Force: ${woData?.specifications?.drawbarForce || '18.0 kN'}\n- Dynamic Balancing: ISO 1940 Grade G0.4 Verified\n\nNOTES & REMARKS:\n${doc.notes || 'Engineering CAD Drawing & Metrology Report verified for shop floor precision production execution.'}\n\n==================================================\nGeneral Precision Spindles (GPS) • Nanded City Industrial Area, Pune 411041\nOfficial Shop Floor Engineering Record • Confidential\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name.endsWith('.pdf') ? doc.name.replace('.pdf', '.txt') : `${doc.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onNotify) onNotify(`Downloaded: ${doc.name}`);
  };

  // Handle Delete Document
  const handleDeleteDoc = (docId) => {
    const updated = documents.filter(d => d.id !== docId);
    setDocuments(updated);
    if (woData?.id) {
      try {
        localStorage.setItem(`gps_wo_docs_${woData.id}`, JSON.stringify(updated));
      } catch (e) {}
    }
    if (onNotify) onNotify('Engineering document removed.');
  };

  // Handle Save New Document
  const handleSaveNewDoc = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDocTitle.trim()) {
      if (onNotify) onNotify('Please enter a document title or drawing name.', 'warning');
      return;
    }
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: newDocTitle.trim().endsWith('.pdf') || newDocTitle.trim().endsWith('.dwg') ? newDocTitle.trim() : `${newDocTitle.trim()}.pdf`,
      type: newDocCategory,
      size: newDocFile ? `${(newDocFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      author: 'Shop Floor Specialist',
      status: 'Approved',
      notes: newDocNotes.trim(),
      isOfficialTraveler: false
    };
    const nextDocs = [newDoc, ...documents];
    setDocuments(nextDocs);
    if (woData?.id) {
      try {
        localStorage.setItem(`gps_wo_docs_${woData.id}`, JSON.stringify(nextDocs));
      } catch (e) {}
    }
    setIsUploadDocModalOpen(false);
    setNewDocTitle('');
    setNewDocNotes('');
    setNewDocFile(null);
    if (onNotify) onNotify(`Attached document: ${newDoc.name}`);
  };

  // Handle Save New BOM Component
  const handleSaveNewBom = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newBomPartNo.trim() || !newBomName.trim()) {
      if (onNotify) onNotify('Please enter component part number and description.', 'warning');
      return;
    }
    const newComponent = {
      id: `BOM-${Date.now()}`,
      partNo: newBomPartNo.trim().toUpperCase(),
      name: newBomName.trim(),
      supplier: newBomSupplier.trim() || 'GPS Certified Supplier',
      batch: newBomBatch.trim() || `LOT-${new Date().getFullYear()}`,
      tolerance: newBomTolerance.trim() || '0.5 µm',
      status: 'Fitted'
    };
    const nextBom = [...bom, newComponent];
    setBom(nextBom);
    if (woData?.id) {
      try {
        localStorage.setItem(`gps_wo_bom_${woData.id}`, JSON.stringify(nextBom));
      } catch (e) {}
    }
    setIsAddBomModalOpen(false);
    setNewBomPartNo('');
    setNewBomName('');
    setNewBomSupplier('');
    setNewBomBatch('');
    setNewBomTolerance('');
    if (onNotify) onNotify(`Component ${newComponent.partNo} added to BOM.`);
  };

  // Handle Delete BOM Component
  const handleDeleteBom = (partNo) => {
    const nextBom = bom.filter(b => b.partNo !== partNo);
    setBom(nextBom);
    if (woData?.id) {
      try {
        localStorage.setItem(`gps_wo_bom_${woData.id}`, JSON.stringify(nextBom));
      } catch (e) {}
    }
    if (onNotify) onNotify(`Removed ${partNo} from BOM.`);
  };

  const loadWorkOrderDetail = useCallback(async () => {
    let currentWo = workOrder;

    // Check local storage for the latest version of this work order (updated by Workforce)
    let localWos = [];
    try {
      localWos = JSON.parse(localStorage.getItem('gps_local_work_orders') || '[]');
    } catch (e) { }

    if (currentWo) {
      const match = localWos.find(w => w.id === currentWo.id || w.workOrderNo === currentWo.id || (currentWo.workOrderNo && w.workOrderNo === currentWo.workOrderNo));
      if (match) currentWo = { ...currentWo, ...match };
    }

    // If no workOrder provided via prop, fetch the first active one from local or live DB
    if (!currentWo) {
      if (localWos.length > 0) {
        currentWo = localWos[0];
        setWoData(currentWo);
      } else {
        setIsLoading(true);
        try {
          const allRes = await workOrderService.getWorkOrders({ limit: 1 });
          if (allRes.data?.[0]) {
            currentWo = allRes.data[0];
            setWoData(currentWo);
          }
        } catch (err) {
          console.warn('[WorkOrderDetailScreen] Failed to fetch initial work order:', err);
        }
      }
    }

    if (!currentWo) {
      setError({ message: 'No work orders found in database' });
      setIsLoading(false);
      return;
    }

    setError(null);

    // Sync live staff from workforceService joined with localStorage staff
    try {
      const staffRes = await workforceService.getStaffList().catch(() => ({ data: [] }));
      const liveStaff = staffRes?.data || [];
      const localStaff = JSON.parse(localStorage.getItem('gps_local_workforce_staff') || '[]');

      // Merge live staff, local workforce, and baseline certified staff
      const mergedStaffMap = new Map();
      DEFAULT_SHOP_STAFF.forEach(s => mergedStaffMap.set(s.name.toLowerCase(), s));
      liveStaff.forEach(s => mergedStaffMap.set(s.name.toLowerCase(), { ...mergedStaffMap.get(s.name.toLowerCase()), ...s }));
      localStaff.forEach(s => mergedStaffMap.set(s.name.toLowerCase(), { ...mergedStaffMap.get(s.name.toLowerCase()), ...s }));

      const mergedStaffList = Array.from(mergedStaffMap.values());

      const opName = currentWo.leadOperator || currentWo.assignedTo || currentWo.assignedOperator;
      const cleanOpName = opName ? opName.replace(/\s*\(.*\)/, '').trim() : '';

      let targetWorker = mergedStaffList.find(s =>
        s.workOrder === currentWo.id ||
        s.workOrder === currentWo.workOrderNo ||
        (cleanOpName && s.name && s.name.toLowerCase().includes(cleanOpName.toLowerCase()))
      );

      if (!targetWorker && cleanOpName) {
        targetWorker = {
          id: 'STAFF-LEAD',
          name: cleanOpName,
          role: opName.includes('(') ? opName.match(/\((.*?)\)/)?.[1] : 'Lead Specialist',
          department: 'Production Machining',
          designation: 'Workforce Lead',
          bay: currentWo.currentOperation || 'Station 1 - Machining',
          machine: currentWo.machine || 'Saw & Pit Furnace / Okuma CNC',
          status: 'Working',
          started: '08:30 AM',
          duration: '2h 15m',
          avatarColor: '#7A1F3D',
          initials: cleanOpName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DS'
        };
        mergedStaffList.unshift(targetWorker);
      }

      setAssignedWorker(targetWorker || null);
      setAllStaff(mergedStaffList);

      const localLogs = JSON.parse(localStorage.getItem('gps_local_work_logs') || '[]');
      const matchedLogs = localLogs.filter(l => l.workOrder === currentWo.id || l.workOrder === currentWo.workOrderNo);
      setOrderWorkLogs(matchedLogs);
    } catch (e) {
      console.warn('Error reading workforce staff in detail screen:', e);
      setAllStaff(DEFAULT_SHOP_STAFF);
    }

    // Fetch full details, operations, BOM, and documents gracefully
    const woId = currentWo.dbId || currentWo.id;
    try {
      const [detailRes, itemsRes, bomRes] = await Promise.allSettled([
        workOrderService.getWorkOrderById(woId),
        workOrderService.getWorkOrderItems(woId),
        spindleModelService.getSpindleComponents(currentWo.spindleSerial || 'GPS-2026-0842')
      ]);

      const detailData = detailRes.status === 'fulfilled' ? detailRes.value?.data : null;
      const itemsData = itemsRes.status === 'fulfilled' ? itemsRes.value?.data : null;
      const bomData = bomRes.status === 'fulfilled' ? bomRes.value?.data : null;

      const merged = detailData ? { ...currentWo, ...detailData } : currentWo;
      setWoData(merged);

      // 1. Resolve Operations: DB items -> passed operations -> localStorage -> generated pipeline
      let resolvedOps = [];
      if (itemsData && itemsData.length > 0) {
        resolvedOps = itemsData;
      } else if (currentWo.operations && currentWo.operations.length > 0) {
        resolvedOps = currentWo.operations;
      } else {
        try {
          const savedOps = JSON.parse(localStorage.getItem(`gps_wo_operations_${currentWo.id}`) || '[]');
          if (savedOps && savedOps.length > 0) resolvedOps = savedOps;
        } catch (e) {}
      }

      if (!resolvedOps || resolvedOps.length === 0) {
        resolvedOps = generateStandardOperations(merged);
      }
      setOperations(resolvedOps);

      // 2. Resolve BOM: DB -> localStorage -> generated model BOM
      let resolvedBom = [];
      try {
        const savedBom = JSON.parse(localStorage.getItem(`gps_wo_bom_${currentWo.id}`) || '[]');
        if (savedBom && savedBom.length > 0) resolvedBom = savedBom;
      } catch (e) {}

      if (resolvedBom.length === 0) {
        if (bomData && bomData.length > 0) {
          resolvedBom = bomData;
        } else {
          resolvedBom = generateStandardBom(merged);
        }
      }
      setBom(resolvedBom);

      // 3. Resolve Documents: localStorage -> generated standard engineering docs
      try {
        const savedDocs = JSON.parse(localStorage.getItem(`gps_wo_docs_${currentWo.id}`) || '[]');
        if (savedDocs && savedDocs.length > 0) {
          setDocuments(savedDocs);
        } else {
          const initialDocs = generateDefaultDocs(merged);
          setDocuments(initialDocs);
          localStorage.setItem(`gps_wo_docs_${currentWo.id}`, JSON.stringify(initialDocs));
        }
      } catch (e) {
        setDocuments(generateDefaultDocs(merged));
      }
    } catch (err) {
      console.warn('[WorkOrderDetailScreen] Error loading details:', err);
      setWoData(currentWo);
      const fallbackOps = generateStandardOperations(currentWo);
      setOperations(fallbackOps);
      setBom(generateStandardBom(currentWo));
      setDocuments(generateDefaultDocs(currentWo));
    } finally {
      setIsLoading(false);
    }
  }, [workOrder]);

  useEffect(() => {
    loadWorkOrderDetail();

    // Live sync when workforce or production updates this job
    const handleSync = (e) => {
      const entity = e?.detail?.entity;
      if (!entity || entity === 'workforce' || entity === 'production' || entity === 'work-orders') {
        loadWorkOrderDetail();
      }
    };
    window.addEventListener('gps_entities_updated', handleSync);
    return () => window.removeEventListener('gps_entities_updated', handleSync);
  }, [loadWorkOrderDetail]);

  // Open Sign-off Modal with Notes for a specific operation or current active op
  const handleOpenSignOff = (targetOp = null) => {
    const opToSign = targetOp || operations.find(o => o.status === 'In Progress') || operations.find(o => o.status !== 'Completed');
    if (!opToSign) {
      if (onNotify) onNotify('All operations for this work order are already signed off.');
      return;
    }
    setSelectedOpForSignOff(opToSign);
    setSignOffOperator(opToSign.operator || woData?.assignedOperator?.replace(/\s*\(.*\)/, '').trim() || 'V. Shinde');
    setSignOffNoteText(opToSign.notes || '');
    setIsSignOffModalOpen(true);
  };

  // Confirm signoff with technician remarks & inspection notes
  const handleConfirmSignOff = async () => {
    if (!selectedOpForSignOff) return;
    const opToSign = selectedOpForSignOff;
    const noteText = signOffNoteText.trim();
    const operatorName = signOffOperator.trim() || 'Technician Lead';
    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIsSigningOff(true);

    const targetIndex = operations.findIndex(
      o => (o.dbId && o.dbId === opToSign.dbId) || (o.id && o.id === opToSign.id) || o.name === opToSign.name
    );

    if (targetIndex === -1) {
      setIsSigningOff(false);
      setIsSignOffModalOpen(false);
      return;
    }

    let nextActiveOpName = null;
    const updatedOperations = operations.map((op, idx) => {
      if (idx === targetIndex) {
        return {
          ...op,
          status: 'Completed',
          qcSignOff: true,
          date: 'Signed off today',
          operator: operatorName,
          notes: noteText || op.notes
        };
      }
      if (idx === targetIndex + 1 && op.status !== 'Completed') {
        nextActiveOpName = op.name;
        return {
          ...op,
          status: 'In Progress',
          date: 'Active Cell'
        };
      }
      return op;
    });

    setOperations(updatedOperations);

    const newCompletedCount = updatedOperations.filter(o => o.status === 'Completed').length;
    const newProgress = Math.round((newCompletedCount / updatedOperations.length) * 100);
    const newStage = nextActiveOpName || (newProgress === 100 ? 'Final QC Passed' : woData?.currentStage || 'Assembly');
    const newStatus = newProgress === 100 ? 'Completed' : 'In Progress';

    const newNoteEntry = noteText ? {
      id: `note-${Date.now()}`,
      stageKey: `OP-${(targetIndex + 1) * 10}`,
      stageName: opToSign.name,
      author: operatorName,
      text: noteText,
      timestamp: timestampStr
    } : null;

    const existingHistory = Array.isArray(woData?.notesHistory) ? woData.notesHistory : [];
    const updatedHistory = newNoteEntry ? [newNoteEntry, ...existingHistory] : existingHistory;

    const updatedWo = {
      ...woData,
      progress: newProgress,
      progress_percentage: newProgress,
      currentStage: newStage,
      status: newStatus,
      assignedOperator: operatorName,
      ...(noteText ? {
        notes: noteText,
        technicianNotes: noteText,
        lastNoteBy: operatorName,
        lastNoteAt: timestampStr,
        notesHistory: updatedHistory
      } : {
        notesHistory: updatedHistory
      })
    };

    setWoData(updatedWo);

    // Save to local storage
    try {
      if (updatedWo.id) {
        localStorage.setItem(`gps_wo_operations_${updatedWo.id}`, JSON.stringify(updatedOperations));
      }
      const stored = localStorage.getItem('gps_local_work_orders');
      if (stored) {
        const wos = JSON.parse(stored);
        const nextWos = wos.map(w => (w.id === updatedWo.id || w.dbId === updatedWo.id) ? { ...updatedWo, operations: updatedOperations } : w);
        localStorage.setItem('gps_local_work_orders', JSON.stringify(nextWos));
      }
    } catch (e) {
      console.warn('Could not persist to local storage:', e);
    }

    // Live DB update
    try {
      if (opToSign.dbId) {
        await workOrderService.advanceWorkOrderItem(opToSign.dbId, 'Completed');
      }
      const nextOp = updatedOperations[targetIndex + 1];
      if (nextOp && nextOp.dbId) {
        await workOrderService.advanceWorkOrderItem(nextOp.dbId, 'In Progress');
      }
      const woDbId = woData?.dbId || workOrder?.dbId;
      if (woDbId) {
        await workOrderService.updateWorkOrderStatus(woDbId, newStatus, newProgress);
      }
    } catch (err) {
      console.warn('[WorkOrderDetailScreen] Background sync error:', err);
    } finally {
      setIsSigningOff(false);
      setIsSignOffModalOpen(false);
    }

    // Trigger cross-tab event
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));

    if (onNotify) {
      onNotify(
        newProgress === 100
          ? `Work Order ${woData?.id || ''} fully completed & signed off with technician note!`
          : `Stage OP-${(targetIndex + 1) * 10} signed off by ${operatorName}. Technician note saved.`
      );
    }
  };

  // Open general note modal
  const handleOpenGeneralNoteModal = () => {
    setGeneralNoteAuthor(woData?.assignedOperator?.replace(/\s*\(.*\)/, '').trim() || 'V. Shinde');
    setGeneralNoteText('');
    setIsGeneralNoteModalOpen(true);
  };

  // Save standalone shop floor handover / observation note
  const handleSaveGeneralNote = () => {
    const text = generalNoteText.trim();
    if (!text) return;
    const author = generalNoteAuthor.trim() || 'Shop Floor Specialist';
    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newNoteEntry = {
      id: `note-${Date.now()}`,
      stageKey: woData?.currentStage || 'Manufacturing',
      stageName: woData?.currentStage || 'Shop Floor',
      author,
      text,
      timestamp: timestampStr
    };

    const existingHistory = Array.isArray(woData?.notesHistory) ? woData.notesHistory : [];
    const updatedHistory = [newNoteEntry, ...existingHistory];

    const updatedWo = {
      ...woData,
      notes: text,
      technicianNotes: text,
      lastNoteBy: author,
      lastNoteAt: timestampStr,
      notesHistory: updatedHistory
    };

    setWoData(updatedWo);

    try {
      const stored = localStorage.getItem('gps_local_work_orders');
      if (stored) {
        const wos = JSON.parse(stored);
        const nextWos = wos.map(w => (w.id === updatedWo.id || w.dbId === updatedWo.id) ? updatedWo : w);
        localStorage.setItem('gps_local_work_orders', JSON.stringify(nextWos));
      }
    } catch (e) {
      console.warn('Could not persist note:', e);
    }

    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));
    setIsGeneralNoteModalOpen(false);
    setGeneralNoteText('');
    if (onNotify) onNotify(`Technician note logged on ${woData?.id || 'work order'}.`);
  };

  // Backward-compatible shortcut to advance operation
  const handleAdvanceOperation = async (targetOp = null) => {
    handleOpenSignOff(targetOp);
  };

  // Direct PDF Download of Shop Floor Manufacturing Traveler
  const handleDirectDownloadPdf = (woToDownload) => {
    try {
      const target = woToDownload || woData;
      const doc = exportJobTravelerPdf(target, operations);
      if (doc && doc.save) {
        doc.save(`GPS_Manufacturing_Traveler_${target?.id || 'WO-2026'}.pdf`);
      }
      if (onNotify) onNotify(`Manufacturing Traveler PDF downloaded for ${target?.id || 'work order'}.`);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      if (onNotify) onNotify('Error generating Manufacturing Traveler PDF', 'error');
    }
  };

  // Advance Pipeline Stage sequentially (material -> machining -> ... -> dispatch)
  const handleAdvanceStage = async () => {
    if (!woData) return;
    try {
      const currentStageKey = getNormalizedStageKey(woData.currentStage);
      const currentIndex = PROD_STAGE_KEYS_ORDER.indexOf(currentStageKey);
      const nextIndex = currentIndex < PROD_STAGE_KEYS_ORDER.length - 1 ? currentIndex + 1 : PROD_STAGE_KEYS_ORDER.length - 1;
      const nextKey = PROD_STAGE_KEYS_ORDER[nextIndex];
      const nextStageObj = MANUFACTURING_PIPELINE_STAGES.find(s => s.key === nextKey) || MANUFACTURING_PIPELINE_STAGES[0];

      // Update operations to advance in sync
      const nextOps = operations.map((op, idx) => {
        if (idx < nextIndex) return { ...op, status: 'Completed', qcSignOff: true };
        if (idx === nextIndex) return { ...op, status: 'In Progress' };
        return { ...op, status: 'Upcoming', qcSignOff: false };
      });
      setOperations(nextOps);

      const completedCount = nextOps.filter(o => o.status === 'Completed').length;
      const newProgress = Math.round((completedCount / nextOps.length) * 100);

      const updatedWo = {
        ...woData,
        currentStage: nextStageObj.name,
        currentOperation: nextStageObj.name,
        progress: newProgress,
        progress_percentage: newProgress,
        status: nextKey === 'dispatch' ? 'Completed' : (nextKey === 'qc' ? 'QC Pending' : 'In Progress')
      };

      setWoData(updatedWo);

      // Persist to local storage
      try {
        const stored = localStorage.getItem('gps_local_work_orders');
        if (stored) {
          const wos = JSON.parse(stored);
          const nextWos = wos.map(w => (w.id === updatedWo.id || w.dbId === updatedWo.id) ? updatedWo : w);
          localStorage.setItem('gps_local_work_orders', JSON.stringify(nextWos));
        }
      } catch (e) {
        console.warn('Could not persist updated stage:', e);
      }

      // Background DB update
      if (woData.dbId) {
        try {
          await workOrderService.updateWorkOrderStatus(woData.dbId, updatedWo.status, newProgress);
        } catch (dbErr) {
          console.warn('Live DB update skipped:', dbErr);
        }
      }

      window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));

      if (onNotify) {
        onNotify(`Advanced ${woData.id} to ${nextStageObj.name} stage.`);
      }
    } catch (err) {
      console.error('Failed to advance manufacturing stage:', err);
      if (onNotify) onNotify(err.message || 'Failed to advance stage', 'error');
    }
  };

  // Jump/Transition Spindle to a specific manufacturing stage directly
  const handleTransitionToStage = async (targetStageKey) => {
    if (!woData) return;
    try {
      const targetStageObj = MANUFACTURING_PIPELINE_STAGES.find(s => s.key === targetStageKey);
      if (!targetStageObj) return;

      const targetIndex = PROD_STAGE_KEYS_ORDER.indexOf(targetStageKey);
      const nextOps = operations.map((op, idx) => {
        if (idx < targetIndex) return { ...op, status: 'Completed', qcSignOff: true };
        if (idx === targetIndex) return { ...op, status: 'In Progress' };
        return { ...op, status: 'Upcoming', qcSignOff: false };
      });
      setOperations(nextOps);

      const completedCount = nextOps.filter(o => o.status === 'Completed').length;
      const newProgress = Math.round((completedCount / nextOps.length) * 100);

      const updatedWo = {
        ...woData,
        currentStage: targetStageObj.name,
        currentOperation: targetStageObj.name,
        progress: newProgress,
        progress_percentage: newProgress,
        status: targetStageKey === 'dispatch' ? 'Completed' : (targetStageKey === 'qc' ? 'QC Pending' : 'In Progress')
      };

      setWoData(updatedWo);

      try {
        const stored = localStorage.getItem('gps_local_work_orders');
        if (stored) {
          const wos = JSON.parse(stored);
          const nextWos = wos.map(w => (w.id === updatedWo.id || w.dbId === updatedWo.id) ? updatedWo : w);
          localStorage.setItem('gps_local_work_orders', JSON.stringify(nextWos));
        }
      } catch (e) {
        console.warn('Could not persist stage transition:', e);
      }

      if (woData.dbId) {
        try {
          await workOrderService.updateWorkOrderStatus(woData.dbId, updatedWo.status, newProgress);
        } catch (dbErr) {
          console.warn('Live DB update skipped:', dbErr);
        }
      }

      window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));

      if (onNotify) {
        onNotify(`Moved ${woData.id} directly to ${targetStageObj.name}.`);
      }
    } catch (err) {
      console.error('Failed to transition stage:', err);
      if (onNotify) onNotify(err.message || 'Failed to set stage', 'error');
    }
  };

  // Loading State
  if (isLoading) {
    return <DetailScreenSkeleton />;
  }

  // Error State
  if (error || !woData) {
    return (
      <div className="content-area">
        <div className="page-header">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('production')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Production Board</span>
          </button>
        </div>
        <div className="content-body">
          <div className="section-card" style={{ padding: '32px 24px', borderLeft: '4px solid var(--danger, #dc2626)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Unable to Load Work Order Traveler
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {error?.sanitizedMessage || error?.message || 'The requested work order could not be retrieved from the live database.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={loadWorkOrderDetail}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} />
                  <span>Retry Traveler</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wo = woData;
  const completedCount = operations.filter(o => o.status === 'Completed').length;
  const totalCount = operations.length || 8;
  const computedProgress = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="content-area">
      {/* Docked Top Toolbar with Back Navigation & Action Bar */}
      <div className="page-header">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate('production')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Production Board</span>
        </button>

        <div className="page-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleDirectDownloadPdf(wo)}
            title="Direct download official shop floor manufacturing traveler (PDF)"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setPreviewDoc({
                ...wo,
                operations,
                type: 'Job Traveler',
                id: wo.id || wo.workOrderNumber || 'WO-2026-0842'
              });
              setIsPreviewOpen(true);
            }}
            title="Preview official shop floor manufacturing traveler (PDF)"
          >
            <FileText size={14} />
            <span>Preview Report</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenGeneralNoteModal}
            title="Add or update technician handover remarks or metrology notes"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={14} color="#7A1F3D" />
            <span>Technician Note</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenSignOff()}
            disabled={isSigningOff}
            title="Sign off active operation with precision QC tolerance signoff"
          >
            <CheckCircle size={14} />
            <span>Complete Operation Step</span>
          </button>
        </div>
      </div>

      <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Unified Manufacturing Case File Section Card */}
        <div className="section-card">
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="mono" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{wo.id}</h2>
                <StatusBadge status={wo.status} />
                <StatusBadge status={wo.priority} size="sm" />
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Serial: <strong className="mono">{wo.spindleSerial}</strong> ({wo.spindleModel || 'GPS-HSK-A63-24K'}) • Customer: <strong>{wo.customer}</strong> • Current Stage: <strong className="mono font-bold" style={{ color: 'var(--primary)' }}>{wo.currentStage || wo.currentOperation || 'Material Preparation'}</strong>
                {wo.workOrderNo && wo.workOrderNo !== wo.id && (
                  <> • Traveler No: <strong className="mono" style={{ color: '#7A1F3D' }}>{wo.workOrderNo}</strong></>
                )}
                {wo.dueDate && (
                  <> • Target Dispatch: <strong className="mono">{wo.dueDate}</strong></>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Progress</div>
                <div className="mono font-bold" style={{ fontSize: '16px', color: 'var(--primary)' }}>{computedProgress}%</div>
              </div>
              <div style={{ width: '120px' }}>
                <ProgressBar progress={computedProgress} />
              </div>
            </div>
          </div>

          {/* Assigned Lead Operator & Manufacturing Workforce Lead Banner */}
          {(() => {
            let localStaff = [];
            try { localStaff = JSON.parse(localStorage.getItem('gps_local_workforce_staff') || '[]'); } catch (e) { }
            const opName = wo.leadOperator || wo.assignedTo || wo.assignedOperator;
            const assignedTech = assignedWorker || (opName ? (
              localStaff.find(s => s.workOrder === wo.id || s.workOrder === wo.workOrderNo || (s.name && opName.toLowerCase().includes(s.name.toLowerCase()))) || {
                name: opName.replace(/\s*\(.*\)/, '').trim(),
                role: opName.includes('(') ? opName.match(/\((.*?)\)/)?.[1] : 'Lead Specialist',
                bay: wo.currentOperation || 'Station 1 - Machining',
                machine: wo.machine || 'Okuma LB3000 CNC Lathe',
                status: 'Working',
                started: '08:30 AM',
                initials: opName.split(' ').map(n => n[0]).join('').slice(0, 2)
              }
            ) : null);

            return (
              <div style={{
                margin: '16px 20px 0 20px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: assignedTech ? '#f8fafc' : '#fffbeb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: assignedTech ? (assignedTech.avatarColor || '#7A1F3D') : '#fef3c7',
                    color: assignedTech ? '#fff' : '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}>
                    {assignedTech ? (assignedTech.initials || (assignedTech.name ? assignedTech.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'GP')) : <User size={20} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 700 }}>
                        Assigned Lead Operator & Workforce Lead
                      </span>
                      {assignedTech && (
                        <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {assignedTech.status || 'Working'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {assignedTech ? assignedTech.name : <span style={{ color: '#d97706' }}>Unassigned · Manage in Staff & Workforce</span>}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>Workstation Bay: <strong className="mono">{assignedTech?.bay || wo.currentOperation || 'Station 1 - Machining'}</strong></span>
                      <span>Equipment: <strong className="mono">{assignedTech?.machine || wo.machine || 'Okuma LB3000 CNC Lathe'}</strong></span>
                      {assignedTech?.started && <span>Active Since: <strong className="mono">{assignedTech.started}</strong></span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontWeight: 600 }}
                    onClick={() => handleNavigateToWorkforce(assignedTech ? 'stage' : 'assign')}
                    title="Manage stage progression, staff assignment and metrology updates in Workforce"
                  >
                    <Users size={14} />
                    <span>{assignedTech ? 'Manage in Staff & Workforce →' : '+ Assign Staff in Workforce →'}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Manufacturing Pipeline Stage Tracker (Read-Only Flow Inspection) */}
          <div style={{ padding: '12px 20px', backgroundColor: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Manufacturing Flow:
            </span>
            {MANUFACTURING_PIPELINE_STAGES.map((s, idx) => {
              const currentKey = getNormalizedStageKey(wo.currentStage);
              const currentIndex = PROD_STAGE_KEYS_ORDER.indexOf(currentKey);
              const stageIndex = PROD_STAGE_KEYS_ORDER.indexOf(s.key);
              const isCurrent = stageIndex === currentIndex;
              const isPast = stageIndex < currentIndex;

              return (
                <div
                  key={s.key}
                  className="mono"
                  style={{
                    fontSize: '11px',
                    padding: '3px 9px',
                    height: '24px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isCurrent ? 'var(--primary)' : (isPast ? '#f0fdf4' : 'var(--bg-surface)'),
                    color: isCurrent ? '#ffffff' : (isPast ? '#16a34a' : 'var(--text-muted)'),
                    border: `1px solid ${isCurrent ? 'var(--primary)' : (isPast ? '#86efac' : 'var(--border-color)')}`,
                    fontWeight: isCurrent ? 700 : 500
                  }}
                  title={isCurrent ? `Active Stage: ${s.name}` : (isPast ? `Completed: ${s.name}` : `Pending: ${s.name}`)}
                >
                  {isPast ? <Check size={11} strokeWidth={3} /> : null}
                  <span>0{idx + 1} {s.shortName || s.name}</span>
                </div>
              );
            })}
          </div>

          {/* Precision Manufacturing & Metrology Tolerances Overview */}

        </div>

        {/* Sub-Tabs Section Below */}
        <Tabs
          tabs={[
            { id: 'operations', label: 'Manufacturing Operations & Routing', count: operations.length },
            { id: 'specs', label: 'Technical Specifications & Limits' },
            { id: 'bom', label: 'Bill of Materials (BOM)', count: bom.length },
            { id: 'team', label: 'Assigned Shop Technicians', count: (assignedWorker ? 1 : 0) + (allStaff.filter(s => s.id !== assignedWorker?.id && s.workOrder === wo.id).length) },
            { id: 'docs', label: 'Engineering Documents', count: documents.length },
          ]}
          activeTab={activeTab === 'notes' ? 'operations' : activeTab}
          onChange={setActiveTab}
          variant="enclosed"
        />

        {/* Tab 1: Operations Timeline & Routing */}
        {activeTab === 'operations' && (
          <div className="section-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Seq #</th>
                    <th>Manufacturing Operation Description</th>
                    <th>Machine / Workstation</th>
                    <th>Assigned Lead</th>
                    <th>Timestamp / Schedule</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, idx) => (
                    <tr key={op.id || idx} style={{ background: op.status === 'In Progress' ? '#f0f9ff' : 'transparent' }}>
                      <td className="mono" style={{ fontWeight: 600 }}>OP-{(idx + 1) * 10}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{op.name}</div>
                        {op.notes && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#7A1F3D', background: '#fdf2f4', border: '1px solid #f9d8e1', borderRadius: '4px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <MessageSquare size={10} />
                            <span>{op.notes}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '12px' }}>{op.machine}</td>
                      <td style={{ fontSize: '12px' }}>{op.operator}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{op.date}</td>
                      <td>
                        <StatusBadge status={op.status} />
                      </td>
                      <td>
                        {op.status === 'In Progress' ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenSignOff(op)}
                            disabled={isSigningOff}
                            style={{ minWidth: '82px', justifyContent: 'center', gap: '4px' }}
                            title="Sign off operation and add inspection note"
                          >
                            <Check size={13} />
                            <span>{isSigningOff ? 'Signing...' : 'Sign Off & Note'}</span>
                          </button>
                        ) : op.status === 'Completed' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <CheckCircle size={14} /> Passed
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenSignOff(op)}
                              title="Edit or add technician note for this stage"
                              style={{ padding: '2px 5px', height: '22px' }}
                            >
                              <MessageSquare size={12} color="#7A1F3D" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenSignOff(op)}
                            disabled={isSigningOff}
                            style={{ minWidth: '78px', justifyContent: 'center', fontSize: '11px', padding: '3px 8px' }}
                            title="Complete this operation stage with note"
                          >
                            Sign Off
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {operations.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No routing operations found for this work order traveler.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Specifications Matrix */}
        {activeTab === 'specs' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">Precision Manufacturing & Quality Acceptance Tolerances</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '20px' }}>
              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Maximum Operational Speed</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {wo.specifications?.maxSpeed || '24,000 RPM'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Continuous S1 rating at {wo.specifications?.ratedPower || '15 kW'}
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nose Taper Runout Tolerance</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                  {wo.specifications?.taperRunoutLimit || '≤ 0.0010 mm'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Sub-micron dynamic air gauge verification
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drawbar Clamping Force</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {wo.specifications?.drawbarForce || '18.0 kN ± 1.0'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Hydraulic pressure sensor calibrated
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dynamic Balancing Grade</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                  ISO 1940 Grade G0.4
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Dual-plane Schenck balance specification
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tool Clamping Interface</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {wo.specifications?.toolTaper || (wo.spindleModel?.includes('BT50') ? 'BT50' : (wo.spindleModel?.includes('BT40') ? 'BT40 Dual Contact' : 'HSK-A63 DIN 69893'))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Precision ground dual-face contact
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Continuous S1 Torque</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {wo.specifications?.torque || (wo.spindleModel?.includes('10K') ? '160 Nm' : '32 Nm')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Synchronous built-in motor stator drive
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bearing Arrangement</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#7A1F3D', marginTop: '4px' }}>
                  {wo.specifications?.bearingArrangement || 'Ceramic Hybrid Matched Pair'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ISO Class 6 Cleanroom fitted with ester grease
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Metrology Runout Achieved</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                  {wo.runoutMetric || '0.0008 mm'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Certified dial runout at nose gauge line
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Bill of Materials (BOM) */}
        {activeTab === 'bom' && (
          <div className="section-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>Bill of Materials & Component Fitment Schedule</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Precision sub-assemblies, bearing lots, and fitted micron tolerances for {wo.id} ({wo.spindleModel})
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddBomModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add Component</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Component Description</th>
                    <th>Sub-Supplier / Source</th>
                    <th>Lot / Serial Number</th>
                    <th>Fitted Tolerance</th>
                    <th>Status</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((item, idx) => (
                    <tr key={item.partNo || idx}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.partNo}</td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td style={{ fontSize: '12px' }}>{item.supplier || 'GPS Certified Supplier'}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{item.batch}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{item.tolerance || '0.8 µm'}</td>
                      <td>
                        <StatusBadge status="Completed" size="sm" />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteBom(item.partNo)}
                          title="Remove item"
                          style={{ padding: '2px 4px', color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bom.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No BOM components fitted to this spindle yet. Click "Add Component" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Assigned Technicians Team */}
        {activeTab === 'team' && (
          <div className="section-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>Shop Floor Production Specialists & Operators</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Real verified workforce deployments & station assignments for {wo.id}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleNavigateToWorkforce('assign')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Users size={14} />
                <span>Manage in Staff & Workforce →</span>
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Highlighted Active Lead Card */}
              {assignedWorker && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Active Lead Operator on this Work Order
                  </div>
                  <div style={{ padding: '16px 20px', border: '2px solid var(--primary)', borderRadius: 'var(--radius-md)', background: '#fdf2f4', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: assignedWorker.avatarColor || '#7A1F3D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
                        {assignedWorker.initials || (assignedWorker.name ? assignedWorker.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'GP')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>{assignedWorker.name}</span>
                          <span className="badge badge-primary mono" style={{ fontSize: '10px' }}>Active Lead</span>
                          <span className="badge badge-success" style={{ fontSize: '10px' }}>{assignedWorker.status || 'Working'}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {assignedWorker.role || assignedWorker.designation || 'Lead Specialist'} • {assignedWorker.department || 'Production Machining'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
                          Station: <span>{assignedWorker.bay || wo.currentOperation || 'Station 1 - Machining'}</span> • Machine: <span style={{ color: 'var(--text-secondary)' }}>{assignedWorker.machine || wo.machine || 'Saw & Pit Furnace'}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>Shift: 08:30 - 17:30</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleNavigateToWorkforce('shift')}
                      >
                        View Shift Log
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Plant Workforce Roster from Staff & Workforce */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    Available Certified Plant Workforce ({allStaff.length})
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Click "Set as Lead" to assign any specialist to this traveler
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {allStaff.map((member) => {
                    const isLead = (assignedWorker?.id && assignedWorker.id === member.id) || (assignedWorker?.name && assignedWorker.name.toLowerCase() === member.name.toLowerCase());

                    return (
                      <div
                        key={member.id || member.employeeCode || member.name}
                        style={{
                          padding: '14px 16px',
                          border: isLead ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          background: isLead ? '#fcf8f9' : '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: member.avatarColor || 'var(--primary-light)',
                              color: member.avatarColor ? '#fff' : 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              flexShrink: 0
                            }}
                          >
                            {member.initials || (member.name ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'GP')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {member.name}
                              </div>
                              <span className={`badge badge-${member.status === 'Working' ? 'success' : (member.status === 'Available' ? 'primary' : 'neutral')}`} style={{ fontSize: '10px' }}>
                                {member.status || 'Available'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {member.role || member.designation || 'Technician'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px', fontWeight: 500 }}>
                              {member.department || 'Production Machining'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Station: {member.bay || 'Machining Bay'} • {member.machine || 'Okuma Lathe'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {member.id || member.employeeCode || 'GPS-EMP'}
                          </span>
                          {isLead ? (
                            <span className="badge badge-primary mono" style={{ fontSize: '10px', padding: '3px 8px' }}>
                              ✓ Active Lead
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
                              onClick={() => handleAssignStaffAsLead(member)}
                            >
                              Set as Lead
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Documents */}
        {activeTab === 'docs' && (
          <div className="section-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>Engineering Drawings & Quality Inspection Documents</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Technical documentation, CAD schematics, and heat treatment certifications linked to {wo.id}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsUploadDocModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Attach Engineering Document</span>
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    background: '#fff',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fdf2f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 5px' }}>{doc.type}</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>Uploaded {doc.date}</span>
                        {doc.author && <span>by {doc.author}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {doc.isOfficialTraveler && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setPreviewDoc({
                            ...wo,
                            operations,
                            type: 'Job Traveler',
                            id: wo.id || wo.workOrderNumber || 'WO-2026-0842'
                          });
                          setIsPreviewOpen(true);
                        }}
                        title="Preview Traveler"
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownloadDoc(doc)}
                      title={`Download ${doc.name}`}
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                    {!doc.isOfficialTraveler && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteDoc(doc.id)}
                        title="Delete document"
                        style={{ color: 'var(--text-muted)', padding: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No engineering documents attached yet. Click "Attach Engineering Document" above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shop Floor Job Traveler Pop-up Preview Modal */}
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          doc={previewDoc}
          onNotify={onNotify}
        />

        {/* Operation Sign-off & Technician Note Modal */}
        {isSignOffModalOpen && selectedOpForSignOff && (
          <Modal
            isOpen={isSignOffModalOpen}
            onClose={() => setIsSignOffModalOpen(false)}
            title={`Operation Sign-off & Technician Note — ${selectedOpForSignOff.name}`}
            maxWidth="600px"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsSignOffModalOpen(false)}
                  style={{ flex: '1 1 auto', minWidth: '70px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmSignOff}
                  disabled={isSigningOff}
                  style={{ background: '#7A1F3D', borderColor: '#7A1F3D', flex: '1 1 auto', justifyContent: 'center' }}
                >
                  <Check size={14} />
                  {isSigningOff ? (
                    <span>Signing...</span>
                  ) : (
                    <>
                      <span className="desktop-only-inline">Complete & Sign Off Stage</span>
                      <span className="mobile-only-inline">Sign Off Stage</span>
                    </>
                  )}
                </button>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
                  <span className="mono">{wo.id}</span> · {wo.spindleModel} ({wo.spindleSerial})
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Machine: <strong>{selectedOpForSignOff.machine}</strong> • Workstation Status: <span className="badge badge-neutral mono" style={{ fontSize: '10.5px' }}>{selectedOpForSignOff.status}</span>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={13} color="#7A1F3D" />
                  <span>Operating Technician / QC Sign-off Lead</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={signOffOperator}
                  onChange={e => setSignOffOperator(e.target.value)}
                  placeholder="Operator name (e.g., V. Shinde, Studer S33 Cell Lead)"
                  style={{ fontSize: '12.5px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MessageSquare size={13} color="#7A1F3D" />
                  <span>Technician & Metrology Inspection Notes</span>
                </label>

                <textarea
                  className="form-control"
                  rows={3}
                  style={{ fontSize: '12px', lineHeight: '1.5' }}
                  value={signOffNoteText}
                  onChange={e => setSignOffNoteText(e.target.value)}
                  placeholder="Record measured journal diameters, nose runout limit, grinding tolerances, hardness readings, bearing preload, or handover remarks..."
                  autoFocus
                />

                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Quick Preset Chips:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {[
                      '✓ Dimensions verified within ±0.002 mm tolerance',
                      '✓ Hardness tested & verified (HRC 60-62)',
                      '✓ Shaft journal runout < 0.0008 mm certified',
                      '✓ Bearings hot-induction fitted in ISO Class 6 cell',
                      '✓ Balanced to ISO 1940 Grade G0.4 @ 24,000 RPM',
                      '✓ 4-Hour dynamic thermal run-in test passed',
                      '✓ Drawbar clamping force verified (18 kN)',
                      '✓ Metrology laser inspection accepted'
                    ].map((preset, pIdx) => (
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
                          setSignOffNoteText(prev => prev ? `${prev} • ${preset}` : preset);
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* General Shop Floor Handover Note Modal */}
        {isGeneralNoteModalOpen && (
          <Modal
            isOpen={isGeneralNoteModalOpen}
            onClose={() => setIsGeneralNoteModalOpen(false)}
            title={`Log Technician Handover Note — ${wo.id}`}
            maxWidth="560px"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsGeneralNoteModalOpen(false)}
                  style={{ flex: '1 1 auto', minWidth: '70px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveGeneralNote}
                  style={{ background: '#7A1F3D', borderColor: '#7A1F3D', flex: '1 1 auto', justifyContent: 'center' }}
                >
                  <Check size={14} />
                  <span>Save Note</span>
                </button>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={13} color="#7A1F3D" />
                  <span>Technician Name / Station</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={generalNoteAuthor}
                  onChange={e => setGeneralNoteAuthor(e.target.value)}
                  placeholder="Technician name..."
                  style={{ fontSize: '12.5px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MessageSquare size={13} color="#7A1F3D" />
                  <span>Technician Note / Observation</span>
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <textarea
                  className="form-control"
                  rows={4}
                  style={{ fontSize: '12px', lineHeight: '1.5' }}
                  value={generalNoteText}
                  onChange={e => setGeneralNoteText(e.target.value)}
                  placeholder="Log shop floor notes, machine calibration status, tooling wear observations, or shift handover remarks..."
                  autoFocus
                />

                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Quick Preset Chips:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {[
                      '✓ Shift handover: rough turning complete, staged for heat treat',
                      '✓ Bearing journals pre-ground; ready for finish pass',
                      '✓ Cleanroom assembly staged; waiting for dynamic rig',
                      '✓ Vibration spectrum FFT baseline verified within limits',
                      '⚠ Tool wear detected on Okuma LB3000 insert; replaced'
                    ].map((preset, pIdx) => (
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
                          setGeneralNoteText(prev => prev ? `${prev} • ${preset}` : preset);
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Upload Engineering Document Modal */}
        {isUploadDocModalOpen && (
          <Modal
            isOpen={isUploadDocModalOpen}
            onClose={() => setIsUploadDocModalOpen(false)}
            title={`Attach Engineering Document — ${wo.id}`}
            maxWidth="560px"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsUploadDocModalOpen(false)}
                  style={{ flex: '1 1 auto', minWidth: '70px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveNewDoc}
                  style={{ background: '#7A1F3D', borderColor: '#7A1F3D', flex: '1 1 auto', justifyContent: 'center' }}
                >
                  <Upload size={14} />
                  <span>Attach Document</span>
                </button>
              </div>
            }
          >
            <form onSubmit={handleSaveNewDoc} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Document / Drawing Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  placeholder={`e.g., Sub-Micron Journal Grinding Protocol DWG-${wo.spindleModel || 'HSK-A63'}`}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Document Category</label>
                  <select
                    className="form-control"
                    value={newDocCategory}
                    onChange={e => setNewDocCategory(e.target.value)}
                  >
                    <option value="CAD Manufacturing Drawing">CAD Manufacturing Drawing</option>
                    <option value="Metrology QC Inspection">Metrology QC Inspection</option>
                    <option value="Heat Treatment Certificate">Heat Treatment Certificate</option>
                    <option value="Mill Test Certificate">Mill Test Certificate (MTR)</option>
                    <option value="Customer Technical Specification">Customer Specification</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Attached File (PDF, DWG, IMG)</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setNewDocFile(e.target.files[0]);
                        if (!newDocTitle) setNewDocTitle(e.target.files[0].name);
                      }
                    }}
                    style={{ fontSize: '12px', padding: '6px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Technical Notes & Remarks</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={newDocNotes}
                  onChange={e => setNewDocNotes(e.target.value)}
                  placeholder="Engineering revision details, approval notes, or metrology verification tolerances..."
                />
              </div>
            </form>
          </Modal>
        )}

        {/* Add Component to BOM Modal */}
        {isAddBomModalOpen && (
          <Modal
            isOpen={isAddBomModalOpen}
            onClose={() => setIsAddBomModalOpen(false)}
            title={`Add BOM Component — ${wo.id}`}
            maxWidth="560px"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddBomModalOpen(false)}
                  style={{ flex: '1 1 auto', minWidth: '70px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveNewBom}
                  style={{ background: '#7A1F3D', borderColor: '#7A1F3D', flex: '1 1 auto', justifyContent: 'center' }}
                >
                  <Plus size={14} />
                  <span>Add to Schedule</span>
                </button>
              </div>
            }
          >
            <form onSubmit={handleSaveNewBom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Part Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control mono"
                    value={newBomPartNo}
                    onChange={e => setNewBomPartNo(e.target.value)}
                    placeholder="e.g., BRG-7010-HC-P4"
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Fitted Tolerance</label>
                  <input
                    type="text"
                    className="form-control mono"
                    value={newBomTolerance}
                    onChange={e => setNewBomTolerance(e.target.value)}
                    placeholder="e.g., 0.5 µm"
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Component Description <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newBomName}
                  onChange={e => setNewBomName(e.target.value)}
                  placeholder="e.g., Ceramic Hybrid Matched Preloaded Bearing Pair"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Sub-Supplier / Source</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newBomSupplier}
                    onChange={e => setNewBomSupplier(e.target.value)}
                    placeholder="e.g., SKF Precision / GMN Germany"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Lot / Batch / Serial</label>
                  <input
                    type="text"
                    className="form-control mono"
                    value={newBomBatch}
                    onChange={e => setNewBomBatch(e.target.value)}
                    placeholder="e.g., LOT-2026-X99"
                  />
                </div>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
