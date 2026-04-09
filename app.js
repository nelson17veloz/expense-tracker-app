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

// ==========================
// APP STATE
// ==========================

let transactions = [];

// ==========================
// LOAD DATA (REAL TIME)
// ==========================

function loadTransactions() {
  db.collection("transactions")
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      transactions = [];

      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      updateUI();
    });
}

// ==========================
// ADD TRANSACTION
// ==========================

function addTransaction(type) {
  const desc = document.getElementById("desc").value;
  const amount = Number(document.getElementById("amount").value);

  if (!desc || !amount) return;

  db.collection("transactions").add({
    type,
    desc,
    amount,
    timestamp: Date.now()
  });

  // clear inputs after adding
  document.getElementById("desc").value = "";
  document.getElementById("amount").value = "";
}

// Buttons
function addIncome() {
  addTransaction("Income");
}

function addExpense() {
  addTransaction("Expense");
}

// ==========================
// UPDATE UI
// ==========================

function updateUI() {
  const list = document.getElementById("list");
  const balanceEl = document.getElementById("balance");

  list.innerHTML = "";

  let balance = 0;

  transactions.forEach(t => {
    const li = document.createElement("li");

    li.textContent = `${t.type}: ${t.desc} $${t.amount}`;
    list.appendChild(li);

    if (t.type === "Income") {
      balance += t.amount;
    } else {
      balance -= t.amount;
    }
  });

  balanceEl.textContent = `$${balance}`;
}

// ==========================
// START APP
// ==========================

loadTransactions();