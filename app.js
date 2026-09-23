const firebaseConfig = {
  apiKey: "AIzaSyBspytMh9FSEc9Fg8rL4bb9W7hQXngiOtA",
  authDomain: "expense-tracker-dfb13.firebaseapp.com",
  projectId: "expense-tracker-dfb13",
  storageBucket: "expense-tracker-dfb13.firebasestorage.app",
  messagingSenderId: "920792166929",
  appId: "1:920792166929:web:88b5fd1bdd2441726377b0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

try {
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
} catch (_) {}

let transactions = [];
let bills = [];
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};
let activeRangeStart = "";
let activeRangeEnd = "";
let deletedTransactionCache = null;
let deleteUndoTimer = null;
let monthlyTrendChart = null;
let categoryExpenseChart = null;
let currentLanguage = localStorage.getItem("language") || "en";
let recurringProcessing = false;
let transactionListExpanded = false;

// AUTH: lock all app info behind Google sign-in. The app shell stays
// hidden until Firebase Auth reports a signed-in user.
if (document.body) document.body.classList.add("auth-locked");

// UI: state for the UI improvements (period toggle, currency, bill calendar,
// transaction list date filter, swipe). heroPeriod is a per-device preference.
let heroPeriod = localStorage.getItem("expense_tracker_hero_period") || "month";
const HERO_PERIODS = ["week", "month", "3months", "6months", "year", "all"];
if (!HERO_PERIODS.includes(heroPeriod)) heroPeriod = "month";
let appCurrency = localStorage.getItem("expense_tracker_currency") || "USD";
let listDateFilter = null;
let billCalendarMonth = getCurrentMonthValue();
let billCalendarSelectedDay = null;
let swipeOpenItem = null;

// AUTH: Google sign-in gate state. No Firestore listener attaches until a
// Firebase user exists; authUid is the single UID allowlisted in the rules.
let authUid = null;
let authListenersStarted = false;
let deviceIdExpanded = false;
let lastSyncWriteErrorAt = 0;

const LOCAL_TRANSACTIONS_KEY = "expense_tracker_cached_transactions_v2";
const LOCAL_BILLS_KEY = "expense_tracker_cached_bills_v1";
const CUSTOM_CATEGORIES_KEY = "expense_tracker_categories_v2";

const DEFAULT_CATEGORIES = [
  "Bills",
  "Entertainment",
  "Food",
  "Freelance",
  "Gas",
  "General",
  "Rent",
  "Salary",
  "Shopping",
  "Other"
];

let customCategories = loadCategories();

const translations = {
  en: {
    eyebrow: "Personal Finance",
    appTitle: "Expense Tracker",
    heroSubtitle: "Track income, expenses, budgets, and trends in one place.",
    toggleTheme: "Toggle Theme",
    currentBalance: "Current Balance",
    income: "Income",
    expenses: "Expenses",
    expense: "Expense",
    addTransaction: "Add Transaction",
    description: "Description",
    amount: "Amount",
    category: "Category",
    newCategory: "New Category",
    addCategory: "Add",
    date: "Date",
    recurring: "Recurring",
    repeatEvery: "Repeat",
    weekly: "Weekly",
    monthly: "Monthly",
    yes: "Yes",
    no: "No",
    notes: "Notes",
    addIncome: "Add Income",
    addExpense: "Add Expense",
    billsReminders: "Bills & Reminders",
    billName: "Bill Name",
    dueDate: "Due Date",
    reminderDays: "Remind Me",
    reminderDaysHelp: "days before due date",
    addBill: "Add Bill",
    upcomingBills: "Upcoming Bills",
    monthlyBillsTotal: "Monthly Bills",
    dueSoon: "Due Soon",
    overdue: "Overdue",
    paidThisMonth: "Paid This Month",
    markPaid: "Mark Paid",
    noBillsFound: "No bills added yet.",
    billSaved: "Bill saved.",
    billDeleted: "Bill deleted.",
    billPaid: "Bill marked paid and added as an expense.",
    invalidBillName: "Please enter a bill name.",
    invalidDueDate: "Please choose a due date.",
    searchFilters: "Search & Filters",
    search: "Search",
    type: "Type",
    all: "All",
    sort: "Sort",
    newest: "Last uploaded → First",
    oldest: "First uploaded → Last",
    highestAmount: "Highest Amount",
    lowestAmount: "Lowest Amount",
    az: "A-Z",
    za: "Z-A",
    clearFilters: "Clear Filters",
    exportCsv: "Export CSV",
    budgetGoals: "Budget Goals",
    budgetAmount: "Budget Amount",
    saveBudget: "Save Budget",
    customRangeSummary: "Custom Range Summary",
    startDate: "Start Date",
    endDate: "End Date",
    applyRange: "Apply Range",
    reset: "Reset",
    net: "Net",
    highestIncome: "Highest Income",
    highestExpense: "Highest Expense",
    monthlySummary: "Monthly Summary",
    chooseMonth: "Choose Month",
    charts: "Charts",
    monthlyTotals: "Monthly Totals",
    expensesByCategory: "Expenses By Category",
    categoryTotals: "Category Totals",
    transactions: "Transactions",
    editTransaction: "Edit Transaction",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    remove: "Remove",
    showingAllTransactions: "Showing all transactions",
    from: "From",
    upTo: "Up to",
    to: "to",
    currentMonth: "Current month",
    noIncomeFound: "No income found",
    noExpenseFound: "No expense found",
    noBudgetGoals: "No budget goals set yet.",
    noCategoryTotals: "No category totals yet.",
    noTransactionsFound: "No transactions found.",
    showAllTransactions: "Show all transactions",
    showLessTransactions: "Show less",
    transactionDeleted: "Transaction deleted.",
    transactionSaved: "Saved.",
    restored: "Transaction restored.",
    undo: "Undo",
    confirmDelete: "Delete this transaction?",
    invalidDescription: "Please enter a description.",
    invalidAmount: "Please enter a valid amount.",
    positiveAmount: "Please enter a positive amount.",
    chooseDate: "Please choose a date.",
    invalidRange: "Start date cannot be after end date.",
    addError: "There was a problem adding the transaction.",
    loadError: "There was a problem loading your transactions.",
    updateError: "There was a problem updating the transaction.",
    deleteError: "There was a problem deleting the transaction.",
    restoreError: "There was a problem restoring the transaction.",
    budgetInvalid: "Please enter a valid budget amount.",
    recurringLabel: "Recurring",
    general: "General",
    food: "Food",
    bills: "Bills",
    gas: "Gas",
    rent: "Rent",
    entertainment: "Entertainment",
    shopping: "Shopping",
    salary: "Salary",
    studio: "Studio",
    other: "Other",
    spent: "Spent",
    remaining: "Remaining",
    overBudgetBy: "Over budget by",
    today: "Today",
    yesterday: "Yesterday",
    at: "at",
    online: "Online",
    offline: "Offline",
    ready: "Ready",
    syncing: "Syncing",
    cachedMode: "Cached mode",
    smartInsights: "Smart Insights",
    spendingChange: "Spending Change",
    topExpenseCategory: "Top Expense Category",
    overBudget: "Over Budget",
    savingsRate: "Savings Rate",
    vsLastMonth: "vs last month",
    noDataYet: "No data yet",
    categoriesOver: "categories over budget",
    ofIncomeSaved: "of income saved",
    categoryExists: "That category already exists.",
    categoryAdded: "Category added.",
    categoryEmpty: "Enter a category name.",
    categoryTooShort: "Category name is too short.",
    deleteCategory: "Delete Category",
    deleteCategoryHelp: "Only custom categories that are not being used can be deleted.",
    noCustomCategories: "No custom categories",
    categoryDeleted: "Category deleted.",
    categoryInUse: "This category is being used by transactions, bills, or budgets. Move or delete those items first.",
    cannotDeleteCategory: "Default categories cannot be deleted.",
    chooseCategoryDelete: "Choose a category to delete.",
    confirmCategoryDelete: "Delete this category?",
    // UI: strings for the UI improvements
    billCalClear: "Clear",
    noBillsThisDay: "No bills due this day.",
    dayActivity: "Day Activity",
    noDayActivity: "No income or expenses recorded this day.",
    swipeEdit: "Edit",
    swipeDelete: "Delete",
    emptyTransactionsTitle: "No transactions yet",
    emptyTransactionsHint: "Add your first transaction to start tracking your money.",
    addFirstTransaction: "Add your first transaction",
    emptyBillsTitle: "No bills yet",
    emptyBillsHint: "Add your first bill so you never miss a due date.",
    addFirstBill: "Add your first bill",
    emptyBudgetsHint: "Use the form above to set your first budget.",
    periodMonth: "Month",
    periodWeek: "Week",
    period3Months: "3 Months",
    period6Months: "6 Months",
    periodYear: "Year",
    periodAllTime: "All Time",
    weekOf: "Week of",
    currency: "Currency",
    upToDate: "Everything is up to date",
    tapToRefresh: "Tap to refresh",
    highestIncomeDay: "Highest Income Day",
    highestExpenseDay: "Highest Expense Day",
    viewDayTransactions: "View transactions for this day",
    signInSubtext: "Sign in to sync your data across devices.",
    signInWithGoogle: "Sign in with Google",
    authFeature1: "Syncs across all your devices",
    authFeature2: "Private to your Google account",
    authFeature3: "Works offline, syncs on reconnect",
    authSecureNote: "Secured by Google sign-in",
    signInError: "Sign-in failed. Please try again.",
    enableGoogleProvider: "Enable Google sign-in in Firebase Console \u2192 Authentication \u2192 Sign-in method, then try again.",
    unauthorizedDomain: "This site\u2019s domain isn\u2019t authorized for sign-in. Add it in Firebase Console \u2192 Authentication \u2192 Settings \u2192 Authorized domains.",
    deviceId: "Device ID",
    deviceIdHint: "This is the ID to paste into your Firestore security rules.",
    tapToShowFull: "Tap to view the full ID and copy it",
    deviceIdCopied: "Device ID copied",
    signOut: "Sign out",
    signedOut: "Signed out",
    notSignedIn: "Not signed in",
    syncWriteError: "Couldn't save to the cloud \u2014 check your connection",
  },
  es: {
    eyebrow: "Finanzas Personales",
    appTitle: "Control de Gastos",
    heroSubtitle: "Controla ingresos, gastos, presupuestos y tendencias en un solo lugar.",
    toggleTheme: "Cambiar Tema",
    currentBalance: "Balance Actual",
    income: "Ingresos",
    expenses: "Gastos",
    expense: "Gasto",
    addTransaction: "Agregar Movimiento",
    description: "Descripción",
    amount: "Cantidad",
    category: "Categoría",
    newCategory: "Nueva Categoría",
    addCategory: "Agregar",
    date: "Fecha",
    recurring: "Recurrente",
    repeatEvery: "Repetir",
    weekly: "Semanal",
    monthly: "Mensual",
    yes: "Sí",
    no: "No",
    notes: "Notas",
    addIncome: "Agregar Ingreso",
    addExpense: "Agregar Gasto",
    billsReminders: "Facturas y Recordatorios",
    billName: "Nombre de Factura",
    dueDate: "Fecha de Pago",
    reminderDays: "Recordarme",
    reminderDaysHelp: "días antes de vencer",
    addBill: "Agregar Factura",
    upcomingBills: "Facturas Próximas",
    monthlyBillsTotal: "Facturas Mensuales",
    dueSoon: "Próximas",
    overdue: "Vencidas",
    paidThisMonth: "Pagadas Este Mes",
    markPaid: "Marcar Pagada",
    noBillsFound: "Todavía no hay facturas.",
    billSaved: "Factura guardada.",
    billDeleted: "Factura eliminada.",
    billPaid: "Factura marcada pagada y agregada como gasto.",
    invalidBillName: "Por favor escribe el nombre de la factura.",
    invalidDueDate: "Por favor elige una fecha de pago.",
    searchFilters: "Búsqueda y Filtros",
    search: "Buscar",
    type: "Tipo",
    all: "Todos",
    sort: "Ordenar",
    newest: "Último subido → Primero",
    oldest: "Primero subido → Último",
    highestAmount: "Cantidad Más Alta",
    lowestAmount: "Cantidad Más Baja",
    az: "A-Z",
    za: "Z-A",
    clearFilters: "Limpiar Filtros",
    exportCsv: "Exportar CSV",
    budgetGoals: "Metas de Presupuesto",
    budgetAmount: "Cantidad del Presupuesto",
    saveBudget: "Guardar Presupuesto",
    customRangeSummary: "Resumen por Rango",
    startDate: "Fecha Inicial",
    endDate: "Fecha Final",
    applyRange: "Aplicar Rango",
    reset: "Restablecer",
    net: "Neto",
    highestIncome: "Ingreso Más Alto",
    highestExpense: "Gasto Más Alto",
    monthlySummary: "Resumen Mensual",
    chooseMonth: "Elegir Mes",
    charts: "Gráficas",
    monthlyTotals: "Totales Mensuales",
    expensesByCategory: "Gastos por Categoría",
    categoryTotals: "Totales por Categoría",
    transactions: "Movimientos",
    editTransaction: "Editar Movimiento",
    cancel: "Cancelar",
    saveChanges: "Guardar Cambios",
    remove: "Quitar",
    showingAllTransactions: "Mostrando todos los movimientos",
    from: "Desde",
    upTo: "Hasta",
    to: "a",
    currentMonth: "Mes actual",
    noIncomeFound: "No se encontraron ingresos",
    noExpenseFound: "No se encontraron gastos",
    noBudgetGoals: "Todavía no hay presupuestos guardados.",
    noCategoryTotals: "Todavía no hay totales por categoría.",
    noTransactionsFound: "No se encontraron movimientos.",
    showAllTransactions: "Ver todos los movimientos",
    showLessTransactions: "Ver menos",
    transactionDeleted: "Movimiento eliminado.",
    transactionSaved: "Guardado.",
    restored: "Movimiento restaurado.",
    undo: "Deshacer",
    confirmDelete: "¿Eliminar este movimiento?",
    invalidDescription: "Por favor escribe una descripción.",
    invalidAmount: "Por favor escribe una cantidad válida.",
    positiveAmount: "Por favor escribe una cantidad positiva.",
    chooseDate: "Por favor elige una fecha.",
    invalidRange: "La fecha inicial no puede ser después de la final.",
    addError: "Hubo un problema al agregar el movimiento.",
    loadError: "Hubo un problema al cargar tus movimientos.",
    updateError: "Hubo un problema al actualizar el movimiento.",
    deleteError: "Hubo un problema al eliminar el movimiento.",
    restoreError: "Hubo un problema al restaurar el movimiento.",
    budgetInvalid: "Por favor escribe una cantidad válida para el presupuesto.",
    recurringLabel: "Recurrente",
    general: "General",
    food: "Comida",
    bills: "Facturas",
    gas: "Gasolina",
    rent: "Renta",
    entertainment: "Entretenimiento",
    shopping: "Compras",
    salary: "Salario",
    studio: "Studio",
    other: "Otro",
    spent: "Gastado",
    remaining: "Restante",
    overBudgetBy: "Pasado del presupuesto por",
    today: "Hoy",
    yesterday: "Ayer",
    at: "a las",
    online: "En línea",
    offline: "Sin internet",
    ready: "Listo",
    syncing: "Sincronizando",
    cachedMode: "Modo caché",
    smartInsights: "Ideas Inteligentes",
    spendingChange: "Cambio en Gastos",
    topExpenseCategory: "Categoría con Más Gasto",
    overBudget: "Sobre Presupuesto",
    savingsRate: "Tasa de Ahorro",
    vsLastMonth: "vs mes pasado",
    noDataYet: "Sin datos todavía",
    categoriesOver: "categorías sobre presupuesto",
    ofIncomeSaved: "de ingresos ahorrados",
    categoryExists: "Esa categoría ya existe.",
    categoryAdded: "Categoría agregada.",
    categoryEmpty: "Escribe un nombre para la categoría.",
    categoryTooShort: "El nombre de la categoría es muy corto.",
    deleteCategory: "Eliminar Categoría",
    deleteCategoryHelp: "Solo puedes eliminar categorías personalizadas que no estén en uso.",
    noCustomCategories: "No hay categorías personalizadas",
    categoryDeleted: "Categoría eliminada.",
    categoryInUse: "Esta categoría se está usando en movimientos, facturas o presupuestos. Mueve o elimina esos datos primero.",
    cannotDeleteCategory: "Las categorías predeterminadas no se pueden eliminar.",
    chooseCategoryDelete: "Elige una categoría para eliminar.",
    confirmCategoryDelete: "¿Eliminar esta categoría?",
    // UI: strings for the UI improvements
    billCalClear: "Limpiar",
    noBillsThisDay: "No hay facturas para este día.",
    dayActivity: "Actividad del día",
    noDayActivity: "Sin ingresos ni gastos registrados este día.",
    swipeEdit: "Editar",
    swipeDelete: "Eliminar",
    emptyTransactionsTitle: "Aún no hay movimientos",
    emptyTransactionsHint: "Agrega tu primer movimiento para empezar a llevar tus cuentas.",
    addFirstTransaction: "Agregar mi primer movimiento",
    emptyBillsTitle: "Aún no hay facturas",
    emptyBillsHint: "Agrega tu primera factura para no olvidar ningún pago.",
    addFirstBill: "Agregar mi primera factura",
    emptyBudgetsHint: "Usa el formulario de arriba para crear tu primer presupuesto.",
    periodMonth: "Mes",
    periodWeek: "Semana",
    period3Months: "3 Meses",
    period6Months: "6 Meses",
    periodYear: "A\u00f1o",
    periodAllTime: "Todo el tiempo",
    weekOf: "Semana del",
    currency: "Moneda",
    upToDate: "Todo está actualizado",
    tapToRefresh: "Toca para actualizar",
    highestIncomeDay: "Día con Mayor Ingreso",
    highestExpenseDay: "Día con Mayor Gasto",
    viewDayTransactions: "Ver los movimientos de este día",
    signInSubtext: "Inicia sesión para sincronizar tus datos en todos tus dispositivos.",
    signInWithGoogle: "Iniciar sesión con Google",
    authFeature1: "Se sincroniza en todos tus dispositivos",
    authFeature2: "Privado para tu cuenta de Google",
    authFeature3: "Funciona sin conexión y se sincroniza al reconectar",
    authSecureNote: "Protegido con inicio de sesión de Google",
    signInError: "Error al iniciar sesión. Inténtalo de nuevo.",
    enableGoogleProvider: "Activa el inicio de sesión con Google en Firebase Console \u2192 Authentication \u2192 Sign-in method e inténtalo de nuevo.",
    unauthorizedDomain: "El dominio de este sitio no est\u00e1 autorizado para iniciar sesi\u00f3n. Agr\u00e9galo en Firebase Console \u2192 Authentication \u2192 Settings \u2192 Authorized domains.",
    deviceId: "ID del dispositivo",
    deviceIdHint: "Este es el ID que debes pegar en tus reglas de seguridad de Firestore.",
    tapToShowFull: "Toca para ver el ID completo y copiarlo",
    deviceIdCopied: "ID del dispositivo copiado",
    signOut: "Cerrar sesión",
    signedOut: "Sesión cerrada",
    notSignedIn: "Sin sesión iniciada",
    syncWriteError: "No se pudo guardar en la nube \u2014 revisa tu conexión",
  }
};

const categoryTranslationKeys = {
  General: "general",
  Food: "food",
  Bills: "bills",
  Gas: "gas",
  Rent: "rent",
  Entertainment: "entertainment",
  Shopping: "shopping",
  Salary: "salary",
  Studio: "studio",
  Other: "other"
};

function t(key) {
  return translations[currentLanguage][key] || key;
}

function isBuiltInCategory(category) {
  return Object.prototype.hasOwnProperty.call(categoryTranslationKeys, category);
}

function translateCategory(category) {
  if (isBuiltInCategory(category)) {
    return t(categoryTranslationKeys[category]);
  }
  return category;
}

function normalizeOtherLabel(category) {
  return String(category || "").trim().toLowerCase() === "other" ? "Other" : String(category || "").trim();
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const incoming = Array.isArray(parsed) ? parsed : [];
    const merged = [...DEFAULT_CATEGORIES];

    incoming.forEach((item) => {
      const cleaned = normalizeOtherLabel(item);
      if (!cleaned) return;
      const exists = merged.some((existing) => existing.toLowerCase() === cleaned.toLowerCase());
      if (!exists) merged.push(cleaned);
    });

    return merged;
  } catch (_) {
    return [...DEFAULT_CATEGORIES];
  }
}

function saveCategories() {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
}

// ---------------------------------------------------------------------------
// SYNC FIX (A + B): cross-device settings sync.
//
// Budgets and custom categories used to live only in localStorage, so every
// device had its own copy. They are now mirrored to Firestore under a shared
// "appmeta" collection. localStorage remains as the offline cache / boot
// fallback; Firestore is the source of truth once its snapshot arrives.
//
// Rules to avoid echo loops:
//  - Snapshot callbacks below NEVER write to Firestore (read-only).
//  - Firestore writes happen only on explicit user actions (or when the
//    transaction listener auto-adds a genuinely new category).
// ---------------------------------------------------------------------------
const appmetaRef = db.collection("appmeta");
const budgetsDocRef = appmetaRef.doc("budgets");
const categoriesDocRef = appmetaRef.doc("categories");
const settingsDocRef = appmetaRef.doc("settings"); // UI: currency sync doc

function persistBudgets() {
  // SYNC FIX: write budgets to the localStorage cache AND Firestore.
  localStorage.setItem("budgets", JSON.stringify(budgets));
  budgetsDocRef.set({ values: budgets }, { merge: true }).catch((error) => reportSyncWriteError(error, "budgets"));
}

function loadBudgets() {
  // SYNC FIX: keep budgets in sync across devices via a realtime listener.
  budgetsDocRef.onSnapshot(
    (doc) => {
      const data = doc.exists ? doc.data() : null;
      if (data && data.values && typeof data.values === "object") {
        budgets = data.values;
        localStorage.setItem("budgets", JSON.stringify(budgets));
        renderBudgetList();
        updateInsights();
      }
    },
    (error) => {
      console.error("Error loading budgets:", error);
    }
  );
}

function persistCategories() {
  // SYNC FIX: write categories to the localStorage cache AND Firestore.
  saveCategories();
  categoriesDocRef.set({ list: customCategories }, { merge: true }).catch((error) => reportSyncWriteError(error, "categories"));
}

function loadCategoriesSync() {
  // SYNC FIX: keep custom categories in sync across devices via a realtime
  // listener. Never writes back from here, so no echo loop is possible.
  categoriesDocRef.onSnapshot(
    (doc) => {
      const data = doc.exists ? doc.data() : null;
      if (data && Array.isArray(data.list)) {
        const merged = [...DEFAULT_CATEGORIES];
        data.list.forEach((item) => {
          const cleaned = normalizeOtherLabel(item);
          if (!cleaned) return;
          const exists = merged.some((existing) => existing.toLowerCase() === cleaned.toLowerCase());
          if (!exists) merged.push(cleaned);
        });
        customCategories = merged;
        saveCategories();
        populateCategorySelects();
        updateUI();
      }
    },
    (error) => {
      console.error("Error loading categories:", error);
    }
  );
}

function sortCategoriesForDisplay(categories) {
  return [...categories].sort((a, b) => {
    const aName = normalizeOtherLabel(a);
    const bName = normalizeOtherLabel(b);

    const aIsOther = aName.toLowerCase() === "other";
    const bIsOther = bName.toLowerCase() === "other";

    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;

    return translateCategory(aName).localeCompare(translateCategory(bName));
  });
}

function populateCategorySelects() {
  const categorySelectIds = ["category", "budgetCategory", "editCategory", "billCategory"];
  const filterSelect = document.getElementById("filterCategory");
  const deleteCategorySelect = document.getElementById("deleteCategorySelect");
  const sortedCategories = sortCategoriesForDisplay(customCategories);

  categorySelectIds.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = "";

    sortedCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = translateCategory(category);
      select.appendChild(option);
    });

    if (currentValue && sortedCategories.includes(currentValue)) {
      select.value = currentValue;
    } else if (sortedCategories.length > 0) {
      select.value = sortedCategories[0];
    }
  });

  if (filterSelect) {
    const currentValue = filterSelect.value;
    filterSelect.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = t("all");
    filterSelect.appendChild(allOption);

    sortedCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = translateCategory(category);
      filterSelect.appendChild(option);
    });

    if (currentValue === "All" || sortedCategories.includes(currentValue)) {
      filterSelect.value = currentValue || "All";
    } else {
      filterSelect.value = "All";
    }
  }

  if (deleteCategorySelect) {
    const currentValue = deleteCategorySelect.value;
    deleteCategorySelect.innerHTML = "";

    const removableCategories = sortedCategories.filter((category) => !isBuiltInCategory(category));
    if (removableCategories.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = t("noCustomCategories");
      deleteCategorySelect.appendChild(option);
      deleteCategorySelect.disabled = true;
    } else {
      deleteCategorySelect.disabled = false;
      removableCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = translateCategory(category);
        deleteCategorySelect.appendChild(option);
      });
      if (currentValue && removableCategories.includes(currentValue)) {
        deleteCategorySelect.value = currentValue;
      }
    }
  }
}


function deleteCustomCategory() {
  const select = document.getElementById("deleteCategorySelect");
  const category = normalizeOtherLabel(select?.value || "");

  if (!category) {
    alert(t("chooseCategoryDelete"));
    return;
  }

  if (isBuiltInCategory(category)) {
    alert(t("cannotDeleteCategory"));
    return;
  }

  const categoryInTransactions = transactions.some(
    (item) => normalizeOtherLabel(item.category).toLowerCase() === category.toLowerCase()
  );

  const categoryInBills = bills.some(
    (item) => normalizeOtherLabel(item.category).toLowerCase() === category.toLowerCase()
  );

  const categoryInBudgets = Object.keys(budgets).some(
    (key) => normalizeOtherLabel(key).toLowerCase() === category.toLowerCase()
  );

  if (categoryInTransactions || categoryInBills || categoryInBudgets) {
    alert(t("categoryInUse"));
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete the category "${category}"?`);
  if (!confirmed) return;

  customCategories = customCategories.filter(
    (item) => normalizeOtherLabel(item).toLowerCase() !== category.toLowerCase()
  );

  persistCategories(); // SYNC FIX: sync the deletion to Firestore too
  populateCategorySelects();
  showToast(t("categoryDeleted"));
  updateUI();
}

function addCustomCategory() {
  const input = document.getElementById("newCategoryInput");
  if (!input) return;

  const rawValue = input.value.trim();

  if (!rawValue) {
    alert(t("categoryEmpty"));
    return;
  }

  if (rawValue.length < 2) {
    alert(t("categoryTooShort"));
    return;
  }

  const normalized = normalizeOtherLabel(
    rawValue
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );

  const exists = customCategories.some(
    (category) => category.toLowerCase() === normalized.toLowerCase()
  );

  if (exists) {
    alert(t("categoryExists"));
    return;
  }

  customCategories.push(normalized);
  persistCategories(); // SYNC FIX: sync the new category to Firestore too
  populateCategorySelects();

  const categorySelect = document.getElementById("category");
  const budgetCategorySelect = document.getElementById("budgetCategory");
  if (categorySelect) categorySelect.value = normalized;
  if (budgetCategorySelect) budgetCategorySelect.value = normalized;

  input.value = "";
  showToast(t("categoryAdded"));
  updateUI();
}

function setSyncBadge(mode) {
  const syncBadge = document.getElementById("syncBadge");
  if (!syncBadge) return;

  syncBadge.className = "status-badge neutral";
  syncBadge.title = t("tapToRefresh"); // UI: the badge is tappable to refresh
  // AUTH: include this device's UID in the tooltip so it can be copied into rules.
  if (authUid) syncBadge.title += `\n${t("deviceId")}: ${authUid}`;

  if (mode === "syncing") {
    syncBadge.textContent = t("syncing");
  } else if (mode === "cached") {
    syncBadge.textContent = t("cachedMode");
  } else {
    syncBadge.textContent = t("ready");
  }
}

function updateConnectionBadge() {
  const badge = document.getElementById("connectionBadge");
  if (!badge) return;

  if (navigator.onLine) {
    badge.textContent = t("online");
    badge.className = "status-badge online";
  } else {
    badge.textContent = t("offline");
    badge.className = "status-badge offline";
  }
}

// ============================================================
// AUTH: Google sign-in gate. Every Firestore listener and every
// Firestore write below only runs after Firebase Auth reports a
// signed-in user. The Google session persists across reloads via
// Firebase's default persistence, so sign-in is a one-time step per
// device and the same UID works everywhere.
// ============================================================
function ensureAuthenticated() {
  // Handle the return leg of a redirect-based sign-in, if one happened.
  firebase.auth().getRedirectResult().catch((error) => {
    console.error("Redirect sign-in error:", error);
    showToast(t("signInError"));
  });
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      authUid = user.uid;
      document.body.classList.remove("auth-locked");
      hideSignInOverlay();
      updateDeviceIdUI();
      startFirestoreListeners();
    } else {
      authUid = null;
      clearLockedData();
      document.body.classList.add("auth-locked");
      updateDeviceIdUI();
      showSignInOverlay();
    }
  });
}

function startFirestoreListeners() {
  // AUTH: single gate — nothing here runs before a user exists.
  if (authListenersStarted) return;
  authListenersStarted = true;
  loadCachedTransactions();
  loadCachedBills();
  loadTransactions();
  loadBills();
  loadBudgets();
  loadCategoriesSync();
  loadCurrencySync();
}

// AUTH: wipe rendered data when the session ends so no info lingers
// behind the sign-in gate.
function clearLockedData() {
  transactions = [];
  bills = [];
  const list = document.getElementById("list");
  if (list) list.innerHTML = "";
  const billsList = document.getElementById("billsList");
  if (billsList) billsList.innerHTML = "";
}

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
    // Success is handled by the onAuthStateChanged listener.
  } catch (error) {
    if (error && (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user")) {
      // Popups blocked (common in embedded webviews): fall back to a
      // full-page redirect; getRedirectResult() on the next boot completes it.
      try {
        await firebase.auth().signInWithRedirect(provider);
      } catch (redirectError) {
        handleSignInError(redirectError);
      }
    } else {
      handleSignInError(error);
    }
  }
}

function handleSignInError(error) {
  console.error("Google sign-in failed:", error);
  if (error && error.code === "auth/operation-not-allowed") {
    showToast(t("enableGoogleProvider"));
  } else if (error && error.code === "auth/unauthorized-domain") {
    showToast(t("unauthorizedDomain"));
  } else {
    showToast(t("signInError"));
  }
  setSyncBadge("cached");
}

function signOut() {
  firebase.auth().signOut().then(() => {
    showToast(t("signedOut"));
    // onAuthStateChanged(null) brings the sign-in overlay back.
  }).catch((error) => {
    console.error("Sign-out failed:", error);
    showToast(t("signInError"));
  });
}

function showSignInOverlay() {
  let overlay = document.getElementById("authOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    return;
  }
  overlay = document.createElement("div");
  overlay.id = "authOverlay";
  overlay.className = "auth-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const card = document.createElement("div");
  card.className = "auth-card";

  const brand = document.createElement("div");
  brand.className = "auth-brand";
  const logo = document.createElement("img");
  logo.className = "auth-logo-img";
  logo.src = "Logo.PNG";
  logo.alt = "Expense Tracker logo";
  const eyebrow = document.createElement("p");
  eyebrow.className = "auth-eyebrow";
  eyebrow.setAttribute("data-i18n", "eyebrow");
  eyebrow.textContent = t("eyebrow");
  brand.appendChild(logo);
  brand.appendChild(eyebrow);

  const title = document.createElement("h2");
  title.className = "auth-title";
  title.setAttribute("data-i18n", "appTitle");
  title.textContent = t("appTitle");

  const sub = document.createElement("p");
  sub.className = "auth-sub";
  sub.setAttribute("data-i18n", "signInSubtext");
  sub.textContent = t("signInSubtext");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "googleSignInBtn";
  btn.className = "auth-google-btn";
  const g = document.createElement("span");
  g.className = "auth-google-g";
  g.setAttribute("aria-hidden", "true");
  g.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/></svg>';
  const label = document.createElement("span");
  label.setAttribute("data-i18n", "signInWithGoogle");
  label.textContent = t("signInWithGoogle");
  btn.appendChild(g);
  btn.appendChild(label);
  btn.addEventListener("click", signInWithGoogle);

  const features = document.createElement("ul");
  features.className = "auth-features";
  ["authFeature1", "authFeature2", "authFeature3"].forEach((key) => {
    const li = document.createElement("li");
    const check = document.createElement("span");
    check.className = "auth-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "\u2713";
    const text = document.createElement("span");
    text.setAttribute("data-i18n", key);
    text.textContent = t(key);
    li.appendChild(check);
    li.appendChild(text);
    features.appendChild(li);
  });

  const secure = document.createElement("p");
  secure.className = "auth-secure-note";
  const secureText = document.createElement("span");
  secureText.setAttribute("data-i18n", "authSecureNote");
  secureText.textContent = t("authSecureNote");
  secure.appendChild(secureText);

  card.appendChild(brand);
  card.appendChild(title);
  card.appendChild(sub);
  card.appendChild(btn);
  card.appendChild(features);
  card.appendChild(secure);
  overlay.appendChild(card);
  document.body.prepend(overlay);
}

function hideSignInOverlay() {
  document.getElementById("authOverlay")?.classList.add("hidden");
}

// AUTH: surface background sync-write failures (budgets / categories /
// currency / recurring generation) with the existing toast instead of a
// silent console.error. Rate-limited so a flaky connection doesn't spam.
function reportSyncWriteError(error, context) {
  console.error(`Error syncing ${context}:`, error);
  const now = Date.now();
  if (now - lastSyncWriteErrorAt < 30000) return;
  lastSyncWriteErrorAt = now;
  showToast(t("syncWriteError"));
}

function truncateUid(uid) {
  if (!uid || uid.length <= 12) return uid || "";
  return `${uid.slice(0, 6)}\u2026${uid.slice(-4)}`;
}

// AUTH: device-ID card at the bottom of the Insights tab. Shows the signed-in
// Google UID (truncated); tapping reveals the full UID and copies it for the
// rules page. Includes a sign-out button.
function buildDeviceIdCard() {
  const anchor = document.getElementById("categoryTotalsList")?.closest("section");
  if (!anchor || document.getElementById("deviceIdCard")) return;
  const card = document.createElement("section");
  card.className = "card insights-card fade-in";
  card.id = "deviceIdCard";
  const header = document.createElement("div");
  header.className = "section-header";
  const title = document.createElement("h3");
  title.setAttribute("data-i18n", "deviceId");
  title.textContent = t("deviceId");
  header.appendChild(title);
  const row = document.createElement("div");
  row.className = "device-id-row";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "deviceIdBtn";
  btn.className = "device-id-btn";
  const value = document.createElement("span");
  value.id = "deviceIdValue";
  value.textContent = "\u2026";
  btn.appendChild(value);
  btn.addEventListener("click", () => {
    if (!authUid) return;
    deviceIdExpanded = !deviceIdExpanded;
    value.textContent = deviceIdExpanded ? authUid : truncateUid(authUid);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(authUid).then(
        () => showToast(t("deviceIdCopied")),
        () => showToast(authUid)
      );
    } else {
      showToast(authUid);
    }
  });
  const signOutBtn = document.createElement("button");
  signOutBtn.type = "button";
  signOutBtn.id = "signOutBtn";
  signOutBtn.className = "device-id-signout";
  signOutBtn.setAttribute("data-i18n", "signOut");
  signOutBtn.textContent = t("signOut");
  signOutBtn.addEventListener("click", signOut);
  row.appendChild(btn);
  row.appendChild(signOutBtn);
  const hint = document.createElement("p");
  hint.className = "device-id-hint";
  hint.setAttribute("data-i18n", "deviceIdHint");
  hint.textContent = t("deviceIdHint");
  card.appendChild(header);
  card.appendChild(row);
  card.appendChild(hint);
  anchor.after(card);
}

function updateDeviceIdUI() {
  const value = document.getElementById("deviceIdValue");
  if (value) value.textContent = authUid ? (deviceIdExpanded ? authUid : truncateUid(authUid)) : t("notSignedIn");
  const btn = document.getElementById("deviceIdBtn");
  if (btn) btn.title = t("tapToShowFull");
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) signOutBtn.style.display = authUid ? "" : "none";
  // Keep the sync badge tooltip in sync (setSyncBadge also appends it).
  const syncBadge = document.getElementById("syncBadge");
  if (syncBadge && authUid) syncBadge.title = `${t("tapToRefresh")}\n${t("deviceId")}: ${authUid}`;
}

function showToast(message, showUndo = false) {
  const toast = document.getElementById("toast");
  const undoBtn = document.getElementById("undoDeleteBtn");
  const toastMessage = document.getElementById("toastMessage");
  if (!toast || !undoBtn || !toastMessage) return;

  toastMessage.textContent = message;

  if (showUndo) {
    undoBtn.classList.remove("hidden");
    undoBtn.textContent = t("undo");
  } else {
    undoBtn.classList.add("hidden");
  }

  toast.classList.remove("hidden");

  if (deleteUndoTimer) clearTimeout(deleteUndoTimer);
  deleteUndoTimer = setTimeout(() => {
    toast.classList.add("hidden");
    if (showUndo) deletedTransactionCache = null;
  }, 4000);
}

function setPlaceholders() {
  const desc = document.getElementById("desc");
  const amount = document.getElementById("amount");
  const notes = document.getElementById("notes");
  const searchInput = document.getElementById("searchInput");
  const budgetAmount = document.getElementById("budgetAmount");
  const newCategoryInput = document.getElementById("newCategoryInput");
  const billName = document.getElementById("billName");
  const billAmount = document.getElementById("billAmount");
  const billNotes = document.getElementById("billNotes");

  if (desc) desc.placeholder = currentLanguage === "en" ? "Paycheck, Groceries, Gas..." : "Cheque, Compra, Gasolina...";
  if (amount) amount.placeholder = "0.00";
  if (notes) notes.placeholder = currentLanguage === "en" ? "Optional notes..." : "Notas opcionales...";
  if (searchInput) searchInput.placeholder =
    currentLanguage === "en"
      ? "Search description, notes, category..."
      : "Buscar descripción, notas, categoría...";
  if (budgetAmount) budgetAmount.placeholder = "0.00";
  if (newCategoryInput) newCategoryInput.placeholder = "";
  if (billName) billName.placeholder = currentLanguage === "en" ? "Rent, Phone, Car insurance..." : "Renta, Teléfono, Seguro...";
  if (billAmount) billAmount.placeholder = "0.00";
  if (billNotes) billNotes.placeholder = currentLanguage === "en" ? "Optional reminder notes..." : "Notas opcionales...";
  if (billName) billName.placeholder = currentLanguage === "en" ? "Rent, Phone, Car insurance..." : "Renta, Teléfono, Seguro...";
  if (billAmount) billAmount.placeholder = "0.00";
  if (billNotes) billNotes.placeholder = currentLanguage === "en" ? "Optional reminder notes..." : "Notas opcionales...";
}

function translateStaticText() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  const languageToggleBtn = document.getElementById("languageToggleBtn");
  if (languageToggleBtn) {
    languageToggleBtn.textContent = currentLanguage === "en" ? "ES" : "EN";
  }

  setPlaceholders();
  updateConnectionBadge();
  setSyncBadge(navigator.onLine ? "ready" : "cached");
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}
// ---------------------------------------------------------------------------
// UI: currency setting.
//
// Every amount rendered in the app goes through formatCurrency(), so picking
// a currency updates the hero, lists, budgets, insights and chart tooltips
// automatically. The CSV export keeps plain numbers via formatMoney() because
// that is friendlier for spreadsheets. The choice syncs across devices through
// the appmeta/settings doc (same pattern as budgets/categories): localStorage
// is the offline cache, Firestore is the source of truth, and writes happen
// only when the user changes the picker.
// ---------------------------------------------------------------------------
const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "MXN", "COP", "ARS", "CLP", "PEN", "CAD", "BRL", "JPY", "CHF"];
const CURRENCY_KEY = "expense_tracker_currency";

function formatCurrency(value) {
  const numeric = Number(value || 0);
  const code = SUPPORTED_CURRENCIES.includes(appCurrency) ? appCurrency : "USD";
  try {
    return new Intl.NumberFormat(currentLanguage === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: code
    }).format(numeric);
  } catch (_) {
    return `${code} ${formatMoney(numeric)}`;
  }
}

function persistCurrency() {
  localStorage.setItem(CURRENCY_KEY, appCurrency);
  settingsDocRef.set({ currency: appCurrency }, { merge: true }).catch((error) => reportSyncWriteError(error, "currency"));
}

function loadCurrencySync() {
  // Read-only snapshot callback — never writes back, so no echo loop.
  settingsDocRef.onSnapshot(
    (doc) => {
      const data = doc.exists ? doc.data() : null;
      if (data && typeof data.currency === "string" && SUPPORTED_CURRENCIES.includes(data.currency)) {
        if (data.currency !== appCurrency) {
          appCurrency = data.currency;
          localStorage.setItem(CURRENCY_KEY, appCurrency);
          syncCurrencySelect();
          updateUI();
        }
      }
    },
    (error) => {
      console.error("Error loading currency:", error);
    }
  );
}

function formatDate(timestamp) {
  // SYNC FIX: day-timestamps are UTC midnights; format them in UTC so every
  // device shows the same date regardless of its timezone.
  if (!timestamp) return "";
  return new Date(Number(timestamp)).toLocaleDateString(
    currentLanguage === "es" ? "es-ES" : undefined,
    { timeZone: "UTC" }
  );
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  return new Date(Number(timestamp)).toLocaleTimeString(
    currentLanguage === "es" ? "es-ES" : undefined,
    { hour: "numeric", minute: "2-digit" }
  );
}

function formatDateTime(timestamp) {
  // Displays an exact instant (createdAt); keeps local date+time rendering so
  // e.g. "added at 11:40 PM" reads exactly as before on every device.
  if (!timestamp) return "";
  const datePart = new Date(Number(timestamp)).toLocaleDateString(
    currentLanguage === "es" ? "es-ES" : undefined
  );
  return `${datePart} ${t("at")} ${formatTime(timestamp)}`;
}

function formatDateForInput(timestamp) {
  // SYNC FIX: read the UTC day back out of a UTC-midnight day-timestamp.
  const date = new Date(Number(timestamp));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(monthValue) {
  // SYNC FIX: build the label date in UTC for cross-device consistency.
  if (!monthValue) return t("currentMonth");
  const [year, month] = monthValue.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString(
    currentLanguage === "es" ? "es-ES" : undefined,
    { month: "long", year: "numeric", timeZone: "UTC" }
  );
}

function getCurrentMonthValue() {
  // SYNC FIX: the "current month" key is UTC-based so it matches on devices
  // in any timezone.
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getTodayInputValue() {
  // SYNC FIX: "today" is the UTC date so it is the same key on every device.
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function getStartOfDay(dateString) {
  // SYNC FIX: day boundaries are UTC midnights, so every device computes the
  // identical timestamp for the same "YYYY-MM-DD" date.
  if (!dateString) return NaN;
  const parts = String(dateString).split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return NaN;
  return Date.UTC(year, month - 1, day);
}

function getEndOfDay(dateString) {
  // SYNC FIX: last millisecond of the UTC day.
  const start = getStartOfDay(dateString);
  return Number.isNaN(start) ? NaN : start + 86400000 - 1;
}

function addDays(timestamp, days) {
  // SYNC FIX: UTC date math keeps UTC-midnight timestamps exact across DST.
  const date = new Date(Number(timestamp));
  date.setUTCDate(date.getUTCDate() + days);
  return date.getTime();
}

function addMonths(timestamp, months) {
  // SYNC FIX: UTC month math keeps UTC-midnight timestamps exact.
  const date = new Date(Number(timestamp));
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() < day) {
    date.setUTCDate(0);
  }
  return date.getTime();
}

function getDayKey(timestamp) {
  // SYNC FIX: the day key is the UTC calendar day of the timestamp.
  const date = new Date(Number(timestamp));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayLabel(timestamp) {
  // SYNC FIX: compare UTC day keys so "Today"/"Yesterday" agree on all devices.
  const now = new Date();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayKey = getDayKey(todayUtcMidnight);
  const yesterdayKey = getDayKey(todayUtcMidnight - 86400000);
  const dateKey = getDayKey(timestamp);

  if (dateKey === todayKey) return t("today");
  if (dateKey === yesterdayKey) return t("yesterday");

  return new Date(Number(timestamp)).toLocaleDateString(currentLanguage === "es" ? "es-ES" : undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function getChartColors() {
  const styles = getComputedStyle(document.body);
  return {
    text: styles.getPropertyValue("--text").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    grid: styles.getPropertyValue("--chart-grid").trim(),
    income: styles.getPropertyValue("--chart-income").trim(),
    expense: styles.getPropertyValue("--chart-expense").trim(),
    pie: [
      styles.getPropertyValue("--chart-pie-1").trim(),
      styles.getPropertyValue("--chart-pie-2").trim(),
      styles.getPropertyValue("--chart-pie-3").trim(),
      styles.getPropertyValue("--chart-pie-4").trim(),
      styles.getPropertyValue("--chart-pie-5").trim(),
      styles.getPropertyValue("--chart-pie-6").trim(),
      styles.getPropertyValue("--chart-pie-7").trim(),
      styles.getPropertyValue("--chart-pie-8").trim()
    ]
  };
}

function clearInputs() {
  const sorted = sortCategoriesForDisplay(customCategories);
  const categorySelect = document.getElementById("category");
  const desc = document.getElementById("desc");
  const amount = document.getElementById("amount");
  const notes = document.getElementById("notes");
  const transactionDate = document.getElementById("transactionDate");
  const isRecurring = document.getElementById("isRecurring");
  const recurringInterval = document.getElementById("recurringInterval");

  if (desc) desc.value = "";
  if (amount) amount.value = "";
  if (categorySelect) categorySelect.value = sorted[0] || "Bills";
  if (notes) notes.value = "";
  if (transactionDate) transactionDate.value = getTodayInputValue();
  if (isRecurring) isRecurring.value = "false";
  if (recurringInterval) recurringInterval.value = "monthly";
}

function validateTransaction(desc, amountValue, dateValue) {
  const cleanDesc = desc.trim();
  const numericAmount = Number(amountValue);

  if (!cleanDesc) {
    alert(t("invalidDescription"));
    return false;
  }

  if (amountValue === "" || Number.isNaN(numericAmount)) {
    alert(t("invalidAmount"));
    return false;
  }

  if (numericAmount < 0) {
    alert(t("positiveAmount"));
    return false;
  }

  if (!dateValue) {
    alert(t("chooseDate"));
    return false;
  }

  return true;
}

function toggleSection(sectionId, button) {
  const content = document.getElementById(sectionId);
  if (!content || !button) return;

  const isOpen = content.classList.contains("open");
  content.classList.toggle("open", !isOpen);
  button.classList.toggle("open", !isOpen);
}

function normalizeTransaction(docId, data) {
  const fallbackTimestamp = data.createdAt || data.timestamp || Date.now();
  const category = normalizeOtherLabel(data.category || "General");

  return {
    id: docId,
    ...data,
    category,
    timestamp: Number(data.timestamp || fallbackTimestamp),
    createdAt: Number(data.createdAt || fallbackTimestamp),
    updatedAt: Number(data.updatedAt || fallbackTimestamp),
    recurring: Boolean(data.recurring),
    recurringInterval: data.recurringInterval || "monthly",
    recurringGenerated: Boolean(data.recurringGenerated),
    generatedFromBaseId: data.generatedFromBaseId || null,
    generatedForDate: data.generatedForDate || null
  };
}

function cacheTransactionsLocally() {
  localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
}

function loadCachedTransactions() {
  try {
    const raw = localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    transactions = parsed.map((item) => normalizeTransaction(item.id || `local-${Math.random()}`, item));
    setSyncBadge("cached");
    updateUI();
  } catch (_) {}
}

async function loadTransactions() {
  setSyncBadge("syncing");

  db.collection("transactions").onSnapshot(
    async (snapshot) => {
      transactions = [];
      snapshot.forEach((doc) => {
        transactions.push(normalizeTransaction(doc.id, doc.data()));
      });

      let categoriesChanged = false;
      transactions.forEach((transaction) => {
        const category = normalizeOtherLabel(transaction.category);
        const exists = customCategories.some((item) => item.toLowerCase() === category.toLowerCase());
        if (category && !exists) {
          customCategories.push(category);
          categoriesChanged = true;
        }
      });

      customCategories = sortCategoriesForDisplay(customCategories);
      // SYNC FIX: push genuinely new categories (learned from synced
      // transactions) to Firestore as well; skip the write when nothing
      // changed so snapshots stay quiet.
      if (categoriesChanged) {
        persistCategories();
      } else {
        saveCategories();
      }
      cacheTransactionsLocally();
      populateCategorySelects();

      await processRecurringTransactions();

      setSyncBadge(navigator.onLine ? "ready" : "cached");
      updateUI();
    },
    (error) => {
      console.error("Error loading transactions:", error);
      setSyncBadge("cached");
      alert(t("loadError"));
    }
  );
}

function addTransaction(type) {
  const desc = document.getElementById("desc")?.value.trim() || "";
  const amountValue = document.getElementById("amount")?.value || "";
  const category = normalizeOtherLabel(document.getElementById("category")?.value || "General");
  const notes = document.getElementById("notes")?.value.trim() || "";
  const transactionDate = document.getElementById("transactionDate")?.value || "";
  const isRecurring = document.getElementById("isRecurring")?.value === "true";
  const recurringInterval = document.getElementById("recurringInterval")?.value || "monthly";
  const now = Date.now();

  if (!validateTransaction(desc, amountValue, transactionDate)) return;

  setSyncBadge("syncing");

  db.collection("transactions")
    .add({
      type,
      desc,
      amount: Number(amountValue),
      category,
      notes,
      recurring: isRecurring,
      recurringInterval,
      recurringGenerated: false,
      timestamp: getStartOfDay(transactionDate),
      createdAt: now,
      updatedAt: now
    })
    .then(() => {
      clearInputs();
      showToast(t("transactionSaved"));
    })
    .catch((error) => {
      console.error("Error adding transaction:", error);
      alert(t("addError"));
    });
}

function addIncome() {
  addTransaction("Income");
}

function addExpense() {
  addTransaction("Expense");
}

function deleteTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  deletedTransactionCache = { ...transaction };

  db.collection("transactions")
    .doc(id)
    .delete()
    .then(() => {
      showToast(t("transactionDeleted"), true);
    })
    .catch((error) => {
      console.error("Error deleting transaction:", error);
      alert(t("deleteError"));
    });
}

function undoDelete() {
  if (!deletedTransactionCache) return;

  const copy = { ...deletedTransactionCache };
  delete copy.id;

  db.collection("transactions")
    .add(copy)
    .then(() => {
      deletedTransactionCache = null;
      const toast = document.getElementById("toast");
      if (toast) toast.classList.add("hidden");
      showToast(t("restored"));
    })
    .catch((error) => {
      console.error("Error restoring transaction:", error);
      alert(t("restoreError"));
    });
}

function openEditModal(transaction) {
  populateCategorySelects();

  const editId = document.getElementById("editId");
  const editDesc = document.getElementById("editDesc");
  const editAmount = document.getElementById("editAmount");
  const editCategory = document.getElementById("editCategory");
  const editDate = document.getElementById("editDate");
  const editRecurring = document.getElementById("editRecurring");
  const editRecurringInterval = document.getElementById("editRecurringInterval");
  const editNotes = document.getElementById("editNotes");
  const editModal = document.getElementById("editModal");

  if (editId) editId.value = transaction.id;
  if (editDesc) editDesc.value = transaction.desc || "";
  if (editAmount) editAmount.value = transaction.amount || "";
  if (editCategory) editCategory.value = transaction.category || "General";
  if (editDate) editDate.value = formatDateForInput(transaction.timestamp);
  if (editRecurring) editRecurring.value = transaction.recurring ? "true" : "false";
  if (editRecurringInterval) editRecurringInterval.value = transaction.recurringInterval || "monthly";
  if (editNotes) editNotes.value = transaction.notes || "";
  if (editModal) editModal.classList.remove("hidden");
}

function closeEditModal() {
  const editModal = document.getElementById("editModal");
  if (editModal) editModal.classList.add("hidden");
}

function saveEditTransaction() {
  const id = document.getElementById("editId")?.value || "";
  const desc = document.getElementById("editDesc")?.value.trim() || "";
  const amountValue = document.getElementById("editAmount")?.value || "";
  const category = normalizeOtherLabel(document.getElementById("editCategory")?.value || "General");
  const dateValue = document.getElementById("editDate")?.value || "";
  const recurring = document.getElementById("editRecurring")?.value === "true";
  const recurringInterval = document.getElementById("editRecurringInterval")?.value || "monthly";
  const notes = document.getElementById("editNotes")?.value.trim() || "";

  if (!validateTransaction(desc, amountValue, dateValue)) return;

  setSyncBadge("syncing");

  db.collection("transactions")
    .doc(id)
    .update({
      desc,
      amount: Number(amountValue),
      category,
      notes,
      recurring,
      recurringInterval,
      timestamp: getStartOfDay(dateValue),
      updatedAt: Date.now()
    })
    .then(() => {
      closeEditModal();
      showToast(t("transactionSaved"));
    })
    .catch((error) => {
      console.error("Error updating transaction:", error);
      alert(t("updateError"));
    });
}

function getFilteredTransactions() {
  const searchTerm = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const filterType = document.getElementById("filterType")?.value || "All";
  const filterCategory = document.getElementById("filterCategory")?.value || "All";
  const sortOption = document.getElementById("sortOption")?.value || "newest";

  let result = [...transactions];

  // UI: drill-down from insights filters the list to a single day.
  if (listDateFilter) {
    result = result.filter((transaction) => getDayKey(transaction.timestamp) === listDateFilter);
  }

  result = result.filter((transaction) => {
    const matchesSearch =
      !searchTerm ||
      (transaction.desc || "").toLowerCase().includes(searchTerm) ||
      (transaction.notes || "").toLowerCase().includes(searchTerm) ||
      (transaction.category || "").toLowerCase().includes(searchTerm) ||
      translateCategory(transaction.category || "").toLowerCase().includes(searchTerm) ||
      formatDateTime(transaction.createdAt).toLowerCase().includes(searchTerm);

    const matchesType = filterType === "All" || transaction.type === filterType;
    const matchesCategory = filterCategory === "All" || transaction.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  result.sort((a, b) => {
    if (sortOption === "newest") return Number(b.createdAt) - Number(a.createdAt);
    if (sortOption === "oldest") return Number(a.createdAt) - Number(b.createdAt);
    if (sortOption === "highest") return Number(b.amount) - Number(a.amount);
    if (sortOption === "lowest") return Number(a.amount) - Number(b.amount);
    if (sortOption === "az") return (a.desc || "").localeCompare(b.desc || "");
    if (sortOption === "za") return (b.desc || "").localeCompare(a.desc || "");
    return Number(b.createdAt) - Number(a.createdAt);
  });

  return result;
}

function groupTransactionsByDay(items) {
  const groups = [];
  let currentGroup = null;

  items.forEach((transaction) => {
    const dayKey = getDayKey(transaction.timestamp);

    if (!currentGroup || currentGroup.dayKey !== dayKey) {
      currentGroup = {
        dayKey,
        label: getDayLabel(transaction.timestamp),
        items: []
      };
      groups.push(currentGroup);
    }

    currentGroup.items.push(transaction);
  });

  return groups;
}

function getTransactionsInRange(startDate, endDate) {
  return transactions.filter((transaction) => {
    const timestamp = Number(transaction.timestamp);
    if (startDate && timestamp < getStartOfDay(startDate)) return false;
    if (endDate && timestamp > getEndOfDay(endDate)) return false;
    return true;
  });
}

function getTransactionsForMonth(monthValue) {
  // SYNC FIX: month boundaries in UTC so every device selects the same set.
  const [year, month] = monthValue.split("-");
  const start = Date.UTC(Number(year), Number(month) - 1, 1);
  const end = Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999);

  return transactions.filter((transaction) => {
    const timestamp = Number(transaction.timestamp);
    return timestamp >= start && timestamp <= end;
  });
}

function calculateSummaryData(items) {
  let income = 0;
  let expenses = 0;
  let highestIncome = null;
  let highestExpense = null;

  items.forEach((transaction) => {
    const amount = Number(transaction.amount);

    if (transaction.type === "Income") {
      income += amount;
      if (!highestIncome || amount > Number(highestIncome.amount)) {
        highestIncome = transaction;
      }
    } else {
      expenses += amount;
      if (!highestExpense || amount > Number(highestExpense.amount)) {
        highestExpense = transaction;
      }
    }
  });

  return {
    income,
    expenses,
    net: income - expenses,
    highestIncome,
    highestExpense
  };
}

function applySummaryToElements(summary, ids) {
  const incomeEl = document.getElementById(ids.income);
  const expensesEl = document.getElementById(ids.expenses);
  const netEl = document.getElementById(ids.net);
  const highestIncomeEl = document.getElementById(ids.highestIncome);
  const highestIncomeDateEl = document.getElementById(ids.highestIncomeDate);
  const highestExpenseEl = document.getElementById(ids.highestExpense);
  const highestExpenseDateEl = document.getElementById(ids.highestExpenseDate);

  if (incomeEl) incomeEl.textContent = formatCurrency(summary.income); // UI
  if (expensesEl) expensesEl.textContent = formatCurrency(summary.expenses); // UI

  if (netEl) {
    netEl.textContent = formatCurrency(summary.net); // UI
    netEl.classList.remove("net-positive", "net-negative");
    netEl.classList.add(summary.net >= 0 ? "net-positive" : "net-negative");
  }

  if (highestIncomeEl && highestIncomeDateEl) {
    if (summary.highestIncome) {
      highestIncomeEl.textContent = `${summary.highestIncome.desc} — ${formatCurrency(summary.highestIncome.amount)}`; // UI
      highestIncomeDateEl.textContent = formatDateTime(summary.highestIncome.createdAt);
    } else {
      highestIncomeEl.textContent = "None";
      highestIncomeDateEl.textContent = t("noIncomeFound");
    }
  }

  if (highestExpenseEl && highestExpenseDateEl) {
    if (summary.highestExpense) {
      highestExpenseEl.textContent = `${summary.highestExpense.desc} — ${formatCurrency(summary.highestExpense.amount)}`; // UI
      highestExpenseDateEl.textContent = formatDateTime(summary.highestExpense.createdAt);
    } else {
      highestExpenseEl.textContent = "None";
      highestExpenseDateEl.textContent = t("noExpenseFound");
    }
  }
}

function applyRangeSummary() {
  const startValue = document.getElementById("rangeStart")?.value || "";
  const endValue = document.getElementById("rangeEnd")?.value || "";

  if (startValue && endValue && getStartOfDay(startValue) > getEndOfDay(endValue)) {
    alert(t("invalidRange"));
    return;
  }

  activeRangeStart = startValue;
  activeRangeEnd = endValue;
  updateRangeSummary();
}

function resetRangeSummary() {
  activeRangeStart = "";
  activeRangeEnd = "";

  const rangeStart = document.getElementById("rangeStart");
  const rangeEnd = document.getElementById("rangeEnd");
  if (rangeStart) rangeStart.value = "";
  if (rangeEnd) rangeEnd.value = "";

  updateRangeSummary();
}

function updateRangeSummary() {
  const labelEl = document.getElementById("selectedRangeLabel");
  const summary = calculateSummaryData(getTransactionsInRange(activeRangeStart, activeRangeEnd));

  if (labelEl) {
    if (activeRangeStart && activeRangeEnd) {
      labelEl.textContent = `${activeRangeStart} ${t("to")} ${activeRangeEnd}`;
    } else if (activeRangeStart) {
      labelEl.textContent = `${t("from")} ${activeRangeStart}`;
    } else if (activeRangeEnd) {
      labelEl.textContent = `${t("upTo")} ${activeRangeEnd}`;
    } else {
      labelEl.textContent = t("showingAllTransactions");
    }
  }

  applySummaryToElements(summary, {
    income: "rangeIncome",
    expenses: "rangeExpenses",
    net: "rangeNet",
    highestIncome: "rangeHighestIncome",
    highestIncomeDate: "rangeHighestIncomeDate",
    highestExpense: "rangeHighestExpense",
    highestExpenseDate: "rangeHighestExpenseDate"
  });
}

function updateMonthlySummary() {
  const monthPicker = document.getElementById("monthPicker");
  const selectedMonthLabel = document.getElementById("selectedMonthLabel");
  if (!monthPicker) return;

  let monthValue = monthPicker.value;
  if (!monthValue) {
    monthValue = getCurrentMonthValue();
    monthPicker.value = monthValue;
  }

  if (selectedMonthLabel) {
    selectedMonthLabel.textContent = formatMonthLabel(monthValue);
  }

  const summary = calculateSummaryData(getTransactionsForMonth(monthValue));

  applySummaryToElements(summary, {
    income: "monthIncome",
    expenses: "monthExpenses",
    net: "monthNet",
    highestIncome: "monthHighestIncome",
    highestIncomeDate: "monthHighestIncomeDate",
    highestExpense: "monthHighestExpense",
    highestExpenseDate: "monthHighestExpenseDate"
  });
}

function renderBudgetList() {
  const budgetList = document.getElementById("budgetList");
  if (!budgetList) return;

  budgetList.innerHTML = "";

  const monthValue = document.getElementById("monthPicker")?.value || getCurrentMonthValue();
  const monthlyTransactions = getTransactionsForMonth(monthValue);

  const expenseTotals = {};
  monthlyTransactions.forEach((transaction) => {
    if (transaction.type === "Expense") {
      const category = transaction.category || "Other";
      expenseTotals[category] = (expenseTotals[category] || 0) + Number(transaction.amount);
    }
  });

  const categories = Object.keys(budgets);

  if (categories.length === 0) {
    budgetList.innerHTML = `<div class="empty-state">${t("noBudgetGoals")}<br><span class="empty-state-hint-inline">${t("emptyBudgetsHint")}</span></div>`; // UI
    return;
  }

  categories
    .sort((a, b) => translateCategory(a).localeCompare(translateCategory(b)))
    .forEach((category) => {
      const budgetAmount = Number(budgets[category]);
      const spent = Number(expenseTotals[category] || 0);
      const remaining = budgetAmount - spent;

      const item = document.createElement("div");
      item.className = "stack-item";

      const main = document.createElement("div");
      main.className = "stack-item-main";

      // UI: budget health — green under 70% used, amber up to 100%, red over.
      const usageRatio = budgetAmount > 0 ? spent / budgetAmount : (spent > 0 ? 1 : 0);
      const health = usageRatio < 0.7 ? "good" : usageRatio < 1 ? "warn" : "over";

      const title = document.createElement("div");
      title.className = "stack-item-title";
      title.textContent = `${translateCategory(category)} — ${formatCurrency(budgetAmount)}`;

      const subtitle = document.createElement("div");
      subtitle.className = `stack-item-subtitle budget-${health}`;
      subtitle.textContent =
        remaining >= 0
          ? `${t("spent")} ${formatCurrency(spent)} • ${t("remaining")} ${formatCurrency(remaining)}`
          : `${t("spent")} ${formatCurrency(spent)} • ${t("overBudgetBy")} ${formatCurrency(Math.abs(remaining))}`;

      const progress = document.createElement("div");
      progress.className = "budget-progress";
      const fill = document.createElement("div");
      fill.className = `budget-fill ${health}`;
      fill.style.width = `${Math.min(100, Math.max(0, usageRatio * 100))}%`;
      progress.appendChild(fill);

      main.appendChild(title);
      main.appendChild(subtitle);
      main.appendChild(progress);

      const removeBtn = document.createElement("button");
      removeBtn.className = "stack-item-btn";
      removeBtn.type = "button";
      removeBtn.textContent = t("remove");
      removeBtn.onclick = () => {
        delete budgets[category];
        persistBudgets(); // SYNC FIX: sync the removal to Firestore too
        renderBudgetList();
        updateInsights();
      };

      item.appendChild(main);
      item.appendChild(removeBtn);
      budgetList.appendChild(item);
    });
}

function renderCategoryTotals() {
  const container = document.getElementById("categoryTotalsList");
  if (!container) return;

  container.innerHTML = "";

  const totals = {};
  transactions.forEach((transaction) => {
    const category = transaction.category || "Other";
    totals[category] = totals[category] || { income: 0, expense: 0 };

    if (transaction.type === "Income") {
      totals[category].income += Number(transaction.amount);
    } else {
      totals[category].expense += Number(transaction.amount);
    }
  });

  const categories = Object.keys(totals).sort((a, b) =>
    translateCategory(a).localeCompare(translateCategory(b))
  );

  if (categories.length === 0) {
    container.innerHTML = `<div class="empty-state">${t("noCategoryTotals")}</div>`;
    return;
  }

  categories.forEach((category) => {
    const item = document.createElement("div");
    item.className = "stack-item";

    const main = document.createElement("div");
    main.className = "stack-item-main";

    const title = document.createElement("div");
    title.className = "stack-item-title";
    title.textContent = translateCategory(category);

    const subtitle = document.createElement("div");
    subtitle.className = "stack-item-subtitle";
    subtitle.textContent = `${t("income")} ${formatCurrency(totals[category].income)} • ${t("expense")} ${formatCurrency(totals[category].expense)}`; // UI

    main.appendChild(title);
    main.appendChild(subtitle);
    item.appendChild(main);
    container.appendChild(item);
  });
}

function updateInsights() {
  const monthValue = document.getElementById("monthPicker")?.value || getCurrentMonthValue();
  const currentMonth = getTransactionsForMonth(monthValue);

  const [year, month] = monthValue.split("-");
  // SYNC FIX: compute the previous month in UTC for cross-device consistency.
  const previousMonthDate = new Date(Date.UTC(Number(year), Number(month) - 2, 1));
  const prevMonthValue = `${previousMonthDate.getUTCFullYear()}-${String(previousMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const previousMonth = getTransactionsForMonth(prevMonthValue);

  const currentExpenseTotal = currentMonth
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const previousExpenseTotal = previousMonth
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const currentIncomeTotal = currentMonth
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenseByCategory = {};
  currentMonth.forEach((transaction) => {
    if (transaction.type === "Expense") {
      const category = transaction.category || "Other";
      expenseByCategory[category] = (expenseByCategory[category] || 0) + Number(transaction.amount);
    }
  });

  const topCategoryEntry = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0] || null;

  let overBudgetCount = 0;
  Object.keys(budgets).forEach((category) => {
    if ((expenseByCategory[category] || 0) > Number(budgets[category])) {
      overBudgetCount += 1;
    }
  });

  const spendingChangeEl = document.getElementById("insightSpendingChange");
  const spendingDetailEl = document.getElementById("insightSpendingDetail");
  const topCategoryEl = document.getElementById("insightTopCategory");
  const topCategoryDetailEl = document.getElementById("insightTopCategoryDetail");
  const overBudgetEl = document.getElementById("insightOverBudget");
  const overBudgetDetailEl = document.getElementById("insightOverBudgetDetail");
  const savingsRateEl = document.getElementById("insightSavingsRate");
  const savingsRateDetailEl = document.getElementById("insightSavingsRateDetail");

  if (spendingChangeEl && spendingDetailEl) {
    if (previousExpenseTotal > 0) {
      const pct = ((currentExpenseTotal - previousExpenseTotal) / previousExpenseTotal) * 100;
      const sign = pct >= 0 ? "+" : "";
      spendingChangeEl.textContent = `${sign}${pct.toFixed(1)}%`;
      spendingDetailEl.textContent = t("vsLastMonth");
    } else if (currentExpenseTotal > 0) {
      spendingChangeEl.textContent = "+100.0%";
      spendingDetailEl.textContent = t("vsLastMonth");
    } else {
      spendingChangeEl.textContent = "—";
      spendingDetailEl.textContent = t("noDataYet");
    }
  }

  if (topCategoryEl && topCategoryDetailEl) {
    if (topCategoryEntry) {
      topCategoryEl.textContent = translateCategory(topCategoryEntry[0]);
      topCategoryDetailEl.textContent = formatCurrency(topCategoryEntry[1]); // UI
    } else {
      topCategoryEl.textContent = "—";
      topCategoryDetailEl.textContent = t("noDataYet");
    }
  }

  if (overBudgetEl && overBudgetDetailEl) {
    overBudgetEl.textContent = String(overBudgetCount);
    overBudgetDetailEl.textContent = `${overBudgetCount} ${t("categoriesOver")}`;
  }

  if (savingsRateEl && savingsRateDetailEl) {
    if (currentIncomeTotal > 0) {
      const rate = ((currentIncomeTotal - currentExpenseTotal) / currentIncomeTotal) * 100;
      savingsRateEl.textContent = `${rate.toFixed(1)}%`;
      savingsRateDetailEl.textContent = t("ofIncomeSaved");
    } else {
      savingsRateEl.textContent = "—";
      savingsRateDetailEl.textContent = t("noDataYet");
    }
  }

  // UI: clickable highest income/expense day rows — tapping one drills into
  // that day's transactions.
  ensureInsightDayRows();

  const incomeByDay = {};
  const expenseByDay = {};
  currentMonth.forEach((transaction) => {
    const key = getDayKey(transaction.timestamp);
    const amount = Number(transaction.amount);
    if (transaction.type === "Income") {
      incomeByDay[key] = (incomeByDay[key] || 0) + amount;
    } else {
      expenseByDay[key] = (expenseByDay[key] || 0) + amount;
    }
  });
  const topIncomeDay = Object.entries(incomeByDay).sort((a, b) => b[1] - a[1])[0] || null;
  const topExpenseDay = Object.entries(expenseByDay).sort((a, b) => b[1] - a[1])[0] || null;

  updateInsightDayRow("insightIncomeDay", t("highestIncomeDay"), topIncomeDay);
  updateInsightDayRow("insightExpenseDay", t("highestExpenseDay"), topExpenseDay);
}

function renderMonthlyTrendChart() {
  const canvas = document.getElementById("monthlyTrendChart");
  if (!canvas || typeof Chart === "undefined") return;

  const grouped = {};

  transactions.forEach((transaction) => {
    // SYNC FIX: group by the UTC month of the day-timestamp.
    const date = new Date(Number(transaction.timestamp));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    grouped[key] = grouped[key] || { income: 0, expense: 0 };

    if (transaction.type === "Income") {
      grouped[key].income += Number(transaction.amount);
    } else {
      grouped[key].expense += Number(transaction.amount);
    }
  });

  const labels = Object.keys(grouped).sort().slice(-6);
  const incomeData = labels.map((label) => grouped[label].income);
  const expenseData = labels.map((label) => grouped[label].expense);
  const colors = getChartColors();

  if (monthlyTrendChart) monthlyTrendChart.destroy();

  monthlyTrendChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: t("income"),
          data: incomeData,
          backgroundColor: colors.income,
          borderRadius: 10
        },
        {
          label: t("expenses"),
          data: expenseData,
          backgroundColor: colors.expense,
          borderRadius: 10
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          labels: { color: colors.text }
        },
        tooltip: {
          callbacks: {
            // UI: tooltips honor the selected currency.
            label: (context) => {
              const parsed = context.parsed;
              const value = parsed && typeof parsed.y === "number" ? parsed.y : parsed;
              const datasetLabel = context.dataset && context.dataset.label ? `${context.dataset.label}: ` : "";
              return ` ${datasetLabel}${formatCurrency(value)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: colors.muted },
          grid: { color: colors.grid }
        },
        y: {
          beginAtZero: true,
          ticks: { color: colors.muted },
          grid: { color: colors.grid }
        }
      }
    }
  });
}

function renderCategoryExpenseChart() {
  const canvas = document.getElementById("categoryExpenseChart");
  if (!canvas || typeof Chart === "undefined") return;

  const totals = {};
  transactions.forEach((transaction) => {
    if (transaction.type === "Expense") {
      const category = transaction.category || "Other";
      totals[category] = (totals[category] || 0) + Number(transaction.amount);
    }
  });

  const categoryKeys = Object.keys(totals);
  const labels = categoryKeys.map(translateCategory);
  const data = categoryKeys.map((key) => totals[key]);
  const colors = getChartColors();
  const backgroundColors = labels.map((_, index) => colors.pie[index % colors.pie.length]);

  if (categoryExpenseChart) categoryExpenseChart.destroy();

  categoryExpenseChart = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: "transparent",
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          labels: { color: colors.text }
        },
        tooltip: {
          callbacks: {
            // UI: tooltips honor the selected currency.
            label: (context) => {
              const parsed = context.parsed;
              const value = parsed && typeof parsed.y === "number" ? parsed.y : parsed;
              return ` ${formatCurrency(value)}`;
            }
          }
        }
      }
    }
  });
}

function exportCsv() {
  const rows = [
    [t("type"), t("description"), t("amount"), t("category"), t("date"), t("recurring"), t("notes")]
  ];

  getFilteredTransactions().forEach((transaction) => {
    rows.push([
      transaction.type || "",
      transaction.desc || "",
      formatMoney(transaction.amount),
      translateCategory(transaction.category || ""),
      formatDateTime(transaction.createdAt),
      transaction.recurring ? t("yes") : t("no"),
      (transaction.notes || "").replace(/\n/g, " ")
    ]);
  });

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = currentLanguage === "es" ? "control-de-gastos.csv" : "expense-tracker-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function clearFilters() {
  const searchInput = document.getElementById("searchInput");
  const filterType = document.getElementById("filterType");
  const filterCategory = document.getElementById("filterCategory");
  const sortOption = document.getElementById("sortOption");

  if (searchInput) searchInput.value = "";
  if (filterType) filterType.value = "All";
  if (filterCategory) filterCategory.value = "All";
  if (sortOption) sortOption.value = "newest";

  listDateFilter = null; // UI: also clear the insight drill-down

  updateUI();
}

function saveBudget() {
  const category = normalizeOtherLabel(document.getElementById("budgetCategory")?.value || "General");
  const amountValue = document.getElementById("budgetAmount")?.value || "";

  if (amountValue === "" || Number.isNaN(Number(amountValue)) || Number(amountValue) < 0) {
    alert(t("budgetInvalid"));
    return;
  }

  budgets[category] = Number(amountValue);
  persistBudgets(); // SYNC FIX: sync budgets to Firestore, not just localStorage

  const budgetAmount = document.getElementById("budgetAmount");
  if (budgetAmount) budgetAmount.value = "";

  renderBudgetList();
  updateInsights();
  showToast(t("transactionSaved"));
}

function refreshLanguageSensitiveSelects() {
  document.querySelectorAll("option[data-i18n]").forEach((option) => {
    const key = option.getAttribute("data-i18n");
    option.textContent = t(key);
  });

  populateCategorySelects();
}

function createDayHeader(label) {
  const header = document.createElement("li");
  header.className = "transaction-day-group";
  header.innerHTML = `<div class="transaction-day-title">${label}</div>`;
  return header;
}

function createTransactionItem(transaction) {
  const li = document.createElement("li");
  li.className = `transaction-item ${transaction.type === "Income" ? "income" : "expense"}`;
  li.dataset.transactionId = transaction.id; // UI: swipe delegation target

  const left = document.createElement("div");
  left.className = "transaction-left";

  const title = document.createElement("p");
  title.className = "transaction-title";
  title.textContent = transaction.desc;

  const meta = document.createElement("p");
  meta.className = "transaction-meta";
  meta.textContent =
    `${transaction.type === "Income" ? t("income") : t("expense")} • ${translateCategory(transaction.category || "General")} • ${formatTime(transaction.createdAt)}${transaction.recurring ? ` • ${t("recurringLabel")} (${t(transaction.recurringInterval)})` : ""}`;

  left.appendChild(title);
  left.appendChild(meta);

  if (transaction.notes) {
    const notes = document.createElement("p");
    notes.className = "transaction-notes";
    notes.textContent = transaction.notes;
    left.appendChild(notes);
  }

  const right = document.createElement("div");
  right.className = "transaction-right";

  const amount = document.createElement("span");
  amount.className = `transaction-amount ${transaction.type === "Income" ? "income-text" : "expense-text"}`;
  amount.textContent = `${transaction.type === "Income" ? "+" : "-"}${formatCurrency(transaction.amount)}`; // UI

  const editBtn = document.createElement("button");
  editBtn.className = "small-btn edit-btn";
  editBtn.type = "button";
  editBtn.textContent = "✏️";
  editBtn.onclick = () => openEditModal(transaction);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "small-btn delete-btn";
  deleteBtn.type = "button";
  deleteBtn.textContent = "🗑️";
  deleteBtn.onclick = () => {
    const confirmed = confirm(t("confirmDelete"));
    if (confirmed) deleteTransaction(transaction.id);
  };

  right.appendChild(amount);
  right.appendChild(editBtn);
  right.appendChild(deleteBtn);

  // UI: swipe-to-edit/delete on touch devices. The card content slides over
  // absolutely-positioned action buttons hidden behind it; on desktop the
  // icon buttons above keep working exactly as before.
  const content = document.createElement("div");
  content.className = `transaction-swipe-content ${transaction.type === "Income" ? "income" : "expense"}`;
  content.appendChild(left);
  content.appendChild(right);

  const editAction = document.createElement("button");
  editAction.type = "button";
  editAction.className = "swipe-action swipe-edit";
  editAction.setAttribute("aria-label", t("swipeEdit"));
  editAction.innerHTML = `<span aria-hidden="true">✏️</span><span class="swipe-action-label">${t("swipeEdit")}</span>`;

  const deleteAction = document.createElement("button");
  deleteAction.type = "button";
  deleteAction.className = "swipe-action swipe-delete";
  deleteAction.setAttribute("aria-label", t("swipeDelete"));
  deleteAction.innerHTML = `<span aria-hidden="true">🗑️</span><span class="swipe-action-label">${t("swipeDelete")}</span>`;

  li.appendChild(editAction);
  li.appendChild(deleteAction);
  li.appendChild(content);

  return li;
}


function normalizeBill(docId, data) {
  const now = Date.now();
  return {
    id: docId,
    name: String(data.name || "").trim(),
    amount: Number(data.amount || 0),
    category: normalizeOtherLabel(data.category || "Bills"),
    dueDate: Number(data.dueDate || now),
    frequency: data.frequency || "monthly",
    reminderDays: Number(data.reminderDays ?? 3),
    notes: data.notes || "",
    paidDates: Array.isArray(data.paidDates) ? data.paidDates : [],
    createdAt: Number(data.createdAt || now),
    updatedAt: Number(data.updatedAt || now)
  };
}

function cacheBillsLocally() {
  localStorage.setItem(LOCAL_BILLS_KEY, JSON.stringify(bills));
}

function loadCachedBills() {
  try {
    const raw = localStorage.getItem(LOCAL_BILLS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    bills = parsed.map((item) => normalizeBill(item.id || `local-bill-${Math.random()}`, item));
    renderBills();
  } catch (_) {}
}

function loadBills() {
  db.collection("bills").onSnapshot(
    (snapshot) => {
      bills = [];
      snapshot.forEach((doc) => bills.push(normalizeBill(doc.id, doc.data())));
      cacheBillsLocally();
      renderBills();
      updateUI();
    },
    (error) => {
      console.error("Error loading bills:", error);
      renderBills();
    }
  );
}

function getBillInputData() {
  const name = document.getElementById("billName")?.value.trim() || "";
  const amountValue = document.getElementById("billAmount")?.value || "";
  const category = normalizeOtherLabel(document.getElementById("billCategory")?.value || "Bills");
  const dueDateValue = document.getElementById("billDueDate")?.value || "";
  const frequency = document.getElementById("billFrequency")?.value || "monthly";
  const reminderDays = Number(document.getElementById("billReminderDays")?.value || 3);
  const notes = document.getElementById("billNotes")?.value.trim() || "";

  if (!name) {
    alert(t("invalidBillName"));
    return null;
  }
  if (amountValue === "" || Number.isNaN(Number(amountValue)) || Number(amountValue) < 0) {
    alert(t("invalidAmount"));
    return null;
  }
  if (!dueDateValue) {
    alert(t("invalidDueDate"));
    return null;
  }

  return {
    name,
    amount: Number(amountValue),
    category,
    dueDate: getStartOfDay(dueDateValue),
    frequency,
    reminderDays: Math.max(0, reminderDays),
    notes
  };
}

function clearBillInputs() {
  const sorted = sortCategoriesForDisplay(customCategories);
  const billName = document.getElementById("billName");
  const billAmount = document.getElementById("billAmount");
  const billCategory = document.getElementById("billCategory");
  const billDueDate = document.getElementById("billDueDate");
  const billFrequency = document.getElementById("billFrequency");
  const billReminderDays = document.getElementById("billReminderDays");
  const billNotes = document.getElementById("billNotes");
  if (billName) billName.value = "";
  if (billAmount) billAmount.value = "";
  if (billCategory) billCategory.value = sorted.includes("Bills") ? "Bills" : (sorted[0] || "Bills");
  if (billDueDate) billDueDate.value = getTodayInputValue();
  if (billFrequency) billFrequency.value = "monthly";
  if (billReminderDays) billReminderDays.value = "3";
  if (billNotes) billNotes.value = "";
}

function addBill() {
  const data = getBillInputData();
  if (!data) return;
  const now = Date.now();
  db.collection("bills").add({ ...data, paidDates: [], createdAt: now, updatedAt: now })
    .then(() => { clearBillInputs(); showToast(t("billSaved")); })
    .catch((error) => { console.error("Error adding bill:", error); alert(t("addError")); });
}

function deleteBill(id) {
  if (!confirm(t("confirmDelete"))) return;
  db.collection("bills").doc(id).delete()
    .then(() => showToast(t("billDeleted")))
    .catch((error) => { console.error("Error deleting bill:", error); alert(t("deleteError")); });
}

function getNextBillDueDate(bill) {
  if (bill.frequency === "weekly") return addDays(bill.dueDate, 7);
  return addMonths(bill.dueDate, 1);
}

function isBillPaidThisMonth(bill) {
  const currentMonth = getCurrentMonthValue();
  // SYNC FIX: compare UTC month keys so paid-this-month agrees everywhere.
  return (bill.paidDates || []).some((date) => {
    const paid = new Date(Number(date));
    const monthValue = `${paid.getUTCFullYear()}-${String(paid.getUTCMonth() + 1).padStart(2, "0")}`;
    return monthValue === currentMonth;
  });
}

function markBillPaid(id) {
  const bill = bills.find((item) => item.id === id);
  if (!bill) return;
  const now = Date.now();
  const paidDate = getStartOfDay(getTodayInputValue());

  db.collection("transactions").add({
    type: "Expense",
    desc: bill.name,
    amount: Number(bill.amount),
    category: bill.category || "Bills",
    notes: bill.notes ? `${bill.notes} • ${t("billPaid")}` : t("billPaid"),
    recurring: false,
    recurringInterval: "monthly",
    recurringGenerated: false,
    timestamp: paidDate,
    createdAt: now,
    updatedAt: now
  }).then(() => {
    return db.collection("bills").doc(id).update({
      dueDate: getNextBillDueDate(bill),
      paidDates: firebase.firestore.FieldValue.arrayUnion(paidDate),
      updatedAt: now
    });
  }).then(() => {
    showToast(t("billPaid"));
  }).catch((error) => {
    console.error("Error marking bill paid:", error);
    alert(t("updateError"));
  });
}

function getBillStatus(bill) {
  const today = getStartOfDay(getTodayInputValue());
  const due = Number(bill.dueDate);
  const daysUntil = Math.ceil((due - today) / 86400000);
  if (daysUntil < 0) return { key: "overdue", label: t("overdue"), className: "danger", daysUntil };
  if (daysUntil <= Number(bill.reminderDays || 0)) return { key: "dueSoon", label: t("dueSoon"), className: "warning", daysUntil };
  return { key: "upcomingBills", label: t("upcomingBills"), className: "neutral", daysUntil };
}

function renderBills() {
  const list = document.getElementById("billsList");
  if (!list) return;

  renderBillCalendar(); // UI: month calendar with due-date dots

  const sortedBills = [...bills].sort((a, b) => Number(a.dueDate) - Number(b.dueDate));
  const monthlyTotal = sortedBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const today = getStartOfDay(getTodayInputValue());
  const overdueCount = sortedBills.filter((bill) => Number(bill.dueDate) < today).length;
  const dueSoonCount = sortedBills.filter((bill) => getBillStatus(bill).key === "dueSoon").length;
  const paidCount = sortedBills.filter(isBillPaidThisMonth).length;

  const totalEl = document.getElementById("monthlyBillsTotalValue");
  const dueSoonEl = document.getElementById("dueSoonBillsValue");
  const overdueEl = document.getElementById("overdueBillsValue");
  const paidEl = document.getElementById("paidBillsValue");
  if (totalEl) totalEl.textContent = formatCurrency(monthlyTotal); // UI
  if (dueSoonEl) dueSoonEl.textContent = dueSoonCount;
  if (overdueEl) overdueEl.textContent = overdueCount;
  if (paidEl) paidEl.textContent = paidCount;

  list.innerHTML = "";

  // UI: friendly empty state with a CTA when no bills exist at all.
  if (bills.length === 0) {
    const panel = document.createElement("div");
    panel.className = "empty-state-panel";
    const icon = document.createElement("div");
    icon.className = "empty-state-icon";
    icon.textContent = "🧾";
    const title = document.createElement("p");
    title.className = "empty-state-title";
    title.textContent = t("emptyBillsTitle");
    const hint = document.createElement("p");
    hint.className = "empty-state-hint";
    hint.textContent = t("emptyBillsHint");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondary-btn empty-state-btn";
    btn.textContent = t("addFirstBill");
    btn.addEventListener("click", () => {
      document.getElementById("billsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.getElementById("billName")?.focus({ preventScroll: true }), 450);
    });
    panel.appendChild(icon);
    panel.appendChild(title);
    panel.appendChild(hint);
    panel.appendChild(btn);
    list.appendChild(panel);
    return;
  }

  // UI: tapping a calendar day filters the list to bills due that day.
  const visibleBills = billCalendarSelectedDay
    ? sortedBills.filter((bill) => getDayKey(bill.dueDate) === billCalendarSelectedDay)
    : sortedBills;

  if (visibleBills.length === 0) {
    list.innerHTML = `<div class="empty-state">${t("noBillsThisDay")}</div>`;
    return;
  }

  visibleBills.forEach((bill) => {
    const status = getBillStatus(bill);
    const dayText = status.daysUntil < 0 ? `${Math.abs(status.daysUntil)}d late` : `${status.daysUntil}d`;
    const item = document.createElement("div");
    item.className = "stack-item bill-item";
    item.innerHTML = `
      <div class="stack-item-main">
        <span class="stack-item-title">${bill.name}</span>
        <span class="stack-item-subtitle">${formatCurrency(bill.amount)} • ${translateCategory(bill.category)} • ${formatDate(bill.dueDate)}</span>
        ${bill.notes ? `<span class="stack-item-subtitle">${bill.notes}</span>` : ""}
      </div>
      <div class="bill-actions">
        <span class="bill-status ${status.className}">${dayText}</span>
        <button class="bill-icon-btn paid" type="button" onclick="markBillPaid('${bill.id}')" title="${t("markPaid")}" aria-label="${t("markPaid")}">✓</button>
        <button class="bill-icon-btn delete" type="button" onclick="deleteBill('${bill.id}')" title="${t("remove")}" aria-label="${t("remove")}">🗑</button>
      </div>
    `;
    list.appendChild(item);
  });
}

async function processRecurringTransactions() {
  if (recurringProcessing || !navigator.onLine) return;
  recurringProcessing = true;

  try {
    const templates = transactions.filter((item) => item.recurring && !item.recurringGenerated);
    if (templates.length === 0) return;

    const batchAdds = [];
    const today = getStartOfDay(getTodayInputValue());

    templates.forEach((template) => {
      let nextTimestamp = template.timestamp;
      const interval = template.recurringInterval || "monthly";

      while (true) {
        nextTimestamp = interval === "weekly"
          ? addDays(nextTimestamp, 7)
          : addMonths(nextTimestamp, 1);

        if (nextTimestamp > today) break;

        const generatedForDate = getDayKey(nextTimestamp);
        const exists = transactions.some(
          (item) => item.generatedFromBaseId === template.id && item.generatedForDate === generatedForDate
        );

        if (!exists) {
          batchAdds.push({
            type: template.type,
            desc: template.desc,
            amount: Number(template.amount),
            category: template.category,
            notes: template.notes || "",
            recurring: false,
            recurringInterval: interval,
            recurringGenerated: true,
            generatedFromBaseId: template.id,
            generatedForDate,
            timestamp: nextTimestamp,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }
    });

    for (const item of batchAdds) {
      // SYNC FIX: deterministic doc ID (template + date) so two devices
      // generating the same occurrence converge on one doc instead of
      // creating duplicates. Never deletes user data.
      const deterministicId = `${item.generatedFromBaseId}_${item.generatedForDate}`;
      await db.collection("transactions").doc(deterministicId).set(item);
    }
  } catch (error) {
    reportSyncWriteError(error, "recurring transactions");
  } finally {
    recurringProcessing = false;
  }
}

// ---------------------------------------------------------------------------
// UI: interface improvements.
//
//  1. Bill calendar with due-date dots + day filter
//  2. Swipe-to-edit/delete on transaction rows (touch devices only)
//  3. Budget health colors on progress bars
//  4. Friendly empty states with CTAs
// 5. Hero period toggle (Week / Month / 3 Months / 6 Months / Year / All Time)
//  6. Currency setting (see formatCurrency / persistCurrency / loadCurrencySync)
//  7. Tappable sync badge (wired in DOMContentLoaded)
//  8. Clickable highest income/expense day rows in Smart Insights
// ---------------------------------------------------------------------------

// --- Hero period toggle (Week / Month / 3 Months / 6 Months / Year / All Time) ---
function getTrailingMonthsRange(monthCount) {
  // Returns { start, end, label } for the last `monthCount` UTC months,
  // ending with the current month.
  const now = new Date();
  const endYear = now.getUTCFullYear();
  const endMonth = now.getUTCMonth(); // 0-based
  const startDate = new Date(Date.UTC(endYear, endMonth - (monthCount - 1), 1));
  const startValue = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const endValue = `${endYear}-${String(endMonth + 1).padStart(2, "0")}`;
  return {
    start: startDate.getTime(),
    end: Date.UTC(endYear, endMonth + 1, 0, 23, 59, 59, 999),
    label: `${formatMonthLabel(startValue)} \u2013 ${formatMonthLabel(endValue)}`
  };
}

function getHeroPeriodRange() {
  // Returns { start, end, label } for the hero summary's selected period.
  // Week = current week Monday–Sunday in UTC; Month = current UTC month;
  // 3/6 Months = trailing UTC months ending now; Year = current UTC year;
  // All = the full lifetime of the account's data.
  if (heroPeriod === "week") {
    const now = new Date();
    const dayIndex = (now.getUTCDay() + 6) % 7; // Monday = 0
    const monday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - dayIndex * 86400000;
    const sundayEnd = monday + 6 * 86400000 + 86399999;
    return {
      start: monday,
      end: sundayEnd,
      label: `${t("weekOf")} ${formatDate(monday)}`
    };
  }
  if (heroPeriod === "3months") return getTrailingMonthsRange(3);
  if (heroPeriod === "6months") return getTrailingMonthsRange(6);
  if (heroPeriod === "year") {
    const year = new Date().getUTCFullYear();
    return {
      start: Date.UTC(year, 0, 1),
      end: Date.UTC(year, 11, 31, 23, 59, 59, 999),
      label: `${year}`
    };
  }
  if (heroPeriod === "all") {
    return {
      start: 0,
      end: Date.now(),
      label: t("periodAllTime")
    };
  }
  const monthValue = getCurrentMonthValue();
  const [year, month] = monthValue.split("-");
  return {
    start: Date.UTC(Number(year), Number(month) - 1, 1),
    end: Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999),
    label: formatMonthLabel(monthValue)
  };
}

function buildPeriodToggle() {
  // Segmented Month | Week control, inserted above the hero summary cards.
  const heroCard = document.getElementById("balanceSection");
  const summaryGrid = heroCard && heroCard.querySelector(".summary-grid");
  if (!heroCard || !summaryGrid || document.getElementById("periodToggle")) return;

  const label = document.createElement("p");
  label.id = "heroPeriodLabel";
  label.className = "period-label";

  const toggle = document.createElement("div");
  toggle.id = "periodToggle";
  toggle.className = "period-toggle";
  toggle.setAttribute("role", "group");
  HERO_PERIODS.forEach((period) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.period = period;
    btn.addEventListener("click", () => {
      heroPeriod = period;
      localStorage.setItem("expense_tracker_hero_period", heroPeriod);
      updateUI();
    });
    toggle.appendChild(btn);
  });

  heroCard.insertBefore(label, summaryGrid);
  heroCard.insertBefore(toggle, summaryGrid);
}

function renderPeriodToggle() {
  const toggle = document.getElementById("periodToggle");
  if (toggle) {
    const periodLabelKeys = {
      week: "periodWeek",
      month: "periodMonth",
      "3months": "period3Months",
      "6months": "period6Months",
      year: "periodYear",
      all: "periodAllTime"
    };
    toggle.querySelectorAll("button").forEach((btn) => {
      const period = btn.dataset.period;
      btn.textContent = t(periodLabelKeys[period] || "periodMonth");
      btn.classList.toggle("active", heroPeriod === period);
      btn.setAttribute("aria-pressed", heroPeriod === period ? "true" : "false");
    });
  }
  const label = document.getElementById("heroPeriodLabel");
  if (label) label.textContent = getHeroPeriodRange().label;
}

// --- Currency picker -----------------------------------------------------------
function buildCurrencySelect() {
  // Compact currency <select> in the header, next to the theme/language buttons.
  const topActions = document.querySelector(".top-actions");
  if (!topActions || document.getElementById("currencySelect")) return;

  const select = document.createElement("select");
  select.id = "currencySelect";
  select.className = "currency-select";
  select.setAttribute("aria-label", t("currency"));
  select.title = t("currency");

  SUPPORTED_CURRENCIES.forEach((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code;
    select.appendChild(option);
  });
  select.value = SUPPORTED_CURRENCIES.includes(appCurrency) ? appCurrency : "USD";

  select.addEventListener("change", () => {
    appCurrency = select.value;
    persistCurrency();
    updateUI();
  });

  const themeBtn = document.getElementById("themeToggleBtn");
  topActions.insertBefore(select, themeBtn);
}

function syncCurrencySelect() {
  const select = document.getElementById("currencySelect");
  if (!select) return;
  select.value = SUPPORTED_CURRENCIES.includes(appCurrency) ? appCurrency : "USD";
  select.setAttribute("aria-label", t("currency"));
  select.title = t("currency");
}

function stripHardcodedCurrencySymbols() {
  // formatCurrency() now owns the symbol; remove the static "$" text nodes
  const ids = ["income", "expenses", "rangeIncome", "rangeExpenses", "monthIncome", "monthExpenses"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    const parent = el && el.parentElement;
    if (!parent) return;
    [...parent.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes("$")) {
        node.textContent = node.textContent.replace(/\$/g, "");
      }
    });
  });
}

// --- Bill calendar ---------------------------------------------------------------
function getBillCalendarMonthParts() {
  const [year, month] = (billCalendarMonth || getCurrentMonthValue()).split("-");
  return { year: Number(year), month: Number(month) };
}

function renderBillCalendar() {
  // Compact month calendar above the bill list. Dots mark days with bills
  // due (amber), income (green), and expenses (red); tapping a day filters
  // the list below to that day's bills and shows the day's money activity.
  const list = document.getElementById("billsList");
  const block = list && list.closest(".combined-list-block");
  if (!block) return;

  let container = document.getElementById("billCalendar");
  if (bills.length === 0 && transactions.length === 0) {
    if (container) container.remove();
    return;
  }
  if (!container) {
    container = document.createElement("div");
    container.id = "billCalendar";
    container.className = "bill-calendar";
    block.insertBefore(container, block.firstChild);
  }

  const { year, month } = getBillCalendarMonthParts();
  const locale = currentLanguage === "es" ? "es-ES" : undefined;

  const dueDays = {};
  bills.forEach((bill) => {
    const key = getDayKey(bill.dueDate);
    dueDays[key] = (dueDays[key] || 0) + 1;
  });
  // UI: mark days that have income or expenses recorded, so the calendar
  // shows money activity at a glance alongside bill due dates.
  const incomeDays = {};
  const expenseDays = {};
  transactions.forEach((transaction) => {
    const key = getDayKey(transaction.timestamp);
    if (transaction.type === "Income") incomeDays[key] = true;
    else expenseDays[key] = true;
  });

  const mondayBase = Date.UTC(2026, 8, 21); // a Monday — weekday names start here
  let weekdayRow = "";
  for (let i = 0; i < 7; i++) {
    const name = new Date(mondayBase + i * 86400000).toLocaleDateString(locale, {
      weekday: "short",
      timeZone: "UTC"
    });
    weekdayRow += `<span class="bill-cal-weekday">${name}</span>`;
  }

  const startOffset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  let cells = "";
  for (let i = 0; i < startOffset; i++) cells += '<span class="bill-cal-day empty"></span>';
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const selected = billCalendarSelectedDay === key ? " selected" : "";
    let dots = "";
    if (dueDays[key]) dots += '<span class="bill-cal-dot bill"></span>';
    if (incomeDays[key]) dots += '<span class="bill-cal-dot income"></span>';
    if (expenseDays[key]) dots += '<span class="bill-cal-dot expense"></span>';
    const dotsRow = dots ? `<span class="bill-cal-dots">${dots}</span>` : "";
    cells += `<button type="button" class="bill-cal-day${selected}" data-day="${key}"><span class="bill-cal-num">${day}</span>${dotsRow}</button>`;
  }

  const dayActivityPanel = billCalendarSelectedDay
    ? buildDayActivityPanel(billCalendarSelectedDay)
    : "";

  const clearChip = billCalendarSelectedDay
    ? `<div class="bill-cal-clear-row"><button type="button" class="bill-cal-clear" data-clear-day>✕ ${formatDate(getStartOfDay(billCalendarSelectedDay))} · ${t("billCalClear")}</button></div>`
    : "";

  container.innerHTML = `
    <div class="bill-cal-header">
      <button type="button" class="bill-cal-nav" data-cal-nav="-1" aria-label="‹">‹</button>
      <span class="bill-cal-title">${formatMonthLabel(billCalendarMonth)}</span>
      <button type="button" class="bill-cal-nav" data-cal-nav="1" aria-label="›">›</button>
    </div>
    <div class="bill-cal-weekdays">${weekdayRow}</div>
    <div class="bill-cal-grid">${cells}</div>
    ${dayActivityPanel}
    ${clearChip}`;

  container.querySelectorAll("[data-day]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-day");
      billCalendarSelectedDay = billCalendarSelectedDay === key ? null : key;
      renderBills();
    });
  });
  container.querySelectorAll("[data-cal-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = Number(btn.getAttribute("data-cal-nav"));
      const shifted = new Date(addMonths(Date.UTC(year, month - 1, 1), delta));
      billCalendarMonth = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
      renderBillCalendar();
    });
  });
  const clearBtn = container.querySelector("[data-clear-day]");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      billCalendarSelectedDay = null;
      renderBills();
    });
  }
}

// --- Day activity panel ----------------------------------------------------------
function buildDayActivityPanel(dayKey) {
  // Lists the income and expenses recorded on the selected calendar day,
  // with day totals. Bills due that day keep showing in the bill list below.
  const dayTransactions = transactions
    .filter((transaction) => getDayKey(transaction.timestamp) === dayKey)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  let incomeTotal = 0;
  let expenseTotal = 0;
  dayTransactions.forEach((transaction) => {
    const amount = Number(transaction.amount) || 0;
    if (transaction.type === "Income") incomeTotal += amount;
    else expenseTotal += amount;
  });

  let itemsHtml;
  if (dayTransactions.length === 0) {
    itemsHtml = `<div class="day-activity-empty">${t("noDayActivity")}</div>`;
  } else {
    itemsHtml = dayTransactions.map((transaction) => {
      const isIncome = transaction.type === "Income";
      const amount = Number(transaction.amount) || 0;
      const title = transaction.desc || translateCategory(transaction.category);
      return `<div class="day-activity-item">
        <div class="day-activity-main">
          <span class="day-activity-desc">${title}</span>
          <span class="day-activity-sub">${translateCategory(transaction.category)}</span>
        </div>
        <span class="day-activity-amount ${isIncome ? "pos" : "neg"}">${isIncome ? "+" : "\u2212"}${formatCurrency(amount)}</span>
      </div>`;
    }).join("");
  }

  return `<div class="day-activity">
    <div class="day-activity-head">
      <span class="day-activity-title">${t("dayActivity")} \u00b7 ${formatDate(getStartOfDay(dayKey))}</span>
      <span class="day-activity-totals">
        <span class="pos">+${formatCurrency(incomeTotal)}</span>
        <span class="neg">\u2212${formatCurrency(expenseTotal)}</span>
      </span>
    </div>
    ${itemsHtml}
  </div>`;
}

// --- Swipe actions on transactions (touch devices only) -------------------------
const SWIPE_REVEAL_PX = 110;
const SWIPE_COMMIT_PX = 60;
let swipeTouchState = null;
let suppressClickAfterSwipe = false;

function closeSwipeItem() {
  if (!swipeOpenItem) return;
  const content = swipeOpenItem.querySelector(".transaction-swipe-content");
  if (content) content.style.transform = "";
  swipeOpenItem.classList.remove("swiping", "swipe-open");
  swipeOpenItem = null;
}

function setupTransactionSwipe() {
  if (!("ontouchstart" in window)) return; // touch devices only; desktop keeps icon buttons
  const list = document.getElementById("list");
  if (!list || list.dataset.swipeReady) return;
  list.dataset.swipeReady = "true";

  list.addEventListener("touchstart", (event) => {
    const item = event.target.closest(".transaction-item");
    if (swipeOpenItem && item !== swipeOpenItem) closeSwipeItem();
    if (!item) return;
    const touch = event.touches[0];
    swipeTouchState = {
      item,
      content: item.querySelector(".transaction-swipe-content"),
      startX: touch.clientX,
      dx: 0,
      moved: false
    };
    item.classList.add("swiping");
    if (swipeTouchState.content) swipeTouchState.content.style.transition = "none";
  }, { passive: true });

  list.addEventListener("touchmove", (event) => {
    if (!swipeTouchState || !swipeTouchState.content) return;
    const touch = event.touches[0];
    const dx = touch.clientX - swipeTouchState.startX;
    if (Math.abs(dx) > 8) swipeTouchState.moved = true;
    const clamped = Math.max(-SWIPE_REVEAL_PX, Math.min(SWIPE_REVEAL_PX, dx));
    swipeTouchState.dx = clamped;
    swipeTouchState.content.style.transform = `translateX(${clamped}px)`;
  }, { passive: true });

  list.addEventListener("touchend", () => {
    if (!swipeTouchState || !swipeTouchState.content) {
      swipeTouchState = null;
      return;
    }
    const { item, content, dx, moved } = swipeTouchState;
    content.style.transition = "";
    if (moved && dx <= -SWIPE_COMMIT_PX) {
      content.style.transform = `translateX(${-SWIPE_REVEAL_PX}px)`;
      swipeOpenItem = item;
      item.classList.remove("swiping");
      item.classList.add("swipe-open");
      suppressClickAfterSwipe = true;
    } else if (moved && dx >= SWIPE_COMMIT_PX) {
      content.style.transform = `translateX(${SWIPE_REVEAL_PX}px)`;
      swipeOpenItem = item;
      item.classList.remove("swiping");
      item.classList.add("swipe-open");
      suppressClickAfterSwipe = true;
    } else {
      content.style.transform = "";
      item.classList.remove("swiping", "swipe-open");
      if (swipeOpenItem === item) swipeOpenItem = null;
    }
    swipeTouchState = null;
    setTimeout(() => { suppressClickAfterSwipe = false; }, 80);
  });

  // Capture phase so a tap right after a swipe never leaks through to buttons.
  list.addEventListener("click", (event) => {
    if (suppressClickAfterSwipe) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const actionBtn = event.target.closest(".swipe-action");
    if (!actionBtn) return;
    event.stopPropagation();
    const item = actionBtn.closest(".transaction-item");
    const id = item && item.dataset.transactionId;
    const transaction = transactions.find((tx) => tx.id === id);
    closeSwipeItem();
    if (!transaction) return;
    if (actionBtn.classList.contains("swipe-delete")) {
      if (confirm(t("confirmDelete"))) deleteTransaction(transaction.id);
    } else {
      openEditModal(transaction);
    }
  }, true);

  document.addEventListener("touchstart", (event) => {
    if (swipeOpenItem && !event.target.closest(".transaction-item")) closeSwipeItem();
  }, { passive: true });
}

// --- Clickable insight days --------------------------------------------------------
function ensureInsightDayRows() {
  const grid = document.querySelector(".insights-grid");
  if (!grid || document.getElementById("insightIncomeDay")) return;

  ["insightIncomeDay", "insightExpenseDay"].forEach((id) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = id;
    btn.className = "mini-stat insight-clickable";
    btn.innerHTML = '<span class="insight-label"></span><strong class="insight-value">—</strong><small class="insight-date">—</small><span class="insight-chevron" aria-hidden="true">›</span>';
    btn.addEventListener("click", () => {
      if (btn.dataset.dayKey) drillIntoDay(btn.dataset.dayKey);
    });
    grid.appendChild(btn);
  });
}

function updateInsightDayRow(id, label, topDay) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.querySelector(".insight-label").textContent = label;
  if (topDay) {
    btn.querySelector(".insight-value").textContent = formatCurrency(topDay[1]);
    btn.querySelector(".insight-date").textContent = formatDate(getStartOfDay(topDay[0]));
    btn.dataset.dayKey = topDay[0];
    btn.title = t("viewDayTransactions");
  } else {
    btn.querySelector(".insight-value").textContent = "—";
    btn.querySelector(".insight-date").textContent = t("noDataYet");
    btn.dataset.dayKey = "";
    btn.removeAttribute("title");
  }
}

function drillIntoDay(dayKey) {
  // Show exactly one day's transactions: set the range inputs, filter the
  // transaction list to that day, then jump to the Transactions section.
  const rangeStart = document.getElementById("rangeStart");
  const rangeEnd = document.getElementById("rangeEnd");
  if (rangeStart) rangeStart.value = dayKey;
  if (rangeEnd) rangeEnd.value = dayKey;
  listDateFilter = dayKey;
  applyRangeSummary();
  updateUI();
  scrollToAppSection("transactionsSection");
}
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function updateUI() {
  swipeOpenItem = null; // UI: the list is rebuilt, drop any open swipe row
  translateStaticText();
  refreshLanguageSensitiveSelects();
  renderPeriodToggle(); // UI
  syncCurrencySelect(); // UI

  const list = document.getElementById("list");
  if (!list) return;

  list.innerHTML = "";

  let balance = 0;
  let periodIncome = 0;
  let periodExpenses = 0;

  // UI: hero income/expenses follow the selected period (Month/Week);
  // Current Balance stays all-time.
  const heroRange = getHeroPeriodRange();

  transactions.forEach((transaction) => {
    const amount = Number(transaction.amount);
    const timestamp = Number(transaction.timestamp);
    if (transaction.type === "Income") {
      balance += amount;
      if (timestamp >= heroRange.start && timestamp <= heroRange.end) periodIncome += amount;
    } else {
      balance -= amount;
      if (timestamp >= heroRange.start && timestamp <= heroRange.end) periodExpenses += amount;
    }
  });

  const balanceEl = document.getElementById("balance");
  const incomeEl = document.getElementById("income");
  const expensesEl = document.getElementById("expenses");

  if (balanceEl) balanceEl.textContent = formatCurrency(balance); // UI
  if (incomeEl) incomeEl.textContent = formatCurrency(periodIncome); // UI
  if (expensesEl) expensesEl.textContent = formatCurrency(periodExpenses); // UI

  const filteredTransactions = getFilteredTransactions();
  const toggleTransactionsBtn = document.getElementById("toggleTransactionsBtn");
  const visibleTransactions = transactionListExpanded
    ? filteredTransactions
    : filteredTransactions.slice(0, 4);

  if (filteredTransactions.length === 0) {
    if (transactions.length === 0) {
      // UI: friendly first-run empty state with a CTA.
      const panel = document.createElement("li");
      panel.className = "empty-state-panel";
      const icon = document.createElement("div");
      icon.className = "empty-state-icon";
      icon.textContent = "💸";
      const title = document.createElement("p");
      title.className = "empty-state-title";
      title.textContent = t("emptyTransactionsTitle");
      const hint = document.createElement("p");
      hint.className = "empty-state-hint";
      hint.textContent = t("emptyTransactionsHint");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "secondary-btn empty-state-btn";
      btn.textContent = t("addFirstTransaction");
      btn.addEventListener("click", () => {
        document.getElementById("addTransactionSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => document.getElementById("desc")?.focus({ preventScroll: true }), 450);
      });
      panel.appendChild(icon);
      panel.appendChild(title);
      panel.appendChild(hint);
      panel.appendChild(btn);
      list.appendChild(panel);
    } else {
      list.innerHTML = `<li class="empty-state">${t("noTransactionsFound")}</li>`;
    }
    if (toggleTransactionsBtn) toggleTransactionsBtn.classList.add("hidden");
  } else {
    const grouped = groupTransactionsByDay(visibleTransactions);
    grouped.forEach((group) => {
      list.appendChild(createDayHeader(group.label));
      group.items.forEach((transaction) => {
        list.appendChild(createTransactionItem(transaction));
      });
    });

    if (toggleTransactionsBtn) {
      if (filteredTransactions.length > 4) {
        toggleTransactionsBtn.classList.remove("hidden");
        toggleTransactionsBtn.textContent = transactionListExpanded
          ? t("showLessTransactions")
          : `${t("showAllTransactions")} (${filteredTransactions.length - 4} more)`;
      } else {
        toggleTransactionsBtn.classList.add("hidden");
      }
    }
  }

  updateRangeSummary();
  updateMonthlySummary();
  renderBudgetList();
  renderBills();
  renderCategoryTotals();
  updateInsights();
  renderMonthlyTrendChart();
  renderCategoryExpenseChart();
}

function toggleTheme() {
  const body = document.body;
  const nextTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
  body.setAttribute("data-theme", nextTheme);
  localStorage.setItem("theme", nextTheme);
  updateUI();
}

function toggleLanguage() {
  currentLanguage = currentLanguage === "en" ? "es" : "en";
  localStorage.setItem("language", currentLanguage);
  updateUI();
}

function openSideMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuBtn = document.getElementById("menuBtn");

  if (!sideMenu || !menuOverlay) return;

  sideMenu.classList.add("open");
  menuOverlay.classList.add("open");
  document.body.classList.add("menu-is-open");

  sideMenu.setAttribute("aria-hidden", "false");
  menuOverlay.setAttribute("aria-hidden", "false");
  menuBtn?.setAttribute("aria-expanded", "true");
}

function closeSideMenu() {
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuBtn = document.getElementById("menuBtn");

  if (!sideMenu || !menuOverlay) return;

  sideMenu.classList.remove("open");
  menuOverlay.classList.remove("open");
  document.body.classList.remove("menu-is-open");

  sideMenu.setAttribute("aria-hidden", "true");
  menuOverlay.setAttribute("aria-hidden", "true");
  menuBtn?.setAttribute("aria-expanded", "false");
}

function scrollToAppSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  closeSideMenu();

  setTimeout(() => {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 220);
}

function setupSideMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const closeMenuBtn = document.getElementById("closeMenuBtn");
  const menuOverlay = document.getElementById("menuOverlay");
  const sideMenu = document.getElementById("sideMenu");

  menuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    openSideMenu();
  });

  closeMenuBtn?.addEventListener("click", closeSideMenu);
  menuOverlay?.addEventListener("click", closeSideMenu);

  sideMenu?.addEventListener("click", (event) => {
    event.stopPropagation();

    const button = event.target.closest("button");
    if (!button) return;

    const target = button.getAttribute("data-scroll-target");
    const action = button.getAttribute("data-menu-action");

    if (target) {
      scrollToAppSection(target);
      return;
    }

    if (action === "theme") {
      toggleTheme();
      closeSideMenu();
      return;
    }

    if (action === "language") {
      toggleLanguage();
      closeSideMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSideMenu();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  customCategories = customCategories.map(normalizeOtherLabel);
  customCategories = sortCategoriesForDisplay(customCategories);
  saveCategories(); setupSideMenu();

  const transactionDate = document.getElementById("transactionDate");
  const monthPicker = document.getElementById("monthPicker");
  if (transactionDate) transactionDate.value = getTodayInputValue();
  if (monthPicker) monthPicker.value = getCurrentMonthValue();
  const billDueDate = document.getElementById("billDueDate");
  if (billDueDate) billDueDate.value = getTodayInputValue();

  // UI: build dynamic controls and strip static currency symbols before
  // any cached render happens, so amounts never render with a doubled symbol.
  buildCurrencySelect();
  buildPeriodToggle();
  setupTransactionSwipe();
  buildDeviceIdCard(); // AUTH: device ID card for security rules
  updateDeviceIdUI();
  stripHardcodedCurrencySymbols();

  populateCategorySelects();
  // AUTH: cached data loads only after sign-in (inside startFirestoreListeners).
  registerServiceWorker();

  document.getElementById("monthPicker")?.addEventListener("change", () => {
    updateMonthlySummary();
    updateInsights();
    renderBudgetList();
  });

  document.getElementById("searchInput")?.addEventListener("input", updateUI);
  document.getElementById("filterType")?.addEventListener("change", updateUI);
  document.getElementById("filterCategory")?.addEventListener("change", updateUI);
  document.getElementById("sortOption")?.addEventListener("change", updateUI);
  document.getElementById("clearFiltersBtn")?.addEventListener("click", clearFilters);
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportCsv);
  document.getElementById("toggleTransactionsBtn")?.addEventListener("click", () => {
    transactionListExpanded = !transactionListExpanded;
    updateUI();
  });
  document.getElementById("saveBudgetBtn")?.addEventListener("click", saveBudget);
  document.getElementById("addBillBtn")?.addEventListener("click", addBill);
  document.getElementById("undoDeleteBtn")?.addEventListener("click", undoDelete);

  document.getElementById("addCategoryBtn")?.addEventListener("click", addCustomCategory);
  document.getElementById("deleteCategoryBtn")?.addEventListener("click", deleteCustomCategory);
  document.getElementById("newCategoryInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomCategory();
    }
  });

  document.getElementById("closeEditModalBtn")?.addEventListener("click", closeEditModal);
  document.getElementById("cancelEditBtn")?.addEventListener("click", closeEditModal);
  document.getElementById("editModalBackdrop")?.addEventListener("click", closeEditModal);
  document.getElementById("saveEditBtn")?.addEventListener("click", saveEditTransaction);

  document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);
  document.getElementById("languageToggleBtn")?.addEventListener("click", toggleLanguage);

  document.getElementById("menuBtn")?.addEventListener("click", openSideMenu);
  document.getElementById("closeMenuBtn")?.addEventListener("click", closeSideMenu);
  document.getElementById("menuOverlay")?.addEventListener("click", closeSideMenu);

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => scrollToAppSection(button.dataset.scrollTarget));
  });

  document.querySelectorAll("[data-menu-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.menuAction;
      if (action === "theme") toggleTheme();
      if (action === "language") toggleLanguage();
      closeSideMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSideMenu();
  });

  window.addEventListener("online", () => {
    updateConnectionBadge();
    setSyncBadge("ready");
  });

  window.addEventListener("offline", () => {
    updateConnectionBadge();
    setSyncBadge("cached");
  });

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.body.setAttribute("data-theme", savedTheme);
  }

  document.getElementById("syncBadge")?.addEventListener("click", () => {
    // UI: tappable badge forces a full re-render.
    updateUI();
    showToast(t("upToDate"));
  });

  translateStaticText();
  populateCategorySelects();
  try {
    ensureAuthenticated(); // AUTH: listeners attach only after Google sign-in
  } catch (error) {
    console.error("Auth init failed:", error);
    document.body.classList.add("auth-locked");
    showSignInOverlay();
    showToast(t("signInError"));
  }
});