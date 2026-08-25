import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ar";

export interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export const translations: Translations = {
  appName: { en: "LogiCore", ar: "لوجي كور" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  shipments: { en: "Shipments", ar: "الشحنات" },
  incidents: { en: "Incidents", ar: "الحوادث والمشاكل الإستثنائية" },
  reconciliation: { en: "EOD Reconciliation", ar: "تسوية نهاية اليوم" },
  liveTracking: { en: "Live Tracking", ar: "التتبع المباشر" },
  driverPortal: { en: "Driver Portal", ar: "بوابة المندوب" },
  bringDriverIntoChat: { en: "Bring Driver Into Chat", ar: "إشراك السائق في المحادثة" },
  approveSettlement: { en: "Approve Settlement", ar: "اعتماد التسوية" },
  resolveAndChat: { en: "Resolve & Chat", ar: "حل المشكلة والمحادثة" },
  outForDelivery: { en: "Out for Delivery", ar: "خارج للتوصيل" },
  delivered: { en: "Delivered", ar: "تم التوصيل" },
  incident: { en: "Incident", ar: "مشكلة معلقة" },
  expectedCash: { en: "Expected Cash Today", ar: "النقد المتوقع اليوم" },
  collectedCash: { en: "Collected Cash Today", ar: "النقد المحصل اليوم" },
  discrepancy: { en: "Net Discrepancy", ar: "صافي الفروقات" },
  reconciledDrivers: { en: "Reconciled Drivers", ar: "المناديب المسوين" },
  confirmSettle: { en: "Confirm & Settle", ar: "تأكيد وتسوية" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  reason: { en: "Reason", ar: "السبب" },
  comment: { en: "Comment", ar: "التعليق" },
  proofImage: { en: "Proof Image URL", ar: "رابط صورة الإثبات" },
  submitIncident: { en: "Submit Incident", ar: "إرسال بلاغ المشكلة" },
  clientRefused: { en: "Client Refused", ar: "العميل رفض الاستلام" },
  wrongAddress: { en: "Wrong Address", ar: "عنوان خاطئ" },
  noAnswer: { en: "No Answer", ar: "لا يوجد رد" },
  damaged: { en: "Damaged Goods", ar: "بضاعة تالفة" },
  verifyDeliveryCode: { en: "Verify Delivery Code", ar: "التحقق من رمز التوصيل (OTP)" },
  enterOtp: { en: "Enter 4-Digit OTP", ar: "أدخل رمز التحقق (4 أرقام)" },
  resendOtp: { en: "Resend OTP", ar: "إعادة إرسال الرمز" },
  codeExpiresIn: { en: "Code expires in", ar: "تنتهي صلاحية الرمز خلال" },
  verifyCode: { en: "Verify Code", ar: "تأكيد الرمز" },
  language: { en: "Arabic", ar: "English" },
  feedback: { en: "Customer Feedback", ar: "تقييم العملاء" },
  rating: { en: "Rating", ar: "التقييم" },
  submitFeedback: { en: "Submit Feedback", ar: "إرسال التقييم" },
  languageToggle: { en: "العربية", ar: "English" },
  appTitle: { en: "LogiCore", ar: "لوجي كور" },
  loginTitle: { en: "Welcome back to your workspace", ar: "مرحبًا بعودتك إلى مساحة العمل" },
  loginSubtitle: { en: "Sign in to coordinate your operations and keep your team aligned.", ar: "سجّل الدخول لإدارة العمليات وحفاظ فريقك على التوافق." },
  emailLabel: { en: "Email", ar: "البريد الإلكتروني" },
  passwordLabel: { en: "Password", ar: "كلمة المرور" },
  companyLabel: { en: "Company", ar: "الشركة" },
  signInButton: { en: "Sign in", ar: "تسجيل الدخول" },
  signingInButton: { en: "Signing in...", ar: "جاري تسجيل الدخول..." },
  statusError: { en: "Unable to sign in", ar: "تعذر تسجيل الدخول" },
  statusSuccess: { en: "Done", ar: "تم" },
  ownerMetricRevenue: { en: "Revenue", ar: "الإيرادات" },
  ownerMetricEscalations: { en: "Escalations", ar: "التصعيدات" },
  ownerMetricCoverage: { en: "Coverage", ar: "التغطية" },
  ownerMetricCollections: { en: "Collections", ar: "المبالغ المحصلة" },
  ownerWorkspaceTitle: { en: "Executive Workspace", ar: "مساحة العمل التنفيذية" },
  ownerWorkspaceSubtitle: { en: "Monitor operations, cash flow, and performance from one view.", ar: "تابع العمليات والتدفق النقدي والأداء من واجهة واحدة." },
  ownerEscalationsTitle: { en: "High priority escalations", ar: "التصعيدات ذات الأولوية العالية" },
  ownerEscalationBadge: { en: "Needs attention", ar: "تتطلب اهتمامًا" },
  publicTrackingTitle: { en: "Customer Tracking", ar: "تتبع العميل" },
  publicTrackingSubtitle: { en: "Share delivery progress and collect feedback in one place.", ar: "شارك تقدم التسليم واحصل على التقييمات من مكان واحد." },
  otpLabel: { en: "OTP code", ar: "رمز التحقق" },
  verifyOtpButton: { en: "Verify", ar: "التحقق" },
  feedbackTitle: { en: "Customer feedback", ar: "تقييم العميل" },
  feedbackPrompt: { en: "How was the delivery experience?", ar: "كيف كانت تجربة التسليم؟" },
  ratingLabel: { en: "Rating", ar: "التقييم" },
  reviewLabel: { en: "Review", ar: "المراجعة" },
  submitFeedbackButton: { en: "Submit feedback", ar: "إرسال التقييم" },
  customerServiceWorkspaceTitle: { en: "Customer service workspace", ar: "مساحة خدمة العملاء" },
  customerServiceWorkspaceSubtitle: { en: "Coordinate incidents, evidence, and live collaboration.", ar: "نسّق الشكاوى والأدلة والتعاون المباشر." },
  customerServiceSla: { en: "SLA coverage", ar: "تغطية اتفاقيات الخدمة" },
  customerServiceActiveRoutes: { en: "Active routes", ar: "المسارات النشطة" },
  customerServiceOpenIncidents: { en: "Open incidents", ar: "الحوادث المفتوحة" },
  customerServiceResponseTime: { en: "Avg. response", ar: "متوسط الاستجابة" },
  customerServiceStatusOverview: { en: "Operations status", ar: "حالة العمليات" },
  customerServiceStatusOverviewSubtitle: { en: "Live health of dispatch and support", ar: "الحالة الفورية للتشغيل والدعم" },
  incidentChatTitle: { en: "Incident room", ar: "غرفة المشكلة" },
  incidentInviteDriver: { en: "Driver", ar: "السائق" },
  incidentInviteManager: { en: "Manager", ar: "المدير" },
  incidentChatButton: { en: "Join room", ar: "الانضمام إلى الغرفة" },
  incidentHint: { en: "No messages yet", ar: "لا توجد رسائل بعد" },
  incidentDrawerTitle: { en: "Evidence & details", ar: "الأدلة والتفاصيل" },
  incidentDrawerStatement: { en: "Operational note", ar: "ملاحظة تشغيلية" },
  incidentDrawerAssets: { en: "Proof assets", ar: "أصول الإثبات" },
  accountantWorkspaceTitle: { en: "Accountant workspace", ar: "مساحة عمل المحاسب" },
  accountantWorkspaceSubtitle: { en: "Approve settlements and stage CSV imports quickly.", ar: "اعتمد التسويات وقم بإعداد استيراد CSV بسرعة." },
  approveSettlementButton: { en: "Approve", ar: "اعتماد" },
  csvStageTitle: { en: "CSV staging", ar: "إعداد CSV" },
  csvPlaceholder: { en: "Click or drag CSV file here", ar: "انقر أو اسحب ملف CSV هنا" },
  csvUploadButton: { en: "Stage CSV", ar: "تجهيز CSV" },
  csvStageSuccess: { en: "CSV loaded successfully. Review rows below.", ar: "تم تحميل CSV بنجاح. راجع الصفوف أدناه." },
  csvStageError: { en: "Failed to read CSV file.", ar: "فشل في قراءة ملف CSV." },
  fleetWorkspaceTitle: { en: "Fleet workspace", ar: "مساحة الأسطول" },
  fleetWorkspaceSubtitle: { en: "Coordinate drivers, routing, and delivery communication.", ar: "نسّق السائقين والتوجيه والتواصل في التسليم." },
  fleetMetricOnline: { en: "Online", ar: "متصل" },
  fleetMetricTasks: { en: "Tasks", ar: "المهام" },
  fleetMetricAlerts: { en: "Alerts", ar: "التنبيهات" },
  fleetDirectChat: { en: "Direct chat", ar: "محادثة مباشرة" },
  fleetGroupChat: { en: "Group chat", ar: "محادثة جماعية" },
  departmentsManagementTitle: { en: "Departments management", ar: "إدارة الأقسام" },
  departmentsManagementSubtitle: { en: "Provision branches, warehouses and support teams from one control surface.", ar: "أنشئ الفروع والمستودعات وأقسام الدعم من واجهة تحكم واحدة." },
  departmentsActiveCount: { en: "Active departments", ar: "الأقسام النشطة" },
  departmentsInitializingCount: { en: "Initializing", ar: "قيد التهيئة" },
  departmentNameLabel: { en: "Department name", ar: "اسم القسم" },
  departmentTypeLabel: { en: "Department type", ar: "نوع القسم" },
  departmentTypeWarehouse: { en: "Warehouse", ar: "مستودع" },
  departmentTypeCustomerService: { en: "Customer service", ar: "خدمة العملاء" },
  departmentTypeRegionalHub: { en: "Regional hub", ar: "مركز إقليمي" },
  departmentManagerLabel: { en: "Assigned manager", ar: "المدير المعين" },
  departmentCreateButton: { en: "Create department", ar: "إنشاء قسم" },
  departmentTableName: { en: "Name", ar: "الاسم" },
  departmentTableType: { en: "Type", ar: "النوع" },
  departmentTableManager: { en: "Manager", ar: "المدير" },
  departmentTableRegion: { en: "Region", ar: "المنطقة" },
  departmentTableStatus: { en: "Status", ar: "الحالة" },
  crisisChatRoomsTitle: { en: "Crisis chat rooms", ar: "غرف المحادثات والأزمات" },
  crisisChatRoomsSubtitle: { en: "Coordinate support and executive escalation around live delivery exceptions.", ar: "نسّق الدعم والتصعيد التنفيذي حول الأعطال المباشرة في التوصيل." },
  crisisChatQueue: { en: "Active exception queue", ar: "قائمة الاستثناءات النشطة" },
  crisisChatRoom: { en: "Live room", ar: "الغرفة المباشرة" },
  crisisEscalateButton: { en: "Escalate", ar: "تصعيد" },
  crisisEmptyState: { en: "No active thread selected", ar: "لم يتم اختيار موضوع نشط" },
  crisisInputPlaceholder: { en: "Type your update", ar: "اكتب تحديثك" },
  crisisSendButton: { en: "Send", ar: "إرسال" },
  sidebarDepartments: { en: "Departments Management", ar: "إدارة الأقسام" },
  sidebarCrisisRooms: { en: "Crisis Chat Rooms", ar: "غرف المحادثات والأزمات" },
  loginHeroTitle: { en: "Operational orchestration for logistics, finance and field teams.", ar: "تنسيق تشغيل العمليات للوجستيات والتمويل والفرق الميدانية." },
  loginHeroSubtitle: { en: "Simulate company administration, manager provisioning, live incident rooms and driver-first delivery flows from one interactive prototype.", ar: "محاكاة إدارة الشركة وتوفير المدراء وغرف الحوادث المباشرة وسير التوصيلات من نموذج تفاعلي واحد." },
  loginHeroCardOneTitle: { en: "Departments provisioning", ar: "إعداد الأقسام" },
  loginHeroCardOneBody: { en: "Create hubs, warehouses and CS centers in seconds.", ar: "أنشئ المراكز والمستودعات ومراكز خدمة العملاء في ثوانٍ." },
  loginHeroCardTwoTitle: { en: "Socket-based incident rooms", ar: "غرف الحوادث عبر Socket" },
  loginHeroCardTwoBody: { en: "Support staff and drivers collaborate live with proof uploads.", ar: "يتعاون الدعم والسائقون مباشرة مع إرفاق الأدلة." },
  loginRoleAdminTitle: { en: "Company Owner", ar: "مالك الشركة" },
  loginRoleAdminBody: { en: "Departments, staff provisioning and escalation rooms", ar: "الأقسام وتوفير الموظفين وغرف التصعيد" },
  loginRoleManagerTitle: { en: "Customer Service Department", ar: "قسم خدمة العملاء" },
  loginRoleManagerBody: { en: "Staff provisioning and live ground-trouble chats", ar: "توفير الموظفين ومحادثات المشاكل الأرضية المباشرة" },
  loginRoleAccountantTitle: { en: "Finance Department", ar: "القسم المالي" },
  loginRoleAccountantBody: { en: "EOD reconciliation and driver wallet oversight", ar: "التسوية النهائية ومراجعة محافظ السائقين" },
  loginRoleDriverTitle: { en: "Operation Department", ar: "قسم العمليات" },
  loginRoleDriverBody: { en: "Mobile task simulator with OTP and incident reporting", ar: "محاكاة مهام الهاتف مع OTP وإبلاغ الحوادث" },
  loginFormPreview: { en: "corporate@logicore.com", ar: "corporate@logicore.com" },
  loginFormButton: { en: "Login to Dashboard", ar: "تسجيل الدخول إلى لوحة التحكم" },
  loginSelectedRolePrefix: { en: "Selected role:", ar: "الدور المختار:" },
  loginCorporateLabel: { en: "Corporate email", ar: "البريد الإلكتروني المؤسسي" },
  departments_create: { en: "Create Department", ar: "إنشاء قسم" },
  common_cancel: { en: "Cancel", ar: "إلغاء" },
  common_save: { en: "Save", ar: "حفظ" },
  "role.FINANCE_MANAGER": { en: "Finance Manager", ar: "مدير المالية" },
  "role.FINANCE_AGENT": { en: "Finance Agent", ar: "مندوب المالية" },
  "role.CS_MANAGER": { en: "Customer Service Manager", ar: "مدير خدمة العملاء" },
  "role.CS_AGENT": { en: "Customer Service Agent", ar: "ممثل خدمة العملاء" },
  "role.FLEET_MANAGER": { en: "Fleet Manager", ar: "مدير الأسطول" },
  "role.DRIVER": { en: "Driver", ar: "سائق" },
  "status.CREATED": { en: "Created", ar: "تم الإنشاء" },
  "status.ACTIVE": { en: "Active", ar: "نشط" },
  "status.INACTIVE": { en: "Inactive", ar: "غير نشط" },
  "finance.csv_ingest_title": { en: "Bulk CSV Ingest", ar: "استيراد CSV مجمع" },
  "finance.drag_drop_text": { en: "Drag & Drop CSV file here, or Browse", ar: "اسحب وأفلت ملف CSV هنا، أو تصفح" },
};

interface LanguageContextProps {
  language: Language;
  dir: "ltr" | "rtl";
  toggleLanguage: () => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem("lang") as Language) || "en"
  );
  const dir = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem("lang", language);
    const html = document.documentElement;
    html.setAttribute("lang", language);
    html.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
    
    if (language === "ar") {
      html.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
    } else {
      html.style.fontFamily = "";
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  };

  const t = (key: keyof typeof translations): string => {
    return translations[key]?.[language] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, dir, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
