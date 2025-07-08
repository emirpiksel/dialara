// src/pages/training/modules.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { GraduationCap } from 'lucide-react';

// Define Module interface
interface TrainingModule {
  id: string;
  name: string;
  description: string;
}

const Modules = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch modules from Supabase or mock data
    async function loadModules() {
      try {
        setLoading(true);
        setError(null);

        // Simulating API call here; replace with actual API call
        const data: TrainingModule[] = [
          { id: '1', name: 'Angry Customer', description: 'Handle an angry customer scenario' },
          { id: '2', name: 'Hesitant Customer', description: 'Handle a hesitant customer scenario' },
        ];

        setModules(data);
      } catch (err) {
        console.error('❌ Error fetching modules', err);
        setError('Failed to load modules');
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, []);

  const handleModuleSelect = (moduleId: string) => {
    // Navigate to the training page for selected module
    navigate(`/training?moduleId=${moduleId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center">
        <GraduationCap className="mr-2" /> Training Modules
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : modules.length === 0 ? (
        <p className="text-gray-500">📌 No training modules found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card key={module.id} className="p-4 border rounded-lg">
              <CardContent>
                <h2 className="text-lg font-semibold">{module.name}</h2>
                <p className="text-gray-500">{module.description}</p>
                <Button className="mt-4" onClick={() => handleModuleSelect(module.id)}>
                  Start Training
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Modules;
