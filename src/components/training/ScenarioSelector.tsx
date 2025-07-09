/**
 * ScenarioSelector Component
 * Handles scenario selection for training simulations
 */
import React from 'react';

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  prompt_template?: string;
  first_message?: string;
}

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  onSelectScenario: (scenario: Scenario) => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">1. Select a Scenario</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedScenario?.id === scenario.id 
                ? "border-blue-500 bg-blue-50" 
                : "hover:border-gray-300"
            }`}
            onClick={() => onSelectScenario(scenario)}
          >
            <h3 className="font-semibold">{scenario.title}</h3>
            <p className="text-gray-500 text-sm">{scenario.description}</p>
            <div className="mt-2">
              <span className="text-xs text-gray-400">
                Difficulty: {scenario.difficulty}/10
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};