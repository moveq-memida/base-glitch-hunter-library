'use client';

export interface ReproductionStep {
  id?: number;
  step_number: number;
  instruction: string;
  timestamp?: string | null;
}

interface ReproductionStepsViewerProps {
  steps: ReproductionStep[];
}

export default function ReproductionStepsViewer({ steps }: ReproductionStepsViewerProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number);

  return (
    <ol className="reproduction-steps">
      {sortedSteps.map((step) => (
        <li key={step.id || step.step_number} className="reproduction-steps__item">
          <span className="reproduction-steps__number">{step.step_number}</span>
          <div className="reproduction-steps__content">
            <p className="reproduction-steps__instruction">{step.instruction}</p>
            {step.timestamp && (
              <span className="reproduction-steps__timestamp">
                Timestamp: {step.timestamp}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
