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
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};
let activeRangeStart = "";
let activeRangeEnd = "";
let deletedTransactionCache = null;
let deleteUndoTimer = null;
let monthlyTrendChart = null;
let categoryExpenseChart = null;
let currentLanguage = localStorage.getItem("language") || "en";
let recurringProcessing = false;

const LOCAL_TRANSACTIONS_KEY = "expense_tracker_cached_transactions_v2";
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
    categoryTooShort: "Category name is too short."
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
    categoryTooShort: "El nombre de la categoría es muy corto."
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
  const categorySelectIds = ["category", "budgetCategory", "editCategory"];
  const filterSelect = document.getElementById("filterCategory");
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
  saveCategories();
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

  if (desc) desc.placeholder = currentLanguage === "en" ? "Paycheck, Groceries, Gas..." : "Cheque, Compra, Gasolina...";
  if (amount) amount.placeholder = "0.00";
  if (notes) notes.placeholder = currentLanguage === "en" ? "Optional notes..." : "Notas opcionales...";
  if (searchInput) searchInput.placeholder =
    currentLanguage === "en"
      ? "Search description, notes, category..."
      : "Buscar descripción, notas, categoría...";
  if (budgetAmount) budgetAmount.placeholder = "0.00";
  if (newCategoryInput) newCategoryInput.placeholder = "";
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

function formatDate(timestamp) {
  if (!timestamp) return "";
  return new Date(Number(timestamp)).toLocaleDateString(
    currentLanguage === "es" ? "es-ES" : undefined
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
  if (!timestamp) return "";
  return `${formatDate(timestamp)} ${t("at")} ${formatTime(timestamp)}`;
}

function formatDateForInput(timestamp) {
  const date = new Date(Number(timestamp));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return t("currentMonth");
  const [year, month] = monthValue.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    currentLanguage === "es" ? "es-ES" : undefined,
    { month: "long", year: "numeric" }
  );
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getStartOfDay(dateString) {
  return new Date(`${dateString}T00:00:00`).getTime();
}

function getEndOfDay(dateString) {
  return new Date(`${dateString}T23:59:59.999`).getTime();
}

function addDays(timestamp, days) {
  const date = new Date(Number(timestamp));
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function addMonths(timestamp, months) {
  const date = new Date(Number(timestamp));
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < day) {
    date.setDate(0);
  }
  return date.getTime();
}

function getDayKey(timestamp) {
  const date = new Date(Number(timestamp));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayLabel(timestamp) {
  const date = new Date(Number(timestamp));
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const todayKey = getDayKey(today.getTime());
  const yesterdayKey = getDayKey(yesterday.getTime());
  const dateKey = getDayKey(timestamp);

  if (dateKey === todayKey) return t("today");
  if (dateKey === yesterdayKey) return t("yesterday");

  return date.toLocaleDateString(currentLanguage === "es" ? "es-ES" : undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
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

      transactions.forEach((transaction) => {
        const category = normalizeOtherLabel(transaction.category);
        const exists = customCategories.some((item) => item.toLowerCase() === category.toLowerCase());
        if (category && !exists) {
          customCategories.push(category);
        }
      });

      customCategories = sortCategoriesForDisplay(customCategories);
      saveCategories();
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
  const [year, month] = monthValue.split("-");
  const start = new Date(Number(year), Number(month) - 1, 1).getTime();
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).getTime();

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

  if (incomeEl) incomeEl.textContent = formatMoney(summary.income);
  if (expensesEl) expensesEl.textContent = formatMoney(summary.expenses);

  if (netEl) {
    netEl.textContent = `$${formatMoney(summary.net)}`;
    netEl.classList.remove("net-positive", "net-negative");
    netEl.classList.add(summary.net >= 0 ? "net-positive" : "net-negative");
  }

  if (highestIncomeEl && highestIncomeDateEl) {
    if (summary.highestIncome) {
      highestIncomeEl.textContent = `${summary.highestIncome.desc} — $${formatMoney(summary.highestIncome.amount)}`;
      highestIncomeDateEl.textContent = formatDateTime(summary.highestIncome.createdAt);
    } else {
      highestIncomeEl.textContent = "None";
      highestIncomeDateEl.textContent = t("noIncomeFound");
    }
  }

  if (highestExpenseEl && highestExpenseDateEl) {
    if (summary.highestExpense) {
      highestExpenseEl.textContent = `${summary.highestExpense.desc} — $${formatMoney(summary.highestExpense.amount)}`;
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
    budgetList.innerHTML = `<div class="empty-state">${t("noBudgetGoals")}</div>`;
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

      const title = document.createElement("div");
      title.className = "stack-item-title";
      title.textContent = `${translateCategory(category)} — $${formatMoney(budgetAmount)}`;

      const subtitle = document.createElement("div");
      subtitle.className = "stack-item-subtitle";
      subtitle.textContent =
        remaining >= 0
          ? `${t("spent")} $${formatMoney(spent)} • ${t("remaining")} $${formatMoney(remaining)}`
          : `${t("spent")} $${formatMoney(spent)} • ${t("overBudgetBy")} $${formatMoney(Math.abs(remaining))}`;

      main.appendChild(title);
      main.appendChild(subtitle);

      const removeBtn = document.createElement("button");
      removeBtn.className = "stack-item-btn";
      removeBtn.type = "button";
      removeBtn.textContent = t("remove");
      removeBtn.onclick = () => {
        delete budgets[category];
        localStorage.setItem("budgets", JSON.stringify(budgets));
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
    subtitle.textContent = `${t("income")} $${formatMoney(totals[category].income)} • ${t("expense")} $${formatMoney(totals[category].expense)}`;

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
  const previousMonthDate = new Date(Number(year), Number(month) - 2, 1);
  const prevMonthValue = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
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
      topCategoryDetailEl.textContent = `$${formatMoney(topCategoryEntry[1])}`;
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
}

function renderMonthlyTrendChart() {
  const canvas = document.getElementById("monthlyTrendChart");
  if (!canvas || typeof Chart === "undefined") return;

  const grouped = {};

  transactions.forEach((transaction) => {
    const date = new Date(Number(transaction.timestamp));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
  localStorage.setItem("budgets", JSON.stringify(budgets));

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
  amount.textContent = `${transaction.type === "Income" ? "+" : "-"}$${formatMoney(transaction.amount)}`;

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

  li.appendChild(left);
  li.appendChild(right);

  return li;
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
      await db.collection("transactions").add(item);
    }
  } catch (error) {
    console.error("Recurring generation error:", error);
  } finally {
    recurringProcessing = false;
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function updateUI() {
  translateStaticText();
  refreshLanguageSensitiveSelects();

  const list = document.getElementById("list");
  if (!list) return;

  list.innerHTML = "";

  let balance = 0;
  let income = 0;
  let expenses = 0;

  transactions.forEach((transaction) => {
    if (transaction.type === "Income") {
      balance += Number(transaction.amount);
      income += Number(transaction.amount);
    } else {
      balance -= Number(transaction.amount);
      expenses += Number(transaction.amount);
    }
  });

  const balanceEl = document.getElementById("balance");
  const incomeEl = document.getElementById("income");
  const expensesEl = document.getElementById("expenses");

  if (balanceEl) balanceEl.textContent = `$${formatMoney(balance)}`;
  if (incomeEl) incomeEl.textContent = formatMoney(income);
  if (expensesEl) expensesEl.textContent = formatMoney(expenses);

  const filteredTransactions = getFilteredTransactions();

  if (filteredTransactions.length === 0) {
    list.innerHTML = `<li class="empty-state">${t("noTransactionsFound")}</li>`;
  } else {
    const grouped = groupTransactionsByDay(filteredTransactions);
    grouped.forEach((group) => {
      list.appendChild(createDayHeader(group.label));
      group.items.forEach((transaction) => {
        list.appendChild(createTransactionItem(transaction));
      });
    });
  }

  updateRangeSummary();
  updateMonthlySummary();
  renderBudgetList();
  renderCategoryTotals();
  updateInsights();
  renderMonthlyTrendChart();
  renderCategoryExpenseChart();
}

document.addEventListener("DOMContentLoaded", () => {
  customCategories = customCategories.map(normalizeOtherLabel);
  customCategories = sortCategoriesForDisplay(customCategories);
  saveCategories();

  const transactionDate = document.getElementById("transactionDate");
  const monthPicker = document.getElementById("monthPicker");
  if (transactionDate) transactionDate.value = getTodayInputValue();
  if (monthPicker) monthPicker.value = getCurrentMonthValue();

  populateCategorySelects();
  loadCachedTransactions();
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
  document.getElementById("saveBudgetBtn")?.addEventListener("click", saveBudget);
  document.getElementById("undoDeleteBtn")?.addEventListener("click", undoDelete);

  document.getElementById("addCategoryBtn")?.addEventListener("click", addCustomCategory);
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

  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const body = document.body;
    const nextTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    body.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    updateUI();
  });

  document.getElementById("languageToggleBtn")?.addEventListener("click", () => {
    currentLanguage = currentLanguage === "en" ? "es" : "en";
    localStorage.setItem("language", currentLanguage);
    updateUI();
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

  translateStaticText();
  populateCategorySelects();
  loadTransactions();
});