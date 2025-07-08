import { useAppMode } from '@/store/useAppMode';
import { GraduationCap, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ModeSwitcher = () => {
  const { mode, setMode } = useAppMode();
  const navigate = useNavigate();

  const handleModeChange = (value: 'crm' | 'training') => {
    setMode(value);
    navigate(value === 'crm' ? '/dashboard' : '/training/overview');
  };

  return (
    <div className="px-4 py-2 flex gap-2">
      <button
        onClick={() => handleModeChange('crm')}
        className={`flex items-center gap-1 w-full justify-center px-3 py-2 text-sm rounded-md border 
          ${mode === 'crm' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}
        `}
      >
        <PhoneCall className="w-4 h-4" />
        CRM
      </button>
      <button
        onClick={() => handleModeChange('training')}
        className={`flex items-center gap-1 w-full justify-center px-3 py-2 text-sm rounded-md border 
          ${mode === 'training' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}
        `}
      >
        <GraduationCap className="w-4 h-4" />
        Training
      </button>
    </div>
  );
};
