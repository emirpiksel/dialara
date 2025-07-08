import React from "react";
import { GraduationCap, Flame } from "lucide-react";
import { Button } from "./Button";

interface TrainingModuleCardProps {
  title: string;
  description: string;
  difficulty?: number; // 1 = Easy, 2 = Medium, 3 = Hard
  onStart?: () => void;
}

export const TrainingModuleCard: React.FC<TrainingModuleCardProps> = ({
  title,
  description,
  difficulty = 1,
  onStart,
}) => {
  const getDifficultyLabel = () => {
    switch (difficulty) {
      case 1:
        return "Easy";
      case 2:
        return "Medium";
      case 3:
        return "Hard";
      default:
        return "Unknown";
    }
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 1:
        return "text-green-600";
      case 2:
        return "text-yellow-600";
      case 3:
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-between h-full border border-gray-200">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          {title}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        <p className={`mt-2 text-sm font-medium flex items-center gap-1 ${getDifficultyColor()}`}>
          <Flame className="w-4 h-4" />
          Difficulty: {getDifficultyLabel()}
        </p>
      </div>
      {onStart && (
        <Button onClick={onStart} className="mt-4 w-full">
          Start Module
        </Button>
      )}
    </div>
  );
};
