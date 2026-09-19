// ═══════════════════════════════════════════════════════════════
// ACCOUNTANT PORTAL — Full digital register experience
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = "DarAlWafaaEnhanced";
const SESSION_KEY = 'DarAlWafaaSession';
const SETTINGS_KEY = 'DarAlWafaaSchoolSettings';

// ─── DATA STORE ───
let students = [], accountants = [], classes = [], payments = [], budgets = [], expenses = [];
let academicYears = [], feeCategories = [], feeStructure = [], terms = [];
let schoolSettings = { name: 'Dar Al-Wafaa', logo: '', primaryColor: '#6c3a9d' };

let currentAccountant = null;
let currentTab = "dashboard";
let currentPaySubTab = "payments";
let accPaymentSearch = "", accExpenseSearch = "", accStudentSearch = "";
let accPaymentStatusFilter = "All";
let accStudentClassFilter = "All";
let accFeeStructureSearch = "";

let accRegisterYearFilter = "";
let accRegisterTermFilter = "";
let accRegisterClassFilter = "";
let accRegisterDetailClass = null;

// Charts
let accRevExpChart = null, accPaymentMethodChart = null;
let accRevenueTrendChart = null, accExpenseCategoryChart = null;
let accNetIncomeChart = null, accBudgetChart = null;

const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Telecel Cash', 'AirtelTigo Money', 'Bank Transfer', 'Cheque'];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function getLocalDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(amount) {
    return 'GH₵' + Number(amount || 0).toFixed(2);
}

function escapeHtml(str) {
    if (!str) return '';
    str = String(str);
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m);
}

function generateId(prefix) {
    return prefix + Date.now() + Math.random().toString(36).substr(2, 6);
}

function showToast(msg, isError) {
    const t = document.getElementById('accountantToast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isError ? '#e74c3c' : '#2980b9';
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 4000);
}

// ✅ NEW — Sort classes by level order then numerically (Nursery → KG → Primary → JHS)
function sortClasses(a, b) {
    const levelOrder = {
        'Nursery': 1,
        'Kindergarten': 2,
        'KG': 3,
        'Primary': 4,
        'Junior High School': 5
    };
    const aLevel = levelOrder[a.level] || 99;
    const bLevel = levelOrder[b.level] || 99;
    if (aLevel !== bLevel) return aLevel - bLevel;

    const aNumMatch = (a.name || '').match(/\d+/);
    const bNumMatch = (b.name || '').match(/\d+/);
    const aNum = aNumMatch ? parseInt(aNumMatch[0], 10) : 0;
    const bNum = bNumMatch ? parseInt(bNumMatch[0], 10) : 0;
    if (aNum !== bNum) return aNum - bNum;

    return (a.name || '').localeCompare(b.name || '');
}

// ✅ NEW — Sort a list of class name strings using the level mapping
function sortClassNames(names) {
    const classByName = {};
    classes.forEach(c => { classByName[c.name] = c; });
    return [...names].sort((a, b) => {
        const ca = classByName[a];
        const cb = classByName[b];
        if (ca && cb) return sortClasses(ca, cb);
        return a.localeCompare(b);
    });
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
        const parsed = JSON.parse(raw);
        students = parsed.students || [];
        classes = parsed.classes || [];
        payments = parsed.payments || [];
        budgets = parsed.budgets || [];
        expenses = parsed.expenses || [];
        terms = parsed.terms || [];
        academicYears = parsed.academicYears || [];
        feeCategories = parsed.feeCategories || [];
        feeStructure = parsed.feeStructure || [];

        payments.forEach(p => {
            if (!p.status) p.status = 'Pending';
            if (!p.paymentClass) p.paymentClass = '';
            if (p.yearId === undefined) p.yearId = '';
            if (p.termId === undefined) p.termId = '';
            if (p.feeCategoryId === undefined) p.feeCategoryId = '';
            if (p.reference === undefined) p.reference = '';
        });

        accountants = (parsed.accountants || []).map(a => {
            if (a.canLogin === undefined) a.canLogin = true;
            return a;
        });

        if (!accountants.length) {
            accountants = [{
                id: 'ACC1',
                name: 'Accountant',
                username: 'accountant',
                password: 'account123',
                canLogin: true,
                email: '',
                phone: '',
                dateJoined: ''
            }];
        }

        if (!academicYears.length) {
            academicYears = [
                { id: 'AY1', name: '2024/2025' },
                { id: 'AY2', name: '2025/2026' },
                { id: 'AY3', name: '2026/2027' }
            ];
        }
        if (!feeCategories.length) {
            feeCategories = [
                { id: 'FC1', name: 'School Fees' },
                { id: 'FC2', name: 'Feeding' },
                { id: 'FC3', name: 'Transport' },
                { id: 'FC4', name: 'Books' },
                { id: 'FC5', name: 'Examination' },
                { id: 'FC6', name: 'Uniform' },
                { id: 'FC7', name: 'PTA/Development' },
                { id: 'FC8', name: 'Other' }
            ];
        }

        parsed.accountants = accountants;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return true;
    } catch (e) {
        console.error('Parse error:', e);
        return false;
    }
}

function saveData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let existing = {};
    if (raw) { try { existing = JSON.parse(raw); } catch (e) { existing = {}; } }
    existing.students = students;
    existing.accountants = accountants;
    existing.classes = classes;
    existing.payments = payments;
    existing.budgets = budgets;
    existing.expenses = expenses;
    existing.terms = terms;
    existing.academicYears = academicYears;
    existing.feeCategories = feeCategories;
    existing.feeStructure = feeStructure;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            schoolSettings.name = parsed.name || 'Dar Al-Wafaa';
            schoolSettings.logo = parsed.logo || '';
            schoolSettings.primaryColor = parsed.primaryColor || '#6c3a9d';
        } catch (e) { }
    }
    applySettings();
}

function applySettings() {
    const nameEl = document.getElementById('sidebarSchoolName');
    if (nameEl) nameEl.textContent = schoolSettings.name;
    const logoEl = document.getElementById('sidebarLogo');
    if (logoEl) {
        if (schoolSettings.logo) {
            logoEl.src = schoolSettings.logo;
            logoEl.style.display = 'inline-block';
        } else logoEl.style.display = 'none';
    }
    const titleSpan = document.getElementById('pageTitleSpan');
    if (titleSpan) titleSpan.textContent = schoolSettings.name + ' · Accountant';
    const loginName = document.getElementById('loginSchoolName');
    if (loginName) loginName.textContent = schoolSettings.name;
}

// ═══════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════
function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

function setSession(accountantId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'accountant', accountantId }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function isAccountantLoggedIn() {
    const s = getSession();
    if (!s || s.role !== 'accountant' || !s.accountantId) return false;
    const a = accountants.find(x => x.id === s.accountantId);
    if (!a || a.canLogin === false || !a.username || !a.password) return false;
    currentAccountant = a;
    return true;
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
function showLogin() {
    document.getElementById('accountantLoginOverlay').classList.remove('hidden');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';
}

function hideLogin() {
    document.getElementById('accountantLoginOverlay').classList.add('hidden');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('sidebar').style.display = 'block';
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('accUsernameLogin').value.trim();
    const password = document.getElementById('accPasswordLogin').value.trim();
    const errEl = document.getElementById('accLoginError');

    if (!username || !password) {
        errEl.textContent = 'Please enter both username and password.';
        return;
    }

    const acc = accountants.find(a =>
        a.username && a.username.toLowerCase() === username.toLowerCase() &&
        a.password === password && a.canLogin !== false
    );

    if (!acc) {
        errEl.textContent = '❌ Invalid username or password.';
        return;
    }

    setSession(acc.id);
    currentAccountant = acc;
    errEl.textContent = '';
    hideLogin();
    initUI();
    showToast(`✅ Welcome, ${acc.name}!`);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearSession();
        currentAccountant = null;
        showLogin();
        document.getElementById('accUsernameLogin').value = '';
        document.getElementById('accPasswordLogin').value = '';
        document.getElementById('accLoginError').textContent = '';
        showToast('Logged out successfully.');
    }
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() {
    const s = document.getElementById('sidebar');
    const o = document.getElementById('sidebarOverlay');
    s.classList.toggle('open');
    o.classList.toggle('active');
    document.body.style.overflow = s.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) item.classList.add('active');
        else item.classList.remove('active');
    });

    closeSidebar();

    if (tabId === 'dashboard') renderDashboard();
    else if (tabId === 'payments') {
        populateAccRegisterFilters();
        populateAccArrearsFilters();
        if (currentPaySubTab === 'payments') {
            renderAccPayments();
            renderAccPaymentRegister();
        }
        else if (currentPaySubTab === 'feesetup') renderAccFeeStructure();
        else if (currentPaySubTab === 'arrears') {
            populateAccArrearsFilters();
            renderAccArrearsView();
        }
    }
    else if (tabId === 'students') renderStudents();
    else if (tabId === 'budgets') renderBudgets();
    else if (tabId === 'expenses') renderExpenses();
    else if (tabId === 'reports') renderReports();
    else if (tabId === 'settings') renderProfile();
}

function switchAccPaySubTab(subtabId) {
    currentPaySubTab = subtabId;
    document.querySelectorAll('#tabPayments .sub-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`#tabPayments .sub-tab[data-accsubtab="${subtabId}"]`);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('#tabPayments .subtab-content').forEach(c => c.classList.remove('active-subtab'));
    const content = document.getElementById(`accSubtab${subtabId.charAt(0).toUpperCase() + subtabId.slice(1)}`);
    if (content) content.classList.add('active-subtab');

    if (subtabId === 'payments') {
        populateAccRegisterFilters();
        renderAccPayments();
        renderAccPaymentRegister();
    } else if (subtabId === 'feesetup') {
        renderAccFeeStructure();
    } else if (subtabId === 'arrears') {
        populateAccArrearsFilters();
        renderAccArrearsView();
    }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderDashboard() {
    const a = currentAccountant;
    if (!a) return;

    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dashboardGreeting').textContent = `${greet}, ${a.name}!`;
    document.getElementById('awbAvatar').textContent = (a.name || 'A').charAt(0).toUpperCase();
    document.getElementById('awbName').textContent = a.name;
    document.getElementById('userDisplayName').textContent = a.name;

    const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const pending = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
    const overdue = payments.filter(p => p.status === 'Overdue').reduce((s, p) => s + p.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    document.getElementById('accTotalCollected').textContent = formatMoney(totalCollected);
    document.getElementById('accTotalPending').textContent = formatMoney(pending);
    document.getElementById('accTotalOverdue').textContent = formatMoney(overdue);
    document.getElementById('accTotalExpenses').textContent = formatMoney(totalExpenses);

    const recentPay = document.getElementById('accRecentPayments');
    const recentPays = [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    if (!recentPays.length) {
        recentPay.innerHTML = `
            <div class="acc-empty-state">
                <i class="fas fa-inbox"></i>
                <h4>No payments yet</h4>
                <p>Recorded payments will appear here.</p>
            </div>`;
    } else {
        recentPay.innerHTML = recentPays.map(p => {
            const statusClass = p.status === 'Paid' ? 'paid' : p.status === 'Overdue' ? 'overdue' : 'pending';
            const feeCat = feeCategories.find(c => c.id === p.feeCategoryId);
            const desc = feeCat ? feeCat.name : (p.description || 'Payment');
            return `
                <div class="acc-recent-item acc-recent-payment">
                    <div class="acc-recent-icon">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="acc-recent-body">
                        <div class="acc-recent-top">
                            <div class="acc-recent-name">${escapeHtml(p.studentName)}</div>
                            <div class="acc-recent-amount acc-amount-in">+ ${formatMoney(p.amount)}</div>
                        </div>
                        <div class="acc-recent-bottom">
                            <span class="acc-recent-desc">${escapeHtml(desc)}</span>
                            <span class="acc-recent-date"><i class="far fa-calendar"></i> ${formatDate(p.date)}</span>
                        </div>
                        <span class="acc-recent-tag acc-tag-${statusClass}">${p.status || 'Pending'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    const recentExp = document.getElementById('accRecentExpenses');
    const recentExps = [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    if (!recentExps.length) {
        recentExp.innerHTML = `
            <div class="acc-empty-state">
                <i class="fas fa-inbox"></i>
                <h4>No expenses yet</h4>
                <p>Recorded expenses will appear here.</p>
            </div>`;
    } else {
        recentExp.innerHTML = recentExps.map(e => `
            <div class="acc-recent-item acc-recent-expense">
                <div class="acc-recent-icon">
                    <i class="fas fa-arrow-up"></i>
                </div>
                <div class="acc-recent-body">
                    <div class="acc-recent-top">
                        <div class="acc-recent-name">${escapeHtml(e.category)}</div>
                        <div class="acc-recent-amount acc-amount-out">- ${formatMoney(e.amount)}</div>
                    </div>
                    <div class="acc-recent-bottom">
                        <span class="acc-recent-desc">${escapeHtml(e.description)}${e.studentName ? ' · ' + escapeHtml(e.studentName) : ''}</span>
                        <span class="acc-recent-date"><i class="far fa-calendar"></i> ${formatDate(e.date)}</span>
                    </div>
                    <span class="acc-recent-tag acc-tag-method">${escapeHtml(e.method || 'Cash')}</span>
                </div>
            </div>
        `).join('');
    }

    renderRevExpChart();
    renderPaymentMethodChart();
}

// ═══════════════════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════════════════
function renderRevExpChart() {
    const canvas = document.getElementById('accRevExpChart');
    if (!canvas) return;
    if (accRevExpChart) accRevExpChart.destroy();

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = new Date().getFullYear();

    const revData = months.map((_, i) => payments.filter(p => {
        if (!p.date) return false;
        const d = new Date(p.date);
        return d.getFullYear() === year && d.getMonth() === i;
    }).reduce((s, p) => s + p.amount, 0));

    const expData = months.map((_, i) => expenses.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === i;
    }).reduce((s, e) => s + e.amount, 0));

    const ctx = canvas.getContext('2d');
    accRevExpChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Revenue (GHS)', data: revData, backgroundColor: 'rgba(39,174,96,0.7)', borderColor: '#27ae60', borderWidth: 2 },
                { label: 'Expenses (GHS)', data: expData, backgroundColor: 'rgba(231,76,60,0.7)', borderColor: '#e74c3c', borderWidth: 2 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

function renderPaymentMethodChart() {
    const canvas = document.getElementById('accPaymentMethodChart');
    if (!canvas) return;
    if (accPaymentMethodChart) accPaymentMethodChart.destroy();

    const methods = {};
    PAYMENT_METHODS.forEach(m => { methods[m] = 0; });

    payments.forEach(p => {
        const method = p.method || 'Cash';
        if (methods[method] !== undefined) methods[method] += (p.amount || 0);
        else methods[method] = (methods[method] || 0) + (p.amount || 0);
    });

    const labels = Object.keys(methods).filter(k => methods[k] > 0);
    const data = labels.map(k => methods[k]);
    const palette = ['#f39c12', '#ffcc00', '#e74c3c', '#3498db', '#9b59b6', '#2c3e50', '#1abc9c'];

    if (!labels.length) {
        const ctx = canvas.getContext('2d');
        accPaymentMethodChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Payments'], datasets: [{ data: [1], backgroundColor: ['#ecf0f1'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: true }
        });
        return;
    }

    const ctx = canvas.getContext('2d');
    accPaymentMethodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette.slice(0, labels.length),
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

// ═══════════════════════════════════════════════════════════════
// REGISTER FILTERS
// ═══════════════════════════════════════════════════════════════
function populateAccRegisterFilters() {
    const yearSel = document.getElementById('accRegisterYearFilter');
    if (yearSel) {
        const cur = yearSel.value;
        yearSel.innerHTML = '<option value="">All Years</option>';
        academicYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.id;
            opt.textContent = y.name;
            if (y.id === cur) opt.selected = true;
            yearSel.appendChild(opt);
        });
    }

    const termSel = document.getElementById('accRegisterTermFilter');
    if (termSel) {
        const cur = termSel.value;
        termSel.innerHTML = '<option value="">All Terms</option>';
        terms.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === cur) opt.selected = true;
            termSel.appendChild(opt);
        });
    }

    const classSel = document.getElementById('accRegisterClassFilter');
    if (classSel) {
        const cur = classSel.value;
        classSel.innerHTML = '<option value="">All Classes</option>';
        // ✅ Sort classes by level order
        [...classes].sort(sortClasses).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            if (c.name === cur) opt.selected = true;
            classSel.appendChild(opt);
        });
    }
}

function populateAccArrearsFilters() {
    const yearSel = document.getElementById('accArrearsYearFilter');
    if (yearSel) {
        const cur = yearSel.value;
        yearSel.innerHTML = '<option value="">All Years</option>';
        academicYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.id;
            opt.textContent = y.name;
            if (y.id === cur) opt.selected = true;
            yearSel.appendChild(opt);
        });
    }

    const termSel = document.getElementById('accArrearsTermFilter');
    if (termSel) {
        const cur = termSel.value;
        termSel.innerHTML = '<option value="">All Terms</option>';
        terms.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === cur) opt.selected = true;
            termSel.appendChild(opt);
        });
    }

    const classSel = document.getElementById('accArrearsClassFilter');
    if (classSel) {
        const cur = classSel.value;
        classSel.innerHTML = '<option value="">All Classes</option>';
        // ✅ Sort classes by level order
        [...classes].sort(sortClasses).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            if (c.name === cur) opt.selected = true;
            classSel.appendChild(opt);
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// FEE CALCULATIONS
// ═══════════════════════════════════════════════════════════════
function getStudentFeeDetails(studentId, yearId, termId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return { totalDue: 0, breakdown: [] };

    let filtered = feeStructure.filter(f => {
        const cls = classes.find(c => c.id === f.classId);
        return cls && cls.name === student.class;
    });

    if (yearId) filtered = filtered.filter(f => f.yearId === yearId);
    if (termId) filtered = filtered.filter(f => f.termId === termId);

    const totalDue = filtered.reduce((s, f) => s + (f.amount || 0), 0);

    const breakdown = filtered.map(f => {
        const cat = feeCategories.find(c => c.id === f.categoryId);
        const paid = payments.filter(p =>
            p.studentName === student.name &&
            p.feeCategoryId === f.categoryId &&
            (p.yearId === f.yearId || !p.yearId) &&
            (p.termId === f.termId || !p.termId)
        ).reduce((s, p) => s + (p.amount || 0), 0);

        return {
            categoryId: f.categoryId,
            categoryName: cat ? cat.name : 'Unknown',
            amount: f.amount || 0,
            paid
        };
    });

    return { totalDue, breakdown };
}

function getStudentTotalPaid(studentName, yearId, termId) {
    let filtered = payments.filter(p => p.studentName === studentName);

    if (yearId || termId) {
        filtered = filtered.filter(p => {
            const pYear = p.yearId || '';
            const pTerm = p.termId || '';
            if (!pYear && !pTerm) return true;
            const yearMatch = !yearId || pYear === yearId;
            const termMatch = !termId || pTerm === termId;
            return yearMatch && termMatch;
        });
    }

    return filtered.reduce((s, p) => s + (p.amount || 0), 0);
}

// ═══════════════════════════════════════════════════════════════
// PER-CLASS SUMMARY HELPER
// ═══════════════════════════════════════════════════════════════
function getAccClassRegisterSummary(className, yearId, termId) {
    const classStudents = students.filter(s => s.class === className && s.status === 'Active');

    let totalDue = 0, totalPaid = 0;
    let fullyPaid = 0, partial = 0, unpaid = 0;

    classStudents.forEach(s => {
        const info = getStudentFeeDetails(s.id, yearId, termId);
        const paid = getStudentTotalPaid(s.name, yearId, termId);
        totalDue += (info.totalDue || 0);
        totalPaid += paid;

        if (info.totalDue > 0) {
            if (paid >= info.totalDue) fullyPaid++;
            else if (paid > 0) partial++;
            else unpaid++;
        }
    });

    const outstanding = Math.max(totalDue - totalPaid, 0);
    const pct = totalDue > 0 ? Math.min((totalPaid / totalDue) * 100, 100) : 0;

    return {
        studentCount: classStudents.length,
        totalDue, totalPaid, outstanding,
        fullyPaid, partial, unpaid, pct
    };
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT REGISTER — ROUTER (groups vs detail)
// ═══════════════════════════════════════════════════════════════
function renderAccPaymentRegister() {
    const yearSel = document.getElementById('accRegisterYearFilter');
    const termSel = document.getElementById('accRegisterTermFilter');
    const yearId = yearSel ? yearSel.value : '';
    const termId = termSel ? termSel.value : '';

    accRegisterYearFilter = yearId;
    accRegisterTermFilter = termId;

    if (!accRegisterDetailClass) {
        renderAccRegisterGroups(yearId, termId);
        return;
    }

    renderAccRegisterDetail(yearId, termId);
}

// ═══════════════════════════════════════════════════════════════
// GROUPED VIEW
// ═══════════════════════════════════════════════════════════════
function renderAccRegisterGroups(yearId, termId) {
    const container = document.getElementById('accRegisterGroupsContainer');
    if (!container) return;

    const groupsView = document.getElementById('accRegisterGroupsView');
    const detailView = document.getElementById('accRegisterDetailView');
    if (groupsView) groupsView.style.display = 'block';
    if (detailView) detailView.style.display = 'none';

    const activeStudents = students.filter(s => s.status === 'Active');
    let overallDue = 0, overallPaid = 0, fp = 0, pp = 0, up = 0;

    activeStudents.forEach(s => {
        const info = getStudentFeeDetails(s.id, yearId, termId);
        const paid = getStudentTotalPaid(s.name, yearId, termId);
        overallDue += (info.totalDue || 0);
        overallPaid += paid;
        if (info.totalDue > 0) {
            if (paid >= info.totalDue) fp++;
            else if (paid > 0) pp++;
            else up++;
        }
    });

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('accRegTotalStudents', activeStudents.length);
    setEl('accRegTotalExpected', formatMoney(overallDue));
    setEl('accRegTotalCollected', formatMoney(overallPaid));
    setEl('accRegTotalOutstanding', formatMoney(Math.max(overallDue - overallPaid, 0)));
    setEl('accRegFullyPaid', fp);
    setEl('accRegPartiallyPaid', pp);
    setEl('accRegUnpaid', up);

    const activeClasses = classes.filter(c => c.status === 'Active');

    if (!activeClasses.length) {
        container.innerHTML = `
            <div class="register-groups-empty">
                <i class="fas fa-book-open"></i>
                <h3>No Classes Yet</h3>
                <p>Ask the administrator to add classes first.</p>
            </div>`;
        return;
    }

    const levelOrder = ['Nursery', 'Kindergarten', 'KG', 'Primary', 'Junior High School'];
    const levelIcons = { 'Nursery': '🧸', 'Kindergarten': '🎨', 'KG': '🌈', 'Primary': '📚', 'Junior High School': '🎓' };

    const byLevel = {};
    activeClasses.forEach(c => {
        const lvl = c.level || 'Other';
        if (!byLevel[lvl]) byLevel[lvl] = [];
        byLevel[lvl].push(c);
    });

    const sortedLevels = Object.keys(byLevel).sort((a, b) => {
        const ai = levelOrder.indexOf(a);
        const bi = levelOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    let html = '<div class="register-groups-container">';

    sortedLevels.forEach(level => {
        // ✅ Sort classes by level order (will keep them together anyway since same level)
        const levelClasses = byLevel[level].sort(sortClasses);

        let levelStudents = 0, levelDue = 0, levelPaid = 0;
        levelClasses.forEach(c => {
            const sum = getAccClassRegisterSummary(c.name, yearId, termId);
            levelStudents += sum.studentCount;
            levelDue += sum.totalDue;
            levelPaid += sum.totalPaid;
        });

        html += `
            <div class="register-level-group">
                <div class="register-level-header" onclick="toggleAccRegisterLevelGroup(this)">
                    <div class="register-level-title">
                        <span class="level-icon">${levelIcons[level] || '📂'}</span>
                        ${escapeHtml(level)}
                        <span class="register-level-badge">
                            ${levelClasses.length} class${levelClasses.length > 1 ? 'es' : ''}
                            · ${levelStudents} student${levelStudents !== 1 ? 's' : ''}
                            · ${formatMoney(levelPaid)} / ${formatMoney(levelDue)}
                        </span>
                    </div>
                    <span class="register-level-toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="register-level-body">
                    <div class="register-cards-grid">
                        ${levelClasses.map(c => renderAccRegisterClassCard(c, yearId, termId)).join('')}
                    </div>
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderAccRegisterClassCard(cls, yearId, termId) {
    const sum = getAccClassRegisterSummary(cls.name, yearId, termId);
    const pct = sum.pct;
    const pctColor = pct >= 90 ? '#27ae60' : pct >= 60 ? '#f39c12' : pct > 0 ? '#e67e22' : '#e74c3c';

    const levelClassMap = {
        'Nursery': 'class-level-nursery',
        'Kindergarten': 'class-level-kindergarten',
        'KG': 'class-level-kg',
        'Primary': 'class-level-primary',
        'Junior High School': 'class-level-jhs'
    };
    const levelBadge = levelClassMap[cls.level] || 'class-level-primary';

    const safeName = escapeHtml(cls.name).replace(/'/g, "&#39;");

    return `
        <div class="register-class-card">
            <div class="register-class-card-header">
                <div>
                    <div class="register-class-card-title">
                        <i class="fas fa-users"></i> ${escapeHtml(cls.name)}
                    </div>
                    <div class="register-class-card-student-count">
                        <i class="fas fa-user-graduate"></i>
                        ${sum.studentCount} student${sum.studentCount !== 1 ? 's' : ''}
                    </div>
                </div>
                <span class="class-level-badge ${levelBadge}">${escapeHtml(cls.level || '')}</span>
            </div>

            <div class="register-class-card-stats">
                <div class="register-class-stat-item expected">
                    <span class="stat-label">Expected</span>
                    <span class="stat-value">${formatMoney(sum.totalDue)}</span>
                </div>
                <div class="register-class-stat-item collected">
                    <span class="stat-label">Collected</span>
                    <span class="stat-value">${formatMoney(sum.totalPaid)}</span>
                </div>
                <div class="register-class-stat-item outstanding">
                    <span class="stat-label">Outstanding</span>
                    <span class="stat-value">${formatMoney(sum.outstanding)}</span>
                </div>
                <div class="register-class-stat-item progress">
                    <span class="stat-label">Paid Up</span>
                    <span class="stat-value">${sum.fullyPaid}/${sum.studentCount}</span>
                </div>
            </div>

            <div class="register-class-card-progress">
                <div class="progress-label">
                    <span>Collection Progress</span>
                    <span style="color:${pctColor};">${pct.toFixed(0)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="fill" style="width:${pct}%;background:${pctColor};"></div>
                </div>
            </div>

            <div class="register-class-card-actions">
                <button class="view-register-btn" onclick="openAccClassRegister('${safeName}')">
                    <i class="fas fa-eye"></i> View Payment Register
                </button>
            </div>
        </div>`;
}

function toggleAccRegisterLevelGroup(header) {
    const group = header.closest('.register-level-group');
    if (!group) return;
    const body = group.querySelector('.register-level-body');
    const toggle = group.querySelector('.register-level-toggle');
    if (body) body.classList.toggle('collapsed');
    if (toggle) toggle.classList.toggle('collapsed');
}

// ─── NAVIGATION ───
function openAccClassRegister(className) {
    accRegisterDetailClass = className;
    renderAccPaymentRegister();
}

function backToAccRegisterGroups() {
    accRegisterDetailClass = null;
    renderAccPaymentRegister();
}

// ═══════════════════════════════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
function renderAccRegisterDetail(yearId, termId) {
    const className = accRegisterDetailClass;
    if (!className) return;

    const groupsView = document.getElementById('accRegisterGroupsView');
    const detailView = document.getElementById('accRegisterDetailView');
    if (groupsView) groupsView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    const nameEl = document.getElementById('accRegisterDetailClassName');
    if (nameEl) nameEl.textContent = className;
    const subEl = document.getElementById('accRegisterDetailSubtitle');
    if (subEl) subEl.textContent = `Detailed student payment register for ${className}`;

    const sum = getAccClassRegisterSummary(className, yearId, termId);
    const summaryContainer = document.getElementById('accRegisterDetailSummaryCards');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="rsc"><div class="val">${sum.studentCount}</div><div class="lbl">Total Students</div></div>
            <div class="rsc"><div class="val">${formatMoney(sum.totalDue)}</div><div class="lbl">Total Expected</div></div>
            <div class="rsc"><div class="val" style="color:#27ae60;">${formatMoney(sum.totalPaid)}</div><div class="lbl">Total Collected</div></div>
            <div class="rsc"><div class="val" style="color:#e74c3c;">${formatMoney(sum.outstanding)}</div><div class="lbl">Total Outstanding</div></div>
            <div class="rsc"><div class="val" style="color:#27ae60;">${sum.fullyPaid}</div><div class="lbl">Fully Paid</div></div>
            <div class="rsc"><div class="val" style="color:#f39c12;">${sum.partial}</div><div class="lbl">Partially Paid</div></div>
            <div class="rsc"><div class="val" style="color:#e74c3c;">${sum.unpaid}</div><div class="lbl">Unpaid</div></div>
        `;
    }

    const tbody = document.getElementById('accPaymentRegisterTbody');
    const badge = document.getElementById('accRegisterCountBadge');
    if (!tbody) return;

    const filteredStudents = students
        .filter(s => s.class === className && s.status === 'Active')
        .sort((a, b) => a.name.localeCompare(b.name));

    if (!filteredStudents.length) {
        tbody.innerHTML = `
            <tr><td colspan="9">
                <div class="register-empty">
                    <i class="fas fa-users"></i>
                    <h4>No active students in this class</h4>
                    <p>Add students to this class to see their payment register.</p>
                </div>
            </td></tr>`;
        if (badge) badge.innerText = '0';
        renderAccRegisterFooterSummary([], yearId, termId);
        return;
    }

    const rows = filteredStudents.map(s => {
        const feeInfo = getStudentFeeDetails(s.id, yearId, termId);
        const totalDue = feeInfo.totalDue;
        const totalPaid = getStudentTotalPaid(s.name, yearId, termId);
        const balance = totalDue - totalPaid;

        let status = 'none', statusLabel = 'No Fees';
        if (totalDue > 0) {
            if (totalPaid >= totalDue) { status = 'paid'; statusLabel = 'Fully Paid'; }
            else if (totalPaid > 0) { status = 'partial'; statusLabel = 'Partial'; }
            else { status = 'unpaid'; statusLabel = 'Unpaid'; }
        }
        return { student: s, feeInfo, totalDue, totalPaid, balance, status, statusLabel };
    });

    tbody.innerHTML = rows.map((r, idx) => {
        let feeDetailsHtml = '';
        if (r.feeInfo.breakdown.length) {
            feeDetailsHtml = r.feeInfo.breakdown.map(f => {
                let indicator = '○', indColor = '#e74c3c';
                if (f.paid >= f.amount)      { indicator = '✓'; indColor = '#27ae60'; }
                else if (f.paid > 0)         { indicator = '◐'; indColor = '#f39c12'; }
                return `<div class="fee-line">
                    <span><span style="color:${indColor};font-weight:700;margin-right:4px;">${indicator}</span>${escapeHtml(f.categoryName)}</span>
                    <strong>${formatMoney(f.paid)} / ${formatMoney(f.amount)}</strong>
                </div>`;
            }).join('');
        } else {
            feeDetailsHtml = '<div style="color:#b0a8c0;font-style:italic;">No fee setup</div>';
        }

        let balanceClass = 'balance-green';
        if (r.balance > 0) balanceClass = 'balance-red';
        else if (r.balance < 0) balanceClass = 'balance-orange';

        const statusClass = 'reg-status-' + r.status;

        return `
            <tr>
                <td class="reg-no">${idx + 1}</td>
                <td><div class="reg-student-name">${escapeHtml(r.student.name)}</div></td>
                <td><div class="reg-student-id">${escapeHtml(r.student.id)}</div></td>
                <td><div class="reg-fee-details">${feeDetailsHtml}</div></td>
                <td><span class="reg-amount due">${formatMoney(r.totalDue)}</span></td>
                <td><span class="reg-amount paid">${formatMoney(r.totalPaid)}</span></td>
                <td><span class="reg-amount ${balanceClass}">${formatMoney(r.balance)}</span></td>
                <td><span class="reg-status ${statusClass}">${r.statusLabel}</span></td>
                <td>
                    <button class="reg-view-btn" onclick="openAccStudentStatement('${r.student.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    if (badge) badge.innerText = rows.length;
    renderAccRegisterFooterSummary(rows, yearId, termId);
}

function renderAccRegisterFooterSummary(rows, yearId, termId) {
    const footer = document.getElementById('accRegisterFooterSummary');
    if (!footer) return;

    let totalStudents = rows.length;
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    rows.forEach(r => {
        totalExpected += r.totalDue;
        totalCollected += r.totalPaid;
        totalOutstanding += Math.max(r.balance, 0);
    });

    footer.innerHTML = `
        <div class="rfs-item">
            <div class="val">${totalStudents}</div>
            <div class="lbl">Total Students</div>
        </div>
        <div class="rfs-item">
            <div class="val">${formatMoney(totalExpected)}</div>
            <div class="lbl">Total Expected</div>
        </div>
        <div class="rfs-item">
            <div class="val" style="color:#27ae60;">${formatMoney(totalCollected)}</div>
            <div class="lbl">Total Collected</div>
        </div>
        <div class="rfs-item">
            <div class="val" style="color:#e74c3c;">${formatMoney(totalOutstanding)}</div>
            <div class="lbl">Total Outstanding</div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════
// FEE STRUCTURE (read-only) — Grouped by Level → Class → Year/Term
// ═══════════════════════════════════════════════════════════════
function renderAccFeeStructure() {
    const container = document.getElementById('feeSetupCardsContainer');
    const badge = document.getElementById('accFeeStructureCountBadge');
    if (!container) return;

    const totalValue = feeStructure.reduce((s, f) => s + (f.amount || 0), 0);
    const classesWithFees = new Set(feeStructure.map(f => f.classId)).size;
    const setStat = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setStat('accFeeStatsClassCount', classesWithFees);
    setStat('accFeeStatsEntryCount', feeStructure.length);
    setStat('accFeeStatsTotalValue', formatMoney(totalValue));

    if (badge) badge.innerText = feeStructure.length;

    if (!classes.length) {
        container.innerHTML = `
            <div class="fee-empty-overall">
                <i class="fas fa-book-open"></i>
                <h4>No Classes Available</h4>
                <p>The administrator has not created any classes yet.</p>
            </div>`;
        return;
    }

    const q = (accFeeStructureSearch || '').trim().toLowerCase();

    const visibleClasses = classes.filter(c => {
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if ((c.level || '').toLowerCase().includes(q)) return true;
        return feeStructure.some(f => {
            if (f.classId !== c.id) return false;
            const year = academicYears.find(y => y.id === f.yearId);
            const term = terms.find(t => t.id === f.termId);
            const cat = feeCategories.find(cat => cat.id === f.categoryId);
            return [year?.name, term?.name, cat?.name]
                .filter(Boolean).join(' ').toLowerCase().includes(q);
        });
    });

    if (!visibleClasses.length) {
        container.innerHTML = `
            <div class="fee-empty-overall">
                <i class="fas fa-search"></i>
                <h4>No Matches Found</h4>
                <p>Try adjusting your search term.</p>
            </div>`;
        return;
    }

    const levelOrder = ['Nursery', 'Kindergarten', 'KG', 'Primary', 'Junior High School'];
    const levelIcons = {
        'Nursery': '🧸',
        'Kindergarten': '🎨',
        'KG': '🌈',
        'Primary': '📚',
        'Junior High School': '🎓'
    };

    const byLevel = {};
    visibleClasses.forEach(c => {
        const lvl = c.level || 'Other';
        if (!byLevel[lvl]) byLevel[lvl] = [];
        byLevel[lvl].push(c);
    });

    const sortedLevels = Object.keys(byLevel).sort((a, b) => {
        const ai = levelOrder.indexOf(a);
        const bi = levelOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    let html = '<div class="fee-setup-groups">';

    sortedLevels.forEach(level => {
        // ✅ Sort classes by level order
        const levelClasses = byLevel[level].sort(sortClasses);

        let levelTotal = 0;
        levelClasses.forEach(c => {
            feeStructure.filter(f => f.classId === c.id).forEach(f => {
                levelTotal += (f.amount || 0);
            });
        });

        html += `
            <div class="fee-level-group">
                <div class="fee-level-header" onclick="toggleAccFeeLevelGroup(this)">
                    <div class="fee-level-title">
                        <span class="level-icon">${levelIcons[level] || '📂'}</span>
                        ${escapeHtml(level)}
                        <span class="fee-level-badge">
                            ${levelClasses.length} class${levelClasses.length > 1 ? 'es' : ''} · ${formatMoney(levelTotal)}
                        </span>
                    </div>
                    <span class="fee-level-toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="fee-level-body">
                    ${levelClasses.map(c => renderAccFeeClassCard(c, feeStructure.filter(f => f.classId === c.id))).join('')}
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderAccFeeClassCard(cls, entries) {
    const termMap = {};
    entries.forEach(e => {
        const key = `${e.yearId}|${e.termId}`;
        if (!termMap[key]) termMap[key] = [];
        termMap[key].push(e);
    });

    const sortedKeys = Object.keys(termMap).sort((a, b) => {
        const [aY, aT] = a.split('|');
        const [bY, bT] = b.split('|');
        const aYear = academicYears.find(y => y.id === aY)?.name || '';
        const bYear = academicYears.find(y => y.id === bY)?.name || '';
        if (aYear !== bYear) return bYear.localeCompare(aYear);
        const aTerm = terms.find(t => t.id === aT)?.name || '';
        const bTerm = terms.find(t => t.id === bT)?.name || '';
        return bTerm.localeCompare(aTerm);
    });

    let total = 0;
    entries.forEach(e => { total += (e.amount || 0); });

    const termSections = sortedKeys.map(key => {
        const [yearId, termId] = key.split('|');
        const yearName = academicYears.find(y => y.id === yearId)?.name || '—';
        const termName = terms.find(t => t.id === termId)?.name || '—';
        const list = termMap[key];
        const sum = list.reduce((s, e) => s + (e.amount || 0), 0);

        const sortedList = [...list].sort((a, b) => {
            const aCat = feeCategories.find(c => c.id === a.categoryId)?.name || '';
            const bCat = feeCategories.find(c => c.id === b.categoryId)?.name || '';
            return aCat.localeCompare(bCat);
        });

        const rows = sortedList.map(e => {
            const cat = feeCategories.find(c => c.id === e.categoryId);
            return `
                <div class="fee-entry-row">
                    <div class="fee-entry-left">
                        <span class="fee-entry-cat">${escapeHtml(cat ? cat.name : '—')}</span>
                        <span class="fee-entry-amount">${formatMoney(e.amount || 0)}</span>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="fee-term-group">
                <div class="fee-term-header">
                    <span class="fee-term-label">
                        <i class="fas fa-calendar-alt"></i>
                        ${escapeHtml(yearName)} · ${escapeHtml(termName)}
                    </span>
                    <span class="fee-term-sum">${formatMoney(sum)}</span>
                </div>
                ${rows}
            </div>`;
    }).join('');

    const emptyMsg = !entries.length
        ? `<div class="fee-class-empty">No fee entries set up for this class yet.</div>`
        : '';

    return `
        <div class="fee-class-card">
            <div class="fee-class-header">
                <div class="fee-class-title">
                    <span class="fee-class-name"><i class="fas fa-users"></i> ${escapeHtml(cls.name)}</span>
                    <span class="fee-class-total">Total: <strong>${formatMoney(total)}</strong></span>
                </div>
            </div>
            ${termSections}
            ${emptyMsg}
            <div class="fee-class-footer">
                <span class="fee-class-summary">
                    ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}
                </span>
            </div>
        </div>
    `;
}

function toggleAccFeeLevelGroup(header) {
    const group = header.closest('.fee-level-group');
    if (!group) return;
    const body = group.querySelector('.fee-level-body');
    const toggle = group.querySelector('.fee-level-toggle');
    if (body) body.classList.toggle('collapsed');
    if (toggle) toggle.classList.toggle('collapsed');
}

// ═══════════════════════════════════════════════════════════════
// ARREARS VIEW
// ═══════════════════════════════════════════════════════════════
function renderAccArrearsView() {
    const tbody = document.getElementById('accArrearsTbody');
    const badge = document.getElementById('accArrearsCountBadge');
    if (!tbody) return;

    const yearSel = document.getElementById('accArrearsYearFilter');
    const termSel = document.getElementById('accArrearsTermFilter');
    const classSel = document.getElementById('accArrearsClassFilter');
    const yearId = yearSel ? yearSel.value : '';
    const termId = termSel ? termSel.value : '';
    const className = classSel ? classSel.value : '';

    let filteredStudents = [...students].filter(s => s.status === 'Active');
    if (className) filteredStudents = filteredStudents.filter(s => s.class === className);
    filteredStudents.sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));

    const allRows = filteredStudents.map(s => {
        const feeInfo = getStudentFeeDetails(s.id, yearId, termId);
        const totalDue = feeInfo.totalDue;
        const totalPaid = getStudentTotalPaid(s.name, yearId, termId);
        const balance = totalDue - totalPaid;
        return { student: s, totalDue, totalPaid, balance };
    });

    const arrearsRows = allRows.filter(r => r.totalDue > 0 && r.balance > 0);
    const totalOwed = arrearsRows.reduce((sum, r) => sum + Math.max(r.balance, 0), 0);
    const studentCount = arrearsRows.length;
    const fullyClearedCount = allRows.filter(r => r.totalDue > 0 && r.balance <= 0).length;

    const setEl = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    };
    setEl('accArrearsTotalOwed', formatMoney(totalOwed));
    setEl('accArrearsStudentCount', studentCount);
    setEl('accArrearsFullyCleared', fullyClearedCount);
    if (badge) badge.innerText = arrearsRows.length;

    if (!arrearsRows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="register-empty">
                        <i class="fas fa-check-circle" style="color:#27ae60;"></i>
                        <h4>No Outstanding Balances</h4>
                        <p>All students in the current filter are fully paid up. 🎉</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = arrearsRows.map((r, idx) => {
        const statusLabel = r.totalPaid > 0 ? 'Partial' : 'Unpaid';
        const statusClass = r.totalPaid > 0 ? 'reg-status-partial' : 'reg-status-unpaid';
        return `
            <tr>
                <td class="reg-no">${idx + 1}</td>
                <td>
                    <div class="reg-student-name">${escapeHtml(r.student.name)}</div>
                    <div class="reg-student-id">${escapeHtml(r.student.id)}</div>
                </td>
                <td><span class="class-badge">${escapeHtml(r.student.class)}</span></td>
                <td><span class="reg-amount due">${formatMoney(r.totalDue)}</span></td>
                <td><span class="reg-amount paid">${formatMoney(r.totalPaid)}</span></td>
                <td><span class="reg-amount balance-red">${formatMoney(r.balance)}</span></td>
                <td><span class="reg-status ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button class="reg-view-btn" onclick="openAccStudentStatement('${r.student.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// STUDENT STATEMENT MODAL
// ═══════════════════════════════════════════════════════════════
function openAccStudentStatement(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) { showToast('Student not found.', true); return; }

    const modal = document.getElementById('accStudentDetailsModal');
    const content = document.getElementById('accStudentDetailsContent');
    if (!modal || !content) return;

    const allStudentPayments = payments.filter(p => p.studentName === student.name);
    const totalPaidAllTime = allStudentPayments.reduce((s, p) => s + (p.amount || 0), 0);

    const studentFeeRows = feeStructure.filter(f => {
        const cls = classes.find(c => c.id === f.classId);
        return cls && cls.name === student.class;
    });
    const totalFeesAllTime = studentFeeRows.reduce((s, f) => s + (f.amount || 0), 0);
    const totalOutstandingAllTime = Math.max(totalFeesAllTime - totalPaidAllTime, 0);

    let overallStatusLabel = 'No Fees', overallStatusClass = 'reg-status-none';
    if (totalFeesAllTime > 0) {
        if (totalPaidAllTime >= totalFeesAllTime) { overallStatusLabel = 'Fully Paid'; overallStatusClass = 'reg-status-paid'; }
        else if (totalPaidAllTime > 0) { overallStatusLabel = 'Partially Paid'; overallStatusClass = 'reg-status-partial'; }
        else { overallStatusLabel = 'Unpaid'; overallStatusClass = 'reg-status-unpaid'; }
    }

    const termKeys = {};
    studentFeeRows.forEach(f => {
        const key = `${f.yearId}|${f.termId}`;
        if (!termKeys[key]) {
            termKeys[key] = { yearId: f.yearId, termId: f.termId, categories: [] };
        }
        termKeys[key].categories.push(f);
    });

    const sortedTermKeys = Object.keys(termKeys).sort((a, b) => {
        const [aY, aT] = a.split('|');
        const [bY, bT] = b.split('|');
        const aYearName = academicYears.find(y => y.id === aY)?.name || '';
        const bYearName = academicYears.find(y => y.id === bY)?.name || '';
        if (aYearName !== bYearName) return bYearName.localeCompare(aYearName);
        const aTermName = terms.find(t => t.id === aT)?.name || '';
        const bTermName = terms.find(t => t.id === bT)?.name || '';
        return bTermName.localeCompare(aTermName);
    });

    let termCardsHtml = '';
    if (sortedTermKeys.length) {
        termCardsHtml = sortedTermKeys.map(key => {
            const entry = termKeys[key];
            const yearName = academicYears.find(y => y.id === entry.yearId)?.name || 'Unknown Year';
            const termName = terms.find(t => t.id === entry.termId)?.name || 'Unknown Term';

            let termDue = 0, termPaid = 0;

            const categoryRows = entry.categories.map(f => {
                const cat = feeCategories.find(c => c.id === f.categoryId);
                const paid = allStudentPayments.filter(p =>
                    p.feeCategoryId === f.categoryId &&
                    (p.yearId === f.yearId || !p.yearId) &&
                    (p.termId === f.termId || !p.termId)
                ).reduce((s, p) => s + (p.amount || 0), 0);

                termDue += (f.amount || 0);
                termPaid += paid;

                let indColor = '#e74c3c', indLabel = 'Unpaid';
                if (paid >= f.amount) { indColor = '#27ae60'; indLabel = 'Paid'; }
                else if (paid > 0) { indColor = '#f39c12'; indLabel = 'Partial'; }

                return `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0edf5;">
                        <span style="font-size:0.85rem;">
                            ${escapeHtml(cat ? cat.name : 'Unknown')}
                            <span style="background:${indColor}20;color:${indColor};padding:1px 8px;border-radius:10px;font-size:0.65rem;font-weight:700;margin-left:4px;">${indLabel}</span>
                        </span>
                        <span style="font-size:0.85rem;">
                            <strong>${formatMoney(paid)}</strong>
                            <span style="color:#8c7da1;"> / ${formatMoney(f.amount || 0)}</span>
                        </span>
                    </div>
                `;
            }).join('');

            const termBalance = termDue - termPaid;
            const termPct = termDue > 0 ? Math.min((termPaid / termDue) * 100, 100) : 0;
            const pctColor = termPct >= 100 ? '#27ae60' : termPct > 0 ? '#f39c12' : '#e74c3c';

            let termStatusLabel = 'No Fees', termStatusClass = 'reg-status-none';
            if (termDue > 0) {
                if (termPaid >= termDue) { termStatusLabel = 'Fully Paid'; termStatusClass = 'reg-status-paid'; }
                else if (termPaid > 0) { termStatusLabel = 'Partial'; termStatusClass = 'reg-status-partial'; }
                else { termStatusLabel = 'Unpaid'; termStatusClass = 'reg-status-unpaid'; }
            }

            return `
                <div class="term-statement-card">
                    <div class="term-head">
                        <div>
                            <div class="term-title">${escapeHtml(yearName)}</div>
                            <div style="font-size:0.82rem;color:#8c7da1;font-weight:600;">${escapeHtml(termName)}</div>
                        </div>
                        <span class="reg-status ${termStatusClass}">${termStatusLabel}</span>
                    </div>

                    <div class="term-progress">
                        <div class="progress-bar">
                            <div class="fill" style="width:${termPct}%;background:${pctColor};"></div>
                        </div>
                        <div class="term-progress-lbl">${formatMoney(termPaid)} of ${formatMoney(termDue)} (${termPct.toFixed(0)}%)</div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                        <div style="background:#e8f2fa;padding:8px 10px;border-radius:8px;text-align:center;">
                            <div style="font-size:0.75rem;color:#8c7da1;font-weight:700;">DUE</div>
                            <div style="font-size:1rem;font-weight:800;color:#1e5a99;">${formatMoney(termDue)}</div>
                        </div>
                        <div style="background:${termBalance > 0 ? '#fde8e8' : '#e8f8ed'};padding:8px 10px;border-radius:8px;text-align:center;">
                            <div style="font-size:0.75rem;color:#8c7da1;font-weight:700;">BALANCE</div>
                            <div style="font-size:1rem;font-weight:800;color:${termBalance > 0 ? '#e74c3c' : '#27ae60'};">${formatMoney(termBalance)}</div>
                        </div>
                    </div>

                    <div class="term-fees">
                        ${categoryRows}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        termCardsHtml = `
            <div class="register-empty" style="grid-column:1/-1;padding:32px 20px;">
                <i class="fas fa-layer-group"></i>
                <h4>No Fee Structure Set</h4>
                <p>Ask the Administrator to set up fee entries for this student's class.</p>
            </div>
        `;
    }

    const history = [...allStudentPayments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const historyHtml = history.length
        ? history.map(p => {
            const feeCat = feeCategories.find(c => c.id === p.feeCategoryId);
            return `
                <tr>
                    <td>${p.date || '—'}</td>
                    <td><code style="background:#e8f2fa;padding:2px 8px;border-radius:6px;font-size:0.75rem;color:#1e5a99;">${escapeHtml(p.id)}</code></td>
                    <td>${feeCat ? `<span class="expense-category-badge">${escapeHtml(feeCat.name)}</span>` : '<span style="color:#b0a8c0;">—</span>'}</td>
                    <td><span class="method-badge">${escapeHtml(p.method || '—')}</span></td>
                    <td><strong>GH₵${p.amount.toFixed(2)}</strong></td>
                    <td>${p.reference ? `<code style="background:#e8f2fa;padding:2px 8px;border-radius:6px;font-size:0.72rem;color:#1e5a99;">${escapeHtml(p.reference)}</code>` : '<span style="color:#b0a8c0;">—</span>'}</td>
                    <td>${academicYears.find(y => y.id === p.yearId)?.name || '—'} / ${terms.find(t => t.id === p.termId)?.name || '—'}</td>
                    <td><span class="payment-status-pill ${p.status === 'Paid' ? 'payment-status-paid' : p.status === 'Overdue' ? 'payment-status-overdue' : 'payment-status-pending'}">${p.status || 'Paid'}</span></td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="8" style="text-align:center;padding:20px;color:#b0a8c0;">No payments recorded for this student yet.</td></tr>';

    content.innerHTML = `
        <div class="statement-header">
            <div style="display:flex;align-items:center;gap:16px;">
                <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#1e5a99,#2980b9);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;flex-shrink:0;box-shadow:0 4px 14px rgba(41,128,185,0.25);">
                    ${escapeHtml((student.name || '?').charAt(0).toUpperCase())}
                </div>
                <div>
                    <div style="font-size:1.5rem;font-weight:800;color:#2c3e50;letter-spacing:-0.3px;">${escapeHtml(student.name)}</div>
                    <div style="font-size:0.85rem;color:#8c7da1;margin-top:4px;">
                        <i class="fas fa-id-badge"></i> ${escapeHtml(student.id)} &nbsp;·&nbsp;
                        <i class="fas fa-book-open"></i> ${escapeHtml(student.class)}
                    </div>
                    <div style="font-size:0.82rem;color:#8c7da1;margin-top:2px;">
                        <i class="fas fa-user"></i> ${escapeHtml(student.parentName || '—')} &nbsp;·&nbsp;
                        <i class="fas fa-phone"></i> ${escapeHtml(student.parentContact || '—')}
                    </div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
                <span class="reg-status ${overallStatusClass}" style="font-size:0.8rem;padding:8px 18px;">${overallStatusLabel}</span>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
            <div style="background:linear-gradient(135deg,#e8f2fa,#f4faff);border-radius:14px;padding:16px;text-align:center;border:1px solid #c8dff0;">
                <div style="font-size:1.4rem;font-weight:800;color:#1e5a99;">${formatMoney(totalFeesAllTime)}</div>
                <div style="font-size:0.72rem;color:#8c7da1;margin-top:4px;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Total Fees</div>
            </div>
            <div style="background:linear-gradient(135deg,#e8f8ed,#f4fcf6);border-radius:14px;padding:16px;text-align:center;border:1px solid #d4edda;">
                <div style="font-size:1.4rem;font-weight:800;color:#1e8449;">${formatMoney(totalPaidAllTime)}</div>
                <div style="font-size:0.72rem;color:#8c7da1;margin-top:4px;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Total Paid</div>
            </div>
            <div style="background:${totalOutstandingAllTime > 0 ? 'linear-gradient(135deg,#fde8e8,#fef5f5)' : 'linear-gradient(135deg,#e8f8ed,#f4fcf6)'};border-radius:14px;padding:16px;text-align:center;border:1px solid ${totalOutstandingAllTime > 0 ? '#f5c6cb' : '#d4edda'};">
                <div style="font-size:1.4rem;font-weight:800;color:${totalOutstandingAllTime > 0 ? '#e74c3c' : '#27ae60'};">${formatMoney(totalOutstandingAllTime)}</div>
                <div style="font-size:0.72rem;color:#8c7da1;margin-top:4px;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Outstanding</div>
            </div>
            <div style="background:linear-gradient(135deg,#e8f2fa,#f4faff);border-radius:14px;padding:16px;text-align:center;border:1px solid #c8dff0;">
                <div style="font-size:1.4rem;font-weight:800;color:#1e5a99;">${history.length}</div>
                <div style="font-size:0.72rem;color:#8c7da1;margin-top:4px;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Installments</div>
            </div>
        </div>

        <div class="perf-section-title" style="margin-bottom:14px;">
            <i class="fas fa-calendar-alt" style="color:#2980b9;"></i> Term-by-Term Breakdown
            <span style="font-size:0.72rem;font-weight:400;color:#8c7da1;margin-left:8px;">All Academic Years · All Terms</span>
        </div>

        <div class="term-statement-grid" style="margin-bottom:24px;">
            ${termCardsHtml}
        </div>

        <div class="installment-note" style="background:#e8f2fa;border-left-color:#2980b9;color:#1e5a99;">
            <i class="fas fa-info-circle" style="color:#2980b9;"></i>
            <span>Each payment is stored separately. Installments are preserved — the school's full payment history is never overwritten.</span>
        </div>

        <div class="details-payment-table" style="margin-top:24px;">
            <h3><i class="fas fa-history" style="color:#2980b9;"></i> Complete Payment History <span class="badge">${history.length}</span></h3>
            <div style="overflow-x:auto;margin-top:10px;">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Receipt No.</th>
                            <th>Fee Type</th>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Reference</th>
                            <th>Year / Term</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${historyHtml}</tbody>
                </table>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeAccStudentStatement() {
    document.getElementById('accStudentDetailsModal').classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS LOG
// ═══════════════════════════════════════════════════════════════
function renderAccPayments() {
    const tbody = document.getElementById('accPaymentsTbody');
    if (!tbody) return;

    let filtered = payments.filter(p => {
        const matchSearch = p.studentName.toLowerCase().includes(accPaymentSearch.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(accPaymentSearch.toLowerCase()) ||
            (p.reference || '').toLowerCase().includes(accPaymentSearch.toLowerCase());
        const matchStatus = accPaymentStatusFilter === 'All' || p.status === accPaymentStatusFilter;
        return matchSearch && matchStatus;
    });

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#95a5a6;">No payments found.</td></tr>`;
        document.getElementById('accPaymentCountBadge').textContent = '0';
        return;
    }

    filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    tbody.innerHTML = filtered.map(p => {
        const statusClass = p.status === 'Paid' ? 'payment-status-paid' : p.status === 'Overdue' ? 'payment-status-overdue' : 'payment-status-pending';
        const feeCat = feeCategories.find(c => c.id === p.feeCategoryId);
        const feeLabel = feeCat ? feeCat.name : '—';
        return `<tr>
            <td><strong>${escapeHtml(p.studentName)}</strong></td>
            <td><span class="expense-category-badge">${escapeHtml(feeLabel)}</span></td>
            <td><strong>${formatMoney(p.amount)}</strong></td>
            <td>${p.date}</td>
            <td><span class="method-badge">${escapeHtml(p.method || 'Cash')}</span></td>
            <td>${p.reference ? `<code style="background:#e8f2fa;padding:2px 8px;border-radius:6px;font-size:0.78rem;color:#1e5a99;">${escapeHtml(p.reference)}</code>` : '<span style="color:#b0a8c0;">—</span>'}</td>
            <td>${escapeHtml(p.paymentClass || '—')}</td>
            <td><span class="payment-status-pill ${statusClass}">${p.status || 'Pending'}</span></td>
            <td class="action-icons">
                <i class="fas fa-edit accountant-action-icon" onclick="openEditPayment('${p.id}')" title="Edit"></i>
                <i class="fas fa-trash-alt accountant-action-icon" style="color:#e74c3c;" onclick="deletePayment('${p.id}')" title="Delete"></i>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('accPaymentCountBadge').textContent = filtered.length;
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════
function populateAccPaymentDropdowns(selectedStudent, selectedClass, selectedYear, selectedTerm, selectedFeeType) {
    const studentSel = document.getElementById('accPaymentStudent');
    studentSel.innerHTML = '<option value="">-- Select Student --</option>';
    students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = `${s.name} (${s.class})`;
        if (selectedStudent === s.name) opt.selected = true;
        studentSel.appendChild(opt);
    });

    const classSel = document.getElementById('accPaymentClass');
    classSel.innerHTML = '<option value="">-- Select Class --</option>';
    // ✅ Sort class names by level order
    const uniqueClasses = [...new Set(classes.map(c => c.name))].filter(Boolean);
    const sortedClassNames = sortClassNames(uniqueClasses);
    sortedClassNames.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (selectedClass === c) opt.selected = true;
        classSel.appendChild(opt);
    });

    const yearSel = document.getElementById('accPaymentYear');
    yearSel.innerHTML = '<option value="">-- Year --</option>';
    academicYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.id;
        opt.textContent = y.name;
        if (selectedYear === y.id) opt.selected = true;
        yearSel.appendChild(opt);
    });

    const termSel = document.getElementById('accPaymentTerm');
    termSel.innerHTML = '<option value="">-- Term --</option>';
    terms.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        if (selectedTerm === t.id) opt.selected = true;
        termSel.appendChild(opt);
    });

    const feeTypeSel = document.getElementById('accPaymentFeeType');
    feeTypeSel.innerHTML = '<option value="">-- Select Fee Type --</option>';
    feeCategories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (selectedFeeType === c.id) opt.selected = true;
        feeTypeSel.appendChild(opt);
    });
}

function openAddPayment() {
    if (!students.length) { showToast('Add a student first.', true); return; }
    document.getElementById('accPaymentId').value = '';
    document.getElementById('accPaymentAmount').value = '';
    document.getElementById('accPaymentDate').value = getLocalDateString();
    document.getElementById('accPaymentStatus').value = 'Paid';
    document.getElementById('accPaymentMethod').value = 'Cash';
    document.getElementById('accPaymentReference').value = '';
    document.getElementById('accPaymentDesc').value = '';
    document.getElementById('accPaymentModalTitle').textContent = 'Record Payment';
    populateAccPaymentDropdowns('', '', '', '', '');
    document.getElementById('accPaymentModal').classList.add('active');
}

function openEditPayment(id) {
    const p = payments.find(x => x.id === id);
    if (!p) return;
    document.getElementById('accPaymentId').value = p.id;
    document.getElementById('accPaymentAmount').value = p.amount;
    document.getElementById('accPaymentDate').value = p.date;
    document.getElementById('accPaymentStatus').value = p.status || 'Pending';
    document.getElementById('accPaymentMethod').value = p.method || 'Cash';
    document.getElementById('accPaymentReference').value = p.reference || '';
    document.getElementById('accPaymentDesc').value = p.description || '';
    document.getElementById('accPaymentModalTitle').textContent = 'Edit Payment';
    populateAccPaymentDropdowns(p.studentName, p.paymentClass || '', p.yearId || '', p.termId || '', p.feeCategoryId || '');
    document.getElementById('accPaymentModal').classList.add('active');
}

function savePayment() {
    const id = document.getElementById('accPaymentId').value;
    const studentName = document.getElementById('accPaymentStudent').value;
    const amount = parseFloat(document.getElementById('accPaymentAmount').value);
    const date = document.getElementById('accPaymentDate').value;
    const status = document.getElementById('accPaymentStatus').value;
    const method = document.getElementById('accPaymentMethod').value;
    const reference = document.getElementById('accPaymentReference').value.trim();
    const paymentClass = document.getElementById('accPaymentClass').value;
    const desc = document.getElementById('accPaymentDesc').value.trim();
    const yearId = document.getElementById('accPaymentYear').value;
    const termId = document.getElementById('accPaymentTerm').value;
    const feeCategoryId = document.getElementById('accPaymentFeeType').value;

    if (!studentName) { showToast('Please select a student.', true); return; }
    if (isNaN(amount) || amount <= 0) { showToast('Please enter a valid amount.', true); return; }
    if (!date) { showToast('Please select a date.', true); return; }

    const data = {
        studentName, amount, date, status,
        paymentClass: paymentClass || '',
        method, description: desc || '',
        yearId: yearId || '',
        termId: termId || '',
        feeCategoryId: feeCategoryId || '',
        reference: reference || '',
        id: id || ''
    };

    if (id) {
        const idx = payments.findIndex(p => p.id === id);
        if (idx !== -1) payments[idx] = data;
    } else {
        data.id = generateId('P');
        payments.push(data);
    }

    saveData();
    document.getElementById('accPaymentModal').classList.remove('active');
    showToast(id ? 'Payment updated!' : 'Payment recorded!');

    renderAccPayments();
    renderAccPaymentRegister();
    renderAccArrearsView();
    renderDashboard();
}

function deletePayment(id) {
    if (!confirm('Delete this payment?')) return;
    payments = payments.filter(p => p.id !== id);
    saveData();
    renderAccPayments();
    renderAccPaymentRegister();
    renderAccArrearsView();
    renderDashboard();
    showToast('Payment deleted.');
}

// ═══════════════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════════════
function populateStudentClassFilter() {
    const sel = document.getElementById('accStudentClassFilter');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="All">All Classes</option>';
    // ✅ Sort class names by level order
    const unique = [...new Set(classes.map(c => c.name))].filter(Boolean);
    const sortedClassNames = sortClassNames(unique);
    sortedClassNames.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (c === cur) opt.selected = true;
        sel.appendChild(opt);
    });
}

function renderStudents() {
    populateStudentClassFilter();
    const tbody = document.getElementById('accStudentsTbody');
    if (!tbody) return;

    let filtered = students.filter(s =>
        s.name.toLowerCase().includes(accStudentSearch.toLowerCase()) ||
        (s.parentName || '').toLowerCase().includes(accStudentSearch.toLowerCase())
    );
    if (accStudentClassFilter !== 'All') {
        filtered = filtered.filter(s => s.class === accStudentClassFilter);
    }

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#95a5a6;">No students found.</td></tr>`;
        document.getElementById('accStudentCountBadge').textContent = '0';
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const studentPayments = payments.filter(p => p.studentName === s.name);
        const totalPaid = studentPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
        const totalPending = studentPayments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amount, 0);

        return `<tr>
            <td>
                <div class="student-info-cell">
                    <div class="student-avatar">${escapeHtml((s.name || '?').charAt(0).toUpperCase())}</div>
                    <div>
                        <div class="student-name">${escapeHtml(s.name)}</div>
                        <div class="student-id">ID: ${s.id}</div>
                    </div>
                </div>
            </td>
            <td><span class="class-badge">${escapeHtml(s.class)}</span></td>
            <td><strong>${escapeHtml(s.parentName || '—')}</strong><br><span class="subtext">${escapeHtml(s.parentContact || '')}</span></td>
            <td><strong style="color:#27ae60;">${formatMoney(totalPaid)}</strong></td>
            <td>${totalPending > 0 ? `<strong style="color:#f39c12;">${formatMoney(totalPending)}</strong>` : '—'}</td>
            <td><span class="status-pill ${s.status === 'Active' ? 'status-active' : 'status-inactive'}">${s.status || 'Active'}</span></td>
        </tr>`;
    }).join('');

    document.getElementById('accStudentCountBadge').textContent = filtered.length;
}

// ═══════════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════════
function renderBudgets() {
    const tbody = document.getElementById('accBudgetTbody');
    if (!tbody) return;

    if (!budgets.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#95a5a6;">No budgets yet. Click "Add Budget" to create one.</td></tr>`;
        document.getElementById('accBudgetCountBadge').textContent = '0';
        return;
    }

    tbody.innerHTML = budgets.map(b => {
        const spent = expenses.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
        const rem = b.allocated - spent;
        const pct = b.allocated > 0 ? Math.min((spent / b.allocated) * 100, 100) : 0;
        const status = rem < 0 ? 'over' : rem < b.allocated * 0.1 ? 'at' : 'under';
        const label = rem < 0 ? 'Over Budget' : rem < b.allocated * 0.1 ? 'Near Limit' : 'On Track';

        return `<tr>
            <td><strong>${escapeHtml(b.category)}</strong></td>
            <td>${formatMoney(b.allocated)}</td>
            <td>${formatMoney(spent)}</td>
            <td style="color:${rem < 0 ? '#e74c3c' : rem < b.allocated * 0.1 ? '#f39c12' : '#27ae60'};font-weight:600;">${formatMoney(rem)}</td>
            <td>
                <div class="budget-progress">
                    <div class="budget-progress-fill" style="width:${pct}%;background:${pct > 90 ? '#e74c3c' : pct > 70 ? '#f39c12' : '#27ae60'}"></div>
                </div>
                <small>${pct.toFixed(0)}% used</small>
            </td>
            <td><span class="budget-status ${status}">${label}</span></td>
            <td class="action-icons">
                <i class="fas fa-edit accountant-action-icon" onclick="openEditBudget('${b.id}')" title="Edit"></i>
                <i class="fas fa-trash-alt accountant-action-icon" style="color:#e74c3c;" onclick="deleteBudget('${b.id}')" title="Delete"></i>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('accBudgetCountBadge').textContent = budgets.length;
}

function openAddBudget() {
    document.getElementById('accBudgetId').value = '';
    document.getElementById('accBudgetCategory').value = '';
    document.getElementById('accBudgetAmount').value = '';
    document.getElementById('accBudgetModalTitle').textContent = 'Add Budget';
    document.getElementById('accBudgetModal').classList.add('active');
}

function openEditBudget(id) {
    const b = budgets.find(x => x.id === id);
    if (!b) return;
    document.getElementById('accBudgetId').value = b.id;
    document.getElementById('accBudgetCategory').value = b.category;
    document.getElementById('accBudgetAmount').value = b.allocated;
    document.getElementById('accBudgetModalTitle').textContent = 'Edit Budget';
    document.getElementById('accBudgetModal').classList.add('active');
}

function saveBudget() {
    const id = document.getElementById('accBudgetId').value;
    const category = document.getElementById('accBudgetCategory').value.trim();
    const allocated = parseFloat(document.getElementById('accBudgetAmount').value);

    if (!category || isNaN(allocated) || allocated <= 0) {
        showToast('Please enter a valid category and amount.', true);
        return;
    }

    const data = { category, allocated, id: id || '' };
    if (id) {
        const idx = budgets.findIndex(b => b.id === id);
        if (idx !== -1) budgets[idx] = data;
    } else {
        data.id = generateId('B');
        budgets.push(data);
    }

    saveData();
    renderBudgets();
    document.getElementById('accBudgetModal').classList.remove('active');
    showToast(id ? 'Budget updated!' : 'Budget added!');
}

function deleteBudget(id) {
    if (!confirm('Delete this budget category?')) return;
    budgets = budgets.filter(b => b.id !== id);
    saveData();
    renderBudgets();
    showToast('Budget deleted.');
}

// ═══════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════
function renderExpenses() {
    const tbody = document.getElementById('accExpensesTbody');
    if (!tbody) return;

    let filtered = expenses.filter(e =>
        e.description.toLowerCase().includes(accExpenseSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(accExpenseSearch.toLowerCase()) ||
        (e.studentName || '').toLowerCase().includes(accExpenseSearch.toLowerCase())
    );

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#95a5a6;">No expenses found.</td></tr>`;
        document.getElementById('accExpenseCountBadge').textContent = '0';
        return;
    }

    tbody.innerHTML = filtered.map(e => `
        <tr>
            <td><strong>${escapeHtml(e.studentName || '—')}</strong></td>
            <td><span class="class-badge">${escapeHtml(e.class || '—')}</span></td>
            <td><span class="expense-category-badge">${escapeHtml(e.category)}</span></td>
            <td>${escapeHtml(e.description)}</td>
            <td><strong>${formatMoney(e.amount)}</strong></td>
            <td>${formatDate(e.date)}</td>
            <td><span class="method-badge">${escapeHtml(e.method)}</span></td>
            <td class="action-icons">
                <i class="fas fa-edit accountant-action-icon" onclick="openEditExpense('${e.id}')" title="Edit"></i>
                <i class="fas fa-trash-alt accountant-action-icon" style="color:#e74c3c;" onclick="deleteExpense('${e.id}')" title="Delete"></i>
            </td>
        </tr>
    `).join('');

    document.getElementById('accExpenseCountBadge').textContent = filtered.length;
}

function populateAccExpenseDropdowns(selectedStudent, selectedCategory) {
    const studentSel = document.getElementById('accExpenseStudent');
    studentSel.innerHTML = '<option value="">-- Select Student --</option>';
    students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = `${s.name} (${s.class})`;
        if (selectedStudent === s.name) opt.selected = true;
        studentSel.appendChild(opt);
    });
    studentSel.onchange = function() {
        const student = students.find(s => s.name === this.value);
        document.getElementById('accExpenseClass').value = student ? (student.class || '') : '';
    };

    const catSel = document.getElementById('accExpenseCategory');
    catSel.innerHTML = '<option value="">-- Select Category --</option>';
    budgets.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.category;
        opt.textContent = b.category;
        if (selectedCategory === b.category) opt.selected = true;
        catSel.appendChild(opt);
    });
}

function openAddExpense() {
    if (!students.length) { showToast('Add a student first.', true); return; }
    if (!budgets.length) { showToast('Please create a budget category first.', true); return; }

    document.getElementById('accExpenseId').value = '';
    document.getElementById('accExpenseClass').value = '';
    document.getElementById('accExpenseDescription').value = '';
    document.getElementById('accExpenseAmount').value = '';
    document.getElementById('accExpenseDate').value = getLocalDateString();
    document.getElementById('accExpenseMethod').value = 'Cash';
    document.getElementById('accExpenseModalTitle').textContent = 'Add Expense';
    populateAccExpenseDropdowns('', '');
    document.getElementById('accExpenseModal').classList.add('active');
}

function openEditExpense(id) {
    const e = expenses.find(x => x.id === id);
    if (!e) return;
    document.getElementById('accExpenseId').value = e.id;
    document.getElementById('accExpenseClass').value = e.class || '';
    document.getElementById('accExpenseDescription').value = e.description;
    document.getElementById('accExpenseAmount').value = e.amount;
    document.getElementById('accExpenseDate').value = e.date;
    document.getElementById('accExpenseMethod').value = e.method;
    document.getElementById('accExpenseModalTitle').textContent = 'Edit Expense';
    populateAccExpenseDropdowns(e.studentName || '', e.category);
    document.getElementById('accExpenseModal').classList.add('active');
}

function saveExpense() {
    const id = document.getElementById('accExpenseId').value;
    const studentName = document.getElementById('accExpenseStudent').value;
    const cls = document.getElementById('accExpenseClass').value.trim();
    const category = document.getElementById('accExpenseCategory').value;
    const description = document.getElementById('accExpenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('accExpenseAmount').value);
    const date = document.getElementById('accExpenseDate').value;
    const method = document.getElementById('accExpenseMethod').value;

    if (!studentName || !cls || !category || !description || isNaN(amount) || amount <= 0 || !date) {
        showToast('Please fill all required fields.', true);
        return;
    }

    const data = { studentName, class: cls, category, description, amount, date, method, id: id || '' };
    if (id) {
        const idx = expenses.findIndex(e => e.id === id);
        if (idx !== -1) expenses[idx] = data;
    } else {
        data.id = generateId('E');
        expenses.push(data);
    }

    saveData();
    renderExpenses();
    renderBudgets();
    document.getElementById('accExpenseModal').classList.remove('active');
    showToast(id ? 'Expense updated!' : 'Expense recorded!');
}

function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    expenses = expenses.filter(e => e.id !== id);
    saveData();
    renderExpenses();
    renderBudgets();
    showToast('Expense deleted.');
}

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
function renderReports() {
    const totalRev = payments.reduce((s, p) => s + p.amount, 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const netIncome = totalRev - totalExp;
    const avgPayment = payments.length > 0 ? totalRev / payments.length : 0;

    document.getElementById('reportTotalRev').textContent = formatMoney(totalRev);
    document.getElementById('reportTotalExp').textContent = formatMoney(totalExp);
    document.getElementById('reportNetIncome').textContent = formatMoney(netIncome);
    document.getElementById('reportNetIncome').style.color = netIncome >= 0 ? '#27ae60' : '#e74c3c';
    document.getElementById('reportAvgPayment').textContent = formatMoney(avgPayment);

    renderRevenueTrendChart();
    renderExpenseCategoryChart();
    renderNetIncomeChart();
    renderBudgetChart();
}

function renderRevenueTrendChart() {
    const canvas = document.getElementById('accRevenueTrendChart');
    if (!canvas) return;
    if (accRevenueTrendChart) accRevenueTrendChart.destroy();

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = new Date().getFullYear();
    const data = months.map((_, i) => payments.filter(p => {
        if (!p.date) return false;
        const d = new Date(p.date);
        return d.getFullYear() === year && d.getMonth() === i;
    }).reduce((s, p) => s + p.amount, 0));

    const ctx = canvas.getContext('2d');
    accRevenueTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue (GHS)', data,
                borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.15)',
                tension: 0.3, fill: true, pointRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

function renderExpenseCategoryChart() {
    const canvas = document.getElementById('accExpenseCategoryChart');
    if (!canvas) return;
    if (accExpenseCategoryChart) accExpenseCategoryChart.destroy();

    const cats = {};
    expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });

    const labels = Object.keys(cats);
    const data = Object.values(cats);

    if (!labels.length) {
        const ctx = canvas.getContext('2d');
        accExpenseCategoryChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ data: [0], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    const colors = ['#2980b9','#27ae60','#f39c12','#e74c3c','#9b59b6','#1abc9c','#e67e22','#34495e'];
    const ctx = canvas.getContext('2d');
    accExpenseCategoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Amount (GHS)', data,
                backgroundColor: colors.slice(0, labels.length),
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

function renderNetIncomeChart() {
    const canvas = document.getElementById('accNetIncomeChart');
    if (!canvas) return;
    if (accNetIncomeChart) accNetIncomeChart.destroy();

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = new Date().getFullYear();
    const data = months.map((_, i) => {
        const rev = payments.filter(p => {
            if (!p.date) return false;
            const d = new Date(p.date);
            return d.getFullYear() === year && d.getMonth() === i;
        }).reduce((s, p) => s + p.amount, 0);
        const exp = expenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === i;
        }).reduce((s, e) => s + e.amount, 0);
        return rev - exp;
    });

    const colors = data.map(v => v >= 0 ? '#27ae60' : '#e74c3c');
    const ctx = canvas.getContext('2d');
    accNetIncomeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{ label: 'Net Income (GHS)', data, backgroundColor: colors, borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

function renderBudgetChart() {
    const canvas = document.getElementById('accBudgetChart');
    if (!canvas) return;
    if (accBudgetChart) accBudgetChart.destroy();

    if (!budgets.length) {
        const ctx = canvas.getContext('2d');
        accBudgetChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Budget Data'], datasets: [{ data: [1], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true }
        });
        return;
    }

    const labels = budgets.map(b => b.category);
    const used = budgets.map(b => {
        const spent = expenses.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
        return Math.min((spent / b.allocated) * 100, 100);
    });

    const colors = ['#2980b9','#27ae60','#f39c12','#e74c3c','#9b59b6','#1abc9c','#e67e22','#34495e'];
    const ctx = canvas.getContext('2d');
    accBudgetChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: used, backgroundColor: colors.slice(0, labels.length), borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(1)}% used` } } } }
    });
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS / PROFILE
// ═══════════════════════════════════════════════════════════════
function renderProfile() {
    const a = currentAccountant;
    if (!a) return;
    document.getElementById('accProfileName').textContent = a.name || '—';
    document.getElementById('accProfileUsername').textContent = a.username || '—';
    document.getElementById('accProfileEmail').textContent = a.email || '—';
    document.getElementById('accProfilePhone').textContent = a.phone || '—';
}

function savePassword() {
    const current = document.getElementById('accCurrentPass').value;
    const newPass = document.getElementById('accNewPass').value;
    const confirm = document.getElementById('accConfirmPass').value;
    const errEl = document.getElementById('accPassError');

    if (!current || !newPass || !confirm) {
        errEl.textContent = '❌ All fields are required.'; return;
    }
    if (current !== currentAccountant.password) {
        errEl.textContent = '❌ Current password is incorrect.'; return;
    }
    if (newPass.length < 4) {
        errEl.textContent = '❌ New password must be at least 4 characters.'; return;
    }
    if (newPass !== confirm) {
        errEl.textContent = '❌ New passwords do not match.'; return;
    }

    currentAccountant.password = newPass;
    saveData();
    errEl.style.color = '#27ae60';
    errEl.textContent = '✅ Password changed successfully!';

    document.getElementById('accCurrentPass').value = '';
    document.getElementById('accNewPass').value = '';
    document.getElementById('accConfirmPass').value = '';

    showToast('✅ Password updated!');
    setTimeout(() => { errEl.textContent = ''; errEl.style.color = '#e74c3c'; }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// CSV EXPORTS
// ═══════════════════════════════════════════════════════════════
function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(v => {
        v = String(v == null ? '' : v);
        if (v.includes(',') || v.includes('"') || v.includes('\n')) v = `"${v.replace(/"/g, '""')}"`;
        return v;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length - 1} records.`);
}

function exportAccPaymentsCSV() {
    if (!payments.length) { showToast('No payments to export.', true); return; }
    const headers = ['Student','Fee Type','Amount (GHS)','Date','Method','Reference','Class','Status','Year','Term','Notes'];
    const rows = payments.map(p => [
        p.studentName,
        feeCategories.find(c => c.id === p.feeCategoryId)?.name || '',
        p.amount.toFixed(2),
        p.date,
        p.method || 'Cash',
        p.reference || '',
        p.paymentClass || '',
        p.status || 'Pending',
        academicYears.find(y => y.id === p.yearId)?.name || '',
        terms.find(t => t.id === p.termId)?.name || '',
        p.description || ''
    ]);
    downloadCSV([headers, ...rows], 'payments.csv');
}

function exportAccBudgetsCSV() {
    if (!budgets.length) { showToast('No budgets to export.', true); return; }
    const headers = ['Category', 'Allocated (GHS)', 'Spent (GHS)', 'Remaining (GHS)', 'Status'];
    const rows = budgets.map(b => {
        const spent = expenses.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
        const rem = b.allocated - spent;
        const status = rem < 0 ? 'Over Budget' : rem < b.allocated * 0.1 ? 'Near Limit' : 'On Track';
        return [b.category, b.allocated.toFixed(2), spent.toFixed(2), rem.toFixed(2), status];
    });
    downloadCSV([headers, ...rows], 'budgets.csv');
}

function exportAccExpensesCSV() {
    if (!expenses.length) { showToast('No expenses to export.', true); return; }
    const headers = ['Student', 'Class', 'Category', 'Description', 'Amount (GHS)', 'Date', 'Method'];
    const rows = expenses.map(e => [
        e.studentName || '', e.class || '', e.category, e.description,
        e.amount.toFixed(2), e.date, e.method
    ]);
    downloadCSV([headers, ...rows], 'expenses.csv');
}

function exportAccRegisterCSV() {
    const yearSel = document.getElementById('accRegisterYearFilter');
    const termSel = document.getElementById('accRegisterTermFilter');
    const yearId = yearSel ? yearSel.value : '';
    const termId = termSel ? termSel.value : '';
    const className = accRegisterDetailClass || '';

    let filteredStudents = [...students].filter(s => s.status === 'Active');
    if (className) filteredStudents = filteredStudents.filter(s => s.class === className);
    filteredStudents.sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));

    if (!filteredStudents.length) { showToast('No students to export.', true); return; }

    const headers = ['No.', 'Student Name', 'Student ID', 'Class', 'Fee Details', 'Total Due (GHS)', 'Total Paid (GHS)', 'Balance (GHS)', 'Status'];
    const rows = filteredStudents.map((s, idx) => {
        const feeInfo = getStudentFeeDetails(s.id, yearId, termId);
        const totalPaid = getStudentTotalPaid(s.name, yearId, termId);
        const balance = feeInfo.totalDue - totalPaid;
        let status = 'No Fees';
        if (feeInfo.totalDue > 0) {
            if (totalPaid >= feeInfo.totalDue) status = 'Fully Paid';
            else if (totalPaid > 0) status = 'Partial';
            else status = 'Unpaid';
        }
        const details = feeInfo.breakdown.map(f => `${f.categoryName}: ${f.paid}/${f.amount}`).join('; ');
        return [
            idx + 1, s.name, s.id, s.class, details || '—',
            feeInfo.totalDue.toFixed(2), totalPaid.toFixed(2), balance.toFixed(2), status
        ];
    });

    downloadCSV([headers, ...rows], 'payment_register.csv');
}

function exportAccArrearsCSV() {
    const yearSel = document.getElementById('accArrearsYearFilter');
    const termSel = document.getElementById('accArrearsTermFilter');
    const classSel = document.getElementById('accArrearsClassFilter');
    const yearId = yearSel ? yearSel.value : '';
    const termId = termSel ? termSel.value : '';
    const className = classSel ? classSel.value : '';

    let filteredStudents = [...students].filter(s => s.status === 'Active');
    if (className) filteredStudents = filteredStudents.filter(s => s.class === className);
    filteredStudents.sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));

    const arrearsRows = filteredStudents.map(s => {
        const feeInfo = getStudentFeeDetails(s.id, yearId, termId);
        const totalPaid = getStudentTotalPaid(s.name, yearId, termId);
        const balance = feeInfo.totalDue - totalPaid;
        return { student: s, totalDue: feeInfo.totalDue, totalPaid, balance };
    }).filter(r => r.totalDue > 0 && r.balance > 0);

    if (!arrearsRows.length) { showToast('No arrears to export.', true); return; }

    const headers = ['No.', 'Student Name', 'Student ID', 'Class', 'Total Due (GHS)', 'Total Paid (GHS)', 'Balance (GHS)', 'Status'];
    const rows = arrearsRows.map((r, idx) => [
        idx + 1, r.student.name, r.student.id, r.student.class,
        r.totalDue.toFixed(2), r.totalPaid.toFixed(2), r.balance.toFixed(2),
        r.totalPaid > 0 ? 'Partial' : 'Unpaid'
    ]);

    downloadCSV([headers, ...rows], 'arrears.csv');
}

function exportAccFeeStructureCSV() {
    if (!feeStructure.length) { showToast('No fee entries to export.', true); return; }
    const headers = ['Class', 'Academic Year', 'Term', 'Fee Category', 'Amount (GHS)'];
    const rows = feeStructure.map(f => {
        const cls = classes.find(c => c.id === f.classId);
        const year = academicYears.find(y => y.id === f.yearId);
        const term = terms.find(t => t.id === f.termId);
        const cat = feeCategories.find(c => c.id === f.categoryId);
        return [
            cls ? cls.name : '',
            year ? year.name : '',
            term ? term.name : '',
            cat ? cat.name : '',
            (f.amount || 0).toFixed(2)
        ];
    });
    downloadCSV([headers, ...rows], 'fee_structure.csv');
}

// ═══════════════════════════════════════════════════════════════
// BIND EVENTS
// ═══════════════════════════════════════════════════════════════
function bindEvents() {
    document.getElementById('accountantLoginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    document.getElementById('hamburgerToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-nav .nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
    });

    document.querySelectorAll('#tabPayments .sub-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAccPaySubTab(tab.getAttribute('data-accsubtab')));
    });

    document.getElementById('accAddPaymentBtn').onclick = openAddPayment;
    document.getElementById('accClosePaymentModal').onclick = () => document.getElementById('accPaymentModal').classList.remove('active');
    document.getElementById('accSavePaymentBtn').onclick = savePayment;

    const regYear = document.getElementById('accRegisterYearFilter');
    if (regYear) regYear.addEventListener('change', () => renderAccPaymentRegister());
    const regTerm = document.getElementById('accRegisterTermFilter');
    if (regTerm) regTerm.addEventListener('change', () => renderAccPaymentRegister());

    const arrYear = document.getElementById('accArrearsYearFilter');
    if (arrYear) arrYear.addEventListener('change', () => renderAccArrearsView());
    const arrTerm = document.getElementById('accArrearsTermFilter');
    if (arrTerm) arrTerm.addEventListener('change', () => renderAccArrearsView());
    const arrClass = document.getElementById('accArrearsClassFilter');
    if (arrClass) arrClass.addEventListener('change', () => renderAccArrearsView());

    const searchPay = document.getElementById('accSearchPayments');
    if (searchPay) {
        searchPay.addEventListener('input', e => {
            accPaymentSearch = e.target.value;
            renderAccPayments();
        });
    }
    const statusFilter = document.getElementById('accPaymentStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', e => {
            accPaymentStatusFilter = e.target.value;
            renderAccPayments();
        });
    }

    const searchFee = document.getElementById('accSearchFeeStructure');
    if (searchFee) {
        searchFee.addEventListener('input', e => {
            accFeeStructureSearch = e.target.value;
            renderAccFeeStructure();
        });
    }

    const searchStudents = document.getElementById('accSearchStudents');
    if (searchStudents) {
        searchStudents.addEventListener('input', e => {
            accStudentSearch = e.target.value;
            renderStudents();
        });
    }
    const studentClassFilter = document.getElementById('accStudentClassFilter');
    if (studentClassFilter) {
        studentClassFilter.addEventListener('change', e => {
            accStudentClassFilter = e.target.value;
            renderStudents();
        });
    }

    document.getElementById('accAddBudgetBtn').onclick = openAddBudget;
    document.getElementById('accCloseBudgetModal').onclick = () => document.getElementById('accBudgetModal').classList.remove('active');
    document.getElementById('accSaveBudgetBtn').onclick = saveBudget;

    document.getElementById('accAddExpenseBtn').onclick = openAddExpense;
    document.getElementById('accCloseExpenseModal').onclick = () => document.getElementById('accExpenseModal').classList.remove('active');
    document.getElementById('accSaveExpenseBtn').onclick = saveExpense;
    const searchExp = document.getElementById('accSearchExpenses');
    if (searchExp) {
        searchExp.addEventListener('input', e => {
            accExpenseSearch = e.target.value;
            renderExpenses();
        });
    }

    document.getElementById('accSavePasswordBtn').onclick = savePassword;

    window.addEventListener('click', e => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeSidebar();
    });
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
function initUI() {
    applySettings();
    document.getElementById('userDisplayName').textContent = currentAccountant.name;
    switchTab('dashboard');
    populateAccRegisterFilters();
    populateAccArrearsFilters();
    renderAccPaymentRegister();
    renderAccArrearsView();
    renderAccFeeStructure();
}

function init() {
    const hasData = loadData();
    loadSettings();
    bindEvents();

    if (!hasData) {
        showLogin();
        document.getElementById('accLoginError').textContent = '⚠️ No data found. Ask admin to set up the system first.';
        return;
    }

    const sess = getSession();
    if (sess && sess.role === 'admin') {
        clearSession();
    }

    if (isAccountantLoggedIn()) {
        hideLogin();
        initUI();
        showToast(`✅ Welcome back, ${currentAccountant.name}!`);
    } else {
        showLogin();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ─── EXPOSE GLOBAL ───
window.openEditPayment = openEditPayment;
window.deletePayment = deletePayment;
window.openEditBudget = openEditBudget;
window.deleteBudget = deleteBudget;
window.openEditExpense = openEditExpense;
window.deleteExpense = deleteExpense;
window.exportAccPaymentsCSV = exportAccPaymentsCSV;
window.exportAccBudgetsCSV = exportAccBudgetsCSV;
window.exportAccExpensesCSV = exportAccExpensesCSV;
window.exportAccRegisterCSV = exportAccRegisterCSV;
window.exportAccArrearsCSV = exportAccArrearsCSV;
window.exportAccFeeStructureCSV = exportAccFeeStructureCSV;
window.openAccStudentStatement = openAccStudentStatement;
window.closeAccStudentStatement = closeAccStudentStatement;
window.switchTab = switchTab;
window.toggleAccFeeLevelGroup = toggleAccFeeLevelGroup;

// ✅ Payment Register — grouped view helpers
window.openAccClassRegister = openAccClassRegister;
window.backToAccRegisterGroups = backToAccRegisterGroups;
window.toggleAccRegisterLevelGroup = toggleAccRegisterLevelGroup;