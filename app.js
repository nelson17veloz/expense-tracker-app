  const firebaseConfig = {
    apiKey: "AIzaSyBspytMh9FSEc9Fg8rL4bb9W7hQXngiOtA",
    authDomain: "expense-tracker-dfb13.firebaseapp.com",
    projectId: "expense-tracker-dfb13",
    storageBucket: "expense-tracker-dfb13.firebasestorage.app",
    messagingSenderId: "920792166929",
    appId: "1:920792166929:web:88b5fd1bdd2441726377b0"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

let balance = 0;
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function updateUI() {
  const list = document.getElementById("list");
  const balanceEl = document.getElementById("balance");

  list.innerHTML = "";
  balance = 0;

  transactions.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.type}: ${t.desc} $${t.amount}`;
    list.appendChild(li);

    if (t.type === "Income") balance += t.amount;
    else balance -= t.amount;
  });

  balanceEl.textContent = `$${balance}`;
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function addTransaction(type) {
  const desc = document.getElementById("desc").value;
  const amount = Number(document.getElementById("amount").value);

  db.collection("transactions").add({
    type,
    desc,
    amount,
    timestamp: Date.now()
  });
}

function addIncome() {
  addTransaction("Income");
}

function loadTransactions() {
  db.collection("transactions")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      transactions = [];

      snapshot.forEach(doc => {
        transactions.push(doc.data());
      });

      updateUI();
    });
}
