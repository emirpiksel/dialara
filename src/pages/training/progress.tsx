import { useEffect, useState } from "react";
import { 
  GraduationCap, 
  Trophy, 
  Target, 
  Flame, 
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  Star,
  Zap,
  CheckCircle2
} from "lucide-react";

const ProgressBar = ({ value, label, color = "bg-blue-500", showPercentage = true }) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {showPercentage && <span className="text-sm text-gray-500">{value}%</span>}
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-1000 ease-out rounded-full relative`}
        style={{ width: `${value}%` }}
      >
        <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
      </div>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, title, value, subtitle, color = "text-blue-600" }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-full bg-gradient-to-br from-gray-50 to-gray-100`}>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </div>
  </div>
);

const AchievementBadge = ({ icon: Icon, title, description, unlocked = false, progress = 0 }) => (
  <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
    unlocked 
      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-md' 
      : 'bg-gray-50 border-gray-200'
  }`}>
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-lg ${unlocked ? 'bg-yellow-400' : 'bg-gray-300'}`}>
        <Icon className={`w-5 h-5 ${unlocked ? 'text-white' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1">
        <h3 className={`font-semibold text-sm ${unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
          {title}
        </h3>
        <p className={`text-xs mt-1 ${unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
          {description}
        </p>
        {!unlocked && progress > 0 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="h-1 bg-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{progress}% complete</p>
          </div>
        )}
      </div>
    </div>
    {unlocked && (
      <div className="absolute -top-1 -right-1">
        <div className="bg-green-500 rounded-full p-1">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      </div>
    )}
  </div>
);

const ModuleCard = ({ title, progress, status, difficulty, estimatedTime }) => (
  <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-all duration-200">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
            difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {difficulty}
          </span>
          <span className="text-xs text-gray-500 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {estimatedTime}
          </span>
        </div>
      </div>
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
        status === 'Completed' ? 'bg-green-100 text-green-700' :
        status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
        'bg-gray-100 text-gray-600'
      }`}>
        {status}
      </div>
    </div>
    <ProgressBar value={progress} label="" showPercentage={false} />
  </div>
);

const ProgressPage = () => {
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalModules, setTotalModules] = useState(0);
  const [completedModules, setCompletedModules] = useState(0);
  const [studyTime, setStudyTime] = useState(0);

  useEffect(() => {
    // Simulate loading with staggered animations
    const timer = setTimeout(() => {
      setXp(42);
      setStreak(7);
      setTotalModules(12);
      setCompletedModules(5);
      setStudyTime(18);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const achievements = [
    { icon: Flame, title: "On Fire!", description: "7-day learning streak", unlocked: true },
    { icon: BookOpen, title: "Knowledge Seeker", description: "Complete 5 modules", unlocked: true },
    { icon: Target, title: "Goal Crusher", description: "Reach 50% completion", unlocked: false, progress: 84 },
    { icon: Star, title: "Perfect Score", description: "Get 100% on any quiz", unlocked: false, progress: 0 },
    { icon: Zap, title: "Speed Runner", description: "Complete module in under 30min", unlocked: false, progress: 60 },
    { icon: Award, title: "Training Master", description: "Complete all modules", unlocked: false, progress: 42 }
  ];

  const modules = [
    { title: "Introduction to Basics", progress: 100, status: "Completed", difficulty: "Beginner", estimatedTime: "45min" },
    { title: "Advanced Techniques", progress: 75, status: "In Progress", difficulty: "Intermediate", estimatedTime: "1.5hrs" },
    { title: "Expert Strategies", progress: 0, status: "Not Started", difficulty: "Advanced", estimatedTime: "2hrs" },
    { title: "Practical Applications", progress: 100, status: "Completed", difficulty: "Intermediate", estimatedTime: "1hr" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center mb-2">
            <GraduationCap className="mr-3 text-blue-600" size={40} />
            Training Progress
          </h1>
          <p className="text-gray-600 text-lg">Track your journey and celebrate your achievements</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={TrendingUp} 
            title="Overall Progress" 
            value={`${xp}%`} 
            subtitle="Keep going!"
            color="text-blue-600"
          />
          <StatCard 
            icon={Flame} 
            title="Current Streak" 
            value={`${streak}`} 
            subtitle="days in a row"
            color="text-orange-600"
          />
          <StatCard 
            icon={BookOpen} 
            title="Modules Complete" 
            value={`${completedModules}/${totalModules}`} 
            subtitle="modules finished"
            color="text-green-600"
          />
          <StatCard 
            icon={Clock} 
            title="Study Time" 
            value={`${studyTime}h`} 
            subtitle="total hours"
            color="text-purple-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Progress Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Progress */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Training Overview</h2>
              <ProgressBar 
                value={xp} 
                label="Overall Completion" 
                color="bg-gradient-to-r from-blue-500 to-purple-600"
              />
              <div className="grid grid-cols-2 gap-4 mt-6">
                <ProgressBar 
                  value={75} 
                  label="Theory Knowledge" 
                  color="bg-green-500"
                />
                <ProgressBar 
                  value={35} 
                  label="Practical Skills" 
                  color="bg-orange-500"
                />
              </div>
            </div>

            {/* Module Progress */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Learning Modules
              </h2>
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <ModuleCard key={index} {...module} />
                ))}
              </div>
            </div>
          </div>

          {/* Achievements Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Achievements
              </h2>
              <div className="space-y-4">
                {achievements.map((achievement, index) => (
                  <AchievementBadge key={index} {...achievement} />
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4">This Week</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sessions completed</span>
                  <span className="font-semibold text-blue-600">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average score</span>
                  <span className="font-semibold text-green-600">87%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Time invested</span>
                  <span className="font-semibold text-purple-600">4.2hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;