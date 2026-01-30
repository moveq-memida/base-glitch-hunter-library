'use client';

export interface ReproductionStep {
  id?: number;
  step_number: number;
  instruction: string;
  timestamp?: string;
}

interface ReproductionStepsEditorProps {
  steps: ReproductionStep[];
  onChange: (steps: ReproductionStep[]) => void;
}

export default function ReproductionStepsEditor({
  steps,
  onChange,
}: ReproductionStepsEditorProps) {
  const handleInstructionChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], instruction: value };
    onChange(newSteps);
  };

  const handleTimestampChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], timestamp: value };
    onChange(newSteps);
  };

  const handleAddStep = () => {
    const newStep: ReproductionStep = {
      step_number: steps.length + 1,
      instruction: '',
      timestamp: '',
    };
    onChange([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, step_number: i + 1 }));
    onChange(newSteps);
  };

  return (
    <div className="reproduction-steps-editor">
      {steps.map((step, index) => (
        <div key={index} className="reproduction-steps-editor__item">
          <span className="reproduction-steps-editor__number">{index + 1}</span>
          <div className="reproduction-steps-editor__fields">
            <input
              type="text"
              className="reproduction-steps-editor__input"
              value={step.instruction}
              onChange={(e) => handleInstructionChange(index, e.target.value)}
              placeholder="Describe this step..."
            />
            <input
              type="text"
              className="reproduction-steps-editor__timestamp"
              value={step.timestamp || ''}
              onChange={(e) => handleTimestampChange(index, e.target.value)}
              placeholder="0:00"
            />
          </div>
          <button
            type="button"
            className="reproduction-steps-editor__remove"
            onClick={() => handleRemoveStep(index)}
            aria-label="Remove step"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="reproduction-steps-editor__add"
        onClick={handleAddStep}
      >
        + Add step
      </button>
    </div>
  );
}
