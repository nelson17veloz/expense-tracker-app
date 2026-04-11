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

let transactions = [];
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};
let activeRangeStart = "";
let activeRangeEnd = "";
let deletedTransactionCache = null;
let deleteUndoTimer = null;
let monthlyTrendChart = null;
let categoryExpenseChart = null;

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatDate(timestamp) {
  if (!timestamp) return "No date";
  return new Date(Number(timestamp)).toLocaleDateString();
}

function formatDateForInput(timestamp) {
  const date = new Date(Number(timestamp));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return "Current month";
  const [year, month] = monthValue.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
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
  document.getElementById("desc").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("category").value = "General";
  document.getElementById("notes").value = "";
  document.getElementById("transactionDate").value = getTodayInputValue();
  document.getElementById("isRecurring").value = "false";
}

function validateTransaction(desc, amountValue, dateValue) {
  const cleanDesc = desc.trim();
  const numericAmount = Number(amountValue);

  if (!cleanDesc) {
    alert("Please enter a description.");
    return false;
  }

  if (amountValue === "" || Number.isNaN(numericAmount)) {
    alert("Please enter a valid amount.");
    return false;
  }

  if (numericAmount < 0) {
    alert("Please enter a positive amount.");
    return false;
  }

  if (!dateValue) {
    alert("Please choose a date.");
    return false;
  }

  return true;
}

function toggleSection(sectionId, button) {
  const content = document.getElementById(sectionId);
  const isOpen = content.classList.contains("open");
  content.classList.toggle("open", !isOpen);
  button.classList.toggle("open", !isOpen);
}

function loadTransactions() {
  db.collection("transactions")
    .orderBy("timestamp", "desc")
    .onSnapshot(
      (snapshot) => {
        transactions = [];
        snapshot.forEach((doc) => {
          transactions.push({
            id: doc.id,
            ...doc.data()
          });
        });
        updateUI();
      },
      (error) => {
        console.error("Error loading transactions:", error);
        alert("There was a problem loading your transactions.");
      }
    );
}

function addTransaction(type) {
  const desc = document.getElementById("desc").value.trim();
  const amountValue = document.getElementById("amount").value;
  const category = document.getElementById("category").value;
  const notes = document.getElementById("notes").value.trim();
  const transactionDate = document.getElementById("transactionDate").value;
  const isRecurring = document.getElementById("isRecurring").value === "true";

  if (!validateTransaction(desc, amountValue, transactionDate)) return;

  db.collection("transactions")
    .add({
      type,
      desc,
      amount: Number(amountValue),
      category,
      notes,
      recurring: isRecurring,
      timestamp: getStartOfDay(transactionDate),
      createdAt: Date.now()
    })
    .then(() => {
      clearInputs();
    })
    .catch((error) => {
      console.error("Error adding transaction:", error);
      alert("There was a problem adding the transaction.");
    });
}

function addIncome() {
  addTransaction("Income");
}

function addExpense() {
  addTransaction("Expense");
}

function showUndoToast(message) {
  const toast = document.getElementById("toast");
  document.getElementById("toastMessage").textContent = message;
  toast.classList.remove("hidden");

  if (deleteUndoTimer) {
    clearTimeout(deleteUndoTimer);
  }

  deleteUndoTimer = setTimeout(() => {
    toast.classList.add("hidden");
    deletedTransactionCache = null;
  }, 5000);
}

function deleteTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  deletedTransactionCache = { ...transaction };

  db.collection("transactions")
    .doc(id)
    .delete()
    .then(() => {
      showUndoToast("Transaction deleted.");
    })
    .catch((error) => {
      console.error("Error deleting transaction:", error);
      alert("There was a problem deleting the transaction.");
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
      document.getElementById("toast").classList.add("hidden");
    })
    .catch((error) => {
      console.error("Error restoring transaction:", error);
      alert("There was a problem restoring the transaction.");
    });
}

function openEditModal(transaction) {
  document.getElementById("editId").value = transaction.id;
  document.getElementById("editDesc").value = transaction.desc || "";
  document.getElementById("editAmount").value = transaction.amount || "";
  document.getElementById("editCategory").value = transaction.category || "General";
  document.getElementById("editDate").value = formatDateForInput(transaction.timestamp);
  document.getElementById("editRecurring").value = transaction.recurring ? "true" : "false";
  document.getElementById("editNotes").value = transaction.notes || "";
  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

function saveEditTransaction() {
  const id = document.getElementById("editId").value;
  const desc = document.getElementById("editDesc").value.trim();
  const amountValue = document.getElementById("editAmount").value;
  const category = document.getElementById("editCategory").value;
  const dateValue = document.getElementById("editDate").value;
  const recurring = document.getElementById("editRecurring").value === "true";
  const notes = document.getElementById("editNotes").value.trim();

  if (!validateTransaction(desc, amountValue, dateValue)) return;

  db.collection("transactions")
    .doc(id)
    .update({
      desc,
      amount: Number(amountValue),
      category,
      notes,
      recurring,
      timestamp: getStartOfDay(dateValue)
    })
    .then(() => {
      closeEditModal();
    })
    .catch((error) => {
      console.error("Error updating transaction:", error);
      alert("There was a problem updating the transaction.");
    });
}

function getFilteredTransactions() {
  const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();
  const filterType = document.getElementById("filterType").value;
  const filterCategory = document.getElementById("filterCategory").value;
  const sortOption = document.getElementById("sortOption").value;

  let result = [...transactions];

  result = result.filter((transaction) => {
    const matchesSearch =
      !searchTerm ||
      transaction.desc?.toLowerCase().includes(searchTerm) ||
      transaction.notes?.toLowerCase().includes(searchTerm) ||
      transaction.category?.toLowerCase().includes(searchTerm);

    const matchesType = filterType === "All" || transaction.type === filterType;
    const matchesCategory = filterCategory === "All" || transaction.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  result.sort((a, b) => {
    if (sortOption === "newest") return Number(b.timestamp) - Number(a.timestamp);
    if (sortOption === "oldest") return Number(a.timestamp) - Number(b.timestamp);
    if (sortOption === "highest") return Number(b.amount) - Number(a.amount);
    if (sortOption === "lowest") return Number(a.amount) - Number(b.amount);
    if (sortOption === "az") return (a.desc || "").localeCompare(b.desc || "");
    if (sortOption === "za") return (b.desc || "").localeCompare(a.desc || "");
    return 0;
  });

  return result;
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
  document.getElementById(ids.income).textContent = formatMoney(summary.income);
  document.getElementById(ids.expenses).textContent = formatMoney(summary.expenses);

  const netEl = document.getElementById(ids.net);
  netEl.textContent = `$${formatMoney(summary.net)}`;
  netEl.classList.remove("net-positive", "net-negative");
  netEl.classList.add(summary.net >= 0 ? "net-positive" : "net-negative");

  const highestIncomeEl = document.getElementById(ids.highestIncome);
  const highestIncomeDateEl = document.getElementById(ids.highestIncomeDate);
  const highestExpenseEl = document.getElementById(ids.highestExpense);
  const highestExpenseDateEl = document.getElementById(ids.highestExpenseDate);

  if (summary.highestIncome) {
    highestIncomeEl.textContent = `${summary.highestIncome.desc} — $${formatMoney(summary.highestIncome.amount)}`;
    highestIncomeDateEl.textContent = formatDate(summary.highestIncome.timestamp);
  } else {
    highestIncomeEl.textContent = "None";
    highestIncomeDateEl.textContent = "No income found";
  }

  if (summary.highestExpense) {
    highestExpenseEl.textContent = `${summary.highestExpense.desc} — $${formatMoney(summary.highestExpense.amount)}`;
    highestExpenseDateEl.textContent = formatDate(summary.highestExpense.timestamp);
  } else {
    highestExpenseEl.textContent = "None";
    highestExpenseDateEl.textContent = "No expense found";
  }
}

function applyRangeSummary() {
  const startValue = document.getElementById("rangeStart").value;
  const endValue = document.getElementById("rangeEnd").value;

  if (startValue && endValue && getStartOfDay(startValue) > getEndOfDay(endValue)) {
    alert("Start date cannot be after end date.");
    return;
  }

  activeRangeStart = startValue;
  activeRangeEnd = endValue;
  updateRangeSummary();
}

function resetRangeSummary() {
  activeRangeStart = "";
  activeRangeEnd = "";
  document.getElementById("rangeStart").value = "";
  document.getElementById("rangeEnd").value = "";
  updateRangeSummary();
}

function updateRangeSummary() {
  const labelEl = document.getElementById("selectedRangeLabel");
  const summary = calculateSummaryData(getTransactionsInRange(activeRangeStart, activeRangeEnd));

  if (activeRangeStart && activeRangeEnd) {
    labelEl.textContent = `${activeRangeStart} to ${activeRangeEnd}`;
  } else if (activeRangeStart) {
    labelEl.textContent = `From ${activeRangeStart}`;
  } else if (activeRangeEnd) {
    labelEl.textContent = `Up to ${activeRangeEnd}`;
  } else {
    labelEl.textContent = "Showing all transactions";
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
  let monthValue = monthPicker.value;

  if (!monthValue) {
    monthValue = getCurrentMonthValue();
    monthPicker.value = monthValue;
  }

  selectedMonthLabel.textContent = formatMonthLabel(monthValue);

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
  budgetList.innerHTML = "";

  const monthValue = document.getElementById("monthPicker").value || getCurrentMonthValue();
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
    budgetList.innerHTML = `<div class="empty-state">No budget goals set yet.</div>`;
    return;
  }

  categories.forEach((category) => {
    const budgetAmount = Number(budgets[category]);
    const spent = Number(expenseTotals[category] || 0);
    const remaining = budgetAmount - spent;

    const item = document.createElement("div");
    item.className = "stack-item";

    const main = document.createElement("div");
    main.className = "stack-item-main";

    const title = document.createElement("div");
    title.className = "stack-item-title";
    title.textContent = `${category} — Budget $${formatMoney(budgetAmount)}`;

    const subtitle = document.createElement("div");
    subtitle.className = "stack-item-subtitle";
    subtitle.textContent =
      remaining >= 0
        ? `Spent $${formatMoney(spent)} • Remaining $${formatMoney(remaining)}`
        : `Spent $${formatMoney(spent)} • Over budget by $${formatMoney(Math.abs(remaining))}`;

    main.appendChild(title);
    main.appendChild(subtitle);

    const removeBtn = document.createElement("button");
    removeBtn.className = "stack-item-btn";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      delete budgets[category];
      localStorage.setItem("budgets", JSON.stringify(budgets));
      renderBudgetList();
    };

    item.appendChild(main);
    item.appendChild(removeBtn);
    budgetList.appendChild(item);
  });
}

function renderCategoryTotals() {
  const container = document.getElementById("categoryTotalsList");
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

  const categories = Object.keys(totals).sort();

  if (categories.length === 0) {
    container.innerHTML = `<div class="empty-state">No category totals yet.</div>`;
    return;
  }

  categories.forEach((category) => {
    const item = document.createElement("div");
    item.className = "stack-item";

    const main = document.createElement("div");
    main.className = "stack-item-main";

    const title = document.createElement("div");
    title.className = "stack-item-title";
    title.textContent = category;

    const subtitle = document.createElement("div");
    subtitle.className = "stack-item-subtitle";
    subtitle.textContent = `Income $${formatMoney(totals[category].income)} • Expense $${formatMoney(totals[category].expense)}`;

    main.appendChild(title);
    main.appendChild(subtitle);
    item.appendChild(main);
    container.appendChild(item);
  });
}

function renderMonthlyTrendChart() {
  const canvas = document.getElementById("monthlyTrendChart");
  if (!canvas) return;

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

  if (monthlyTrendChart) {
    monthlyTrendChart.destroy();
  }

  monthlyTrendChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: colors.income,
          borderRadius: 10
        },
        {
          label: "Expenses",
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
          labels: {
            color: colors.text
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: colors.muted
          },
          grid: {
            color: colors.grid
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: colors.muted
          },
          grid: {
            color: colors.grid
          }
        }
      }
    }
  });
}

function renderCategoryExpenseChart() {
  const canvas = document.getElementById("categoryExpenseChart");
  if (!canvas) return;

  const totals = {};
  transactions.forEach((transaction) => {
    if (transaction.type === "Expense") {
      const category = transaction.category || "Other";
      totals[category] = (totals[category] || 0) + Number(transaction.amount);
    }
  });

  const labels = Object.keys(totals);
  const data = labels.map((label) => totals[label]);
  const colors = getChartColors();
  const backgroundColors = labels.map((_, index) => colors.pie[index % colors.pie.length]);

  if (categoryExpenseChart) {
    categoryExpenseChart.destroy();
  }

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
          labels: {
            color: colors.text
          }
        }
      }
    }
  });
}

function exportCsv() {
  const rows = [
    ["Type", "Description", "Amount", "Category", "Date", "Recurring", "Notes"]
  ];

  getFilteredTransactions().forEach((transaction) => {
    rows.push([
      transaction.type || "",
      transaction.desc || "",
      formatMoney(transaction.amount),
      transaction.category || "",
      formatDate(transaction.timestamp),
      transaction.recurring ? "Yes" : "No",
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
  link.download = "expense-tracker-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("filterType").value = "All";
  document.getElementById("filterCategory").value = "All";
  document.getElementById("sortOption").value = "newest";
  updateUI();
}

function saveBudget() {
  const category = document.getElementById("budgetCategory").value;
  const amountValue = document.getElementById("budgetAmount").value;

  if (amountValue === "" || Number.isNaN(Number(amountValue)) || Number(amountValue) < 0) {
    alert("Please enter a valid budget amount.");
    return;
  }

  budgets[category] = Number(amountValue);
  localStorage.setItem("budgets", JSON.stringify(budgets));
  document.getElementById("budgetAmount").value = "";
  renderBudgetList();
}

function updateUI() {
  const list = document.getElementById("list");
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

  document.getElementById("balance").textContent = `$${formatMoney(balance)}`;
  document.getElementById("income").textContent = formatMoney(income);
  document.getElementById("expenses").textContent = formatMoney(expenses);

  const filteredTransactions = getFilteredTransactions();

  if (filteredTransactions.length === 0) {
    list.innerHTML = `<li class="empty-state">No transactions found.</li>`;
  }

  filteredTransactions.forEach((transaction) => {
    const li = document.createElement("li");
    li.className = `transaction-item ${transaction.type === "Income" ? "income" : "expense"}`;

    const left = document.createElement("div");
    left.className = "transaction-left";

    const title = document.createElement("p");
    title.className = "transaction-title";
    title.textContent = transaction.desc;

    const meta = document.createElement("p");
    meta.className = "transaction-meta";
    meta.textContent = `${transaction.type} • ${transaction.category || "General"} • ${formatDate(transaction.timestamp)}${transaction.recurring ? " • Recurring" : ""}`;

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
      const confirmed = confirm("Delete this transaction?");
      if (confirmed) deleteTransaction(transaction.id);
    };

    right.appendChild(amount);
    right.appendChild(editBtn);
    right.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });

  updateRangeSummary();
  updateMonthlySummary();
  renderBudgetList();
  renderCategoryTotals();
  renderMonthlyTrendChart();
  renderCategoryExpenseChart();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("transactionDate").value = getTodayInputValue();
  document.getElementById("monthPicker").value = getCurrentMonthValue();

  document.getElementById("monthPicker").addEventListener("change", updateMonthlySummary);
  document.getElementById("searchInput").addEventListener("input", updateUI);
  document.getElementById("filterType").addEventListener("change", updateUI);
  document.getElementById("filterCategory").addEventListener("change", updateUI);
  document.getElementById("sortOption").addEventListener("change", updateUI);
  document.getElementById("clearFiltersBtn").addEventListener("click", clearFilters);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("saveBudgetBtn").addEventListener("click", saveBudget);
  document.getElementById("undoDeleteBtn").addEventListener("click", undoDelete);

  document.getElementById("closeEditModalBtn").addEventListener("click", closeEditModal);
  document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);
  document.getElementById("editModalBackdrop").addEventListener("click", closeEditModal);
  document.getElementById("saveEditBtn").addEventListener("click", saveEditTransaction);

  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    const body = document.body;
    const nextTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    body.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    updateUI();
  });

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.body.setAttribute("data-theme", savedTheme);
  }

  loadTransactions();
});