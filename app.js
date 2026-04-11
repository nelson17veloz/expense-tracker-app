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

function clearInputs() {
  document.getElementById("desc").value = "";
  document.getElementById("amount").value = "";
}

function validateTransaction(desc, amount) {
  if (!desc.trim()) {
    alert("Please enter a description.");
    return false;
  }

  if (amount === "" || isNaN(Number(amount))) {
    alert("Please enter a valid amount.");
    return false;
  }

  return true;
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

  transactions.forEach((t) => {
    const li = document.createElement("li");
    li.className = `transaction-item ${t.type === "Income" ? "income" : "expense"}`;

    const left = document.createElement("div");
    left.className = "transaction-left";

    const title = document.createElement("p");
    title.className = "transaction-title";
    title.textContent = t.desc;

    const meta = document.createElement("p");
    meta.className = "transaction-meta";
    meta.textContent = `${t.type} • ${formatDate(t.timestamp)}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("span");
    amount.className = `transaction-amount ${t.type === "Income" ? "income-text" : "expense-text"}`;
    amount.textContent = `${t.type === "Income" ? "+" : "-"}$${formatMoney(t.amount)}`;

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.className = "small-btn edit-btn";
    editBtn.onclick = () => {
      editTransaction(t.id, t.desc, t.amount);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "small-btn delete-btn";
    deleteBtn.onclick = () => {
      const confirmed = confirm("Delete this transaction?");
      if (confirmed) {
        deleteTransaction(t.id);
      }
    };

    right.appendChild(amount);
    right.appendChild(editBtn);
    right.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(right);

    list.appendChild(li);

    if (t.type === "Income") {
      balance += Number(t.amount);
      income += Number(t.amount);
    } else {
      balance -= Number(t.amount);
      expenses += Number(t.amount);
    }
  });

  balanceEl.textContent = `$${formatMoney(balance)}`;
  incomeEl.textContent = formatMoney(income);
  expensesEl.textContent = formatMoney(expenses);
}

// ==========================
// START APP
// ==========================
loadTransactions();