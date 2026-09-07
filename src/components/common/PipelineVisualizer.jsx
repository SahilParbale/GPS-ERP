import React from 'react';
import { Check } from 'lucide-react';

export default function PipelineVisualizer({ stages = [], activeStage, onSelectStage }) {
  return (
    <div className="pipeline-container">
      {stages.map((stage, idx) => {
        const isCurrentActive = activeStage === stage.key || activeStage === stage.id;
        const stageIndex = typeof activeStage === 'number' 
          ? activeStage 
          : stages.findIndex(s => s.key === activeStage) + 1;
        const isCompleted = stage.id < stageIndex;

        let statusClass = 'upcoming';
        if (isCurrentActive) statusClass = 'active';
        else if (isCompleted) statusClass = 'completed';

        return (
          <div 
            key={stage.id || stage.key}
            className={`pipeline-step ${statusClass}`}
            onClick={() => onSelectStage && onSelectStage(stage.key || stage.id)}
            title={stage.desc}
          >
            <div className="pipeline-step-header">
              <span className="step-number">0{idx + 1}</span>
              <div className="step-indicator">
                {isCompleted ? <Check size={12} strokeWidth={3} /> : idx + 1}
              </div>
            </div>
            <div className="step-name">{stage.name}</div>
            {stage.count !== undefined && (
              <div className="step-count">{stage.count} {stage.count === 1 ? 'Job' : 'Jobs'}</div>
            )}
            {stage.date && (
              <div className="step-count">{stage.date}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
