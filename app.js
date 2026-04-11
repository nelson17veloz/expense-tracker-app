// ==========================
// FIREBASE SETUP
// ==========================
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
let activeRangeStart = "";
let activeRangeEnd = "";

// ==========================
// HELPERS
// ==========================
function formatMoney(value) {
  return Number(value).toFixed(2);
}

function formatDate(timestamp) {
  if (!timestamp) return "No date";
  return new Date(timestamp).toLocaleDateString();
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return "Current month";

  const [year, month] = monthValue.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function clearInputs() {
  document.getElementById("desc").value = "";
  document.getElementById("amount").value = "";
}

function validateTransaction(desc, amountValue) {
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

  return true;
}

function getStartOfDay(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.getTime();
}

function getEndOfDay(dateString) {
  const date = new Date(`${dateString}T23:59:59.999`);
  return date.getTime();
}

function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
  const monthStart = new Date(Number(year), Number(month) - 1, 1).getTime();
  const monthEnd = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).getTime();

  return transactions.filter((transaction) => {
    const timestamp = Number(transaction.timestamp);
    return timestamp >= monthStart && timestamp <= monthEnd;
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

  incomeEl.textContent = formatMoney(summary.income);
  expensesEl.textContent = formatMoney(summary.expenses);
  netEl.textContent = `$${formatMoney(summary.net)}`;

  netEl.classList.remove("net-positive", "net-negative");
  if (summary.net >= 0) {
    netEl.classList.add("net-positive");
  } else {
    netEl.classList.add("net-negative");
  }

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

// ==========================
// LOAD TRANSACTIONS
// ==========================
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

// ==========================
// ADD TRANSACTION
// ==========================
function addTransaction(type) {
  const descInput = document.getElementById("desc");
  const amountInput = document.getElementById("amount");

  const desc = descInput.value.trim();
  const amountValue = amountInput.value;

  if (!validateTransaction(desc, amountValue)) return;

  const amount = Number(amountValue);

  db.collection("transactions")
    .add({
      type,
      desc,
      amount,
      timestamp: Date.now()
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

// ==========================
// DELETE TRANSACTION
// ==========================
function deleteTransaction(id) {
  db.collection("transactions")
    .doc(id)
    .delete()
    .catch((error) => {
      console.error("Error deleting transaction:", error);
      alert("There was a problem deleting the transaction.");
    });
}

// ==========================
// EDIT TRANSACTION
// ==========================
function editTransaction(id, currentDesc, currentAmount) {
  const newDesc = prompt("Edit description:", currentDesc);
  if (newDesc === null) return;

  const newAmount = prompt("Edit amount:", currentAmount);
  if (newAmount === null) return;

  if (!validateTransaction(newDesc, newAmount)) return;

  db.collection("transactions")
    .doc(id)
    .update({
      desc: newDesc.trim(),
      amount: Number(newAmount)
    })
    .catch((error) => {
      console.error("Error updating transaction:", error);
      alert("There was a problem updating the transaction.");
    });
}

// ==========================
// RANGE SUMMARY
// ==========================
function applyRangeSummary() {
  const startInput = document.getElementById("rangeStart");
  const endInput = document.getElementById("rangeEnd");

  const startValue = startInput.value;
  const endValue = endInput.value;

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
  const filteredTransactions = getTransactionsInRange(activeRangeStart, activeRangeEnd);
  const summary = calculateSummaryData(filteredTransactions);

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

// ==========================
// MONTHLY SUMMARY
// ==========================
function updateMonthlySummary() {
  const monthPicker = document.getElementById("monthPicker");
  const selectedMonthLabel = document.getElementById("selectedMonthLabel");

  let monthValue = monthPicker.value;
  if (!monthValue) {
    monthValue = getCurrentMonthValue();
    monthPicker.value = monthValue;
  }

  selectedMonthLabel.textContent = formatMonthLabel(monthValue);

  const monthlyTransactions = getTransactionsForMonth(monthValue);
  const summary = calculateSummaryData(monthlyTransactions);

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

// ==========================
// UI RENDER
// ==========================
function updateUI() {
  const list = document.getElementById("list");
  const balanceEl = document.getElementById("balance");
  const incomeEl = document.getElementById("income");
  const expensesEl = document.getElementById("expenses");

  list.innerHTML = "";

  let balance = 0;
  let income = 0;
  let expenses = 0;

  if (transactions.length === 0) {
    list.innerHTML = `<li class="empty-state">No transactions yet.</li>`;
  }

  transactions.forEach((transaction) => {
    const li = document.createElement("li");
    li.className = `transaction-item ${
      transaction.type === "Income" ? "income" : "expense"
    }`;

    const left = document.createElement("div");
    left.className = "transaction-left";

    const title = document.createElement("p");
    title.className = "transaction-title";
    title.textContent = transaction.desc;

    const meta = document.createElement("p");
    meta.className = "transaction-meta";
    meta.textContent = `${transaction.type} • ${formatDate(transaction.timestamp)}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("span");
    amount.className = `transaction-amount ${
      transaction.type === "Income" ? "income-text" : "expense-text"
    }`;
    amount.textContent = `${transaction.type === "Income" ? "+" : "-"}$${formatMoney(transaction.amount)}`;

    const editBtn = document.createElement("button");
    editBtn.className = "small-btn edit-btn";
    editBtn.textContent = "✏️";
    editBtn.setAttribute("aria-label", "Edit transaction");
    editBtn.onclick = () => {
      editTransaction(transaction.id, transaction.desc, transaction.amount);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "small-btn delete-btn";
    deleteBtn.textContent = "🗑️";
    deleteBtn.setAttribute("aria-label", "Delete transaction");
    deleteBtn.onclick = () => {
      const confirmed = confirm("Delete this transaction?");
      if (confirmed) {
        deleteTransaction(transaction.id);
      }
    };

    right.appendChild(amount);
    right.appendChild(editBtn);
    right.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(right);

    list.appendChild(li);

    if (transaction.type === "Income") {
      balance += Number(transaction.amount);
      income += Number(transaction.amount);
    } else {
      balance -= Number(transaction.amount);
      expenses += Number(transaction.amount);
    }
  });

  balanceEl.textContent = `$${formatMoney(balance)}`;
  incomeEl.textContent = formatMoney(income);
  expensesEl.textContent = formatMoney(expenses);

  updateRangeSummary();
  updateMonthlySummary();
}

// ==========================
// START APP
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const monthPicker = document.getElementById("monthPicker");
  monthPicker.value = getCurrentMonthValue();

  monthPicker.addEventListener("change", updateMonthlySummary);

  loadTransactions();
});