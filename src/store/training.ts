// store/training.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '../utils/logger';

interface AnalysisResult {
  feedback: string;
  sentiment: string;
  score: number;
  passed: boolean;
  transcript: string;
  xp?: number;
  duration?: number;
}

interface TrainingStore {
  // Module/Scenario Selection
  selectedModuleId: string | null;
  selectedModuleTitle: string | null;
  selectedCategoryName: string | null;
  selectedScenarioId: string | null;
  selectedScenarioTitle: string | null;
  selectedScenarioDifficulty: number | null;
  selectedPromptTemplate: string | null;
  selectedFirstMessage: string | null;

  // Current Call State
  currentCallId: string | null;
  isCallActive: boolean;

  // Analysis Results (individual fields for better reactivity)
  transcript: string;
  feedback: string;
  sentiment: string;
  score: number;
  passed: boolean;
  xp: number;
  duration: number;

  // User state
  userId: string | null;
  totalXP: number;

  // Actions
  setSelectedModuleId: (moduleId: string) => void;
  setSelectedScenario: (
    scenarioId: string,
    title: string,
    difficulty: number,
    promptTemplate: string,
    firstMessage: string,
    moduleTitle: string,
    categoryName: string
  ) => void;
  setCurrentCallId: (callId: string | null) => void;
  setCallActive: (active: boolean) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setUserId: (userId: string) => void;
  addXP: (amount: number) => void;
  reset: () => void;
  resetAnalysisOnly: () => void;
}

const initialAnalysisState = {
  transcript: '',
  feedback: '',
  sentiment: 'neutral',
  score: 0,
  passed: false,
  xp: 0,
  duration: 0,
};

export const useTrainingStore = create<TrainingStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      selectedModuleId: null,
      selectedModuleTitle: null,
      selectedCategoryName: null,
      selectedScenarioId: null,
      selectedScenarioTitle: null,
      selectedScenarioDifficulty: null,
      selectedPromptTemplate: null,
      selectedFirstMessage: null,
      currentCallId: null,
      isCallActive: false,
      userId: null,
      totalXP: 0,
      ...initialAnalysisState,

      // Actions
      setSelectedModuleId: (moduleId: string) => {
        logger.component('TrainingStore').info('Setting module ID', { moduleId });
        set((state) => ({ 
          ...state,
          selectedModuleId: moduleId 
        }), false, 'setSelectedModuleId');
      },

      setSelectedScenario: (
        scenarioId: string,
        title: string,
        difficulty: number,
        promptTemplate: string,
        firstMessage: string,
        moduleTitle: string,
        categoryName: string
      ) => {
        logger.component('TrainingStore').info('Setting scenario', { scenarioId, title, moduleTitle, categoryName });
        set((state) => ({
          ...state,
          selectedScenarioId: scenarioId,
          selectedScenarioTitle: title,
          selectedScenarioDifficulty: difficulty,
          selectedPromptTemplate: promptTemplate,
          selectedFirstMessage: firstMessage,
          selectedModuleTitle: moduleTitle,
          selectedCategoryName: categoryName,
        }), false, 'setSelectedScenario');
      },

      setCurrentCallId: (callId: string | null) => {
        logger.component('TrainingStore').info('Setting call ID', { callId });
        set((state) => ({ 
          ...state,
          currentCallId: callId 
        }), false, 'setCurrentCallId');
      },

      setCallActive: (active: boolean) => {
        logger.component('TrainingStore').info('Setting call active', { active });
        set((state) => ({ 
          ...state,
          isCallActive: active 
        }), false, 'setCallActive');
      },

      setAnalysisResult: (result: AnalysisResult) => {
        logger.component('TrainingStore').info('Setting analysis result', { 
          score: result.score, 
          passed: result.passed, 
          sentiment: result.sentiment,
          xp: result.xp,
          transcriptLength: result.transcript?.length || 0
        });
        
        // Validate the result to ensure all required fields are present
        const validatedResult = {
          transcript: result.transcript || '',
          feedback: result.feedback || '',
          sentiment: result.sentiment || 'neutral',
          score: typeof result.score === 'number' ? result.score : 0,
          passed: typeof result.passed === 'boolean' ? result.passed : false,
          xp: result.xp || (typeof result.score === 'number' ? result.score * 10 : 0),
          duration: result.duration || 0,
        };

        set((state) => ({
          ...state,
          ...validatedResult,
        }), false, 'setAnalysisResult');
      },

      setUserId: (userId: string) => {
        logger.component('TrainingStore').info('Setting user ID', { userId });
        set((state) => ({ 
          ...state,
          userId 
        }), false, 'setUserId');
      },

      addXP: (amount: number) => {
        logger.component('TrainingStore').info('Adding XP', { amount });
        set((state) => ({ 
          ...state,
          totalXP: state.totalXP + amount 
        }), false, 'addXP');
      },

      reset: () => {
        logger.component('TrainingStore').info('Resetting training store');
        set((state) => ({
          selectedModuleId: null,
          selectedModuleTitle: null,
          selectedCategoryName: null,
          selectedScenarioId: null,
          selectedScenarioTitle: null,
          selectedScenarioDifficulty: null,
          selectedPromptTemplate: null,
          selectedFirstMessage: null,
          currentCallId: null,
          isCallActive: false,
          ...initialAnalysisState,
          // Keep user data
          userId: state.userId,
          totalXP: state.totalXP,
        }), false, 'reset');
      },

      resetAnalysisOnly: () => {
        logger.component('TrainingStore').info('Resetting analysis data only');
        set((state) => ({
          ...state,
          ...initialAnalysisState,
        }), false, 'resetAnalysisOnly');
      },
    }),
    {
      name: 'training-store',
      serialize: {
        options: {
          map: true,
        },
      },
    }
  )
);