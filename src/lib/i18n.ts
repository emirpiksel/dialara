/**
 * Simple internationalization system for Dialara
 * Supports English and Turkish languages
 */

export type Language = 'en' | 'tr';

export interface Translations {
  [key: string]: string | Translations;
}

// English translations
const en: Translations = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    refresh: 'Refresh',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    clear: 'Clear'
  },
  navigation: {
    dashboard: 'Dashboard',
    calls: 'Calls',
    leads: 'Leads',
    agents: 'Agents',
    analytics: 'Analytics',
    training: 'Training',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout'
  },
  dashboard: {
    title: 'Dashboard',
    overview: 'Overview',
    totalCalls: 'Total Calls',
    activeCalls: 'Active Calls',
    totalLeads: 'Total Leads',
    conversionRate: 'Conversion Rate',
    recentActivity: 'Recent Activity',
    callVolume: 'Call Volume',
    performance: 'Performance'
  },
  calls: {
    title: 'Calls',
    newCall: 'New Call',
    callHistory: 'Call History',
    duration: 'Duration',
    status: 'Status',
    startTime: 'Start Time',
    endTime: 'End Time',
    phoneNumber: 'Phone Number',
    recording: 'Recording',
    transcript: 'Transcript',
    summary: 'Summary',
    sentiment: 'Sentiment',
    outcome: 'Outcome'
  },
  leads: {
    title: 'Leads',
    newLead: 'New Lead',
    importLeads: 'Import Leads',
    exportLeads: 'Export Leads',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    status: 'Status',
    source: 'Source',
    notes: 'Notes',
    lastContact: 'Last Contact',
    nextFollowUp: 'Next Follow-up'
  },
  training: {
    title: 'Training',
    modules: 'Training Modules',
    scenarios: 'Scenarios',
    progress: 'Progress',
    score: 'Score',
    leaderboard: 'Leaderboard',
    simulator: 'Simulator',
    startTraining: 'Start Training',
    difficulty: 'Difficulty',
    xpEarned: 'XP Earned',
    rank: 'Rank',
    badges: 'Badges'
  },
  analytics: {
    title: 'Analytics & Coaching Dashboard',
    callMetrics: 'Call Metrics',
    agentPerformance: 'Agent Performance',
    trainingStats: 'Training Statistics',
    realTimeMetrics: 'Real-time Metrics',
    sentimentAnalysis: 'Sentiment Analysis',
    topObjections: 'Top Customer Objections',
    performanceTrends: 'Performance Trends',
    callVolumeByHour: 'Call Volume by Hour',
    aiAssistantPerformance: 'AI Assistant Performance',
    coachingInsights: 'Coaching Insights'
  },
  settings: {
    title: 'Settings',
    general: 'General',
    account: 'Account',
    notifications: 'Notifications',
    integrations: 'Integrations',
    language: 'Language',
    timezone: 'Timezone',
    profile: 'Profile Settings',
    security: 'Security',
    api: 'API Settings',
    compliance: 'Compliance'
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account'
  },
  voice: {
    aiAssistant: 'AI Assistant',
    callControls: 'Call Controls',
    mute: 'Mute',
    unmute: 'Unmute',
    hold: 'Hold',
    transfer: 'Transfer',
    endCall: 'End Call',
    startCall: 'Start Call',
    recording: 'Recording',
    transcript: 'Live Transcript',
    suggestions: 'AI Suggestions'
  },
  compliance: {
    hipaaMode: 'HIPAA Mode',
    pciMode: 'PCI Mode',
    dataRetention: 'Data Retention',
    privacySettings: 'Privacy Settings',
    consentManagement: 'Consent Management',
    auditLog: 'Audit Log',
    securitySettings: 'Security Settings'
  }
};

// Turkish translations
const tr: Translations = {
  common: {
    loading: 'Yükleniyor...',
    error: 'Hata',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    add: 'Ekle',
    search: 'Ara',
    filter: 'Filtrele',
    refresh: 'Yenile',
    yes: 'Evet',
    no: 'Hayır',
    close: 'Kapat',
    back: 'Geri',
    next: 'İleri',
    previous: 'Önceki',
    submit: 'Gönder',
    clear: 'Temizle'
  },
  navigation: {
    dashboard: 'Ana Panel',
    calls: 'Aramalar',
    leads: 'Potansiyeller',
    agents: 'Ajanlar',
    analytics: 'Analizler',
    training: 'Eğitim',
    settings: 'Ayarlar',
    profile: 'Profil',
    logout: 'Çıkış'
  },
  dashboard: {
    title: 'Ana Panel',
    overview: 'Genel Bakış',
    totalCalls: 'Toplam Aramalar',
    activeCalls: 'Aktif Aramalar',
    totalLeads: 'Toplam Potansiyeller',
    conversionRate: 'Dönüşüm Oranı',
    recentActivity: 'Son Aktiviteler',
    callVolume: 'Arama Hacmi',
    performance: 'Performans'
  },
  calls: {
    title: 'Aramalar',
    newCall: 'Yeni Arama',
    callHistory: 'Arama Geçmişi',
    duration: 'Süre',
    status: 'Durum',
    startTime: 'Başlangıç Saati',
    endTime: 'Bitiş Saati',
    phoneNumber: 'Telefon Numarası',
    recording: 'Kayıt',
    transcript: 'Transkript',
    summary: 'Özet',
    sentiment: 'Duygu Analizi',
    outcome: 'Sonuç'
  },
  leads: {
    title: 'Potansiyeller',
    newLead: 'Yeni Potansiyel',
    importLeads: 'Potansiyel İçe Aktar',
    exportLeads: 'Potansiyel Dışa Aktar',
    firstName: 'Ad',
    lastName: 'Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    company: 'Şirket',
    status: 'Durum',
    source: 'Kaynak',
    notes: 'Notlar',
    lastContact: 'Son İletişim',
    nextFollowUp: 'Sonraki Takip'
  },
  training: {
    title: 'Eğitim',
    modules: 'Eğitim Modülleri',
    scenarios: 'Senaryolar',
    progress: 'İlerleme',
    score: 'Puan',
    leaderboard: 'Lider Tablosu',
    simulator: 'Simülatör',
    startTraining: 'Eğitimi Başlat',
    difficulty: 'Zorluk',
    xpEarned: 'Kazanılan XP',
    rank: 'Rütbe',
    badges: 'Rozetler'
  },
  analytics: {
    title: 'Analiz ve Koçluk Paneli',
    callMetrics: 'Arama Metrikleri',
    agentPerformance: 'Ajan Performansı',
    trainingStats: 'Eğitim İstatistikleri',
    realTimeMetrics: 'Gerçek Zamanlı Metrikler',
    sentimentAnalysis: 'Duygu Analizi',
    topObjections: 'En Çok Karşılaşılan İtirazlar',
    performanceTrends: 'Performans Trendleri',
    callVolumeByHour: 'Saatlik Arama Hacmi',
    aiAssistantPerformance: 'AI Asistan Performansı',
    coachingInsights: 'Koçluk İçgörüleri'
  },
  settings: {
    title: 'Ayarlar',
    general: 'Genel',
    account: 'Hesap',
    notifications: 'Bildirimler',
    integrations: 'Entegrasyonlar',
    language: 'Dil',
    timezone: 'Saat Dilimi',
    profile: 'Profil Ayarları',
    security: 'Güvenlik',
    api: 'API Ayarları',
    compliance: 'Uyumluluk'
  },
  auth: {
    login: 'Giriş',
    logout: 'Çıkış',
    register: 'Kayıt Ol',
    email: 'E-posta',
    password: 'Şifre',
    confirmPassword: 'Şifreyi Onayla',
    forgotPassword: 'Şifremi Unuttum?',
    resetPassword: 'Şifre Sıfırla',
    signIn: 'Giriş Yap',
    signUp: 'Kayıt Ol',
    welcomeBack: 'Tekrar Hoş Geldiniz',
    createAccount: 'Hesap Oluştur'
  },
  voice: {
    aiAssistant: 'AI Asistan',
    callControls: 'Arama Kontrolleri',
    mute: 'Sessize Al',
    unmute: 'Sesi Aç',
    hold: 'Beklet',
    transfer: 'Aktar',
    endCall: 'Aramayı Sonlandır',
    startCall: 'Aramayı Başlat',
    recording: 'Kayıt',
    transcript: 'Canlı Transkript',
    suggestions: 'AI Önerileri'
  },
  compliance: {
    hipaaMode: 'HIPAA Modu',
    pciMode: 'PCI Modu',
    dataRetention: 'Veri Saklama',
    privacySettings: 'Gizlilik Ayarları',
    consentManagement: 'Onay Yönetimi',
    auditLog: 'Denetim Günlüğü',
    securitySettings: 'Güvenlik Ayarları'
  }
};

// Available translations
const translations: Record<Language, Translations> = {
  en,
  tr
};

// Language storage key
const LANGUAGE_STORAGE_KEY = 'dialara_language';

// Current language state
let currentLanguage: Language = 'en';

// Initialize language from localStorage or browser preference
export function initializeLanguage(): Language {
  try {
    // Try to get from localStorage first
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
    if (stored && translations[stored]) {
      currentLanguage = stored;
      return currentLanguage;
    }

    // Fall back to browser language
    const browserLang = navigator.language.split('-')[0] as Language;
    if (translations[browserLang]) {
      currentLanguage = browserLang;
    } else {
      currentLanguage = 'en'; // Default fallback
    }

    // Save to localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    return currentLanguage;
  } catch (error) {
    console.warn('Failed to initialize language:', error);
    return 'en';
  }
}

// Get current language
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

// Set language
export function setLanguage(lang: Language): void {
  if (translations[lang]) {
    currentLanguage = lang;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      
      // Also save to backend if user is authenticated
      const userId = localStorage.getItem('dialara_user_id');
      if (userId) {
        saveLanguagePreferenceToBackend(userId, lang).catch(error => {
          console.warn('Failed to save language preference to backend:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }
}

// Save language preference to backend
async function saveLanguagePreferenceToBackend(userId: string, language: Language): Promise<void> {
  try {
    const response = await fetch('/api/language/set-default', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        language_code: language
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save language preference to backend');
    }
    
    console.log(`Language preference saved to backend: ${language}`);
  } catch (error) {
    console.warn('Error saving language preference to backend:', error);
    throw error;
  }
}

// Load language preference from backend
export async function loadLanguagePreferenceFromBackend(userId: string): Promise<Language | null> {
  try {
    const response = await fetch(`/api/language/user-preference/${userId}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.language_preference as Language;
  } catch (error) {
    console.warn('Error loading language preference from backend:', error);
    return null;
  }
}

// Get available languages
export function getAvailableLanguages(): { code: Language; name: string; nativeName: string }[] {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' }
  ];
}

// Get translation by key
export function getTranslation(key: string, lang?: Language): string {
  const language = lang || currentLanguage;
  const keys = key.split('.');
  let value: any = translations[language];

  for (const k of keys) {
    value = value?.[k];
  }

  // If translation not found, fall back to English
  if (typeof value !== 'string' && language !== 'en') {
    value = translations.en;
    for (const k of keys) {
      value = value?.[k];
    }
  }

  // If still not found, return the key itself
  return typeof value === 'string' ? value : key;
}

// Translation hook function (for use with React)
export function useTranslation() {
  const t = (key: string) => getTranslation(key);
  
  return {
    t,
    language: currentLanguage,
    setLanguage,
    availableLanguages: getAvailableLanguages()
  };
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeLanguage();
}