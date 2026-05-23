// Simple i18n system for multi-language support
export type Locale = 'en' | 'bn' | 'hi' | 'ar' | 'es' | 'zh' | 'ja'

export const LOCALES: Record<Locale, { name: string; nativeName: string; dir: 'ltr' | 'rtl' }> = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  bn: { name: 'Bangla', nativeName: 'বাংলা', dir: 'ltr' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
}

type TranslationKeys = {
  [key: string]: string | TranslationKeys
}

const translations: Record<Locale, TranslationKeys> = {
  en: {
    nav: {
      home: 'Home',
      scan: 'Scan',
      tracker: 'Tracker',
      dashboard: 'Dashboard',
      wallets: 'Wallets',
      history: 'History',
      freeze: 'Freeze',
      gas: 'Gas',
      bridge: 'Bridge',
      portfolio: 'Portfolio',
      defi: 'DeFi',
      audit: 'Audit',
      reputation: 'Reputation',
      scamCheck: 'Scam Check',
    },
    home: {
      title: 'Auto-Sweep Protection',
      subtitle: 'Compromised wallet? Funds still flowing in? SweepGuard automatically detects incoming funds and transfers them to your safe wallet before hackers can drain them.',
      scanNow: 'Scan Now',
      protecting: 'Protecting wallets in real-time',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      copy: 'Copy',
      copied: 'Copied!',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      address: 'Address',
      amount: 'Amount',
      chain: 'Chain',
      status: 'Status',
    },
  },
  bn: {
    nav: {
      home: 'হোম',
      scan: 'স্ক্যান',
      tracker: 'ট্র্যাকার',
      dashboard: 'ড্যাশবোর্ড',
      wallets: 'ওয়ালেট',
      history: 'হিস্ট্রি',
      freeze: 'ফ্রিজ',
      gas: 'গ্যাস',
      bridge: 'ব্রিজ',
      portfolio: 'পোর্টফোলিও',
      defi: 'ডেফি',
      audit: 'অডিট',
      reputation: 'রেপুটেশন',
      scamCheck: 'স্ক্যাম চেক',
    },
    home: {
      title: 'অটো-সুইপ সুরক্ষা',
      subtitle: 'আপনার ওয়ালেট আক্রান্ত? সুইপগার্ড স্বয়ংক্রিয়ভাবে আগত তহবিল সনাক্ত করে এবং হ্যাকারদের আগে আপনার নিরাপদ ওয়ালেটে স্থানান্তর করে।',
      scanNow: 'এখনই স্ক্যান করুন',
      protecting: 'রিয়েল-টাইমে ওয়ালেট সুরক্ষা',
    },
    common: {
      loading: 'লোড হচ্ছে...',
      error: 'ত্রুটি',
      success: 'সফল',
      copy: 'কপি',
      copied: 'কপি হয়েছে!',
      submit: 'জমা দিন',
      cancel: 'বাতিল',
      save: 'সংরক্ষণ',
      delete: 'মুছুন',
      address: 'ঠিকানা',
      amount: 'পরিমাণ',
      chain: 'চেইন',
      status: 'স্ট্যাটাস',
    },
  },
  hi: {
    nav: { home: 'होम', scan: 'स्कैन', tracker: 'ट्रैकर', dashboard: 'डैशबोर्ड', wallets: 'वॉलेट', history: 'इतिहास', freeze: 'फ्रीज', gas: 'गैस', bridge: 'ब्रिज', portfolio: 'पोर्टफोलियो', defi: 'डेफी', audit: 'ऑडिट', reputation: 'प्रतिष्ठा', scamCheck: 'स्कैम चेक' },
    home: { title: 'ऑटो-स्वीप सुरक्षा', subtitle: 'आपका वॉलेट संकट में है? स्वीपगार्ड स्वचालित रूप से आने वाले फंड का पता लगाता है।', scanNow: 'अभी स्कैन करें', protecting: 'रीयल-टाइम में वॉलेट सुरक्षा' },
    common: { loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफल', copy: 'कॉपी', copied: 'कॉपी हो गया!', submit: 'जमा करें', cancel: 'रद्द', save: 'सहेजें', delete: 'हटाएं', address: 'पता', amount: 'राशि', chain: 'चेन', status: 'स्थिति' },
  },
  ar: {
    nav: { home: 'الرئيسية', scan: 'فحص', tracker: 'تتبع', dashboard: 'لوحة التحكم', wallets: 'المحافظ', history: 'التاريخ', freeze: 'تجميد', gas: 'الغاز', bridge: 'جسر', portfolio: 'المحفظة', defi: 'ديفاي', audit: 'تدقيق', reputation: 'السمعة', scamCheck: 'فحص الاحتيال' },
    home: { title: 'حماية المسح التلقائي', subtitle: 'محفظتك مخترقة؟ سويب غارد يكتشف تلقائياً الأموال الواردة وينقلها إلى محفظتك الآمنة.', scanNow: 'افحص الآن', protecting: 'حماية المحافظ في الوقت الفعلي' },
    common: { loading: 'جاري التحميل...', error: 'خطأ', success: 'نجاح', copy: 'نسخ', copied: 'تم النسخ!', submit: 'إرسال', cancel: 'إلغاء', save: 'حفظ', delete: 'حذف', address: 'العنوان', amount: 'المبلغ', chain: 'السلسلة', status: 'الحالة' },
  },
  es: {
    nav: { home: 'Inicio', scan: 'Escanear', tracker: 'Rastreador', dashboard: 'Panel', wallets: 'Billeteras', history: 'Historial', freeze: 'Congelar', gas: 'Gas', bridge: 'Puente', portfolio: 'Portafolio', defi: 'DeFi', audit: 'Auditoría', reputation: 'Reputación', scamCheck: 'Verificar Estafa' },
    home: { title: 'Protección de Barrido Automático', subtitle: '¿Billetera comprometida? SweepGuard detecta automáticamente los fondos entrantes y los transfiere a tu billetera segura.', scanNow: 'Escanear Ahora', protecting: 'Protección de billeteras en tiempo real' },
    common: { loading: 'Cargando...', error: 'Error', success: 'Éxito', copy: 'Copiar', copied: '¡Copiado!', submit: 'Enviar', cancel: 'Cancelar', save: 'Guardar', delete: 'Eliminar', address: 'Dirección', amount: 'Cantidad', chain: 'Cadena', status: 'Estado' },
  },
  zh: {
    nav: { home: '首页', scan: '扫描', tracker: '追踪', dashboard: '仪表盘', wallets: '钱包', history: '历史', freeze: '冻结', gas: 'Gas', bridge: '跨链桥', portfolio: '投资组合', defi: 'DeFi', audit: '审计', reputation: '信誉', scamCheck: '骗局检查' },
    home: { title: '自动清扫保护', subtitle: '钱包被入侵？SweepGuard自动检测 incoming 资金并转移到您的安全钱包。', scanNow: '立即扫描', protecting: '实时钱包保护' },
    common: { loading: '加载中...', error: '错误', success: '成功', copy: '复制', copied: '已复制！', submit: '提交', cancel: '取消', save: '保存', delete: '删除', address: '地址', amount: '金额', chain: '链', status: '状态' },
  },
  ja: {
    nav: { home: 'ホーム', scan: 'スキャン', tracker: 'トラッカー', dashboard: 'ダッシュボード', wallets: 'ウォレット', history: '履歴', freeze: 'フリーズ', gas: 'ガス', bridge: 'ブリッジ', portfolio: 'ポートフォリオ', defi: 'DeFi', audit: '監査', reputation: '評判', scamCheck: 'スキャンチェック' },
    home: { title: '自動スイープ保護', subtitle: 'ウォレットが侵害されましたか？SweepGuardが自動的に着信資金を検出し、安全なウォレットに転送します。', scanNow: '今すぐスキャン', protecting: 'リアルタイムウォレット保護' },
    common: { loading: '読み込み中...', error: 'エラー', success: '成功', copy: 'コピー', copied: 'コピーしました！', submit: '送信', cancel: 'キャンセル', save: '保存', delete: '削除', address: 'アドレス', amount: '金額', chain: 'チェーン', status: 'ステータス' },
  },
}

function getNestedValue(obj: TranslationKeys, path: string): string {
  const keys = path.split('.')
  let current: TranslationKeys | string = obj
  for (const key of keys) {
    if (typeof current === 'string') return path
    current = current[key]
    if (current === undefined) return path
  }
  return typeof current === 'string' ? current : path
}

export function t(key: string, locale: Locale = 'en'): string {
  return getNestedValue(translations[locale] || translations.en, key)
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem('sweeptsguard_locale')
  if (stored && stored in LOCALES) return stored as Locale
  return 'en'
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('sweeptsguard_locale', locale)
}
