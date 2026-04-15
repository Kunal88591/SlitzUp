const toastEl = document.getElementById("toast");
const profileBox = document.getElementById("profileBox");

const groupSelect = document.getElementById("groupSelect");
const createGroupForm = document.getElementById("createGroupForm");
const groupNameInput = document.getElementById("groupNameInput");
const addMemberForm = document.getElementById("addMemberForm");
const memberNameInput = document.getElementById("memberNameInput");
const groupInfo = document.getElementById("groupInfo");
const memberChips = document.getElementById("memberChips");

const expenseForm = document.getElementById("expenseForm");
const expenseNameInput = document.getElementById("expenseName");
const expenseAmountInput = document.getElementById("expenseAmount");
const expensePayer = document.getElementById("expensePayer");
const splitTypeSelect = document.getElementById("splitType");
const splitInputs = document.getElementById("splitInputs");
const balancesList = document.getElementById("balancesList");
const expensesList = document.getElementById("expensesList");
const refreshBalancesBtn = document.getElementById("refreshBalancesBtn");

let currentUser = null;
let userGroups = [];
let currentGroupId = "";
let currentMembers = [];
let currentDebts = [];

// LOCAL STORAGE HELPERS
function uuid() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const DB_KEY = "slitzup_offline_db";
function getDB() {
  const db = localStorage.getItem(DB_KEY);
  if (db) return JSON.parse(db);
  return { users: [], groups: [], members: [], expenses: [], settlements: [] };
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// EXISTING UTILS
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function closeEnough(a, b, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance;
}

function setEmptyState(container, text) {
  container.innerHTML = `<p class="muted">${text}</p>`;
}

function allocateEvenShares(totalAmount, members) {
  const totalPaise = Math.round(totalAmount * 100);
  const base = Math.floor(totalPaise / members.length);
  let remainder = totalPaise - base * members.length;

  return members.map((member) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    const paise = base + extra;
    const amount = paise / 100;
    return {
      member_id: member.id,
      amount,
      percentage: Number(((amount / totalAmount) * 100).toFixed(2))
    };
  });
}

function renderSignedOut() {
  profileBox.innerHTML = `
    <form id="authForm" class="stack bordered" style="background: transparent;">
      <h3>Sign In (Offline Mode)</h3>
      <input type="email" id="authEmail" placeholder="Email" required />
      <input type="password" id="authPassword" placeholder="Any Password" required />
      <div class="field-row two">
        <button type="submit" class="btn primary">Start Testing</button>
      </div>
    </form>
  `;

  document.getElementById("authForm").addEventListener("submit", onSignIn);

  groupSelect.innerHTML = '<option value="">No group selected</option>';
  groupSelect.disabled = true;
  memberChips.innerHTML = "";
  groupInfo.innerHTML = '<p class="muted">Members are simple names in this organizer-only app.</p>';
  setEmptyState(balancesList, "Sign in to see balances.");
  setEmptyState(expensesList, "Sign in to see your expense ledger.");
}

function renderSignedIn(user) {
  profileBox.innerHTML = `
    <div class="user-card">
      <div style="background: #e2e8f0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="font-weight: bold;">U</span>
      </div>
      <div>
        <p><strong>${user.email}</strong></p>
        <p class="muted">Test Mode Active</p>
      </div>
      <button id="signOutBtn" class="btn ghost">Sign out</button>
    </div>
  `;

  document.getElementById("signOutBtn").addEventListener("click", onSignOut);
}

async function onSignIn(e) {
  e.preventDefault();
  const email = document.getElementById("authEmail").value;
  if (!email) return showToast("Email is required.");
  
  const db = getDB();
  let user = db.users.find(u => u.email === email);
  if (!user) {
    user = { id: uuid(), email };
    db.users.push(user);
    saveDB(db);
  }
  
  localStorage.setItem("slitzup_session", JSON.stringify(user));
  currentUser = user;
  renderSignedIn(user);
  showToast("Offline session started!");
  await loadGroups();
}

async function onSignOut() {
  localStorage.removeItem("slitzup_session");
  currentUser = null;
  currentGroupId = "";
  currentMembers = [];
  renderSignedOut();
}

async function loadGroups() {
  const db = getDB();
  userGroups = db.groups.filter(g => g.organizer_id === currentUser.id).sort((a,b) => a.created_at - b.created_at);
  groupSelect.innerHTML = "";

  if (userGroups.length === 0) {
    groupSelect.disabled = true;
    groupSelect.innerHTML = '<option value="">No groups yet</option>';
    currentGroupId = "";
    currentMembers = [];
    memberChips.innerHTML = "";
    groupInfo.innerHTML = '<p class="muted">Create your first group to start tracking expenses.</p>';
    setEmptyState(balancesList, "No balances yet.");
    setEmptyState(expensesList, "No expenses yet.");
    return;
  }

  userGroups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });

  groupSelect.disabled = false;
  if (!userGroups.some((g) => g.id === currentGroupId)) {
    currentGroupId = userGroups[0].id;
  }

  groupSelect.value = currentGroupId;
  await onGroupChange();
}

async function onGroupChange() {
  currentGroupId = groupSelect.value;
  if (!currentGroupId) return;

  const group = userGroups.find((item) => item.id === currentGroupId);
  groupInfo.innerHTML = `
    <p><strong>${group?.name || "Group"}</strong></p>
    <p class="muted">Organizer manages members by name only. No teammate logins needed.</p>
  `;

  await Promise.all([loadMembers(), loadExpenses(), loadBalances()]);
}

async function loadMembers() {
  const db = getDB();
  currentMembers = db.members.filter(m => m.group_id === currentGroupId).sort((a,b) => a.created_at - b.created_at);

  memberChips.innerHTML = "";
  expensePayer.innerHTML = "";

  currentMembers.forEach((member) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = member.name;
    memberChips.appendChild(chip);

    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = member.name;
    expensePayer.appendChild(option);
  });

  if (currentMembers.length === 0) {
    memberChips.innerHTML = '<p class="muted">Add at least one member.</p>';
  }

  renderSplitInputs();
}

function renderSplitInputs() {
  const splitType = splitTypeSelect.value;

  if (!currentMembers.length) {
    setEmptyState(splitInputs, "No members available.");
    return;
  }

  if (splitType === "equal") {
    splitInputs.innerHTML = '<p class="muted">Equal split selected. Everyone shares the same amount.</p>';
    return;
  }

  const title = splitType === "percentage" ? "Percentage" : "Exact amount";
  const suffix = splitType === "percentage" ? "%" : "₹";

  splitInputs.innerHTML = currentMembers
    .map(
      (member) => `
      <label class="split-input-card">
        ${member.name} (${title})
        <input
          type="number"
          min="0"
          step="0.01"
          data-member-id="${member.id}"
          placeholder="${suffix}"
          required
        />
      </label>
    `
    )
    .join("");
}

function collectSplitShares(totalAmount, splitType) {
  if (splitType === "equal") return allocateEvenShares(totalAmount, currentMembers);

  const inputs = Array.from(splitInputs.querySelectorAll("input"));
  const values = inputs.map((input) => ({ member_id: input.dataset.memberId, value: toNumber(input.value) }));

  if (splitType === "percentage") {
    const percentTotal = values.reduce((sum, item) => sum + item.value, 0);
    if (!closeEnough(percentTotal, 100)) throw new Error("Percentage split must total exactly 100%.");
    return values.map((item) => ({ member_id: item.member_id, percentage: Number(item.value.toFixed(2)), amount: Number(((item.value / 100) * totalAmount).toFixed(2)) }));
  }

  const amountTotal = values.reduce((sum, item) => sum + item.value, 0);
  if (!closeEnough(amountTotal, totalAmount)) throw new Error("Exact amounts must equal total expense.");
  return values.map((item) => ({ member_id: item.member_id, amount: Number(item.value.toFixed(2)), percentage: Number(((item.value / totalAmount) * 100).toFixed(2)) }));
}

async function createGroup(name) {
  const db = getDB();
  db.groups.push({ id: uuid(), name, organizer_id: currentUser.id, created_at: Date.now() });
  saveDB(db);
}

async function addMember(name) {
  const db = getDB();
  db.members.push({ id: uuid(), group_id: currentGroupId, name, organizer_id: currentUser.id, created_at: Date.now() });
  saveDB(db);
}

async function addExpense(payload) {
  const db = getDB();
  db.expenses.push({ id: uuid(), ...payload, created_at: Date.now() });
  saveDB(db);
}

async function loadExpenses() {
  const db = getDB();
  const data = db.expenses.filter(e => e.group_id === currentGroupId).sort((a,b) => b.created_at - a.created_at).slice(0, 30);
  const nameMap = new Map(currentMembers.map((m) => [m.id, m.name]));

  if (data.length === 0) {
    setEmptyState(expensesList, "No expenses in this group yet.");
    return;
  }

  expensesList.innerHTML = data
    .map((expense) => {
      const payer = nameMap.get(expense.paid_by_member_id) || "Unknown";
      return `
      <div class="expense-item">
        <div>
          <p><strong>${expense.name}</strong> <span class="badge">${expense.split_type}</span></p>
          <p class="muted">Paid by ${payer}</p>
        </div>
        <p><strong>${formatCurrency(expense.amount)}</strong></p>
      </div>
    `;
    })
    .join("");
}

function calculateDebtsFromNet(netByMember) {
  const debtors = [], creditors = [];

  netByMember.forEach((value, memberId) => {
    if (value < -0.01) debtors.push({ memberId, amount: Math.abs(value) });
    if (value > 0.01) creditors.push({ memberId, amount: value });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i], creditor = creditors[j];
    const settled = Math.min(debtor.amount, creditor.amount);

    debts.push({ from_member_id: debtor.memberId, to_member_id: creditor.memberId, amount: Number(settled.toFixed(2)) });
    debtor.amount -= settled;
    creditor.amount -= settled;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return debts;
}

async function loadBalances() {
  const db = getDB();
  const expenses = db.expenses.filter(e => e.group_id === currentGroupId);
  const settlements = db.settlements.filter(s => s.group_id === currentGroupId);

  const netByMember = new Map(currentMembers.map((member) => [member.id, 0]));

  expenses.forEach((expense) => {
    const amount = toNumber(expense.amount);
    netByMember.set(expense.paid_by_member_id, (netByMember.get(expense.paid_by_member_id) || 0) + amount);

    const shares = expense.split_data?.shares || [];
    shares.forEach((share) => {
      netByMember.set(share.member_id, (netByMember.get(share.member_id) || 0) - toNumber(share.amount));
    });
  });

  settlements.forEach((settlement) => {
    const amount = toNumber(settlement.amount);
    netByMember.set(settlement.from_member_id, (netByMember.get(settlement.from_member_id) || 0) + amount);
    netByMember.set(settlement.to_member_id, (netByMember.get(settlement.to_member_id) || 0) - amount);
  });

  currentDebts = calculateDebtsFromNet(netByMember);

  if (currentDebts.length === 0) {
    setEmptyState(balancesList, "All settled in this group.");
    return;
  }

  const nameMap = new Map(currentMembers.map((m) => [m.id, m.name]));

  balancesList.innerHTML = currentDebts
    .map((debt, idx) => {
      const fromName = nameMap.get(debt.from_member_id) || "Unknown";
      const toName = nameMap.get(debt.to_member_id) || "Unknown";
      return `
      <div class="balance-item">
        <p>${fromName} owes ${toName} <strong>${formatCurrency(debt.amount)}</strong></p>
        <button class="btn secondary settle-btn" data-idx="${idx}">Settle Up</button>
      </div>
    `;
    })
    .join("");

  document.querySelectorAll(".settle-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const debt = currentDebts[Number(btn.dataset.idx)];
      if (!debt) return;

      try {
        const db = getDB();
        db.settlements.push({
          id: uuid(),
          group_id: currentGroupId,
          from_member_id: debt.from_member_id,
          to_member_id: debt.to_member_id,
          amount: debt.amount,
          organizer_id: currentUser.id,
          created_at: Date.now()
        });
        saveDB(db);

        showToast("Debt settled successfully.");
        await loadBalances();
      } catch (err) {
        showToast(err.message || "Unable to settle this debt right now.");
      }
    });
  });
}

function bindEvents() {
  groupSelect.addEventListener("change", onGroupChange);
  splitTypeSelect.addEventListener("change", renderSplitInputs);

  createGroupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    try {
      const groupName = groupNameInput.value.trim();
      if (!groupName) throw new Error("Group name is required.");
      await createGroup(groupName);
      groupNameInput.value = "";
      showToast("Group created.");
      await loadGroups();
    } catch (err) { showToast(err.message || "Could not create group."); }
  });

  addMemberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser || !currentGroupId) return;
    try {
      const memberName = memberNameInput.value.trim();
      if (!memberName) throw new Error("Member name is required.");
      await addMember(memberName);
      memberNameInput.value = "";
      showToast("Member added.");
      await Promise.all([loadMembers(), loadBalances(), loadExpenses()]);
    } catch (err) { showToast(err.message || "Could not add member."); }
  });

  expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser || !currentGroupId) return;
    try {
      const name = expenseNameInput.value.trim();
      const amount = toNumber(expenseAmountInput.value);
      const paidByMemberId = expensePayer.value;
      const splitType = splitTypeSelect.value;

      if (!name) throw new Error("Expense name is required.");
      if (amount <= 0) throw new Error("Amount > 0.");
      if (!paidByMemberId) throw new Error("Payer is required.");
      if (!currentMembers.length) throw new Error("Add members first.");

      const shares = collectSplitShares(amount, splitType);
      const shareSum = shares.reduce((sum, item) => sum + toNumber(item.amount), 0);
      if (!closeEnough(shareSum, amount, 0.01)) throw new Error("Split values do not add up.");

      await addExpense({
        group_id: currentGroupId,
        organizer_id: currentUser.id,
        name,
        amount,
        paid_by_member_id: paidByMemberId,
        split_type: splitType,
        split_data: { shares }
      });

      expenseNameInput.value = "";
      expenseAmountInput.value = "";
      renderSplitInputs();
      showToast("Expense added.");
      await Promise.all([loadExpenses(), loadBalances()]);
    } catch (err) { showToast(err.message || "Could not add expense."); }
  });

  refreshBalancesBtn.addEventListener("click", async () => {
    if (!currentGroupId) return;
    try {
      await loadBalances();
      showToast("Balances refreshed.");
    } catch (err) { showToast(err.message || "Unable to refresh balances."); }
  });
}

async function initSession() {
  bindEvents();
  const saved = localStorage.getItem("slitzup_session");
  if (saved) {
    currentUser = JSON.parse(saved);
    renderSignedIn(currentUser);
    await loadGroups();
  } else {
    renderSignedOut();
  }
}

initSession().catch((err) => {
  console.error(err);
  showToast("Unable to initialize SlitzUp.");
});
