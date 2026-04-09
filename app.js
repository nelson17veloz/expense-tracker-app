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

function addIncome() {
  const desc = document.getElementById("desc").value;
  const amount = Number(document.getElementById("amount").value);

  transactions.push({ type: "Income", desc, amount });
  updateUI();
}

function addExpense() {
  const desc = document.getElementById("desc").value;
  const amount = Number(document.getElementById("amount").value);

  transactions.push({ type: "Expense", desc, amount });
  updateUI();
}

updateUI();