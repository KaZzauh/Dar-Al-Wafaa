// ═══════════════════════════════════════════════════════════════
// ELITE MINDS ACADEMY - SCHOOL MANAGEMENT SYSTEM — script.js
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'DarAlWafaa_v1';
const SETTINGS_KEY = 'DarAlWafaaSettings';
const USERS_KEY = 'DarAlWafaaUsers';
const USERS_SEEDED_KEY = 'DarAlWafaaUsersSeeded';
const AUTH_KEY = 'DarAlWafaaAuth';

// ─── DATA STORE ───
let students = [];
let classes = [];
let subjects = [];
let staff = [];
let attendance = [];
let staffAttendance = [];
let exams = [];
let grades = [];
let payments = [];
let expenses = [];
let users = [];

let settings = {
    name: 'Dar Al-Wafaa Educational Center',
    motto: 'Knowledge · Character · Excellence',
    phone: '+233 24 000 0000',
    email: 'info@daralwafaa.edu',
    address: 'Accra, Ghana',
    currency: 'GHS',
    currencySymbol: '₵',
    academicYear: '2025/2026',
    term: 'First Term',
    receiptFooter: 'Thank you. Fees paid are non-refundable.',
    logo: '',
    color: '#0f766e',
    feeTypes: ['Tuition', 'Feeding', 'Transport', 'Uniform', 'Exam Fee'],
    gradeBoundaries: { A: 90, B: 80, C: 70, D: 60, F: 0 }
};

let currentUser = null;
const charts = {};
let selectedFeeStudentId = null;
let selectedFeeTerm = null;
let pendingResultScores = null;
let activeClassDetailId = null;
let pendingClassGrades = null;
let pendingRestore = null;

// ═══════════════════════════════════════════════════════════════
// COLOUR HELPERS
// ═══════════════════════════════════════════════════════════════
function shadeHex(hex, amt) {
    const h = String(hex || '#0f766e').replace('#', '');
    if (h.length !== 6) return hex || '#0f766e';
    let r = parseInt(h.substr(0, 2), 16);
    let g = parseInt(h.substr(2, 2), 16);
    let b = parseInt(h.substr(4, 2), 16);
    r = Math.max(0, Math.min(255, r + amt));
    g = Math.max(0, Math.min(255, g + amt));
    b = Math.max(0, Math.min(255, b + amt));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ─── HELPERS ───
function uid(prefix) {
    return (prefix || 'ID') + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(str) {
    if (!str) return '—';
    const p = String(str).split('-');
    if (p.length !== 3) return str;
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function money(n) {
    const num = Number(n) || 0;
    return settings.currencySymbol + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function num(n) {
    return (Number(n) || 0).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getInitials(name) {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
}

function toast(msg, type) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

function inRange(dateStr, from, to) {
    if (!dateStr) return false;
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
}

function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function toCSV(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = v => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

function populateDatalist(id, items) {
    const dl = document.getElementById(id);
    if (!dl) return;
    dl.innerHTML = [...new Set(items.filter(Boolean))].map(i => '<option value="' + esc(i) + '">').join('');
}

function clampScore(raw, max) {
    const n = parseFloat(raw);
    if (isNaN(n)) return null;
    if (n < 0 || n > max) return null;
    return n;
}

// ─── GRADE CALCULATION ───
function calcGrade(percent) {
    const b = settings.gradeBoundaries || { A: 90, B: 80, C: 70, D: 60, F: 0 };
    const p = Number(percent);
    
    if (p >= b.A) return { grade: 'A', remark: 'Excellent', range: b.A + '-100%' };
    if (p >= b.B) return { grade: 'B', remark: 'Very Good', range: b.B + '-' + (b.A - 1) + '%' };
    if (p >= b.C) return { grade: 'C', remark: 'Good', range: b.C + '-' + (b.B - 1) + '%' };
    if (p >= b.D) return { grade: 'D', remark: 'Pass', range: b.D + '-' + (b.C - 1) + '%' };
    return { grade: 'F', remark: 'Fail', range: b.F + '-' + (b.D - 1) + '%' };
}

// ═══════════════════════════════════════════════════════════════
// FEE HELPERS
// ═══════════════════════════════════════════════════════════════
function getStudentFeeStructure(student) {
    let base;
    if (Array.isArray(student.feeStructure) && student.feeStructure.length) {
        base = student.feeStructure.map(f => ({
            type: String(f.type || 'Other').trim() || 'Other',
            expected: Number(f.expected) || 0
        }));
    } else {
        base = [{ type: 'Tuition', expected: Number(student.fee) || 0 }];
    }

    const knownTypes = new Set(base.map(f => f.type));
    const orphanTypes = [...new Set(
        payments
            .filter(p => p.studentId === student.id)
            .map(p => String(p.feeType || 'Tuition').trim() || 'Tuition')
    )].filter(t => !knownTypes.has(t));

    orphanTypes.forEach(t => base.push({ type: t, expected: 0 }));

    return base;
}

function studentPaidByType(studentId, feeType) {
    return payments
        .filter(p => p.studentId === studentId && (p.feeType || 'Tuition') === feeType)
        .reduce((a, p) => a + p.amount, 0);
}

function studentTotalExpected(student) {
    return getStudentFeeStructure(student).reduce((a, f) => a + f.expected, 0);
}

function studentPaid(studentId) {
    return payments.filter(p => p.studentId === studentId).reduce((a, p) => a + p.amount, 0);
}

function studentBalance(student) {
    return studentTotalExpected(student) - studentPaid(student.id);
}

function studentTotalFee(student) {
    return studentTotalExpected(student);
}

function feeTypeStatus(studentId, feeType, expected) {
    const paid = studentPaidByType(studentId, feeType);
    if (expected > 0 && paid >= expected) return 'paid';
    if (paid > 0) return 'partial';
    return 'pending';
}

function studentFeeStatus(student) {
    const total = studentTotalExpected(student);
    const paid = studentPaid(student.id);
    if (total <= 0) return 'paid';
    if (paid >= total) return 'paid';
    if (paid > 0) return 'partial';
    return 'pending';
}

// ─── LEVEL ORDERING ───
function levelOrderRank(level) {
    const l = String(level || '').toLowerCase().trim();
    if (l.includes('creche') || l.includes('crèche')) return 1;
    if (l.includes('nursery') || l.includes('pre-nursery') || l.includes('prenursery')) return 2;
    if (l === 'kg' || l.includes('kindergarten') || l.includes('k.g')) return 3;
    if (l.includes('primary')) return 4;
    if (l.includes('jhs') || l.includes('junior') || l.includes('j.s.s') || l.includes('middle')) return 5;
    if (l.includes('shs') || l.includes('senior') || l.includes('s.s.s')) return 6;
    return 99;
}

function naturalCompareClass(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}

// ═══════════════════════════════════════════════════════════════
// EXAM AUTO-STATUS
// ═══════════════════════════════════════════════════════════════
function isExamGradingComplete(exam) {
    const examGrades = grades.filter(g => g.examId === exam.id);
    if (!examGrades.length) return false;

    const classIds = [...new Set(examGrades.map(g => g.classId).filter(Boolean))];
    if (!classIds.length) return false;

    const expectedStudents = students.filter(s =>
        s.status === 'Active' && classIds.includes(s.classId)
    );
    if (!expectedStudents.length) return false;

    const gradedStudentIds = new Set(examGrades.map(g => g.studentId));
    return expectedStudents.every(s => gradedStudentIds.has(s.id));
}

function examDisplayStatus(exam) {
    const t = today();
    if (isExamGradingComplete(exam)) return 'Completed';
    if (exam.start && t < exam.start) return 'Upcoming';
    if (exam.start && t >= exam.start) return 'Ongoing';
    return exam.status || 'Upcoming';
}

// ─── PERSISTENCE ───
function saveAll() {
    const data = { students, classes, subjects, staff, attendance, staffAttendance, exams, grades, payments, expenses };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (e) { console.warn('Save failed', e); }
}

function loadAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { seedData(); return; }
    try {
        const d = JSON.parse(raw);
        students = d.students || [];
        classes = d.classes || [];
        subjects = d.subjects || [];
        staff = d.staff || [];
        attendance = d.attendance || [];
        staffAttendance = d.staffAttendance || [];
        exams = d.exams || [];
        grades = d.grades || [];
        payments = d.payments || [];
        expenses = d.expenses || [];
    } catch (e) { console.error('Load failed', e); seedData(); }
}

function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) { try { Object.assign(settings, JSON.parse(raw)); } catch (e) {} }
    const symbols = {
        USD: '$', GHS: '₵', NGN: '₦', KES: 'KSh', ZAR: 'R',
        EGP: 'E£', AED: 'د.إ', SAR: '﷼', EUR: '€', GBP: '£'
    };
    settings.currencySymbol = symbols[settings.currency] || '$';
    if (!settings.color) settings.color = '#0f766e';
    if (!settings.name) settings.name = 'Dar Al-Wafaa Educational Center';
    if (!settings.academicYear) settings.academicYear = '2025/2026';
    if (!settings.term) settings.term = 'First Term';
    
    if (!settings.gradeBoundaries) {
        settings.gradeBoundaries = { A: 90, B: 80, C: 70, D: 60, F: 0 };
    }

    if (!settings.feeTypes) {
        settings.feeTypes = ['Tuition', 'Feeding', 'Transport', 'Uniform', 'Exam Fee'];
    }
}

// ─── USERS & AUTH ───
const ROLE_LABELS = {
    admin: 'Administrator',
    principal: 'Principal',
    registrar: 'Registrar',
    accountant: 'Accountant',
    teacher: 'Teacher'
};

function loadUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) { try { users = JSON.parse(raw); } catch (e) { users = []; } }
    if (!Array.isArray(users)) users = [];

    const seeded = localStorage.getItem(USERS_SEEDED_KEY);
    if (!seeded) {
        const demoDefaults = [
            { username: 'admin',      name: 'System Administrator', password: 'admin123',      role: 'admin' },
            { username: 'principal',  name: 'Ustadh Ibrahim',       password: 'principal123',  role: 'principal' },
            { username: 'registrar',  name: 'Amina Yusuf',          password: 'registrar123',  role: 'registrar' },
            { username: 'accountant', name: 'Fatima Al-Hassan',     password: 'accountant123', role: 'accountant' },
            { username: 'teacher',    name: 'Ustadh Bilal',         password: 'teacher123',    role: 'teacher' }
        ];
        demoDefaults.forEach(d => {
            const exists = users.some(u => u.username && u.username.toLowerCase() === d.username.toLowerCase());
            if (!exists) users.push({ id: uid('U'), ...d });
        });
        localStorage.setItem(USERS_SEEDED_KEY, '1');
    }

    if (!users.some(u => u.role === 'admin')) {
        users.push({
            id: uid('U'),
            name: 'System Administrator',
            username: 'admin',
            password: 'admin123',
            role: 'admin'
        });
    }

    saveUsers();
}

function saveUsers() { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function roleAllowed(tabId) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const item = document.querySelector('.nav-item[data-tab="' + tabId + '"]');
    if (!item) return false;
    const roles = item.getAttribute('data-roles') || 'all';
    if (roles === 'all') return true;
    return roles.split(',').map(r => r.trim()).includes(currentUser.role);
}

function seedData() {
    students = [];
    classes = [];
    subjects = [];
    staff = [];
    attendance = [];
    staffAttendance = [];
    exams = [];
    grades = [];
    payments = [];
    expenses = [];
    // 🟢 REMOVED saveAll() so it doesn't overwrite the cloud
}

// ═══════════════════════════════════════════════════════════════
// BRANDING
// ═══════════════════════════════════════════════════════════════
function applyBranding() {
    const root = document.documentElement;
    const c = settings.color || '#0f766e';

    root.style.setProperty('--school-primary', c);
    root.style.setProperty('--school-primary-dark', shadeHex(c, -35));
    root.style.setProperty('--school-primary-light', shadeHex(c, 40));
    root.style.setProperty('--school-brown', shadeHex(c, -80));
    root.style.setProperty('--school-dark', shadeHex(c, -110));

    const sb = document.getElementById('sidebar');
    if (sb) sb.style.background = c;

    const login = document.getElementById('loginOverlay');
    if (login) login.style.background = c;

    const nameIds = ['sidebarSchoolName', 'loginSchoolName', 'pageTitleSpan', 'dashboardSchoolName'];
    nameIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = settings.name;
    });

    const loginImg = document.getElementById('loginLogoImg');
    const loginIcon = document.getElementById('loginLogoIcon');
    if (loginImg && loginIcon) {
        if (settings.logo) {
            loginImg.src = settings.logo;
            loginImg.style.display = 'block';
            loginIcon.style.display = 'none';
        } else {
            loginImg.style.display = 'none';
            loginIcon.style.display = 'block';
        }
    }

    const logo = document.getElementById('sidebarLogo');
    const logoIcon = document.getElementById('sidebarLogoIcon');
    
    if (logo && logoIcon) {
        if (settings.logo) {
            logo.src = settings.logo; 
            logo.style.display = 'inline-block'; 
            logoIcon.style.display = 'none';
        } else {
            logo.style.display = 'none';
            logoIcon.style.display = 'block';
        }
    }

    const lp = document.getElementById('logoPreview');
    if (lp) {
        if (settings.logo) { lp.src = settings.logo; lp.style.display = 'block'; }
        else lp.style.display = 'none';
    }

    const cp = document.getElementById('setColor');
    if (cp) cp.value = c;
    const hex = document.getElementById('colorHex');
    if (hex) hex.textContent = c;

    updateFavicon();
    redrawChartsWithNewColour();
}

function redrawChartsWithNewColour() {
    if (!currentUser) return;
    const dash = document.getElementById('tabDashboard');
    if (!dash || !dash.classList.contains('active')) return;
    const safe = fn => { try { fn(); } catch (e) {} };
    safe(renderChartEnrollment);
    safe(renderChartAttendance);
    safe(renderChartFees);
    safe(renderChartMonthlyFees);
    safe(renderChartExpenses);
    safe(renderChartGender);
}

function updateFavicon() {
    const link = document.getElementById('dynamicFavicon');
    if (!link) return;
    if (settings.logo) { link.href = settings.logo; return; }
    const initial = (settings.name || 'D').charAt(0).toUpperCase();
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
        "<rect width='64' height='64' rx='12' fill='" + settings.color + "'/>" +
        "<text x='32' y='44' font-size='34' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'>" + initial + "</text></svg>";
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function livePreviewColour(hex) {
    const root = document.documentElement;
    root.style.setProperty('--school-primary', hex);
    root.style.setProperty('--school-primary-dark', shadeHex(hex, -35));
    root.style.setProperty('--school-primary-light', shadeHex(hex, 40));
    root.style.setProperty('--school-brown', shadeHex(hex, -80));
    root.style.setProperty('--school-dark', shadeHex(hex, -110));

    const sb = document.getElementById('sidebar');
    if (sb) sb.style.background = hex;
    const login = document.getElementById('loginOverlay');
    if (login) login.style.background = hex;

    const hexLabel = document.getElementById('colorHex');
    if (hexLabel) hexLabel.textContent = hex;
    updateFavicon();
}

function saveSettingsFromForm() {
    settings.name = document.getElementById('setName').value.trim() || 'School';
    settings.motto = document.getElementById('setMotto').value.trim();
    settings.phone = document.getElementById('setPhone').value.trim();
    settings.email = document.getElementById('setEmail').value.trim();
    settings.address = document.getElementById('setAddress').value.trim();
    settings.currency = document.getElementById('setCurrency').value;
    const symbols = {
        USD: '$', GHS: '₵', NGN: '₦', KES: 'KSh', ZAR: 'R',
        EGP: 'E£', AED: 'د.إ', SAR: '﷼', EUR: '€', GBP: '£'
    };
    settings.currencySymbol = symbols[settings.currency] || '$';
    settings.academicYear = document.getElementById('setAcademicYear').value.trim();
    settings.term = document.getElementById('setTerm').value;
    settings.receiptFooter = document.getElementById('setReceiptFooter').value.trim();
    settings.color = document.getElementById('setColor').value;
    saveSettings();
    applyBranding();
    refreshDashboard();
    renderSettings();
    toast('Settings saved — entire system theme updated.', 'success');
}

function resetSettings() {
    if (!confirm('Reset settings to defaults?')) return;
    settings = {
        name: 'Dar Al-Wafaa Educational Center', motto: 'Knowledge · Character · Excellence',
        phone: '', email: '', address: '', currency: 'USD', currencySymbol: '$',
        academicYear: '2025/2026', term: 'First Term',
        receiptFooter: 'Thank you. Fees paid are non-refundable.', logo: '', color: '#0f766e',
        gradeBoundaries: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        feeTypes: ['Tuition', 'Feeding', 'Transport', 'Uniform', 'Exam Fee']
    };
    saveSettings();
    applyBranding();
    renderSettings();
    toast('Settings reset.');
}

function handleLogoUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 250;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            settings.logo = canvas.toDataURL('image/png');

            const p = document.getElementById('logoPreview');
            if (p) { p.src = settings.logo; p.style.display = 'block'; }
            toast('Logo loaded. Click Save to apply.', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ═══════════════════════════════════════════════════════════════
function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const u = document.getElementById('loginUsername').value.trim();
        const p = document.getElementById('loginPassword').value.trim();
        const err = document.getElementById('loginError');
        
        // Wait for Supabase bridge to finish loading cloud data
        if (window.SupabaseBridge && !window.__bridgeReady) {
            if (err) err.textContent = '⏳ Connecting to cloud, please wait…';
            window.addEventListener('bridge:ready', () => form.requestSubmit(), { once: true });
            return;
        }

        if (typeof users === 'undefined' || !Array.isArray(users)) {
            if (err) err.textContent = '❌ App not initialized. Please refresh.';
            return;
        }

        const user = users.find(x => x.username && x.username.toLowerCase() === u.toLowerCase() && x.password === p);
        if (!user) { if (err) err.textContent = '❌ Invalid username or password.'; return; }
        
        if (err) err.textContent = '';
        currentUser = user;
        try { localStorage.setItem(AUTH_KEY, JSON.stringify({ id: user.id })); } catch(_) {}
        enterApp();
        toast('Welcome back, ' + user.name + '!', 'success');
    });
}

function enterApp() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('sidebar').style.display = 'block';

    const nameEl = document.getElementById('userDisplayName');
    if (nameEl) nameEl.textContent = currentUser.name;
    const chip = document.getElementById('userRoleChip');
    if (chip) chip.textContent = ROLE_LABELS[currentUser.role] || currentUser.role;

    applyRoleVisibility();
    const first = currentUser.role === 'teacher' ? 'students' :
                  currentUser.role === 'accountant' ? 'fees' : 'dashboard';
    switchTab(first);
    refreshDashboard();
}

function logout() {
    if (!confirm('Log out of the school system?')) return;
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('loginPassword').value = '';
    toast('Logged out.');
}

function applyRoleVisibility() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const tab = item.getAttribute('data-tab');
        const roles = (item.getAttribute('data-roles') || 'all').split(',').map(s => s.trim());
        const visible = currentUser.role === 'admin' || roles.includes('all') || roles.includes(currentUser.role);
        item.style.display = visible ? '' : 'none';
    });
}

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════
function switchTab(id) {
    const target = document.getElementById('tab' + id.charAt(0).toUpperCase() + id.slice(1));
    if (!target) return;
    if (!roleAllowed(id)) { toast('You do not have access to that module.', 'error'); return; }
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.getAttribute('data-tab') === id);
    });
    closeSidebar();

    const span = document.getElementById('pageTitleSpan');
    if (span) span.textContent = '';

    if (id === 'dashboard') refreshDashboard();
    if (id === 'smartAnalytics') renderSmartAnalytics();
    if (id === 'students') renderStudents();
    if (id === 'classes') {
        const lv = document.getElementById('classesLevelsView');
        const dv = document.getElementById('classDetailView');
        if (lv) lv.style.display = 'block';
        if (dv) dv.style.display = 'none';
        activeClassDetailId = null;
        renderClasses();
    }
    if (id === 'subjects') renderSubjects();
    if (id === 'staff') renderStaff();
    if (id === 'attendance') renderAttendance();
    if (id === 'staffAttendance') renderStaffAttendance();
    if (id === 'exams') renderExams();
    if (id === 'results') renderResults();
    if (id === 'fees') renderFees();
    if (id === 'payments') renderPayments();
    if (id === 'outstanding') renderOutstanding();
    if (id === 'expenses') renderExpenses();
    if (id === 'reports') resetReport();
    if (id === 'settings') renderSettings();
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
    const toggle = document.getElementById('hamburgerToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function refreshDashboard() {
    if (!currentUser) return;
    const nameEl = document.getElementById('dashboardSchoolName');
    if (nameEl) nameEl.textContent = settings.name;

    const t = today();
    const month = t.slice(0, 7);

    const activeStudents = students.filter(s => s.status === 'Active');
    const totalCollected = payments.reduce((a, p) => a + p.amount, 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
    const outstanding = activeStudents.reduce((a, s) => a + Math.max(0, studentBalance(s)), 0);
    const owingCount = activeStudents.filter(s => studentBalance(s) > 0).length;

    const todayAtt = attendance.filter(a => a.date === t);
    const presentToday = todayAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const absentToday = todayAtt.filter(a => a.status === 'Absent').length;
    const rate = todayAtt.length ? ((presentToday / todayAtt.length) * 100).toFixed(1) : '0';

    const feesToday = payments.filter(p => p.date === t).reduce((a, p) => a + p.amount, 0);
    const feesTodayCount = payments.filter(p => p.date === t).length;
    const feesMonth = payments.filter(p => (p.date || '').slice(0, 7) === month).reduce((a, p) => a + p.amount, 0);

    setText('kpiStudents', students.length);
    setText('kpiStudentsSub', students.length + ' enrolled');
    setText('kpiActiveStudents', activeStudents.length);
    setText('kpiClasses', classes.filter(c => c.status === 'Active').length);
    setText('kpiStaff', staff.filter(s => s.status === 'Active').length);
    setText('kpiPresentToday', presentToday);
    setText('kpiAbsentToday', absentToday);
    setText('kpiAttendRate', rate + '%');
    setText('kpiFeesToday', money(feesToday));
    setText('kpiFeesTodaySub', feesTodayCount + ' payment' + (feesTodayCount === 1 ? '' : 's'));
    setText('kpiFeesMonth', money(feesMonth));
    setText('kpiOutstanding', money(outstanding));
    setText('kpiOutstandingSub', owingCount + ' student' + (owingCount === 1 ? '' : 's') + ' owing');
    setText('kpiExpenses', money(totalExpenses));
    setText('kpiNet', money(totalCollected - totalExpenses));

    renderRecentPayments();
    renderRecentStudents();
    renderRecentExpenses();
    renderOutstandingAlerts();

    const safe = fn => { try { fn(); } catch (e) { console.warn('Chart failed:', e); } };
    safe(renderChartEnrollment);
    safe(renderChartAttendance);
    safe(renderChartFees);
    safe(renderChartMonthlyFees);
    safe(renderChartExpenses);
    safe(renderChartGender);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderRecentPayments() {
    const el = document.getElementById('recentPaymentsList');
    if (!el) return;
    const recent = [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
    if (!recent.length) { el.innerHTML = '<div class="list-empty">No fee payments yet.</div>'; return; }
    el.innerHTML = recent.map(p =>
        '<div class="list-item">' +
            '<div class="user-avatar-list">' +
                '<div class="avatar-circle">' + getInitials(p.studentName) + '</div>' +
                '<div class="user-details">' +
                    '<div class="li-main">' + esc(p.studentName) + '</div>' +
                    '<div class="li-sub">' + esc(p.receipt) + ' · ' + esc(p.feeType || 'Payment') + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="li-value">' + money(p.amount) + '</div>' +
        '</div>'
    ).join('');
}

function renderRecentStudents() {
    const el = document.getElementById('recentStudentsList');
    if (!el) return;
    const recent = [...students].sort((a, b) => (b.admissionDate || '').localeCompare(a.admissionDate || '')).slice(0, 6);
    if (!recent.length) { el.innerHTML = '<div class="list-empty">No students yet.</div>'; return; }
    el.innerHTML = recent.map(s =>
        '<div class="list-item">' +
            '<div class="user-avatar-list">' +
                '<div class="avatar-circle">' + getInitials(s.name) + '</div>' +
                '<div class="user-details">' +
                    '<div class="li-main">' + esc(s.name) + '</div>' +
                    '<div class="li-sub">' + esc(s.className) + ' · ' + esc(s.code) + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="li-value">' + formatDate(s.admissionDate) + '</div>' +
        '</div>'
    ).join('');
}

function renderRecentExpenses() {
    const el = document.getElementById('recentExpensesList');
    if (!el) return;
    const recent = [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
    if (!recent.length) { el.innerHTML = '<div class="list-empty">No expenses yet.</div>'; return; }
    el.innerHTML = recent.map(e =>
        '<div class="list-item"><div><div class="li-main">' + esc(e.title) + '</div>' +
        '<div class="li-sub">' + esc(e.category) + ' · ' + formatDate(e.date) + '</div></div>' +
        '<div class="li-value" style="color:#e74c3c;">−' + money(e.amount) + '</div></div>'
    ).join('');
}

function renderOutstandingAlerts() {
    const el = document.getElementById('outstandingAlertList');
    if (!el) return;
    const owing = students.filter(s => s.status === 'Active' && studentBalance(s) > 0)
        .sort((a, b) => studentBalance(b) - studentBalance(a));
    if (!owing.length) { el.innerHTML = '<div class="list-empty">All fees are settled ✓</div>'; return; }
    el.innerHTML = owing.slice(0, 8).map(s =>
        '<div class="outstanding-item">' +
            '<div class="user-avatar-list">' +
                '<div class="avatar-circle" style="width:30px;height:30px;font-size:0.9rem;">' + getInitials(s.name) + '</div>' +
                '<span class="oi-name">' + esc(s.name) +
                ' <span style="font-weight:400;color:#7a8a87;font-size:0.75rem;">(' + esc(s.className) + ')</span></span>' +
            '</div>' +
            '<span class="oi-amount">' + money(studentBalance(s)) + '</span>' +
        '</div>'
    ).join('');
}

// ─── CHARTS ───
function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function chartColors() {
    return ['#0f766e', '#27ae60', '#2980b9', '#e74c3c', '#8e44ad', '#f39c12', '#16a085', '#d35400'];
}

function renderChartEnrollment() {
    const canvas = document.getElementById('chartEnrollment');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('enrollment');
    const labels = classes.filter(c => c.status === 'Active').map(c => c.name);
    const data = classes.filter(c => c.status === 'Active').map(c => students.filter(s => s.classId === c.id && s.status === 'Active').length);
    if (!labels.length) { labels.push('No data'); data.push(0); }
    charts.enrollment = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Students', data, backgroundColor: settings.color, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderChartAttendance() {
    const canvas = document.getElementById('chartAttendance');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('attendance');
    const labels = [], data = [];
    for (let i = 13; i >= 0; i--) {
        const d = daysAgo(i);
        labels.push(d.slice(5));
        const dayAtt = attendance.filter(a => a.date === d);
        const present = dayAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
        data.push(dayAtt.length ? +((present / dayAtt.length) * 100).toFixed(1) : 0);
    }
    charts.attendance = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Attendance %', data, borderColor: settings.color, backgroundColor: settings.color + '22', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: settings.color }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

function renderChartFees() {
    const canvas = document.getElementById('chartFees');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('fees');
    const labels = [], data = [];
    for (let i = 13; i >= 0; i--) {
        const d = daysAgo(i);
        labels.push(d.slice(5));
        data.push(payments.filter(p => p.date === d).reduce((a, p) => a + p.amount, 0));
    }
    charts.fees = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Collected', data, borderColor: settings.color, backgroundColor: settings.color + '22', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: settings.color }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderChartMonthlyFees() {
    const canvas = document.getElementById('chartMonthlyFees');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('monthlyFees');
    const year = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((_, i) => {
        const key = year + '-' + String(i + 1).padStart(2, '0');
        return payments.filter(p => (p.date || '').slice(0, 7) === key).reduce((a, p) => a + p.amount, 0);
    });
    charts.monthlyFees = new Chart(canvas, {
        type: 'bar',
        data: { labels: months, datasets: [{ label: 'Collected', data, backgroundColor: settings.color, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderChartExpenses() {
    const canvas = document.getElementById('chartExpenses');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('expenses');

    const map = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    const labels = Object.keys(map);

    if (!labels.length) {
        charts.expenses = new Chart(canvas, {
            type: 'doughnut',
            data: { labels: ['No expenses yet'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'], borderWidth: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [{
                id: 'emptyState',
                afterDraw: (chart) => {
                    const { ctx, chartArea } = chart;
                    const cx = (chartArea.left + chartArea.right) / 2;
                    const cy = (chartArea.top + chartArea.bottom) / 2;
                    ctx.save();
                    ctx.font = '600 13px Inter, sans-serif';
                    ctx.fillStyle = '#94a3b8';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('No expenses recorded yet', cx, cy - 8);
                    ctx.font = '400 11px Inter, sans-serif';
                    ctx.fillText('Add an expense to see the breakdown', cx, cy + 12);
                    ctx.restore();
                }
            }]
        });
        return;
    }

    charts.expenses = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Amount', data: labels.map(l => map[l]), backgroundColor: chartColors(), borderRadius: 6 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderChartGender() {
    const canvas = document.getElementById('chartGender');
    if (!canvas || typeof Chart === 'undefined') return;
    destroyChart('gender');

    const males = students.filter(s => s.gender === 'Male').length;
    const females = students.filter(s => s.gender === 'Female').length;

    if (!males && !females) {
        charts.gender = new Chart(canvas, {
            type: 'doughnut',
            data: { labels: ['No students yet'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'], borderWidth: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [{
                id: 'emptyState',
                afterDraw: (chart) => {
                    const { ctx, chartArea } = chart;
                    const cx = (chartArea.left + chartArea.right) / 2;
                    const cy = (chartArea.top + chartArea.bottom) / 2;
                    ctx.save();
                    ctx.font = '600 13px Inter, sans-serif';
                    ctx.fillStyle = '#94a3b8';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('No students enrolled yet', cx, cy - 8);
                    ctx.font = '400 11px Inter, sans-serif';
                    ctx.fillText('Admit students to see the distribution', cx, cy + 12);
                    ctx.restore();
                }
            }]
        });
        return;
    }

    charts.gender = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{ data: [males, females], backgroundColor: [settings.color, '#2980b9'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// ═══════════════════════════════════════════════════════════════
// SMART ANALYTICS
// ═══════════════════════════════════════════════════════════════
function saPercentChange(curr, prev) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
}

function saMonthKey(offset) {
    const d = new Date();
    d.setMonth(d.getMonth() + (offset || 0));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function saHealthScore() {
    const t = today();
    const month = t.slice(0, 7);
    const activeStudents = students.filter(s => s.status === 'Active');

    const monthAtt = attendance.filter(a => (a.date || '').slice(0, 7) === month);
    const present = monthAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attendanceScore = monthAtt.length ? (present / monthAtt.length) * 100 : 0;

    const totalExpected = activeStudents.reduce((a, s) => a + studentTotalExpected(s), 0);
    const totalCollected = activeStudents.reduce((a, s) => a + studentPaid(s.id), 0);
    const feeScore = totalExpected > 0 ? Math.min(100, (totalCollected / totalExpected) * 100) : 0;

    const monthFees = payments.filter(p => (p.date || '').slice(0, 7) === month).reduce((a, p) => a + p.amount, 0);
    const monthExp = expenses.filter(e => (e.date || '').slice(0, 7) === month).reduce((a, e) => a + e.amount, 0);
    let finScore = 100;
    if (monthExp > 0) finScore = Math.min(100, (monthFees / monthExp) * 100);
    else if (monthFees === 0) finScore = 0;

    const overall = Math.round((attendanceScore * 0.3) + (feeScore * 0.4) + (finScore * 0.3));

    return {
        overall,
        attendance: Math.round(attendanceScore),
        fees: Math.round(feeScore),
        financial: Math.round(finScore)
    };
}

function saScoreColor(s) {
    if (s >= 80) return '#27ae60';
    if (s >= 60) return '#f39c12';
    return '#e74c3c';
}

function renderSmartAnalytics() {
    if (!currentUser) return;
    const container = document.getElementById('smartAnalyticsContent');
    if (!container) return;

    const totalRevenue = payments.reduce((a, p) => a + p.amount, 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    const activeStudents = students.filter(s => s.status === 'Active');
    const expectedFees = activeStudents.reduce((a, s) => a + studentTotalExpected(s), 0);
    const collectedFees = activeStudents.reduce((a, s) => a + studentPaid(s.id), 0);
    const outstanding = expectedFees - collectedFees;
    const collectionRate = expectedFees > 0 ? (collectedFees / expectedFees) * 100 : 0;

    const month = today().slice(0, 7);
    const newStudents = students.filter(s => (s.admissionDate || '').slice(0, 7) === month).length;

    container.innerHTML = `
        <!-- ═══ KPI CARDS ═══ -->
        <div class="sa-kpi-row">
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Total Revenue</div>
                <div class="sa-kpi-value" style="color:#10b981;">${money(totalRevenue)}</div>
                <span class="sa-kpi-pill green">100%</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Total Expenses</div>
                <div class="sa-kpi-value" style="color:#6b7280;">${money(totalExpenses)}</div>
                <span class="sa-kpi-pill grey">0%</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Net Income</div>
                <div class="sa-kpi-value" style="color:#10b981;">${money(netIncome)}</div>
                <span class="sa-kpi-pill green">Net</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Total Outstanding</div>
                <div class="sa-kpi-value" style="color:#ef4444;">${money(outstanding)}</div>
                <span class="sa-kpi-pill red">Owing</span>
            </div>
        </div>

        <div class="sa-kpi-row two">
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Collection Rate</div>
                <div class="sa-kpi-value" style="color:#ef4444;">${collectionRate.toFixed(0)}%</div>
                <span class="sa-kpi-pill amber">Target 80%</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Active Students</div>
                <div class="sa-kpi-value" style="color:#1e40af;">${activeStudents.length}</div>
                <span class="sa-kpi-pill green">+${newStudents} new</span>
            </div>
        </div>

        <!-- ═══ FINANCIAL CHARTS ═══ -->
        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-column"></i> Revenue vs Expenses (Last 12 Months)</div>
                <div class="sa-chart-wrapper"><canvas id="saChartRevExp"></canvas></div>
            </div>
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-bar"></i> Subject Performance</div>
                <div class="sa-chart-wrapper"><canvas id="saChartSubjectPerf"></canvas></div>
            </div>
        </div>

        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-pie"></i> Revenue by Fee Category</div>
                <div class="sa-chart-wrapper"><canvas id="saChartFeeCategory"></canvas></div>
            </div>
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-bar"></i> Term-by-Term Revenue</div>
                <div class="sa-chart-wrapper"><canvas id="saChartTermRevenue"></canvas></div>
            </div>
        </div>

        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-triangle-exclamation"></i> Outstanding by Class (Arrears)</div>
                <div class="sa-chart-wrapper"><canvas id="saChartOutstandingClass"></canvas></div>
            </div>
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-list-check"></i> Fee Collection Progress</div>
                <div class="sa-chart-wrapper"><canvas id="saChartFeeProgress"></canvas></div>
            </div>
        </div>

        <div class="sa-grid">
            <div class="sa-list-card">
                <div class="sa-card-title"><i class="fas fa-graduation-cap"></i> Academic Insights</div>
                <div id="saAcademicInsights"></div>
            </div>
            <div class="sa-list-card">
                <div class="sa-card-title"><i class="fas fa-circle-info"></i> Data-Driven Decisions</div>
                <div id="saDataDecisions"></div>
            </div>
        </div>

        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-bar"></i> Subject Performance (Detailed)</div>
                <div class="sa-chart-wrapper"><canvas id="saChartSubjectDetail"></canvas></div>
            </div>
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-wallet"></i> Budget Utilization</div>
                <div class="sa-chart-wrapper"><canvas id="saChartBudget"></canvas></div>
            </div>
        </div>

        <!-- ═══ EXAM PERFORMANCE SECTION ═══ -->
        <div class="sa-section-title">
            <i class="fas fa-graduation-cap"></i> Exam Performance Analytics
            <span class="sa-section-sub">${exams.length} exams analyzed</span>
        </div>
        <div id="saExamKPIs"></div>

        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-line"></i> Performance Trend (by Exam Date)</div>
                <div class="sa-chart-wrapper"><canvas id="saChartPerfTrend"></canvas></div>
            </div>
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-bar"></i> Subject-Wise Performance</div>
                <div class="sa-chart-wrapper"><canvas id="saChartSubjectWise"></canvas></div>
            </div>
        </div>

        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-bar"></i> Class-Wise Performance</div>
                <div class="sa-chart-wrapper"><canvas id="saChartClassPerf"></canvas></div>
            </div>
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-pie"></i> Pass / Fail Distribution</div>
                <div class="sa-chart-wrapper"><canvas id="saChartPassFail"></canvas></div>
            </div>
        </div>

        <div class="sa-grid">
            <div class="sa-list-card">
                <div class="sa-card-title"><i class="fas fa-trophy"></i> Top Performing Students</div>
                <div id="saTopStudents"></div>
            </div>
            <div class="sa-list-card">
                <div class="sa-card-title"><i class="fas fa-ranking-star"></i> Class Rankings (Average Score)</div>
                <div id="saClassRankings"></div>
            </div>
        </div>

        <!-- ═══ ATTENDANCE SECTION ═══ -->
        <div class="sa-section-title">
            <i class="fas fa-clipboard-check"></i> Attendance Analytics
            <span class="sa-section-sub">${attendance.length} records analyzed</span>
        </div>
        <div id="saAttendanceKPIs"></div>

        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-bar"></i> Attendance Rate by Class</div>
                <div class="sa-chart-wrapper"><canvas id="saChartAttByClass"></canvas></div>
            </div>
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-pie"></i> Present / Late / Absent Distribution</div>
                <div class="sa-chart-wrapper"><canvas id="saChartAttDist"></canvas></div>
            </div>
        </div>

        <div class="sa-grid">
            <div class="sa-card">
                <div class="sa-card-title"><i class="fas fa-chart-line"></i> Daily Attendance Trend (Last 14 Days)</div>
                <div class="sa-chart-wrapper"><canvas id="saChartAttTrend"></canvas></div>
            </div>
            <div class="sa-list-card">
                <div class="sa-card-title"><i class="fas fa-triangle-exclamation"></i> Students Needing Attention</div>
                <div id="saAttRisk"></div>
            </div>
        </div>
    `;

    renderSA_ExamKPIs();
    renderSA_AttendanceKPIs();
    renderSA_AcademicInsights();
    renderSA_DataDecisions();
    renderSA_TopStudents();
    renderSA_ClassRankings();
    renderSA_AttRisk();

    const chartColorsSA = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6'];

    function mkChart(id, config) {
        const canvas = document.getElementById(id);
        if (!canvas || typeof Chart === 'undefined') return;
        if (charts[id]) { charts[id].destroy(); }
        charts[id] = new Chart(canvas, config);
    }

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const yr = new Date().getFullYear();
    const revData = months.map((_, i) => {
        const k = yr + '-' + String(i + 1).padStart(2, '0');
        return payments.filter(p => (p.date || '').slice(0, 7) === k).reduce((a, p) => a + p.amount, 0);
    });
    const expData = months.map((_, i) => {
        const k = yr + '-' + String(i + 1).padStart(2, '0');
        return expenses.filter(e => (e.date || '').slice(0, 7) === k).reduce((a, e) => a + e.amount, 0);
    });
    mkChart('saChartRevExp', {
        type: 'bar',
        data: { labels: months, datasets: [
            { label: 'Revenue', data: revData, backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Expenses', data: expData, backgroundColor: '#ef4444', borderRadius: 4 }
        ]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const subjectScores = {};
    grades.forEach(g => {
        if (!subjectScores[g.subjectName]) subjectScores[g.subjectName] = [];
        subjectScores[g.subjectName].push(Number(g.percent));
    });
    const subLabels = Object.keys(subjectScores);
    const subAvgs = subLabels.map(s => subjectScores[s].reduce((a, x) => a + x, 0) / subjectScores[s].length);
    mkChart('saChartSubjectPerf', {
        type: 'bar',
        data: { labels: subLabels.length ? subLabels : ['No data'], datasets: [{
            label: 'Avg %', data: subAvgs.length ? subAvgs : [0], backgroundColor: '#10b981', borderRadius: 4
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const feeCats = {};
    payments.forEach(p => {
        const t = p.feeType || 'Other';
        feeCats[t] = (feeCats[t] || 0) + p.amount;
    });
    const fcLabels = Object.keys(feeCats);
    mkChart('saChartFeeCategory', {
        type: 'doughnut',
        data: { labels: fcLabels.length ? fcLabels : ['No data'], datasets: [{
            data: fcLabels.length ? fcLabels.map(l => feeCats[l]) : [1],
            backgroundColor: chartColorsSA, borderWidth: 2, borderColor: '#fff'
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });

    const terms_ = ['First Term', 'Second Term', 'Third Term'];
    const termData = terms_.map(t => payments.filter(p => p.term === t).reduce((a, p) => a + p.amount, 0));
    mkChart('saChartTermRevenue', {
        type: 'bar',
        data: { labels: terms_, datasets: [{
            label: 'Revenue', data: termData, backgroundColor: '#8b5cf6', borderRadius: 4
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const outstandingByClass = classes.map(c => {
        const list = students.filter(s => s.classId === c.id && s.status === 'Active');
        return {
            name: c.name,
            amount: list.reduce((a, s) => a + Math.max(0, studentBalance(s)), 0)
        };
    }).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 10);

    mkChart('saChartOutstandingClass', {
        type: 'bar',
        data: {
            labels: outstandingByClass.length ? outstandingByClass.map(x => x.name) : ['No data'],
            datasets: [{ label: 'Outstanding', data: outstandingByClass.length ? outstandingByClass.map(x => x.amount) : [0], backgroundColor: '#ef4444', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const classCollect = classes.slice(0, 6).map(c => {
        const list = students.filter(s => s.classId === c.id && s.status === 'Active');
        const collected = list.reduce((a, s) => a + studentPaid(s.id), 0);
        const owed = list.reduce((a, s) => a + Math.max(0, studentBalance(s)), 0);
        return { name: c.name, collected, owed };
    });
    mkChart('saChartFeeProgress', {
        type: 'bar',
        data: {
            labels: classCollect.map(c => c.name),
            datasets: [
                { label: 'Collected', data: classCollect.map(c => c.collected), backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Outstanding', data: classCollect.map(c => c.owed), backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
            scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const subDetail = subLabels.map(s => {
        const arr = subjectScores[s];
        const avg = arr.reduce((a, x) => a + x, 0) / arr.length;
        const passRate = (arr.filter(x => x >= 50).length / arr.length) * 100;
        return { name: s, avg, passRate };
    }).slice(0, 6);

    mkChart('saChartSubjectDetail', {
        type: 'bar',
        data: {
            labels: subDetail.map(x => x.name),
            datasets: [
                { label: 'Average Score', data: subDetail.map(x => x.avg), backgroundColor: '#3b82f6', borderRadius: 4 },
                { label: 'Pass Rate', data: subDetail.map(x => x.passRate), backgroundColor: '#10b981', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const totalBudget = expectedFees || 1;
    const budgetUsed = Math.min(totalExpenses, totalBudget);
    mkChart('saChartBudget', {
        type: 'doughnut',
        data: { labels: ['Used', 'Remaining'], datasets: [{
            data: [budgetUsed, Math.max(0, totalBudget - budgetUsed)],
            backgroundColor: ['#6366f1', '#e5e7eb'], borderWidth: 2, borderColor: '#fff'
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });

    const examsByDate = exams.slice().sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const trendLabels = examsByDate.map(e => (e.start || '').slice(5));
    const trendData = examsByDate.map(e => {
        const eg = grades.filter(g => g.examId === e.id);
        return eg.length ? eg.reduce((a, g) => a + Number(g.percent), 0) / eg.length : 0;
    });
    mkChart('saChartPerfTrend', {
        type: 'line',
        data: { labels: trendLabels.length ? trendLabels : ['—'], datasets: [{
            label: 'Average %', data: trendData.length ? trendData : [0],
            borderColor: '#8b5cf6', backgroundColor: '#8b5cf622',
            tension: 0.3, pointRadius: 4, pointBackgroundColor: '#8b5cf6', fill: true
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    mkChart('saChartSubjectWise', {
        type: 'bar',
        data: { labels: subLabels.length ? subLabels : ['No data'], datasets: [{
            label: 'Avg %', data: subAvgs.length ? subAvgs : [0], backgroundColor: '#3b82f6', borderRadius: 4
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const classPerf = classes.map(c => {
        const list = students.filter(s => s.classId === c.id && s.status === 'Active').map(s => s.id);
        const gs = grades.filter(g => list.includes(g.studentId));
        return { name: c.name, avg: gs.length ? gs.reduce((a, g) => a + Number(g.percent), 0) / gs.length : 0 };
    }).filter(x => x.avg > 0);
    mkChart('saChartClassPerf', {
        type: 'bar',
        data: { labels: classPerf.length ? classPerf.map(x => x.name) : ['No data'], datasets: [{
            label: 'Avg %', data: classPerf.length ? classPerf.map(x => x.avg) : [0],
            backgroundColor: '#8b5cf6', borderRadius: 4
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const totalGrades = grades.length;
    const passCount = grades.filter(g => Number(g.percent) >= 50).length;
    const failCount = totalGrades - passCount;
    mkChart('saChartPassFail', {
        type: 'doughnut',
        data: { labels: ['Pass', 'Fail'], datasets: [{
            data: totalGrades ? [passCount, failCount] : [1, 0],
            backgroundColor: ['#10b981', '#ef4444'], borderWidth: 2, borderColor: '#fff'
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });

    const attByClass = classes.map(c => {
        const list = students.filter(s => s.classId === c.id && s.status === 'Active').map(s => s.id);
        const recs = attendance.filter(a => list.includes(a.studentId));
        const present = recs.filter(a => a.status === 'Present' || a.status === 'Late').length;
        return { name: c.name, rate: recs.length ? (present / recs.length) * 100 : 0 };
    }).filter(x => x.rate > 0);
    mkChart('saChartAttByClass', {
        type: 'bar',
        data: { labels: attByClass.length ? attByClass.map(x => x.name) : ['No data'], datasets: [{
            label: 'Attendance %', data: attByClass.length ? attByClass.map(x => x.rate) : [0],
            backgroundColor: '#10b981', borderRadius: 4
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });

    const attPresent = attendance.filter(a => a.status === 'Present').length;
    const attLate = attendance.filter(a => a.status === 'Late').length;
    const attAbsent = attendance.filter(a => a.status === 'Absent').length;
    mkChart('saChartAttDist', {
        type: 'doughnut',
        data: { labels: ['Present', 'Late', 'Absent'], datasets: [{
            data: attendance.length ? [attPresent, attLate, attAbsent] : [1, 0, 0],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 2, borderColor: '#fff'
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });

    const trendLbls = [], trendVals = [];
    for (let i = 13; i >= 0; i--) {
        const d = daysAgo(i);
        trendLbls.push(d.slice(5));
        const recs = attendance.filter(a => a.date === d);
        const p = recs.filter(a => a.status === 'Present' || a.status === 'Late').length;
        trendVals.push(recs.length ? (p / recs.length) * 100 : 0);
    }
    mkChart('saChartAttTrend', {
        type: 'line',
        data: { labels: trendLbls, datasets: [{
            label: 'Attendance %', data: trendVals,
            borderColor: '#6366f1', backgroundColor: '#6366f122',
            tension: 0.3, pointRadius: 3, fill: true
        }]},
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
    });
}

function renderSA_ExamKPIs() {
    const el = document.getElementById('saExamKPIs');
    if (!el) return;
    const allPercents = grades.map(g => Number(g.percent)).filter(n => !isNaN(n));
    const avg = allPercents.length ? allPercents.reduce((a, x) => a + x, 0) / allPercents.length : 0;
    const passCount = allPercents.filter(x => x >= 50).length;
    const passRate = allPercents.length ? (passCount / allPercents.length) * 100 : 0;
    const failRate = 100 - passRate;

    const stuAvg = {};
    grades.forEach(g => {
        if (!stuAvg[g.studentId]) stuAvg[g.studentId] = { name: g.studentName, total: 0, count: 0 };
        stuAvg[g.studentId].total += Number(g.percent);
        stuAvg[g.studentId].count++;
    });
    const top = Object.values(stuAvg).map(s => ({ ...s, avg: s.count ? s.total / s.count : 0 }))
        .sort((a, b) => b.avg - a.avg)[0];

    el.innerHTML = `
        <div class="sa-kpi-row">
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Overall Average Score</div>
                <div class="sa-kpi-value" style="color:#6366f1;">${avg.toFixed(1)}%</div>
                <span class="sa-kpi-pill blue">${grades.length} grades recorded</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Pass Rate</div>
                <div class="sa-kpi-value" style="color:#10b981;">${passRate.toFixed(1)}%</div>
                <span class="sa-kpi-pill green">${passCount} passed</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Fail Rate</div>
                <div class="sa-kpi-value" style="color:#ef4444;">${failRate.toFixed(1)}%</div>
                <span class="sa-kpi-pill red">${allPercents.length - passCount} failed</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Top Performer</div>
                <div class="sa-kpi-value" style="color:#8b5cf6;font-size:1.15rem;">${top ? esc(top.name) : '—'}</div>
                <span class="sa-kpi-pill green">${top ? top.avg.toFixed(1) + '% avg' : 'No data'}</span>
            </div>
        </div>
    `;
}

function renderSA_AttendanceKPIs() {
    const el = document.getElementById('saAttendanceKPIs');
    if (!el) return;
    const totalRecs = attendance.length;
    const present = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const overallRate = totalRecs ? (present / totalRecs) * 100 : 0;
    const daysMarked = new Set(attendance.map(a => a.date)).size;

    let bestClass = '—', bestRate = 0;
    classes.forEach(c => {
        const ids = students.filter(s => s.classId === c.id && s.status === 'Active').map(s => s.id);
        const recs = attendance.filter(a => ids.includes(a.studentId));
        if (!recs.length) return;
        const r = (recs.filter(a => a.status === 'Present' || a.status === 'Late').length / recs.length) * 100;
        if (r > bestRate) { bestRate = r; bestClass = c.name; }
    });

    const stuAtt = {};
    attendance.forEach(a => {
        if (!stuAtt[a.studentId]) stuAtt[a.studentId] = { present: 0, total: 0 };
        stuAtt[a.studentId].total++;
        if (a.status === 'Present' || a.status === 'Late') stuAtt[a.studentId].present++;
    });
    const atRisk = Object.values(stuAtt).filter(s => (s.present / s.total) * 100 < 75).length;

    el.innerHTML = `
        <div class="sa-kpi-row">
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Overall Attendance Rate</div>
                <div class="sa-kpi-value" style="color:#10b981;">${overallRate.toFixed(1)}%</div>
                <span class="sa-kpi-pill green">${present} attended</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Days Marked</div>
                <div class="sa-kpi-value" style="color:#6366f1;">${daysMarked}</div>
                <span class="sa-kpi-pill blue">${daysMarked} day${daysMarked === 1 ? '' : 's'}</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Best Attendance Class</div>
                <div class="sa-kpi-value" style="color:#8b5cf6;font-size:1.15rem;">${esc(bestClass)}</div>
                <span class="sa-kpi-pill green">${bestRate.toFixed(1)}% rate</span>
            </div>
            <div class="sa-kpi-card">
                <div class="sa-kpi-label">Students at Risk</div>
                <div class="sa-kpi-value" style="color:#ef4444;">${atRisk}</div>
                <span class="sa-kpi-pill red">below 75%</span>
            </div>
        </div>
    `;
}

function renderSA_AcademicInsights() {
    const el = document.getElementById('saAcademicInsights');
    if (!el) return;
    const items = [];

    const classAvgs = classes.map(c => {
        const ids = students.filter(s => s.classId === c.id && s.status === 'Active').map(s => s.id);
        const gs = grades.filter(g => ids.includes(g.studentId));
        return { name: c.name, avg: gs.length ? gs.reduce((a, g) => a + Number(g.percent), 0) / gs.length : 0 };
    }).filter(x => x.avg > 0).sort((a, b) => b.avg - a.avg);

    if (classAvgs[0]) {
        items.push(`
            <div class="sa-list-item">
                <div class="sa-list-icon green"><i class="fas fa-check"></i></div>
                <div class="sa-list-body">
                    <div class="sa-list-title">Top Class Performance</div>
                    <div class="sa-list-sub">${esc(classAvgs[0].name)} has the highest average at ${classAvgs[0].avg.toFixed(1)}%</div>
                </div>
            </div>
        `);
    }

    const stuAvg = {};
    grades.forEach(g => {
        if (!stuAvg[g.studentId]) stuAvg[g.studentId] = { name: g.studentName, className: g.className, total: 0, count: 0 };
        stuAvg[g.studentId].total += Number(g.percent);
        stuAvg[g.studentId].count++;
    });
    const topStu = Object.values(stuAvg).map(s => ({ ...s, avg: s.count ? s.total / s.count : 0 }))
        .sort((a, b) => b.avg - a.avg)[0];

    if (topStu) {
        items.push(`
            <div class="sa-list-item">
                <div class="sa-list-icon purple"><i class="fas fa-star"></i></div>
                <div class="sa-list-body">
                    <div class="sa-list-title">Top Performer</div>
                    <div class="sa-list-sub">${esc(topStu.name)} — ${topStu.avg.toFixed(1)}% overall average</div>
                </div>
            </div>
        `);
    }

    const subAvgs = {};
    grades.forEach(g => {
        if (!subAvgs[g.subjectName]) subAvgs[g.subjectName] = [];
        subAvgs[g.subjectName].push(Number(g.percent));
    });
    const worstSubject = Object.entries(subAvgs)
        .map(([n, arr]) => ({ name: n, avg: arr.reduce((a, x) => a + x, 0) / arr.length }))
        .sort((a, b) => a.avg - b.avg)[0];

    if (worstSubject && worstSubject.avg < 70) {
        items.push(`
            <div class="sa-list-item">
                <div class="sa-list-icon amber"><i class="fas fa-lightbulb"></i></div>
                <div class="sa-list-body">
                    <div class="sa-list-title">Subject Needing Focus</div>
                    <div class="sa-list-sub">${esc(worstSubject.name)} averages ${worstSubject.avg.toFixed(1)}% — consider extra support</div>
                </div>
            </div>
        `);
    }

    el.innerHTML = items.length ? items.join('') : '<div class="sa-empty"><i class="fas fa-chart-pie"></i>Not enough data yet</div>';
}

function renderSA_DataDecisions() {
    const el = document.getElementById('saDataDecisions');
    if (!el) return;
    const items = [];

    const month = today().slice(0, 7);
    const newStu = students.filter(s => (s.admissionDate || '').slice(0, 7) === month).length;
    const activeStudents = students.filter(s => s.status === 'Active');
    const outstanding = activeStudents.reduce((a, s) => a + Math.max(0, studentBalance(s)), 0);

    if (newStu > 0) {
        items.push(`
            <div class="sa-list-item">
                <div class="sa-list-icon green"><i class="fas fa-arrow-up"></i></div>
                <div class="sa-list-body">
                    <div class="sa-list-title">Enrollment Growth</div>
                    <div class="sa-list-sub">+${newStu} new student${newStu === 1 ? '' : 's'} this month</div>
                </div>
                <span class="sa-list-action green">Act</span>
            </div>
        `);
    }

    if (outstanding > 0) {
        items.push(`
            <div class="sa-list-item">
                <div class="sa-list-icon amber"><i class="fas fa-hand-holding-dollar"></i></div>
                <div class="sa-list-body">
                    <div class="sa-list-title">Outstanding Fees</div>
                    <div class="sa-list-sub">${money(outstanding)} still owed by students</div>
                </div>
                <span class="sa-list-action amber">Review</span>
            </div>
        `);
    }

    const noTeacher = classes.filter(c => !c.teacherId && c.status === 'Active').length;
    if (noTeacher > 0) {
        items.push(`
            <div class="sa-list-item">
                <div class="sa-list-icon blue"><i class="fas fa-user-plus"></i></div>
                <div class="sa-list-body">
                    <div class="sa-list-title">Staff Engagement</div>
                    <div class="sa-list-sub">${noTeacher} class${noTeacher === 1 ? '' : 'es'} without an assigned teacher</div>
                </div>
                <span class="sa-list-action blue">View</span>
            </div>
        `);
    }

    el.innerHTML = items.length ? items.join('') : '<div class="sa-empty"><i class="fas fa-thumbs-up"></i>No actions needed — all systems look good</div>';
}

function renderSA_TopStudents() {
    const el = document.getElementById('saTopStudents');
    if (!el) return;
    const stuAvg = {};
    grades.forEach(g => {
        if (!stuAvg[g.studentId]) stuAvg[g.studentId] = { name: g.studentName, className: g.className, total: 0, count: 0 };
        stuAvg[g.studentId].total += Number(g.percent);
        stuAvg[g.studentId].count++;
    });
    const top = Object.values(stuAvg).map(s => ({ ...s, avg: s.count ? s.total / s.count : 0 }))
        .sort((a, b) => b.avg - a.avg).slice(0, 5);

    if (!top.length) { el.innerHTML = '<div class="sa-empty"><i class="fas fa-trophy"></i>No grades recorded yet</div>'; return; }

    el.innerHTML = top.map((s, i) => `
        <div class="sa-rank-row">
            <div class="sa-rank-pos ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
            <div class="sa-rank-info">
                <div class="sa-rank-name">${esc(s.name)}</div>
                <div class="sa-rank-meta">${esc(s.className)}</div>
            </div>
            <div class="sa-rank-value">${s.avg.toFixed(1)}%</div>
        </div>
    `).join('');
}

function renderSA_ClassRankings() {
    const el = document.getElementById('saClassRankings');
    if (!el) return;
    const rankings = classes.map(c => {
        const ids = students.filter(s => s.classId === c.id && s.status === 'Active').map(s => s.id);
        const gs = grades.filter(g => ids.includes(g.studentId));
        return {
            name: c.name,
            avg: gs.length ? gs.reduce((a, g) => a + Number(g.percent), 0) / gs.length : 0,
            count: ids.length
        };
    }).filter(x => x.avg > 0).sort((a, b) => b.avg - a.avg);

    if (!rankings.length) { el.innerHTML = '<div class="sa-empty"><i class="fas fa-ranking-star"></i>No class data available</div>'; return; }

    el.innerHTML = rankings.map((c, i) => `
        <div class="sa-rank-row">
            <div class="sa-rank-pos ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
            <div class="sa-rank-info">
                <div class="sa-rank-name">${esc(c.name)}</div>
                <div class="sa-rank-meta">${c.count} student${c.count === 1 ? '' : 's'}</div>
            </div>
            <div class="sa-rank-value">${c.avg.toFixed(1)}%</div>
        </div>
    `).join('');
}

function renderSA_AttRisk() {
    const el = document.getElementById('saAttRisk');
    if (!el) return;
    const stuAtt = {};
    attendance.forEach(a => {
        if (!stuAtt[a.studentId]) stuAtt[a.studentId] = { name: a.studentName, className: a.className, present: 0, total: 0 };
        stuAtt[a.studentId].total++;
        if (a.status === 'Present' || a.status === 'Late') stuAtt[a.studentId].present++;
    });
    const risk = Object.values(stuAtt)
        .map(s => ({ ...s, rate: (s.present / s.total) * 100 }))
        .filter(s => s.rate < 75)
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 6);

    if (!risk.length) {
        el.innerHTML = `
            <div class="sa-empty" style="padding: 40px 16px;">
                <i class="fas fa-check-circle" style="color:#10b981;font-size:2.5rem;"></i>
                <div style="font-weight:700;color:var(--school-brown);font-style:normal;margin-bottom:4px;">All students above 75%</div>
                <div>Great job! No attendance concerns.</div>
            </div>
        `;
        return;
    }

    el.innerHTML = risk.map(s => `
        <div class="sa-rank-row">
            <div class="sa-rank-pos" style="background:#fee2e2;color:#991b1b;"><i class="fas fa-exclamation" style="font-size:0.65rem;"></i></div>
            <div class="sa-rank-info">
                <div class="sa-rank-name">${esc(s.name)}</div>
                <div class="sa-rank-meta">${esc(s.className)} · ${s.present}/${s.total} days</div>
            </div>
            <div class="sa-rank-value" style="color:#ef4444;">${s.rate.toFixed(1)}%</div>
        </div>
    `).join('');
}

function exportSmartAnalytics() {
    const s = saHealthScore();
    const t = today();
    const month = t.slice(0, 7);
    const prevMonth = saMonthKey(-1);

    const activeStudents = students.filter(st => st.status === 'Active');
    const totalExpected = activeStudents.reduce((a, st) => a + studentTotalExpected(st), 0);
    const totalCollected = activeStudents.reduce((a, st) => a + studentPaid(st.id), 0);
    const outstanding = activeStudents.reduce((a, st) => a + Math.max(0, studentBalance(st)), 0);

    const thisMonthFees = payments.filter(p => (p.date || '').slice(0, 7) === month).reduce((a, p) => a + p.amount, 0);
    const lastMonthFees = payments.filter(p => (p.date || '').slice(0, 7) === prevMonth).reduce((a, p) => a + p.amount, 0);

    const rows = [
        { Metric: 'School Health Score', Value: s.overall + ' / 100', Category: 'Overall' },
        { Metric: 'Attendance Score', Value: s.attendance + '%', Category: 'Overall' },
        { Metric: 'Fee Collection Score', Value: s.fees + '%', Category: 'Overall' },
        { Metric: 'Financial Health Score', Value: s.financial + '%', Category: 'Overall' },
        { Metric: 'Total Students (active)', Value: activeStudents.length, Category: 'Enrollment' },
        { Metric: 'Total Expected Fees', Value: totalExpected.toFixed(2), Category: 'Fees' },
        { Metric: 'Total Collected', Value: totalCollected.toFixed(2), Category: 'Fees' },
        { Metric: 'Total Outstanding', Value: outstanding.toFixed(2), Category: 'Fees' },
        { Metric: 'Collection Rate', Value: (totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0).toFixed(1) + '%', Category: 'Fees' },
        { Metric: 'Fees This Month', Value: thisMonthFees.toFixed(2), Category: 'Fees' },
        { Metric: 'Fees Last Month', Value: lastMonthFees.toFixed(2), Category: 'Fees' },
        { Metric: 'Month-over-Month Change', Value: saPercentChange(thisMonthFees, lastMonthFees).toFixed(1) + '%', Category: 'Fees' },
        { Metric: 'Total Expenses (All Time)', Value: expenses.reduce((a, e) => a + e.amount, 0).toFixed(2), Category: 'Expenses' },
        { Metric: 'Net Balance', Value: (totalCollected - expenses.reduce((a, e) => a + e.amount, 0)).toFixed(2), Category: 'Financial' }
    ];

    downloadBlob(toCSV(rows), 'smart_analytics_' + today() + '.csv', 'text/csv;charset=utf-8;');
    toast('Smart Analytics report exported.', 'success');
}

// ═══════════════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════════════
function renderStudents() {
    const tbody = document.getElementById('studentsTbody');
    if (!tbody) return;

    const classSel = document.getElementById('studentClassFilter');
    if (classSel) {
        const cur = classSel.value;
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        classSel.innerHTML = '<option value="All">All Classes</option>' + sortedClasses.map(c => '<option>' + esc(c.name) + '</option>').join('');
        classSel.value = cur && [...classSel.options].some(o => o.value === cur) ? cur : 'All';
    }

    const q = (document.getElementById('searchStudents')?.value || '').toLowerCase();
    const cls = document.getElementById('studentClassFilter')?.value || 'All';
    const status = (document.getElementById('studentStatusFilter')?.value || 'All');

    const list = students.filter(s => {
        const mQ = !q || s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q) ||
            (s.guardian || '').toLowerCase().includes(q) || (s.guardianPhone || '').includes(q);
        const mC = cls === 'All' || s.className === cls;
        const mS = status === 'All' || s.status === status;
        return mQ && mC && mS;
    });

    const month = today().slice(0, 7);
    setText('stuMetricTotal', students.length);
    setText('stuMetricActive', students.filter(s => s.status === 'Active').length);
    setText('stuMetricGender', students.filter(s => s.gender === 'Male').length + ' / ' + students.filter(s => s.gender === 'Female').length);
    setText('stuMetricNew', students.filter(s => (s.admissionDate || '').slice(0, 7) === month).length);
    setText('studentCountBadge', list.length);

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#7a8a87;">No students found.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(s => {
        const age = calcAge(s.dob);
        const ageStr = age !== null ? age + ' yrs' : '—';
        
        const statusCls = s.status === 'Active' ? 'status-active' :
            s.status === 'Graduated' ? 'status-graduated' :
            s.status === 'Transferred' ? 'status-transferred' : 'status-inactive';

        return '<tr>' +
            '<td>' +
                '<div class="user-avatar-list">' +
                    '<div class="avatar-circle">' + getInitials(s.name) + '</div>' +
                    '<div class="user-details">' +
                        '<span class="user-name">' + esc(s.name) + '</span>' +
                        '<span class="user-sub">ID: ' + esc(s.code) + '</span>' +
                    '</div>' +
                '</div>' +
            '</td>' +
            '<td><span class="class-badge">' + esc(s.className) + '</span></td>' +
            '<td>' +
                '<div style="font-weight:600;color:var(--school-brown);">' + ageStr + '</div>' +
                '<div style="color:#7a8a87;font-size:0.78rem;">' + esc(s.gender) + '</div>' +
            '</td>' +
            '<td>' +
                '<div style="font-weight:600;color:var(--school-brown);">' + esc(s.guardian || '—') + '</div>' +
                '<div style="color:#7a8a87;font-size:0.78rem;">' + esc(s.guardianPhone || '—') + '</div>' +
            '</td>' +
            '<td>' + esc(s.address || '—') + '</td>' +
            '<td>' + formatDate(s.admissionDate) + '</td>' +
            '<td><span class="status-pill ' + statusCls + '">' + esc(s.status) + '</span></td>' +
            '<td class="action-icons">' +
                '<i class="fas fa-money-bill" onclick="gotoFeeStudent(\'' + s.id + '\')" title="Collect fee"></i>' +
                '<i class="fas fa-edit" onclick="editStudent(\'' + s.id + '\')" title="Edit"></i>' +
                '<i class="fas fa-trash-alt" onclick="deleteStudent(\'' + s.id + '\')" title="Delete"></i>' +
            '</td>' +
        '</tr>';
    }).join('');
}

function openStudentModal(student) {
    document.getElementById('studentModalTitle').textContent = student ? 'Edit Student' : 'Admit Student';
    document.getElementById('studentId').value = student ? student.id : '';

    const classSel = document.getElementById('stuClass');
    const sortedClasses = classes.slice().sort((a, b) =>
        levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
    );
    classSel.innerHTML = '<option value="">-- Select Class --</option>' +
        sortedClasses.map(c => '<option value="' + c.id + '" data-fee="' + c.fee + '"' + (student && student.classId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');

    document.getElementById('stuName').value = student ? student.name : '';
    document.getElementById('stuCode').value = student ? student.code : '';
    document.getElementById('stuGender').value = student ? student.gender : 'Male';
    document.getElementById('stuDob').value = student ? (student.dob || '') : '';
    document.getElementById('stuGuardian').value = student ? (student.guardian || '') : '';
    document.getElementById('stuGuardianPhone').value = student ? (student.guardianPhone || '') : '';
    document.getElementById('stuFee').value = student ? studentTotalExpected(student) : '';
    document.getElementById('stuAdmission').value = student ? (student.admissionDate || today()) : today();
    document.getElementById('stuAddress').value = student ? (student.address || '') : '';
    document.getElementById('stuStatus').value = student ? student.status : 'Active';
    document.getElementById('stuEmail').value = student ? (student.email || '') : '';
    document.getElementById('stuNotes').value = student ? (student.notes || '') : '';

    renderFeeStructureEditor(student);

    document.getElementById('studentModal').classList.add('active');
}

function renderFeeStructureEditor(student) {
    const editor = document.getElementById('feeStructureEditor');
    if (!editor) return;

    let struct = [];
    const globalTypes = settings.feeTypes || ['Tuition', 'Feeding', 'Transport'];
    
    let existingStruct = [];
    if (student) {
        existingStruct = getStudentFeeStructure(student);
    }

    globalTypes.forEach(gType => {
        const existing = existingStruct.find(f => f.type.toLowerCase() === gType.toLowerCase());
        if (existing) {
            struct.push({ type: existing.type, expected: existing.expected });
            existing._mapped = true;
        } else {
            struct.push({ type: gType, expected: 0 });
        }
    });

    existingStruct.forEach(f => {
        if (!f._mapped) {
            struct.push({ type: f.type, expected: f.expected });
        }
    });

    editor.innerHTML = struct.map(f => `
        <div class="fs-row">
            <input type="text" class="fs-type" placeholder="Fee type (e.g. Tuition)" value="${esc(f.type || '')}" list="feeTypeOptions" />
            <input type="number" class="fs-amount" placeholder="Amount" step="0.01" min="0" value="${f.expected || ''}" />
            <button type="button" class="fs-remove" title="Remove"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    if (!document.getElementById('feeTypeOptions')) {
        const dl = document.createElement('datalist');
        dl.id = 'feeTypeOptions';
        dl.innerHTML = ['Tuition', 'Feeding', 'Transport', 'Uniform', 'Books & Stationery',
            'Exam Fee', 'Development Levy', 'PTA Dues', 'Sports Fee', 'Maintenance', 'Other']
            .map(t => '<option value="' + t + '">').join('');
        document.body.appendChild(dl);
    }

    editor.querySelectorAll('.fs-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.fs-row').remove();
            updateStuFeeFromStructure();
        });
    });
    editor.querySelectorAll('.fs-amount').forEach(inp => {
        inp.addEventListener('input', updateStuFeeFromStructure);
    });

    updateStuFeeFromStructure();
}

function updateStuFeeFromStructure() {
    const editor = document.getElementById('feeStructureEditor');
    if (!editor) return;
    let total = 0;
    editor.querySelectorAll('.fs-row').forEach(row => {
        const amt = parseFloat(row.querySelector('.fs-amount').value) || 0;
        total += amt;
    });
    document.getElementById('stuFee').value = total.toFixed(2);
}

function readFeeStructureFromEditor() {
    const editor = document.getElementById('feeStructureEditor');
    if (!editor) return [];
    const struct = [];
    editor.querySelectorAll('.fs-row').forEach(row => {
        const type = (row.querySelector('.fs-type').value || '').trim();
        const amt = parseFloat(row.querySelector('.fs-amount').value) || 0;
        if (type && amt > 0) struct.push({ type, expected: amt });
    });
    return struct;
}

function editStudent(id) { const s = students.find(x => x.id === id); if (s) openStudentModal(s); }

function saveStudent() {
    const id = document.getElementById('studentId').value;
    const classId = document.getElementById('stuClass').value;
    if (!classId) { toast('Please select a class.', 'error'); return; }
    const cls = classes.find(c => c.id === classId);

    const feeStructure = readFeeStructureFromEditor();
    const totalFee = feeStructure.reduce((a, f) => a + f.expected, 0);

    const data = {
        name: document.getElementById('stuName').value.trim(),
        code: document.getElementById('stuCode').value.trim() || ('S' + String(1000 + students.length).padStart(3, '0')),
        gender: document.getElementById('stuGender').value,
        dob: document.getElementById('stuDob').value,
        classId,
        className: cls ? cls.name : '',
        guardian: document.getElementById('stuGuardian').value.trim(),
        guardianPhone: document.getElementById('stuGuardianPhone').value.trim(),
        fee: totalFee,
        feeStructure: feeStructure,
        admissionDate: document.getElementById('stuAdmission').value || today(),
        address: document.getElementById('stuAddress').value.trim(),
        status: document.getElementById('stuStatus').value,
        email: document.getElementById('stuEmail').value.trim(),
        notes: document.getElementById('stuNotes').value.trim()
    };

    if (!data.name) { toast('Student name is required.', 'error'); return; }

    if (id) {
        const i = students.findIndex(s => s.id === id);
        students[i] = Object.assign(students[i], data);
        toast('Student updated.', 'success');
    } else {
        data.id = uid('SD');
        students.push(data);
        toast('Student admitted.', 'success');
    }
    
    saveAll(); // Saves to local storage and triggers the bridge

        // 🟢 DIRECT RELATIONAL PUSH TO SUPABASE (all fields)
    if (window.SupabaseBridge && window.SupabaseBridge.client) {
        window.SupabaseBridge.client.from('students').upsert({
            id: data.id,
            name: data.name,
            code: data.code,
            gender: data.gender,
            dob: data.dob,
            classId: data.classId,
            className: data.className,
            guardian: data.guardian,
            guardianPhone: data.guardianPhone,
            address: data.address,
            status: data.status,
            email: data.email,
            notes: data.notes,
            admissionDate: data.admissionDate,
            fee: data.fee,
            feeStructure: data.feeStructure
        }).then(({ error }) => {
            if (error) console.error('Failed to save to students table:', error);
            else console.log('Successfully saved to students table');
        });
    }

    document.getElementById('studentModal').classList.remove('active');
    renderStudents();
    refreshDashboard();

    if (selectedFeeStudentId === (id || data.id)) renderFeePanel();
}

function deleteStudent(id) {
    if (!confirm('Delete this student? All their payment records will also be removed.')) return;
    students = students.filter(s => s.id !== id);
    payments = payments.filter(p => p.studentId !== id);
    grades = grades.filter(g => g.studentId !== id);
    attendance = attendance.filter(a => a.studentId !== id);
    saveAll();
    renderStudents();
    refreshDashboard();
    toast('Student deleted.');
}

function gotoFeeStudent(id) {
    selectedFeeStudentId = id;
    switchTab('fees');
}

// ═══════════════════════════════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════════════════════════════
function renderClasses() {
    const container = document.getElementById('levelGroups');
    if (!container) return;

    const activeCls = classes.filter(c => c.status === 'Active');
    const totalEnrolled = classes.reduce((a, c) =>
        a + students.filter(s => s.classId === c.id && s.status === 'Active').length, 0);
    const avg = classes.length ? Math.round(totalEnrolled / classes.length) : 0;

    setText('clsMetricTotal', classes.length);
    setText('clsMetricActive', activeCls.length);
    setText('clsMetricEnrolled', totalEnrolled);
    setText('clsMetricAvg', avg);

    const levels = [...new Set(classes.map(c => c.level).filter(Boolean))]
        .sort((a, b) => levelOrderRank(a) - levelOrderRank(b) || a.localeCompare(b));

    const levelSel = document.getElementById('classLevelFilter');
    if (levelSel) {
        const cur = levelSel.value;
        levelSel.innerHTML = '<option value="All">All Levels</option>' +
            levels.map(l => '<option>' + esc(l) + '</option>').join('');
        levelSel.value = cur && [...levelSel.options].some(o => o.value === cur) ? cur : 'All';
    }

    const q = (document.getElementById('classSearch')?.value || '').toLowerCase();
    const levelF = document.getElementById('classLevelFilter')?.value || 'All';

    const filtered = classes.filter(c => {
        const mQ = !q || c.name.toLowerCase().includes(q) || (c.level || '').toLowerCase().includes(q);
        const mL = levelF === 'All' || c.level === levelF;
        return mQ && mL;
    });

    if (!filtered.length) {
        container.innerHTML = '<div class="list-empty" style="padding:50px 0;background:#fff;border-radius:16px;border:1px solid #f0ebf9;">No classes match your search.</div>';
        return;
    }

    const groups = {};
    filtered.forEach(c => {
        const lvl = c.level || 'Unassigned';
        if (!groups[lvl]) groups[lvl] = [];
        groups[lvl].push(c);
    });

    const sortedLevels = Object.keys(groups).sort((a, b) =>
        levelOrderRank(a) - levelOrderRank(b) || a.localeCompare(b)
    );

    container.innerHTML = sortedLevels.map(lvl => {
        const list = groups[lvl].slice().sort(naturalCompareClass);
        const enrolled = list.reduce((a, c) =>
            a + students.filter(s => s.classId === c.id && s.status === 'Active').length, 0);
        const nC = list.length;
        const nS = enrolled;

        return `
            <div class="level-group" data-level="${esc(lvl)}">
                <div class="level-header" onclick="toggleLevelGroup(this)">
                    <span class="level-icon"><i class="fas fa-layer-group"></i></span>
                    <span class="level-name">${esc(lvl)}</span>
                    <span class="level-badge">${nC} class${nC === 1 ? '' : 'es'} · ${nS} student${nS === 1 ? '' : 's'}</span>
                    <span class="level-chevron"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="level-body">
                    ${list.map(c => renderClassMiniCard(c)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleLevelGroup(header) {
    const group = header.closest('.level-group');
    if (group) group.classList.toggle('collapsed');
}

function renderClassMiniCard(c) {
    const enrolled = students.filter(s => s.classId === c.id && s.status === 'Active').length;
    const capacity = Number(c.capacity) || 0;
    const pct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;

    return `
        <div class="class-mini-card">
            <div class="cmc-head">
                <div>
                    <div class="cmc-title">${esc(c.name)}</div>
                    <div class="cmc-tags">
                        <span class="cmc-tag-level">${esc(c.level || '—')}</span>
                    </div>
                </div>
                <span class="cmc-status-active">${esc(c.status)}</span>
            </div>

            <div class="cmc-stats-row">
                <span><i class="fas fa-user"></i>${enrolled} / ${capacity || '—'}</span>
                <span><i class="fas fa-chart-line"></i>${pct}% filled</span>
            </div>

            <div>
                <div class="cmc-capacity-label">
                    <span>Capacity</span>
                    <span>${pct}%</span>
                </div>
                <div class="cmc-capacity-bar">
                    <span style="width:${pct}%"></span>
                </div>
            </div>

            <div class="cmc-enrolled-row">
                <span><i class="fas fa-user"></i> Enrolled</span>
                <span>${enrolled} student${enrolled === 1 ? '' : 's'}</span>
            </div>

            <div class="cmc-enrolled-big">
                <i class="fas fa-users"></i>
                <strong>${enrolled}</strong>
                <span style="font-weight:500;color:#6b7280;font-size:0.82rem;">enrolled</span>
            </div>

            <div class="cmc-actions">
                <button class="cmc-btn view" onclick="viewClassDetail('${c.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="cmc-btn edit" onclick="editClass('${c.id}')" title="Edit">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="cmc-btn delete" onclick="deleteClass('${c.id}')" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
}

function viewClassDetail(classId) {
    const c = classes.find(x => x.id === classId);
    if (!c) return;
    activeClassDetailId = classId;

    document.getElementById('classesLevelsView').style.display = 'none';
    document.getElementById('classDetailView').style.display = 'block';

    document.getElementById('classDetailPageTitle').textContent = c.name;
    document.getElementById('classDetailPageSub').textContent = 'Manage students and exams for ' + c.name;

    document.querySelectorAll('#classDetailView .sub-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-classviewtab') === 'students');
    });
    document.querySelectorAll('#classDetailView .subtab-content').forEach(x => x.classList.remove('active-subtab'));
    document.getElementById('classStudentsView').classList.add('active-subtab');

    renderClassStudents(c.id);
    renderClassExamsPage(c.id);
}

function backToLevels() {
    document.getElementById('classesLevelsView').style.display = 'block';
    document.getElementById('classDetailView').style.display = 'none';
    activeClassDetailId = null;
    renderClasses();
}

function calcAge(dob) {
    if (!dob) return null;
    const p = String(dob).split('-');
    if (p.length !== 3) return null;
    const birth = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

function renderClassStudents(classId) {
    const el = document.getElementById('classStudentsView');
    if (!el) return;
    const cls = classes.find(c => c.id === classId);
    const list = students.filter(s => s.classId === classId && s.status === 'Active');

    if (!list.length) {
        el.innerHTML = '<div class="student-table-card"><div class="list-empty">No students enrolled in this class yet.</div></div>';
        return;
    }

    el.innerHTML = `
        <div class="student-table-card">
            <div class="stc-header">
                <h3>All Students in ${esc(cls.name)}</h3>
                <span class="stc-count">${list.length}</span>
            </div>
            <div class="table-wrapper" style="overflow-x: auto; width: 100%;">
                <table>
                <thead>
                    <tr>
                        <th style="width:50px;">#</th>
                        <th>Student Name</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Admission Date</th>
                        <th>Performance</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map((s, i) => {
                        const age = calcAge(s.dob);
                        return `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${esc(s.name)}</strong></td>
                                <td>${age !== null ? age : '—'}</td>
                                <td>${esc(s.gender)}</td>
                                <td>${formatDate(s.admissionDate)}</td>
                                <td>
                                    <button class="perf-btn" onclick="showStudentPerformance('${s.id}')">
                                        <i class="fas fa-chart-line"></i> View Performance
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderClassExamsPage(classId) {
    const el = document.getElementById('classExamsView');
    if (!el) return;
    const cls = classes.find(c => c.id === classId);
    const clsGrades = grades.filter(g => g.classId === classId);
    const classExams = exams.filter(e => e.classId === classId);

    const allSubjects = subjects.filter(s => s.status === 'Active');
    const groups = [];
    allSubjects.forEach(sub => {
        const examsForSub = classExams.filter(e => e.subjectId === sub.id);
        if (examsForSub.length) groups.push({ subject: sub, exams: examsForSub });
    });

    const usedIds = new Set(groups.flatMap(g => g.exams.map(e => e.id)));
    const unassignedExams = classExams.filter(e => !usedIds.has(e.id));

    const totalForClass = classExams.length;

    let html = `
        <div class="class-exams-header">
            <div>
                <h2><i class="fas fa-file-lines"></i> Exams for ${esc(cls.name)}</h2>
                <span class="badge">${totalForClass}</span>
            </div>
            <div class="class-exams-actions">
                <button class="add-btn" onclick="openExamModal(null)">
                    <i class="fas fa-plus-circle"></i> Create Exam
                </button>
                <button class="promote-btn" onclick="promoteStudents('${classId}')">
                    <i class="fas fa-arrow-right"></i> Promote Students
                </button>
            </div>
        </div>
        <div class="table-card">
            <div class="table-title"><span>All Exams</span><span class="badge">${totalForClass}</span></div>
    `;

    if (!totalForClass) {
        html += '<div class="list-empty">No exams created for this class yet. Click <strong>Create Exam</strong> to begin.</div>';
    } else {
        groups.forEach(({ subject, exams: subExams }) => {
            const completed = subExams.filter(e => examDisplayStatus(e) === 'Completed').length;
            html += `
                <div class="subject-exam-group">
                    <div class="subject-exam-header" onclick="toggleSubjectExamGroup(this)">
                        <i class="fas fa-book"></i>
                        <span class="seg-name">${esc(subject.name)}</span>
                        <span class="seg-count">${subExams.length} exam${subExams.length === 1 ? '' : 's'}</span>
                        <span class="seg-status">${completed} COMPLETED</span>
                        <i class="fas fa-chevron-down seg-chevron"></i>
                    </div>
                    <div class="subject-exam-body">
                        ${subExams.map(e => renderExamItemRow(e, classId, subject.id)).join('')}
                    </div>
                </div>
            `;
        });

        if (unassignedExams.length) {
            const completed = unassignedExams.filter(e => examDisplayStatus(e) === 'Completed').length;
            html += `
                <div class="subject-exam-group">
                    <div class="subject-exam-header" onclick="toggleSubjectExamGroup(this)">
                        <i class="fas fa-book"></i>
                        <span class="seg-name">General / Unassigned Subjects</span>
                        <span class="seg-count">${unassignedExams.length} exam${unassignedExams.length === 1 ? '' : 's'}</span>
                        <span class="seg-status">${completed} COMPLETED</span>
                        <i class="fas fa-chevron-down seg-chevron"></i>
                    </div>
                    <div class="subject-exam-body">
                        ${unassignedExams.map(e => renderExamItemRow(e, classId, '')).join('')}
                    </div>
                </div>
            `;
        }
    }

    html += '</div>';
    el.innerHTML = html;
}

function renderExamItemRow(exam, classId, subjectId) {
    const gradeCount = grades.filter(g => g.examId === exam.id && g.classId === classId).length;
    const maxScore = exam.max || 100;
    return `
        <div class="exam-item-row">
            <div class="exam-item-info">
                <div class="eii-name">${esc(exam.name)}</div>
                <div class="eii-meta">
                    ${formatDate(exam.start)} · Max: ${maxScore} · Term: ${esc(exam.term)}
                    <span class="eii-status">${esc(examDisplayStatus(exam))}</span>
                    <span class="eii-count">${gradeCount} grade${gradeCount === 1 ? '' : 's'}</span>
                </div>
            </div>
            <div class="exam-item-actions">
                <button class="exam-action-btn grades" onclick="gradeExamFromClass('${exam.id}', '${classId}', '${subjectId}')">
                    <i class="fas fa-pen"></i> Grades
                </button>
                <button class="exam-action-btn report" onclick="viewExamReportFromClass('${exam.id}', '${classId}')">
                    <i class="fas fa-chart-bar"></i> Report
                </button>
                <button class="exam-action-btn delete" onclick="deleteExamFromClass('${exam.id}', '${classId}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
}

function toggleSubjectExamGroup(header) {
    const group = header.closest('.subject-exam-group');
    if (group) group.classList.toggle('collapsed');
}

// ═══════════════════════════════════════════════════════════════
// REPLACED FUNCTION — student performance report card
// ═══════════════════════════════════════════════════════════════
function showStudentPerformance(studentId, termId = 'all') {
    const s = students.find(x => x.id === studentId);
    if (!s) return;

    // ── 1. Filter exams by term ──
    const termExams = termId === 'all'
        ? exams
        : exams.filter(e => e.term === termId || e.termId === termId);

    // ── 2. Student's grades in the selected scope ──
    const sg = grades.filter(g =>
        g.studentId === studentId &&
        termExams.some(e => e.id === g.examId)
    );

    // ── 3. Attendance ──
    const attRecords = attendance.filter(a => a.studentId === studentId);
    const totalAtt   = attRecords.length;
    const presentAtt = attRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attRate    = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : '0';

    // ── 4. Bucket grades per subject by EXAM TYPE ──
    const subjectsMap = {};
    sg.forEach(g => {
        const exam = termExams.find(e => e.id === g.examId);
        if (!exam) return;

        // 🟢 FIX: Recover missing subject name for older data
        let subName = g.subjectName;
        if (!subName) {
            const matchedSub = subjects.find(s => s.id === g.subjectId);
            subName = matchedSub ? matchedSub.name : (exam.subjectName || 'Unknown Subject');
        }

        if (!subjectsMap[subName]) {
            subjectsMap[subName] = {
                name: subName,
                scores: { individual: 0, group: 0, class: 0, project: 0, exam: 0 },
                maxes:  { individual: 0, group: 0, class: 0, project: 0, exam: 0 }
            };
        }

        let key = '';
        const type = (exam.type || '').toLowerCase();
        if (type.includes('individual')) key = 'individual';
        else if (type.includes('group'))  key = 'group';
        else if (type.includes('class'))  key = 'class';
        else if (type.includes('project'))key = 'project';
        else if (type.includes('end') || type.includes('exam')) key = 'exam';
        else {
            const n = (g.examName || '').toLowerCase();
            if (n.includes('individual')) key = 'individual';
            else if (n.includes('group'))  key = 'group';
            else if (n.includes('class'))  key = 'class';
            else if (n.includes('project'))key = 'project';
            else if (n.includes('end of term') || n.includes('exam')) key = 'exam';
        }

        if (key) {
            subjectsMap[subName].scores[key] += Number(g.score);
            subjectsMap[subName].maxes[key]  += Number(g.max);
        }
    });

    // ── 5. Weighted totals per subject (SBA /50, Exam /50) ──
    Object.values(subjectsMap).forEach(sub => {
        const sbaScore = sub.scores.individual + sub.scores.group + sub.scores.class + sub.scores.project;
        const sbaMax   = sub.maxes.individual  + sub.maxes.group  + sub.maxes.class  + sub.maxes.project;

        sub.sbaTotal        = sbaScore;
        sub.sbaMaxTotal     = sbaMax;
        sub.scaledSBA       = sbaMax  > 0 ? (sbaScore / sbaMax) * 50 : 0;
        sub.endTermScore    = sub.scores.exam;
        sub.endTermMax      = sub.maxes.exam;
        sub.weightedEndTerm = sub.endTermMax > 0 ? (sub.endTermScore / sub.endTermMax) * 50 : 0;
        sub.overallTotal    = sub.scaledSBA + sub.weightedEndTerm;
        sub.overallPercent  = sub.overallTotal.toFixed(1);
        sub.grade           = calcGrade(sub.overallTotal).grade;
    });

    // ── 6. Helper: one student's weighted total for a scope ──
    function overallForStudent(sid) {
        const rows = grades.filter(g =>
            g.studentId === sid &&
            termExams.some(e => e.id === g.examId)
        );
        let sba = 0, sbaMax = 0, exam = 0, examMax = 0;
        rows.forEach(g => {
            const ex = termExams.find(e => e.id === g.examId);
            const type = (ex && ex.type ? ex.type : '').toLowerCase();
            let k = '';
            if (type.includes('individual')) k = 'individual';
            else if (type.includes('group'))  k = 'group';
            else if (type.includes('class'))  k = 'class';
            else if (type.includes('project'))k = 'project';
            else if (type.includes('end') || type.includes('exam')) k = 'exam';
            else {
                const n = (g.examName || '').toLowerCase();
                if (n.includes('individual')) k = 'individual';
                else if (n.includes('group'))  k = 'group';
                else if (n.includes('class'))  k = 'class';
                else if (n.includes('project'))k = 'project';
                else if (n.includes('end of term') || n.includes('exam')) k = 'exam';
            }
            if (k === 'exam') { exam += Number(g.score); examMax += Number(g.max); }
            else if (k)       { sba  += Number(g.score); sbaMax  += Number(g.max); }
        });
        const scaledSba    = sbaMax  > 0 ? (sba  / sbaMax)  * 50 : 0;
        const weightedExam = examMax > 0 ? (exam / examMax) * 50 : 0;
        return scaledSba + weightedExam;
    }

    // ── 7. Per-subject position ──
    const classMates = students.filter(st => st.classId === s.classId && st.status === 'Active');
    Object.keys(subjectsMap).forEach(subName => {
        const ranked = classMates.map(st => {
            const rows = grades.filter(g => {
                if (g.studentId !== st.id) return false;
                if (!termExams.some(e => e.id === g.examId)) return false;
                
                let gSubName = g.subjectName;
                if (!gSubName) {
                    const matchedSub = subjects.find(s => s.id === g.subjectId);
                    const ex = termExams.find(e => e.id === g.examId);
                    gSubName = matchedSub ? matchedSub.name : (ex?.subjectName || 'Unknown Subject');
                }
                return gSubName === subName;
            });
            
            let sba = 0, sbaMax = 0, exam = 0, examMax = 0;
            rows.forEach(g => {
                const n = (g.examName || '').toLowerCase();
                if (n.includes('individual') || n.includes('group') || n.includes('class') || n.includes('project')) {
                    sba += Number(g.score); sbaMax += Number(g.max);
                } else if (n.includes('end of term') || n.includes('exam')) {
                    exam += Number(g.score); examMax += Number(g.max);
                }
            });
            const scaledSba = sbaMax  > 0 ? (sba  / sbaMax)  * 50 : 0;
            const wExam     = examMax > 0 ? (exam / examMax) * 50 : 0;
            return { id: st.id, total: scaledSba + wExam };
        }).sort((a, b) => b.total - a.total);

        const idx = ranked.findIndex(x => x.id === studentId);
        subjectsMap[subName].position = idx >= 0 ? idx + 1 : '—';
    });

    // ── 8. Overall class position ──
    const overallMap = {};
    classMates.forEach(st => { overallMap[st.id] = overallForStudent(st.id); });
    const sortedOverall = Object.entries(overallMap).sort((a, b) => b[1] - a[1]);
    let classPosition = sortedOverall.findIndex(([id]) => id === studentId) + 1;
    if (classPosition === 0) classPosition = '—';

    // ── 9. Averages + grade ──
    const subjectCount = Object.keys(subjectsMap).length;
    const sumOverall   = Object.values(subjectsMap).reduce((a, sub) => a + sub.overallTotal, 0);
    const avgPercent   = subjectCount > 0 ? (sumOverall / subjectCount).toFixed(1) : '0';
    const overallGrade = calcGrade(Number(avgPercent)).grade;
    const classSize    = classMates.length;

    // ── 10. Dynamic comments ──
    const teacherComments = {
        A: 'Excellent performance across all subjects. Keep up the great work!',
        B: 'Good performance with room for improvement in a few areas. Continue working hard.',
        C: 'Satisfactory performance. Focus on improving weaker subjects.',
        D: 'Needs significant improvement in most subjects. Please seek extra help.',
        F: 'Requires urgent attention. Please consult with the class teacher for support.'
    };
    const headComments = {
        A: 'Outstanding academic performance. A role model for peers.',
        B: 'Commendable effort. Keep striving for excellence.',
        C: 'Adequate performance. Set higher goals for the next term.',
        D: 'Below average performance. Please work closely with teachers to improve.',
        F: 'Unsatisfactory performance. Immediate intervention is required.'
    };
    const teacherComment = teacherComments[overallGrade] || teacherComments.F;
    const headComment    = headComments[overallGrade]    || headComments.F;

    // ── 11. Dynamic strengths / improvements ──
    const strengthsList = [], improvementsList = [];
    Object.values(subjectsMap).forEach(sub => {
        if (sub.overallTotal >= 80)     strengthsList.push(`${sub.name} (${sub.overallPercent}%)`);
        else if (sub.overallTotal < 60) improvementsList.push(`${sub.name} (${sub.overallPercent}%)`);
    });
    if (!strengthsList.length)    strengthsList.push('No specific strengths recorded yet.');
    if (!improvementsList.length) improvementsList.push('No areas for improvement identified yet.');

    // ── 12. Term filter options ──
    const availableTerms = ['First Term', 'Second Term', 'Third Term'];
    const termOptions = availableTerms.map(tName =>
        `<option value="${tName}" ${tName === termId ? 'selected' : ''}>${esc(tName)}</option>`
    ).join('');

    // ── 13. Build HTML ──
    let html = `
        <style>
            .friend-sb-container { background: #f8f7fc; border: 1px solid #f0ebf9; border-radius: 14px; padding: 12px; margin-bottom: 20px; }
            .friend-sb-title { font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
            .friend-sb-title i { color: #8b5cf6; font-size: 1.1rem; }
            .friend-sb-row { display: flex; gap: 6px; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; }
            .friend-sb-box { flex: 1 1 0; min-width: 75px; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 8px 4px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .friend-sb-label { font-size: 0.55rem; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.1; margin-bottom: 4px; text-align: center; }
            .friend-sb-value { font-size: 1.3rem; font-weight: 800; color: #1e293b; line-height: 1; }
            .friend-sb-total { border-color: #c084fc; background: #fdf4ff; }
            .friend-sb-total .friend-sb-value { color: #7c3aed; }
            .friend-sb-scale { border-color: #fcd34d; background: #fffbeb; }
            .friend-sb-scale .friend-sb-value { color: #d97706; }
            .friend-sb-final { border-color: #86efac; background: #f0fdf4; }
            .friend-sb-final .friend-sb-value { color: #16a34a; }
        </style>
        <div class="report-card-modal modal-card">
            <div class="rc-header" style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div style="display:flex;align-items:center;gap:12px;">
                    ${settings.logo ? '<img src="' + settings.logo + '" alt="Logo" style="width: 65px; height: 65px; border-radius: 50%; object-fit: cover; background: #ffffff; padding: 4px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">' : ''}
                    <h1 class="rc-school-name">${esc(settings.name)}</h1>
                </div>
                <div style="text-align:right;">
                    <label style="font-size:0.7rem;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;">Term</label>
                    <select id="perfTermSelect" style="display:block; margin-top:4px; padding:6px 30px 6px 12px; border:1.5px solid #e5e7eb; border-radius:8px; font-family:inherit; font-size:0.85rem; font-weight:600; background:#fff; cursor:pointer; width:auto; outline:none;">
                        <option value="all" ${termId === 'all' ? 'selected' : ''}>All Terms</option>
                        ${termOptions}
                    </select>
                </div>
            </div>

            <div class="rc-student-profile">
                <div class="rc-avatar">${getInitials(s.name)}</div>
                <div class="rc-profile-details">
                    <h2>${esc(s.name)}</h2>
                    <div class="rc-meta-tags">
                        <span><strong>Class:</strong> ${esc(s.className)}</span>
                        <span><strong>ID:</strong> ${esc(s.code)}</span>
                        <span><strong>Age:</strong> ${calcAge(s.dob) || '—'}</span>
                        <span><strong>Gender:</strong> ${esc(s.gender)}</span>
                        <span><strong>Admission:</strong> ${formatDate(s.admissionDate)}</span>
                    </div>
                </div>
            </div>

            <div class="rc-metrics-grid" style="grid-template-columns:repeat(5,1fr);">
                <div class="rc-metric-card">
                    <div class="rc-metric-value" style="color:#8b5cf6;">#${classPosition}</div>
                    <div class="rc-metric-label">Class Position</div>
                    <div class="rc-metric-sub">of ${classSize} students</div>
                </div>
                <div class="rc-metric-card">
                    <div class="rc-metric-value">${attRate}%</div>
                    <div class="rc-metric-label">Attendance</div>
                    <div class="rc-metric-sub">${presentAtt}/${totalAtt} days</div>
                </div>
                <div class="rc-metric-card">
                    <div class="rc-metric-value">${classSize}</div>
                    <div class="rc-metric-label">Class Size</div>
                    <div class="rc-metric-sub">students</div>
                </div>
                <div class="rc-metric-card">
                    <div class="rc-metric-value">${avgPercent}%</div>
                    <div class="rc-metric-label">Average Score</div>
                    <div class="rc-metric-sub">${subjectCount} subject(s)</div>
                </div>
                <div class="rc-metric-card">
                    <div class="rc-metric-value" style="color:${saScoreColor(Number(avgPercent))};">${overallGrade}</div>
                    <div class="rc-metric-label">Overall Grade</div>
                    <div class="rc-metric-sub">grade</div>
                </div>
            </div>

            <div class="friend-sb-container">
                <div class="friend-sb-title"><i class="fas fa-calculator"></i> Scoring Breakdown</div>
                <div class="friend-sb-row">
                    <div class="friend-sb-box">
                        <span class="friend-sb-label">INDIVIDUAL TEST</span>
                        <span class="friend-sb-value">15</span>
                    </div>
                    <div class="friend-sb-box">
                        <span class="friend-sb-label">GROUP WORK</span>
                        <span class="friend-sb-value">15</span>
                    </div>
                    <div class="friend-sb-box">
                        <span class="friend-sb-label">CLASS TEST</span>
                        <span class="friend-sb-value">15</span>
                    </div>
                    <div class="friend-sb-box">
                        <span class="friend-sb-label">PROJECT</span>
                        <span class="friend-sb-value">15</span>
                    </div>
                    <div class="friend-sb-box friend-sb-total">
                        <span class="friend-sb-label">TOTAL</span>
                        <span class="friend-sb-value">60</span>
                    </div>
                    <div class="friend-sb-box friend-sb-scale">
                        <span class="friend-sb-label">SCALED TO 50</span>
                        <span class="friend-sb-value">50</span>
                    </div>
                    <div class="friend-sb-box">
                        <span class="friend-sb-label">END OF TERM EXAMS</span>
                        <span class="friend-sb-value">100</span>
                    </div>
                    <div class="friend-sb-box friend-sb-scale">
                        <span class="friend-sb-label">50%</span>
                        <span class="friend-sb-value">50</span>
                    </div>
                    <div class="friend-sb-box friend-sb-final">
                        <span class="friend-sb-label">OVERALL TOTAL</span>
                        <span class="friend-sb-value">100</span>
                    </div>
                </div>
            </div>

            <div class="rc-section-title"><i class="fas fa-table"></i> Subject-wise Results</div>
            <div class="rc-table-wrapper">
                <table class="rc-subject-table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Individual</th>
                            <th>Group</th>
                            <th>Class</th>
                            <th>Project</th>
                            <th>SBA Total</th>
                            <th>End Term</th>
                            <th>Overall</th>
                            <th>Position</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(subjectsMap).map(sub => `
                            <tr>
                                <td>${esc(sub.name || 'Unknown')}</td>
                                <td>${sub.scores.individual || '—'}</td>
                                <td>${sub.scores.group || '—'}</td>
                                <td>${sub.scores.class || '—'}</td>
                                <td>${sub.scores.project || '—'}</td>
                                <td><strong>${sub.sbaTotal}</strong></td>
                                <td>${sub.endTermScore || '—'}</td>
                                <td><strong>${sub.overallPercent}%</strong></td>
                                <td><span class="position-badge ${(typeof sub.position === 'number' && sub.position <= 3) ? 'top-3' : ''}">#${sub.position}</span></td>
                                <td><span class="grade-badge grade-${sub.grade}">${sub.grade}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="rc-comments-grid">
                <div class="rc-comment-box">
                    <h4><i class="fas fa-comment-dots"></i> Class Teacher's Comment</h4>
                    <p>${esc(teacherComment)}</p>
                </div>
                <div class="rc-comment-box">
                    <h4><i class="fas fa-comment-dots"></i> Headteacher's Comment</h4>
                    <p>${esc(headComment)}</p>
                </div>
            </div>

            <div class="rc-strengths-grid">
                <div class="rc-strength-box">
                    <h4><i class="fas fa-star" style="color:#f39c12;"></i> Strengths</h4>
                    <ul>${strengthsList.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
                </div>
                <div class="rc-strength-box">
                    <h4><i class="fas fa-arrow-up" style="color:#27ae60;"></i> Areas for Improvement</h4>
                    <ul>${improvementsList.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
                </div>
            </div>

            <div class="rc-section-title"><i class="fas fa-chart-line"></i> Performance Chart</div>
            <div class="rc-chart-container">
                <canvas id="reportCardChart"></canvas>
            </div>

            <div class="modal-buttons" style="margin-top:20px;">
                <button class="cancel-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="save-btn" onclick="window.print()"><i class="fas fa-print"></i> Print Report Card</button>
            </div>
        </div>
    `;

    const existing = document.querySelector('.modal-overlay[data-perf-modal]');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.setAttribute('data-perf-modal', '1');
    modal.innerHTML = html;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    const termSel = document.getElementById('perfTermSelect');
    if (termSel) {
        termSel.addEventListener('change', function () {
            showStudentPerformance(studentId, this.value);
        });
    }

    const ctx = document.getElementById('reportCardChart');
    if (ctx) {
        const labels = Object.keys(subjectsMap);
        const data   = labels.map(sub => parseFloat(subjectsMap[sub].overallPercent));
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Subject-wise scores (%)',
                    data,
                    backgroundColor: '#e67e22',
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: '#f0f0f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

function gradeExamFromClass(examId, classId, subjectId) {
    const exam = exams.find(e => e.id === examId);
    const cls = classes.find(c => c.id === classId);
    if (!exam) return;

    // 🟢 FIX: Fallback to exam's subjectId if not passed in
    const validSubId = subjectId || exam.subjectId || '';
    const sub = validSubId ? subjects.find(s => s.id === validSubId) : null;
    const finalSubName = sub ? sub.name : (exam.subjectName || '');

    const list = students.filter(s => s.classId === classId && s.status === 'Active');
    const max = exam.max || 100;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-card performance-modal-card">
            <h2>Grade Exam — ${esc(exam.name)}</h2>
            <p style="color:#7a8a87;font-size:0.85rem;margin-bottom:16px;">
                ${esc(cls.name)}${sub ? ' · ' + esc(sub.name) : ''} · Max score: ${max}
            </p>
            <div class="table-wrapper" style="max-height:440px;overflow-y:auto;">
                <table>
                    <thead><tr><th style="width:50px;">#</th><th>Student</th><th style="width:130px;">Score</th></tr></thead>
                    <tbody>
                        ${list.length ? list.map((s, i) => {
                            const existing = grades.find(g =>
                                g.examId === examId && g.studentId === s.id &&
                                (!subjectId || g.subjectId === subjectId));
                            const val = existing ? existing.score : '';
                            return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><strong>${esc(s.name)}</strong></td>
                                    <td><input type="number" class="score-input exam-grade-input"
                                        data-student="${s.id}" value="${val}"
                                        min="0" max="${max}" step="0.5" /></td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="3" style="text-align:center; padding: 20px; color: #e74c3c; font-weight: 600;">
                                    <i class="fas fa-user-slash"></i> No active students found in this class.<br>
                                    <span style="font-weight:normal; font-size:0.85rem; color:#7a8a87;">Please admit a student to this class first.</span>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
            <div class="modal-buttons">
                <button class="cancel-btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="save-btn" id="saveExamGradesBtn"><i class="fas fa-save"></i> Save Grades</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#saveExamGradesBtn').addEventListener('click', () => {
        let saved = 0, skipped = 0;
        modal.querySelectorAll('.exam-grade-input').forEach(inp => {
            const studentId = inp.dataset.student;
            const raw = inp.value.trim();
            if (raw === '') return;
            const score = clampScore(raw, max);
            if (score === null) {
                toast('Score must be between 0 and ' + max + '. Skipped invalid entries.', 'error');
                skipped++;
                return;
            }

            const stu = students.find(x => x.id === studentId);
            const percent = max > 0 ? (score / max) * 100 : 0;
            const g = calcGrade(percent);

            const existing = grades.find(x =>
                x.examId === examId && x.studentId === studentId &&
                (!subjectId || x.subjectId === subjectId));

            const payload = {
                examId, examName: exam.name,
                studentId, studentName: stu ? stu.name : '',
                classId, className: cls ? cls.name : '',
                subjectId: validSubId, subjectName: finalSubName, // <-- Use the fallback variables
                score, max,
                percent: percent.toFixed(1),
                grade: g.grade, remarks: g.remark
            };
            if (existing) Object.assign(existing, payload);
            else { payload.id = uid('GR'); grades.push(payload); }
            saved++;
        });
        saveAll();
        if (saved) toast('Saved ' + saved + ' grade' + (saved === 1 ? '' : 's') + (skipped ? '. ' + skipped + ' invalid skipped.' : '.'), 'success');
        else if (skipped) toast('No valid grades to save.', 'error');
        modal.remove();
        renderClassExamsPage(classId);
    });

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function viewExamReportFromClass(examId, classId) {
    const exam = exams.find(e => e.id === examId);
    const cls = classes.find(c => c.id === classId);
    if (!exam) return;
    const examGrades = grades.filter(g => g.examId === examId && g.classId === classId);
    const avg = examGrades.length ? (examGrades.reduce((a, g) => a + Number(g.percent), 0) / examGrades.length).toFixed(1) : '0';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-card performance-modal-card">
            <h2>Report — ${esc(exam.name)}</h2>
            <p style="color:#7a8a87;font-size:0.85rem;margin-bottom:16px;">
                ${esc(cls.name)} · ${esc(exam.term)} · ${esc(exam.year)}
            </p>
            <div class="perf-summary">
                <div class="perf-summary-item"><div class="ps-label">Students Graded</div><div class="ps-value">${examGrades.length}</div></div>
                <div class="perf-summary-item"><div class="ps-label">Class Average</div><div class="ps-value">${avg}%</div></div>
                <div class="perf-summary-item"><div class="ps-label">Overall Grade</div><div class="ps-value">${calcGrade(Number(avg)).grade}</div></div>
            </div>
            ${examGrades.length ? `
                <div class="table-wrapper" style="max-height:400px;overflow-y:auto;">
                    <table>
                        <thead><tr><th>#</th><th>Student</th><th>Subject</th><th>Score</th><th>%</th><th>Grade</th></tr></thead>
                        <tbody>
                            ${examGrades.sort((a, b) => b.percent - a.percent).map((g, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${esc(g.studentName)}</td>
                                    <td>${esc(g.subjectName)}</td>
                                    <td>${g.score}/${g.max}</td>
                                    <td><strong>${g.percent}%</strong></td>
                                    <td><span class="grade-badge grade-${g.grade}">${g.grade}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<div class="list-empty">No grades recorded for this exam.</div>'}
            <div class="modal-buttons">
                <button class="cancel-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="save-btn" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
            </div>
        </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function deleteExamFromClass(examId, classId) {
    if (!confirm('Delete this exam? All related grades will also be removed.')) return;
    exams = exams.filter(e => e.id !== examId);
    grades = grades.filter(g => g.examId !== examId);
    saveAll();
    renderClassExamsPage(classId);
    toast('Exam deleted.');
}

function promoteStudents(classId) {
    const sourceClass = classes.find(c => c.id === classId);
    if (!sourceClass) return;

    const enrolled = students.filter(s => s.classId === classId && s.status === 'Active');
    if (!enrolled.length) {
        toast('No active students to promote.', 'error');
        return;
    }

    const otherClasses = classes
        .filter(c => c.id !== classId && c.status === 'Active')
        .sort((a, b) => levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b));

    const listHTML = enrolled.map(s => {
        const age = calcAge(s.dob);
        const ageStr = age !== null ? age + ' yrs' : '—';
        return `
            <label class="promote-student-row">
                <input type="checkbox" class="promote-checkbox" value="${s.id}" checked />
                <div class="promote-student-info">
                    <div class="promote-student-name">${esc(s.name)}</div>
                    <div class="promote-student-meta">ID: ${esc(s.code)} · Age: ${ageStr} · ${esc(s.gender)}</div>
                </div>
            </label>
        `;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'promoteModal';
    modal.innerHTML = `
        <div class="modal-card promote-card">
            <h2>Promote Students</h2>
            <p class="promote-desc">
                Select students to promote from <strong>${esc(sourceClass.name)}</strong> to the target class.
                Unchecked students will remain in their current class.
            </p>

            <div class="promote-field">
                <label>Target Class</label>
                <select id="promoteTargetClass">
                    <option value="">-- Select Class --</option>
                    ${otherClasses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
                </select>
            </div>

            <div class="promote-section">
                <div class="promote-header">
                    <span class="promote-header-title">Students to Promote</span>
                    <label class="promote-select-all">
                        <input type="checkbox" id="promoteSelectAll" checked />
                        <span>Select All</span>
                    </label>
                </div>
                <div class="promote-list" id="promoteList">
                    ${listHTML}
                </div>
            </div>

            <div class="promote-hint">
                <i class="fas fa-lightbulb"></i>
                Unchecked students will remain in <strong>${esc(sourceClass.name)}</strong>.
            </div>

            <div class="modal-buttons">
                <button class="cancel-btn" id="promoteCancelBtn">Cancel</button>
                <button class="promote-submit-btn" id="promoteSubmitBtn">
                    <i class="fas fa-arrow-right"></i> Promote Selected
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const selectAllCb = modal.querySelector('#promoteSelectAll');
    const getCheckboxes = () => modal.querySelectorAll('.promote-checkbox');

    selectAllCb.addEventListener('change', function () {
        getCheckboxes().forEach(cb => { cb.checked = this.checked; });
    });

    getCheckboxes().forEach(cb => {
        cb.addEventListener('change', () => {
            const all = [...getCheckboxes()];
            const checked = all.filter(c => c.checked).length;
            selectAllCb.checked = checked === all.length;
            selectAllCb.indeterminate = checked > 0 && checked < all.length;
        });
    });

    modal.querySelector('#promoteCancelBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#promoteSubmitBtn').addEventListener('click', () => {
        const targetClassId = modal.querySelector('#promoteTargetClass').value;
        if (!targetClassId) {
            toast('Please select a target class.', 'error');
            return;
        }
        const targetClass = classes.find(c => c.id === targetClassId);
        if (!targetClass) return;

        const selectedIds = [...getCheckboxes()]
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (!selectedIds.length) {
            toast('Please select at least one student.', 'error');
            return;
        }

        if (!confirm(`Promote ${selectedIds.length} student(s) to ${targetClass.name}?`)) return;

        let count = 0;
        selectedIds.forEach(id => {
            const s = students.find(x => x.id === id);
            if (!s) return;
            s.classId = targetClass.id;
            s.className = targetClass.name;
            count++;
        });

        saveAll();
        modal.remove();

        if (activeClassDetailId === classId) {
            renderClassStudents(classId);
            renderClassExamsPage(classId);
        }
        renderClasses();
        renderStudents();
        refreshDashboard();

        toast(`Successfully promoted ${count} student(s) to ${targetClass.name}.`, 'success');
    });
}

function openClassModal(cls) {
    document.getElementById('classModalTitle').textContent = cls ? 'Edit Class' : 'Add Class';
    document.getElementById('classId').value = cls ? cls.id : '';
    document.getElementById('className').value = cls ? cls.name : '';
    document.getElementById('classLevel').value = cls ? (cls.level || '') : '';
    document.getElementById('classSection').value = cls ? (cls.section || '') : '';
    document.getElementById('classCapacity').value = cls ? (cls.capacity || '') : '';
    document.getElementById('classFee').value = cls ? cls.fee : '';
    document.getElementById('classStatus').value = cls ? cls.status : 'Active';

    const tSel = document.getElementById('classTeacher');
    tSel.innerHTML = '<option value="">-- Class Teacher --</option>' +
        staff.map(s => '<option value="' + s.id + '"' + (cls && cls.teacherId === s.id ? ' selected' : '') + '>' + esc(s.name) + ' (' + esc(s.position) + ')</option>').join('');

    document.getElementById('classModal').classList.add('active');
}

function editClass(id) { const c = classes.find(x => x.id === id); if (c) openClassModal(c); }

function saveClass() {
    const id = document.getElementById('classId').value;
    const teacherId = document.getElementById('classTeacher').value;
    const teacher = staff.find(s => s.id === teacherId);

    const data = {
        name: document.getElementById('className').value.trim(),
        level: document.getElementById('classLevel').value.trim(),
        section: document.getElementById('classSection').value.trim(),
        teacherId,
        teacherName: teacher ? teacher.name : '',
        capacity: parseInt(document.getElementById('classCapacity').value) || 0,
        fee: parseFloat(document.getElementById('classFee').value) || 0,
        status: document.getElementById('classStatus').value
    };

    if (!data.name) { toast('Class name is required.', 'error'); return; }

    if (id) {
        const i = classes.findIndex(c => c.id === id);
        classes[i] = Object.assign(classes[i], data);
        students.forEach(s => { if (s.classId === id) s.className = data.name; });
        toast('Class updated.', 'success');
    } else {
        data.id = uid('CL');
        classes.push(data);
        toast('Class added.', 'success');
    }
    saveAll();
    document.getElementById('classModal').classList.remove('active');
    renderClasses();
    refreshDashboard();
}

function deleteClass(id) {
    const cls = classes.find(c => c.id === id);
    if (!cls) return;
    const enrolled = students.filter(s => s.classId === id).length;
    let msg = 'Delete class "' + cls.name + '"?';
    if (enrolled > 0) {
        msg += '\n\n⚠️ This class has ' + enrolled + ' student(s). They will remain in the system but become unassigned.';
    }
    if (!confirm(msg)) return;

    classes = classes.filter(c => c.id !== id);
    students.forEach(s => {
        if (s.classId === id) { s.classId = ''; s.className = 'Unassigned'; }
    });
    saveAll();
    renderClasses();
    refreshDashboard();
    toast('Class deleted.');
}

// ═══════════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════════
function renderSubjects() {
    const tbody = document.getElementById('subjectsTbody');
    if (!tbody) return;

    const q = (document.getElementById('searchSubjects')?.value || '').toLowerCase();

    const list = subjects.filter(s => {
        const mQ = !q || s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
        return mQ;
    });

    setText('subjectCountBadge', list.length);
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#7a8a87;">No subjects found.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(s =>
        '<tr><td><strong>' + esc(s.name) + '</strong></td>' +
        '<td>' + esc(s.code || '—') + '</td>' +
        '<td>' + esc(s.teacherName || '—') + '</td>' +
        '<td><span class="status-pill ' + (s.status === 'Active' ? 'status-active' : 'status-inactive') + '">' + esc(s.status) + '</span></td>' +
        '<td class="action-icons">' +
            '<i class="fas fa-edit" onclick="editSubject(\'' + s.id + '\')"></i>' +
            '<i class="fas fa-trash-alt" onclick="deleteSubject(\'' + s.id + '\')"></i>' +
        '</td></tr>'
    ).join('');
}

function openSubjectModal(sub) {
    document.getElementById('subjectModalTitle').textContent = sub ? 'Edit Subject' : 'Add Subject';
    document.getElementById('subjectId').value = sub ? sub.id : '';
    document.getElementById('subjectName').value = sub ? sub.name : '';
    document.getElementById('subjectCode').value = sub ? (sub.code || '') : '';
    document.getElementById('subjectStatus').value = sub ? sub.status : 'Active';

    const tSel = document.getElementById('subjectTeacher');
    tSel.innerHTML = '<option value="">-- Teacher (optional) --</option>' +
        staff.map(s => '<option value="' + s.id + '"' + (sub && sub.teacherId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('');

    document.getElementById('subjectModal').classList.add('active');
}

function editSubject(id) { const s = subjects.find(x => x.id === id); if (s) openSubjectModal(s); }

function saveSubject() {
    const id = document.getElementById('subjectId').value;
    const teacherId = document.getElementById('subjectTeacher').value;
    const teacher = staff.find(s => s.id === teacherId);

    const data = {
        name: document.getElementById('subjectName').value.trim(),
        code: document.getElementById('subjectCode').value.trim(),
        teacherId: teacherId || '',
        teacherName: teacher ? teacher.name : '',
        status: document.getElementById('subjectStatus').value
    };

    if (!data.name) { toast('Subject name is required.', 'error'); return; }

    if (id) {
        const i = subjects.findIndex(s => s.id === id);
        subjects[i] = Object.assign(subjects[i], data);
        exams.forEach(e => { if (e.subjectId === id) e.subjectName = data.name; });
        toast('Subject updated.', 'success');
    } else {
        data.id = uid('SB');
        subjects.push(data);
        toast('Subject added.', 'success');
    }
    saveAll();
    document.getElementById('subjectModal').classList.remove('active');
    renderSubjects();
}

function deleteSubject(id) {
    if (!confirm('Delete this subject? Related results will also be removed.')) return;
    subjects = subjects.filter(s => s.id !== id);
    grades = grades.filter(g => g.subjectId !== id);
    saveAll();
    renderSubjects();
    toast('Subject deleted.');
}

// ═══════════════════════════════════════════════════════════════
// STAFF
// ═══════════════════════════════════════════════════════════════
function renderStaff() {
    const tbody = document.getElementById('staffTbody');
    if (!tbody) return;

    const depts = [...new Set(staff.map(s => s.department).filter(Boolean))];
    const deptSel = document.getElementById('staffDeptFilter');
    if (deptSel) {
        const cur = deptSel.value;
        deptSel.innerHTML = '<option value="All">All Departments</option>' + depts.map(d => '<option>' + esc(d) + '</option>').join('');
        deptSel.value = cur && [...deptSel.options].some(o => o.value === cur) ? cur : 'All';
    }

    const q = (document.getElementById('searchStaff')?.value || '').toLowerCase();
    const dept = document.getElementById('staffDeptFilter')?.value || 'All';
    const status = document.getElementById('staffStatusFilter')?.value || 'All';

    const list = staff.filter(s => {
        const mQ = !q || s.name.toLowerCase().includes(q) || (s.position || '').toLowerCase().includes(q) || (s.phone || '').includes(q);
        const mD = dept === 'All' || s.department === dept;
        const mS = status === 'All' || s.status === status;
        return mQ && mD && mS;
    });

    const active = staff.filter(s => s.status === 'Active');
    setText('staffMetricTotal', staff.length);
    setText('staffMetricActive', active.length);
    setText('staffMetricDepts', depts.length);
    setText('staffMetricPayroll', money(active.reduce((a, s) => a + (s.salary || 0), 0)));
    setText('staffCountBadge', list.length);

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#7a8a87;">No staff.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(s =>
        '<tr>' +
            '<td>' +
                '<div class="user-avatar-list">' +
                    '<div class="avatar-circle">' + getInitials(s.name) + '</div>' +
                    '<div class="user-details">' +
                        '<span class="user-name">' + esc(s.name) + '</span>' +
                        '<span class="user-sub">ID: ' + esc(s.code) + '</span>' +
                    '</div>' +
                '</div>' +
            '</td>' +
            '<td>' + esc(s.position || '—') + '</td>' +
            '<td><span class="class-badge">' + esc(s.department || '—') + '</span></td>' +
            '<td>' + esc(s.phone || '—') + '</td>' +
            '<td>' + money(s.salary || 0) + '</td>' +
            '<td>' + formatDate(s.joined) + '</td>' +
            '<td><span class="status-pill ' + (s.status === 'Active' ? 'status-active' : 'status-inactive') + '">' + esc(s.status) + '</span></td>' +
            '<td class="action-icons">' +
                '<i class="fas fa-edit" onclick="editStaff(\'' + s.id + '\')"></i>' +
                '<i class="fas fa-trash-alt" onclick="deleteStaff(\'' + s.id + '\')"></i>' +
            '</td></tr>'
    ).join('');
}

function openStaffModal(member) {
    document.getElementById('staffModalTitle').textContent = member ? 'Edit Staff' : 'Add Staff';
    document.getElementById('staffId').value = member ? member.id : '';
    document.getElementById('staffName').value = member ? member.name : '';
    document.getElementById('staffCode').value = member ? member.code : '';
    document.getElementById('staffGender').value = member ? member.gender : 'Male';
    document.getElementById('staffPosition').value = member ? (member.position || '') : '';
    document.getElementById('staffDepartment').value = member ? (member.department || '') : '';
    document.getElementById('staffPhone').value = member ? (member.phone || '') : '';
    document.getElementById('staffEmail').value = member ? (member.email || '') : '';
    document.getElementById('staffSalary').value = member ? (member.salary || '') : '';
    document.getElementById('staffJoined').value = member ? member.joined : today();
    document.getElementById('staffQualification').value = member ? (member.qualification || '') : '';
    document.getElementById('staffStatus').value = member ? member.status : 'Active';
    document.getElementById('staffAddress').value = member ? (member.address || '') : '';
    document.getElementById('staffModal').classList.add('active');
}

function editStaff(id) { const s = staff.find(x => x.id === id); if (s) openStaffModal(s); }

function saveStaff() {
    const id = document.getElementById('staffId').value;
    const data = {
        name: document.getElementById('staffName').value.trim(),
        code: document.getElementById('staffCode').value.trim() || ('STF-' + String(staff.length + 1).padStart(3, '0')),
        gender: document.getElementById('staffGender').value,
        position: document.getElementById('staffPosition').value.trim(),
        department: document.getElementById('staffDepartment').value.trim(),
        phone: document.getElementById('staffPhone').value.trim(),
        email: document.getElementById('staffEmail').value.trim(),
        salary: parseFloat(document.getElementById('staffSalary').value) || 0,
        joined: document.getElementById('staffJoined').value || today(),
        qualification: document.getElementById('staffQualification').value.trim(),
        status: document.getElementById('staffStatus').value,
        address: document.getElementById('staffAddress').value.trim()
    };
    if (!data.name) { toast('Staff name is required.', 'error'); return; }

    if (id) {
        const i = staff.findIndex(s => s.id === id);
        staff[i] = Object.assign(staff[i], data);
        classes.forEach(c => { if (c.teacherId === id) c.teacherName = data.name; });
        subjects.forEach(s => { if (s.teacherId === id) s.teacherName = data.name; });
        staffAttendance.forEach(a => {
            if (a.staffId === id) {
                a.staffName = data.name;
                a.position = data.position;
                a.department = data.department;
            }
        });
        toast('Staff updated.', 'success');
    } else {
        data.id = uid('ST');
        staff.push(data);
        toast('Staff added.', 'success');
    }
    saveAll();
    document.getElementById('staffModal').classList.remove('active');
    renderStaff();
    refreshDashboard();
}

function deleteStaff(id) {
    if (!confirm('Delete this staff member?')) return;
    staff = staff.filter(s => s.id !== id);
    classes.forEach(c => { if (c.teacherId === id) { c.teacherId = ''; c.teacherName = ''; } });
    subjects.forEach(s => { if (s.teacherId === id) { s.teacherId = ''; s.teacherName = ''; } });
    staffAttendance = staffAttendance.filter(a => a.staffId !== id);
    saveAll();
    renderStaff();
    refreshDashboard();
    toast('Staff deleted.');
}

// ═══════════════════════════════════════════════════════════════
// STUDENT ATTENDANCE
// ═══════════════════════════════════════════════════════════════
function renderAttendance() {
    const dateInput = document.getElementById('attendDate');
    if (dateInput && !dateInput.value) dateInput.value = today();

    const classSel = document.getElementById('attendClass');
    if (classSel) {
        const cur = classSel.value;
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        classSel.innerHTML = '<option value="">-- Select Class --</option>' + sortedClasses.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
        classSel.value = cur || '';
    }

    const sumClass = document.getElementById('attendSummaryClass');
    if (sumClass) {
        const cur = sumClass.value;
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        sumClass.innerHTML = '<option value="All">All Classes</option>' + sortedClasses.map(c => '<option>' + esc(c.name) + '</option>').join('');
        sumClass.value = cur || 'All';
    }

    const from = document.getElementById('attendFrom');
    const to = document.getElementById('attendTo');
    if (from && !from.value) from.value = daysAgo(30);
    if (to && !to.value) to.value = today();

    renderAttendanceGrid();
    renderAttendanceSummary();
}

function renderAttendanceGrid() {
    const grid = document.getElementById('attendanceGrid');
    if (!grid) return;
    const date = document.getElementById('attendDate').value || today();
    const classId = document.getElementById('attendClass').value;

    if (!classId) {
        grid.innerHTML = '<div class="list-empty">Select a class to mark attendance.</div>';
        return;
    }
    const list = students.filter(s => s.classId === classId && s.status === 'Active');
    if (!list.length) {
        grid.innerHTML = '<div class="list-empty">No active students in this class.</div>';
        return;
    }

    grid.innerHTML = list.map(s => {
        const rec = attendance.find(a => a.studentId === s.id && a.date === date);
        const st = rec ? rec.status : '';
        return '<div class="attendance-row" data-id="' + s.id + '">' +
            '<div class="attendance-row-name">' + esc(s.name) + ' <span class="subtext">(' + esc(s.code) + ')</span></div>' +
            '<div class="attendance-status-btns">' +
                '<button class="attendance-status-btn present ' + (st === 'Present' ? 'active' : '') + '" data-status="Present">Present</button>' +
                '<button class="attendance-status-btn absent ' + (st === 'Absent' ? 'active' : '') + '" data-status="Absent">Absent</button>' +
                '<button class="attendance-status-btn late ' + (st === 'Late' ? 'active' : '') + '" data-status="Late">Late</button>' +
                '<button class="attendance-status-btn excused ' + (st === 'Excused' ? 'active' : '') + '" data-status="Excused">Excused</button>' +
            '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.attendance-status-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('.attendance-row');
            const studentId = row.dataset.id;
            const status = this.dataset.status;
            row.querySelectorAll('.attendance-status-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            markAttendance(date, classId, studentId, status);
        });
    });
}

function markAttendance(date, classId, studentId, status) {
    const stu = students.find(s => s.id === studentId);
    const cls = classes.find(c => c.id === classId);
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    if (existing) {
        existing.status = status;
    } else {
        attendance.push({
            id: uid('AT'), date,
            studentId, studentName: stu ? stu.name : '',
            classId, className: cls ? cls.name : '',
            status
        });
    }
    saveAll();
}

function markAllPresent() {
    const date = document.getElementById('attendDate').value || today();
    const classId = document.getElementById('attendClass').value;
    if (!classId) { toast('Select a class first.', 'error'); return; }
    students.filter(s => s.classId === classId && s.status === 'Active')
        .forEach(s => markAttendance(date, classId, s.id, 'Present'));
    renderAttendanceGrid();
    toast('All marked present.', 'success');
}

function clearAttendance() {
    const date = document.getElementById('attendDate').value || today();
    const classId = document.getElementById('attendClass').value;
    if (!classId) { toast('Select a class first.', 'error'); return; }
    if (!confirm('Clear attendance for this class on ' + date + '?')) return;
    attendance = attendance.filter(a => !(a.date === date && a.classId === classId));
    saveAll();
    renderAttendanceGrid();
    toast('Attendance cleared.');
}

function renderAttendanceSummary() {
    const tbody = document.getElementById('attendSummaryTbody');
    if (!tbody) return;
    const from = document.getElementById('attendFrom')?.value || '';
    const to = document.getElementById('attendTo')?.value || '';
    const cls = document.getElementById('attendSummaryClass')?.value || 'All';

    const filtered = attendance.filter(a => inRange(a.date, from, to) && (cls === 'All' || a.className === cls));
    const map = {};
    filtered.forEach(a => {
        if (!map[a.studentId]) map[a.studentId] = { name: a.studentName, className: a.className, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
        map[a.studentId].total++;
        const key = (a.status || '').toLowerCase();
        if (key) map[a.studentId][key] = (map[a.studentId][key] || 0) + 1;
    });

    const rows = Object.values(map);
    setText('attendSummaryCount', rows.length);
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#7a8a87;">No records.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const rate = r.total ? (((r.present + r.late) / r.total) * 100).toFixed(1) : '0';
        const color = rate >= 90 ? '#27ae60' : rate >= 75 ? '#2ecc71' : rate >= 60 ? '#f39c12' : '#e74c3c';
        return '<tr><td><strong>' + esc(r.name) + '</strong></td>' +
            '<td>' + esc(r.className) + '</td>' +
            '<td>' + r.total + '</td>' +
            '<td style="color:#27ae60;font-weight:600;">' + (r.present || 0) + '</td>' +
            '<td style="color:#e74c3c;font-weight:600;">' + (r.absent || 0) + '</td>' +
            '<td style="color:#f39c12;font-weight:600;">' + (r.late || 0) + '</td>' +
            '<td style="color:#3498db;font-weight:600;">' + (r.excused || 0) + '</td>' +
            '<td><span class="attendance-pct-badge" style="background:' + color + '22;color:' + color + ';">' + rate + '%</span></td></tr>';
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// STAFF ATTENDANCE
// ═══════════════════════════════════════════════════════════════
function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function renderStaffAttendance() {
    const dateInput = document.getElementById('staffAttendDate');
    if (dateInput && !dateInput.value) dateInput.value = today();

    const depts = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
    const deptSel = document.getElementById('staffAttendDept');
    if (deptSel) {
        const cur = deptSel.value;
        deptSel.innerHTML = '<option value="All">All Departments</option>' + depts.map(d => '<option>' + esc(d) + '</option>').join('');
        deptSel.value = cur && [...deptSel.options].some(o => o.value === cur) ? cur : 'All';
    }
    const sumDeptSel = document.getElementById('staffAttendSummaryDept');
    if (sumDeptSel) {
        const cur = sumDeptSel.value;
        sumDeptSel.innerHTML = '<option value="All">All Departments</option>' + depts.map(d => '<option>' + esc(d) + '</option>').join('');
        sumDeptSel.value = cur && [...sumDeptSel.options].some(o => o.value === cur) ? cur : 'All';
    }

    const from = document.getElementById('staffAttendFrom');
    const to = document.getElementById('staffAttendTo');
    if (from && !from.value) from.value = daysAgo(30);
    if (to && !to.value) to.value = today();

    renderStaffAttendanceGrid();
    renderStaffAttendanceStats();
    renderStaffAttendanceSummary();
}

function renderStaffAttendanceGrid() {
    const grid = document.getElementById('staffAttendanceGrid');
    if (!grid) return;
    const date = document.getElementById('staffAttendDate').value || today();
    const dept = document.getElementById('staffAttendDept').value || 'All';

    const list = staff.filter(s => s.status === 'Active' && (dept === 'All' || s.department === dept));
    if (!list.length) {
        grid.innerHTML = '<div class="list-empty">No active staff found.</div>';
        return;
    }

    grid.innerHTML = list.map(s => {
        const rec = staffAttendance.find(a => a.staffId === s.id && a.date === date) || {};
        const status = rec.status || '';
        const inT = rec.signInTime || '';
        const outT = rec.signOutTime || '';
        const inBadge = inT ? '<span class="staff-att-badge signed-in"><i class="fas fa-sign-in-alt"></i> In: ' + esc(inT) + '</span>' : '';
        const outBadge = outT ? '<span class="staff-att-badge signed-out"><i class="fas fa-sign-out-alt"></i> Out: ' + esc(outT) + '</span>' : '';

        return `
            <div class="staff-att-card" data-staff-id="${s.id}">
                <div class="staff-att-top">
                    <div>
                        <div class="staff-att-name">${esc(s.name)}</div>
                        <div class="staff-att-sub">${esc(s.position || '—')} · ${esc(s.department || '—')} · ${esc(s.code)}</div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        ${inBadge}${outBadge}
                        <div class="staff-att-status-btns">
                            <button class="attendance-status-btn present ${status === 'Present' ? 'active' : ''}" data-status="Present">Present</button>
                            <button class="attendance-status-btn absent ${status === 'Absent' ? 'active' : ''}" data-status="Absent">Absent</button>
                            <button class="attendance-status-btn late ${status === 'Late' ? 'active' : ''}" data-status="Late">Late</button>
                            <button class="attendance-status-btn leave ${status === 'Leave' ? 'active' : ''}" data-status="Leave">Leave</button>
                        </div>
                    </div>
                </div>
                <div class="staff-att-bottom">
                    <div class="staff-att-time">
                        <label>Sign In:</label>
                        <input type="time" class="staff-att-in" value="${inT}" />
                        <button class="staff-att-now-btn" data-action="in">Now</button>
                    </div>
                    <div class="staff-att-time">
                        <label>Sign Out:</label>
                        <input type="time" class="staff-att-out" value="${outT}" />
                        <button class="staff-att-now-btn" data-action="out">Now</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.staff-att-card').forEach(card => {
        const staffId = card.dataset.staffId;
        card.querySelectorAll('.attendance-status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                card.querySelectorAll('.attendance-status-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                setStaffStatus(staffId, status);
                renderStaffAttendanceGrid();
                renderStaffAttendanceStats();
            });
        });
        card.querySelector('.staff-att-in').addEventListener('change', function () {
            setStaffSignIn(staffId, this.value);
            renderStaffAttendanceGrid();
            renderStaffAttendanceStats();
        });
        card.querySelector('.staff-att-out').addEventListener('change', function () {
            setStaffSignOut(staffId, this.value);
            renderStaffAttendanceGrid();
            renderStaffAttendanceStats();
        });
        card.querySelectorAll('.staff-att-now-btn').forEach(b => {
            b.addEventListener('click', () => {
                const action = b.dataset.action;
                const t = nowTime();
                if (action === 'in') {
                    setStaffSignIn(staffId, t);
                    const hasStatus = card.querySelector('.attendance-status-btn.active');
                    if (!hasStatus) setStaffStatus(staffId, 'Present');
                } else {
                    setStaffSignOut(staffId, t);
                }
                renderStaffAttendanceGrid();
                renderStaffAttendanceStats();
            });
        });
    });
}

function getOrCreateStaffAtt(date, staffId) {
    let rec = staffAttendance.find(a => a.staffId === staffId && a.date === date);
    if (!rec) {
        const s = staff.find(x => x.id === staffId);
        rec = {
            id: uid('SA'), date, staffId,
            staffName: s ? s.name : '',
            position: s ? s.position : '',
            department: s ? s.department : '',
            status: '', signInTime: '', signOutTime: '', notes: ''
        };
        staffAttendance.push(rec);
    }
    return rec;
}

function setStaffStatus(staffId, status) {
    const date = document.getElementById('staffAttendDate').value || today();
    const rec = getOrCreateStaffAtt(date, staffId);
    rec.status = status;
    if (status === 'Present' || status === 'Late') {
        if (!rec.signInTime) rec.signInTime = nowTime();
    }
    if (status === 'Absent' || status === 'Leave') {
        rec.signInTime = '';
        rec.signOutTime = '';
    }
    saveAll();
}

function setStaffSignIn(staffId, time) {
    const date = document.getElementById('staffAttendDate').value || today();
    const rec = getOrCreateStaffAtt(date, staffId);
    rec.signInTime = time || '';
    if (time && !rec.status) rec.status = 'Present';
    saveAll();
}

function setStaffSignOut(staffId, time) {
    const date = document.getElementById('staffAttendDate').value || today();
    const rec = getOrCreateStaffAtt(date, staffId);
    rec.signOutTime = time || '';
    saveAll();
}

function renderStaffAttendanceStats() {
    const el = document.getElementById('staffAttendStats');
    if (!el) return;
    const date = document.getElementById('staffAttendDate').value || today();
    const dept = document.getElementById('staffAttendDept').value || 'All';
    const active = staff.filter(s => s.status === 'Active' && (dept === 'All' || s.department === dept));
    const recs = staffAttendance.filter(a => a.date === date && active.some(s => s.id === a.staffId));
    const present = recs.filter(r => r.status === 'Present').length;
    const absent = recs.filter(r => r.status === 'Absent').length;
    const late = recs.filter(r => r.status === 'Late').length;
    const leave = recs.filter(r => r.status === 'Leave').length;
    const signedIn = recs.filter(r => r.signInTime).length;
    const signedOut = recs.filter(r => r.signOutTime).length;

    el.innerHTML = `
        <div class="sa-stat"><div class="sa-stat-label">Total Staff</div><div class="sa-stat-value">${active.length}</div></div>
        <div class="sa-stat"><div class="sa-stat-label">Present</div><div class="sa-stat-value" style="color:#27ae60;">${present}</div></div>
        <div class="sa-stat"><div class="sa-stat-label">Absent</div><div class="sa-stat-value" style="color:#e74c3c;">${absent}</div></div>
        <div class="sa-stat"><div class="sa-stat-label">Late</div><div class="sa-stat-value" style="color:#f39c12;">${late}</div></div>
        <div class="sa-stat"><div class="sa-stat-label">Leave</div><div class="sa-stat-value" style="color:#3498db;">${leave}</div></div>
        <div class="sa-stat"><div class="sa-stat-label">Signed In</div><div class="sa-stat-value" style="color:#065f46;">${signedIn}</div></div>
        <div class="sa-stat"><div class="sa-stat-label">Signed Out</div><div class="sa-stat-value" style="color:#1e40af;">${signedOut}</div></div>
    `;
}

function markAllStaffPresent() {
    const date = document.getElementById('staffAttendDate').value || today();
    const dept = document.getElementById('staffAttendDept').value || 'All';
    const t = nowTime();
    staff.filter(s => s.status === 'Active' && (dept === 'All' || s.department === dept)).forEach(s => {
        const rec = getOrCreateStaffAtt(date, s.id);
        rec.status = 'Present';
        if (!rec.signInTime) rec.signInTime = t;
    });
    saveAll();
    renderStaffAttendanceGrid();
    renderStaffAttendanceStats();
    toast('All staff marked present & signed in.', 'success');
}

function signInAllStaff() {
    const date = document.getElementById('staffAttendDate').value || today();
    const dept = document.getElementById('staffAttendDept').value || 'All';
    const t = nowTime();
    staff.filter(s => s.status === 'Active' && (dept === 'All' || s.department === dept)).forEach(s => {
        const rec = getOrCreateStaffAtt(date, s.id);
        rec.signInTime = t;
        if (!rec.status) rec.status = 'Present';
    });
    saveAll();
    renderStaffAttendanceGrid();
    renderStaffAttendanceStats();
    toast('All staff signed in at ' + t + '.', 'success');
}

function signOutAllStaff() {
    const date = document.getElementById('staffAttendDate').value || today();
    const dept = document.getElementById('staffAttendDept').value || 'All';
    const t = nowTime();
    staff.filter(s => s.status === 'Active' && (dept === 'All' || s.department === dept)).forEach(s => {
        const rec = getOrCreateStaffAtt(date, s.id);
        rec.signOutTime = t;
    });
    saveAll();
    renderStaffAttendanceGrid();
    renderStaffAttendanceStats();
    toast('All staff signed out at ' + t + '.', 'success');
}

function clearStaffAttendance() {
    const date = document.getElementById('staffAttendDate').value || today();
    if (!confirm('Clear staff attendance for ' + date + '?')) return;
    staffAttendance = staffAttendance.filter(a => a.date !== date);
    saveAll();
    renderStaffAttendanceGrid();
    renderStaffAttendanceStats();
    toast('Staff attendance cleared.');
}

function renderStaffAttendanceSummary() {
    const tbody = document.getElementById('staffAttendSummaryTbody');
    if (!tbody) return;
    const from = document.getElementById('staffAttendFrom')?.value || '';
    const to = document.getElementById('staffAttendTo')?.value || '';
    const dept = document.getElementById('staffAttendSummaryDept')?.value || 'All';

    const filtered = staffAttendance.filter(a =>
        inRange(a.date, from, to) && (dept === 'All' || a.department === dept)
    );
    const map = {};
    filtered.forEach(a => {
        if (!map[a.staffId]) map[a.staffId] = {
            name: a.staffName, position: a.position, department: a.department,
            present: 0, absent: 0, late: 0, leave: 0, total: 0
        };
        if (!a.status) return;
        map[a.staffId].total++;
        const key = a.status.toLowerCase();
        map[a.staffId][key] = (map[a.staffId][key] || 0) + 1;
    });

    const rows = Object.values(map);
    setText('staffAttendSummaryCount', rows.length);
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#7a8a87;">No records.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const rate = r.total ? (((r.present + r.late) / r.total) * 100).toFixed(1) : '0';
        const color = rate >= 90 ? '#27ae60' : rate >= 75 ? '#2ecc71' : rate >= 60 ? '#f39c12' : '#e74c3c';
        return '<tr><td><strong>' + esc(r.name) + '</strong></td>' +
            '<td>' + esc(r.position || '—') + '</td>' +
            '<td>' + esc(r.department || '—') + '</td>' +
            '<td>' + r.total + '</td>' +
            '<td style="color:#27ae60;font-weight:600;">' + (r.present || 0) + '</td>' +
            '<td style="color:#e74c3c;font-weight:600;">' + (r.absent || 0) + '</td>' +
            '<td style="color:#f39c12;font-weight:600;">' + (r.late || 0) + '</td>' +
            '<td style="color:#3498db;font-weight:600;">' + (r.leave || 0) + '</td>' +
            '<td><span class="attendance-pct-badge" style="background:' + color + '22;color:' + color + ';">' + rate + '%</span></td></tr>';
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// EXAMS — GROUPED VIEW
// ═══════════════════════════════════════════════════════════════
function renderExams() {
    const container = document.getElementById('examsGroupedView');
    if (!container) return;

    const total = exams.length;
    const completed = exams.filter(e => examDisplayStatus(e) === 'Completed').length;
    const upcoming = exams.filter(e => examDisplayStatus(e) === 'Upcoming').length;
    const allPercents = grades.map(g => Number(g.percent)).filter(n => !isNaN(n));
    const avgScore = allPercents.length
        ? (allPercents.reduce((a, x) => a + x, 0) / allPercents.length).toFixed(1)
        : '0';

    setText('examMetricTotal', total);
    setText('examMetricCompleted', completed);
    setText('examMetricUpcoming', upcoming);
    setText('examMetricAvg', avgScore + '%');
    setText('examCountBadge', total);

    if (!exams.length) {
        container.innerHTML = '<div class="exams-empty">No exams yet. Click <strong>Create Exam</strong> to get started.</div>';
        return;
    }

    const grouping = {};
    exams.forEach(e => {
        let level = 'Unassigned';
        let className = 'Unassigned';
        
        if (e.classId) {
            const cls = classes.find(c => c.id === e.classId);
            if (cls) {
                level = cls.level || 'Unassigned';
                className = cls.name;
            }
        } else {
            const firstGrade = grades.find(g => g.examId === e.id);
            if (firstGrade) {
                const cls = classes.find(c => c.id === firstGrade.classId);
                if (cls) {
                    level = cls.level || 'Unassigned';
                    className = cls.name;
                }
            }
        }
        
        if (!grouping[level]) grouping[level] = {};
        if (!grouping[level][className]) grouping[level][className] = [];
        if (!grouping[level][className].some(x => x.id === e.id)) {
            grouping[level][className].push(e);
        }
    });

    if (!Object.keys(grouping).length) {
        container.innerHTML = '<div class="exams-empty">No exams with assigned classes yet.</div>';
        return;
    }

    const sortedLevels = Object.keys(grouping).sort((a, b) =>
        levelOrderRank(a) - levelOrderRank(b) || a.localeCompare(b)
    );

    container.innerHTML = sortedLevels.map(level => {
        const classMap = grouping[level];
        const levelExamCount = new Set(
            Object.values(classMap).flat().map(e => e.id)
        ).size;

        const classBlocks = Object.keys(classMap).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        ).map(className => {
            const list = classMap[className];
            const completedCount = list.filter(e => examDisplayStatus(e) === 'Completed').length;
            const statusText = completedCount === list.length
                ? `${list.length} COMPLETED`
                : `${completedCount} / ${list.length} COMPLETED`;

            return `
                <div class="exam-class-block">
                    <div class="exam-class-header">
                        <div class="exam-class-title">
                            <i class="fas fa-book"></i> ${esc(className)}
                        </div>
                        <span class="exam-class-status">${statusText}</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="exam-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Subject</th>
                                    <th>Term</th>
                                    <th>Date</th>
                                    <th>Max Score</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${list.map(e => renderExamTableRow(e, className)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="exam-level-group">
                <div class="exam-level-header" onclick="toggleExamLevelGroup(this)">
                    <i class="fas fa-layer-group"></i>
                    <span class="exam-level-name">${esc(level)}</span>
                    <span class="exam-level-count">${levelExamCount} exam${levelExamCount === 1 ? '' : 's'}</span>
                    <i class="fas fa-chevron-down exam-level-chevron"></i>
                </div>
                <div class="exam-level-body">${classBlocks}</div>
            </div>
        `;
    }).join('');
}

function renderExamTableRow(exam, className) {
    const cls = classes.find(c => c.name === className);
    const classId = cls ? cls.id : '';

    const subjectsHTML = exam.subjectName 
        ? `<span class="ex-subject-pill">${esc(exam.subjectName)}</span>` 
        : '<span class="ex-subject-pill" style="background:#f3f4f6;color:#6b7280;">—</span>';

    const classGrades = grades.filter(g => g.examId === exam.id && g.className === className);
    const gradeCount = classGrades.length;
    const displayStatus = examDisplayStatus(exam);
    const statusLower = String(displayStatus || '').toLowerCase();
    const statusClass = statusLower === 'completed' ? 'completed'
                       : statusLower === 'ongoing'  ? 'ongoing'
                       : 'upcoming';

    // 🟢 FIX: Fallback to exam's subjectId first
    const firstSub = exam.subjectId || classGrades.find(g => g.subjectId)?.subjectId || '';
    const maxScore = exam.max || 100;

    return `
        <tr>
            <td class="ex-name">${esc(exam.name)}</td>
            <td>${subjectsHTML}</td>
            <td>${esc(exam.term || '—')}</td>
            <td>${formatDate(exam.start)}</td>
            <td>${maxScore}</td>
            <td>
                <div class="ex-status">
                    <span class="ex-status-pill ${statusClass}">${esc(displayStatus)}</span>
                    <span class="ex-grades-count">${gradeCount} grade${gradeCount === 1 ? '' : 's'}</span>
                </div>
            </td>
            <td>
                <div class="ex-actions">
                    <i class="fas fa-pen" onclick="editExam('${exam.id}')" title="Edit"></i>
                    <i class="fas fa-clipboard-list" onclick="gradeExamFromClass('${exam.id}', '${classId}', '${firstSub}')" title="Grades"></i>
                    <i class="fas fa-chart-bar" onclick="viewExamReportFromClass('${exam.id}', '${classId}')" title="Report"></i>
                    <i class="fas fa-trash-alt" onclick="deleteExam('${exam.id}')" title="Delete"></i>
                </div>
            </td>
        </tr>
    `;
}

function toggleExamLevelGroup(header) {
    const group = header.closest('.exam-level-group');
    if (group) group.classList.toggle('collapsed');
}

function openExamModal(exam) {
    document.getElementById('examModalTitle').textContent = exam ? 'Edit Exam' : 'Add Exam';
    document.getElementById('examId').value = exam ? exam.id : '';
    document.getElementById('examName').value = exam ? exam.name : '';
    document.getElementById('examTerm').value = exam ? exam.term : settings.term;
    document.getElementById('examYear').value = exam ? exam.year : settings.academicYear;
    document.getElementById('examStart').value = exam ? exam.start : today();
    document.getElementById('examMax').value = exam ? (exam.max || 100) : 100;
    document.getElementById('examStatus').value = exam ? exam.status : 'Upcoming';
    
    const classSel = document.getElementById('examClass');
    const sortedClasses = classes.slice().sort((a, b) =>
        levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
    );
    classSel.innerHTML = '<option value="">-- Select Class --</option>' + 
        sortedClasses.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
    classSel.value = exam ? (exam.classId || '') : '';
    
    updateExamSubjectOptions(classSel.value, exam ? (exam.subjectId || '') : '');
    
    document.getElementById('examModal').classList.add('active');
}

function updateExamSubjectOptions(classId, selectedSubjectId) {
    const subSel = document.getElementById('examSubject');
    if (!subSel) return;
    const list = subjects.filter(s => s.status === 'Active');
    subSel.innerHTML = '<option value="">-- Select Subject --</option>' + 
        list.map(s => '<option value="' + s.id + '">' + esc(s.name) + '</option>').join('');
    if (selectedSubjectId) {
        subSel.value = selectedSubjectId;
    }
}

function editExam(id) { const e = exams.find(x => x.id === id); if (e) openExamModal(e); }

function saveExam() {
    const id = document.getElementById('examId').value;
    const classId = document.getElementById('examClass').value;
    const subjectId = document.getElementById('examSubject').value;
    const cls = classes.find(c => c.id === classId);
    const sub = subjects.find(s => s.id === subjectId);

    const data = {
        name: document.getElementById('examName').value.trim(),
        classId: classId || '',
        className: cls ? cls.name : '',
        subjectId: subjectId || '',
        subjectName: sub ? sub.name : '',
        term: document.getElementById('examTerm').value,
        year: document.getElementById('examYear').value.trim(),
        start: document.getElementById('examStart').value,
        end: document.getElementById('examStart').value,
        max: parseFloat(document.getElementById('examMax').value) || 100,
        status: document.getElementById('examStatus').value
    };
    if (!data.name) { toast('Exam name is required.', 'error'); return; }
    if (!data.classId) { toast('Please select a class.', 'error'); return; }
    if (!data.subjectId) { toast('Please select a subject.', 'error'); return; }

    if (id) {
        const i = exams.findIndex(e => e.id === id);
        exams[i] = Object.assign(exams[i], data);
        grades.forEach(g => { if (g.examId === id) g.examName = data.name; });
        toast('Exam updated.', 'success');
    } else {
        data.id = uid('EX');
        exams.push(data);
        toast('Exam added.', 'success');
    }
    saveAll();
    document.getElementById('examModal').classList.remove('active');
    renderExams();
    if (activeClassDetailId) {
        renderClassExamsPage(activeClassDetailId);
    }
}

function deleteExam(id) {
    if (!confirm('Delete this exam? All related results will also be removed.')) return;
    exams = exams.filter(e => e.id !== id);
    grades = grades.filter(g => g.examId !== id);
    saveAll();
    renderExams();
    if (activeClassDetailId) renderClassExamsPage(activeClassDetailId);
    toast('Exam deleted.');
}

// ═══════════════════════════════════════════════════════════════
// RESULTS / GRADES
// ═══════════════════════════════════════════════════════════════
function renderResults() {
    const examSel = document.getElementById('resExam');
    if (examSel) {
        const cur = examSel.value;
        examSel.innerHTML = '<option value="">-- Exam --</option>' + exams.map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('');
        examSel.value = cur || '';
    }
    const classSel = document.getElementById('resClass');
    if (classSel) {
        const cur = classSel.value;
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        classSel.innerHTML = '<option value="">-- Class --</option>' + sortedClasses.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
        classSel.value = cur || '';
    }
    updateResSubjectOptions();

    const filterSel = document.getElementById('gradeExamFilter');
    if (filterSel) {
        const cur = filterSel.value;
        filterSel.innerHTML = '<option value="All">All Exams</option>' + exams.map(e => '<option>' + esc(e.name) + '</option>').join('');
        filterSel.value = cur && [...filterSel.options].some(o => o.value === cur) ? cur : 'All';
    }
    renderGradesTable();
}

function updateResSubjectOptions() {
    const sel = document.getElementById('resSubject');
    if (!sel) return;
    const cur = sel.value;
    const list = subjects.filter(s => s.status === 'Active');
    sel.innerHTML = '<option value="">-- Subject --</option>' + list.map(s => '<option value="' + s.id + '">' + esc(s.name) + '</option>').join('');
    sel.value = cur && [...sel.options].some(o => o.value === cur) ? cur : '';
}

function loadResultStudents() {
    const examId = document.getElementById('resExam').value;
    const classId = document.getElementById('resClass').value;
    const subjectId = document.getElementById('resSubject').value;
    const max = parseFloat(document.getElementById('resMax').value) || 100;
    const area = document.getElementById('resultEntryArea');
    const saveBar = document.getElementById('resultSaveBar');

    if (!examId || !classId || !subjectId) {
        toast('Select an exam, class and subject.', 'error');
        return;
    }
    if (max <= 0) {
        toast('Maximum score must be greater than zero.', 'error');
        return;
    }
    const list = students.filter(s => s.classId === classId && s.status === 'Active');
    if (!list.length) {
        area.innerHTML = '<div class="list-empty">No active students in this class.</div>';
        saveBar.style.display = 'none';
        return;
    }

    pendingResultScores = { examId, classId, subjectId, max };

    area.innerHTML = '<div class="table-wrapper"><table><thead><tr><th>Student</th><th>Student ID</th><th style="width:130px;">Score (max ' + max + ')</th></tr></thead><tbody>' +
        list.map(s => {
            const existing = grades.find(g => g.examId === examId && g.subjectId === subjectId && g.studentId === s.id);
            const val = existing ? existing.score : '';
            return '<tr><td><strong>' + esc(s.name) + '</strong></td>' +
                '<td>' + esc(s.code) + '</td>' +
                '<td><input type="number" class="score-input" data-student="' + s.id + '" value="' + val + '" min="0" max="' + max + '" step="0.5" /></td></tr>';
        }).join('') + '</tbody></table></div>';
    saveBar.style.display = 'block';
}

function saveResults() {
    if (!pendingResultScores) return;
    const { examId, classId, subjectId, max } = pendingResultScores;
    if (max <= 0) { toast('Invalid maximum score.', 'error'); return; }
    const exam = exams.find(e => e.id === examId);
    const cls = classes.find(c => c.id === classId);
    const sub = subjects.find(s => s.id === subjectId);

    let saved = 0, skipped = 0;
    document.querySelectorAll('#resultEntryArea .score-input').forEach(inp => {
        const studentId = inp.dataset.student;
        const raw = inp.value.trim();
        if (raw === '') return;
        const score = clampScore(raw, max);
        if (score === null) { skipped++; return; }

        const stu = students.find(s => s.id === studentId);
        const percent = max > 0 ? (score / max) * 100 : 0;
        const g = calcGrade(percent);

        const existing = grades.find(x => x.examId === examId && x.subjectId === subjectId && x.studentId === studentId);
        const payload = {
            examId, examName: exam ? exam.name : '',
            studentId, studentName: stu ? stu.name : '',
            classId, className: cls ? cls.name : '',
            subjectId, subjectName: sub ? sub.name : '',
            score, max,
            percent: percent.toFixed(1),
            grade: g.grade, remarks: g.remark
        };
        if (existing) {
            Object.assign(existing, payload);
        } else {
            payload.id = uid('GR');
            grades.push(payload);
        }
        saved++;
    });

    saveAll();
    renderGradesTable();
    if (saved) toast('Saved ' + saved + ' result' + (saved === 1 ? '' : 's') + (skipped ? '. ' + skipped + ' out-of-range skipped.' : '.'), 'success');
    else if (skipped) toast('No valid scores to save (out of range).', 'error');
}

function renderGradesTable() {
    const tbody = document.getElementById('gradesTbody');
    if (!tbody) return;
    const q = (document.getElementById('searchGrades')?.value || '').toLowerCase();
    const examF = document.getElementById('gradeExamFilter')?.value || 'All';

    const list = grades.filter(g => {
        const mQ = !q || (g.studentName || '').toLowerCase().includes(q) ||
            (g.subjectName || '').toLowerCase().includes(q) || (g.examName || '').toLowerCase().includes(q);
        const mE = examF === 'All' || g.examName === examF;
        return mQ && mE;
    }).sort((a, b) => (b.percent - a.percent));

    setText('gradeCountBadge', list.length);
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#7a8a87;">No results recorded.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(g =>
        '<tr><td>' + esc(g.examName) + '</td>' +
        '<td><strong>' + esc(g.studentName) + '</strong></td>' +
        '<td><span class="class-badge">' + esc(g.className) + '</span></td>' +
        '<td>' + esc(g.subjectName) + '</td>' +
        '<td>' + num(g.score) + ' / ' + num(g.max) + '</td>' +
        '<td><strong>' + g.percent + '%</strong></td>' +
        '<td><span class="grade-badge grade-' + esc(g.grade) + '">' + esc(g.grade) + '</span></td>' +
        '<td>' + esc(g.remarks || '—') + '</td>' +
        '<td class="action-icons"><i class="fas fa-trash-alt" onclick="deleteGrade(\'' + g.id + '\')"></i></td></tr>'
    ).join('');
}

function deleteGrade(id) {
    if (!confirm('Delete this result?')) return;
    grades = grades.filter(g => g.id !== id);
    saveAll();
    renderGradesTable();
    toast('Result deleted.');
}

// ═══════════════════════════════════════════════════════════════
// FEE COLLECTION
// ═══════════════════════════════════════════════════════════════
function renderFees() {
    const classSel = document.getElementById('feeClassFilter');
    if (classSel) {
        const cur = classSel.value;
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        classSel.innerHTML = '<option value="All">All Classes</option>' + sortedClasses.map(c => '<option>' + esc(c.name) + '</option>').join('');
        classSel.value = cur && [...classSel.options].some(o => o.value === cur) ? cur : 'All';
    }
    renderFeeGrid();
    renderFeePanel();
}

function renderFeeGrid() {
    const grid = document.getElementById('feeGrid');
    if (!grid) return;
    const q = (document.getElementById('feeSearch')?.value || '').toLowerCase();
    const cls = document.getElementById('feeClassFilter')?.value || 'All';

    const list = students.filter(s => {
        const mQ = !q || s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
        const mC = cls === 'All' || s.className === cls;
        return mQ && mC && s.status === 'Active';
    }).sort((a, b) => studentBalance(b) - studentBalance(a));

    if (!list.length) {
        grid.innerHTML = '<div class="list-empty" style="padding:30px 0;text-align:center;">No students found.</div>';
        return;
    }

    grid.innerHTML = list.map(s => {
        const total = studentTotalExpected(s);
        const paid = studentPaid(s.id);
        const bal = total - paid;
        const overall = studentFeeStatus(s);
        const sel = selectedFeeStudentId === s.id ? ' selected' : '';
        const statusCls = overall === 'paid' ? 'paid' : overall === 'partial' ? 'partial' : 'pending';

        return `
            <div class="fee-card${sel}" onclick="selectFeeStudent('${s.id}')">
                <div class="fc-info">
                    <div class="user-avatar-list">
                        <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 0.9rem;">${getInitials(s.name)}</div>
                        <div class="fc-text">
                            <div class="fc-name">${esc(s.name)}</div>
                            <div class="fc-id">${esc(s.className)} · ${esc(s.code)}</div>
                        </div>
                    </div>
                </div>
                <div class="fc-right">
                    <div class="fc-mini-label">${bal > 0 ? 'Balance' : 'Status'}</div>
                    <div class="fc-balance-mini ${bal <= 0 ? 'cleared' : ''}">
                        ${bal > 0 ? money(bal) : 'Paid ✓'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function selectFeeStudent(id) {
    selectedFeeStudentId = id;
    renderFeeGrid();
    renderFeePanel();
}

function renderFeePanel() {
    const panel = document.getElementById('feePanel');
    if (!panel) return;

    if (!selectedFeeStudentId) {
        panel.innerHTML = '<h3>Select a Student</h3>' +
            '<p class="fr-sub">Choose a student from the list to record a fee payment.</p>' +
            '<div class="list-empty" style="padding:40px 0;"><i class="fas fa-hand-pointer" style="font-size:2rem;display:block;margin-bottom:12px;color:#cfe0dd;"></i>No student selected</div>';
        return;
    }

    const s = students.find(x => x.id === selectedFeeStudentId);
    if (!s) { selectedFeeStudentId = null; renderFeePanel(); return; }

    const struct = getStudentFeeStructure(s);
    const totalExpected = studentTotalExpected(s);
    const totalPaid = studentPaid(s.id);
    const totalBal = totalExpected - totalPaid;

    const breakdownRows = struct.map(f => {
        const paid = studentPaidByType(s.id, f.type);
        const bal = f.expected - paid;
        const status = feeTypeStatus(s.id, f.type, f.expected);
        const icon = status === 'paid'
            ? '<i class="fas fa-check-circle bd-check" title="Fully paid"></i>'
            : status === 'partial'
                ? '<span class="bd-check" style="color:#f39c12;" title="Partially paid">◐</span>'
                : '<span class="bd-check" style="color:#e74c3c;" title="Not paid yet">○</span>';
        return `
            <tr>
                <td>${esc(f.type)} ${icon}</td>
                <td>${money(f.expected)}</td>
                <td class="bd-paid">${money(paid)}</td>
                <td class="bd-bal ${bal <= 0 ? 'cleared' : ''}">${money(Math.max(0, bal))}</td>
            </tr>
        `;
    }).join('');

    const history = payments
        .filter(p => p.studentId === s.id)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">' +
            '<div style="flex:1;min-width:0;">' +
                '<h3 style="margin-bottom:2px;">' + esc(s.name) + '</h3>' +
                '<p class="fr-sub" style="margin-bottom:0;">' + esc(s.className) + ' · ' + esc(s.code) +
                ' · Guardian: ' + esc(s.guardian || '—') + '</p>' +
            '</div>' +
            '<button id="editFeeStructBtn" title="Edit expected fees for each type" ' +
                'style="background:#7c3aed;color:#fff;border:none;border-radius:9px;padding:8px 14px;font-family:inherit;font-size:0.78rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">' +
                '<i class="fas fa-pen"></i> Edit Fees' +
            '</button>' +
        '</div>' +

        '<table class="fee-breakdown-table">' +
            '<thead><tr><th>Fee Type</th><th>Expected</th><th>Paid</th><th>Balance</th></tr></thead>' +
            '<tbody>' +
                breakdownRows +
                '<tr>' +
                    '<td>TOTAL</td>' +
                    '<td>' + money(totalExpected) + '</td>' +
                    '<td class="bd-paid">' + money(totalPaid) + '</td>' +
                    '<td class="bd-bal ' + (totalBal <= 0 ? 'cleared' : '') + '">' + money(Math.max(0, totalBal)) + '</td>' +
                '</tr>' +
            '</tbody>' +
        '</table>' +

        '<div class="fee-form">' +
            '<label>Fee Type</label>' +
            '<select id="feeType">' +
                struct.map(f => {
                    const paid = studentPaidByType(s.id, f.type);
                    const bal = Math.max(0, f.expected - paid);
                    const tag = f.expected === 0
                        ? ' — set expected first'
                        : bal <= 0 ? ' (Paid ✓)' : ' — bal ' + money(bal);
                    return '<option value="' + esc(f.type) + '">' + esc(f.type) + tag + '</option>';
                }).join('') +
                '<option value="__custom">-- Other / Custom Fee Type --</option>' +
            '</select>' +
            '<input type="text" id="feeTypeCustom" list="feeTypeList" placeholder="Custom fee type" style="display:none;margin-top:8px;" />' +
            '<datalist id="feeTypeList">' +
                ['Tuition','Feeding','Transport','Uniform','Books & Stationery','Exam Fee','Development Levy','PTA Dues','Sports Fee','Maintenance','Other']
                    .map(t => '<option value="' + t + '">').join('') +
            '</datalist>' +
            '<label>Amount</label>' +
            '<input type="number" id="feeAmount" step="0.01" min="0" placeholder="0.00" />' +
            '<label>Date</label>' +
            '<input type="date" id="feeDate" value="' + today() + '" />' +
            '<label>Term</label>' +
            '<select id="feeTerm">' +
                '<option' + ((selectedFeeTerm || settings.term) === 'First Term' ? ' selected' : '') + '>First Term</option>' +
                '<option' + ((selectedFeeTerm || settings.term) === 'Second Term' ? ' selected' : '') + '>Second Term</option>' +
                '<option' + ((selectedFeeTerm || settings.term) === 'Third Term' ? ' selected' : '') + '>Third Term</option>' +
            '</select>' +
            '<label>Payment Method</label>' +
            '<select id="feeMethod">' +
                '<option>Cash</option><option>Bank Transfer</option><option>Mobile Money</option><option>Cheque</option><option>Card</option>' +
            '</select>' +
            '<button class="btn-save pos-complete" id="recordFeeBtn" style="width:100%;margin-top:16px;background:#27ae60;padding:13px;">' +
                '<i class="fas fa-check-circle"></i> Record Payment' +
            '</button>' +
        '</div>' +

        '<div class="fee-history">' +
            '<h4><i class="fas fa-clock-rotate-left"></i> Payment History (' + history.length + ')</h4>' +
            (history.length ? history.slice(0, 8).map(p =>
                '<div class="fee-history-item"><div>' +
                    '<div>' + formatDate(p.date) + ' · <strong>' + esc(p.feeType || 'Payment') + '</strong></div>' +
                    '<div class="fhi-sub">' + esc(p.receipt) + ' · ' + esc(p.method) + '</div>' +
                '</div><div class="fhi-amt">' + money(p.amount) + '</div></div>'
            ).join('') : '<div class="list-empty">No payments yet.</div>') +
        '</div>';

    document.getElementById('editFeeStructBtn').addEventListener('click', () => {
        openStudentModal(s);
    });

    const typeSel = document.getElementById('feeType');
    const customInp = document.getElementById('feeTypeCustom');
    const amountInp = document.getElementById('feeAmount');

    function refreshAmount() {
        const t = typeSel.value === '__custom' ? '' : typeSel.value;
        customInp.style.display = typeSel.value === '__custom' ? 'block' : 'none';
        
        amountInp.value = ''; 
    }
    refreshAmount();

    typeSel.addEventListener('change', refreshAmount);
    
    document.getElementById('feeTerm').addEventListener('change', function() {
        selectedFeeTerm = this.value;
    });

    document.getElementById('recordFeeBtn').addEventListener('click', () => recordFeePayment(s.id));
}

function recordFeePayment(studentId) {
    const s = students.find(x => x.id === studentId);
    if (!s) return;

    const typeSel = document.getElementById('feeType');
    let feeType = typeSel.value;
    if (feeType === '__custom') {
        feeType = (document.getElementById('feeTypeCustom').value || '').trim() || 'Other';
    }
    const amount = parseFloat(document.getElementById('feeAmount').value);
    const date = document.getElementById('feeDate').value || today();
    const term = document.getElementById('feeTerm').value;
    const method = document.getElementById('feeMethod').value;

    if (isNaN(amount) || amount <= 0) { toast('Enter a valid amount.', 'error'); return; }
    if (!feeType) { toast('Select or enter a fee type.', 'error'); return; }

    const struct = getStudentFeeStructure(s);
    const known = struct.find(x => x.type === feeType);
    if (known && known.expected > 0) {
        const paidSoFar = studentPaidByType(s.id, feeType);
        const remaining = known.expected - paidSoFar;
        if (amount > remaining && remaining >= 0) {
            if (!confirm('This payment (' + money(amount) + ') exceeds the remaining balance for ' + feeType + ' (' + money(remaining) + ').\n\nContinue anyway?')) return;
        }
    }

    const payment = {
        id: uid('PY'),
        receipt: 'RCP-' + String(2001 + payments.length),
        date,
        studentId: s.id,
        studentName: s.name,
        classId: s.classId,
        className: s.className,
        feeType,
        term, amount, method,
        receivedBy: currentUser ? currentUser.name : 'System'
    };
    payments.push(payment);
    saveAll();
    showReceipt(payment);
    renderFeeGrid();
    renderFeePanel();
    refreshDashboard();
    toast('Payment recorded — ' + payment.receipt, 'success');
}

function showReceipt(payment) {
    const box = document.getElementById('receiptContent');
    if (!box) return;
    const s = students.find(x => x.id === payment.studentId);
    const total = s ? studentTotalExpected(s) : 0;
    const paid = s ? studentPaid(s.id) : 0;
    const bal = total - paid;

    box.innerHTML =
        '<div class="receipt-header">' +
            (settings.logo ? '<img src="' + settings.logo + '" alt="logo" style="width: 85px; height: 85px; border-radius: 50%; object-fit: cover; background: #ffffff; padding: 5px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin: 0 auto 12px; display: block;">' : '') +
            '<div class="r-name">' + esc(settings.name) + '</div>' +
            (settings.motto ? '<div class="r-motto">' + esc(settings.motto) + '</div>' : '') +
            '<div class="r-info">' + esc(settings.address || '') + '</div>' +
            '<div class="r-info">' + esc(settings.phone || '') + ' · ' + esc(settings.email || '') + '</div>' +
        '</div>' +
        '<div class="receipt-divider"></div>' +
        '<div style="text-align:center;font-weight:800;font-size:0.95rem;margin-bottom:6px;">FEE PAYMENT RECEIPT</div>' +
        '<div class="receipt-line"><span>Receipt No:</span><span>' + esc(payment.receipt) + '</span></div>' +
        '<div class="receipt-line"><span>Date:</span><span>' + formatDate(payment.date) + '</span></div>' +
        '<div class="receipt-line"><span>Term:</span><span>' + esc(payment.term) + '</span></div>' +
        '<div class="receipt-line"><span>Academic Year:</span><span>' + esc(settings.academicYear) + '</span></div>' +
        '<div class="receipt-divider"></div>' +
        '<div class="receipt-line"><span>Student:</span><span>' + esc(payment.studentName) + '</span></div>' +
        '<div class="receipt-line"><span>Student ID:</span><span>' + esc(s ? s.code : '—') + '</span></div>' +
        '<div class="receipt-line"><span>Class:</span><span>' + esc(payment.className) + '</span></div>' +
        (s && s.guardian ? '<div class="receipt-line"><span>Guardian:</span><span>' + esc(s.guardian) + '</span></div>' : '') +
        '<div class="receipt-divider"></div>' +
        '<div class="receipt-line bold"><span>FEE TYPE</span><span>' + esc(payment.feeType || 'Payment') + '</span></div>' +
        '<div class="receipt-line bold"><span>AMOUNT PAID</span><span>' + money(payment.amount) + '</span></div>' +
        '<div class="receipt-line"><span>Method</span><span>' + esc(payment.method) + '</span></div>' +
        '<div class="receipt-line"><span>Total Expected</span><span>' + money(total) + '</span></div>' +
        '<div class="receipt-line"><span>Total Paid</span><span>' + money(paid) + '</span></div>' +
        '<div class="receipt-line bold"><span>Balance Due</span><span>' + money(Math.max(0, bal)) + '</span></div>' +
        '<div class="receipt-divider"></div>' +
        '<div class="receipt-line"><span>Received By:</span><span>' + esc(payment.receivedBy) + '</span></div>' +
        '<div class="receipt-footer">' + esc(settings.receiptFooter || 'Thank you!') + '</div>';

    document.getElementById('receiptModal').classList.add('active');
}

// ═══════════════════════════════════════════════════════════════
// FEE RECORDS
// ═══════════════════════════════════════════════════════════════
function renderPayments() {
    const tbody = document.getElementById('paymentsTbody');
    if (!tbody) return;
    const q = (document.getElementById('searchPayments')?.value || '').toLowerCase();
    const method = document.getElementById('paymentMethodFilter')?.value || 'All';

    const list = payments.filter(p => {
        const mQ = !q || (p.receipt || '').toLowerCase().includes(q) || (p.studentName || '').toLowerCase().includes(q) ||
            (p.receivedBy || '').toLowerCase().includes(q) || (p.feeType || '').toLowerCase().includes(q);
        const mM = method === 'All' || p.method === method;
        return mQ && mM;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const t = today(), month = t.slice(0, 7);
    setText('payMetricTotal', money(payments.reduce((a, p) => a + p.amount, 0)));
    setText('payMetricCount', payments.length);
    setText('payMetricMonth', money(payments.filter(p => (p.date || '').slice(0, 7) === month).reduce((a, p) => a + p.amount, 0)));
    setText('payMetricToday', money(payments.filter(p => p.date === t).reduce((a, p) => a + p.amount, 0)));
    setText('paymentCountBadge', list.length);

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#7a8a87;">No fee payments recorded.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(p =>
        '<tr><td><strong>' + esc(p.receipt) + '</strong></td>' +
        '<td>' + formatDate(p.date) + '</td>' +
        '<td>' + esc(p.studentName) + '</td>' +
        '<td><span class="class-badge">' + esc(p.className) + '</span></td>' +
        '<td><strong style="color:' + (p.feeType ? '#7c3aed' : 'inherit') + ';">' + esc(p.feeType || '—') + '</strong>' +
            '<div class="subtext">' + esc(p.term || '') + '</div></td>' +
        '<td><strong style="color:#27ae60;">' + money(p.amount) + '</strong></td>' +
        '<td><span class="method-badge">' + esc(p.method) + '</span></td>' +
        '<td>' + esc(p.receivedBy || '—') + '</td>' +
        '<td class="action-icons">' +
            '<i class="fas fa-eye" onclick="viewPaymentReceipt(\'' + p.id + '\')" title="View receipt"></i>' +
            '<i class="fas fa-trash-alt" onclick="deletePayment(\'' + p.id + '\')" title="Delete"></i>' +
        '</td></tr>'
    ).join('');
}

function viewPaymentReceipt(id) {
    const p = payments.find(x => x.id === id);
    if (p) showReceipt(p);
}

function deletePayment(id) {
    if (!confirm('Delete this payment record?')) return;
    payments = payments.filter(p => p.id !== id);
    saveAll();
    renderPayments();
    renderFees();
    refreshDashboard();
    toast('Payment deleted.');
}

// ═══════════════════════════════════════════════════════════════
// OUTSTANDING FEES
// ═══════════════════════════════════════════════════════════════
function renderOutstanding() {
    const tbody = document.getElementById('outstandingTbody');
    if (!tbody) return;

    const classSel = document.getElementById('outstandingClassFilter');
    if (classSel) {
        const cur = classSel.value;
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        classSel.innerHTML = '<option value="All">All Classes</option>' + sortedClasses.map(c => '<option>' + esc(c.name) + '</option>').join('');
        classSel.value = cur && [...classSel.options].some(o => o.value === cur) ? cur : 'All';
    }

    const q = (document.getElementById('searchOutstanding')?.value || '').toLowerCase();
    const cls = document.getElementById('outstandingClassFilter')?.value || 'All';

    const activeStudents = students.filter(s => s.status === 'Active');
    const totalExpected = activeStudents.reduce((a, s) => a + studentTotalExpected(s), 0);
    const totalOut = activeStudents.reduce((a, s) => a + Math.max(0, studentBalance(s)), 0);
    const owing = activeStudents.filter(s => studentBalance(s) > 0);
    const fullyPaid = activeStudents.filter(s => studentBalance(s) <= 0);

    setText('outTotal', money(totalOut));
    setText('outStudents', owing.length);
    setText('outPaidCount', fullyPaid.length);
    setText('outExpected', money(totalExpected));

    const list = owing.filter(s => {
        const mQ = !q || s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
        const mC = cls === 'All' || s.className === cls;
        return mQ && mC;
    }).sort((a, b) => studentBalance(b) - studentBalance(a));

    setText('outCountBadge', list.length);

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#7a8a87;">No outstanding fees. All settled ✓</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(s => {
        const total = studentTotalExpected(s);
        const paid = studentPaid(s.id);
        const bal = total - paid;
        return '<tr>' +
            '<td><strong>' + esc(s.name) + '</strong></td>' +
            '<td>' + esc(s.code) + '</td>' +
            '<td><span class="class-badge">' + esc(s.className) + '</span></td>' +
            '<td>' + esc(s.guardianPhone || '—') + '</td>' +
            '<td>' + money(total) + '</td>' +
            '<td style="color:#27ae60;font-weight:600;">' + money(paid) + '</td>' +
            '<td><strong style="color:#e74c3c;">' + money(bal) + '</strong></td>' +
            '<td><span class="payment-status-pill payment-status-overdue">Owing</span></td>' +
            '<td class="action-icons"><i class="fas fa-money-bill" onclick="gotoFeeStudent(\'' + s.id + '\')" title="Collect payment"></i></td>' +
        '</tr>';
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════
function renderExpenses() {
    const tbody = document.getElementById('expensesTbody');
    if (!tbody) return;

    const cats = [...new Set(expenses.map(e => e.category).filter(Boolean))];
    const catSel = document.getElementById('expenseCategoryFilter');
    if (catSel) {
        const cur = catSel.value;
        catSel.innerHTML = '<option value="All">All Categories</option>' + cats.map(c => '<option>' + esc(c) + '</option>').join('');
        catSel.value = cur && [...catSel.options].some(o => o.value === cur) ? cur : 'All';
    }
    populateDatalist('expenseCategoryList', ['Salaries', 'Utilities', 'Supplies', 'Maintenance', 'Transport', 'Rent', 'Training', 'Marketing', ...cats]);

    const q = (document.getElementById('searchExpenses')?.value || '').toLowerCase();
    const cat = document.getElementById('expenseCategoryFilter')?.value || 'All';

    const list = expenses.filter(e => {
        const mQ = !q || e.title.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q);
        const mC = cat === 'All' || e.category === cat;
        return mQ && mC;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const t = today(), week = daysAgo(6), month = t.slice(0, 7);
    setText('expMetricToday', money(expenses.filter(e => e.date === t).reduce((a, e) => a + e.amount, 0)));
    setText('expMetricWeek', money(expenses.filter(e => e.date >= week).reduce((a, e) => a + e.amount, 0)));
    setText('expMetricMonth', money(expenses.filter(e => (e.date || '').slice(0, 7) === month).reduce((a, e) => a + e.amount, 0)));
    setText('expMetricTotal', money(expenses.reduce((a, e) => a + e.amount, 0)));
    setText('expenseCountBadge', list.length);

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#7a8a87;">No expenses.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(e =>
        '<tr><td>' + formatDate(e.date) + '</td>' +
        '<td><strong>' + esc(e.title) + '</strong></td>' +
        '<td><span class="class-badge">' + esc(e.category || '—') + '</span></td>' +
        '<td><strong style="color:#e74c3c;">' + money(e.amount) + '</strong></td>' +
        '<td><span class="method-badge">' + esc(e.method) + '</span></td>' +
        '<td>' + esc(e.by || '—') + '</td>' +
        '<td>' + esc(e.ref || '—') + '</td>' +
        '<td class="action-icons">' +
            '<i class="fas fa-edit" onclick="editExpense(\'' + e.id + '\')"></i>' +
            '<i class="fas fa-trash-alt" onclick="deleteExpense(\'' + e.id + '\')"></i>' +
        '</td></tr>'
    ).join('');
}

function openExpenseModal(exp) {
    document.getElementById('expenseModalTitle').textContent = exp ? 'Edit Expense' : 'Record Expense';
    document.getElementById('expId').value = exp ? exp.id : '';
    document.getElementById('expTitle').value = exp ? exp.title : '';
    document.getElementById('expCategory').value = exp ? exp.category : '';
    document.getElementById('expAmount').value = exp ? exp.amount : '';
    document.getElementById('expDate').value = exp ? exp.date : today();
    document.getElementById('expMethod').value = exp ? exp.method : 'Cash';
    document.getElementById('expRef').value = exp ? (exp.ref || '') : '';
    document.getElementById('expBy').value = exp ? (exp.by || '') : (currentUser ? currentUser.name : '');
    document.getElementById('expDesc').value = exp ? (exp.description || '') : '';
    document.getElementById('expenseModal').classList.add('active');
}

function editExpense(id) { const e = expenses.find(x => x.id === id); if (e) openExpenseModal(e); }

function saveExpense() {
    const id = document.getElementById('expId').value;
    const data = {
        title: document.getElementById('expTitle').value.trim(),
        category: document.getElementById('expCategory').value.trim() || 'Other',
        amount: parseFloat(document.getElementById('expAmount').value) || 0,
        date: document.getElementById('expDate').value || today(),
        method: document.getElementById('expMethod').value,
        ref: document.getElementById('expRef').value.trim(),
        by: document.getElementById('expBy').value.trim(),
        description: document.getElementById('expDesc').value.trim()
    };
    if (!data.title) { toast('Expense title is required.', 'error'); return; }
    if (data.amount <= 0) { toast('Amount must be greater than zero.', 'error'); return; }

    if (id) {
        const i = expenses.findIndex(e => e.id === id);
        expenses[i] = Object.assign(expenses[i], data);
    } else {
        data.id = uid('XP');
        expenses.push(data);
    }
    saveAll();
    document.getElementById('expenseModal').classList.remove('active');
    renderExpenses();
    refreshDashboard();
    toast('Expense saved.', 'success');
}

function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    expenses = expenses.filter(e => e.id !== id);
    saveAll();
    renderExpenses();
    refreshDashboard();
    toast('Expense deleted.');
}

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
function resetReport() {
    const out = document.getElementById('reportOutput');
    if (out) out.innerHTML = '<div class="report-placeholder"><i class="fas fa-chart-pie"></i><p>Choose a report type and date range, then click <strong>Generate</strong>.</p></div>';
    const from = document.getElementById('reportFrom');
    const to = document.getElementById('reportTo');
    if (from && !from.value) from.value = daysAgo(30);
    if (to && !to.value) to.value = today();
}

function runReport() {
    const type = document.getElementById('reportType').value;
    const from = document.getElementById('reportFrom').value;
    const to = document.getElementById('reportTo').value;
    const out = document.getElementById('reportOutput');
    if (!out) return;

    let rows = [], title = '', summary = '';

    if (type === 'students') {
        title = 'Student Register';
        rows = students.map(s => ({
            'Student ID': s.code, Name: s.name, Class: s.className,
            Gender: s.gender, 'Date of Birth': s.dob || '—',
            Guardian: s.guardian || '—', Phone: s.guardianPhone || '—',
            'Total Fee': studentTotalExpected(s).toFixed(2),
            Paid: studentPaid(s.id).toFixed(2),
            Balance: Math.max(0, studentBalance(s)).toFixed(2),
            Status: s.status
        }));
        summary = summaryCard('Students', rows.length);
    } else if (type === 'enrollment') {
        title = 'Enrolment by Class';
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        rows = sortedClasses.map(c => {
            const active = students.filter(s => s.classId === c.id && s.status === 'Active');
            return {
                Class: c.name, Level: c.level || '—', Section: c.section || '—',
                Teacher: c.teacherName || '—',
                Enrolled: active.length,
                Male: active.filter(s => s.gender === 'Male').length,
                Female: active.filter(s => s.gender === 'Female').length,
                Capacity: c.capacity || 0,
                'Termly Fee': c.fee.toFixed(2)
            };
        });
        summary = summaryCard('Classes', rows.length) + summaryCard('Total Active Students', students.filter(s => s.status === 'Active').length);
    } else if (type === 'gender') {
        title = 'Enrolment by Gender';
        const m = students.filter(s => s.gender === 'Male').length;
        const f = students.filter(s => s.gender === 'Female').length;
        rows = [
            { Gender: 'Male', Count: m, Percentage: students.length ? ((m / students.length) * 100).toFixed(1) + '%' : '0%' },
            { Gender: 'Female', Count: f, Percentage: students.length ? ((f / students.length) * 100).toFixed(1) + '%' : '0%' }
        ];
        summary = summaryCard('Total Students', students.length);
    } else if (type === 'attendance') {
        title = 'Attendance by Student';
        const filtered = attendance.filter(a => inRange(a.date, from, to));
        const map = {};
        filtered.forEach(a => {
            if (!map[a.studentId]) map[a.studentId] = { name: a.studentName, className: a.className, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            map[a.studentId].total++;
            const k = (a.status || '').toLowerCase();
            if (k) map[a.studentId][k] = (map[a.studentId][k] || 0) + 1;
        });
        rows = Object.values(map).map(r => ({
            Student: r.name, Class: r.className, Total: r.total,
            Present: r.present || 0, Absent: r.absent || 0, Late: r.late || 0, Excused: r.excused || 0,
            'Rate %': r.total ? (((r.present + r.late) / r.total) * 100).toFixed(1) : '0'
        }));
        summary = summaryCard('Records', rows.length);
    } else if (type === 'attendanceClass') {
        title = 'Attendance by Class';
        const filtered = attendance.filter(a => inRange(a.date, from, to));
        const map = {};
        filtered.forEach(a => {
            if (!map[a.classId]) map[a.classId] = { name: a.className, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            map[a.classId].total++;
            const k = (a.status || '').toLowerCase();
            if (k) map[a.classId][k] = (map[a.classId][k] || 0) + 1;
        });
        rows = Object.values(map).map(r => ({
            Class: r.name, Total: r.total,
            Present: r.present || 0, Absent: r.absent || 0, Late: r.late || 0, Excused: r.excused || 0,
            'Rate %': r.total ? (((r.present + r.late) / r.total) * 100).toFixed(1) : '0'
        }));
    } else if (type === 'results') {
        title = 'Results Report';
        rows = grades.filter(g => {
            const exam = exams.find(e => e.id === g.examId);
            return !exam || inRange(exam.end || exam.start, from, to) || (!from && !to);
        }).map(g => ({
            Exam: g.examName, Student: g.studentName, Class: g.className,
            Subject: g.subjectName, Score: g.score, Max: g.max,
            'Percent %': g.percent, Grade: g.grade, Remarks: g.remarks
        }));
        summary = summaryCard('Results', rows.length);
    } else if (type === 'performance') {
        title = 'Class Performance';
        const map = {};
        grades.forEach(g => {
            if (!map[g.className]) map[g.className] = { total: 0, count: 0, subjects: new Set(), students: new Set() };
            map[g.className].total += Number(g.percent);
            map[g.className].count++;
            map[g.className].subjects.add(g.subjectName);
            map[g.className].students.add(g.studentId);
        });
        rows = Object.entries(map).map(([cls, v]) => ({
            Class: cls,
            Students: v.students.size,
            Subjects: v.subjects.size,
            'Average %': v.count ? (v.total / v.count).toFixed(1) : '0',
            Results: v.count
        }));
    } else if (type === 'fees') {
        title = 'Fee Collection Report';
        rows = payments.filter(p => inRange(p.date, from, to)).map(p => ({
            Receipt: p.receipt, Date: p.date, Student: p.studentName,
            Class: p.className, 'Fee Type': p.feeType || '', Term: p.term || '—',
            Amount: p.amount.toFixed(2), Method: p.method, 'Received By': p.receivedBy
        }));
        const total = rows.reduce((a, r) => a + parseFloat(r.Amount), 0);
        summary = summaryCard('Payments', rows.length) + summaryCard('Total Collected', money(total));
    } else if (type === 'outstanding') {
        title = 'Outstanding Fees';
        rows = students.filter(s => s.status === 'Active' && studentBalance(s) > 0).map(s => ({
            Student: s.name, 'Student ID': s.code, Class: s.className,
            Guardian: s.guardian || '—', Phone: s.guardianPhone || '—',
            'Total Fee': studentTotalExpected(s).toFixed(2),
            Paid: studentPaid(s.id).toFixed(2),
            Outstanding: studentBalance(s).toFixed(2)
        }));
        const total = rows.reduce((a, r) => a + parseFloat(r.Outstanding), 0);
        summary = summaryCard('Students Owing', rows.length) + summaryCard('Total Outstanding', money(total));
    } else if (type === 'expenses') {
        title = 'Expenses Report';
        rows = expenses.filter(e => inRange(e.date, from, to)).map(e => ({
            Date: e.date, Title: e.title, Category: e.category,
            Amount: e.amount.toFixed(2), Method: e.method, Ref: e.ref || '—', By: e.by || '—'
        }));
        const total = rows.reduce((a, r) => a + parseFloat(r.Amount), 0);
        summary = summaryCard('Expenses', rows.length) + summaryCard('Total Spent', money(total));
    } else if (type === 'financial') {
        title = 'Financial Summary';
        const collected = payments.filter(p => inRange(p.date, from, to)).reduce((a, p) => a + p.amount, 0);
        const spent = expenses.filter(e => inRange(e.date, from, to)).reduce((a, e) => a + e.amount, 0);
        const expected = students.filter(s => s.status === 'Active').reduce((a, s) => a + studentTotalExpected(s), 0);
        const outstanding = students.filter(s => s.status === 'Active').reduce((a, s) => a + Math.max(0, studentBalance(s)), 0);
        rows = [
            { Item: 'Expected Fees (all active students)', Amount: expected.toFixed(2) },
            { Item: 'Collected (selected range)', Amount: collected.toFixed(2) },
            { Item: 'Outstanding (all time)', Amount: outstanding.toFixed(2) },
            { Item: 'Expenses (selected range)', Amount: spent.toFixed(2) },
            { Item: 'Net Balance (collected − expenses)', Amount: (collected - spent).toFixed(2) }
        ];
        summary = summaryCard('Collected', money(collected)) + summaryCard('Expenses', money(spent)) + summaryCard('Net', money(collected - spent));
    }

    const rangeLabel = 'From ' + (from ? formatDate(from) : 'beginning') + ' to ' + (to ? formatDate(to) : 'today');
    let html = '<div class="report-header-line"><h3>' + esc(title) + '</h3><span class="r-meta">' + rangeLabel + '</span></div>';
    html += '<div class="report-summary">' + summary + '</div>';
    if (!rows.length) {
        html += '<div class="list-empty">No data in this range.</div>';
    } else {
        const headers = Object.keys(rows[0]);
        html += '<div class="table-wrapper"><table><thead><tr>' + headers.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
            rows.map(r => '<tr>' + headers.map(h => '<td>' + esc(r[h]) + '</td>').join('') + '</tr>').join('') +
            '</tbody></table></div>';
    }
    out.innerHTML = html;
    out._reportRows = rows;
    out._reportTitle = title;
}

function summaryCard(label, value) {
    return '<div class="report-summary-item"><div class="rs-label">' + esc(label) + '</div><div class="rs-value">' + esc(value) + '</div></div>';
}

function exportReport() {
    const out = document.getElementById('reportOutput');
    if (!out || !out._reportRows || !out._reportRows.length) { toast('Generate a report first.', 'error'); return; }
    const csv = toCSV(out._reportRows);
    downloadBlob(csv, (out._reportTitle || 'report').replace(/\s+/g, '_').toLowerCase() + '.csv', 'text/csv;charset=utf-8;');
    toast('Report exported.', 'success');
}

// ═══════════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════════
function exportCSV(kind) {
    let rows = [], name = 'export.csv';

    if (kind === 'students') {
        rows = students.map(s => ({
            'Student ID': s.code, Name: s.name, Class: s.className, Gender: s.gender,
            DOB: s.dob || '', Guardian: s.guardian || '', 'Guardian Phone': s.guardianPhone || '',
            'Total Fee': studentTotalExpected(s), Paid: studentPaid(s.id),
            Balance: Math.max(0, studentBalance(s)), Status: s.status
        }));
        name = 'students.csv';
    } else if (kind === 'classes') {
        const sortedClasses = classes.slice().sort((a, b) =>
            levelOrderRank(a.level) - levelOrderRank(b.level) || naturalCompareClass(a, b)
        );
        rows = sortedClasses.map(c => ({
            Class: c.name, Level: c.level, Section: c.section, Teacher: c.teacherName,
            Enrolled: students.filter(s => s.classId === c.id && s.status === 'Active').length,
            Capacity: c.capacity, 'Termly Fee': c.fee, Status: c.status
        }));
        name = 'classes.csv';
    } else if (kind === 'subjects') {
        rows = subjects.map(s => ({ Subject: s.name, Code: s.code, Teacher: s.teacherName, Status: s.status }));
        name = 'subjects.csv';
    } else if (kind === 'staff') {
        rows = staff.map(s => ({
            Name: s.name, 'Staff ID': s.code, Gender: s.gender, Position: s.position,
            Department: s.department, Phone: s.phone, Email: s.email, Salary: s.salary,
            Joined: s.joined, Qualification: s.qualification, Status: s.status
        }));
        name = 'staff.csv';
    } else if (kind === 'attendance') {
        rows = attendance.map(a => ({
            Date: a.date, Student: a.studentName, Class: a.className, Status: a.status
        }));
        name = 'attendance.csv';
    } else if (kind === 'staffAttendance') {
        rows = staffAttendance.map(a => ({
            Date: a.date, 'Staff ID': a.staffId, Name: a.staffName,
            Position: a.position || '', Department: a.department || '',
            Status: a.status || '', 'Sign In': a.signInTime || '',
            'Sign Out': a.signOutTime || '', Notes: a.notes || ''
        }));
        name = 'staff_attendance.csv';
    } else if (kind === 'exams') {
        rows = exams.map(e => ({
            Exam: e.name, Class: e.className || '', Subject: e.subjectName || '',
            Term: e.term, Year: e.year,
            Start: e.start, End: e.end,
            Status: examDisplayStatus(e)
        }));
        name = 'exams.csv';
    } else if (kind === 'grades') {
        rows = grades.map(g => ({
            Exam: g.examName, Student: g.studentName, Class: g.className, Subject: g.subjectName,
            Score: g.score, Max: g.max, 'Percent %': g.percent, Grade: g.grade, Remarks: g.remarks
        }));
        name = 'results.csv';
    } else if (kind === 'payments') {
        rows = payments.map(p => ({
            Receipt: p.receipt, Date: p.date, Student: p.studentName, Class: p.className,
            'Fee Type': p.feeType || '', Term: p.term, Amount: p.amount, Method: p.method,
            'Received By': p.receivedBy
        }));
        name = 'fee_records.csv';
    } else if (kind === 'outstanding') {
        rows = students.filter(s => s.status === 'Active' && studentBalance(s) > 0).map(s => ({
            Student: s.name, 'Student ID': s.code, Class: s.className,
            Guardian: s.guardian, Phone: s.guardianPhone,
            'Total Fee': studentTotalExpected(s), Paid: studentPaid(s.id), Outstanding: studentBalance(s)
        }));
        name = 'outstanding_fees.csv';
    } else if (kind === 'expenses') {
        rows = expenses.map(e => ({
            Date: e.date, Title: e.title, Category: e.category, Amount: e.amount,
            Method: e.method, Reference: e.ref, By: e.by
        }));
        name = 'expenses.csv';
    }

    if (!rows.length) { toast('No data to export.', 'error'); return; }
    downloadBlob(toCSV(rows), name, 'text/csv;charset=utf-8;');
    toast('Exported ' + rows.length + ' rows.', 'success');
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
function renderSettings() {
    document.getElementById('setName').value = settings.name;
    document.getElementById('setMotto').value = settings.motto || '';
    document.getElementById('setPhone').value = settings.phone;
    document.getElementById('setEmail').value = settings.email;
    document.getElementById('setAddress').value = settings.address;
    document.getElementById('setCurrency').value = settings.currency;
    document.getElementById('setAcademicYear').value = settings.academicYear || '';
    document.getElementById('setTerm').value = settings.term || 'First Term';
    document.getElementById('setReceiptFooter').value = settings.receiptFooter;
    document.getElementById('setColor').value = settings.color;
    document.getElementById('colorHex').textContent = settings.color;

    const gb = settings.gradeBoundaries || { A: 90, B: 80, C: 70, D: 60, F: 0 };
    if(document.getElementById('gradeA')) {
        document.getElementById('gradeA').value = gb.A;
        document.getElementById('gradeB').value = gb.B;
        document.getElementById('gradeC').value = gb.C;
        document.getElementById('gradeD').value = gb.D;
        document.getElementById('gradeF').value = gb.F;
    }

    const preview = document.getElementById('logoPreview');
    if (preview) {
        if (settings.logo) { preview.src = settings.logo; preview.style.display = 'block'; }
        else preview.style.display = 'none';
    }

    renderGlobalFeeTypes();

    const tbody = document.getElementById('usersTbody');
    if (tbody) {
        tbody.innerHTML = users.map(u =>
            '<tr><td><strong>' + esc(u.name) + '</strong></td>' +
            '<td>' + esc(u.username) + '</td>' +
            '<td><span class="class-badge">' + esc(ROLE_LABELS[u.role] || u.role) + '</span></td>' +
            '<td class="action-icons">' +
                (u.username === 'admin' ? '<i class="fas fa-lock" style="opacity:0.4;cursor:not-allowed;" title="Cannot delete admin"></i>' :
                '<i class="fas fa-trash-alt" onclick="deleteUser(\'' + u.id + '\')"></i>') +
            '</td></tr>'
        ).join('');
    }
}

function renderGlobalFeeTypes() {
    const container = document.getElementById('globalFeeTypesList');
    if (!container) return;

    const types = settings.feeTypes || [];
    if (!types.length) {
        container.innerHTML = '<span style="color:#7a8a87; font-style:italic; font-size:0.85rem;">No global fee types added yet.</span>';
        return;
    }

    container.innerHTML = types.map((type, index) => `
        <div style="display:flex; align-items:center; gap:6px; background:#e0f2f0; padding:6px 12px; border-radius:20px; border:1px solid #b2dfdb;">
            <span style="font-weight:600; font-size:0.85rem; color:var(--school-primary-dark);">${esc(type)}</span>
            <i class="fas fa-times" style="cursor:pointer; font-size:0.75rem; color:#e74c3c;" onclick="deleteGlobalFeeType(${index})" title="Delete"></i>
        </div>
    `).join('');
}

function addGlobalFeeType() {
    const input = document.getElementById('newGlobalFeeType');
    const type = input.value.trim();
    if (!type) { toast('Please enter a fee type name.', 'error'); return; }

    if (!settings.feeTypes) settings.feeTypes = [];
    if (settings.feeTypes.some(t => t.toLowerCase() === type.toLowerCase())) {
        toast('This fee type already exists.', 'error');
        return;
    }

    settings.feeTypes.push(type);
    saveSettings();
    renderGlobalFeeTypes();
    input.value = '';
    toast('Fee type added globally.', 'success');
}

function deleteGlobalFeeType(index) {
    if (!confirm('Remove this fee type globally? It will no longer show for new students.')) return;
    settings.feeTypes.splice(index, 1);
    saveSettings();
    renderGlobalFeeTypes();
    toast('Fee type removed.');
}

function saveGradeBoundaries() {
    const a = parseFloat(document.getElementById('gradeA').value);
    const b = parseFloat(document.getElementById('gradeB').value);
    const c = parseFloat(document.getElementById('gradeC').value);
    const d = parseFloat(document.getElementById('gradeD').value);
    const f = parseFloat(document.getElementById('gradeF').value);

    if ([a, b, c, d, f].some(isNaN)) {
        toast('All grade boundaries must be valid numbers.', 'error');
        return;
    }
    if (a > 100 || b > 100 || c > 100 || d > 100 || f > 100) {
        toast('Percentages cannot exceed 100.', 'error');
        return;
    }
    if (a <= b || b <= c || c <= d || d <= f) {
        toast('Boundaries must be in descending order (A > B > C > D > F).', 'error');
        return;
    }

    settings.gradeBoundaries = { A: a, B: b, C: c, D: d, F: f };
    saveSettings();
    
    let updatedCount = 0;
    grades.forEach(g => {
        const newGradeData = calcGrade(Number(g.percent));
        if (g.grade !== newGradeData.grade || g.remarks !== newGradeData.remark) {
            g.grade = newGradeData.grade;
            g.remarks = newGradeData.remark;
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        saveAll();
    }
    
    if (activeClassDetailId) renderClassExamsPage(activeClassDetailId);
    renderGradesTable();
    
    toast(`Grade boundaries updated. ${updatedCount > 0 ? updatedCount + ' existing records recalculated.' : ''}`, 'success');
}

function addUser() {
    const name = document.getElementById('newUserName').value.trim();
    const username = document.getElementById('newUserUsername').value.trim().toLowerCase();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    if (!name || !username || !password) { toast('All user fields required.', 'error'); return; }
    if (password.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    if (users.some(u => u.username === username)) { toast('Username already exists.', 'error'); return; }
    users.push({ id: uid('U'), name, username, password, role });
    saveUsers();
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    renderSettings();
    toast('User added.', 'success');
}

function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    users = users.filter(u => u.id !== id);
    saveUsers();
    renderSettings();
    toast('User deleted.');
}

// ─── BACKUP / RESTORE ───
function downloadBackup() {
    const data = {
        _meta: { app: 'Elite Minds Academy SMS', version: 1, exportedAt: new Date().toISOString() },
        settings, students, classes, subjects, staff, attendance, staffAttendance, exams, grades, payments, expenses
    };
    downloadBlob(JSON.stringify(data, null, 2), 'eliteminds_backup_' + today() + '.json', 'application/json');
    toast('Backup downloaded.', 'success');
}

function handleRestoreFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const d = JSON.parse(e.target.result);
            if (!d._meta || !d._meta.app) { toast('Not a valid school backup.', 'error'); return; }
            pendingRestore = d;
            const box = document.getElementById('restorePreview');
            const content = document.getElementById('restorePreviewContent');
            content.innerHTML =
                'Exported: <strong>' + (d._meta.exportedAt ? new Date(d._meta.exportedAt).toLocaleString() : 'unknown') + '</strong><br>' +
                'Students: ' + (d.students || []).length + ' · Classes: ' + (d.classes || []).length + '<br>' +
                'Staff: ' + (d.staff || []).length + ' · Subjects: ' + (d.subjects || []).length + '<br>' +
                'Payments: ' + (d.payments || []).length + ' · Results: ' + (d.grades || []).length;
            box.style.display = 'block';
        } catch (err) { toast('Could not read file.', 'error'); }
    };
    reader.readAsText(file);
}

function confirmRestore() {
    if (!pendingRestore) return;
    if (!confirm('Replace all current data with the backup?')) return;
    const d = pendingRestore;
    if (d.settings) { settings = Object.assign(settings, d.settings); saveSettings(); }
    students = d.students || [];
    classes = d.classes || [];
    subjects = d.subjects || [];
    staff = d.staff || [];
    attendance = d.attendance || [];
    staffAttendance = d.staffAttendance || [];
    exams = d.exams || [];
    grades = d.grades || [];
    payments = d.payments || [];
    expenses = d.expenses || [];
    saveAll();
    applyBranding();
    document.getElementById('restorePreview').style.display = 'none';
    pendingRestore = null;
    refreshDashboard();
    renderSettings();
    toast('Backup restored.', 'success');
}

function cancelRestore() {
    pendingRestore = null;
    document.getElementById('restorePreview').style.display = 'none';
}

function wipeData() {
    if (!confirm('⚠️ ERASE ALL SCHOOL DATA? This cannot be undone!')) return;
    if (!confirm('Are you absolutely sure?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(AUTH_KEY);
    location.reload();
}

// ═══════════════════════════════════════════════════════════════
// CHANGE PASSWORD
// ═══════════════════════════════════════════════════════════════
function changePassword() {
    if (!currentUser) { toast('Not logged in.', 'error'); return; }

    const cur = document.getElementById('pwCurrent').value;
    const nw  = document.getElementById('pwNew').value;
    const cf  = document.getElementById('pwConfirm').value;

    if (!cur || !nw || !cf) { toast('Please fill in all password fields.', 'error'); return; }
    if (cur !== currentUser.password) { toast('Current password is incorrect.', 'error'); return; }
    if (nw.length < 6) { toast('New password must be at least 6 characters.', 'error'); return; }
    if (nw === cur) { toast('New password must be different from the current one.', 'error'); return; }
    if (nw !== cf) { toast('New password and confirmation do not match.', 'error'); return; }

    const u = users.find(x => x.id === currentUser.id);
    if (!u) { toast('User not found.', 'error'); return; }
    u.password = nw;
    currentUser.password = nw;
    saveUsers();

    document.getElementById('pwCurrent').value = '';
    document.getElementById('pwNew').value = '';
    document.getElementById('pwConfirm').value = '';

    toast('Password updated successfully. Use it on your next login.', 'success');
}

function clearPasswordFields() {
    const c = document.getElementById('pwCurrent');
    const n = document.getElementById('pwNew');
    const f = document.getElementById('pwConfirm');
    if (c) c.value = '';
    if (n) n.value = '';
    if (f) f.value = '';
}

// ═══════════════════════════════════════════════════════════════
// MODAL CLOSE BINDING
// ═══════════════════════════════════════════════════════════════
function bindModalClose() {
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const m = document.getElementById(btn.getAttribute('data-close'));
            if (m) m.classList.remove('active');
        });
    });
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m && m.id !== 'receiptModal') m.classList.remove('active'); });
    });
}

// ═══════════════════════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════════════════════
function bindEvents() {
    document.getElementById('hamburgerToggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggle = document.getElementById('hamburgerToggle');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        toggle.setAttribute('aria-expanded', sidebar.classList.contains('open') ? 'true' : 'false');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
    });

    document.getElementById('refreshSmartBtn')?.addEventListener('click', () => {
        renderSmartAnalytics();
        toast('Smart Analytics refreshed.', 'success');
    });
    document.getElementById('exportSmartBtn')?.addEventListener('click', exportSmartAnalytics);
    document.getElementById('printSmartBtn')?.addEventListener('click', () => window.print());

    document.getElementById('addStudentBtn')?.addEventListener('click', () => openStudentModal(null));
    document.getElementById('saveStudentBtn')?.addEventListener('click', saveStudent);
    document.getElementById('searchStudents')?.addEventListener('input', renderStudents);
    document.getElementById('studentClassFilter')?.addEventListener('change', renderStudents);
    document.getElementById('studentStatusFilter')?.addEventListener('change', renderStudents);
    document.getElementById('stuClass')?.addEventListener('change', function () {
        const opt = this.options[this.selectedIndex];
        const fee = opt.getAttribute('data-fee');
        if (fee && !document.getElementById('studentId').value) {
            document.getElementById('stuFee').value = fee;
        }
    });

    document.getElementById('addFeeRowBtn')?.addEventListener('click', () => {
        const editor = document.getElementById('feeStructureEditor');
        if (!editor) return;
        const row = document.createElement('div');
        row.className = 'fs-row';
        row.innerHTML = `
            <input type="text" class="fs-type" placeholder="Fee type" list="feeTypeOptions" />
            <input type="number" class="fs-amount" placeholder="Amount" step="0.01" min="0" />
            <button type="button" class="fs-remove" title="Remove"><i class="fas fa-times"></i></button>
        `;
        editor.appendChild(row);
        row.querySelector('.fs-remove').addEventListener('click', () => {
            row.remove();
            updateStuFeeFromStructure();
        });
        row.querySelector('.fs-amount').addEventListener('input', updateStuFeeFromStructure);
    });

    document.getElementById('addClassBtn')?.addEventListener('click', () => openClassModal(null));
    document.getElementById('saveClassBtn')?.addEventListener('click', saveClass);
    document.getElementById('classSearch')?.addEventListener('input', renderClasses);
    document.getElementById('classLevelFilter')?.addEventListener('change', renderClasses);

    document.querySelectorAll('#classDetailView .sub-tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('#classDetailView .sub-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            document.querySelectorAll('#classDetailView .subtab-content').forEach(c => c.classList.remove('active-subtab'));
            const map = { students: 'classStudentsView', exams: 'classExamsView' };
            const target = document.getElementById(map[t.getAttribute('data-classviewtab')]);
            if (target) target.classList.add('active-subtab');
            if (t.getAttribute('data-classviewtab') === 'exams' && activeClassDetailId) {
                renderClassExamsPage(activeClassDetailId);
            }
        });
    });

    document.getElementById('addSubjectBtn')?.addEventListener('click', () => openSubjectModal(null));
    document.getElementById('saveSubjectBtn')?.addEventListener('click', saveSubject);
    document.getElementById('searchSubjects')?.addEventListener('input', renderSubjects);

    document.getElementById('addStaffBtn')?.addEventListener('click', () => openStaffModal(null));
    document.getElementById('saveStaffBtn')?.addEventListener('click', saveStaff);
    document.getElementById('searchStaff')?.addEventListener('input', renderStaff);
    document.getElementById('staffDeptFilter')?.addEventListener('change', renderStaff);
    document.getElementById('staffStatusFilter')?.addEventListener('change', renderStaff);

    document.getElementById('attendDate')?.addEventListener('change', renderAttendanceGrid);
    document.getElementById('attendClass')?.addEventListener('change', renderAttendanceGrid);
    document.getElementById('markAllPresentBtn')?.addEventListener('click', markAllPresent);
    document.getElementById('clearAttendanceBtn')?.addEventListener('click', clearAttendance);
    document.getElementById('applyAttendFilter')?.addEventListener('click', renderAttendanceSummary);
    document.querySelectorAll('#tabAttendance .sub-tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('#tabAttendance .sub-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            document.querySelectorAll('#tabAttendance .subtab-content').forEach(c => c.classList.remove('active-subtab'));
            document.getElementById(t.getAttribute('data-attendsub') === 'mark' ? 'attendMark' : 'attendSummary').classList.add('active-subtab');
            if (t.getAttribute('data-attendsub') === 'summary') renderAttendanceSummary();
        });
    });

    document.getElementById('staffAttendDate')?.addEventListener('change', () => {
        renderStaffAttendanceGrid();
        renderStaffAttendanceStats();
    });
    document.getElementById('staffAttendDept')?.addEventListener('change', () => {
        renderStaffAttendanceGrid();
        renderStaffAttendanceStats();
    });
    document.getElementById('staffMarkAllPresentBtn')?.addEventListener('click', markAllStaffPresent);
    document.getElementById('staffSignInAllBtn')?.addEventListener('click', signInAllStaff);
    document.getElementById('staffSignOutAllBtn')?.addEventListener('click', signOutAllStaff);
    document.getElementById('staffClearAttendanceBtn')?.addEventListener('click', clearStaffAttendance);
    document.getElementById('applyStaffAttendFilter')?.addEventListener('click', renderStaffAttendanceSummary);

    document.querySelectorAll('#tabStaffAttendance .sub-tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('#tabStaffAttendance .sub-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            document.querySelectorAll('#tabStaffAttendance .subtab-content').forEach(c => c.classList.remove('active-subtab'));
            document.getElementById(t.getAttribute('data-staffattendsub') === 'mark' ? 'staffAttendMark' : 'staffAttendSummary').classList.add('active-subtab');
            if (t.getAttribute('data-staffattendsub') === 'summary') renderStaffAttendanceSummary();
        });
    });

    document.getElementById('addExamBtn')?.addEventListener('click', () => openExamModal(null));
    document.getElementById('saveExamBtn')?.addEventListener('click', saveExam);
    document.getElementById('refreshExamsBtn')?.addEventListener('click', () => {
        renderExams();
        toast('Exams refreshed.', 'success');
    });

    document.getElementById('examClass')?.addEventListener('change', function() {
        updateExamSubjectOptions(this.value, '');
    });

    document.getElementById('resClass')?.addEventListener('change', updateResSubjectOptions);
    document.getElementById('loadResultsBtn')?.addEventListener('click', loadResultStudents);
    document.getElementById('saveResultsBtn')?.addEventListener('click', saveResults);
    document.getElementById('searchGrades')?.addEventListener('input', renderGradesTable);
    document.getElementById('gradeExamFilter')?.addEventListener('change', renderGradesTable);

    document.getElementById('feeSearch')?.addEventListener('input', renderFeeGrid);
    document.getElementById('feeClassFilter')?.addEventListener('change', renderFeeGrid);

    document.getElementById('searchPayments')?.addEventListener('input', renderPayments);
    document.getElementById('paymentMethodFilter')?.addEventListener('change', renderPayments);
    document.getElementById('printReceiptBtn')?.addEventListener('click', () => window.print());

    document.getElementById('searchOutstanding')?.addEventListener('input', renderOutstanding);
    document.getElementById('outstandingClassFilter')?.addEventListener('change', renderOutstanding);

    document.getElementById('addExpenseBtn')?.addEventListener('click', () => openExpenseModal(null));
    document.getElementById('saveExpenseBtn')?.addEventListener('click', saveExpense);
    document.getElementById('searchExpenses')?.addEventListener('input', renderExpenses);
    document.getElementById('expenseCategoryFilter')?.addEventListener('change', renderExpenses);

    document.getElementById('runReportBtn')?.addEventListener('click', runReport);
    document.getElementById('exportReportBtn')?.addEventListener('click', exportReport);
    document.getElementById('printReportBtn')?.addEventListener('click', () => window.print());

    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettingsFromForm);
    document.getElementById('addGlobalFeeTypeBtn')?.addEventListener('click', addGlobalFeeType);
    document.getElementById('newGlobalFeeType')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addGlobalFeeType();
    });
    document.getElementById('saveGradeBtn')?.addEventListener('click', saveGradeBoundaries);
    document.getElementById('resetSettingsBtn')?.addEventListener('click', resetSettings);
    document.getElementById('logoUploadInput')?.addEventListener('change', e => handleLogoUpload(e.target.files[0]));
    document.getElementById('setColor')?.addEventListener('input', function () { livePreviewColour(this.value); });
    document.getElementById('addUserBtn')?.addEventListener('click', addUser);
    document.getElementById('downloadBackupBtn')?.addEventListener('click', downloadBackup);
    document.getElementById('restoreBackupBtn')?.addEventListener('click', () => document.getElementById('restoreFileInput').click());
    document.getElementById('restoreFileInput')?.addEventListener('change', e => handleRestoreFile(e.target.files[0]));
    document.getElementById('confirmRestoreBtn')?.addEventListener('click', confirmRestore);
    document.getElementById('cancelRestoreBtn')?.addEventListener('click', cancelRestore);
    document.getElementById('wipeDataBtn')?.addEventListener('click', wipeData);

    document.getElementById('savePasswordBtn')?.addEventListener('click', changePassword);
    document.getElementById('clearPasswordBtn')?.addEventListener('click', clearPasswordFields);

    bindModalClose();
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
function init() {
    loadSettings();
    loadAll();
    loadUsers();
    bindEvents();
    initLogin();
    applyBranding();

    const t = today();
    document.querySelectorAll('input[data-max-today]').forEach(inp => {
        inp.max = t;
    });

    const sess = localStorage.getItem(AUTH_KEY);
    if (sess) {
        try {
            const s = JSON.parse(sess);
            const u = users.find(x => x.id === s.id);
            if (u) { currentUser = u; enterApp(); return; }
        } catch (e) {}
    }

    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';
}

// ─── EXPOSE GLOBAL FUNCTIONS FOR ONCLICK ───
window.showStudentPerformance = showStudentPerformance;
window.gradeExamFromClass = gradeExamFromClass;
window.viewExamReportFromClass = viewExamReportFromClass;
window.deleteExamFromClass = deleteExamFromClass;
window.switchTab = switchTab;
window.openEditStudent = editStudent;
window.deleteStudent = deleteStudent;
window.gotoFeeStudent = gotoFeeStudent;
window.editClass = editClass;
window.deleteClass = deleteClass;
window.viewClassDetail = viewClassDetail;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;
window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.editExam = editExam;
window.deleteExam = deleteExam;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.deleteGrade = deleteGrade;
window.deletePayment = deletePayment;
window.editUser = deleteUser;
window.selectFeeStudent = selectFeeStudent;
window.toggleLevelGroup = toggleLevelGroup;
window.toggleExamLevelGroup = toggleExamLevelGroup;
window.toggleSubjectExamGroup = toggleSubjectExamGroup;
window.backToLevels = backToLevels;
window.deleteGlobalFeeType = deleteGlobalFeeType;
window.addGlobalFeeType = addGlobalFeeType;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}