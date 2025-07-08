// src/pages/Training.tsx - Cached + Progressive Loading
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card, CardContent } from "../components/Card";
import { GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTrainingStore } from "../store/training";

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  prompt_template?: string;
  first_message?: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  category_id: string;
  scenarios?: Scenario[];
}

interface GroupedCategory {
  id: string;
  name: string;
  description: string;
  modules: Module[];
}

// Simple in-memory cache
class TrainingCache {
  private static cache: Map<string, any> = new Map();
  private static cacheTimestamps: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static get(key: string): any | null {
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && Date.now() - timestamp < this.CACHE_DURATION) {
      return this.cache.get(key);
    }
    return null;
  }

  static set(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  static clear(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

const Training = () => {
  const [groupedCategories, setGroupedCategories] = useState<GroupedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const hasFetched = useRef(false);

  const navigate = useNavigate();
  const { setSelectedModuleId, setSelectedScenario } = useTrainingStore();

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadDataCachedProgressive = async () => {
      setLoading(true);
      setError(null);
      setProgress(0);
      
      try {
        // Check cache first
        const cacheKey = "training_data_complete";
        const cachedData = TrainingCache.get(cacheKey);
        
        if (cachedData) {
          console.log("⚡ Loading from cache...");
          setLoadingStage("Loading from cache...");
          setGroupedCategories(cachedData);
          setLoading(false);
          return;
        }

        console.log("🔄 Cache miss, fetching fresh data...");
        
        // Step 1: Fetch categories (fast)
        setLoadingStage("Loading categories...");
        setProgress(10);
        
        const catRes = await fetch("http://127.0.0.1:8000/api/getTrainingCategories");
        const categories: Category[] = await catRes.json();
        if (!Array.isArray(categories)) throw new Error("Invalid categories response");

        // Step 2: Show categories immediately while loading modules
        const initialGroups: GroupedCategory[] = categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          modules: []
        }));
        setGroupedCategories(initialGroups);
        setLoading(false); // Show UI immediately
        
        // Step 3: Load modules in background
        setLoadingStage("Loading modules...");
        setProgress(30);
        
        const modulePromises = categories.map(async (category) => {
          const modRes = await fetch(`http://127.0.0.1:8000/api/getModulesByCategory/${category.id}`);
          const modules: Module[] = await modRes.json();
          return modules.map(module => ({ ...module, category_id: category.id }));
        });

        const moduleArrays = await Promise.all(modulePromises);
        const allModules = moduleArrays.flat();
        
        setProgress(60);
        setLoadingStage("Loading scenarios...");

        // Step 4: Load scenarios with progress updates
        const scenarioPromises = allModules.map(async (module, index) => {
          const scenarioRes = await fetch(`http://127.0.0.1:8000/api/getScenariosByModule/${module.id}`);
          const scenarios: Scenario[] = await scenarioRes.json();
          
          // Update progress
          const progressPercent = 60 + ((index + 1) / allModules.length) * 30;
          setProgress(progressPercent);
          
          return { moduleId: module.id, scenarios };
        });

        const scenarioResults = await Promise.all(scenarioPromises);
        
        // Map scenarios to modules
        const scenarioMap = new Map(scenarioResults.map(result => [result.moduleId, result.scenarios]));
        allModules.forEach(module => {
          module.scenarios = scenarioMap.get(module.id) || [];
        });

        // Step 5: Final grouping
        setProgress(95);
        const grouped: Record<string, GroupedCategory> = {};
        categories.forEach(category => {
          grouped[category.name] = {
            id: category.id,
            name: category.name,
            description: category.description,
            modules: []
          };
        });

        allModules.forEach(module => {
          const category = categories.find(cat => cat.id === module.category_id);
          if (category && grouped[category.name]) {
            grouped[category.name].modules.push(module);
          }
        });

        const finalData = Object.values(grouped);
        
        // Cache the result
        TrainingCache.set(cacheKey, finalData);
        
        setGroupedCategories(finalData);
        setProgress(100);
        
        console.log("✅ Data loaded and cached");
        
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to load training data. Please try again later.");
        setLoading(false);
      }
    };

    loadDataCachedProgressive();
  }, []);

  const handleStartScenario = (
    moduleId: string,
    scenario: Scenario,
    module: Module,
    categoryName: string
  ) => {
    setSelectedModuleId(moduleId);
    setSelectedScenario(
      scenario.id,
      scenario.title,
      scenario.difficulty,
      scenario.prompt_template || "",
      scenario.first_message || "",
      module.title,
      categoryName
    );
    navigate("/training/simulator");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center mb-4">
        <GraduationCap className="mr-2" /> Training Modules
      </h1>

      {loading && (
        <div className="mb-4">
          <p className="mb-2">⚡ {loadingStage}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {error && <p className="text-red-500">{error}</p>}

      {groupedCategories.length === 0 && !loading && !error && (
        <p className="text-gray-500">📌 No categories found.</p>
      )}

      {groupedCategories.length > 0 && (
        <div>
          {groupedCategories
            .filter((cat) => cat.modules.length > 0)
            .map((category) => (
              <div key={category.name} className="mb-6">
                <h2 className="text-xl font-semibold">{category.name}</h2>
                <p className="text-gray-500">{category.description}</p>
                
                {category.modules.length === 0 ? (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Loading modules...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {category.modules.map((module) => (
                      <Card key={module.id} className="p-4 border rounded-lg">
                        <CardContent>
                          <h3 className="text-lg font-semibold">{module.title}</h3>
                          <p className="text-gray-500 mb-2">{module.description}</p>

                          {!module.scenarios ? (
                            <div className="text-sm text-gray-500">Loading scenarios...</div>
                          ) : module.scenarios.length > 0 ? (
                            <ul className="text-sm text-gray-600 list-disc list-inside mb-2">
                              {module.scenarios.map((scenario) => (
                                <li key={scenario.id} className="flex items-center justify-between">
                                  {scenario.title}
                                  <Button
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => handleStartScenario(
                                      module.id, 
                                      scenario, 
                                      module, 
                                      category.name
                                    )}
                                  >
                                    Start
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No scenarios available</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Training;