
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
// LOAD TRANSACTIONS (REAL-TIME)
// ==========================
function loadTransactions() {
  db.collection("transactions")
    .orderBy("timestamp", "desc") // newest first
    .onSnapshot(snapshot => {
      transactions = [];

      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      updateUI();
    }, error => {
      alert("Error loading data");
      console.error(error);
    });
}

// ==========================
// ADD TRANSACTION
// ==========================
function addTransaction(type) {
  const descInput = document.getElementById("desc");
  const amountInput = document.getElementById("amount");

  const desc = descInput.value.trim();
  const amount = Number(amountInput.value);

  // validation
  if (!desc || isNaN(amount)) {
    alert("Please enter valid description and amount");
    return;
  }

  db.collection("transactions").add({
    type,
    desc,
    amount,
    timestamp: Date.now()
  })
  .then(() => {
    descInput.value = "";
    amountInput.value = "";
  })
  .catch(err => {
    alert("Error adding transaction");
    console.error(err);
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
  db.collection("transactions").doc(id).delete()
    .catch(err => {
      alert("Error deleting transaction");
      console.error(err);
    });
}

// ==========================
// EDIT TRANSACTION
// ==========================
function editTransaction(id, currentDesc, currentAmount) {
  const newDesc = prompt("Edit description:", currentDesc);
  const newAmount = prompt("Edit amount:", currentAmount);

  if (!newDesc || isNaN(newAmount)) {
    alert("Invalid input");
    return;
  }

  db.collection("transactions").doc(id).update({
    desc: newDesc.trim(),
    amount: Number(newAmount)
  })
  .catch(err => {
    alert("Error updating transaction");
    console.error(err);
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

  transactions.forEach(t => {
    const li = document.createElement("li");

    // color indicator
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px";
    li.style.marginTop = "5px";
    li.style.borderRadius = "6px";

    if (t.type === "Income") {
      li.style.borderLeft = "5px solid green";
      balance += t.amount;
      income += t.amount;
    } else {
      li.style.borderLeft = "5px solid red";
      balance -= t.amount;
      expenses += t.amount;
    }

    // formatted date
    const date = new Date(t.timestamp).toLocaleDateString();

    // text
    const text = document.createElement("span");
    text.textContent = `${t.type}: ${t.desc} $${t.amount} (${date})`;

    // buttons container
    const btnContainer = document.createElement("div");
    btnContainer.style.display = "flex";
    btnContainer.style.gap = "5px";

    // EDIT button
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.onclick = () => {
      editTransaction(t.id, t.desc, t.amount);
    };

    // DELETE button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => {
      if (confirm("Delete this transaction?")) {
        deleteTransaction(t.id);
      }
    };

    btnContainer.appendChild(editBtn);
    btnContainer.appendChild(deleteBtn);

    li.appendChild(text);
    li.appendChild(btnContainer);

    list.appendChild(li);
  });

  // update totals
  balanceEl.textContent = `$${balance}`;
  incomeEl.textContent = income;
  expensesEl.textContent = expenses;
}

// ==========================
// START APP
// ==========================
loadTransactions();