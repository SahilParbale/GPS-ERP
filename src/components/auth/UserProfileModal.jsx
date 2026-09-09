import React from 'react';
import { User, Mail, Phone, Building2, MapPin, Clock, Shield, Award, X } from 'lucide-react';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

export default function UserProfileModal({ isOpen, onClose }) {
  const { profile, employee, role, roleLabel } = useAuth();

  if (!isOpen) return null;

  const emp = employee || profile || {};
  const skills = emp.skills || ['Precision Assembly', 'Quality Standards', 'ERP Operations'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Digital Profile"
      maxWidth="560px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Profile Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            backgroundColor: '#FAF5F6',
            borderRadius: '12px',
            border: '1px solid #E8D5DA'
          }}
        >
          <div 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: emp.avatarColor || '#7A1F3D',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              boxShadow: '0 2px 6px rgba(122, 31, 61, 0.25)'
            }}
          >
            {(emp.name || 'User').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '700', color: '#4A1020' }}>
              {emp.name || 'Rahul Patil'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span 
                style={{
                  padding: '2px 8px',
                  backgroundColor: '#7A1F3D',
                  color: '#ffffff',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              >
                {emp.employeeCode || 'GPS-EMP-101'}
              </span>
              <span style={{ fontSize: '13px', color: '#7A5260', fontWeight: '500' }}>
                {emp.designation || 'Plant Head & Operations'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Attributes Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px',
            fontSize: '13px'
          }}
        >
          <div style={{ padding: '10px 12px', border: '1px solid #E8D5DA', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A5260', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Building2 size={13} color="#7A1F3D" />
              <span>Department</span>
            </div>
            <div style={{ fontWeight: '600', color: '#2A0E17' }}>{emp.department || 'Production Machining'}</div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #E8D5DA', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A5260', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Shield size={13} color="#7A1F3D" />
              <span>ERP Access Role</span>
            </div>
            <div style={{ fontWeight: '600', color: '#7A1F3D' }}>{roleLabel} ({role})</div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #E8D5DA', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A5260', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Mail size={13} color="#7A1F3D" />
              <span>Email</span>
            </div>
            <div style={{ fontWeight: '500', color: '#2A0E17', wordBreak: 'break-all' }}>{emp.email || 'rahul.patil@gpspindles.com'}</div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #E8D5DA', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A5260', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Phone size={13} color="#7A1F3D" />
              <span>Phone</span>
            </div>
            <div style={{ fontWeight: '500', color: '#2A0E17' }}>{emp.phone || '+91 98220 14921'}</div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #E8D5DA', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A5260', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
              <MapPin size={13} color="#7A1F3D" />
              <span>Facility Branch</span>
            </div>
            <div style={{ fontWeight: '500', color: '#2A0E17' }}>{emp.branch || 'Nanded City Plant 1 (HQ)'}</div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #E8D5DA', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A5260', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Clock size={13} color="#7A1F3D" />
              <span>Current Shift</span>
            </div>
            <div style={{ fontWeight: '500', color: '#2A0E17' }}>{emp.shift || 'Shift A (07:00 - 15:30)'}</div>
          </div>
        </div>

        {/* Certified Skills */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A5260', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>
            <Award size={14} color="#7A1F3D" />
            <span>Certified Skills & Competencies</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {skills.map((skill, i) => (
              <span 
                key={i}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#FAF5F6',
                  border: '1px solid #E8D5DA',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: '#4A1020',
                  fontWeight: '500'
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #E8D5DA' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
