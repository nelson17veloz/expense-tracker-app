
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
// LOAD (REAL TIME)
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

  document.getElementById("desc").value = "";
  document.getElementById("amount").value = "";
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
  db.collection("transactions").doc(id).delete();
}

// ==========================
// EDIT TRANSACTION
// ==========================

function editTransaction(id, currentDesc, currentAmount) {
  const newDesc = prompt("Edit description:", currentDesc);
  const newAmount = prompt("Edit amount:", currentAmount);

  if (!newDesc || !newAmount) return;

  db.collection("transactions").doc(id).update({
    desc: newDesc,
    amount: Number(newAmount)
  });
}

// ==========================
// UI RENDER
// ==========================

function updateUI() {
  const list = document.getElementById("list");
  const balanceEl = document.getElementById("balance");

  list.innerHTML = "";

  let balance = 0;

  transactions.forEach(t => {
    const li = document.createElement("li");

    // TEXT
    const text = document.createElement("span");
    text.textContent = `${t.type}: ${t.desc} $${t.amount}`;

    // EDIT BUTTON
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.onclick = () => editTransaction(t.id, t.desc, t.amount);

    // DELETE BUTTON
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteTransaction(t.id);

    // STYLE (simple inline spacing)
    editBtn.style.marginLeft = "10px";
    deleteBtn.style.marginLeft = "5px";

    li.appendChild(text);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    list.appendChild(li);

    if (t.type === "Income") balance += t.amount;
    else balance -= t.amount;
  });

  balanceEl.textContent = `$${balance}`;
}

// ==========================
// START APP
// ==========================

loadTransactions();