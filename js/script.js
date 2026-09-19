
// ─── LOGIN SYSTEM ───
const AUTH_KEY = 'DarAlWafaaAuth';
const DEFAULT_USER = 'admin';
const DEFAULT_PASS = 'admin2468';
const LOCAL_PASS_KEY = 'DarAlWafaaLocalPass';

function getAdminPassword() {
    return localStorage.getItem(LOCAL_PASS_KEY) || DEFAULT_PASS;
}

// ─── DATA STORE ───
let students = [], teachers = [], courses = [], payments = [], staff = [];
let accountants = [];
let budgets = [], expenses = [], timetable = [];
let classes = [], subjects = [], exams = [], examGrades = [], terms = [];
let attendance = [];
let staffAttendance = [];
let academicYears = [], feeCategories = [], feeStructure = [];

// ─── ROLE / SESSION ───
let currentUser = { role: 'admin', name: 'Admin', teacherId: null };
const SESSION_KEY = 'DarAlWafaaSession';

let schoolSettings = { name: 'Dar Al-Wafaa', logo: '', primaryColor: '#6c3a9d' };
const SETTINGS_KEY = 'DarAlWafaaSchoolSettings';

let studentSearch = "", teacherSearch = "", paymentSearch = "", budgetSearch = "", expenseSearch = "";
let classSearch = "", classLevelFilter = "All";
let studentClassFilter = "All";
let subjectSearch = "";
let feeStructureSearch = "";
let currentTab = "dashboard";
let currentPaySubTab = "payments";
let currentDay = "Monday";
let timetableClassFilter = "All";
let timetableTeacherFilter = "All";
let currentRegisterClassId = null;
let currentViewTab = "students";
let classExamIdForGrades = null;
let classExamIdForReport = null;
let currentExamIdForGrades = null;
let currentExamIdForReport = null;
let perfChartInstance = null;
const STORAGE_KEY = "DarAlWafaaEnhanced";

let registerYearFilter = "";
let registerTermFilter = "";
let registerClassFilter = "";
let registerDetailClass = null;

let enrollmentChart = null, revenueChart = null, classDistChart = null, paymentMethodChart = null;
let revenueExpenseChart = null, subjectPerformanceChart = null, budgetUtilizationChart = null;
let examPerformanceTrendChart = null, examSubjectPerformanceChart = null,
    examClassPerformanceChart = null, examPassFailChart = null;
let attendanceClassChart = null, attendanceDistributionChart = null, attendanceTrendChart = null;

let revenueByCategoryChart = null;
let termRevenueChart = null;
let arrearsByClassChart = null;
let feeCollectionProgressChart = null;
let subjectPerformanceDetailedChart = null;

const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Telecel Cash', 'AirtelTigo Money', 'Bank Transfer', 'Cheque'];

// ─── HELPERS ───
function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

// ✅ Sort classes by level order then numerically
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

// ✅ Sort a list of class name strings using the level mapping
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

function saveToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        students, teachers, courses, payments, staff,
        budgets, expenses, timetable, classes, subjects,
        exams, examGrades, terms, attendance,
        staffAttendance,
        accountants,
        academicYears, feeCategories, feeStructure
    }));
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(schoolSettings));
    applySettings();
    updateFavicon();
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
    updateFavicon();
}

function applySettings() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.background = `linear-gradient(135deg, ${schoolSettings.primaryColor} 0%, ${adjustColor(schoolSettings.primaryColor, 30)} 100%)`;
    }
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
    if (titleSpan) titleSpan.textContent = schoolSettings.name;
    const dashName = document.getElementById('dashboardSchoolName');
    if (dashName) dashName.textContent = schoolSettings.name;

    document.querySelectorAll('.analytics-card h3, .analytics-decision-card h3, .exam-analytics-card h4, .exam-rankings-card h4, .perf-section-title, .perf-chart-container span:first-child')
        .forEach(el => { el.style.borderColor = schoolSettings.primaryColor; });
    document.querySelectorAll('.add-btn, .btn-primary').forEach(el => {
        el.style.background = schoolSettings.primaryColor;
    });
    document.querySelectorAll('.nav-item.active').forEach(el => {
        el.style.borderLeftColor = '#ffcb05';
    });
    document.querySelectorAll('.sub-tab.active, .class-view-tab.active, .sub-tab.active').forEach(el => {
        el.style.background = schoolSettings.primaryColor;
    });
    document.querySelectorAll('.badge').forEach(el => {
        el.style.background = schoolSettings.primaryColor;
        el.style.color = '#fff';
    });

    const previewName = document.getElementById('previewSchoolName');
    if (previewName) previewName.textContent = schoolSettings.name;
    const previewLogo = document.getElementById('previewLogo');
    if (previewLogo) {
        if (schoolSettings.logo) {
            previewLogo.src = schoolSettings.logo;
            previewLogo.style.display = 'inline-block';
        } else previewLogo.style.display = 'none';
    }
    const previewBadge = document.getElementById('previewBadge');
    if (previewBadge) previewBadge.style.background = schoolSettings.primaryColor;
    const previewGradient = document.getElementById('previewGradient');
    if (previewGradient) {
        previewGradient.style.background = `linear-gradient(135deg, ${schoolSettings.primaryColor} 0%, ${adjustColor(schoolSettings.primaryColor, 30)} 100%)`;
    }
    const nameInput = document.getElementById('settingsSchoolName');
    if (nameInput) nameInput.value = schoolSettings.name;
    const colorInput = document.getElementById('settingsPrimaryColor');
    if (colorInput) colorInput.value = schoolSettings.primaryColor;
    const hexDisplay = document.getElementById('colorHexDisplay');
    if (hexDisplay) hexDisplay.textContent = schoolSettings.primaryColor;
    const logoPreview = document.getElementById('logoPreview');
    if (logoPreview) {
        if (schoolSettings.logo) {
            logoPreview.src = schoolSettings.logo;
            logoPreview.style.display = 'block';
        } else logoPreview.style.display = 'none';
    }
}

function updateFavicon() {
    const name = schoolSettings.name || 'Dar Al-Wafaa';
    const color = schoolSettings.primaryColor || '#6c3a9d';
    const initial = name.charAt(0).toUpperCase();

    if (schoolSettings.logo) {
        const faviconLink = document.getElementById('dynamicFavicon');
        if (faviconLink) faviconLink.href = schoolSettings.logo;
        return;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="${color}"/>
        <text x="32" y="42" font-size="36" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="700">${initial}</text>
    </svg>`;

    const encoded = 'data:image/svg+xml,' + encodeURIComponent(svg);
    const faviconLink = document.getElementById('dynamicFavicon');
    if (faviconLink) faviconLink.href = encoded;

    const loginLogo = document.querySelector('.login-logo');
    if (loginLogo) {
        loginLogo.style.background = `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, 30)} 100%)`;
    }
}

function adjustColor(hex, percent) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + percent));
    g = Math.min(255, Math.max(0, g + percent));
    b = Math.min(255, Math.max(0, b + percent));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function showToast(msg, isError) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isError ? '#e74c3c' : schoolSettings.primaryColor || '#667eea';
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 5000);
}

function escapeHtml(str) {
    if (!str) return '';
    str = String(str);
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m);
}

function generateId(prefix) {
    return prefix + Date.now() + Math.random().toString(36).substr(2, 6);
}

function getGrade(score, maxScore) {
    if (!maxScore || maxScore <= 0) return 'N/A';
    const pct = (score / maxScore) * 100;
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
}

function getGradeClass(grade) {
    if (grade === 'A' || grade === 'B') return 'grade-A';
    if (grade === 'C') return 'grade-C';
    if (grade === 'D') return 'grade-D';
    if (grade === 'F') return 'grade-F';
    return '';
}

function getGradeColor(grade) {
    if (grade === 'A') return '#27ae60';
    if (grade === 'B') return '#2ecc71';
    if (grade === 'C') return '#f39c12';
    if (grade === 'D') return '#e67e22';
    if (grade === 'F') return '#e74c3c';
    return '#95a5a6';
}

function getRemark(score, maxScore) {
    const pct = (score / maxScore) * 100;
    if (pct >= 90) return 'Excellent';
    if (pct >= 80) return 'Very Good';
    if (pct >= 70) return 'Good';
    if (pct >= 60) return 'Satisfactory';
    if (pct >= 50) return 'Fair';
    return 'Needs Improvement';
}

function getOverallGrade(avgPct) {
    if (avgPct >= 90) return 'A';
    if (avgPct >= 80) return 'B';
    if (avgPct >= 70) return 'C';
    if (avgPct >= 60) return 'D';
    return 'F';
}

function getExamStatus(exam) {
    const now = getLocalDateString();
    const grades = examGrades.filter(g => g.examId === exam.id);
    const activeStudents = students.filter(s => s.class === exam.class && s.status === 'Active');
    const fullyGraded = activeStudents.length > 0 && grades.length >= activeStudents.length;
    if (fullyGraded) return 'Completed';
    if (exam.date < now) return 'Completed';
    if (exam.date === now) return 'Ongoing';
    return 'Upcoming';
}

// ─── SIDEBAR TOGGLE ───
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ─── AUTH & SESSION ───
function isLoggedIn() {
    try {
        const s = localStorage.getItem(SESSION_KEY);
        if (!s) return false;
        const parsed = JSON.parse(s);
        if (!parsed || !parsed.role) return false;

        if (parsed.role === 'admin') {
            currentUser = { role: 'admin', name: 'Admin', teacherId: null };
        } else if (parsed.role === 'teacher' && parsed.teacherId) {
            const t = teachers.find(t => t.id === parsed.teacherId);
            if (!t || t.canLogin === false) {
                localStorage.removeItem(SESSION_KEY);
                return false;
            }
            currentUser = { role: 'teacher', name: t.name, teacherId: t.id };
        } else {
            return false;
        }
        return true;
    } catch (e) { return false; }
}

function setLoggedIn(status, user) {
    if (status && user) {
        currentUser = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ role: user.role, teacherId: user.teacherId || null }));
    } else {
        currentUser = { role: 'admin', name: 'Admin', teacherId: null };
        localStorage.removeItem(SESSION_KEY);
    }
}

function showLogin() {
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';
    document.body.removeAttribute('data-role');
}

function hideLogin() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('sidebar').style.display = 'block';
    document.body.setAttribute('data-role', currentUser.role);
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
        errorEl.textContent = 'Please enter both username and password.';
        return;
    }

    if (username.toLowerCase() === DEFAULT_USER.toLowerCase() && password === getAdminPassword()) {
        setLoggedIn(true, { role: 'admin', name: 'Admin', teacherId: null });
        errorEl.textContent = '';
        hideLogin();
        applyRoleUI();
        showToast('✅ Welcome back, Admin!');
        switchTab('dashboard');
        updateAllUI();
        return;
    }

    const teacher = teachers.find(t =>
        t.username && t.username.toLowerCase() === username.toLowerCase() &&
        t.password === password && t.canLogin !== false
    );

    if (teacher) {
        setLoggedIn(true, { role: 'teacher', name: teacher.name, teacherId: teacher.id });
        errorEl.textContent = '';
        hideLogin();
        applyRoleUI();
        showToast(`✅ Welcome back, ${teacher.name}!`);
        switchTab('dashboard');
        updateAllUI();
        return;
    }

    errorEl.textContent = '❌ Invalid username or password. Please try again.';
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        setLoggedIn(false);
        showLogin();
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').textContent = '';
        showToast('Logged out successfully.');
    }
}

// ─── ROLE HELPERS ───
function isAdmin() { return currentUser.role === 'admin'; }
function isTeacher() { return currentUser.role === 'teacher'; }

function getCurrentTeacher() {
    if (!isTeacher()) return null;
    return teachers.find(t => t.id === currentUser.teacherId) || null;
}

function getScopedClassNames() {
    if (isAdmin()) return classes.map(c => c.name);
    const t = getCurrentTeacher();
    if (!t || !t.assignedClass) return [];
    return t.assignedClass.split(',').map(s => s.trim()).filter(Boolean);
}

function scopeByClass(records, classField = 'class') {
    if (isAdmin()) return records;
    const allowed = getScopedClassNames();
    return records.filter(r => allowed.includes(r[field]));
}

function getScopedStudents() { return scopeByClass(students, 'class'); }
function getScopedClasses() { return classes.filter(c => isAdmin() || getScopedClassNames().includes(c.name)); }
function getScopedExams() { return scopeByClass(exams, 'class'); }
function getScopedExamGrades() {
    if (isAdmin()) return examGrades;
    const allowedExamIds = getScopedExams().map(e => e.id);
    return examGrades.filter(g => allowedExamIds.includes(g.examId));
}
function getScopedAttendance() {
    if (isAdmin()) return attendance;
    const allowed = getScopedClassNames();
    return attendance.filter(a => allowed.includes(a.class));
}
function getScopedTeachers() {
    if (isAdmin()) return teachers;
    return getCurrentTeacher() ? [getCurrentTeacher()] : [];
}

function applyRoleUI() {
    document.body.setAttribute('data-role', currentUser.role);

    const nameEl = document.getElementById('userDisplayName');
    if (nameEl) nameEl.textContent = currentUser.name;
    const badge = document.getElementById('userRoleBadge');
    if (badge) {
        badge.textContent = currentUser.role.toUpperCase();
        badge.className = 'role-badge ' + currentUser.role;
    }

    const classesLabel = document.getElementById('navClassesLabel');
    const studentsLabel = document.getElementById('navStudentsLabel');
    const timetableLabel = document.getElementById('navTimetableLabel');
    if (isTeacher()) {
        if (classesLabel) classesLabel.textContent = 'My Classes';
        if (studentsLabel) studentsLabel.textContent = 'My Students';
        if (timetableLabel) timetableLabel.textContent = 'My Schedule';
    } else {
        if (classesLabel) classesLabel.textContent = 'Classes';
        if (studentsLabel) studentsLabel.textContent = 'Manage Students';
        if (timetableLabel) timetableLabel.textContent = 'Time Table';
    }

    document.querySelectorAll('.sidebar-nav .nav-item[data-role="admin"]').forEach(el => {
        el.style.display = isAdmin() ? '' : 'none';
    });

    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin() ? '' : 'none';
    });

    const adminOnlyTabs = ['analytics', 'teachers', 'payments', 'staffattendance'];
    if (isTeacher() && adminOnlyTabs.includes(currentTab)) {
        switchTab('dashboard');
    }
}

// ─── CHANGE PASSWORD (self) ───
function openChangePasswordModal() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPasswordLocal').value = '';
    document.getElementById('confirmPasswordLocal').value = '';
    document.getElementById('changePassError').textContent = '';
    document.getElementById('changePasswordModal').classList.add('active');
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('active');
}

function saveNewPassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPasswordLocal').value;
    const confirm = document.getElementById('confirmPasswordLocal').value;
    const errEl = document.getElementById('changePassError');

    if (!current || !newPass || !confirm) { errEl.textContent = '❌ All fields are required.'; return; }

    if (isAdmin()) {
        if (current !== getAdminPassword()) { errEl.textContent = '❌ Current password is incorrect.'; return; }
        if (newPass.length < 6) { errEl.textContent = '❌ New password must be at least 6 characters.'; return; }
        if (newPass !== confirm) { errEl.textContent = '❌ New passwords do not match.'; return; }
        localStorage.setItem(LOCAL_PASS_KEY, newPass);
    } else {
        const t = getCurrentTeacher();
        if (!t) { errEl.textContent = '❌ Teacher account not found.'; return; }
        if (current !== t.password) { errEl.textContent = '❌ Current password is incorrect.'; return; }
        if (newPass.length < 4) { errEl.textContent = '❌ New password must be at least 4 characters.'; return; }
        if (newPass !== confirm) { errEl.textContent = '❌ New passwords do not match.'; return; }
        t.password = newPass;
        saveToLocal();
    }

    errEl.style.color = '#27ae60';
    errEl.textContent = '✅ Password changed successfully!';
    showToast('✅ Password updated successfully!');

    setTimeout(() => {
        closeChangePasswordModal();
        errEl.style.color = '#e74c3c';
        errEl.textContent = '';
    }, 1500);
}

// ─── ATTENDANCE (STUDENTS) ───
function populateAttendanceClassDropdowns() {
    const selectors = ['attendanceClassSelect', 'attendanceSummaryClass'];
    const sortedNames = sortClassNames([...new Set(getScopedClasses().filter(c => c.status === 'Active').map(c => c.name))].filter(Boolean));

    selectors.forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const cur = sel.value;
        const allOption = selId === 'attendanceSummaryClass'
            ? '<option value="All">All Classes</option>'
            : '<option value="">-- Select Class --</option>';
        sel.innerHTML = allOption;
        sortedNames.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls;
            opt.textContent = cls;
            if (cls === cur) opt.selected = true;
            sel.appendChild(opt);
        });
    });
}

function renderAttendanceGrid() {
    const date = document.getElementById('attendanceDate').value;
    const className = document.getElementById('attendanceClassSelect').value;
    const grid = document.getElementById('attendanceGrid');
    if (!grid) return;

    if (!date || !className) {
        grid.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-clipboard-check"></i><h4>Select a class and date</h4><p>Choose a date and class above to start marking attendance.</p></div>`;
        return;
    }

    const classStudents = students.filter(s => s.class === className && s.status === 'Active');
    if (!classStudents.length) {
        grid.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-users"></i><h4>No students in this class</h4><p>Add students to this class first.</p></div>`;
        return;
    }

    const BASE = 'padding:7px 16px;border-radius:20px;border:2px solid #dfe6e9;cursor:pointer;font-size:0.8rem;font-weight:600;transition:0.15s;';
    const GREEN  = BASE + 'background:#27ae60;color:#fff;border-color:#27ae60;box-shadow:0 4px 12px rgba(39,174,96,0.25);';
    const RED    = BASE + 'background:#e74c3c;color:#fff;border-color:#e74c3c;box-shadow:0 4px 12px rgba(231,76,60,0.25);';
    const ORANGE = BASE + 'background:#f39c12;color:#fff;border-color:#f39c12;box-shadow:0 4px 12px rgba(243,156,18,0.25);';
    const WHITE  = BASE + 'background:#fff;color:#636e72;';

    let html = `<div class="attendance-summary-bar" id="attendanceDaySummary"></div>`;
    html += classStudents.map(s => {
        const rec = attendance.find(a => a.date === date && a.studentId === s.id);
        const status = rec ? rec.status : '';
        return `
            <div class="attendance-row" data-student-id="${s.id}">
                <div class="attendance-row-name">${escapeHtml(s.name)}</div>
                <div class="attendance-status-btns">
                    <button type="button" class="attendance-status-btn" data-status="Present" style="${status === 'Present' ? GREEN : WHITE}">Present</button>
                    <button type="button" class="attendance-status-btn" data-status="Absent"  style="${status === 'Absent'  ? RED   : WHITE}">Absent</button>
                    <button type="button" class="attendance-status-btn" data-status="Late"    style="${status === 'Late'    ? ORANGE: WHITE}">Late</button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;

    grid.querySelectorAll('.attendance-status-btn').forEach(btn => {
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const row = this.closest('.attendance-row');
            if (!row) return;
            const studentId = row.getAttribute('data-student-id');
            const status = this.getAttribute('data-status');
            markAttendance(date, studentId, className, status);
            renderAttendanceGrid();
        };
    });

    updateAttendanceDaySummary(date, className, classStudents);
}

function markAttendance(date, studentId, className, status) {
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : '';
    const existingIdx = attendance.findIndex(a => a.date === date && a.studentId === studentId);
    if (existingIdx !== -1) {
        attendance[existingIdx].status = status;
        attendance[existingIdx].class = className;
    } else {
        attendance.push({
            id: generateId('ATT'),
            date,
            studentId,
            studentName,
            class: className,
            status
        });
    }
    saveToLocal();
    updateAttendanceDaySummary(date, className);
    refreshOpenPerfAttendance(studentId);
    renderAttendanceAnalytics();
}

function updateAttendanceDaySummary(date, className, classStudents) {
    const summaryEl = document.getElementById('attendanceDaySummary');
    if (!summaryEl) return;
    if (!classStudents) classStudents = students.filter(s => s.class === className && s.status === 'Active');

    const todayRecords = attendance.filter(a => a.date === date && a.class === className);
    const present = todayRecords.filter(a => a.status === 'Present').length;
    const absent = todayRecords.filter(a => a.status === 'Absent').length;
    const late = todayRecords.filter(a => a.status === 'Late').length;
    const unmarked = classStudents.length - todayRecords.length;

    summaryEl.innerHTML = `
        <div class="attendance-summary-item"><div class="value" style="color:#27ae60;">${present}</div><div class="label">Present</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#e74c3c;">${absent}</div><div class="label">Absent</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#f39c12;">${late}</div><div class="label">Late</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#95a5a6;">${unmarked}</div><div class="label">Unmarked</div></div>
    `;
}

function markAllPresent() {
    const date = document.getElementById('attendanceDate').value;
    const className = document.getElementById('attendanceClassSelect').value;
    if (!date || !className) { showToast('Please select a class and date first.', true); return; }

    const classStudents = students.filter(s => s.class === className && s.status === 'Active');
    classStudents.forEach(s => markAttendance(date, s.id, className, 'Present'));
    renderAttendanceGrid();
    showToast(`✅ All ${classStudents.length} students marked Present`);
}

function clearAttendanceForDay() {
    const date = document.getElementById('attendanceDate').value;
    const className = document.getElementById('attendanceClassSelect').value;
    if (!date || !className) { showToast('Please select a class and date first.', true); return; }
    if (!confirm('Clear all attendance records for this day?')) return;

    attendance = attendance.filter(a => !(a.date === date && a.class === className));
    saveToLocal();
    renderAttendanceGrid();
    showToast('🗑️ Attendance cleared for this day');

    const perfIdEl = document.getElementById('perfId');
    if (perfIdEl) {
        const sid = perfIdEl.textContent;
        const student = students.find(s => s.id === sid);
        if (student && student.class === className) updateAttendanceDisplay(sid);
    }

    renderAttendanceAnalytics();
}

function renderAttendanceSummary() {
    const classFilter = document.getElementById('attendanceSummaryClass').value || 'All';
    const fromDate = document.getElementById('attendanceFromDate').value;
    const toDate = document.getElementById('attendanceToDate').value;

    let filtered = getScopedAttendance();
    if (classFilter !== 'All') filtered = filtered.filter(a => a.class === classFilter);
    if (fromDate) filtered = filtered.filter(a => a.date >= fromDate);
    if (toDate) filtered = filtered.filter(a => a.date <= toDate);

    const studentStats = {};
    filtered.forEach(a => {
        if (!studentStats[a.studentId]) {
            studentStats[a.studentId] = {
                studentId: a.studentId,
                name: a.studentName,
                class: a.class,
                present: 0,
                absent: 0,
                late: 0,
                total: 0
            };
        }
        studentStats[a.studentId].total++;
        if (a.status === 'Present') studentStats[a.studentId].present++;
        else if (a.status === 'Absent') studentStats[a.studentId].absent++;
        else if (a.status === 'Late') studentStats[a.studentId].late++;
    });

    const tbody = document.getElementById('attendanceSummaryTbody');
    const badge = document.getElementById('attendanceSummaryCount');
    const rows = Object.values(studentStats);

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No attendance records found for the selected filters.</td></tr>';
        badge.innerText = '0';
        return;
    }

    rows.sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));

    tbody.innerHTML = rows.map(r => {
        const pct = r.total > 0 ? ((r.present + r.late) / r.total) * 100 : 0;
        let color;
        if (pct >= 90) color = '#27ae60';
        else if (pct >= 75) color = '#2ecc71';
        else if (pct >= 60) color = '#f39c12';
        else color = '#e74c3c';

        return `<tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td><span class="class-badge">${escapeHtml(r.class)}</span></td>
            <td>${r.total}</td>
            <td style="color:#27ae60;font-weight:600;">${r.present}</td>
            <td style="color:#e74c3c;font-weight:600;">${r.absent}</td>
            <td style="color:#f39c12;font-weight:600;">${r.late}</td>
            <td><span class="attendance-pct-badge" style="background:${color}20;color:${color};">${pct.toFixed(1)}%</span></td>
        </tr>`;
    }).join('');

    badge.innerText = rows.length;
}

function switchAttendanceSubTab(tabId) {
    document.querySelectorAll('#tabAttendance .sub-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`#tabAttendance .sub-tab[data-attendsubtab="${tabId}"]`);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('#tabAttendance .subtab-content').forEach(c => c.classList.remove('active-subtab'));
    const content = document.getElementById(`attendSubtab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (content) content.classList.add('active-subtab');

    if (tabId === 'mark') renderAttendanceGrid();
    else if (tabId === 'summary') renderAttendanceSummary();
}

function getStudentAttendancePct(studentId, fromDate, toDate) {
    let records = attendance.filter(a => a.studentId === studentId);
    if (fromDate) records = records.filter(a => a.date >= fromDate);
    if (toDate) records = records.filter(a => a.date <= toDate);
    if (!records.length) return null;
    const attended = records.filter(a => a.status === 'Present' || a.status === 'Late').length;
    return {
        pct: (attended / records.length) * 100,
        present: records.filter(a => a.status === 'Present').length,
        absent: records.filter(a => a.status === 'Absent').length,
        late: records.filter(a => a.status === 'Late').length,
        total: records.length
    };
}

// ═══════════════════════════════════════════════════════════════
// TEACHER (STAFF) ATTENDANCE
// ═══════════════════════════════════════════════════════════════
function renderStaffAttendanceGrid() {
    const dateEl = document.getElementById('staffAttendanceDate');
    const grid = document.getElementById('staffAttendanceGrid');
    if (!grid || !dateEl) return;

    const date = dateEl.value;
    if (!date) {
        grid.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-user-clock"></i><h4>Select a date</h4><p>Pick a date above to start marking teacher attendance.</p></div>`;
        return;
    }

    if (!teachers.length) {
        grid.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-chalkboard-user"></i><h4>No teachers found</h4><p>Add teachers from <strong>Manage Teachers</strong> first.</p></div>`;
        return;
    }

    const BASE = 'padding:7px 16px;border-radius:20px;border:2px solid #dfe6e9;cursor:pointer;font-size:0.8rem;font-weight:600;transition:0.15s;';
    const GREEN  = BASE + 'background:#27ae60;color:#fff;border-color:#27ae60;box-shadow:0 4px 12px rgba(39,174,96,0.25);';
    const RED    = BASE + 'background:#e74c3c;color:#fff;border-color:#e74c3c;box-shadow:0 4px 12px rgba(231,76,60,0.25);';
    const ORANGE = BASE + 'background:#f39c12;color:#fff;border-color:#f39c12;box-shadow:0 4px 12px rgba(243,156,18,0.25);';
    const WHITE  = BASE + 'background:#fff;color:#636e72;';

    let html = `<div class="attendance-summary-bar" id="staffDaySummary"></div>`;
    html += teachers.map(t => {
        const rec = staffAttendance.find(a => a.date === date && a.teacherId === t.id);
        const status = rec ? rec.status : '';
        return `
            <div class="attendance-row" data-teacher-id="${t.id}">
                <div class="attendance-row-name">
                    ${escapeHtml(t.name)}
                    <span style="font-size:0.75rem;color:#8c7da1;font-weight:400;"> · ${escapeHtml(t.subject || '—')}</span>
                </div>
                <div class="attendance-status-btns">
                    <button type="button" class="attendance-status-btn" data-status="Present" style="${status === 'Present' ? GREEN : WHITE}">Present</button>
                    <button type="button" class="attendance-status-btn" data-status="Absent"  style="${status === 'Absent'  ? RED   : WHITE}">Absent</button>
                    <button type="button" class="attendance-status-btn" data-status="Late"    style="${status === 'Late'    ? ORANGE: WHITE}">Late</button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;

    grid.querySelectorAll('.attendance-status-btn').forEach(btn => {
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const row = this.closest('.attendance-row');
            if (!row) return;
            const teacherId = row.getAttribute('data-teacher-id');
            const status = this.getAttribute('data-status');
            markStaffAttendance(date, teacherId, status);
            renderStaffAttendanceGrid();
        };
    });

    updateStaffDaySummary(date, teachers);
}

function markStaffAttendance(date, teacherId, status) {
    staffAttendance = staffAttendance.filter(
        a => !(a.date === date && a.teacherId === teacherId)
    );

    const teacher = teachers.find(t => t.id === teacherId);
    staffAttendance.push({
        id: generateId('STA'),
        date: date,
        teacherId: teacherId,
        teacherName: teacher ? teacher.name : '',
        status: status
    });

    saveToLocal();
    updateStaffDaySummary(date);
}

function updateStaffDaySummary(date, teacherList) {
    const summaryEl = document.getElementById('staffDaySummary');
    if (!summaryEl) return;
    if (!teacherList) teacherList = teachers;

    const records = staffAttendance.filter(a => a.date === date);
    const present = records.filter(a => a.status === 'Present').length;
    const absent  = records.filter(a => a.status === 'Absent').length;
    const late    = records.filter(a => a.status === 'Late').length;
    const unmarked = teacherList.length - records.length;

    summaryEl.innerHTML = `
        <div class="attendance-summary-item"><div class="value" style="color:#27ae60;">${present}</div><div class="label">Present</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#e74c3c;">${absent}</div><div class="label">Absent</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#f39c12;">${late}</div><div class="label">Late</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#95a5a6;">${unmarked}</div><div class="label">Unmarked</div></div>
    `;
}

function markAllStaffPresent() {
    const date = document.getElementById('staffAttendanceDate').value;
    if (!date) { showToast('Please select a date first.', true); return; }
    if (!teachers.length) { showToast('No teachers to mark.', true); return; }

    teachers.forEach(t => {
        staffAttendance = staffAttendance.filter(
            a => !(a.date === date && a.teacherId === t.id)
        );
        staffAttendance.push({
            id: generateId('STA'),
            date: date,
            teacherId: t.id,
            teacherName: t.name,
            status: 'Present'
        });
    });
    saveToLocal();
    renderStaffAttendanceGrid();
    showToast(`✅ All ${teachers.length} teachers marked Present`);
}

function clearStaffAttendanceForDay() {
    const date = document.getElementById('staffAttendanceDate').value;
    if (!date) { showToast('Please select a date first.', true); return; }
    if (!confirm('Clear all teacher attendance records for this day?')) return;

    staffAttendance = staffAttendance.filter(a => a.date !== date);
    saveToLocal();
    renderStaffAttendanceGrid();

    if (document.getElementById('staffSummaryTbody')) {
        renderStaffAttendanceSummary();
    }

    showToast('🗑️ Teacher attendance cleared for this day');
}

function switchStaffSubTab(tabId) {
    document.querySelectorAll('#tabStaffattendance .sub-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`#tabStaffattendance .sub-tab[data-staffsubtab="${tabId}"]`);
    if (tab) tab.classList.add('active');

    document.querySelectorAll('#tabStaffattendance .subtab-content').forEach(c => c.classList.remove('active-subtab'));
    const content = document.getElementById(`staffSubtab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (content) content.classList.add('active-subtab');

    if (tabId === 'mark') renderStaffAttendanceGrid();
    else if (tabId === 'summary') renderStaffAttendanceSummary();
}

function populateStaffSummaryTeacherDropdown() {
    const sel = document.getElementById('staffSummaryTeacher');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="All">All Teachers</option>';
    teachers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        if (t.id === cur) opt.selected = true;
        sel.appendChild(opt);
    });
}

function renderStaffAttendanceSummary() {
    if (!document.getElementById('staffSummaryTbody')) return;
    populateStaffSummaryTeacherDropdown();

    const teacherFilter = document.getElementById('staffSummaryTeacher').value || 'All';
    const fromDate = document.getElementById('staffSummaryFrom').value;
    const toDate = document.getElementById('staffSummaryTo').value;

    let filtered = [...staffAttendance];
    if (teacherFilter !== 'All') filtered = filtered.filter(a => a.teacherId === teacherFilter);
    if (fromDate) filtered = filtered.filter(a => a.date >= fromDate);
    if (toDate) filtered = filtered.filter(a => a.date <= toDate);

    const stats = {};
    filtered.forEach(a => {
        if (!stats[a.teacherId]) {
            stats[a.teacherId] = { id: a.teacherId, name: a.teacherName, present: 0, absent: 0, late: 0, total: 0 };
        }
        stats[a.teacherId].total++;
        if (a.status === 'Present') stats[a.teacherId].present++;
        else if (a.status === 'Absent') stats[a.teacherId].absent++;
        else if (a.status === 'Late') stats[a.teacherId].late++;
    });

    const tbody = document.getElementById('staffSummaryTbody');
    const badge = document.getElementById('staffSummaryCount');
    const rows = Object.values(stats);

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#95a5a6;">No teacher attendance records found for the selected filters.</td></tr>';
        badge.innerText = '0';
        return;
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = rows.map(r => {
        const pct = r.total > 0 ? ((r.present + r.late) / r.total) * 100 : 0;
        const color = pct >= 90 ? '#27ae60' : pct >= 75 ? '#2ecc71' : pct >= 60 ? '#f39c12' : '#e74c3c';
        const teacher = teachers.find(t => t.id === r.id);
        const subject = teacher ? (teacher.subject || '—') : '—';
        return `<tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td>${escapeHtml(subject)}</td>
            <td>${r.total}</td>
            <td style="color:#27ae60;font-weight:600;">${r.present}</td>
            <td style="color:#e74c3c;font-weight:600;">${r.absent}</td>
            <td style="color:#f39c12;font-weight:600;">${r.late}</td>
            <td><span class="attendance-pct-badge" style="background:${color}20;color:${color};">${pct.toFixed(1)}%</span></td>
        </tr>`;
    }).join('');

    badge.innerText = rows.length;
}

// ─── DASHBOARD WIDGETS ───
// ✅ UPDATED — Using styled span instead of SVG data-URI so the initial letter always renders
function renderEnrollments() {
    const c = document.getElementById('enrollmentsList');
    if (!c) return;
    const scoped = getScopedStudents();
    if (!scoped.length) { c.innerHTML = '<p style="color:#95a5a6;text-align:center;">No enrollments yet</p>'; return; }
    c.innerHTML = scoped.slice(-5).reverse().map(s => {
        const initial = (s.name || '?').charAt(0).toUpperCase();
        return `
        <div class="enrollment-item">
            <div style="display:flex;align-items:center;">
                <div class="enrollment-avatar">
                    <span style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:linear-gradient(135deg,#8e44ad,#6f42c1);">${initial}</span>
                </div>
                <div class="enrollment-info">
                    <h4>${escapeHtml(s.name)}</h4>
                    <p>${escapeHtml(s.class)}</p>
                </div>
            </div>
            <div class="enrollment-date">${s.admissionDate || '—'}</div>
        </div>`;
    }).join('');
}

function renderStaffList() {
    const c = document.getElementById('staffList');
    if (!c) return;
    const scoped = getScopedTeachers();
    if (!scoped.length) { c.innerHTML = '<p style="color:#95a5a6;text-align:center;">No teachers yet</p>'; return; }
    c.innerHTML = scoped.map(t =>
        `<div class="staff-item"><div style="display:flex;align-items:center;"><div class="staff-avatar">${escapeHtml(t.name.charAt(0))}</div><div class="staff-info"><h4>${escapeHtml(t.name)}</h4><p>${escapeHtml(t.subject)}</p></div></div><div class="staff-subject">${t.assignedClass || 'Multiple'}</div></div>`
    ).join('');
}

function updateStats() {
    const scopedStudents = getScopedStudents();
    const scopedClasses = getScopedClasses();

    document.getElementById("totalStudents").innerText = scopedStudents.length;

    if (isAdmin()) {
        document.getElementById("totalTeachers").innerText = teachers.length;
    } else {
        const cardTitle = document.querySelector('#totalTeachers')?.closest('.stat-card')?.querySelector('.stat-card-title');
        if (cardTitle) cardTitle.textContent = 'My Classes';
        document.getElementById("totalTeachers").innerText = scopedClasses.length;
    }

    document.getElementById("totalCourses").innerText = scopedClasses.filter(c => c.status === 'Active').length;

    if (isAdmin()) {
        const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
        document.getElementById("totalMoneyCollected").innerHTML = `GH₵${total.toFixed(2)}`;
    } else {
        const card = document.getElementById('totalMoneyCollected')?.closest('.stat-card');
        if (card) {
            const titleEl = card.querySelector('.stat-card-title');
            const changeEl = card.querySelector('.stat-card-change');
            if (titleEl) titleEl.textContent = 'My Students';
            if (changeEl) changeEl.textContent = 'Across your classes';
        }
        document.getElementById("totalMoneyCollected").innerHTML = scopedStudents.length;
    }
}

function renderStudentStats() {
    const scoped = getScopedStudents();
    document.getElementById('studentMetricTotal').innerText = scoped.length;
    document.getElementById('studentMetricActive').innerText = scoped.filter(s => s.status === 'Active').length;
    document.getElementById('studentMetricMale').innerText = scoped.filter(s => s.gender === 'Male').length;
    document.getElementById('studentMetricFemale').innerText = scoped.filter(s => s.gender === 'Female').length;
}

// ─── CHARTS ───
function renderEnrollmentAnalytics() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('enrollmentChart');
    if (!canvas) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = new Date().getFullYear();
    const counts = months.map((_, idx) => {
        const m = idx + 1;
        return students.filter(s => {
            if (!s.admissionDate) return false;
            const d = new Date(s.admissionDate);
            return d.getFullYear() === year && d.getMonth() + 1 === m;
        }).length;
    });
    if (enrollmentChart) enrollmentChart.destroy();
    const ctx = canvas.getContext('2d');
    enrollmentChart = new Chart(ctx, {
        type: 'line',
        data: { labels: months, datasets: [{ label: 'New Enrollments', data: counts,
                borderColor: schoolSettings.primaryColor || '#8e44ad',
                backgroundColor: 'rgba(142,68,173,0.1)', tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function renderRevenueAnalytics() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = new Date().getFullYear();
    const rev = months.map((_, idx) => {
        const m = idx + 1;
        return payments.filter(p => {
            if (!p.date) return false;
            const d = new Date(p.date);
            return d.getFullYear() === year && d.getMonth() + 1 === m;
        }).reduce((s, p) => s + p.amount, 0);
    });
    if (revenueChart) revenueChart.destroy();
    const ctx = canvas.getContext('2d');
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: { labels: months, datasets: [{ label: 'Revenue (GHS)', data: rev,
                borderColor: '#27ae60', backgroundColor: 'rgba(39,174,96,0.1)', tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

function renderClassDistribution() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('classDistributionChart');
    if (!canvas) return;
    const levels = { 'Nursery': 0, 'Kindergarten': 0, 'KG': 0, 'Primary': 0, 'Junior High School': 0 };
    students.forEach(s => {
        const cls = s.class.toLowerCase();
        if (cls.includes('nursery')) levels['Nursery']++;
        else if (cls.includes('kg') && !cls.includes('kindergarten')) levels['KG']++;
        else if (cls.includes('kindergarten')) levels['Kindergarten']++;
        else if (cls.includes('primary')) levels['Primary']++;
        else if (cls.includes('jhs')) levels['Junior High School']++;
        else levels['Primary']++;
    });
    if (classDistChart) classDistChart.destroy();
    const ctx = canvas.getContext('2d');
    classDistChart = new Chart(ctx, {
        type: 'pie',
        data: { labels: Object.keys(levels), datasets: [{ data: Object.values(levels),
                backgroundColor: ['#3498db', '#f1c40f', '#ffeb3b', '#2ecc71', '#e74c3c'] }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function renderPaymentMethodDistribution() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('paymentMethodChart');
    if (!canvas) return;

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
        if (paymentMethodChart) paymentMethodChart.destroy();
        const ctx = canvas.getContext('2d');
        paymentMethodChart = new Chart(ctx, {
            type: 'pie',
            data: { labels: ['No Payments'], datasets: [{ data: [1], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true }
        });
        return;
    }

    if (paymentMethodChart) paymentMethodChart.destroy();
    const ctx = canvas.getContext('2d');
    paymentMethodChart = new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data,
                backgroundColor: palette.slice(0, labels.length) }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.label}: GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

function renderRevenueExpenseChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('revenueExpenseChart');
    if (!canvas) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = new Date().getFullYear();
    const revData = months.map((_, idx) => {
        const m = idx + 1;
        return payments.filter(p => {
            if (!p.date) return false;
            const d = new Date(p.date);
            return d.getFullYear() === year && d.getMonth() + 1 === m;
        }).reduce((s, p) => s + p.amount, 0);
    });
    const expData = months.map((_, idx) => {
        const m = idx + 1;
        return expenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() + 1 === m;
        }).reduce((s, e) => s + e.amount, 0);
    });
    if (revenueExpenseChart) revenueExpenseChart.destroy();
    const ctx = canvas.getContext('2d');
    revenueExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: months, datasets: [
            { label: 'Revenue (GHS)', data: revData, backgroundColor: 'rgba(39,174,96,0.7)', borderColor: '#27ae60', borderWidth: 2 },
            { label: 'Expenses (GHS)', data: expData, backgroundColor: 'rgba(231,76,60,0.7)', borderColor: '#e74c3c', borderWidth: 2 }
        ] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } } } }
    });
}

function renderSubjectPerformanceChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('subjectPerformanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (subjectPerformanceChart) subjectPerformanceChart.destroy();

    if (!subjects.length) {
        subjectPerformanceChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Subjects'], datasets: [{ label: 'Average Grade (%)', data: [0], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } } }
        });
        return;
    }

    const subjectNames = subjects.map(s => s.name);
    const subjectGrades = subjectNames.map(subject => {
        const subjectExams = exams.filter(e => e.subject === subject);
        if (!subjectExams.length) return 0;
        let totalScore = 0, totalMax = 0, count = 0;
        subjectExams.forEach(exam => {
            const grades = examGrades.filter(g => g.examId === exam.id);
            grades.forEach(g => { totalScore += g.score; totalMax += exam.maxScore || 100; count++; });
        });
        if (count === 0) return 0;
        return (totalScore / totalMax) * 100;
    });

    const colors = ['#3498db','#2ecc71','#f39c12','#e74c3c','#9b59b6','#1abc9c','#e67e22','#2c3e50','#7f8c8d','#16a085'];
    const bgColors = subjectGrades.map((_, i) => colors[i % colors.length]);

    subjectPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: subjectNames, datasets: [{ label: 'Average Grade (%)', data: subjectGrades, backgroundColor: bgColors, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } }, legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } } }
    });
}

function renderBudgetUtilizationChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('budgetUtilizationChart');
    if (!canvas) return;
    if (!budgets.length) {
        if (budgetUtilizationChart) budgetUtilizationChart.destroy();
        const ctx = canvas.getContext('2d');
        budgetUtilizationChart = new Chart(ctx, {
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
    if (budgetUtilizationChart) budgetUtilizationChart.destroy();
    const ctx = canvas.getContext('2d');
    const colors = ['#3498db','#2ecc71','#f39c12','#e74c3c','#9b59b6','#1abc9c','#e67e22','#2c3e50'];
    budgetUtilizationChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: used, backgroundColor: colors.slice(0, labels.length), borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(1)}% utilized` } } } }
    });
}

function renderRevenueByCategoryChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('revenueByCategoryChart');
    if (!canvas) return;
    if (revenueByCategoryChart) revenueByCategoryChart.destroy();

    const cats = {};
    payments.forEach(p => {
        const cat = feeCategories.find(c => c.id === p.feeCategoryId);
        const name = cat ? cat.name : 'Uncategorized';
        cats[name] = (cats[name] || 0) + (p.amount || 0);
    });

    const labels = Object.keys(cats);
    const data = Object.values(cats);
    const palette = ['#3498db','#2ecc71','#f39c12','#e74c3c','#9b59b6','#1abc9c','#e67e22','#2c3e50','#7f8c8d'];
    const ctx = canvas.getContext('2d');

    if (!labels.length) {
        revenueByCategoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    revenueByCategoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: GH₵${ctx.raw.toFixed(2)}` } }
            }
        }
    });
}

function renderTermRevenueChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('termRevenueChart');
    if (!canvas) return;
    if (termRevenueChart) termRevenueChart.destroy();

    const groups = {};
    payments.forEach(p => {
        if (!p.yearId || !p.termId) return;
        const key = `${p.yearId}|${p.termId}`;
        groups[key] = (groups[key] || 0) + (p.amount || 0);
    });

    const sortedKeys = Object.keys(groups).sort();
    const labels = sortedKeys.map(k => {
        const [yId, tId] = k.split('|');
        const y = academicYears.find(a => a.id === yId)?.name || '?';
        const t = terms.find(t => t.id === tId)?.name || '?';
        return `${y} ${t}`;
    });
    const data = sortedKeys.map(k => groups[k]);
    const ctx = canvas.getContext('2d');

    if (!labels.length) {
        termRevenueChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ data: [0], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    termRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (GH₵)',
                data,
                backgroundColor: '#8e44ad',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'GH₵' + v } } }
        }
    });
}

function renderArrearsByClassChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('arrearsByClassChart');
    if (!canvas) return;
    if (arrearsByClassChart) arrearsByClassChart.destroy();

    const classArrears = {};
    students.filter(s => s.status === 'Active').forEach(s => {
        const info = getStudentFeeDetails(s.id, '', '');
        const paid = getStudentTotalPaid(s.name, '', '');
        const bal = info.totalDue - paid;
        if (bal > 0) classArrears[s.class] = (classArrears[s.class] || 0) + bal;
    });

    const labels = sortClassNames(Object.keys(classArrears));
    const data = labels.map(l => classArrears[l]);
    const ctx = canvas.getContext('2d');

    if (!labels.length) {
        arrearsByClassChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Arrears'], datasets: [{ data: [0], backgroundColor: ['#27ae60'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    arrearsByClassChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Outstanding (GH₵)',
                data,
                backgroundColor: '#e74c3c',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `GH₵${ctx.raw.toFixed(2)}` } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'GH₵' + v } } }
        }
    });
}

function renderFeeCollectionProgressChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('feeCollectionProgressChart');
    if (!canvas) return;
    if (feeCollectionProgressChart) feeCollectionProgressChart.destroy();

    const classStats = {};
    students.filter(s => s.status === 'Active').forEach(s => {
        const info = getStudentFeeDetails(s.id, '', '');
        const paid = getStudentTotalPaid(s.name, '', '');
        if (!classStats[s.class]) classStats[s.class] = { due: 0, paid: 0 };
        classStats[s.class].due += info.totalDue || 0;
        classStats[s.class].paid += Math.min(paid, info.totalDue || 0);
    });

    const labels = sortClassNames(Object.keys(classStats));
    const ctx = canvas.getContext('2d');

    if (!labels.length) {
        feeCollectionProgressChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ data: [0], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    const collectedData   = labels.map(c => classStats[c].paid);
    const outstandingData = labels.map(c => Math.max(classStats[c].due - classStats[c].paid, 0));

    feeCollectionProgressChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Collected (GH₵)',
                    data: collectedData,
                    backgroundColor: '#27ae60',
                    borderRadius: 4
                },
                {
                    label: 'Outstanding (GH₵)',
                    data: outstandingData,
                    backgroundColor: '#e74c3c',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: GH₵${ctx.raw.toFixed(2)}` } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'GH₵' + v } } }
        }
    });
}

function renderSubjectPerformanceDetailedChart() {
    if (!isAdmin()) return;
    const canvas = document.getElementById('subjectPerformanceChartDetailed');
    if (!canvas) return;
    if (subjectPerformanceDetailedChart) subjectPerformanceDetailedChart.destroy();

    const subjectStats = {};
    examGrades.forEach(g => {
        const exam = exams.find(e => e.id === g.examId);
        if (!exam) return;
        const max = exam.maxScore || 100;
        const pct = (g.score / max) * 100;
        if (!subjectStats[exam.subject]) subjectStats[exam.subject] = { totalPct: 0, count: 0, passed: 0 };
        subjectStats[exam.subject].totalPct += pct;
        subjectStats[exam.subject].count++;
        if (pct >= 50) subjectStats[exam.subject].passed++;
    });

    const labels = Object.keys(subjectStats);
    const ctx = canvas.getContext('2d');

    if (!labels.length) {
        subjectPerformanceDetailedChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ data: [0], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    const avgData      = labels.map(s => subjectStats[s].count > 0 ? subjectStats[s].totalPct / subjectStats[s].count : 0);
    const passRateData = labels.map(s => subjectStats[s].count > 0 ? (subjectStats[s].passed / subjectStats[s].count) * 100 : 0);

    subjectPerformanceDetailedChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Average Score (%)', data: avgData,      backgroundColor: '#3498db', borderRadius: 4 },
                { label: 'Pass Rate (%)',     data: passRateData, backgroundColor: '#27ae60', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` } }
            },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// SMART ANALYTICS — Insights + Decision lists
// ═══════════════════════════════════════════════════════════════
function updateAnalyticsInsights() {
    if (!isAdmin()) return;

    const totalRev = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netIncome = totalRev - totalExp;

    const rEl = document.getElementById('insightRevenue');
    if (rEl) rEl.textContent = 'GH₵' + totalRev.toFixed(2);

    const eEl = document.getElementById('insightExpenses');
    if (eEl) eEl.textContent = 'GH₵' + totalExp.toFixed(2);

    const nEl = document.getElementById('insightNetIncome');
    if (nEl) {
        nEl.textContent = 'GH₵' + netIncome.toFixed(2);
        nEl.style.color = netIncome >= 0 ? '#27ae60' : '#e74c3c';
    }

    let totalExpected = 0;
    let totalOutstanding = 0;
    students.filter(s => s.status === 'Active').forEach(s => {
        const info = getStudentFeeDetails(s.id, '', '');
        const paid = getStudentTotalPaid(s.name, '', '');
        totalExpected += info.totalDue || 0;
        if (info.totalDue > paid) totalOutstanding += (info.totalDue - paid);
    });

    const oEl = document.getElementById('insightOutstanding');
    if (oEl) oEl.textContent = 'GH₵' + totalOutstanding.toFixed(2);

    const collectionRate = totalExpected > 0
        ? ((totalExpected - totalOutstanding) / totalExpected) * 100
        : 0;
    const cEl = document.getElementById('insightCollectionRate');
    if (cEl) {
        cEl.textContent = collectionRate.toFixed(0) + '%';
        cEl.style.color = collectionRate >= 80 ? '#27ae60'
                        : collectionRate >= 60 ? '#f39c12'
                        : '#e74c3c';
    }

    const activeStudents = students.filter(s => s.status === 'Active').length;
    const sEl = document.getElementById('insightStudents');
    if (sEl) sEl.textContent = activeStudents;

    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyAgo  = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentRev = payments.filter(p => p.date && new Date(p.date) >= thirtyAgo)
                              .reduce((s, p) => s + (p.amount || 0), 0);
    const olderRev  = payments.filter(p => p.date && new Date(p.date) >= sixtyAgo && new Date(p.date) < thirtyAgo)
                              .reduce((s, p) => s + (p.amount || 0), 0);
    const revTrend = olderRev > 0 ? ((recentRev - olderRev) / olderRev) * 100
                    : (recentRev > 0 ? 100 : 0);
    const rtEl = document.getElementById('insightRevenueTrend');
    if (rtEl) {
        rtEl.textContent = (revTrend >= 0 ? '↑ ' : '↓ ') + Math.abs(revTrend).toFixed(0) + '%';
        rtEl.className = 'insight-trend ' + (revTrend >= 0 ? 'up' : 'down');
    }

    const recentExp = expenses.filter(e => e.date && new Date(e.date) >= thirtyAgo)
                              .reduce((s, e) => s + (e.amount || 0), 0);
    const olderExp  = expenses.filter(e => e.date && new Date(e.date) >= sixtyAgo && new Date(e.date) < thirtyAgo)
                              .reduce((s, e) => s + (e.amount || 0), 0);
    const expTrend = olderExp > 0 ? ((recentExp - olderExp) / olderExp) * 100
                    : (recentExp > 0 ? 100 : 0);
    const etEl = document.getElementById('insightExpenseTrend');
    if (etEl) {
        etEl.textContent = (expTrend >= 0 ? '↑ ' : '↓ ') + Math.abs(expTrend).toFixed(0) + '%';
        etEl.className = 'insight-trend ' + (expTrend <= 0 ? 'up' : 'down');
    }

    const recentStudents = students.filter(s => s.admissionDate &&
        new Date(s.admissionDate) >= thirtyAgo).length;
    const stEl = document.getElementById('insightStudentTrend');
    if (stEl) {
        stEl.textContent = (recentStudents > 0 ? '↑ ' : '') +
            (recentStudents > 0 ? recentStudents + ' new' : 'No change');
        stEl.className = 'insight-trend ' + (recentStudents > 0 ? 'up' : 'neutral');
    }

    updateAcademicInsights();
    updateDecisionInsights();
}

function updateAcademicInsights() {
    const container = document.getElementById('academicInsightsList');
    if (!container) return;

    const items = [];

    if (exams.length && examGrades.length) {
        const classScores = {};
        examGrades.forEach(g => {
            const exam = exams.find(e => e.id === g.examId);
            if (!exam) return;
            if (!classScores[exam.class]) classScores[exam.class] = { total: 0, max: 0 };
            classScores[exam.class].total += g.score;
            classScores[exam.class].max += exam.maxScore || 100;
        });
        const ranked = Object.entries(classScores)
            .map(([cls, d]) => ({ cls, avg: d.max > 0 ? (d.total / d.max) * 100 : 0 }))
            .sort((a, b) => b.avg - a.avg);

        if (ranked.length) {
            items.push({
                icon: 'green', fa: 'check',
                title: 'Top Class Performance',
                desc: `${ranked[0].cls} has the highest average at ${ranked[0].avg.toFixed(1)}%`
            });
            if (ranked.length > 1) {
                items.push({
                    icon: 'orange', fa: 'exclamation-triangle',
                    title: 'Needs Improvement',
                    desc: `${ranked[ranked.length - 1].cls} has the lowest average at ${ranked[ranked.length - 1].avg.toFixed(1)}%`
                });
            }
        }

        const studentAvg = {};
        examGrades.forEach(g => {
            const exam = exams.find(e => e.id === g.examId);
            if (!exam) return;
            if (!studentAvg[g.studentId]) studentAvg[g.studentId] = { total: 0, max: 0 };
            studentAvg[g.studentId].total += g.score;
            studentAvg[g.studentId].max += exam.maxScore || 100;
        });
        const top = Object.entries(studentAvg)
            .map(([id, d]) => ({ id, avg: d.max > 0 ? (d.total / d.max) * 100 : 0 }))
            .sort((a, b) => b.avg - a.avg)[0];

        if (top) {
            const s = students.find(st => st.id === top.id);
            if (s) {
                items.push({
                    icon: 'purple', fa: 'star',
                    title: 'Top Performer',
                    desc: `${s.name} – ${top.avg.toFixed(1)}% overall average`
                });
            }
        }
    }

    if (!items.length) {
        items.push({
            icon: 'purple', fa: 'info-circle',
            title: 'No Data Yet',
            desc: 'Record exam grades to see academic insights.'
        });
    }

    container.innerHTML = items.map(i => `
        <div class="decision-item">
            <div class="decision-icon ${i.icon}"><i class="fas fa-${i.fa}"></i></div>
            <div class="decision-text">
                <div class="title">${escapeHtml(i.title)}</div>
                <div class="desc">${escapeHtml(i.desc)}</div>
            </div>
        </div>
    `).join('');
}

function updateDecisionInsights() {
    const container = document.getElementById('decisionInsightsList');
    if (!container) return;

    const items = [];
    const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentStudents = students.filter(s =>
        s.admissionDate && new Date(s.admissionDate) >= thirtyAgo).length;
    if (recentStudents > 0) {
        items.push({
            icon: 'green', fa: 'check-circle',
            title: 'Enrollment Growth',
            desc: `+${recentStudents} new student${recentStudents > 1 ? 's' : ''} this month.`,
            action: 'Act', tab: 'students'
        });
    }

    budgets.forEach(b => {
        const spent = expenses.filter(e => e.category === b.category)
                              .reduce((s, e) => s + e.amount, 0);
        const pct = b.allocated > 0 ? (spent / b.allocated) * 100 : 0;
        if (pct >= 80) {
            items.push({
                icon: 'orange', fa: 'coins',
                title: 'Budget Alert',
                desc: `${b.category} budget at ${pct.toFixed(0)}% usage.`,
                action: 'Review', tab: 'payments'
            });
        }
    });

    let totalOutstanding = 0;
    students.filter(s => s.status === 'Active').forEach(s => {
        const info = getStudentFeeDetails(s.id, '', '');
        const paid = getStudentTotalPaid(s.name, '', '');
        if (info.totalDue > paid) totalOutstanding += (info.totalDue - paid);
    });
    if (totalOutstanding > 0) {
        items.push({
            icon: 'orange', fa: 'exclamation-circle',
            title: 'Outstanding Fees',
            desc: `GH₵${totalOutstanding.toFixed(2)} still owed by students.`,
            action: 'Review', tab: 'payments'
        });
    }

    if (teachers.length > 0) {
        const assigned = teachers.filter(t => t.assignedClass && t.assignedClass.trim()).length;
        items.push({
            icon: 'purple', fa: 'users',
            title: 'Staff Engagement',
            desc: `${assigned} of ${teachers.length} teachers have assigned classes.`,
            action: 'View', tab: 'teachers'
        });
    }

    if (!items.length) {
        items.push({
            icon: 'green', fa: 'check-circle',
            title: 'All Systems Good',
            desc: 'No urgent actions required at this time.'
        });
    }

    container.innerHTML = items.slice(0, 4).map(i => `
        <div class="decision-item">
            <div class="decision-icon ${i.icon}"><i class="fas fa-${i.fa}"></i></div>
            <div class="decision-text">
                <div class="title">${escapeHtml(i.title)}</div>
                <div class="desc">${escapeHtml(i.desc)}</div>
            </div>
            ${i.action ? `<button class="decision-action" onclick="switchTab('${i.tab}')">${i.action}</button>` : ''}
        </div>
    `).join('');
}

// ─── CLASS MANAGEMENT ───
function renderClassMetrics() {
    const scoped = getScopedClasses();
    const total = scoped.length;
    const active = scoped.filter(c => c.status === 'Active').length;
    const studentCount = getScopedStudents().filter(s => s.status === 'Active').length;
    const avg = total > 0 ? Math.round(studentCount / total) : 0;

    document.getElementById('classTotalCount').innerText = total;
    document.getElementById('classActiveCount').innerText = active;
    document.getElementById('classTotalStudents').innerText = studentCount;
    document.getElementById('classAvgSize').innerText = avg;
}

function renderClassCards() {
    const container = document.getElementById('classGroupsContainer');
    if (!container) return;

    const levelOrder = ['Nursery', 'Kindergarten', 'KG', 'Primary', 'Junior High School'];
    const levelIcons = { 'Nursery': '🧸', 'Kindergarten': '🎨', 'KG': '🌈', 'Primary': '📚', 'Junior High School': '🎓' };

    let filtered = getScopedClasses().filter(c => {
        const matchName = c.name.toLowerCase().includes(classSearch.toLowerCase());
        const matchLevel = classLevelFilter === 'All' || c.level === classLevelFilter;
        return matchName && matchLevel;
    });

    const sorted = [...filtered].sort(sortClasses);

    if (!getScopedClasses().length) {
        container.innerHTML = `<div class="no-classes-message"><i class="fas fa-book-open"></i><h3>No Classes Yet</h3><p>${isAdmin() ? 'Click "Add Class" to create your first class.' : 'You have no classes assigned.'}</p>${isAdmin() ? '<button class="add-btn" onclick="openAddClass()"><i class="fas fa-plus-circle"></i> Add Class</button>' : ''}</div>`;
        return;
    }

    let html = '';
    let hasVisibleClasses = false;

    levelOrder.forEach(level => {
        const levelClasses = sorted.filter(c => c.level === level);
        if (levelClasses.length === 0) return;
        hasVisibleClasses = true;

        let totalStudents = 0;
        levelClasses.forEach(c => {
            totalStudents += students.filter(s => s.class === c.name && s.status === 'Active').length;
        });

        html += `
            <div class="class-group" data-level="${level}">
                <div class="class-group-header" onclick="toggleClassGroup(this)">
                    <div class="group-title">
                        <span class="level-icon">${levelIcons[level] || '📂'}</span>
                        ${escapeHtml(level)}
                        <span class="group-badge">${levelClasses.length} class${levelClasses.length > 1 ? 'es' : ''} · ${totalStudents} student${totalStudents !== 1 ? 's' : ''}</span>
                    </div>
                    <span class="group-toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="class-group-body">
                    <div class="class-cards-grid">
                        ${levelClasses.map(c => {
                            const classStudents = students.filter(s => s.class === c.name && s.status === 'Active');
                            const count = classStudents.length;
                            const pct = c.capacity > 0 ? Math.min((count / c.capacity) * 100, 100) : 0;
                            const pctColor = pct > 90 ? '#e74c3c' : pct > 70 ? '#f39c12' : '#27ae60';
                            let levelClass = 'class-level-primary';
                            if (c.level === 'Nursery') levelClass = 'class-level-nursery';
                            else if (c.level === 'Kindergarten') levelClass = 'class-level-kindergarten';
                            else if (c.level === 'KG') levelClass = 'class-level-kg';
                            else if (c.level === 'Junior High School') levelClass = 'class-level-jhs';

                            return `
                                <div class="class-card">
                                    <div class="class-card-header">
                                        <div class="class-card-title">
                                            ${escapeHtml(c.name)}
                                            <span class="class-level-badge ${levelClass}">${escapeHtml(c.level)}</span>
                                        </div>
                                        <span class="class-card-status ${c.status === 'Active' ? 'active' : 'inactive'}">${c.status}</span>
                                    </div>
                                    <div class="class-card-meta">
                                        <span><i class="fas fa-user-graduate"></i> ${count} / ${c.capacity}</span>
                                        <span><i class="fas fa-percent"></i> ${pct.toFixed(0)}% filled</span>
                                    </div>
                                    <div class="class-card-progress">
                                        <div class="progress-label"><span>Capacity</span><span>${pct.toFixed(0)}%</span></div>
                                        <div class="progress-bar"><div class="fill" style="width:${pct}%;background:${pctColor};"></div></div>
                                    </div>
                                    <div class="class-card-students">
                                        <div class="class-card-students-title"><span>👨‍🎓 Enrolled</span><span style="font-weight:400;color:#8c7da1;">${count} student${count !== 1 ? 's' : ''}</span></div>
                                        <div class="class-card-student-count">
                                            <i class="fas fa-users"></i>
                                            <span class="count-number">${count}</span>
                                            <span style="font-weight:400;color:#8c7da1;font-size:0.8rem;">enrolled</span>
                                        </div>
                                    </div>
                                    <div class="class-card-actions">
                                        <button class="btn-students" onclick="showClassRegister('${c.id}')"><i class="fas fa-users"></i> View</button>
                                        ${isAdmin() ? `<button class="btn-edit" onclick="openEditClass('${c.id}')"><i class="fas fa-edit"></i></button>
                                        <button class="btn-delete" onclick="deleteClassById('${c.id}')"><i class="fas fa-trash-alt"></i></button>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    if (!hasVisibleClasses) {
        container.innerHTML = `<div class="no-classes-message" style="margin-top:20px;"><i class="fas fa-search"></i><h3>No Classes Found</h3><p>Try adjusting your search or filter criteria.</p></div>`;
        return;
    }

    container.innerHTML = html;
}

function toggleClassGroup(header) {
    const group = header.closest('.class-group');
    if (!group) return;
    const body = group.querySelector('.class-group-body');
    const toggle = group.querySelector('.group-toggle');
    if (!body || !toggle) return;
    body.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
}

// ─── CLASS VIEW ───
function showClassRegister(classId) {
    try {
        const cls = classes.find(c => c.id === classId);
        if (!cls) { showToast('Class not found.', true); return; }

        if (isTeacher() && !getScopedClassNames().includes(cls.name)) {
            showToast('You do not have access to this class.', true);
            return;
        }

        currentRegisterClassId = classId;
        if (document.getElementById('registerClassName')) document.getElementById('registerClassName').innerText = cls.name;
        if (document.getElementById('classStudentListName')) document.getElementById('classStudentListName').innerText = cls.name;
        if (document.getElementById('classExamClassName')) document.getElementById('classExamClassName').innerText = cls.name;
        if (document.getElementById('registerSubtitle')) document.getElementById('registerSubtitle').innerText = `Manage students and exams for ${cls.name}`;
        if (document.getElementById('classGroupsContainer')) document.getElementById('classGroupsContainer').style.display = 'none';
        if (document.getElementById('classMetricsRow')) document.getElementById('classMetricsRow').style.display = 'none';
        if (document.getElementById('classRegisterView')) document.getElementById('classRegisterView').style.display = 'block';

        switchViewTab('students');
        renderClassStudents();
        renderClassExams();
    } catch (e) {
        console.error('Error opening class view:', e);
        showToast('Error opening class view. Please try again.', true);
    }
}

function backToClasses() {
    if (document.getElementById('classRegisterView')) document.getElementById('classRegisterView').style.display = 'none';
    if (document.getElementById('classGroupsContainer')) document.getElementById('classGroupsContainer').style.display = 'block';
    if (document.getElementById('classMetricsRow')) document.getElementById('classMetricsRow').style.display = 'grid';
    currentRegisterClassId = null;
    closeClassGradeEntry();
    closeClassExamReport();
}

function switchViewTab(tabId) {
    currentViewTab = tabId;
    document.querySelectorAll('.class-view-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.class-view-tab[data-viewtab="${tabId}"]`);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('.class-view-tab-content').forEach(c => c.classList.remove('active'));
    const content = document.getElementById(`viewTab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (content) content.classList.add('active');

    if (tabId === 'students') renderClassStudents();
    else if (tabId === 'exams') renderClassExams();
}

function renderClassStudents() {
    const classId = currentRegisterClassId;
    if (!classId) return;
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    const classStudents = students.filter(s => s.class === cls.name && s.status === 'Active');
    const tbody = document.getElementById('classStudentTbody');
    const badge = document.getElementById('classStudentCountBadge');

    if (!classStudents.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">No students enrolled in this class.</td></tr>`;
        badge.innerText = '0';
        return;
    }

    tbody.innerHTML = classStudents.map((s, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td>${s.age || '—'}</td>
            <td>${escapeHtml(s.gender || '—')}</td>
            <td>${formatDate(s.admissionDate)}</td>
            <td><button class="add-btn" style="background:#2980b9;padding:6px 14px;font-size:0.75rem;" onclick="openPerformanceModal('${s.id}')"><i class="fas fa-chart-line"></i> View Performance</button></td>
        </tr>
    `).join('');

    badge.innerText = classStudents.length;
}

function renderClassExams() {
    const classId = currentRegisterClassId;
    if (!classId) return;
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    const classExams = exams.filter(e => e.class === cls.name);
    const container = document.getElementById('classExamList');
    const badge = document.getElementById('classExamListBadge');
    const countBadge = document.getElementById('classExamCount');

    if (badge) badge.innerText = classExams.length;
    if (countBadge) countBadge.innerText = classExams.length;

    if (!classExams.length) {
        if (container) container.innerHTML = `<div class="no-exam-data-msg" style="padding:20px;"><i class="fas fa-file-alt"></i><h4>No exams created yet</h4><p>Click "Create Exam" to add an exam for this class.</p></div>`;
        return;
    }

    if (container) {
        container.innerHTML = classExams.map(exam => {
            const status = getExamStatus(exam);
            const hasGrades = examGrades.some(g => g.examId === exam.id);
            const gradeCount = examGrades.filter(g => g.examId === exam.id).length;
            const statusColor = status === 'Upcoming' ? '#f39c12' : status === 'Ongoing' ? '#27ae60' : '#3498db';
            const termName = terms.find(t => t.id === exam.termId)?.name || '—';
            return `
                <div class="exam-row">
                    <div>
                        <div class="exam-name">${escapeHtml(exam.name)}</div>
                        <div class="exam-meta">
                            ${escapeHtml(exam.subject)} · ${formatDate(exam.date)} · Max: ${exam.maxScore} · Term: ${termName}
                            <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${statusColor};color:#fff;font-size:0.7rem;margin-left:6px;">${status}</span>
                            ${hasGrades ? `<span style="font-size:0.7rem;color:#8c7da1;margin-left:6px;">${gradeCount} grades</span>` : ''}
                        </div>
                    </div>
                    <div class="exam-actions">
                        ${status !== 'Upcoming' ? `<button class="grade-btn" onclick="openClassGradeEntry('${exam.id}')"><i class="fas fa-pencil-alt"></i> Grades</button>` : ''}
                        <button class="report-btn" onclick="openClassExamReport('${exam.id}')"><i class="fas fa-chart-bar"></i> Report</button>
                        <button class="delete-btn" onclick="deleteClassExam('${exam.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function openAddExamForClass() {
    const classId = currentRegisterClassId;
    if (!classId) { showToast('No class selected.', true); return; }
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    document.getElementById('examId').value = '';
    document.getElementById('examName').value = '';
    document.getElementById('examSubject').value = '';
    document.getElementById('examTerm').value = '';
    document.getElementById('examDate').value = getLocalDateString();
    document.getElementById('examMaxScore').value = '';
    document.getElementById('examType').value = 'Individual Test';
    document.getElementById('examDescription').value = '';

    populateExamDropdowns();
    populateTermDropdowns();
    const classSel = document.getElementById('examClass');
    if (classSel) {
        for (let opt of classSel.options) {
            if (opt.value === cls.name) { opt.selected = true; break; }
        }
    }
    document.getElementById('examModalTitle').innerText = 'Create Exam for ' + cls.name;
    document.getElementById('examModal').classList.add('active');
}

function deleteClassExam(examId) {
    if (confirm('Delete this exam and all associated grades?')) {
        exams = exams.filter(e => e.id !== examId);
        examGrades = examGrades.filter(g => g.examId !== examId);
        saveToLocal();
        renderClassExams();
        renderExams();
        renderExamAnalytics();
        if (classExamIdForGrades === examId) closeClassGradeEntry();
        if (classExamIdForReport === examId) closeClassExamReport();
        showToast('Exam deleted');
    }
}

function openClassGradeEntry(examId) {
    const exam = exams.find(e => e.id === examId);
    if (!exam) { showToast('Exam not found.', true); return; }
    closeClassExamReport();
    classExamIdForGrades = examId;
    document.getElementById('classGradeExamName').innerText = exam.name;

    const classStudents = students.filter(s => s.class === exam.class && s.status === 'Active');
    if (!classStudents.length) { showToast('No students enrolled in this class.', true); return; }

    const tbody = document.getElementById('classGradeEntryTbody');
    let html = '';
    classStudents.forEach((s, idx) => {
        const existing = examGrades.find(g => g.examId === examId && g.studentId === s.id);
        const score = existing ? existing.score : '';
        const grade = existing ? getGrade(existing.score, exam.maxScore) : '—';
        const gradeClass = existing ? getGradeClass(grade) : '';
        html += `<tr data-student-id="${s.id}">
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td><input type="number" class="exam-grade-input class-grade-input" data-student-id="${s.id}" value="${score}" min="0" max="${exam.maxScore}" step="0.5" placeholder="Score" /></td>
            <td><span class="grade-range ${gradeClass}">${grade}</span></td>
        </tr>`;
    });

    tbody.innerHTML = html;
    document.getElementById('classGradeEntryCount').innerText = classStudents.length + ' students';

    document.querySelectorAll('#classGradeEntryTbody .class-grade-input').forEach(input => {
        input.onchange = function() {
            const studentId = this.dataset.studentId;
            const val = parseFloat(this.value);
            const tr = this.closest('tr');
            const gradeCell = tr.querySelector('td:last-child span');
            if (!isNaN(val) && val >= 0 && val <= exam.maxScore) {
                const existingIndex = examGrades.findIndex(g => g.examId === examId && g.studentId === studentId);
                if (existingIndex !== -1) examGrades[existingIndex].score = val;
                else examGrades.push({ id: generateId('EG'), examId, studentId, score: val });
                saveToLocal();
                const grade = getGrade(val, exam.maxScore);
                gradeCell.textContent = grade;
                gradeCell.className = `grade-range ${getGradeClass(grade)}`;
                this.classList.add('saved');
                showToast('Grade saved for ' + tr.querySelector('td:nth-child(2) strong').textContent);
                renderClassExams();
                renderExams();
                renderExamAnalytics();
            } else if (this.value === '') {
                const idx = examGrades.findIndex(g => g.examId === examId && g.studentId === studentId);
                if (idx !== -1) {
                    examGrades.splice(idx, 1);
                    saveToLocal();
                    gradeCell.textContent = '—';
                    gradeCell.className = 'grade-range';
                    this.classList.remove('saved');
                }
            } else {
                showToast('Invalid score. Must be between 0 and ' + exam.maxScore, true);
                this.value = '';
            }
        };
    });

    const searchInput = document.getElementById('classGradeSearch');
    searchInput.oninput = function() {
        const query = this.value.toLowerCase().trim();
        document.querySelectorAll('#classGradeEntryTbody tr').forEach(row => {
            const name = row.querySelector('td:nth-child(2) strong')?.textContent?.toLowerCase() || '';
            row.style.display = name.includes(query) ? '' : 'none';
        });
    };
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));

    document.getElementById('classGradeEntry').style.display = 'block';
}

function closeClassGradeEntry() {
    document.getElementById('classGradeEntry').style.display = 'none';
    classExamIdForGrades = null;
}

function openClassExamReport(examId) {
    const exam = exams.find(e => e.id === examId);
    if (!exam) { showToast('Exam not found.', true); return; }
    closeClassGradeEntry();
    classExamIdForReport = examId;
    document.getElementById('classReportExamName').innerText = exam.name;

    const grades = examGrades.filter(g => g.examId === examId);
    const totalStudents = grades.length;

    if (!totalStudents) {
        document.getElementById('classReportStudents').innerText = '0';
        document.getElementById('classReportAvg').innerText = '0%';
        document.getElementById('classReportHighest').innerText = '0';
        document.getElementById('classReportLowest').innerText = '0';
        document.getElementById('classReportGradeTbody').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">No grades recorded yet.</td></tr>';
        showToast('No grades recorded for this exam yet.', true);
        document.getElementById('classExamReport').style.display = 'block';
        return;
    }

    const scores = grades.map(g => g.score);
    const avg = scores.reduce((a, b) => a + b, 0) / totalStudents;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const avgPct = (avg / exam.maxScore) * 100;

    document.getElementById('classReportStudents').innerText = totalStudents;
    document.getElementById('classReportAvg').innerHTML = `${avgPct.toFixed(0)}%`;
    document.getElementById('classReportHighest').innerHTML = `${highest} / ${exam.maxScore}`;
    document.getElementById('classReportLowest').innerHTML = `${lowest} / ${exam.maxScore}`;

    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach(g => {
        const grade = getGrade(g.score, exam.maxScore);
        if (distribution[grade] !== undefined) distribution[grade]++;
    });

    const gradeRanges = { A: '90-100%', B: '80-89%', C: '70-79%', D: '60-69%', F: '0-59%' };
    const tbody = document.getElementById('classReportGradeTbody');
    let html = '';
    let hasData = false;
    Object.keys(distribution).forEach(grade => {
        const count = distribution[grade];
        if (count > 0) hasData = true;
        const pct = (count / totalStudents) * 100;
        html += `<tr><td><span class="grade-range ${getGradeClass(grade)}">${grade}</span></td><td>${gradeRanges[grade]}</td><td>${count}</td><td>${pct.toFixed(0)}%</td></tr>`;
    });
    if (!hasData) html = '<tr><td colspan="4" style="text-align:center;padding:20px;">No grade data available.</td></tr>';
    tbody.innerHTML = html;

    document.getElementById('classExamReport').style.display = 'block';
}

function closeClassExamReport() {
    document.getElementById('classExamReport').style.display = 'none';
    classExamIdForReport = null;
}

// ═══════════════════════════════════════════════════════════════
// PROMOTION MODAL (select students to promote)
// ═══════════════════════════════════════════════════════════════
function openPromoteModal() {
    if (!isAdmin()) return;
    const classId = currentRegisterClassId;
    if (!classId) { showToast('No class selected.', true); return; }
    const cls = classes.find(c => c.id === classId);
    if (!cls) { showToast('Class not found.', true); return; }

    document.getElementById('promoteCurrentClass').innerText = cls.name;
    const hintEl = document.getElementById('promoteCurrentClassHint');
    if (hintEl) hintEl.innerText = cls.name;

    const select = document.getElementById('promoteTargetClass');
    select.innerHTML = '<option value="">-- Select Class --</option>';
    const otherClasses = [...classes].filter(c => c.id !== classId && c.status === 'Active').sort(sortClasses);

    otherClasses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });

    if (select.options.length === 1) {
        showToast('No other active classes available to promote to.', true);
        return;
    }

    const studentsList = document.getElementById('promoteStudentsList');
    const activeStudents = students.filter(s => s.class === cls.name && s.status === 'Active').sort((a, b) => a.name.localeCompare(b.name));

    if (!activeStudents.length) {
        studentsList.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.9rem; padding:20px;">No active students in this class.</p>';
    } else {
        studentsList.innerHTML = activeStudents.map(s => `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 4px; border-bottom:1px solid #f0edf5;">
                <input type="checkbox" class="promote-student-cb" value="${s.id}" checked style="width:auto;margin:0;transform:scale(1.15);cursor:pointer;" />
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; font-size:0.9rem; color:#2c3e50;">${escapeHtml(s.name)}</div>
                    <div style="font-size:0.75rem; color:#8c7da1;">ID: ${s.id}${s.age ? ' · Age ' + s.age : ''}${s.gender ? ' · ' + escapeHtml(s.gender) : ''}</div>
                </div>
            </div>
        `).join('');
    }

    const selectAllCb = document.getElementById('promoteSelectAll');
    selectAllCb.checked = true;
    selectAllCb.onchange = function() {
        document.querySelectorAll('.promote-student-cb').forEach(cb => cb.checked = this.checked);
    };

    document.getElementById('promoteModal').classList.add('active');
}

function promoteStudents() {
    const classId = currentRegisterClassId;
    if (!classId) { showToast('No class selected.', true); return; }
    const cls = classes.find(c => c.id === classId);
    if (!cls) { showToast('Class not found.', true); return; }

    const targetId = document.getElementById('promoteTargetClass').value;
    if (!targetId) { showToast('Please select a target class.', true); return; }
    const targetClass = classes.find(c => c.id === targetId);
    if (!targetClass) { showToast('Target class not found.', true); return; }

    const checkboxes = document.querySelectorAll('.promote-student-cb:checked');
    if (checkboxes.length === 0) {
        showToast('Please select at least one student to promote.', true);
        return;
    }

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const totalInClass = students.filter(s => s.class === cls.name && s.status === 'Active').length;
    const notSelected = totalInClass - selectedIds.length;

    let confirmMsg = `Promote ${selectedIds.length} of ${totalInClass} student(s) from ${cls.name} to ${targetClass.name}?`;
    if (notSelected > 0) {
        confirmMsg += `\n\n${notSelected} unchecked student(s) will remain in ${cls.name}.`;
    }
    if (!confirm(confirmMsg)) return;

    let promoted = 0;
    students.forEach(s => {
        if (selectedIds.includes(s.id)) {
            s.class = targetClass.name;
            promoted++;
        }
    });

    saveToLocal();
    showToast(`✅ Promoted ${promoted} student(s) from ${cls.name} to ${targetClass.name}.`);

    document.getElementById('promoteModal').classList.remove('active');
    renderClassMetrics();
    renderClassCards();
    renderClassStudents();
    renderClassExams();
    renderStudents();
    renderClassDistribution();
    populateClassFilter();
    populateExamDropdowns();
    populateAttendanceClassDropdowns();
    populateRegisterFilters();
    populateArrearsFilters();
    renderFeeStructure();
}

function addUpdateClass(data, isEdit) {
    if (isEdit) {
        const idx = classes.findIndex(c => c.id === data.id);
        if (idx !== -1) classes[idx] = data;
    } else {
        data.id = generateId('C');
        classes.push(data);
    }
    saveToLocal();
    renderClassCards();
    renderClassMetrics();
    updateStats();
    populateClassFilter();
    refreshTimetableFilters();
    renderClassDistribution();
    populateExamDropdowns();
    populateAttendanceClassDropdowns();
    populateRegisterFilters();
    populateArrearsFilters();
    renderFeeStructure();
    showToast(isEdit ? 'Class updated' : 'Class added');
}

function deleteClassById(id) {
    if (!isAdmin()) return;
    if (confirm('Delete this class? Students assigned to it will need to be reassigned.')) {
        classes = classes.filter(c => c.id !== id);
        saveToLocal();
        renderClassCards();
        renderClassMetrics();
        updateStats();
        populateClassFilter();
        refreshTimetableFilters();
        renderClassDistribution();
        populateExamDropdowns();
        populateAttendanceClassDropdowns();
        populateRegisterFilters();
        populateArrearsFilters();
        renderFeeStructure();
        showToast('Class deleted');
    }
}

function openAddClass() {
    document.getElementById('classId').value = '';
    document.getElementById('className').value = '';
    document.getElementById('classLevel').value = 'Primary';
    document.getElementById('classCapacity').value = '';
    document.getElementById('classStatus').value = 'Active';
    document.getElementById('classModalTitle').innerText = 'Add Class';
    document.getElementById('classModal').classList.add('active');
}

function openEditClass(id) {
    const c = classes.find(cls => cls.id === id);
    if (!c) return;
    document.getElementById('classId').value = c.id;
    document.getElementById('className').value = c.name;
    document.getElementById('classLevel').value = c.level;
    document.getElementById('classCapacity').value = c.capacity;
    document.getElementById('classStatus').value = c.status;
    document.getElementById('classModalTitle').innerText = 'Edit Class';
    document.getElementById('classModal').classList.add('active');
}

function saveClass() {
    const id = document.getElementById('classId').value;
    const name = document.getElementById('className').value.trim();
    const level = document.getElementById('classLevel').value;
    const capacity = parseInt(document.getElementById('classCapacity').value, 10);
    const status = document.getElementById('classStatus').value;

    if (!name) { showToast('Please enter a class name.', true); return; }
    if (isNaN(capacity) || capacity < 1) { showToast('Please enter a valid capacity (at least 1).', true); return; }

    const dup = classes.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id);
    if (dup) { showToast(`A class with the name "${dup.name}" already exists.`, true); return; }

    const data = { name, level, capacity, status, id: id || '' };
    if (id) addUpdateClass(data, true);
    else addUpdateClass(data, false);
    document.getElementById('classModal').classList.remove('active');
}

// ─── SUBJECTS ───
function renderSubjects() {
    const container = document.getElementById('subjectCardsContainer');
    if (!container) return;

    const levels = ['Nursery 1-2', 'KG 1-2', 'Basic 1–3', 'Basic 4–6', 'JHS 1–3'];
    let html = '';

    levels.forEach(level => {
        let levelSubjects = subjects.filter(s => s.level === level);
        if (subjectSearch.trim()) {
            levelSubjects = levelSubjects.filter(s =>
                s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                (s.code || '').toLowerCase().includes(subjectSearch.toLowerCase())
            );
        }
        levelSubjects.sort((a, b) => a.name.localeCompare(b.name));

        html += `<div class="level-card">`;
        html += `<div class="level-card-header"><h3>${level}</h3><span class="level-count">${levelSubjects.length} subjects</span></div>`;
        html += `<div class="level-subject-list">`;

        if (levelSubjects.length === 0) {
            html += `<div class="no-subject-msg">No subjects found for this level.</div>`;
        } else {
            levelSubjects.forEach(sub => {
                html += `<div class="subject-item">
                    <div class="subject-info">
                        <span class="subject-name">${escapeHtml(sub.name)}</span>
                        <span class="subject-code">${escapeHtml(sub.code || '—')}</span>
                    </div>
                    <div class="subject-actions">
                        ${isAdmin() ? `<i class="fas fa-edit" onclick="openEditSubject('${sub.id}')" title="Edit"></i>
                        <i class="fas fa-trash-alt" onclick="deleteSubjectById('${sub.id}')" title="Delete"></i>` : ''}
                    </div>
                </div>`;
            });
        }
        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function addUpdateSubject(data, isEdit) {
    if (isEdit) {
        const idx = subjects.findIndex(s => s.id === data.id);
        if (idx !== -1) subjects[idx] = data;
    } else {
        data.id = generateId('SUB');
        subjects.push(data);
    }
    saveToLocal();
    renderSubjects();
    populateExamDropdowns();
    renderSubjectPerformanceChart();
    showToast(isEdit ? 'Subject updated' : 'Subject added');
}

function deleteSubjectById(id) {
    if (!isAdmin()) return;
    if (confirm('Delete this subject?')) {
        subjects = subjects.filter(s => s.id !== id);
        saveToLocal();
        renderSubjects();
        populateExamDropdowns();
        renderSubjectPerformanceChart();
        showToast('Subject deleted');
    }
}

function openAddSubject() {
    document.getElementById('subjectId').value = '';
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectCode').value = '';
    document.getElementById('subjectLevel').value = 'Nursery 1-2';
    document.getElementById('subjectDescription').value = '';
    document.getElementById('subjectModalTitle').innerText = 'Add Subject';
    document.getElementById('subjectModal').classList.add('active');
}

function openEditSubject(id) {
    const sub = subjects.find(s => s.id === id);
    if (!sub) return;
    document.getElementById('subjectId').value = sub.id;
    document.getElementById('subjectName').value = sub.name;
    document.getElementById('subjectCode').value = sub.code || '';
    document.getElementById('subjectLevel').value = sub.level || 'Nursery 1-2';
    document.getElementById('subjectDescription').value = sub.description || '';
    document.getElementById('subjectModalTitle').innerText = 'Edit Subject';
    document.getElementById('subjectModal').classList.add('active');
}

function saveSubject() {
    const id = document.getElementById('subjectId').value;
    const name = document.getElementById('subjectName').value.trim();
    const code = document.getElementById('subjectCode').value.trim();
    const level = document.getElementById('subjectLevel').value;
    const description = document.getElementById('subjectDescription').value.trim();

    if (!name) { showToast('Subject name is required.', true); return; }

    const dup = subjects.find(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== id);
    if (dup) { showToast(`A subject with the name "${dup.name}" already exists.`, true); return; }

    const data = { name, code, description, level, id: id || '' };
    if (id) addUpdateSubject(data, true);
    else addUpdateSubject(data, false);
    document.getElementById('subjectModal').classList.remove('active');
}

// ─── EXAM MANAGEMENT ───
function populateExamDropdowns() {
    const datalist = document.getElementById('subjectSuggestions');
    if (datalist) {
        const uniqueSubjects = [...new Set(subjects.map(s => s.name))];
        datalist.innerHTML = uniqueSubjects.map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
    }

    const classSel = document.getElementById('examClass');
    if (classSel) {
        const curClass = classSel.value;
        classSel.innerHTML = '<option value="">-- Select Class --</option>';
        const scoped = getScopedClasses();
        const sortedScoped = [...scoped].sort(sortClasses);
        sortedScoped.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            if (c.name === curClass) opt.selected = true;
            classSel.appendChild(opt);
        });
    }
    populateTermDropdowns();
}

function renderExams() {
    const container = document.getElementById('examGroupsContainer');
    if (!container) return;

    const filtered = getScopedExams();

    const total = filtered.length;
    const completed = filtered.filter(e => getExamStatus(e) === 'Completed').length;
    const upcoming = filtered.filter(e => getExamStatus(e) === 'Upcoming').length;
    document.getElementById('examTotalCount').innerText = total;
    document.getElementById('examCompletedCount').innerText = completed;
    document.getElementById('examUpcomingCount').innerText = upcoming;

    let totalScore = 0, totalMax = 0, gradeCount = 0;
    filtered.forEach(exam => {
        examGrades.filter(g => g.examId === exam.id).forEach(g => {
            totalScore += g.score;
            totalMax += exam.maxScore || 1;
            gradeCount++;
        });
    });
    const avgPct = gradeCount > 0 ? (totalScore / totalMax) * 100 : 0;
    document.getElementById('examAvgScoreGlobal').innerHTML = `${avgPct.toFixed(0)}%`;
    document.getElementById('examCountBadge').innerText = filtered.length;

    if (!filtered.length) {
        container.innerHTML = `
            <div class="no-exam-data-msg" style="padding:40px;">
                <i class="fas fa-file-alt"></i>
                <h4>No exams created yet</h4>
                <p>Click "Create Exam" to add your first exam.</p>
            </div>`;
        return;
    }

    const classByName = {};
    classes.forEach(c => { classByName[c.name] = c; });

    const byLevel = {};
    filtered.forEach(exam => {
        const cls = classByName[exam.class];
        const level = cls ? (cls.level || 'Other') : 'Other';
        if (!byLevel[level]) byLevel[level] = {};
        if (!byLevel[level][exam.class]) byLevel[level][exam.class] = [];
        byLevel[level][exam.class].push(exam);
    });

    const levelOrder = ['Nursery', 'Kindergarten', 'KG', 'Primary', 'Junior High School'];
    const levelIcons = {
        'Nursery': '🧸',
        'Kindergarten': '🎨',
        'KG': '🌈',
        'Primary': '📚',
        'Junior High School': '🎓',
        'Other': '📂'
    };

    const sortedLevels = Object.keys(byLevel).sort((a, b) => {
        const ai = levelOrder.indexOf(a);
        const bi = levelOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    let html = '<div class="exam-groups-container">';

    sortedLevels.forEach(level => {
        const classNames = sortClassNames(Object.keys(byLevel[level]));
        let levelTotal = 0, levelOngoing = 0, levelUpcoming = 0;
        classNames.forEach(cName => {
            byLevel[level][cName].forEach(e => {
                levelTotal++;
                const s = getExamStatus(e);
                if (s === 'Ongoing') levelOngoing++;
                else if (s === 'Upcoming') levelUpcoming++;
            });
        });

        html += `
            <div class="exam-level-group">
                <div class="exam-level-header" onclick="toggleExamLevelGroup(this)">
                    <div class="exam-level-title">
                        <span class="level-icon">${levelIcons[level] || '📂'}</span>
                        ${escapeHtml(level)}
                        <span class="exam-level-badge">${levelTotal} exam${levelTotal !== 1 ? 's' : ''}</span>
                        ${levelOngoing > 0 ? `<span class="exam-mini-badge ongoing">${levelOngoing} ongoing</span>` : ''}
                        ${levelUpcoming > 0 ? `<span class="exam-mini-badge upcoming">${levelUpcoming} upcoming</span>` : ''}
                    </div>
                    <span class="exam-level-toggle"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="exam-level-body">
                    ${classNames.map(cName => renderExamClassSection(cName, byLevel[level][cName])).join('')}
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function toggleExamLevelGroup(header) {
    const group = header.closest('.exam-level-group');
    if (!group) return;
    const body = group.querySelector('.exam-level-body');
    const toggle = group.querySelector('.exam-level-toggle');
    if (body) body.classList.toggle('collapsed');
    if (toggle) toggle.classList.toggle('collapsed');
}

function renderExamClassSection(className, examsList) {
    const statusOrder = { Ongoing: 0, Upcoming: 1, Completed: 2 };
    const sorted = [...examsList].sort((a, b) => {
        const sa = statusOrder[getExamStatus(a)] ?? 3;
        const sb = statusOrder[getExamStatus(b)] ?? 3;
        if (sa !== sb) return sa - sb;
        return (a.date || '').localeCompare(b.date || '');
    });

    let ongoing = 0, upcoming = 0, completed = 0;
    sorted.forEach(e => {
        const s = getExamStatus(e);
        if (s === 'Ongoing') ongoing++;
        else if (s === 'Upcoming') upcoming++;
        else completed++;
    });

    const rows = sorted.map(exam => {
        const status = getExamStatus(exam);
        const statusClass = status === 'Upcoming' ? 'exam-status-upcoming'
                          : status === 'Ongoing' ? 'exam-status-ongoing'
                          : 'exam-status-completed';
        const hasGrades = examGrades.some(g => g.examId === exam.id);
        const gradeCount = examGrades.filter(g => g.examId === exam.id).length;
        const termName = terms.find(t => t.id === exam.termId)?.name || '—';

        return `<tr>
            <td><strong>${escapeHtml(exam.name)}</strong></td>
            <td><span class="subject-tag">${escapeHtml(exam.subject)}</span></td>
            <td>${escapeHtml(termName)}</td>
            <td>${formatDate(exam.date)}</td>
            <td>${exam.maxScore}</td>
            <td>
                <span class="exam-status-badge ${statusClass}">${status}</span>
                ${hasGrades ? `<span style="font-size:0.7rem;color:#8c7da1;display:block;margin-top:2px;">${gradeCount} grades</span>` : ''}
            </td>
            <td class="action-icons">
                ${status !== 'Upcoming' ? `<i class="fas fa-pencil-alt" onclick="openGradeEntry('${exam.id}')" title="Enter Grades"></i>` : ''}
                <i class="fas fa-chart-bar" onclick="openExamReport('${exam.id}')" title="View Report"></i>
                <i class="fas fa-edit" onclick="openEditExam('${exam.id}')" title="Edit"></i>
                <i class="fas fa-trash-alt" onclick="deleteExamById('${exam.id}')" title="Delete"></i>
            </td>
        </tr>`;
    }).join('');

    return `
        <div class="exam-class-section">
            <div class="exam-class-header">
                <div class="exam-class-title">
                    <i class="fas fa-book"></i> ${escapeHtml(className)}
                </div>
                <div class="exam-class-badges">
                    ${ongoing  > 0 ? `<span class="exam-mini-badge ongoing">${ongoing} ongoing</span>`  : ''}
                    ${upcoming > 0 ? `<span class="exam-mini-badge upcoming">${upcoming} upcoming</span>` : ''}
                    ${completed > 0 ? `<span class="exam-mini-badge completed">${completed} completed</span>` : ''}
                </div>
            </div>
            <div class="table-wrapper">
                <table>
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
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function addUpdateExam(data, isEdit) {
    if (isEdit) {
        const idx = exams.findIndex(e => e.id === data.id);
        if (idx !== -1) exams[idx] = data;
    } else {
        data.id = generateId('EX');
        exams.push(data);
    }
    saveToLocal();
    renderExams();
    renderExamAnalytics();
    renderSubjectPerformanceChart();
    renderSubjectPerformanceDetailedChart();
    if (currentRegisterClassId) renderClassExams();
    showToast(isEdit ? 'Exam updated' : 'Exam created');
}

function deleteExamById(id) {
    if (confirm('Delete this exam and all associated grades?')) {
        exams = exams.filter(e => e.id !== id);
        examGrades = examGrades.filter(g => g.examId !== id);
        saveToLocal();
        renderExams();
        renderExamAnalytics();
        renderSubjectPerformanceChart();
        renderSubjectPerformanceDetailedChart();
        if (currentRegisterClassId) renderClassExams();
        if (currentExamIdForGrades === id) closeGradeEntry();
        if (currentExamIdForReport === id) closeExamReport();
        if (classExamIdForGrades === id) closeClassGradeEntry();
        if (classExamIdForReport === id) closeClassExamReport();
        showToast('Exam deleted');
    }
}

function openAddExam() {
    document.getElementById('examId').value = '';
    document.getElementById('examName').value = '';
    document.getElementById('examSubject').value = '';
    document.getElementById('examTerm').value = '';
    document.getElementById('examClass').value = '';
    document.getElementById('examDate').value = getLocalDateString();
    document.getElementById('examMaxScore').value = '';
    document.getElementById('examType').value = 'Individual Test';
    document.getElementById('examDescription').value = '';
    document.getElementById('examModalTitle').innerText = 'Create Exam';
    populateExamDropdowns();
    populateTermDropdowns();
    document.getElementById('examModal').classList.add('active');
}

function openEditExam(id) {
    const exam = exams.find(e => e.id === id);
    if (!exam) return;
    document.getElementById('examId').value = exam.id;
    document.getElementById('examName').value = exam.name;
    document.getElementById('examSubject').value = exam.subject;
    document.getElementById('examTerm').value = exam.termId || '';
    document.getElementById('examClass').value = exam.class;
    document.getElementById('examDate').value = exam.date;
    document.getElementById('examMaxScore').value = exam.maxScore;
    document.getElementById('examType').value = exam.type || 'Other';
    document.getElementById('examDescription').value = exam.description || '';
    document.getElementById('examModalTitle').innerText = 'Edit Exam';
    populateExamDropdowns();
    populateTermDropdowns();
    document.getElementById('examModal').classList.add('active');
}

function saveExam() {
    const id = document.getElementById('examId').value;
    const name = document.getElementById('examName').value.trim();
    const subject = document.getElementById('examSubject').value.trim();
    const cls = document.getElementById('examClass').value;
    const termId = document.getElementById('examTerm').value;
    const date = document.getElementById('examDate').value;
    const maxScore = parseInt(document.getElementById('examMaxScore').value, 10);
    const type = document.getElementById('examType').value;
    const description = document.getElementById('examDescription').value.trim();

    if (!name || !subject || !cls || !date || isNaN(maxScore) || maxScore < 1) {
        showToast('Please fill all required fields (Name, Subject, Class, Date, Max Score)', true);
        return;
    }
    if (!termId) { showToast('Please select a Term.', true); return; }

    const data = { name, subject, class: cls, termId, date, maxScore, type, description, id: id || '' };
    if (id) addUpdateExam(data, true);
    else addUpdateExam(data, false);
    document.getElementById('examModal').classList.remove('active');
}

// ─── GRADE ENTRY (GLOBAL) ───
function openGradeEntry(examId) {
    const exam = exams.find(e => e.id === examId);
    if (!exam) { showToast('Exam not found.', true); return; }

    currentExamIdForGrades = examId;
    document.getElementById('gradeEntryExamName').innerText = exam.name;

    const classStudents = students.filter(s => s.class === exam.class && s.status === 'Active');
    if (!classStudents.length) { showToast('No students enrolled in this class.', true); return; }

    const tbody = document.getElementById('gradeEntryTbody');
    let html = '';
    classStudents.forEach((s, idx) => {
        const existing = examGrades.find(g => g.examId === examId && g.studentId === s.id);
        const score = existing ? existing.score : '';
        const grade = existing ? getGrade(existing.score, exam.maxScore) : '—';
        const gradeClass = existing ? getGradeClass(grade) : '';
        html += `<tr data-student-id="${s.id}">
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td><input type="number" class="exam-grade-input" data-student-id="${s.id}" value="${score}" min="0" max="${exam.maxScore}" step="0.5" placeholder="Score" /></td>
            <td><span class="grade-range ${gradeClass}">${grade}</span></td>
        </tr>`;
    });

    tbody.innerHTML = html;
    document.getElementById('gradeEntryCount').innerText = classStudents.length + ' students';
    document.getElementById('gradeEntrySection').style.display = 'block';

    const tableCard = document.getElementById('examGroupsWrapper');
    const statsDiv = document.querySelector('#tabExams .exam-stat-card')?.closest('div[style]');
    if (tableCard) tableCard.style.display = 'none';
    if (statsDiv) statsDiv.style.display = 'none';

    document.querySelectorAll('#gradeEntryTbody .exam-grade-input').forEach(input => {
        input.onchange = function() {
            const studentId = this.dataset.studentId;
            const val = parseFloat(this.value);
            const tr = this.closest('tr');
            const gradeCell = tr.querySelector('td:last-child span');
            if (!isNaN(val) && val >= 0 && val <= exam.maxScore) {
                const existingIndex = examGrades.findIndex(g => g.examId === examId && g.studentId === studentId);
                if (existingIndex !== -1) examGrades[existingIndex].score = val;
                else examGrades.push({ id: generateId('EG'), examId, studentId, score: val });
                saveToLocal();
                const grade = getGrade(val, exam.maxScore);
                gradeCell.textContent = grade;
                gradeCell.className = `grade-range ${getGradeClass(grade)}`;
                this.classList.add('saved');
                renderExams();
                renderExamAnalytics();
                renderSubjectPerformanceChart();
                renderSubjectPerformanceDetailedChart();
                if (currentRegisterClassId) renderClassExams();
            } else if (this.value === '') {
                const idx = examGrades.findIndex(g => g.examId === examId && g.studentId === studentId);
                if (idx !== -1) {
                    examGrades.splice(idx, 1);
                    saveToLocal();
                    gradeCell.textContent = '—';
                    gradeCell.className = 'grade-range';
                    this.classList.remove('saved');
                    renderExams();
                    renderExamAnalytics();
                    renderSubjectPerformanceChart();
                    renderSubjectPerformanceDetailedChart();
                    if (currentRegisterClassId) renderClassExams();
                }
            } else {
                showToast('Invalid score. Must be between 0 and ' + exam.maxScore, true);
                this.value = '';
            }
        };
    });

    const searchInput = document.getElementById('gradeEntrySearch');
    searchInput.oninput = function() {
        const query = this.value.toLowerCase().trim();
        document.querySelectorAll('#gradeEntryTbody tr').forEach(row => {
            const name = row.querySelector('td:nth-child(2) strong')?.textContent?.toLowerCase() || '';
            row.style.display = name.includes(query) ? '' : 'none';
        });
    };
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
}

function closeGradeEntry() {
    document.getElementById('gradeEntrySection').style.display = 'none';
    const tableCard = document.getElementById('examGroupsWrapper');
    const statsDiv = document.querySelector('#tabExams .exam-stat-card')?.closest('div[style]');
    if (tableCard) tableCard.style.display = 'block';
    if (statsDiv) statsDiv.style.display = 'grid';
    currentExamIdForGrades = null;
    renderExams();
    renderSubjectPerformanceChart();
    renderSubjectPerformanceDetailedChart();
}

function openExamReport(examId) {
    const exam = exams.find(e => e.id === examId);
    if (!exam) { showToast('Exam not found.', true); return; }

    currentExamIdForReport = examId;
    document.getElementById('reportExamName').innerText = exam.name;

    const grades = examGrades.filter(g => g.examId === examId);
    const totalStudents = grades.length;

    if (!totalStudents) {
        document.getElementById('reportTotalStudents').innerText = '0';
        document.getElementById('reportAvgScore').innerText = '0%';
        document.getElementById('reportHighestScore').innerText = '0';
        document.getElementById('reportLowestScore').innerText = '0';
        document.getElementById('reportGradeTbody').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">No grades recorded yet.</td></tr>';
        showToast('No grades recorded for this exam yet.', true);
        return;
    }

    const scores = grades.map(g => g.score);
    const avg = scores.reduce((a, b) => a + b, 0) / totalStudents;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const avgPct = (avg / exam.maxScore) * 100;

    document.getElementById('reportTotalStudents').innerText = totalStudents;
    document.getElementById('reportAvgScore').innerHTML = `${avgPct.toFixed(0)}%`;
    document.getElementById('reportHighestScore').innerHTML = `${highest} / ${exam.maxScore}`;
    document.getElementById('reportLowestScore').innerHTML = `${lowest} / ${exam.maxScore}`;

    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach(g => {
        const grade = getGrade(g.score, exam.maxScore);
        if (distribution[grade] !== undefined) distribution[grade]++;
    });

    const gradeRanges = { A: '90-100%', B: '80-89%', C: '70-79%', D: '60-69%', F: '0-59%' };
    const tbody = document.getElementById('reportGradeTbody');
    let html = '';
    let hasData = false;
    Object.keys(distribution).forEach(grade => {
        const count = distribution[grade];
        if (count > 0) hasData = true;
        const pct = (count / totalStudents) * 100;
        html += `<tr><td><span class="grade-range ${getGradeClass(grade)}">${grade}</span></td><td>${gradeRanges[grade]}</td><td>${count}</td><td>${pct.toFixed(0)}%</td></tr>`;
    });
    if (!hasData) html = '<tr><td colspan="4" style="text-align:center;padding:20px;">No grade data available.</td></tr>';
    tbody.innerHTML = html;

    document.getElementById('examReportSection').style.display = 'block';
    const tableCard = document.getElementById('examGroupsWrapper');
    const statsDiv = document.querySelector('#tabExams .exam-stat-card')?.closest('div[style]');
    if (tableCard) tableCard.style.display = 'none';
    if (statsDiv) statsDiv.style.display = 'none';
    if (document.getElementById('gradeEntrySection').style.display === 'block') {
        document.getElementById('gradeEntrySection').style.display = 'none';
    }
}

function closeExamReport() {
    document.getElementById('examReportSection').style.display = 'none';
    const tableCard = document.getElementById('examGroupsWrapper');
    const statsDiv = document.querySelector('#tabExams .exam-stat-card')?.closest('div[style]');
    if (tableCard) tableCard.style.display = 'block';
    if (statsDiv) statsDiv.style.display = 'grid';
    currentExamIdForReport = null;
    renderExams();
}

// ─── PAYMENT CLASS DROPDOWN ───
function populatePaymentClassDropdown(selected) {
    const sel = document.getElementById('paymentClass');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Class --</option>';
    const uniqueClasses = [...new Set(classes.map(c => c.name))].filter(Boolean);
    const sortedClassNames = sortClassNames(uniqueClasses);

    if (sortedClassNames.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No classes available (add one in Classes tab)';
        opt.disabled = true;
        sel.appendChild(opt);
    } else {
        sortedClassNames.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls;
            opt.textContent = cls;
            if (cls === selected) opt.selected = true;
            sel.appendChild(opt);
        });
    }
}

function populatePaymentFeeTypeDropdown(selected) {
    const sel = document.getElementById('paymentFeeType');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Fee Type --</option>';
    feeCategories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id === selected) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ─── RENDER STUDENTS / TEACHERS / PAYMENTS / BUDGETS / EXPENSES ───
// ✅ UPDATED — Using styled span instead of SVG data-URI so the initial letter always renders
function renderStudents() {
    const tbody = document.getElementById("studentsTbody");
    const baseStudents = getScopedStudents();
    let filtered = baseStudents.filter(s =>
        (s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
            (s.parentName || '').toLowerCase().includes(studentSearch.toLowerCase())) &&
        (studentClassFilter === 'All' || s.class === studentClassFilter)
    );
    if (!filtered.length) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">No students found</td></tr>`;
        document.getElementById('studentCountBadge').innerText = '0';
        return;
    }
    if (tbody) {
        tbody.innerHTML = filtered.map(s => {
            const initial = (s.name || '?').charAt(0).toUpperCase();
            const avatarContent = `<span style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:#fff;background:linear-gradient(135deg,#8e44ad,#6f42c1);">${initial}</span>`;
            return `<tr>
                <td><div class="student-info-cell"><div class="student-avatar">${avatarContent}</div><div><div class="student-name">${escapeHtml(s.name)}</div><div class="student-id">ID: ${s.id}</div></div></div></td>
                <td><span class="class-badge">${escapeHtml(s.class)}</span></td>
                <td>${s.age} yrs<br><span class="subtext">${escapeHtml(s.gender)}</span></td>
                <td><strong>${escapeHtml(s.parentName)}</strong><br>${escapeHtml(s.parentContact)}</td>
                <td>${escapeHtml(s.location || '—')}</td>
                <td>${s.admissionDate || '—'}</td>
                <td><span class="status-pill ${s.status === 'Active' ? 'status-active' : 'status-inactive'}">${s.status || 'Active'}</span></td>
                <td class="action-icons">
                    ${isAdmin() ? `<i class="fas fa-edit" onclick="openEditStudent('${s.id}')"></i>
                    <i class="fas fa-trash-alt" onclick="deleteStudentById('${s.id}')"></i>` : ''}
                    <i class="fas fa-eye" onclick="openStudentDetails('${s.id}')" title="View Details"></i>
                </td>
            </tr>`;
        }).join('');
    }
    document.getElementById('studentCountBadge').innerText = filtered.length;
}

function renderTeachers() {
    const tbody = document.getElementById("teachersTbody");
    let filtered = (isAdmin() ? teachers : getScopedTeachers()).filter(t =>
        t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (t.subject || '').toLowerCase().includes(teacherSearch.toLowerCase())
    );
    if (!filtered.length) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">No teachers found</td></tr>`;
        document.getElementById('teacherCountBadge').innerText = '0';
        return;
    }
    if (tbody) {
        tbody.innerHTML = filtered.map(t =>
            `<tr><td><strong>${escapeHtml(t.name)}</strong><div class="subtext">ID: ${t.id}</div></td><td><div class="contact-line"><i class="fas fa-envelope"></i> ${escapeHtml(t.email || '—')}</div><div class="contact-line"><i class="fas fa-phone"></i> ${escapeHtml(t.phone || '—')}</div></td><td>${(t.subject || '').split(',').map(sub => `<span class="tag-badge">${escapeHtml(sub.trim())}</span>`).join('')}</td><td>${escapeHtml(t.assignedClass || '—')}</td><td>${t.dateJoined || '—'}</td><td class="action-icons"><i class="fas fa-edit" onclick="openEditTeacher('${t.id}')"></i><i class="fas fa-trash-alt" onclick="deleteTeacherById('${t.id}')"></i></td></tr>`
        ).join('');
    }
    document.getElementById('teacherCountBadge').innerText = filtered.length;
}

function renderPayments() {
    if (!isAdmin()) return;
    const tbody = document.getElementById("paymentsTbody");
    const filterStatus = document.getElementById("paymentStatusFilter")?.value || "All";
    let filtered = payments.filter(p => {
        const matchSearch = p.studentName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
            (p.reference || '').toLowerCase().includes(paymentSearch.toLowerCase());
        const matchStatus = filterStatus === "All" || p.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const total = payments.reduce((s, p) => s + p.amount, 0);
    const pending = payments.filter(p => p.status === "Pending").reduce((s, p) => s + p.amount, 0);
    const overdue = payments.filter(p => p.status === "Overdue").reduce((s, p) => s + p.amount, 0);
    const elTotal = document.getElementById('paymentTotalCollected');
    if (elTotal) elTotal.innerHTML = `GH₵${total.toFixed(2)}`;
    const elPending = document.getElementById('paymentTotalPending');
    if (elPending) elPending.innerHTML = `GH₵${pending.toFixed(2)}`;
    const elOverdue = document.getElementById('paymentTotalOverdue');
    if (elOverdue) elOverdue.innerHTML = `GH₵${overdue.toFixed(2)}`;
    const elCount = document.getElementById('paymentTotalCount');
    if (elCount) elCount.innerText = payments.length;

    if (!filtered.length) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;">No payments found</td></tr>`;
        document.getElementById('paymentCountBadge').innerText = '0';
        return;
    }

    filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (tbody) {
        tbody.innerHTML = filtered.map(p => {
            const statusClass = p.status === 'Paid' ? 'payment-status-paid' : p.status === 'Overdue' ? 'payment-status-overdue' : 'payment-status-pending';
            const feeCat = feeCategories.find(c => c.id === p.feeCategoryId);
            const feeLabel = feeCat ? feeCat.name : (p.description ? '—' : '—');
            return `<tr>
                <td><strong>${escapeHtml(p.studentName)}</strong></td>
                <td><span class="expense-category-badge">${escapeHtml(feeLabel)}</span></td>
                <td><strong>GH₵${p.amount.toFixed(2)}</strong></td>
                <td>${p.date}</td>
                <td><span class="method-badge">${escapeHtml(p.method)}</span></td>
                <td>${p.reference ? `<code style="background:#f4edff;padding:2px 8px;border-radius:6px;font-size:0.78rem;color:#6c3a9d;">${escapeHtml(p.reference)}</code>` : '<span style="color:#b0a8c0;">—</span>'}</td>
                <td>${escapeHtml(p.paymentClass || '—')}</td>
                <td><span class="payment-status-pill ${statusClass}">${p.status || 'Pending'}</span></td>
                <td class="action-icons"><i class="fas fa-edit" onclick="openEditPayment('${p.id}')"></i><i class="fas fa-trash-alt" onclick="deletePaymentById('${p.id}')"></i></td>
            </tr>`;
        }).join('');
    }
    document.getElementById('paymentCountBadge').innerText = filtered.length;
}

function renderBudgets() {
    if (!isAdmin()) return;
    const tbody = document.getElementById("budgetTbody");
    let filtered = budgets.filter(b => b.category.toLowerCase().includes(budgetSearch.toLowerCase()));
    if (!filtered.length) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">No budgets found</td></tr>`;
        document.getElementById('budgetCountBadge').innerText = '0';
        return;
    }
    if (tbody) {
        tbody.innerHTML = filtered.map(b => {
            const spent = expenses.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
            const rem = b.allocated - spent;
            const pct = b.allocated > 0 ? Math.min((spent / b.allocated) * 100, 100) : 0;
            const status = rem < 0 ? 'over' : rem < b.allocated * 0.1 ? 'at' : 'under';
            const label = rem < 0 ? 'Over Budget' : rem < b.allocated * 0.1 ? 'Near Limit' : 'On Track';
            return `<tr><td><strong>${escapeHtml(b.category)}</strong></td><td>GH₵${b.allocated.toFixed(2)}</td><td>GH₵${spent.toFixed(2)}</td><td class="budget-remaining" style="color:${rem < 0 ? '#e74c3c' : rem < b.allocated * 0.1 ? '#f39c12' : '#27ae60'}">GH₵${rem.toFixed(2)}</td><td><div class="budget-progress"><div class="budget-progress-fill" style="width:${pct}%;background:${pct > 90 ? '#e74c3c' : pct > 70 ? '#f39c12' : '#27ae60'}"></div></div><small>${pct.toFixed(0)}% used</small></td><td><span class="budget-status ${status}">${label}</span></td><td class="action-icons"><i class="fas fa-edit" onclick="openEditBudget('${b.id}')"></i><i class="fas fa-trash-alt" onclick="deleteBudgetById('${b.id}')"></i></td></tr>`;
        }).join('');
    }
    document.getElementById('budgetCountBadge').innerText = filtered.length;
}

function renderExpenses() {
    if (!isAdmin()) return;
    const tbody = document.getElementById("expensesTbody");
    let filtered = expenses.filter(e =>
        e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (e.studentName || '').toLowerCase().includes(expenseSearch.toLowerCase())
    );
    if (!filtered.length) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">No expenses found</td></tr>`;
        document.getElementById('expenseCountBadge').innerText = '0';
        return;
    }
    if (tbody) {
        tbody.innerHTML = filtered.map(e => `
            <tr>
                <td><strong>${escapeHtml(e.studentName || '—')}</strong></td>
                <td><span class="class-badge">${escapeHtml(e.class || '—')}</span></td>
                <td><span class="expense-category-badge">${escapeHtml(e.category)}</span></td>
                <td>${escapeHtml(e.description)}</td>
                <td><strong>GH₵${e.amount.toFixed(2)}</strong></td>
                <td>${e.date}</td>
                <td><span class="method-badge">${escapeHtml(e.method)}</span></td>
                <td class="action-icons"><i class="fas fa-edit" onclick="openEditExpense('${e.id}')"></i><i class="fas fa-trash-alt" onclick="deleteExpenseById('${e.id}')"></i></td>
            </tr>
        `).join('');
    }
    document.getElementById('expenseCountBadge').innerText = filtered.length;
}

// ─── DROPDOWN POPULATORS ───
function populateStudentDropdown(selected) {
    const sel = document.getElementById('paymentStudentId');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Student --</option>';
    students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = `${s.name} (${s.class})`;
        if (selected === s.name) opt.selected = true;
        sel.appendChild(opt);
    });
}

function populateExpenseStudentDropdown(selected) {
    const sel = document.getElementById('expenseStudentId');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Student --</option>';
    students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = `${s.name} (${s.class})`;
        if (selected === s.name) opt.selected = true;
        sel.appendChild(opt);
    });
    sel.onchange = function() {
        const studentName = this.value;
        const student = students.find(s => s.name === studentName);
        const classInput = document.getElementById('expenseClass');
        if (student && classInput) classInput.value = student.class || '';
        else if (classInput) classInput.value = '';
    };
}

function populateExpenseCategoryDropdown(selected) {
    const sel = document.getElementById('expenseCategory');
    const hint = document.getElementById('expenseNoBudgetHint');
    if (!sel) return;
    sel.innerHTML = '';

    if (!budgets.length) {
        sel.innerHTML = '<option value="">-- No Budget Categories --</option>';
        if (hint) {
            hint.style.display = 'block';
            document.getElementById('saveExpenseBtn').disabled = true;
            hint.innerHTML = '⚠️ No budget categories found. <a id="expenseGoToBudgetLink" style="color:#8e44ad;font-weight:600;cursor:pointer;text-decoration:underline;">Create a budget first</a> before recording expenses.';
            document.getElementById('expenseGoToBudgetLink').onclick = function(e) {
                e.preventDefault();
                document.getElementById('expenseModal').classList.remove('active');
                switchPaySubTab('budget');
                setTimeout(() => document.getElementById('addBudgetBtn').click(), 300);
            };
        }
        return;
    }

    if (hint) hint.style.display = 'none';
    document.getElementById('saveExpenseBtn').disabled = false;

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Select Category --';
    sel.appendChild(defaultOpt);

    budgets.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.category;
        opt.textContent = b.category;
        if (selected === b.category) opt.selected = true;
        sel.appendChild(opt);
    });

    if (!selected && budgets.length) sel.value = budgets[0].category;
}

function populateClassFilter() {
    const sel = document.getElementById('studentClassFilter');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="All">All Classes</option>';
    const unique = [...new Set(getScopedClasses().map(c => c.name))].filter(Boolean);
    const sortedClassNames = sortClassNames(unique);
    sortedClassNames.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls;
        opt.textContent = cls;
        if (cls === cur) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ✅ UPDATED — Teacher filter now only shows actual teachers (not staff members)
function refreshTimetableFilters() {
    const classSel = document.getElementById('timetableClassFilter');
    if (classSel) {
        const curClass = classSel.value;
        classSel.innerHTML = '<option value="All">All Classes</option>';
        const unique = [...new Set(getScopedClasses().map(c => c.name))].filter(Boolean);
        const sortedClassNames = sortClassNames(unique);
        sortedClassNames.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls;
            opt.textContent = cls;
            if (cls === curClass) opt.selected = true;
            classSel.appendChild(opt);
        });
    }

    const teacherSel = document.getElementById('timetableTeacherFilter');
    if (teacherSel) {
        const curTeacher = teacherSel.value;
        teacherSel.innerHTML = '<option value="All">All Teachers</option>';
        // ✅ Only real teachers — the "staff" array is for non-teaching staff (Admin, Librarian, etc.)
        const uniqueT = [...new Set(teachers.map(t => t.name))].filter(Boolean);
        uniqueT.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === curTeacher) opt.selected = true;
            teacherSel.appendChild(opt);
        });
    }
}

// ✅ UPDATED — Same fix for the modal dropdown
function populateTimetableDropdowns() {
    const classSel = document.getElementById('timetableClass');
    if (classSel) {
        const curClass = classSel.value;
        classSel.innerHTML = '<option value="">-- Select Class --</option>';
        const unique = [...new Set(getScopedClasses().map(c => c.name))].filter(Boolean);
        const sortedClassNames = sortClassNames(unique);
        sortedClassNames.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls;
            opt.textContent = cls;
            if (cls === curClass) opt.selected = true;
            classSel.appendChild(opt);
        });
    }
    const teacherSel = document.getElementById('timetableTeacher');
    if (teacherSel) {
        const curTeacher = teacherSel.value;
        teacherSel.innerHTML = '<option value="">-- Select Teacher --</option>';
        // ✅ Only real teachers — the "staff" array is for non-teaching staff
        const uniqueT = [...new Set(teachers.map(t => t.name))].filter(Boolean);
        uniqueT.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === curTeacher) opt.selected = true;
            teacherSel.appendChild(opt);
        });
    }
}

// ─── TIMETABLE ───
function renderTimetableGrid() {
    const grid = document.getElementById('timetableGrid');
    if (!grid) return;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
    let html = '<div class="timetable-cell header time-slot">Time</div>';
    days.forEach(day => { html += `<div class="timetable-cell header">${day.slice(0,3)}</div>`; });
    timeSlots.forEach(time => {
        html += `<div class="timetable-cell time-slot">${time}</div>`;
        days.forEach(day => {
            const entries = timetable.filter(e => e.day === day && e.time === time);
            const filtered = entries.filter(e => {
                const classMatch = timetableClassFilter === 'All' || e.class === timetableClassFilter;
                const teacherMatch = timetableTeacherFilter === 'All' || e.teacher === timetableTeacherFilter;
                const roleMatch = isAdmin() || e.teacher === currentUser.name || getScopedClassNames().includes(e.class);
                return classMatch && teacherMatch && roleMatch;
            });
            if (filtered.length) {
                html += `<div class="timetable-cell" style="background:white;padding:4px;">`;
                filtered.forEach(e => {
                    html += `<div class="timetable-entry" onclick="editTimetable('${e.id}')"><div class="subject">${escapeHtml(e.subject)}</div><div class="teacher">${escapeHtml(e.teacher)}</div><div style="font-size:0.65rem;color:#8c7da1;">${escapeHtml(e.class)}</div></div>`;
                });
                html += `</div>`;
            } else {
                html += `<div class="timetable-cell" style="background:#fafaff;"><span class="timetable-empty">—</span></div>`;
            }
        });
    });
    grid.innerHTML = html;
    document.getElementById('timetableCountBadge').innerText = isAdmin() ? timetable.length : timetable.filter(e => e.teacher === currentUser.name).length;
}

function addTimetableEntry(data) {
    timetable.push({ ...data, id: generateId('TT') });
    saveToLocal();
    renderTimetableGrid();
    showToast('Schedule added');
}

function updateTimetableEntry(id, data) {
    const idx = timetable.findIndex(e => e.id === id);
    if (idx !== -1) {
        timetable[idx] = { ...timetable[idx], ...data };
        saveToLocal();
        renderTimetableGrid();
        showToast('Schedule updated');
    }
}

function deleteTimetable(id) {
    if (!isAdmin()) { showToast('Only admin can delete schedules.', true); return; }
    if (confirm('Delete this schedule entry?')) {
        timetable = timetable.filter(e => e.id !== id);
        saveToLocal();
        renderTimetableGrid();
        showToast('Schedule deleted');
    }
}

function editTimetable(id) {
    if (!isAdmin()) { showToast('Only admin can edit schedules.', true); return; }
    const entry = timetable.find(e => e.id === id);
    if (!entry) return;
    document.getElementById('timetableId').value = entry.id;
    document.getElementById('timetableModalTitle').innerText = 'Edit Schedule Entry';
    document.getElementById('timetableDay').value = entry.day;
    document.getElementById('timetableTime').value = entry.time;
    document.getElementById('timetableClass').value = entry.class;
    document.getElementById('timetableSubject').value = entry.subject;
    document.getElementById('timetableTeacher').value = entry.teacher;
    document.getElementById('timetableRoom').value = entry.room || '';
    document.getElementById('timetableModal').classList.add('active');
}

function openAddTimetable() {
    document.getElementById('timetableId').value = '';
    document.getElementById('timetableModalTitle').innerText = 'Add Schedule Entry';
    document.getElementById('timetableDay').value = currentDay;
    document.getElementById('timetableTime').value = '09:00';
    document.getElementById('timetableClass').value = '';
    document.getElementById('timetableSubject').value = '';
    document.getElementById('timetableTeacher').value = '';
    document.getElementById('timetableRoom').value = '';
    populateTimetableDropdowns();
    document.getElementById('timetableModal').classList.add('active');
}

function saveTimetable() {
    const id = document.getElementById('timetableId').value;
    const day = document.getElementById('timetableDay').value;
    const time = document.getElementById('timetableTime').value;
    const cls = document.getElementById('timetableClass').value;
    const subject = document.getElementById('timetableSubject').value.trim();
    const teacher = document.getElementById('timetableTeacher').value;
    const room = document.getElementById('timetableRoom').value.trim();
    if (!day || !time || !cls || !subject || !teacher) {
        showToast('Please fill all required fields (Day, Time, Class, Subject, Teacher)', true);
        return;
    }
    const data = { day, time, class: cls, subject, teacher, room: room || '' };
    if (id) updateTimetableEntry(id, data);
    else addTimetableEntry(data);
    document.getElementById('timetableModal').classList.remove('active');
}

// ─── CRUD OPERATIONS ───
function addUpdateStudent(data, isEdit) {
    if (isEdit) {
        const idx = students.findIndex(s => s.id === data.id);
        if (idx !== -1) {
            if (data.attendance === undefined) data.attendance = students[idx].attendance || 0;
            students[idx] = data;
        }
    } else {
        data.id = generateId('S');
        data.attendance = data.attendance || 0;
        students.push(data);
    }
    saveToLocal();
    updateAllUI();
    showToast(isEdit ? 'Student updated' : 'Student added');
}

function deleteStudentById(id) {
    if (!isAdmin()) return;
    const student = students.find(s => s.id === id);
    students = students.filter(s => s.id !== id);
    if (student) payments = payments.filter(p => p.studentName !== student.name);
    attendance = attendance.filter(a => a.studentId !== id);
    saveToLocal();
    updateAllUI();
    showToast('Student deleted');
}

function addUpdateTeacher(data, isEdit) {
    if (isEdit) {
        const idx = teachers.findIndex(t => t.id === data.id);
        if (idx !== -1) teachers[idx] = data;
    } else {
        data.id = generateId('T');
        teachers.push(data);
    }
    saveToLocal();
    updateAllUI();
    showToast(isEdit ? 'Teacher updated' : 'Teacher added');
}

function deleteTeacherById(id) {
    if (!isAdmin()) return;
    teachers = teachers.filter(t => t.id !== id);
    staffAttendance = staffAttendance.filter(a => a.teacherId !== id);
    saveToLocal();
    updateAllUI();
    showToast('Teacher deleted');
}

function addUpdatePayment(data, isEdit) {
    if (isEdit) {
        const idx = payments.findIndex(p => p.id === data.id);
        if (idx !== -1) payments[idx] = data;
    } else {
        data.id = generateId('P');
        data.status = data.status || 'Pending';
        payments.push(data);
    }
    saveToLocal();
    updateAllUI();
    showToast(isEdit ? 'Payment updated' : 'Payment recorded');
}

function deletePaymentById(id) {
    payments = payments.filter(p => p.id !== id);
    saveToLocal();
    updateAllUI();
    showToast('Payment deleted');
}

function addUpdateBudget(data, isEdit) {
    if (isEdit) {
        const idx = budgets.findIndex(b => b.id === data.id);
        if (idx !== -1) budgets[idx] = data;
    } else {
        data.id = generateId('B');
        budgets.push(data);
    }
    saveToLocal();
    renderBudgets();
    populateExpenseCategoryDropdown();
    renderBudgetUtilizationChart();
    showToast(isEdit ? 'Budget updated' : 'Budget added');
}

function deleteBudgetById(id) {
    budgets = budgets.filter(b => b.id !== id);
    saveToLocal();
    renderBudgets();
    populateExpenseCategoryDropdown();
    renderBudgetUtilizationChart();
    showToast('Budget deleted');
}

function addUpdateExpense(data, isEdit) {
    if (isEdit) {
        const idx = expenses.findIndex(e => e.id === data.id);
        if (idx !== -1) expenses[idx] = data;
    } else {
        data.id = generateId('E');
        expenses.push(data);
    }
    saveToLocal();
    renderExpenses();
    renderBudgets();
    renderBudgetUtilizationChart();
    showToast(isEdit ? 'Expense updated' : 'Expense recorded');
}

function deleteExpenseById(id) {
    expenses = expenses.filter(e => e.id !== id);
    saveToLocal();
    renderExpenses();
    renderBudgets();
    renderBudgetUtilizationChart();
    showToast('Expense deleted');
}

// ─── MODAL HANDLERS ───
function openAddStudent() {
    document.getElementById('studentId').value = '';
    document.getElementById('studentName').value = '';
    document.getElementById('studentClass').value = '';
    document.getElementById('studentAge').value = '';
    document.getElementById('studentGender').value = 'Male';
    document.getElementById('studentAdmissionDate').value = getLocalDateString();
    document.getElementById('studentStatus').value = 'Active';
    document.getElementById('parentName').value = '';
    document.getElementById('parentContact').value = '';
    document.getElementById('studentLocation').value = '';
    document.getElementById('studentModal').classList.add('active');
}

function openEditStudent(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    document.getElementById('studentId').value = s.id;
    document.getElementById('studentName').value = s.name;
    document.getElementById('studentClass').value = s.class;
    document.getElementById('studentAge').value = s.age;
    document.getElementById('studentGender').value = s.gender;
    document.getElementById('studentAdmissionDate').value = s.admissionDate;
    document.getElementById('studentStatus').value = s.status;
    document.getElementById('parentName').value = s.parentName;
    document.getElementById('parentContact').value = s.parentContact;
    document.getElementById('studentLocation').value = s.location || '';
    document.getElementById('studentModal').classList.add('active');
}

function saveStudent() {
    const id = document.getElementById('studentId').value;
    const name = document.getElementById('studentName').value.trim();
    const cls = document.getElementById('studentClass').value.trim();
    const age = parseInt(document.getElementById('studentAge').value, 10);
    const gender = document.getElementById('studentGender').value;
    const admissionDate = document.getElementById('studentAdmissionDate').value;
    const status = document.getElementById('studentStatus').value;
    const parentName = document.getElementById('parentName').value.trim();
    const parentContact = document.getElementById('parentContact').value.trim();
    const location = document.getElementById('studentLocation').value.trim();
    if (!name || !cls || isNaN(age) || !admissionDate) { showToast('All fields required', true); return; }
    const data = { name, class: cls, age, gender, admissionDate, status,
        parentName: parentName || '—', parentContact: parentContact || '—',
        location: location || '—', id: id || '' };
    if (id) addUpdateStudent(data, true);
    else addUpdateStudent(data, false);
    document.getElementById('studentModal').classList.remove('active');
}

function openAddTeacher() {
    document.getElementById('teacherId').value = '';
    document.getElementById('teacherName').value = '';
    document.getElementById('teacherEmail').value = '';
    document.getElementById('teacherClass').value = '';
    document.getElementById('teacherSubject').value = '';
    document.getElementById('teacherPhone').value = '';
    document.getElementById('teacherDateJoined').value = getLocalDateString();
    document.getElementById('teacherUsername').value = '';
    document.getElementById('teacherPassword').value = '';
    document.getElementById('teacherModal').classList.add('active');
}

function openEditTeacher(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    document.getElementById('teacherId').value = t.id;
    document.getElementById('teacherName').value = t.name;
    document.getElementById('teacherEmail').value = t.email || '';
    document.getElementById('teacherClass').value = t.assignedClass;
    document.getElementById('teacherSubject').value = t.subject;
    document.getElementById('teacherPhone').value = t.phone || '';
    document.getElementById('teacherDateJoined').value = t.dateJoined || '';
    document.getElementById('teacherUsername').value = t.username || '';
    document.getElementById('teacherPassword').value = t.password || '';
    document.getElementById('teacherModal').classList.add('active');
}

function saveTeacher() {
    const id = document.getElementById('teacherId').value;
    const name = document.getElementById('teacherName').value.trim();
    const email = document.getElementById('teacherEmail').value.trim();
    const assignedClass = document.getElementById('teacherClass').value.trim();
    const subject = document.getElementById('teacherSubject').value.trim();
    const phone = document.getElementById('teacherPhone').value.trim();
    const dateJoined = document.getElementById('teacherDateJoined').value;
    const username = document.getElementById('teacherUsername').value.trim();
    const password = document.getElementById('teacherPassword').value.trim();

    if (!name || !assignedClass || !subject) { showToast('Name, Class, Subject required', true); return; }

    if (username) {
        const dup = teachers.find(t => t.username && t.username.toLowerCase() === username.toLowerCase() && t.id !== id);
        if (dup) { showToast(`Username "${username}" is already taken by ${dup.name}.`, true); return; }
        if (password && password.length < 4) { showToast('Password must be at least 4 characters.', true); return; }
        if (!password && !id) { showToast('Please set a password for the login account.', true); return; }
    }

    const data = {
        name, email: email || '—', assignedClass, subject,
        phone: phone || '—', dateJoined: dateJoined || '—',
        username: username || '',
        password: password || '',
        canLogin: !!username && !!password,
        id: id || ''
    };

    if (id) addUpdateTeacher(data, true);
    else addUpdateTeacher(data, false);
    document.getElementById('teacherModal').classList.remove('active');
}

function populatePaymentYearTermDropdowns(selectedYear, selectedTerm) {
    const yearSel = document.getElementById('paymentYear');
    if (yearSel) {
        yearSel.innerHTML = '<option value="">-- Year --</option>';
        academicYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.id;
            opt.textContent = y.name;
            if (y.id === selectedYear) opt.selected = true;
            yearSel.appendChild(opt);
        });
    }

    const termSel = document.getElementById('paymentTerm');
    if (termSel) {
        termSel.innerHTML = '<option value="">-- Term --</option>';
        terms.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === selectedTerm) opt.selected = true;
            termSel.appendChild(opt);
        });
    }
}

function openAddPayment() {
    if (!students.length) { showToast('Add a student first', true); return; }
    document.getElementById('paymentId').value = '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentDate').value = getLocalDateString();
    document.getElementById('paymentStatus').value = 'Paid';
    document.getElementById('paymentMethod').value = 'Cash';
    document.getElementById('paymentDesc').value = '';
    document.getElementById('paymentReference').value = '';
    populateStudentDropdown('');
    populatePaymentClassDropdown('');
    populatePaymentYearTermDropdowns('', '');
    populatePaymentFeeTypeDropdown('');
    document.getElementById('paymentModal').classList.add('active');
}

function openEditPayment(id) {
    const p = payments.find(p => p.id === id);
    if (!p) return;
    document.getElementById('paymentId').value = p.id;
    document.getElementById('paymentAmount').value = p.amount;
    document.getElementById('paymentDate').value = p.date;
    document.getElementById('paymentStatus').value = p.status || 'Pending';
    document.getElementById('paymentMethod').value = p.method || 'Cash';
    document.getElementById('paymentDesc').value = p.description || '';
    document.getElementById('paymentReference').value = p.reference || '';
    populateStudentDropdown(p.studentName);
    populatePaymentClassDropdown(p.paymentClass || '');
    populatePaymentYearTermDropdowns(p.yearId || '', p.termId || '');
    populatePaymentFeeTypeDropdown(p.feeCategoryId || '');
    document.getElementById('paymentModal').classList.add('active');
}

function savePayment() {
    try {
        function getVal(id) {
            const el = document.getElementById(id);
            return el ? el.value : '';
        }

        const id = getVal('paymentId');
        const studentName = getVal('paymentStudentId');
        const amount = parseFloat(getVal('paymentAmount'));
        const date = getVal('paymentDate');
        const status = getVal('paymentStatus') || 'Paid';
        const method = getVal('paymentMethod') || 'Cash';
        const paymentClass = getVal('paymentClass');
        const desc = getVal('paymentDesc').trim();
        const yearId = getVal('paymentYear');
        const termId = getVal('paymentTerm');
        const feeCategoryId = getVal('paymentFeeType');
        const reference = getVal('paymentReference').trim();

        if (!studentName) { showToast('Please select a student.', true); return; }
        if (isNaN(amount) || amount <= 0) { showToast('Please enter a valid amount greater than 0.', true); return; }
        if (!date) { showToast('Please select a date.', true); return; }

        const data = {
            studentName, amount, date, status,
            paymentClass: paymentClass || '',
            method,
            description: desc || '',
            yearId: yearId || '',
            termId: termId || '',
            feeCategoryId: feeCategoryId || '',
            reference: reference || '',
            id: id || ''
        };

        if (id) addUpdatePayment(data, true);
        else addUpdatePayment(data, false);

        document.getElementById('paymentModal').classList.remove('active');
        showToast('Payment saved successfully!');
        updateAllUI();
    } catch (error) {
        console.error('Error in savePayment:', error);
        showToast('Error: ' + error.message, true);
    }
}

function openAddBudget() {
    document.getElementById('budgetId').value = '';
    document.getElementById('budgetCategory').value = '';
    document.getElementById('budgetAmount').value = '';
    document.getElementById('budgetModalTitle').innerText = 'Set Budget';
    document.getElementById('budgetModal').classList.add('active');
}

function openEditBudget(id) {
    const b = budgets.find(b => b.id === id);
    if (!b) return;
    document.getElementById('budgetId').value = b.id;
    document.getElementById('budgetCategory').value = b.category;
    document.getElementById('budgetAmount').value = b.allocated;
    document.getElementById('budgetModalTitle').innerText = 'Edit Budget';
    document.getElementById('budgetModal').classList.add('active');
}

function saveBudget() {
    const id = document.getElementById('budgetId').value;
    const category = document.getElementById('budgetCategory').value.trim();
    const allocated = parseFloat(document.getElementById('budgetAmount').value);
    if (!category || isNaN(allocated) || allocated <= 0) { showToast('Category and valid amount required', true); return; }
    const data = { category, allocated, id: id || '' };
    if (id) addUpdateBudget(data, true);
    else addUpdateBudget(data, false);
    document.getElementById('budgetModal').classList.remove('active');
}

function openAddExpense() {
    if (!students.length) { showToast('Add a student first', true); return; }
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDate').value = getLocalDateString();
    document.getElementById('expenseMethod').value = 'Cash';
    document.getElementById('expenseClass').value = '';
    document.getElementById('expenseModalTitle').innerText = 'Record Expense';
    populateExpenseStudentDropdown('');
    populateExpenseCategoryDropdown('');
    document.getElementById('expenseModal').classList.add('active');
}

function openEditExpense(id) {
    const e = expenses.find(e => e.id === id);
    if (!e) return;
    document.getElementById('expenseId').value = e.id;
    document.getElementById('expenseDescription').value = e.description;
    document.getElementById('expenseAmount').value = e.amount;
    document.getElementById('expenseDate').value = e.date;
    document.getElementById('expenseMethod').value = e.method;
    document.getElementById('expenseClass').value = e.class || '';
    document.getElementById('expenseModalTitle').innerText = 'Edit Expense';
    populateExpenseStudentDropdown(e.studentName || '');
    populateExpenseCategoryDropdown(e.category);
    const studentName = e.studentName || '';
    if (studentName) {
        const student = students.find(s => s.name === studentName);
        if (student) document.getElementById('expenseClass').value = student.class || '';
    }
    document.getElementById('expenseModal').classList.add('active');
}

function saveExpense() {
    const id = document.getElementById('expenseId').value;
    const studentName = document.getElementById('expenseStudentId').value;
    const cls = document.getElementById('expenseClass').value.trim();
    const category = document.getElementById('expenseCategory').value;
    const description = document.getElementById('expenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;
    const method = document.getElementById('expenseMethod').value;

    if (!budgets.length) {
        showToast('Please create a budget category first before recording expenses.', true);
        document.getElementById('expenseNoBudgetHint').style.display = 'block';
        document.getElementById('expenseNoBudgetHint').style.borderLeft = '3px solid #e74c3c';
        return;
    }

    if (!studentName || !cls || !category || !description || isNaN(amount) || amount <= 0 || !date) {
        showToast('All fields are required (Student, Class, Category, Description, Amount, Date)', true);
        return;
    }

    const data = { studentName, class: cls, category, description, amount, date, method, id: id || '' };
    if (id) addUpdateExpense(data, true);
    else addUpdateExpense(data, false);
    document.getElementById('expenseModal').classList.remove('active');
}

// ─── CSV EXPORT ───
function downloadCSV(data, headers, filename = 'export.csv') {
    if (!data || !data.length) { showToast('No data to export.', true); return; }
    const rows = data.map(row => headers.map(h => {
        let val = row[h] !== undefined ? row[h] : '';
        if (typeof val === 'string') {
            val = val.replace(/"/g, '""');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
        } else if (val === null || val === undefined) val = '';
        return val;
    }).join(','));
    const headerRow = headers.map(h => {
        let hClean = String(h);
        if (hClean.includes(',') || hClean.includes('"')) hClean = `"${hClean}"`;
        return hClean;
    }).join(',');
    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.length} records to ${filename}`);
}

function exportStudentsCSV() {
    let filtered = getScopedStudents().filter(s =>
        (s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
            (s.parentName || '').toLowerCase().includes(studentSearch.toLowerCase())) &&
        (studentClassFilter === 'All' || s.class === studentClassFilter));
    const headers = ['Name','Class','Age','Gender','Admission Date','Status','Parent Name','Parent Contact','Location'];
    const data = filtered.map(s => ({
        'Name': s.name, 'Class': s.class, 'Age': s.age, 'Gender': s.gender,
        'Admission Date': s.admissionDate || '', 'Status': s.status || 'Active',
        'Parent Name': s.parentName || '', 'Parent Contact': s.parentContact || '',
        'Location': s.location || ''
    }));
    downloadCSV(data, headers, 'students.csv');
}

function exportTeachersCSV() {
    let filtered = (isAdmin() ? teachers : getScopedTeachers()).filter(t =>
        t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (t.subject || '').toLowerCase().includes(teacherSearch.toLowerCase()));
    const headers = ['Name','Email','Assigned Class','Subjects','Phone','Date Joined'];
    const data = filtered.map(t => ({
        'Name': t.name, 'Email': t.email || '',
        'Assigned Class': t.assignedClass || '', 'Subjects': t.subject || '',
        'Phone': t.phone || '', 'Date Joined': t.dateJoined || ''
    }));
    downloadCSV(data, headers, 'teachers.csv');
}

function exportPaymentsCSV() {
    if (!isAdmin()) return;
    const headers = ['Student','Fee Type','Amount (GHS)','Date','Method','Reference','Class','Status','Year','Term','Notes'];
    const data = payments.map(p => ({
        'Student': p.studentName,
        'Fee Type': feeCategories.find(c => c.id === p.feeCategoryId)?.name || '',
        'Amount (GHS)': p.amount.toFixed(2),
        'Date': p.date,
        'Method': p.method || 'Cash',
        'Reference': p.reference || '',
        'Class': p.paymentClass || '',
        'Status': p.status || 'Pending',
        'Year': academicYears.find(y => y.id === p.yearId)?.name || '',
        'Term': terms.find(t => t.id === p.termId)?.name || '',
        'Notes': p.description || ''
    }));
    downloadCSV(data, headers, 'payments.csv');
}

function exportBudgetsCSV() {
    if (!isAdmin()) return;
    let filtered = budgets.filter(b => b.category.toLowerCase().includes(budgetSearch.toLowerCase()));
    const headers = ['Category','Allocated (GHS)','Spent (GHS)','Remaining (GHS)','Status'];
    const data = filtered.map(b => {
        const spent = expenses.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
        const rem = b.allocated - spent;
        const status = rem < 0 ? 'Over Budget' : rem < b.allocated * 0.1 ? 'Near Limit' : 'On Track';
        return { 'Category': b.category, 'Allocated (GHS)': b.allocated.toFixed(2),
            'Spent (GHS)': spent.toFixed(2), 'Remaining (GHS)': rem.toFixed(2), 'Status': status };
    });
    downloadCSV(data, headers, 'budgets.csv');
}

function exportExpensesCSV() {
    if (!isAdmin()) return;
    let filtered = expenses.filter(e =>
        e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (e.studentName || '').toLowerCase().includes(expenseSearch.toLowerCase()));
    const headers = ['Student','Class','Category','Description','Amount (GHS)','Date','Method'];
    const data = filtered.map(e => ({
        'Student': e.studentName || '', 'Class': e.class || '', 'Category': e.category,
        'Description': e.description, 'Amount (GHS)': e.amount.toFixed(2),
        'Date': e.date, 'Method': e.method
    }));
    downloadCSV(data, headers, 'expenses.csv');
}

function exportExamsCSV() {
    const headers = ['Name','Subject','Class','Term','Date','Max Score','Type','Status'];
    const data = getScopedExams().map(e => {
        const status = getExamStatus(e);
        const termName = terms.find(t => t.id === e.termId)?.name || '—';
        return { 'Name': e.name, 'Subject': e.subject, 'Class': e.class, 'Term': termName,
            'Date': e.date, 'Max Score': e.maxScore, 'Type': e.type || 'Other', 'Status': status };
    });
    downloadCSV(data, headers, 'exams.csv');
}

function exportClassesCSV() {
    let filtered = getScopedClasses().filter(c => {
        const matchName = c.name.toLowerCase().includes(classSearch.toLowerCase());
        const matchLevel = classLevelFilter === 'All' || c.level === classLevelFilter;
        return matchName && matchLevel;
    });
    filtered = [...filtered].sort(sortClasses);
    const headers = ['Name','Level','Capacity','Enrolled Students','Status'];
    const data = filtered.map(c => {
        const enrolled = students.filter(s => s.class === c.name && s.status === 'Active').length;
        return { 'Name': c.name, 'Level': c.level, 'Capacity': c.capacity,
            'Enrolled Students': enrolled, 'Status': c.status };
    });
    downloadCSV(data, headers, 'classes.csv');
}

function exportSubjectsCSV() {
    const headers = ['Name','Code','Level','Description'];
    const data = subjects.map(s => ({ 'Name': s.name, 'Code': s.code || '',
        'Level': s.level || '', 'Description': s.description || '' }));
    downloadCSV(data, headers, 'subjects.csv');
}

// ═══════════════════════════════════════════════════════════════
// ACADEMIC YEARS / FEE CATEGORIES
// ═══════════════════════════════════════════════════════════════
function renderAcademicYears() {
    const tbody = document.getElementById('academicYearsTbody');
    if (!tbody) return;

    if (!academicYears.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#8c7da1;">No academic years defined. Add one above.</td></tr>';
        return;
    }

    tbody.innerHTML = academicYears.map(y => `
        <tr>
            <td><strong>${escapeHtml(y.name)}</strong></td>
            <td class="action-icons">
                <i class="fas fa-edit" onclick="editAcademicYear('${y.id}')"></i>
                <i class="fas fa-trash-alt" onclick="deleteAcademicYear('${y.id}')"></i>
            </td>
        </tr>
    `).join('');
}

function addAcademicYear() {
    if (!isAdmin()) return;
    const input = document.getElementById('newAcademicYearName');
    const name = input.value.trim();
    if (!name) { showToast('Please enter an academic year (e.g. 2026/2027).', true); return; }
    if (academicYears.some(y => y.name.toLowerCase() === name.toLowerCase())) {
        showToast('Academic Year already exists.', true);
        return;
    }
    academicYears.push({ id: generateId('AY'), name });
    saveToLocal();
    renderAcademicYears();
    populateFeeStructureDropdowns();
    populateRegisterFilters();
    populateArrearsFilters();
    input.value = '';
    showToast('Academic Year added.');
}

function editAcademicYear(id) {
    if (!isAdmin()) return;
    const y = academicYears.find(x => x.id === id);
    if (!y) return;
    const newName = prompt('Edit academic year:', y.name);
    if (newName && newName.trim()) {
        y.name = newName.trim();
        saveToLocal();
        renderAcademicYears();
        populateFeeStructureDropdowns();
        populateRegisterFilters();
        populateArrearsFilters();
        showToast('Academic Year updated.');
    }
}

function deleteAcademicYear(id) {
    if (!isAdmin()) return;
    const y = academicYears.find(x => x.id === id);
    if (!y) return;
    if (!confirm(`Delete academic year "${y.name}"? Any fee structure entries linked to it will also be removed.`)) return;

    academicYears = academicYears.filter(x => x.id !== id);
    feeStructure = feeStructure.filter(f => f.yearId !== id);
    saveToLocal();
    renderAcademicYears();
    renderFeeStructure();
    populateFeeStructureDropdowns();
    populateRegisterFilters();
    populateArrearsFilters();
    showToast('Academic Year deleted.');
}

function renderFeeCategories() {
    const tbody = document.getElementById('feeCategoriesTbody');
    if (!tbody) return;

    if (!feeCategories.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#8c7da1;">No fee categories defined. Add one above.</td></tr>';
        return;
    }

    tbody.innerHTML = feeCategories.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td class="action-icons">
                <i class="fas fa-edit" onclick="editFeeCategory('${c.id}')"></i>
                <i class="fas fa-trash-alt" onclick="deleteFeeCategory('${c.id}')"></i>
            </td>
        </tr>
    `).join('');
}

function addFeeCategory() {
    if (!isAdmin()) return;
    const input = document.getElementById('newFeeCategoryName');
    const name = input.value.trim();
    if (!name) { showToast('Please enter a fee category name.', true); return; }
    if (feeCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        showToast('Fee Category already exists.', true);
        return;
    }
    feeCategories.push({ id: generateId('FC'), name });
    saveToLocal();
    renderFeeCategories();
    populateFeeStructureDropdowns();
    populatePaymentFeeTypeDropdown('');
    input.value = '';
    showToast('Fee Category added.');
}

function editFeeCategory(id) {
    if (!isAdmin()) return;
    const c = feeCategories.find(x => x.id === id);
    if (!c) return;
    const newName = prompt('Edit fee category:', c.name);
    if (newName && newName.trim()) {
        c.name = newName.trim();
        saveToLocal();
        renderFeeCategories();
        populateFeeStructureDropdowns();
        populatePaymentFeeTypeDropdown('');
        renderPayments();
        showToast('Fee Category updated.');
    }
}

function deleteFeeCategory(id) {
    if (!isAdmin()) return;
    const c = feeCategories.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Delete fee category "${c.name}"? Any fee structure entries linked to it will also be removed.`)) return;

    feeCategories = feeCategories.filter(x => x.id !== id);
    feeStructure = feeStructure.filter(f => f.categoryId !== id);
    saveToLocal();
    renderFeeCategories();
    renderFeeStructure();
    populateFeeStructureDropdowns();
    populatePaymentFeeTypeDropdown('');
    renderPayments();
    showToast('Fee Category deleted.');
}

// ═══════════════════════════════════════════════════════════════
// FEE STRUCTURE — Grouped by Level → Class → Year/Term
// ═══════════════════════════════════════════════════════════════
function renderFeeStructure() {
    const container = document.getElementById('feeSetupCardsContainer');
    const badge = document.getElementById('feeStructureCountBadge');
    if (!container) return;

    const totalValue = feeStructure.reduce((s, f) => s + (f.amount || 0), 0);
    const classesWithFees = new Set(feeStructure.map(f => f.classId)).size;
    const setStat = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setStat('feeStatsClassCount', classesWithFees);
    setStat('feeStatsEntryCount', feeStructure.length);
    setStat('feeStatsTotalValue', formatMoney(totalValue));

    if (badge) badge.innerText = feeStructure.length;

    if (!classes.length) {
        container.innerHTML = `
            <div class="fee-empty-overall">
                <i class="fas fa-book-open"></i>
                <h4>No Classes Yet</h4>
                <p>Add classes first from the <strong>Classes</strong> tab, then come back to set up fees.</p>
            </div>`;
        return;
    }

    const q = (feeStructureSearch || '').trim().toLowerCase();

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
        const levelClasses = byLevel[level].sort(sortClasses);

        let levelTotal = 0;
        levelClasses.forEach(c => {
            feeStructure.filter(f => f.classId === c.id).forEach(f => {
                levelTotal += (f.amount || 0);
            });
        });

        html += `
            <div class="fee-level-group">
                <div class="fee-level-header" onclick="toggleFeeLevelGroup(this)">
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
                    ${levelClasses.map(c => renderFeeClassCard(c, feeStructure.filter(f => f.classId === c.id))).join('')}
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderFeeClassCard(cls, entries) {
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

    const adminUser = isAdmin();

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
                    ${adminUser ? `
                    <div class="fee-entry-actions">
                        <i class="fas fa-edit" onclick="openEditFeeStructure('${e.id}')" title="Edit"></i>
                        <i class="fas fa-trash-alt" onclick="deleteFeeStructure('${e.id}')" title="Delete"></i>
                    </div>` : ''}
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
        ? `<div class="fee-class-empty">No fee entries yet. Click "Add Entry" below to set up fees for this class.</div>`
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
                ${adminUser ? `<button class="fee-class-add-btn" onclick="openAddFeeStructureForClass('${cls.id}')"><i class="fas fa-plus"></i> Add Entry</button>` : ''}
            </div>
        </div>
    `;
}

function toggleFeeLevelGroup(header) {
    const group = header.closest('.fee-level-group');
    if (!group) return;
    const body = group.querySelector('.fee-level-body');
    const toggle = group.querySelector('.fee-level-toggle');
    if (body) body.classList.toggle('collapsed');
    if (toggle) toggle.classList.toggle('collapsed');
}

function openAddFeeStructureForClass(classId) {
    if (!isAdmin()) return;
    if (!academicYears.length) { showToast('Add an academic year in Settings first.', true); return; }
    if (!terms.length) { showToast('Add a term in Settings first.', true); return; }
    if (!feeCategories.length) { showToast('Add a fee category in Settings first.', true); return; }

    document.getElementById('feeStructureId').value = '';
    document.getElementById('feeStructureAmount').value = '';
    document.getElementById('feeStructureModalTitle').textContent = 'Add Fee Entry';

    populateFeeStructureDropdowns();
    document.getElementById('feeStructureClass').value = classId;

    document.getElementById('feeStructureModal').classList.add('active');
}

function populateFeeStructureDropdowns() {
    const classSel = document.getElementById('feeStructureClass');
    if (classSel) {
        const cur = classSel.value;
        classSel.innerHTML = '<option value="">-- Select Class --</option>';
        [...classes].sort(sortClasses).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            if (c.id === cur) opt.selected = true;
            classSel.appendChild(opt);
        });
    }

    const yearSel = document.getElementById('feeStructureYear');
    if (yearSel) {
        const cur = yearSel.value;
        yearSel.innerHTML = '<option value="">-- Select Year --</option>';
        academicYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.id;
            opt.textContent = y.name;
            if (y.id === cur) opt.selected = true;
            yearSel.appendChild(opt);
        });
    }

    const termSel = document.getElementById('feeStructureTerm');
    if (termSel) {
        const cur = termSel.value;
        termSel.innerHTML = '<option value="">-- Select Term --</option>';
        terms.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === cur) opt.selected = true;
            termSel.appendChild(opt);
        });
    }

    const catSel = document.getElementById('feeStructureCategory');
    if (catSel) {
        const cur = catSel.value;
        catSel.innerHTML = '<option value="">-- Select Category --</option>';
        feeCategories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            if (c.id === cur) opt.selected = true;
            catSel.appendChild(opt);
        });
    }
}

function openAddFeeStructure() {
    if (!isAdmin()) return;
    if (!classes.length) { showToast('Add a class first.', true); return; }
    if (!academicYears.length) { showToast('Add an academic year in Settings first.', true); return; }
    if (!terms.length) { showToast('Add a term in Settings first.', true); return; }
    if (!feeCategories.length) { showToast('Add a fee category in Settings first.', true); return; }

    document.getElementById('feeStructureId').value = '';
    document.getElementById('feeStructureAmount').value = '';
    document.getElementById('feeStructureModalTitle').textContent = 'Add Fee Entry';

    populateFeeStructureDropdowns();
    document.getElementById('feeStructureModal').classList.add('active');
}

function openEditFeeStructure(id) {
    if (!isAdmin()) return;
    const f = feeStructure.find(x => x.id === id);
    if (!f) return;

    document.getElementById('feeStructureId').value = f.id;
    populateFeeStructureDropdowns();
    document.getElementById('feeStructureClass').value = f.classId;
    document.getElementById('feeStructureYear').value = f.yearId;
    document.getElementById('feeStructureTerm').value = f.termId;
    document.getElementById('feeStructureCategory').value = f.categoryId;
    document.getElementById('feeStructureAmount').value = f.amount;
    document.getElementById('feeStructureModalTitle').textContent = 'Edit Fee Entry';
    document.getElementById('feeStructureModal').classList.add('active');
}

function closeFeeStructureModal() {
    document.getElementById('feeStructureModal').classList.remove('active');
}

function saveFeeStructure() {
    const id = document.getElementById('feeStructureId').value;
    const classId = document.getElementById('feeStructureClass').value;
    const yearId = document.getElementById('feeStructureYear').value;
    const termId = document.getElementById('feeStructureTerm').value;
    const categoryId = document.getElementById('feeStructureCategory').value;
    const amount = parseFloat(document.getElementById('feeStructureAmount').value);

    if (!classId || !yearId || !termId || !categoryId) {
        showToast('Please fill all required fields.', true);
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount greater than 0.', true);
        return;
    }

    const dup = feeStructure.find(f =>
        f.classId === classId &&
        f.yearId === yearId &&
        f.termId === termId &&
        f.categoryId === categoryId &&
        f.id !== id
    );
    if (dup) {
        showToast('A fee entry already exists for that Class + Year + Term + Category.', true);
        return;
    }

    const data = { classId, yearId, termId, categoryId, amount, id: id || generateId('FS') };

    if (id) {
        const idx = feeStructure.findIndex(f => f.id === id);
        if (idx !== -1) feeStructure[idx] = data;
    } else {
        feeStructure.push(data);
    }

    saveToLocal();
    renderFeeStructure();
    renderPaymentRegister();
    renderArrearsView();
    closeFeeStructureModal();
    showToast(id ? 'Fee entry updated.' : 'Fee entry added.');
}

function deleteFeeStructure(id) {
    if (!isAdmin()) return;
    if (!confirm('Delete this fee entry?')) return;
    feeStructure = feeStructure.filter(f => f.id !== id);
    saveToLocal();
    renderFeeStructure();
    renderPaymentRegister();
    renderArrearsView();
    showToast('Fee entry deleted.');
}

function exportFeeStructureCSV() {
    if (!feeStructure.length) { showToast('No fee entries to export.', true); return; }
    const headers = ['Class','Academic Year','Term','Fee Category','Amount (GHS)'];
    const data = feeStructure.map(f => {
        const cls = classes.find(c => c.id === f.classId);
        const year = academicYears.find(y => y.id === f.yearId);
        const term = terms.find(t => t.id === f.termId);
        const cat = feeCategories.find(c => c.id === f.categoryId);
        return {
            'Class': cls ? cls.name : '',
            'Academic Year': year ? year.name : '',
            'Term': term ? term.name : '',
            'Fee Category': cat ? cat.name : '',
            'Amount (GHS)': (f.amount || 0).toFixed(2)
        };
    });
    downloadCSV(data, headers, 'fee_structure.csv');
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT REGISTER
// ═══════════════════════════════════════════════════════════════
function populateRegisterFilters() {
    const yearSel = document.getElementById('registerYearFilter');
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

    const termSel = document.getElementById('registerTermFilter');
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

    const classSel = document.getElementById('registerClassFilter');
    if (classSel) {
        const cur = classSel.value;
        classSel.innerHTML = '<option value="">All Classes</option>';
        [...classes].sort(sortClasses).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            if (c.name === cur) opt.selected = true;
            classSel.appendChild(opt);
        });
    }
}

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
        const year = academicYears.find(y => y.id === f.yearId);
        const term = terms.find(t => t.id === f.termId);

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
            paid,
            yearName: year ? year.name : '',
            termName: term ? term.name : ''
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

function getClassRegisterSummary(className, yearId, termId) {
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

function renderPaymentRegister() {
    if (!isAdmin()) return;

    const yearSel = document.getElementById('registerYearFilter');
    const termSel = document.getElementById('registerTermFilter');
    const yearId = yearSel ? yearSel.value : '';
    const termId = termSel ? termSel.value : '';

    registerYearFilter = yearId;
    registerTermFilter = termId;

    if (!registerDetailClass) {
        renderRegisterGroups(yearId, termId);
        return;
    }

    renderRegisterDetail(yearId, termId);
}

function renderRegisterGroups(yearId, termId) {
    const container = document.getElementById('registerGroupsContainer');
    if (!container) return;

    const groupsView = document.getElementById('registerGroupsView');
    const detailView = document.getElementById('registerDetailView');
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
    setEl('regTotalStudents', activeStudents.length);
    setEl('regTotalExpected', formatMoney(overallDue));
    setEl('regTotalCollected', formatMoney(overallPaid));
    setEl('regTotalOutstanding', formatMoney(Math.max(overallDue - overallPaid, 0)));
    setEl('regFullyPaid', fp);
    setEl('regPartiallyPaid', pp);
    setEl('regUnpaid', up);

    const activeClasses = classes.filter(c => c.status === 'Active');

    if (!activeClasses.length) {
        container.innerHTML = `
            <div class="register-groups-empty">
                <i class="fas fa-book-open"></i>
                <h3>No Classes Yet</h3>
                <p>Add classes from the <strong>Classes</strong> tab first, then come back to organize the payment register.</p>
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
        const levelClasses = byLevel[level].sort(sortClasses);

        let levelStudents = 0, levelDue = 0, levelPaid = 0;
        levelClasses.forEach(c => {
            const sum = getClassRegisterSummary(c.name, yearId, termId);
            levelStudents += sum.studentCount;
            levelDue += sum.totalDue;
            levelPaid += sum.totalPaid;
        });

        html += `
            <div class="register-level-group">
                <div class="register-level-header" onclick="toggleRegisterLevelGroup(this)">
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
                        ${levelClasses.map(c => renderRegisterClassCard(c, yearId, termId)).join('')}
                    </div>
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderRegisterClassCard(cls, yearId, termId) {
    const sum = getClassRegisterSummary(cls.name, yearId, termId);
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
                <button class="view-register-btn" onclick="openClassRegister('${safeName}')">
                    <i class="fas fa-eye"></i> View Payment Register
                </button>
            </div>
        </div>`;
}

function toggleRegisterLevelGroup(header) {
    const group = header.closest('.register-level-group');
    if (!group) return;
    const body = group.querySelector('.register-level-body');
    const toggle = group.querySelector('.register-level-toggle');
    if (body) body.classList.toggle('collapsed');
    if (toggle) toggle.classList.toggle('collapsed');
}

function openClassRegister(className) {
    registerDetailClass = className;
    renderPaymentRegister();
}

function backToRegisterGroups() {
    registerDetailClass = null;
    renderPaymentRegister();
}

function renderRegisterDetail(yearId, termId) {
    const className = registerDetailClass;
    if (!className) return;

    const groupsView = document.getElementById('registerGroupsView');
    const detailView = document.getElementById('registerDetailView');
    if (groupsView) groupsView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    const nameEl = document.getElementById('registerDetailClassName');
    if (nameEl) nameEl.textContent = className;
    const subEl = document.getElementById('registerDetailSubtitle');
    if (subEl) subEl.textContent = `Detailed student payment register for ${className}`;

    const sum = getClassRegisterSummary(className, yearId, termId);
    const summaryContainer = document.getElementById('registerDetailSummaryCards');
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

    const tbody = document.getElementById('paymentRegisterTbody');
    const badge = document.getElementById('registerCountBadge');
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
        renderRegisterFooterSummary([], yearId, termId);
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
                    <button class="reg-view-btn" onclick="openRegisterStudentView('${r.student.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    if (badge) badge.innerText = rows.length;
    renderRegisterFooterSummary(rows, yearId, termId);
}

function renderRegisterSummary(rows, yearId, termId) {
    let totalStudents = rows.length;
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let fullyPaid = 0;
    let partiallyPaid = 0;
    let unpaid = 0;

    rows.forEach(r => {
        totalExpected += r.totalDue;
        totalCollected += r.totalPaid;
        totalOutstanding += Math.max(r.balance, 0);
        if (r.status === 'paid') fullyPaid++;
        else if (r.status === 'partial') partiallyPaid++;
        else if (r.status === 'unpaid') unpaid++;
    });

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl('regTotalStudents', totalStudents);
    setEl('regTotalExpected', formatMoney(totalExpected));
    setEl('regTotalCollected', formatMoney(totalCollected));
    setEl('regTotalOutstanding', formatMoney(totalOutstanding));
    setEl('regFullyPaid', fullyPaid);
    setEl('regPartiallyPaid', partiallyPaid);
    setEl('regUnpaid', unpaid);
}

function renderRegisterFooterSummary(rows, yearId, termId) {
    const footer = document.getElementById('registerFooterSummary');
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

function openRegisterStudentView(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) { showToast('Student not found.', true); return; }

    const modal = document.getElementById('studentDetailsModal');
    const content = document.getElementById('studentDetailsContent');
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
            termKeys[key] = {
                yearId: f.yearId,
                termId: f.termId,
                categories: []
            };
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

            let termDue = 0;
            let termPaid = 0;

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
                    <div class="fee-line" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0edf5;">
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
                        <div style="background:#f4edff;padding:8px 10px;border-radius:8px;text-align:center;">
                            <div style="font-size:0.75rem;color:#8c7da1;font-weight:700;">DUE</div>
                            <div style="font-size:1rem;font-weight:800;color:#5c3c8e;">${formatMoney(termDue)}</div>
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
                <p>Set up fee entries in <strong>Payments → Fee Setup</strong> for this student's class to see a term-by-term breakdown.</p>
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
                    <td><code style="background:#f4edff;padding:2px 8px;border-radius:6px;font-size:0.75rem;color:#6c3a9d;">${escapeHtml(p.id)}</code></td>
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
                <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#6c3a9d,#8b5bb8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;flex-shrink:0;box-shadow:0 4px 14px rgba(108,58,157,0.25);">
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
                <span class="status-pill ${student.status === 'Active' ? 'status-active' : 'status-inactive'}">${student.status || 'Active'}</span>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
            <div style="background:linear-gradient(135deg,#f4edff,#faf7ff);border-radius:14px;padding:16px;text-align:center;border:1px solid #e9e0f6;">
                <div style="font-size:1.4rem;font-weight:800;color:#5c3c8e;">${formatMoney(totalFeesAllTime)}</div>
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
            <i class="fas fa-calendar-alt" style="color:#8e44ad;"></i> Term-by-Term Breakdown
            <span style="font-size:0.72rem;font-weight:400;color:#8c7da1;margin-left:8px;">All Academic Years · All Terms</span>
        </div>

        <div class="term-statement-grid" style="margin-bottom:24px;">
            ${termCardsHtml}
        </div>

        <div class="installment-note">
            <i class="fas fa-info-circle"></i>
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

function exportRegisterCSV() {
    const yearSel = document.getElementById('registerYearFilter');
    const termSel = document.getElementById('registerTermFilter');
    const yearId = yearSel ? yearSel.value : '';
    const termId = termSel ? termSel.value : '';
    const className = registerDetailClass || '';

    let filteredStudents = [...students].filter(s => s.status === 'Active');
    if (className) filteredStudents = filteredStudents.filter(s => s.class === className);
    filteredStudents.sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));

    if (!filteredStudents.length) { showToast('No students to export.', true); return; }

    const headers = ['No.','Student Name','Student ID','Class','Fee Details','Total Due (GHS)','Total Paid (GHS)','Balance (GHS)','Status'];
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
        return {
            'No.': idx + 1,
            'Student Name': s.name,
            'Student ID': s.id,
            'Class': s.class,
            'Fee Details': details || '—',
            'Total Due (GHS)': feeInfo.totalDue.toFixed(2),
            'Total Paid (GHS)': totalPaid.toFixed(2),
            'Balance (GHS)': balance.toFixed(2),
            'Status': status
        };
    });

    downloadCSV(rows, headers, 'payment_register.csv');
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5 — ARREARS VIEW
// ═══════════════════════════════════════════════════════════════
function populateArrearsFilters() {
    const yearSel = document.getElementById('arrearsYearFilter');
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

    const termSel = document.getElementById('arrearsTermFilter');
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

    const classSel = document.getElementById('arrearsClassFilter');
    if (classSel) {
        const cur = classSel.value;
        classSel.innerHTML = '<option value="">All Classes</option>';
        [...classes].sort(sortClasses).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            if (c.name === cur) opt.selected = true;
            classSel.appendChild(opt);
        });
    }
}

function renderArrearsView() {
    if (!isAdmin()) return;

    const tbody = document.getElementById('arrearsTbody');
    const badge = document.getElementById('arrearsCountBadge');
    if (!tbody) return;

    const yearSel = document.getElementById('arrearsYearFilter');
    const termSel = document.getElementById('arrearsTermFilter');
    const classSel = document.getElementById('arrearsClassFilter');
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
    setEl('arrearsTotalOwed', formatMoney(totalOwed));
    setEl('arrearsStudentCount', studentCount);
    setEl('arrearsFullyCleared', fullyClearedCount);
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
                    <button class="reg-view-btn" onclick="openRegisterStudentView('${r.student.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function exportArrearsCSV() {
    const yearSel = document.getElementById('arrearsYearFilter');
    const termSel = document.getElementById('arrearsTermFilter');
    const classSel = document.getElementById('arrearsClassFilter');
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

    const headers = ['No.','Student Name','Student ID','Class','Total Due (GHS)','Total Paid (GHS)','Balance (GHS)','Status'];
    const rows = arrearsRows.map((r, idx) => ({
        'No.': idx + 1,
        'Student Name': r.student.name,
        'Student ID': r.student.id,
        'Class': r.student.class,
        'Total Due (GHS)': r.totalDue.toFixed(2),
        'Total Paid (GHS)': r.totalPaid.toFixed(2),
        'Balance (GHS)': r.balance.toFixed(2),
        'Status': r.totalPaid > 0 ? 'Partial' : 'Unpaid'
    }));

    downloadCSV(rows, headers, 'arrears.csv');
}

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE DISPLAY (in report card)
// ═══════════════════════════════════════════════════════════════
function updateAttendanceDisplay(studentId) {
    const valueEl = document.getElementById('perfAttendanceValue');
    const sub     = document.getElementById('perfAttendanceSub');
    if (!valueEl || !sub) return;

    const auto = getStudentAttendancePct(studentId);

    if (auto && auto.total > 0) {
        const pct = auto.pct;

        valueEl.textContent = pct.toFixed(1) + '%';
        valueEl.style.color =
            pct >= 90 ? '#27ae60' :
            pct >= 75 ? '#2ecc71' :
            pct >= 60 ? '#f39c12' : '#e74c3c';

        sub.textContent = `${auto.present + auto.late}/${auto.total} days attended`;
        sub.className =
            'sub' +
            (pct < 60 ? ' danger'  :
             pct < 75 ? ' warning' : '');
    } else {
        valueEl.textContent = '—';
        valueEl.style.color = '#95a5a6';
        sub.textContent = 'No attendance records yet';
        sub.className = 'sub';
    }
}

function refreshOpenPerfAttendance(studentId) {
    const modal = document.getElementById('performanceModal');
    if (!modal || !modal.classList.contains('active')) return;
    const perfIdEl = document.getElementById('perfId');
    if (perfIdEl && perfIdEl.textContent === studentId) {
        updateAttendanceDisplay(studentId);
    }
}

// ─── PERFORMANCE MODAL ───
function calculateStudentPerformance(studentId, termId = 'all') {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    let termExams = exams;
    if (termId !== 'all') termExams = exams.filter(e => e.termId === termId);

    const classStudents = students.filter(s => s.class === student.class && s.status === 'Active');
    const classSize = classStudents.length;

    const studentGrades = examGrades.filter(g => {
        const exam = termExams.find(e => e.id === g.examId);
        return exam && g.studentId === studentId;
    });

    const subjectMap = {};
    studentGrades.forEach(g => {
        const exam = termExams.find(e => e.id === g.examId);
        if (!exam) return;
        const subject = exam.subject;
        if (!subjectMap[subject]) subjectMap[subject] = { exams: [], grades: [] };
        subjectMap[subject].exams.push(exam);
        subjectMap[subject].grades.push(g);
    });

    const IA_CATEGORY_MAX = 15;
    const IA_TOTAL_MAX    = 60;
    const END_TERM_MAX    = 100;

    function calcSubjectOverall(sGrades) {
        const ts = {};
        sGrades.forEach(g => {
            const e = termExams.find(ex => ex.id === g.examId);
            if (!e) return;
            const type = e.type || 'Other';
            if (!ts[type]) ts[type] = { score: 0, max: 0 };
            ts[type].score += g.score;
            ts[type].max += (e.maxScore || 100);
        });

        const i  = ts['Individual Test']  || { score: 0, max: 0 };
        const gw = ts['Group Work']       || { score: 0, max: 0 };
        const ct = ts['Class Test']       || { score: 0, max: 0 };
        const pj = ts['Project']          || { score: 0, max: 0 };
        const et = ts['End of Term Exam'] || { score: 0, max: 0 };

        const iS  = i.max  > 0 ? (i.score  / i.max)  * IA_CATEGORY_MAX : 0;
        const gwS = gw.max > 0 ? (gw.score / gw.max) * IA_CATEGORY_MAX : 0;
        const ctS = ct.max > 0 ? (ct.score / ct.max) * IA_CATEGORY_MAX : 0;
        const pjS = pj.max > 0 ? (pj.score / pj.max) * IA_CATEGORY_MAX : 0;

        const totalIA = iS + gwS + ctS + pjS;
        const scaled50 = (totalIA / IA_TOTAL_MAX) * 50;

        const etS = et.max > 0 ? (et.score / et.max) * END_TERM_MAX : 0;
        const exam50 = (etS / END_TERM_MAX) * 50;

        return scaled50 + exam50;
    }

    const subjectResults = [];

    Object.keys(subjectMap).forEach(subject => {
        const examsList = subjectMap[subject].exams;
        const gradesList = subjectMap[subject].grades;

        const typeScores = {};
        examsList.forEach((exam, idx) => {
            const score = gradesList[idx].score;
            const max   = exam.maxScore || 100;
            const type  = exam.type || 'Other';
            if (!typeScores[type]) typeScores[type] = { score: 0, max: 0 };
            typeScores[type].score += score;
            typeScores[type].max   += max;
        });

        const individual = typeScores['Individual Test']  || { score: 0, max: 0 };
        const group      = typeScores['Group Work']       || { score: 0, max: 0 };
        const classTest  = typeScores['Class Test']       || { score: 0, max: 0 };
        const project    = typeScores['Project']          || { score: 0, max: 0 };
        const endTerm    = typeScores['End of Term Exam'] || { score: 0, max: 0 };

        const individualScaled = individual.max > 0 ? (individual.score / individual.max) * IA_CATEGORY_MAX : 0;
        const groupScaled      = group.max      > 0 ? (group.score      / group.max)      * IA_CATEGORY_MAX : 0;
        const classTestScaled  = classTest.max  > 0 ? (classTest.score  / classTest.max)  * IA_CATEGORY_MAX : 0;
        const projectScaled    = project.max    > 0 ? (project.score    / project.max)    * IA_CATEGORY_MAX : 0;

        const totalIA = individualScaled + groupScaled + classTestScaled + projectScaled;
        const scaled50 = (totalIA / IA_TOTAL_MAX) * 50;

        const endTermScaled = endTerm.max > 0 ? (endTerm.score / endTerm.max) * END_TERM_MAX : 0;
        const exam50 = (endTermScaled / END_TERM_MAX) * 50;

        const overallTotal = scaled50 + exam50;
        const overallPct   = overallTotal;
        const grade        = getOverallGrade(overallPct);

        const allStudents = classStudents.filter(s => s.id !== studentId);
        const subjectGrades = allStudents.map(s => {
            const sGrades = examGrades.filter(g => {
                const e = termExams.find(ex => ex.id === g.examId);
                return e && e.subject === subject && e.class === student.class && g.studentId === s.id;
            });
            if (!sGrades.length) return null;
            return calcSubjectOverall(sGrades);
        }).filter(v => v !== null && v !== undefined);

        const allPcts = [...subjectGrades, overallPct];
        allPcts.sort((a, b) => b - a);
        let position = allPcts.indexOf(overallPct) + 1;
        if (position === 0) position = '—';

        subjectResults.push({
            subject,
            individual: individualScaled.toFixed(0),
            group:      groupScaled.toFixed(0),
            classTest:  classTestScaled.toFixed(0),
            project:    projectScaled.toFixed(0),
            total:      totalIA.toFixed(0),
            scaledTo50: scaled50,
            endTerm:    endTermScaled.toFixed(0),
            exam50:     exam50,
            overallTotal: overallTotal,
            overallPct,
            grade,
            position
        });
    });

    let overallAvg = 0;
    if (subjectResults.length) {
        overallAvg = subjectResults.reduce((s, r) => s + r.overallPct, 0) / subjectResults.length;
    }
    const overallGrade = getOverallGrade(overallAvg);

    const allOverall = {};
    classStudents.forEach(s => {
        const sGrades = examGrades.filter(g => {
            const e = termExams.find(ex => ex.id === g.examId);
            return e && e.class === student.class && g.studentId === s.id;
        });
        if (!sGrades.length) return;
        allOverall[s.id] = calcSubjectOverall(sGrades);
    });
    const sortedOverall = Object.entries(allOverall).sort((a, b) => b[1] - a[1]);
    let classPosition = sortedOverall.findIndex(([id]) => id === studentId) + 1;
    if (classPosition === 0) classPosition = '—';

    const strengths = [], improvements = [];
    subjectResults.forEach(r => {
        if (r.overallPct >= 80) strengths.push(`${r.subject} (${r.overallPct.toFixed(0)}%)`);
        else if (r.overallPct < 60) improvements.push(`${r.subject} (${r.overallPct.toFixed(0)}%)`);
    });
    if (!strengths.length) strengths.push('No specific strengths recorded yet.');
    if (!improvements.length) improvements.push('No areas for improvement identified yet.');

    const teacherComment = overallGrade === 'A' ? 'Excellent performance across all subjects. Keep up the great work!' :
        overallGrade === 'B' ? 'Good performance with room for improvement in a few areas. Continue working hard.' :
        overallGrade === 'C' ? 'Satisfactory performance. Focus on improving weaker subjects.' :
        overallGrade === 'D' ? 'Needs significant improvement in most subjects. Please seek extra help.' :
        'Requires urgent attention. Please consult with the class teacher for support.';

    const headComment = overallGrade === 'A' ? 'Outstanding academic performance. A role model for peers.' :
        overallGrade === 'B' ? 'Commendable effort. Keep striving for excellence.' :
        overallGrade === 'C' ? 'Adequate performance. Set higher goals for the next term.' :
        overallGrade === 'D' ? 'Below average performance. Please work closely with teachers to improve.' :
        'Unsatisfactory performance. Immediate intervention is required.';

    const autoAtt = getStudentAttendancePct(studentId);
    const attendanceRate = (autoAtt && autoAtt.total > 0) ? autoAtt.pct : 0;

    return { attendanceRate, classPosition, classSize, overallAvg, overallGrade,
        subjectResults, strengths, improvements, teacherComment, headComment,
        totalExams: subjectResults.length, attendanceStats: autoAtt };
}

function renderPerformanceData(data, student) {
    if (!data) return;

    updateAttendanceDisplay(student.id);

    document.getElementById('perfPosition').innerHTML = data.classPosition !== '—' ? `#${data.classPosition}` : '—';
    document.getElementById('perfPositionSub').innerHTML = `of <span id="perfClassSize">${data.classSize}</span> students`;
    document.getElementById('perfClassSizeDisplay').innerHTML = data.classSize;
    document.getElementById('perfClassSizeSub').innerText = 'students';
    document.getElementById('perfAvgScore').innerHTML = `${data.overallAvg.toFixed(1)}%`;
    document.getElementById('perfAvgSub').innerText = data.totalExams > 0 ? `${data.totalExams} subject(s)` : 'No exams';

    const gradeColor = getGradeColor(data.overallGrade);
    document.getElementById('perfGrade').innerHTML = data.overallGrade || '—';
    document.getElementById('perfGrade').style.color = gradeColor;
    document.getElementById('perfGradeSub').innerText = data.overallGrade ? 'grade' : 'No data';

    const tbody = document.getElementById('perfSubjectTbody');
    if (!data.subjectResults.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:20px;">No exam data available for this student.</td></tr>`;
    } else {
        tbody.innerHTML = data.subjectResults.map(r => {
            const posClass = r.position === 1 ? 'rank-1' : r.position === 2 ? 'rank-2' : r.position === 3 ? 'rank-3' : 'rank-other';
            const gradeClass = getGradeClass(r.grade);
            return `
                <tr>
                    <td><strong>${escapeHtml(r.subject)}</strong></td>
                    <td>${r.individual}</td>
                    <td>${r.group}</td>
                    <td>${r.classTest}</td>
                    <td>${r.project}</td>
                    <td>${r.total}</td>
                    <td>${r.endTerm}</td>
                    <td><strong>${r.overallPct.toFixed(0)}%</strong></td>
                    <td><span class="rank-badge ${posClass}">${r.position !== '—' ? `#${r.position}` : '—'}</span></td>
                    <td><span class="grade-range ${gradeClass}">${r.grade}</span></td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('perfTeacherComment').innerHTML = escapeHtml(data.teacherComment);
    document.getElementById('perfHeadComment').innerHTML = escapeHtml(data.headComment);

    const strengthsList = document.getElementById('perfStrengths');
    strengthsList.innerHTML = data.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('');
    const improvementsList = document.getElementById('perfImprovements');
    improvementsList.innerHTML = data.improvements.map(s => `<li>${escapeHtml(s)}</li>`).join('');

    renderPerfChart(data.subjectResults);

    if (data.subjectResults.length) renderScoringBreakdown(data.subjectResults[0]);
    else document.getElementById('scoringBreakdown').innerHTML = '';
}

function renderPerfChart(subjectResults) {
    const canvas = document.getElementById('perfChartCanvas');
    if (!canvas) return;

    if (perfChartInstance) {
        perfChartInstance.destroy();
        perfChartInstance = null;
    }

    if (!subjectResults || !subjectResults.length) {
        const ctx = canvas.getContext('2d');
        perfChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ label: 'Score', data: [0], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    const labels = subjectResults.map(r => r.subject);
    const scores = subjectResults.map(r => r.overallPct);
    const colors = subjectResults.map(r => getGradeColor(r.grade));

    const ctx = canvas.getContext('2d');
    perfChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{
            label: 'Overall Score (%)', data: scores, backgroundColor: colors,
            borderColor: colors.map(c => c), borderWidth: 2, borderRadius: 6, barPercentage: 0.6
        }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(0)}%` } } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } } }
    });
}

function renderScoringBreakdown(subject) {
    const container = document.getElementById('scoringBreakdown');
    if (!container) return;

    const boxes = [
        { label: 'INDIVIDUAL TEST',    display: '15',  cls: '' },
        { label: 'GROUP WORK',         display: '15',  cls: '' },
        { label: 'CLASS TEST',         display: '15',  cls: '' },
        { label: 'PROJECT',            display: '15',  cls: '' },
        { label: 'TOTAL',              display: '60',  cls: 'total' },
        { label: 'SCALED TO 50',       display: '50',  cls: 'scale' },
        { label: 'END OF TERM EXAMS',  display: '100', cls: '' },
        { label: '50%',                display: '50',  cls: 'scale' },
        { label: 'OVERALL TOTAL',      display: '100', cls: 'final' }
    ];

    let boxesHtml = boxes.map(b => {
        return `<div class="box ${b.cls}">
                    <span class="label">${b.label}</span>
                    <span class="score">${b.display}</span>
                </div>`;
    }).join('');

    container.innerHTML = `
        <div class="scoring-breakdown">
            <div class="title"><i class="fas fa-calculator"></i> Scoring Breakdown</div>
            <div class="box-row">${boxesHtml}</div>
        </div>
    `;
}

// ✅ UPDATED — Perf modal avatar now uses a styled span so the initial letter renders reliably
function openPerformanceModal(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) { showToast('Student not found.', true); return; }

    const modal = document.getElementById('performanceModal');
    modal.classList.add('active');

    const perfAvatarEl = document.getElementById('perfAvatar');
    if (perfAvatarEl) {
        const initial = (student.name || '?').charAt(0).toUpperCase();
        perfAvatarEl.innerHTML = `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.9rem;font-weight:800;color:#fff;line-height:1;background:linear-gradient(135deg,#8e44ad,#6f42c1);border-radius:50%;">${initial}</span>`;
    }

    const schoolLogo = document.getElementById('perfSchoolLogo');
    if (schoolLogo) {
        if (schoolSettings.logo) {
            schoolLogo.src = schoolSettings.logo;
            schoolLogo.style.display = 'block';
        } else schoolLogo.style.display = 'none';
    }
    const schoolName = document.getElementById('perfSchoolName');
    if (schoolName) schoolName.textContent = schoolSettings.name || 'Dar Al-Wafaa';

    document.getElementById('perfName').innerText = student.name;
    document.getElementById('perfClass').innerText = student.class;
    document.getElementById('perfId').innerText = student.id;
    document.getElementById('perfAge').innerText = student.age || '—';
    document.getElementById('perfGender').innerText = student.gender || '—';
    document.getElementById('perfAdmission').innerText = formatDate(student.admissionDate);

    updateAttendanceDisplay(studentId);

    const termFilter = document.getElementById('perfTermFilter');
    populateTermDropdowns();
    termFilter.value = 'all';
    termFilter.onchange = function() {
        const data = calculateStudentPerformance(studentId, this.value);
        renderPerformanceData(data, student);
    };
    termFilter.dispatchEvent(new Event('change'));
}

function closePerformanceModal() {
    document.getElementById('performanceModal').classList.remove('active');
    if (perfChartInstance) {
        perfChartInstance.destroy();
        perfChartInstance = null;
    }
}

// ═══════════════════════════════════════════════════════════════
// PDF DOWNLOAD
// ═══════════════════════════════════════════════════════════════
function downloadPerformancePDF() {
    const modalCard = document.querySelector('#performanceModal .modal-card');
    if (!modalCard) { showToast('Report card not found.', true); return; }

    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        showToast('❌ PDF libraries not loaded. Please check your internet connection and refresh.', true);
        return;
    }

    showToast('📄 Generating PDF... Please wait.', false);

    const actionsBar = modalCard.querySelector('.perf-actions');
    const originalActionsDisplay = actionsBar ? actionsBar.style.display : '';
    if (actionsBar) actionsBar.style.display = 'none';

    const termFilter = document.getElementById('perfTermFilter');
    const originalTermDisplay = termFilter ? termFilter.style.display : '';
    if (termFilter) termFilter.style.display = 'none';

    setTimeout(() => {
        html2canvas(modalCard, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: modalCard.scrollWidth,
            windowHeight: modalCard.scrollHeight
        }).then(canvas => {
            if (actionsBar) actionsBar.style.display = originalActionsDisplay;
            if (termFilter) termFilter.style.display = originalTermDisplay;

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const pageWidth  = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin     = 10;
            const imgWidth   = pageWidth - (margin * 2);
            const imgHeight  = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position   = margin;

            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - (margin * 2));

            while (heightLeft > 0) {
                position = heightLeft - imgHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                heightLeft -= (pageHeight - (margin * 2));
            }

            const studentName = (document.getElementById('perfName')?.innerText || 'Student').trim();
            const safeName = studentName.replace(/[^a-z0-9]/gi, '_');
            const dateStr = new Date().toISOString().slice(0, 10);
            const filename = `${safeName}_ReportCard_${dateStr}.pdf`;

            pdf.save(filename);

            showToast('✅ PDF downloaded: ' + filename);
        }).catch(err => {
            console.error('PDF generation error:', err);
            if (actionsBar) actionsBar.style.display = originalActionsDisplay;
            if (termFilter) termFilter.style.display = originalTermDisplay;
            showToast('❌ Failed to generate PDF. Please try again.', true);
        });
    }, 150);
}

// ─── STUDENT DETAILS MODAL (basic — used by Students tab) ───
function openStudentDetails(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) { showToast('Student not found.', true); return; }

    const modal = document.getElementById('studentDetailsModal');
    const content = document.getElementById('studentDetailsContent');

    const perfData = calculateStudentPerformance(studentId);
    const studentPayments = isAdmin() ? payments.filter(p => p.studentName === student.name) : [];

    const attData = getStudentAttendancePct(studentId);
    const attDisplay = (attData && attData.total > 0)
        ? `${attData.pct.toFixed(1)}% (${attData.present + attData.late}/${attData.total} days)`
        : '—';

    let html = `
        <div class="details-grid">
            <div class="details-info-card">
                <h3><i class="fas fa-id-card"></i> Personal Information</h3>
                <div class="details-info-item"><span class="label">Full Name</span><span class="value">${escapeHtml(student.name)}</span></div>
                <div class="details-info-item"><span class="label">Class</span><span class="value">${escapeHtml(student.class)}</span></div>
                <div class="details-info-item"><span class="label">Age</span><span class="value">${student.age || '—'}</span></div>
                <div class="details-info-item"><span class="label">Gender</span><span class="value">${escapeHtml(student.gender || '—')}</span></div>
                <div class="details-info-item"><span class="label">Parent</span><span class="value">${escapeHtml(student.parentName || '—')}</span></div>
                <div class="details-info-item"><span class="label">Contact</span><span class="value">${escapeHtml(student.parentContact || '—')}</span></div>
                <div class="details-info-item"><span class="label">Location</span><span class="value">${escapeHtml(student.location || '—')}</span></div>
                <div class="details-info-item"><span class="label">Admission Date</span><span class="value">${formatDate(student.admissionDate)}</span></div>
                <div class="details-info-item"><span class="label">Status</span><span class="value"><span class="status-pill ${student.status === 'Active' ? 'status-active' : 'status-inactive'}">${student.status || 'Active'}</span></span></div>
                <div class="details-info-item"><span class="label">Attendance</span><span class="value">${attDisplay}</span></div>
            </div>
            <div>
                <div class="details-performance-summary" style="margin-top:0;">
                    <h3><i class="fas fa-chart-line"></i> Academic Performance</h3>
                    ${perfData ? `
                        <div class="details-performance-stats">
                            <div class="stat"><span class="val">${perfData.overallAvg.toFixed(1)}%</span><span class="lbl">Overall Average</span></div>
                            <div class="stat"><span class="grade-badge grade-${perfData.overallGrade}">${perfData.overallGrade || '—'}</span><span class="lbl">Grade</span></div>
                            <div class="stat"><span class="val">${perfData.totalExams}</span><span class="lbl">Exams Taken</span></div>
                            <div class="stat"><span class="val">#${perfData.classPosition !== '—' ? perfData.classPosition : '—'}</span><span class="lbl">Class Position</span></div>
                        </div>
                        <div class="details-performance-subjects">
                            ${perfData.subjectResults.length ? perfData.subjectResults.map(r => `
                                <div class="subject-item">
                                    <span class="subj">${escapeHtml(r.subject)}</span>
                                    <span class="subj-grade" style="color:${getGradeColor(r.grade)}">${r.overallPct.toFixed(0)}% (${r.grade})</span>
                                </div>
                            `).join('') : '<p style="color:#b0a8c0;font-style:italic;">No subject data</p>'}
                        </div>
                    ` : `<p style="color:#b0a8c0;font-style:italic;">No performance data available.</p>`}
                </div>
            </div>
        </div>
        ${isAdmin() ? `
        <div class="details-payment-table">
            <h3><i class="fas fa-money-bill-wave" style="color:#27ae60;"></i> Payment History <span class="badge">${studentPayments.length}</span></h3>
            ${studentPayments.length ? `
                <table>
                    <thead><tr><th>Date</th><th>Fee Type</th><th>Amount (GHS)</th><th>Status</th><th>Class</th><th>Method</th><th>Reference</th></tr></thead>
                    <tbody>
                        ${studentPayments.map(p => `
                            <tr>
                                <td>${p.date}</td>
                                <td>${feeCategories.find(c => c.id === p.feeCategoryId)?.name ? `<span class="expense-category-badge">${escapeHtml(feeCategories.find(c => c.id === p.feeCategoryId).name)}</span>` : '<span style="color:#b0a8c0;">—</span>'}</td>
                                <td><strong>GH₵${p.amount.toFixed(2)}</strong></td>
                                <td><span class="payment-status-pill ${p.status === 'Paid' ? 'payment-status-paid' : p.status === 'Overdue' ? 'payment-status-overdue' : 'payment-status-pending'}">${p.status || 'Pending'}</span></td>
                                <td>${escapeHtml(p.paymentClass || '—')}</td>
                                <td><span class="method-badge">${escapeHtml(p.method)}</span></td>
                                <td>${p.reference ? `<code style="background:#e8f2fa;padding:2px 8px;border-radius:6px;font-size:0.75rem;color:#1e5a99;">${escapeHtml(p.reference)}</code>` : '<span style="color:#b0a8c0;">—</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `<p style="color:#b0a8c0;font-style:italic;text-align:center;padding:12px;">No payments recorded for this student.</p>`}
        </div>` : ''}
    `;

    content.innerHTML = html;
    modal.classList.add('active');
}

function closeStudentDetails() {
    document.getElementById('studentDetailsModal').classList.remove('active');
}

// ─── TERM MANAGEMENT ───
function renderTerms() {
    const tbody = document.getElementById('termsTbody');
    if (!tbody) return;
    if (!terms.length) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;">No terms defined.</td></tr>';
        return;
    }
    tbody.innerHTML = terms.map(t => `
        <tr>
            <td><strong>${escapeHtml(t.name)}</strong></td>
            <td class="action-icons">
                <i class="fas fa-edit" onclick="editTerm('${t.id}')"></i>
                <i class="fas fa-trash-alt" onclick="deleteTerm('${t.id}')"></i>
            </td>
        </tr>
    `).join('');
    populateTermDropdowns();
}

function addTerm() {
    if (!isAdmin()) return;
    const input = document.getElementById('newTermName');
    const name = input.value.trim();
    if (!name) { showToast('Please enter a term name.', true); return; }
    if (terms.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        showToast('Term already exists.', true);
        return;
    }
    terms.push({ id: generateId('T'), name });
    saveToLocal();
    renderTerms();
    populateFeeStructureDropdowns();
    populateRegisterFilters();
    populateArrearsFilters();
    input.value = '';
    showToast('Term added.');
}

function deleteTerm(id) {
    if (!isAdmin()) return;
    if (confirm('Delete this term? Exams linked to it will be unassigned.')) {
        terms = terms.filter(t => t.id !== id);
        exams.forEach(e => { if (e.termId === id) e.termId = ''; });
        feeStructure = feeStructure.filter(f => f.termId !== id);
        saveToLocal();
        renderTerms();
        renderFeeStructure();
        populateExamDropdowns();
        populateFeeStructureDropdowns();
        populateRegisterFilters();
        populateArrearsFilters();
        showToast('Term deleted.');
    }
}

function editTerm(id) {
    if (!isAdmin()) return;
    const term = terms.find(t => t.id === id);
    if (!term) return;
    const newName = prompt('Edit term name:', term.name);
    if (newName && newName.trim()) {
        term.name = newName.trim();
        saveToLocal();
        renderTerms();
        populateFeeStructureDropdowns();
        populateRegisterFilters();
        populateArrearsFilters();
        showToast('Term updated.');
    }
}

function populateTermDropdowns() {
    const selectors = ['examTerm', 'perfTermFilter'];
    selectors.forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-- Select Term --</option>';
        terms.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === currentVal) opt.selected = true;
            sel.appendChild(opt);
        });
        if (selId === 'perfTermFilter') {
            const allOpt = document.createElement('option');
            allOpt.value = 'all';
            allOpt.textContent = 'All Terms';
            sel.prepend(allOpt);
            if (currentVal === 'all') allOpt.selected = true;
        }
    });
}

// ─── TEACHER LOGIN ACCOUNTS (Admin only) ───
function renderTeacherAccounts() {
    const tbody = document.getElementById('teacherAccountsTbody');
    if (!tbody) return;
    if (!isAdmin()) return;

    if (!teachers.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No teachers yet. Add one from Manage Teachers.</td></tr>';
        return;
    }

    tbody.innerHTML = teachers.map(t => {
        const hasAccount = !!t.username && !!t.password;
        const statusBadge = hasAccount && t.canLogin !== false
            ? '<span class="status-pill status-active" style="background:#27ae60;">Active</span>'
            : hasAccount
            ? '<span class="status-pill" style="background:#f39c12;">Disabled</span>'
            : '<span class="status-pill status-inactive">No Account</span>';

        return `
            <tr>
                <td><strong>${escapeHtml(t.name)}</strong><div class="subtext">${escapeHtml(t.subject || '')}</div></td>
                <td>${hasAccount ? `<code style="background:#f4edff;padding:2px 8px;border-radius:6px;font-size:0.85rem;">${escapeHtml(t.username)}</code>` : '—'}</td>
                <td><span class="class-badge">${escapeHtml(t.assignedClass || '—')}</span></td>
                <td>${statusBadge}</td>
                <td class="action-icons">
                    <i class="fas fa-key" onclick="openTeacherAccountModal('${t.id}')" title="Manage Login"></i>
                    <i class="fas fa-edit" onclick="openEditTeacher('${t.id}')" title="Edit Teacher"></i>
                </td>
            </tr>
        `;
    }).join('');
}

function openTeacherAccountModal(teacherId) {
    const t = teachers.find(t => t.id === teacherId);
    if (!t) return;
    document.getElementById('taTeacherId').value = t.id;
    document.getElementById('taTeacherName').textContent = t.name;
    document.getElementById('taUsername').value = t.username || '';
    document.getElementById('taPassword').value = '';
    document.getElementById('taCanLogin').checked = t.canLogin !== false && !!t.username;
    document.getElementById('taError').textContent = '';
    document.getElementById('teacherAccountModal').classList.add('active');
}

function closeTeacherAccountModal() {
    document.getElementById('teacherAccountModal').classList.remove('active');
}

function saveTeacherAccount() {
    const id = document.getElementById('taTeacherId').value;
    const username = document.getElementById('taUsername').value.trim();
    const password = document.getElementById('taPassword').value.trim();
    const canLogin = document.getElementById('taCanLogin').checked;
    const errEl = document.getElementById('taError');

    const t = teachers.find(t => t.id === id);
    if (!t) { errEl.textContent = '❌ Teacher not found.'; return; }

    if (!username) { errEl.textContent = '❌ Username is required.'; return; }

    const dup = teachers.find(x => x.username && x.username.toLowerCase() === username.toLowerCase() && x.id !== id);
    if (dup) { errEl.textContent = `❌ Username "${username}" is already taken by ${dup.name}.`; return; }

    const finalPassword = password || t.password || '';
    if (!finalPassword) { errEl.textContent = '❌ Please set a password.'; return; }
    if (password && password.length < 4) { errEl.textContent = '❌ Password must be at least 4 characters.'; return; }

    t.username = username;
    t.password = finalPassword;
    t.canLogin = canLogin;

    saveToLocal();
    renderTeacherAccounts();
    renderTeachers();
    closeTeacherAccountModal();
    showToast('✅ Teacher account updated.');
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTANT ACCOUNTS MANAGEMENT (Admin only)
// ═══════════════════════════════════════════════════════════════
function renderAccountantAccounts() {
    const tbody = document.getElementById('accountantAccountsTbody');
    if (!tbody) return;
    if (!isAdmin()) return;

    if (!accountants.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#8c7da1;">No accountants yet. Click "Add Accountant" to create one.</td></tr>';
        return;
    }

    tbody.innerHTML = accountants.map(a => {
        const active = a.canLogin !== false;
        const statusBadge = active
            ? '<span class="status-pill" style="background:#27ae60;">Active</span>'
            : '<span class="status-pill" style="background:#f39c12;">Disabled</span>';

        return `
            <tr>
                <td><strong>${escapeHtml(a.name || '—')}</strong></td>
                <td><code style="background:#e8f2fa;padding:2px 8px;border-radius:6px;font-size:0.85rem;color:#1e5a99;">${escapeHtml(a.username || '—')}</code></td>
                <td>${escapeHtml(a.email || '—')}</td>
                <td>${statusBadge}</td>
                <td class="action-icons">
                    <i class="fas fa-edit" onclick="openEditAccountant('${a.id}')" title="Edit" style="color:#2980b9;"></i>
                    <i class="fas fa-key" onclick="openEditAccountant('${a.id}')" title="Reset Password" style="color:#f39c12;"></i>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddAccountant() {
    if (!isAdmin()) return;
    document.getElementById('accId').value = '';
    document.getElementById('accName').value = '';
    document.getElementById('accUsername').value = '';
    document.getElementById('accPassword').value = '';
    document.getElementById('accEmail').value = '';
    document.getElementById('accPhone').value = '';
    document.getElementById('accCanLogin').checked = true;
    document.getElementById('accountantModalTitle').textContent = 'Add Accountant';
    document.getElementById('deleteAccountantBtn').style.display = 'none';
    document.getElementById('accModalError').textContent = '';
    document.getElementById('accountantModal').classList.add('active');
}

function openEditAccountant(id) {
    if (!isAdmin()) return;
    const a = accountants.find(x => x.id === id);
    if (!a) return;
    document.getElementById('accId').value = a.id;
    document.getElementById('accName').value = a.name || '';
    document.getElementById('accUsername').value = a.username || '';
    document.getElementById('accPassword').value = a.password || '';
    document.getElementById('accEmail').value = a.email || '';
    document.getElementById('accPhone').value = a.phone || '';
    document.getElementById('accCanLogin').checked = a.canLogin !== false;
    document.getElementById('accountantModalTitle').textContent = 'Edit Accountant';
    document.getElementById('deleteAccountantBtn').style.display = 'inline-flex';
    document.getElementById('accModalError').textContent = '';
    document.getElementById('accountantModal').classList.add('active');
}

function closeAccountantModal() {
    document.getElementById('accountantModal').classList.remove('active');
}

function saveAccountant() {
    const id = document.getElementById('accId').value;
    const name = document.getElementById('accName').value.trim();
    const username = document.getElementById('accUsername').value.trim();
    const password = document.getElementById('accPassword').value.trim();
    const email = document.getElementById('accEmail').value.trim();
    const phone = document.getElementById('accPhone').value.trim();
    const canLogin = document.getElementById('accCanLogin').checked;
    const errEl = document.getElementById('accModalError');

    if (!name) { errEl.textContent = '❌ Full name is required.'; return; }
    if (!username) { errEl.textContent = '❌ Username is required.'; return; }
    if (!password) { errEl.textContent = '❌ Password is required.'; return; }
    if (password.length < 4) { errEl.textContent = '❌ Password must be at least 4 characters.'; return; }

    const dup = accountants.find(x =>
        x.username && x.username.toLowerCase() === username.toLowerCase() && x.id !== id
    );
    if (dup) { errEl.textContent = `❌ Username "${username}" is already taken.`; return; }

    const dupTeacher = teachers.find(t => t.username && t.username.toLowerCase() === username.toLowerCase());
    if (dupTeacher) { errEl.textContent = `❌ Username "${username}" is already used by teacher ${dupTeacher.name}.`; return; }

    const data = {
        id: id || generateId('ACC'),
        name,
        username,
        password,
        email: email || '',
        phone: phone || '',
        canLogin,
        dateJoined: id ? (accountants.find(x => x.id === id)?.dateJoined || getLocalDateString()) : getLocalDateString()
    };

    if (id) {
        const idx = accountants.findIndex(x => x.id === id);
        if (idx !== -1) accountants[idx] = data;
    } else {
        accountants.push(data);
    }

    saveToLocal();
    renderAccountantAccounts();
    closeAccountantModal();
    showToast(id ? '✅ Accountant updated!' : '✅ Accountant added!');
}

function deleteAccountantById() {
    const id = document.getElementById('accId').value;
    if (!id) return;
    const a = accountants.find(x => x.id === id);
    if (!a) return;

    if (accountants.length <= 1) {
        showToast('⚠️ Cannot delete the only accountant. Add another one first.', true);
        return;
    }

    if (!confirm(`Delete accountant "${a.name}"? They will no longer be able to log in.`)) return;

    accountants = accountants.filter(x => x.id !== id);
    saveToLocal();
    renderAccountantAccounts();
    closeAccountantModal();
    showToast('Accountant deleted.');
}

// ─── BACKUP & RESTORE ───
let pendingRestoreData = null;

function downloadBackup() {
    if (!isAdmin()) return;
    const backup = {
        _meta: {
            app: 'Dar Al-Wafaa School Management',
            version: '1.5',
            exportedAt: new Date().toISOString(),
            schoolName: schoolSettings.name || 'School'
        },
        schoolSettings: { ...schoolSettings },
        students: students || [],
        teachers: teachers || [],
        classes: classes || [],
        subjects: subjects || [],
        exams: exams || [],
        examGrades: examGrades || [],
        payments: payments || [],
        budgets: budgets || [],
        expenses: expenses || [],
        timetable: timetable || [],
        terms: terms || [],
        courses: courses || [],
        staff: staff || [],
        attendance: attendance || [],
        staffAttendance: staffAttendance || [],
        accountants: accountants || [],
        academicYears: academicYears || [],
        feeCategories: feeCategories || [],
        feeStructure: feeStructure || []
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const safeName = (schoolSettings.name || 'school').replace(/[^a-z0-9]/gi, '_');
    a.href = url;
    a.download = `${safeName}_backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Backup downloaded successfully!');
}

function handleRestoreFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);

            if (!data._meta || !data._meta.app) {
                showToast('❌ This is not a valid Dar Al-Wafaa backup file.', true);
                return;
            }

            pendingRestoreData = data;
            const preview = document.getElementById('restorePreview');
            const content = document.getElementById('restorePreviewContent');
            const exportedDate = data._meta.exportedAt ? new Date(data._meta.exportedAt).toLocaleString() : 'Unknown';

            content.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <div><strong>School:</strong> ${escapeHtml(data._meta.schoolName || '—')}</div>
                    <div><strong>Exported:</strong> ${exportedDate}</div>
                    <div><strong>Students:</strong> ${(data.students || []).length}</div>
                    <div><strong>Teachers:</strong> ${(data.teachers || []).length}</div>
                    <div><strong>Classes:</strong> ${(data.classes || []).length}</div>
                    <div><strong>Subjects:</strong> ${(data.subjects || []).length}</div>
                    <div><strong>Exams:</strong> ${(data.exams || []).length}</div>
                    <div><strong>Grades:</strong> ${(data.examGrades || []).length}</div>
                    <div><strong>Payments:</strong> ${(data.payments || []).length}</div>
                    <div><strong>Expenses:</strong> ${(data.expenses || []).length}</div>
                    <div><strong>Attendance:</strong> ${(data.attendance || []).length}</div>
                    <div><strong>Teacher Attendance:</strong> ${(data.staffAttendance || []).length}</div>
                    <div><strong>Accountants:</strong> ${(data.accountants || []).length}</div>
                    <div><strong>Academic Years:</strong> ${(data.academicYears || []).length}</div>
                    <div><strong>Fee Categories:</strong> ${(data.feeCategories || []).length}</div>
                    <div><strong>Fee Structure:</strong> ${(data.feeStructure || []).length}</div>
                </div>
            `;
            preview.style.display = 'block';
            preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {
            console.error('Restore parse error:', err);
            showToast('❌ Could not read the backup file.', true);
        }
    };
    reader.readAsText(file);
}

async function confirmRestore() {
    if (!pendingRestoreData) { showToast('No backup file loaded.', true); return; }
    if (!confirm('⚠️ This will REPLACE all current data with the backup.\n\nAre you absolutely sure?')) return;

    const data = pendingRestoreData;
    students = data.students || [];
    teachers = data.teachers || [];
    classes = data.classes || [];
    subjects = data.subjects || [];
    exams = data.exams || [];
    examGrades = data.examGrades || [];
    payments = data.payments || [];
    budgets = data.budgets || [];
    expenses = data.expenses || [];
    timetable = data.timetable || [];
    terms = data.terms || [];
    courses = data.courses || [];
    staff = data.staff || [];
    attendance = data.attendance || [];
    staffAttendance = data.staffAttendance || [];
    accountants = data.accountants || accountants;
    academicYears = data.academicYears || academicYears;
    feeCategories = data.feeCategories || feeCategories;
    feeStructure = data.feeStructure || [];

    if (data.schoolSettings) {
        schoolSettings.name = data.schoolSettings.name || schoolSettings.name;
        schoolSettings.logo = data.schoolSettings.logo || '';
        schoolSettings.primaryColor = data.schoolSettings.primaryColor || '#6c3a9d';
        saveSettings();
    }

    saveToLocal();
    applySettings();
    updateFavicon();
    updateAllUI();
    populateTermDropdowns();
    populateExamDropdowns();
    populateFeeStructureDropdowns();
    populateRegisterFilters();
    populateArrearsFilters();
    renderTerms();
    renderAcademicYears();
    renderFeeCategories();
    renderFeeStructure();
    renderTeacherAccounts();
    renderAccountantAccounts();

    document.getElementById('restorePreview').style.display = 'none';
    document.getElementById('restoreFileInput').value = '';
    pendingRestoreData = null;
    showToast('✅ Backup restored successfully!');
}

function cancelRestore() {
    pendingRestoreData = null;
    document.getElementById('restorePreview').style.display = 'none';
    document.getElementById('restoreFileInput').value = '';
    showToast('Restore cancelled.');
}

// ─── SETTINGS FUNCTIONS ───
function saveSettingsHandler() {
    if (!isAdmin()) return;
    const name = document.getElementById('settingsSchoolName').value.trim();
    const color = document.getElementById('settingsPrimaryColor').value;

    if (name) schoolSettings.name = name;
    schoolSettings.primaryColor = color;

    saveSettings();
    updateFavicon();
    showToast('✅ School settings saved successfully!');
}

function resetSettings() {
    if (!isAdmin()) return;
    if (!confirm('Reset all settings to default values?')) return;
    schoolSettings.name = 'Dar Al-Wafaa';
    schoolSettings.logo = '';
    schoolSettings.primaryColor = '#6c3a9d';
    saveSettings();
    document.getElementById('logoUploadInput').value = '';
    updateFavicon();
    showToast('🔄 Settings reset to defaults');
}

function handleLogoUpload(file) {
    if (!isAdmin()) return;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        schoolSettings.logo = dataUrl;
        const preview = document.getElementById('logoPreview');
        if (preview) {
            preview.src = dataUrl;
            preview.style.display = 'block';
        }
        applySettings();
        updateFavicon();
        showToast('📸 Logo uploaded. Click Save to persist.');
    };
    reader.readAsDataURL(file);
}

// ─── UPDATE ALL UI ───
function updateAllUI() {
    updateStats();
    renderStudentStats();
    renderStudents();
    renderTeachers();
    renderPayments();
    renderPaymentRegister();
    renderBudgets();
    renderExpenses();
    renderEnrollments();
    renderStaffList();
    renderEnrollmentAnalytics();
    renderRevenueAnalytics();
    renderClassDistribution();
    renderPaymentMethodDistribution();
    renderClassMetrics();
    renderClassCards();
    populateClassFilter();
    populateExpenseCategoryDropdown();
    populateAttendanceClassDropdowns();
    renderSubjects();
    renderExams();
    renderExamAnalytics();
    renderAttendanceAnalytics();
    renderSubjectPerformanceChart();
    renderTimetableGrid();
    refreshTimetableFilters();
    renderRevenueExpenseChart();
    renderBudgetUtilizationChart();
    renderRevenueByCategoryChart();
    renderTermRevenueChart();
    renderArrearsByClassChart();
    renderFeeCollectionProgressChart();
    renderSubjectPerformanceDetailedChart();
    updateAnalyticsInsights();
    populateExamDropdowns();
    populateTermDropdowns();
    renderTerms();
    renderTeacherAccounts();
    renderAccountantAccounts();
    renderAcademicYears();
    renderFeeCategories();
    renderFeeStructure();
    populateFeeStructureDropdowns();
    populateRegisterFilters();
    populateArrearsFilters();
    renderArrearsView();

    if (document.getElementById('staffAttendanceGrid')) renderStaffAttendanceGrid();

    if (currentRegisterClassId) {
        renderClassStudents();
        renderClassExams();
    }
}

// ─── SUB-TAB SWITCHING ───
function switchPaySubTab(subtabId) {
    currentPaySubTab = subtabId;
    document.querySelectorAll('#tabPayments .sub-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`#tabPayments .sub-tab[data-subtab="${subtabId}"]`);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('#tabPayments .subtab-content').forEach(c => c.classList.remove('active-subtab'));
    const content = document.getElementById(`subtab${subtabId.charAt(0).toUpperCase() + subtabId.slice(1)}`);
    if (content) content.classList.add('active-subtab');

    if (subtabId === 'budget') {
        renderBudgets();
        populateExpenseCategoryDropdown();
    } else if (subtabId === 'expenses') {
        renderExpenses();
        populateExpenseCategoryDropdown();
        populateExpenseStudentDropdown();
    } else if (subtabId === 'payments') {
        renderPayments();
        renderPaymentRegister();
    } else if (subtabId === 'feesetup') {
        renderFeeStructure();
        populateFeeStructureDropdowns();
    } else if (subtabId === 'arrears') {
        populateArrearsFilters();
        renderArrearsView();
    }
}

// ─── TAB SWITCHING (MAIN) ───
function switchTab(tabId) {
    if (isTeacher()) {
        const adminOnlyTabs = ['analytics', 'teachers', 'payments', 'staffattendance'];
        if (adminOnlyTabs.includes(tabId)) {
            showToast('Access denied. This section is for administrators only.', true);
            tabId = 'dashboard';
        }
    }

    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) item.classList.add('active');
        else item.classList.remove('active');
    });

    closeSidebar();

    if (tabId === 'dashboard') {
        const headerEl = document.querySelector('#tabDashboard .header');
        if (headerEl) {
            const existing = headerEl.querySelector('.teacher-welcome-banner');
            if (existing) existing.remove();
            if (isTeacher()) {
                const t = getCurrentTeacher();
                const cls = getScopedClassNames();
                const banner = document.createElement('div');
                banner.className = 'teacher-welcome-banner';
                banner.innerHTML = `
                    <div class="twb-avatar">${escapeHtml(t.name.charAt(0))}</div>
                    <div style="flex:1;">
                        <h2>Welcome, ${escapeHtml(t.name)}!</h2>
                        <p>You have access to your assigned classes and students only.</p>
                        <div class="twb-classes">
                            ${cls.length ? cls.map(c => `<span><i class="fas fa-book"></i> ${escapeHtml(c)}</span>`).join('') : '<span>No classes assigned yet</span>'}
                        </div>
                    </div>
                `;
                headerEl.appendChild(banner);
            }
        }

        if (isAdmin()) {
            renderEnrollmentAnalytics();
            renderRevenueAnalytics();
            renderClassDistribution();
            renderPaymentMethodDistribution();
            renderEnrollments();
            renderStaffList();
            const analyticsRows = document.querySelectorAll('#tabDashboard .analytics-row');
            analyticsRows.forEach(r => r.style.display = '');
            const contentSections = document.querySelector('#tabDashboard .content-sections');
            if (contentSections) contentSections.style.display = '';
        } else {
            const analyticsRows = document.querySelectorAll('#tabDashboard .analytics-row');
            analyticsRows.forEach(r => r.style.display = 'none');
            const contentSections = document.querySelector('#tabDashboard .content-sections');
            if (contentSections) contentSections.style.display = 'none';
        }

        updateStats();
        renderStudentStats();
    } else if (tabId === 'classes') {
        if (document.getElementById('classRegisterView').style.display !== 'none') backToClasses();
        renderClassCards();
        renderClassMetrics();
    } else if (tabId === 'subjects') {
        renderSubjects();
        populateExamDropdowns();
    } else if (tabId === 'exams') {
        renderExams();
        populateExamDropdowns();
        document.getElementById('gradeEntrySection').style.display = 'none';
        document.getElementById('examReportSection').style.display = 'none';
        const tableCard = document.getElementById('examGroupsWrapper');
        const statsDiv = document.querySelector('#tabExams .exam-stat-card')?.closest('div[style]');
        if (tableCard) tableCard.style.display = 'block';
        if (statsDiv) statsDiv.style.display = 'grid';
    } else if (tabId === 'students') {
        renderStudents();
        renderStudentStats();
        populateClassFilter();
    } else if (tabId === 'attendance') {
        populateAttendanceClassDropdowns();
        switchAttendanceSubTab('mark');
        document.getElementById('attendanceDate').value = getLocalDateString();
    } else if (tabId === 'staffattendance') {
        const dateEl = document.getElementById('staffAttendanceDate');
        if (dateEl && !dateEl.value) dateEl.value = getLocalDateString();
        switchStaffSubTab('mark');
    } else if (tabId === 'teachers') {
        renderTeachers();
    } else if (tabId === 'payments') {
        populateRegisterFilters();
        populateArrearsFilters();
        if (currentPaySubTab === 'payments') {
            renderPayments();
            renderPaymentRegister();
        }
        else if (currentPaySubTab === 'budget') renderBudgets();
        else if (currentPaySubTab === 'expenses') {
            renderExpenses();
            populateExpenseCategoryDropdown();
            populateExpenseStudentDropdown();
        } else if (currentPaySubTab === 'feesetup') {
            renderFeeStructure();
            populateFeeStructureDropdowns();
        } else if (currentPaySubTab === 'arrears') {
            populateArrearsFilters();
            renderArrearsView();
        }
    } else if (tabId === 'timetable') {
        renderTimetableGrid();
        refreshTimetableFilters();
    } else if (tabId === 'analytics') {
        renderRevenueExpenseChart();
        renderSubjectPerformanceChart();
        renderBudgetUtilizationChart();
        renderRevenueByCategoryChart();
        renderTermRevenueChart();
        renderArrearsByClassChart();
        renderFeeCollectionProgressChart();
        renderSubjectPerformanceDetailedChart();
        updateAnalyticsInsights();
        renderExamAnalytics();
        renderAttendanceAnalytics();
    } else if (tabId === 'settings') {
        renderTerms();
        populateTermDropdowns();
        renderTeacherAccounts();
        renderAccountantAccounts();
        renderAcademicYears();
        renderFeeCategories();
    }
}

// ─── EXAM ANALYTICS ───
function renderExamAnalytics() {
    if (!isAdmin()) return;
    const examsWithGrades = getScopedExams().filter(e => examGrades.some(g => g.examId === e.id));
    const countEl = document.getElementById('examAnalyticsCount');
    if (countEl) countEl.innerText = examsWithGrades.length;

    if (!examsWithGrades.length) {
        document.getElementById('examAvgScore').innerText = '—';
        document.getElementById('examPassRate').innerText = '—';
        document.getElementById('examFailRate').innerText = '—';
        document.getElementById('examTopPerformer').innerText = '—';
        document.getElementById('examAvgSub').innerText = 'No exams with grades';
        document.getElementById('examPassSub').innerText = 'No data';
        document.getElementById('examFailSub').innerText = 'No data';
        document.getElementById('examTopSub').innerText = 'No data';

        document.getElementById('topStudentsList').innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-user-graduate"></i><h4>No data yet</h4><p>Complete exams and record grades to see top performers.</p></div>`;
        document.getElementById('classRankingsList').innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-school"></i><h4>No data yet</h4><p>Record exam grades to see class performance rankings.</p></div>`;

        if (examPerformanceTrendChart) { examPerformanceTrendChart.destroy(); examPerformanceTrendChart = null; }
        if (examSubjectPerformanceChart) { examSubjectPerformanceChart.destroy(); examSubjectPerformanceChart = null; }
        if (examClassPerformanceChart) { examClassPerformanceChart.destroy(); examClassPerformanceChart = null; }
        if (examPassFailChart) { examPassFailChart.destroy(); examPassFailChart = null; }
        return;
    }

    let allScores = [];
    let totalScore = 0, totalMax = 0, gradeCount = 0;
    const studentAverages = {}, subjectScores = {}, classScores = {}, examScores = {};

    examsWithGrades.forEach(exam => {
        const grades = examGrades.filter(g => g.examId === exam.id);
        const max = exam.maxScore || 100;
        let examTotal = 0, examCount = 0;

        grades.forEach(g => {
            const pct = (g.score / max) * 100;
            allScores.push(pct);
            totalScore += g.score;
            totalMax += max;
            gradeCount++;
            examTotal += g.score;
            examCount++;

            if (!studentAverages[g.studentId]) studentAverages[g.studentId] = { total: 0, count: 0 };
            studentAverages[g.studentId].total += pct;
            studentAverages[g.studentId].count++;

            if (!subjectScores[exam.subject]) subjectScores[exam.subject] = { total: 0, count: 0 };
            subjectScores[exam.subject].total += pct;
            subjectScores[exam.subject].count++;

            if (!classScores[exam.class]) classScores[exam.class] = { total: 0, count: 0 };
            classScores[exam.class].total += pct;
            classScores[exam.class].count++;
        });

        const avgPct = examCount > 0 ? (examTotal / examCount / max) * 100 : 0;
        examScores[exam.date] = { avg: avgPct, name: exam.name, count: examCount };
    });

    const sortedExamDates = Object.keys(examScores).sort();
    const overallAvg = gradeCount > 0 ? (totalScore / totalMax) * 100 : 0;
    document.getElementById('examAvgScore').innerHTML = `${overallAvg.toFixed(1)}%`;
    document.getElementById('examAvgSub').innerText = `${gradeCount} grades recorded`;

    const passCount = allScores.filter(s => s >= 50).length;
    const failCount = allScores.length - passCount;
    const passRate = allScores.length > 0 ? (passCount / allScores.length) * 100 : 0;
    const failRate = allScores.length > 0 ? (failCount / allScores.length) * 100 : 0;

    document.getElementById('examPassRate').innerHTML = `${passRate.toFixed(1)}%`;
    document.getElementById('examPassSub').innerText = `${passCount} passed`;
    document.getElementById('examFailRate').innerHTML = `${failRate.toFixed(1)}%`;
    document.getElementById('examFailSub').innerText = `${failCount} failed`;

    let topStudentId = null, topAvg = 0;
    Object.entries(studentAverages).forEach(([sid, data]) => {
        const avg = data.total / data.count;
        if (avg > topAvg) { topAvg = avg; topStudentId = sid; }
    });

    if (topStudentId) {
        const topStudent = students.find(s => s.id === topStudentId);
        document.getElementById('examTopPerformer').innerHTML = topStudent ? escapeHtml(topStudent.name) : '—';
        document.getElementById('examTopSub').innerText = `${topAvg.toFixed(1)}% avg`;
    } else {
        document.getElementById('examTopPerformer').innerText = '—';
        document.getElementById('examTopSub').innerText = 'No data';
    }

    const trendLabels = sortedExamDates.map(d => {
        const e = examScores[d];
        return e.name.length > 15 ? e.name.slice(0, 12) + '…' : e.name;
    });
    const trendData = sortedExamDates.map(d => examScores[d].avg);

    if (examPerformanceTrendChart) examPerformanceTrendChart.destroy();
    const ctx1 = document.getElementById('examPerformanceTrendChart').getContext('2d');
    examPerformanceTrendChart = new Chart(ctx1, {
        type: 'line',
        data: { labels: trendLabels, datasets: [{
            label: 'Average Score (%)', data: trendData,
            borderColor: schoolSettings.primaryColor || '#8e44ad',
            backgroundColor: 'rgba(142,68,173,0.1)', tension: 0.3, fill: true,
            pointBackgroundColor: schoolSettings.primaryColor || '#8e44ad',
            pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5
        }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } },
                legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } } }
    });

    const subjectLabels = Object.keys(subjectScores);
    const subjectData = subjectLabels.map(s => subjectScores[s].total / subjectScores[s].count);
    const subjectColors = ['#3498db','#2ecc71','#f39c12','#e74c3c','#9b59b6','#1abc9c','#e67e22','#2c3e50'];

    if (examSubjectPerformanceChart) examSubjectPerformanceChart.destroy();
    const ctx2 = document.getElementById('examSubjectPerformanceChart').getContext('2d');
    examSubjectPerformanceChart = new Chart(ctx2, {
        type: 'bar',
        data: { labels: subjectLabels, datasets: [{
            label: 'Average Score (%)', data: subjectData,
            backgroundColor: subjectColors.slice(0, subjectLabels.length), borderRadius: 6
        }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } }, legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } } }
    });

    const classLabels = sortClassNames(Object.keys(classScores));
    const classData = classLabels.map(c => classScores[c].total / classScores[c].count);
    const classColors = ['#6f42c1','#3498db','#2ecc71','#f39c12','#e74c3c','#1abc9c','#e67e22','#9b59b6'];

    if (examClassPerformanceChart) examClassPerformanceChart.destroy();
    const ctx3 = document.getElementById('examClassPerformanceChart').getContext('2d');
    examClassPerformanceChart = new Chart(ctx3, {
        type: 'bar',
        data: { labels: classLabels, datasets: [{
            label: 'Average Score (%)', data: classData,
            backgroundColor: classColors.slice(0, classLabels.length), borderRadius: 6
        }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } }, legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } } }
    });

    if (examPassFailChart) examPassFailChart.destroy();
    const ctx4 = document.getElementById('examPassFailChart').getContext('2d');
    examPassFailChart = new Chart(ctx4, {
        type: 'doughnut',
        data: { labels: [`Pass (${passRate.toFixed(0)}%)`, `Fail (${failRate.toFixed(0)}%)`],
            datasets: [{ data: [passCount, failCount], backgroundColor: ['#27ae60', '#e74c3c'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${(ctx.raw / (passCount + failCount || 1) * 100).toFixed(1)}%)` } } } }
    });

    const sortedStudents = Object.entries(studentAverages)
        .map(([sid, data]) => {
            const s = students.find(st => st.id === sid);
            return { id: sid, name: s ? s.name : sid, avg: data.total / data.count, class: s ? s.class : '—' };
        })
        .sort((a, b) => b.avg - a.avg).slice(0, 5);

    const topList = document.getElementById('topStudentsList');
    if (topList) {
        if (sortedStudents.length) {
            topList.innerHTML = sortedStudents.map((p, i) => {
                const posClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                return `<div class="ranking-item">
                    <div class="ranking-pos ${posClass}">${i + 1}</div>
                    <div class="ranking-info">
                        <div class="name">${escapeHtml(p.name)}</div>
                        <div class="detail">${escapeHtml(p.class)}</div>
                    </div>
                    <div class="ranking-score">${p.avg.toFixed(1)}%</div>
                </div>`;
            }).join('');
        } else {
            topList.innerHTML = '<div class="no-exam-data-msg"><i class="fas fa-user-graduate"></i><h4>No data</h4><p>No grades recorded yet.</p></div>';
        }
    }

    const sortedClasses = Object.entries(classScores)
        .map(([cls, data]) => ({ class: cls, avg: data.total / data.count, count: data.count }))
        .sort((a, b) => b.avg - a.avg);

    const rankList = document.getElementById('classRankingsList');
    if (rankList) {
        if (sortedClasses.length) {
            rankList.innerHTML = sortedClasses.map((p, i) => `
                <div class="ranking-item">
                    <div class="ranking-pos">${i + 1}</div>
                    <div class="ranking-info">
                        <div class="name">${escapeHtml(p.class)}</div>
                        <div class="detail">${p.count} students</div>
                    </div>
                    <div class="ranking-score">${p.avg.toFixed(1)}%</div>
                </div>
            `).join('');
        } else {
            rankList.innerHTML = '<div class="no-exam-data-msg"><i class="fas fa-school"></i><h4>No data</h4><p>No class data available.</p></div>';
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE ANALYTICS
// ═══════════════════════════════════════════════════════════════
function renderAttendanceAnalytics() {
    if (!isAdmin()) return;

    const scopedAttendance = getScopedAttendance();
    const totalRecords = scopedAttendance.length;
    const countEl = document.getElementById('attendanceAnalyticsCount');
    if (countEl) countEl.innerText = totalRecords;

    if (!totalRecords) {
        const setEl = (id, txt, color) => {
            const el = document.getElementById(id);
            if (el) { el.innerText = txt; if (color) el.style.color = color; }
        };
        setEl('attendanceOverallRate', '—', '#95a5a6');
        setEl('attendanceOverallSub', 'No data');
        setEl('attendanceTotalDays', '—');
        setEl('attendanceDaysSub', 'No records');
        setEl('attendanceTopClass', '—');
        setEl('attendanceTopClassSub', 'No data');
        setEl('attendanceAtRiskCount', '—');
        setEl('attendanceRiskSub', 'No data');

        const atRiskList = document.getElementById('attendanceAtRiskList');
        if (atRiskList) {
            atRiskList.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-clipboard-check"></i><h4>No data yet</h4><p>Mark attendance in the Attendance tab to see analytics.</p></div>`;
        }

        if (attendanceClassChart) { attendanceClassChart.destroy(); attendanceClassChart = null; }
        if (attendanceDistributionChart) { attendanceDistributionChart.destroy(); attendanceDistributionChart = null; }
        if (attendanceTrendChart) { attendanceTrendChart.destroy(); attendanceTrendChart = null; }
        return;
    }

    const presentCount = scopedAttendance.filter(a => a.status === 'Present').length;
    const absentCount  = scopedAttendance.filter(a => a.status === 'Absent').length;
    const lateCount    = scopedAttendance.filter(a => a.status === 'Late').length;
    const attended     = presentCount + lateCount;
    const overallRate  = (attended / totalRecords) * 100;

    const rateColor = overallRate >= 90 ? '#27ae60'
                    : overallRate >= 75 ? '#2ecc71'
                    : overallRate >= 60 ? '#f39c12'
                    : '#e74c3c';

    const rateEl = document.getElementById('attendanceOverallRate');
    if (rateEl) {
        rateEl.innerHTML = overallRate.toFixed(1) + '%';
        rateEl.style.color = rateColor;
    }
    const subEl = document.getElementById('attendanceOverallSub');
    if (subEl) subEl.innerText = `${attended}/${totalRecords} attended`;

    const uniqueDays = [...new Set(scopedAttendance.map(a => a.date))].length;
    const daysEl = document.getElementById('attendanceTotalDays');
    if (daysEl) daysEl.innerText = uniqueDays;
    const daysSubEl = document.getElementById('attendanceDaysSub');
    if (daysSubEl) daysSubEl.innerText = `${uniqueDays} day(s) marked`;

    const classStats = {};
    scopedAttendance.forEach(a => {
        if (!classStats[a.class]) classStats[a.class] = { present: 0, absent: 0, late: 0, total: 0 };
        classStats[a.class].total++;
        if (a.status === 'Present') classStats[a.class].present++;
        else if (a.status === 'Absent') classStats[a.class].absent++;
        else if (a.status === 'Late') classStats[a.class].late++;
    });

    const classRates = Object.entries(classStats).map(([cls, s]) => ({
        class: cls,
        rate: ((s.present + s.late) / s.total) * 100,
        ...s
    })).sort((a, b) => b.rate - a.rate);

    if (classRates.length) {
        const topEl = document.getElementById('attendanceTopClass');
        if (topEl) topEl.innerText = classRates[0].class;
        const topSubEl = document.getElementById('attendanceTopClassSub');
        if (topSubEl) topSubEl.innerText = classRates[0].rate.toFixed(1) + '% rate';
    }

    const studentStats = {};
    scopedAttendance.forEach(a => {
        if (!studentStats[a.studentId]) {
            studentStats[a.studentId] = { name: a.studentName, class: a.class, present: 0, absent: 0, late: 0, total: 0 };
        }
        studentStats[a.studentId].total++;
        if (a.status === 'Present') studentStats[a.studentId].present++;
        else if (a.status === 'Absent') studentStats[a.studentId].absent++;
        else if (a.status === 'Late') studentStats[a.studentId].late++;
    });

    const atRisk = Object.entries(studentStats)
        .map(([id, s]) => ({ id, ...s, rate: ((s.present + s.late) / s.total) * 100 }))
        .filter(s => s.rate < 75)
        .sort((a, b) => a.rate - b.rate);

    const riskCountEl = document.getElementById('attendanceAtRiskCount');
    if (riskCountEl) {
        riskCountEl.innerText = atRisk.length;
        riskCountEl.style.color = atRisk.length > 0 ? '#e74c3c' : '#27ae60';
    }
    const riskSubEl = document.getElementById('attendanceRiskSub');
    if (riskSubEl) riskSubEl.innerText = `${atRisk.length} student(s) below 75%`;

    const atRiskList = document.getElementById('attendanceAtRiskList');
    if (atRiskList) {
        if (atRisk.length) {
            atRiskList.innerHTML = atRisk.slice(0, 8).map(s => {
                const bad = s.rate < 60;
                return `<div class="ranking-item">
                    <div class="ranking-pos" style="background:${bad ? '#f8d7da' : '#fff3cd'};color:${bad ? '#721c24' : '#856404'};">
                        <i class="fas fa-exclamation-triangle" style="font-size:0.7rem;"></i>
                    </div>
                    <div class="ranking-info">
                        <div class="name">${escapeHtml(s.name)}</div>
                        <div class="detail">${escapeHtml(s.class)} · ${s.present + s.late}/${s.total} days</div>
                    </div>
                    <div class="ranking-score" style="color:${bad ? '#e74c3c' : '#f39c12'};">${s.rate.toFixed(0)}%</div>
                </div>`;
            }).join('');
        } else {
            atRiskList.innerHTML = `<div class="no-exam-data-msg" style="padding:20px;"><i class="fas fa-check-circle" style="color:#27ae60;"></i><h4 style="color:#27ae60;">All students above 75%</h4><p>Great job! No attendance concerns.</p></div>`;
        }
    }

    const canvas1 = document.getElementById('attendanceClassChart');
    if (canvas1) {
        if (attendanceClassChart) attendanceClassChart.destroy();
        const ctx1 = canvas1.getContext('2d');
        const labels = classRates.map(c => c.class);
        const data = classRates.map(c => c.rate);
        const colors = data.map(r => r >= 90 ? '#27ae60' : r >= 75 ? '#2ecc71' : r >= 60 ? '#f39c12' : '#e74c3c');

        attendanceClassChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Attendance Rate (%)',
                    data,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } },
                    legend: { display: false }
                },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } }
            }
        });
    }

    const canvas2 = document.getElementById('attendanceDistributionChart');
    if (canvas2) {
        if (attendanceDistributionChart) attendanceDistributionChart.destroy();
        const ctx2 = canvas2.getContext('2d');
        attendanceDistributionChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: [`Present (${presentCount})`, `Late (${lateCount})`, `Absent (${absentCount})`],
                datasets: [{
                    data: [presentCount, lateCount, absentCount],
                    backgroundColor: ['#27ae60', '#f39c12', '#e74c3c'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                }
            }
        });
    }

    const dailyStats = {};
    scopedAttendance.forEach(a => {
        if (!dailyStats[a.date]) dailyStats[a.date] = { present: 0, late: 0, absent: 0, total: 0 };
        dailyStats[a.date].total++;
        if (a.status === 'Present') dailyStats[a.date].present++;
        else if (a.status === 'Absent') dailyStats[a.date].absent++;
        else if (a.status === 'Late') dailyStats[a.date].late++;
    });

    const sortedDates = Object.keys(dailyStats).sort().slice(-14);
    const trendLabels = sortedDates.map(d => formatDate(d));
    const trendData = sortedDates.map(d => {
        const s = dailyStats[d];
        return ((s.present + s.late) / s.total) * 100;
    });

    const canvas3 = document.getElementById('attendanceTrendChart');
    if (canvas3) {
        if (attendanceTrendChart) attendanceTrendChart.destroy();
        const ctx3 = canvas3.getContext('2d');
        attendanceTrendChart = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Daily Attendance Rate (%)',
                    data: trendData,
                    borderColor: schoolSettings.primaryColor || '#8e44ad',
                    backgroundColor: 'rgba(142,68,173,0.1)',
                    tension: 0.3, fill: true,
                    pointBackgroundColor: schoolSettings.primaryColor || '#8e44ad',
                    pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } },
                    legend: { labels: { boxWidth: 12, font: { size: 11 } } }
                },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } }
            }
        });
    }
}

// ─── INIT ───
function loadFromLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        classes = [
            { id: "C1001", name: "Nursery A", level: "Nursery", capacity: 20, status: "Active" },
            { id: "C1002", name: "Kindergarten A", level: "Kindergarten", capacity: 25, status: "Active" },
            { id: "C1003", name: "Primary 1A", level: "Primary", capacity: 30, status: "Active" },
            { id: "C1004", name: "Primary 2A", level: "Primary", capacity: 30, status: "Active" },
            { id: "C1005", name: "Primary 3A", level: "Primary", capacity: 30, status: "Active" },
            { id: "C1006", name: "Primary 4A", level: "Primary", capacity: 30, status: "Active" },
            { id: "C1007", name: "Primary 5A", level: "Primary", capacity: 30, status: "Active" },
            { id: "C1008", name: "JHS 1A", level: "Junior High School", capacity: 30, status: "Active" },
            { id: "C1009", name: "JHS 2A", level: "Junior High School", capacity: 30, status: "Active" },
            { id: "C1010", name: "JHS 3A", level: "Junior High School", capacity: 30, status: "Active" }
        ];

        students = [
            { id: "S1001", name: "Abdullah Hassan", class: "Primary 3A", age: 8, gender: "Male",
                admissionDate: "2023-09-01", status: "Active", parentName: "Hassan Ahmed",
                parentContact: "+233 55 123 4567", location: "Accra", attendance: 85 },
            { id: "S1002", name: "Maryam Ali", class: "Primary 3A", age: 8, gender: "Female",
                admissionDate: "2023-09-01", status: "Active", parentName: "Ali Mohammed",
                parentContact: "+233 54 234 5678", location: "Kumasi", attendance: 92 },
            { id: "S1003", name: "Yusuf Ibrahim", class: "Primary 4A", age: 9, gender: "Male",
                admissionDate: "2023-09-01", status: "Active", parentName: "Ibrahim Hassan",
                parentContact: "+233 55 345 6789", location: "Tamale", attendance: 78 },
            { id: "S1004", name: "Zainab Ahmed", class: "JHS 1A", age: 12, gender: "Female",
                admissionDate: "2024-01-15", status: "Active", parentName: "Ahmed Yusuf",
                parentContact: "+233 54 456 7890", location: "Cape Coast", attendance: 95 },
            { id: "S1005", name: "Omar Kabir", class: "Primary 3A", age: 8, gender: "Male",
                admissionDate: "2023-09-01", status: "Active", parentName: "Kabir Mohamed",
                parentContact: "+233 55 567 8901", location: "Sekondi", attendance: 70 },
            { id: "S1006", name: "Amara Ibrahim", class: "Primary 2A", age: 7, gender: "Female",
                admissionDate: "2023-09-01", status: "Active", parentName: "Ibrahim Amara",
                parentContact: "+233 54 678 9012", location: "Koforidua", attendance: 88 },
            { id: "S1007", name: "Rashid Hassan", class: "Primary 5A", age: 10, gender: "Male",
                admissionDate: "2023-09-01", status: "Active", parentName: "Hassan Rashid",
                parentContact: "+233 55 789 0123", location: "Sunyani", attendance: 65 },
            { id: "S1008", name: "Layla Mohammed", class: "JHS 2A", age: 11, gender: "Female",
                admissionDate: "2023-09-01", status: "Active", parentName: "Mohammed Layla",
                parentContact: "+233 54 890 1234", location: "Ho", attendance: 90 },
            { id: "S1009", name: "Ibrahim Musa", class: "JHS 1A", age: 12, gender: "Male",
                admissionDate: "2024-01-20", status: "Active", parentName: "Musa Ibrahim",
                parentContact: "+233 55 901 2345", location: "Wa", attendance: 82 },
            { id: "S1010", name: "Fatimah Bintu", class: "Primary 4A", age: 9, gender: "Female",
                admissionDate: "2024-02-01", status: "Active", parentName: "Bintu Fatimah",
                parentContact: "+233 54 012 3456", location: "Bolgatanga", attendance: 76 }
        ];
        teachers = [
            { id: "T2001", name: "Sarah Ahmed", assignedClass: "Primary 3A", subject: "Mathematics, Science",
                email: "sarah.ahmed@daralwafaa.com", phone: "+234 801 234 5678", dateJoined: "2023-09-01",
                username: "sarah.ahmed", password: "teacher123", canLogin: true },
            { id: "T2002", name: "Fatima Ibrahim", assignedClass: "Primary 4A", subject: "English, Social Studies",
                email: "fatima.ibrahim@daralwafaa.com", phone: "+234 802 345 6789", dateJoined: "2023-09-01",
                username: "fatima.ibrahim", password: "teacher123", canLogin: true },
            { id: "T2003", name: "Aisha Mohammed", assignedClass: "JHS 1A", subject: "Islamic Studies, Arabic",
                email: "aisha.mohammed@daralwafaa.com", phone: "+234 803 456 7890", dateJoined: "2024-01-15",
                username: "aisha.mohammed", password: "teacher123", canLogin: true }
        ];
        courses = [
            { id: "C3001", name: "Primary 3A", level: "Primary", capacity: 30, studentCount: 3 },
            { id: "C3002", name: "Primary 4A", level: "Primary", capacity: 30, studentCount: 1 },
            { id: "C3003", name: "JHS 1A", level: "Junior High School", capacity: 30, studentCount: 1 }
        ];
        payments = [
            { id: "P1001", studentName: "Abdullah Hassan", amount: 420.00, date: "2026-06-01", method: "Cash",
                description: "School Fees - Term 1", status: "Paid", paymentClass: "Primary 3A", yearId: "", termId: "", feeCategoryId: "", reference: "" },
            { id: "P1002", studentName: "Maryam Ali", amount: 50.00, date: "2026-06-02", method: "MTN MoMo",
                description: "Canteen Fee - Meal Plan", status: "Pending", paymentClass: "Primary 3A", yearId: "", termId: "", feeCategoryId: "", reference: "" },
            { id: "P1003", studentName: "Omar Kabir", amount: 30.00, date: "2026-06-10", method: "Cash",
                description: "T-Shirt Fee - Sports Day", status: "Paid", paymentClass: "Primary 3A", yearId: "", termId: "", feeCategoryId: "", reference: "" }
        ];
        staff = [
            { id: "ST1001", name: "Ahmed Khalid", role: "Administrator", department: "Admin",
                phone: "+233 55 111 2222", email: "ahmed@daralwafaa.com" },
            { id: "ST1002", name: "Fatimah Bintu", role: "Librarian", department: "Library",
                phone: "+233 55 333 4444", email: "fatimah@daralwafaa.com" }
        ];
        budgets = [
            { id: "B1001", category: "Tuition", allocated: 50000 },
            { id: "B1002", category: "Activities", allocated: 15000 },
            { id: "B1003", category: "Facilities", allocated: 10000 },
            { id: "B1004", category: "Staff Salaries", allocated: 60000 }
        ];
        expenses = [
            { id: "E1001", studentName: "Abdullah Hassan", class: "Primary 3A", category: "Tuition",
                description: "Scholarship disbursement", amount: 2500.00, date: "2026-06-05", method: "Bank Transfer" },
            { id: "E1002", studentName: "Maryam Ali", class: "Primary 3A", category: "Activities",
                description: "Sports equipment", amount: 1200.00, date: "2026-06-07", method: "Cash" }
        ];
        timetable = [
            { id: "TT1", day: "Monday", time: "09:00", class: "Primary 3A", subject: "Mathematics",
                teacher: "Sarah Ahmed", room: "Room 101" },
            { id: "TT2", day: "Monday", time: "10:00", class: "Primary 4A", subject: "English",
                teacher: "Fatima Ibrahim", room: "Room 102" },
            { id: "TT3", day: "Tuesday", time: "09:00", class: "Primary 3A", subject: "Science",
                teacher: "Sarah Ahmed", room: "Room 101" }
        ];
        subjects = [
            { id: "SUB1", name: "Language & Literacy", code: "LANG101", level: "Basic 1–3", description: "Language and literacy skills" },
            { id: "SUB2", name: "Numeracy", code: "NUM101", level: "Basic 1–3", description: "Basic numeracy" },
            { id: "SUB3", name: "Creative Arts", code: "CA101", level: "Basic 1–3", description: "Creative arts" },
            { id: "SUB4", name: "History", code: "HIST101", level: "Basic 1–3", description: "History" },
            { id: "SUB5", name: "Science", code: "SCI101", level: "Basic 1–3", description: "Basic science" },
            { id: "SUB6", name: "OWOP", code: "OWOP101", level: "Basic 1–3", description: "Our World Our People" },
            { id: "SUB7", name: "RME", code: "RME101", level: "Basic 1–3", description: "Religious and Moral Education" },
            { id: "SUB8", name: "PE", code: "PE101", level: "Basic 1–3", description: "Physical Education" },
            { id: "SUB9", name: "English", code: "ENG201", level: "Basic 4–6", description: "English Language" },
            { id: "SUB10", name: "Ghanaian Language", code: "GHAN201", level: "Basic 4–6", description: "Ghanaian Language" },
            { id: "SUB11", name: "Mathematics", code: "MATH201", level: "Basic 4–6", description: "Mathematics" },
            { id: "SUB12", name: "Science", code: "SCI201", level: "Basic 4–6", description: "Science" },
            { id: "SUB13", name: "History", code: "HIST201", level: "Basic 4–6", description: "History" },
            { id: "SUB14", name: "Creative Arts", code: "CA201", level: "Basic 4–6", description: "Creative Arts" },
            { id: "SUB15", name: "OWOP", code: "OWOP201", level: "Basic 4–6", description: "Our World Our People" },
            { id: "SUB16", name: "Computing", code: "COMP201", level: "Basic 4–6", description: "Computing" },
            { id: "SUB17", name: "RME", code: "RME201", level: "Basic 4–6", description: "Religious and Moral Education" },
            { id: "SUB18", name: "PE", code: "PE201", level: "Basic 4–6", description: "Physical Education" },
            { id: "SUB19", name: "French", code: "FREN201", level: "Basic 4–6", description: "French" },
            { id: "SUB20", name: "English", code: "ENG301", level: "JHS 1–3", description: "English Language" },
            { id: "SUB21", name: "Mathematics", code: "MATH301", level: "JHS 1–3", description: "Mathematics" },
            { id: "SUB22", name: "Science", code: "SCI301", level: "JHS 1–3", description: "Science" },
            { id: "SUB23", name: "Social Studies", code: "SOC301", level: "JHS 1–3", description: "Social Studies" },
            { id: "SUB24", name: "French", code: "FREN301", level: "JHS 1–3", description: "French" },
            { id: "SUB25", name: "Ghanaian Language", code: "GHAN301", level: "JHS 1–3", description: "Ghanaian Language" },
            { id: "SUB26", name: "Arabic", code: "ARAB301", level: "JHS 1–3", description: "Arabic" },
            { id: "SUB27", name: "RME", code: "RME301", level: "JHS 1–3", description: "Religious and Moral Education" },
            { id: "SUB28", name: "PE & Health", code: "PEH301", level: "JHS 1–3", description: "Physical Education & Health" },
            { id: "SUB29", name: "Creative Arts & Design", code: "CAD301", level: "JHS 1–3", description: "Creative Arts & Design" },
            { id: "SUB30", name: "Career Technology", code: "CT301", level: "JHS 1–3", description: "Career Technology" },
            { id: "SUB31", name: "Computing", code: "COMP301", level: "JHS 1–3", description: "Computing" }
        ];
        exams = [
            { id: "EX1", name: "Mid-Term Test", subject: "Mathematics", class: "Primary 3A", date: "2026-06-20",
                maxScore: 100, type: "Individual Test", description: "Mid-term assessment", termId: "T1" },
            { id: "EX2", name: "End of Term Exam", subject: "English Language", class: "Primary 4A",
                date: "2026-07-10", maxScore: 100, type: "End of Term Exam", description: "Final term examination", termId: "T1" },
            { id: "EX3", name: "Quiz 1", subject: "Science", class: "Primary 3A", date: "2026-06-25",
                maxScore: 50, type: "Class Test", description: "Science quiz", termId: "T1" },
            { id: "EX4", name: "Mid-Term Test", subject: "Science", class: "JHS 1A", date: "2026-06-22",
                maxScore: 100, type: "Individual Test", description: "Mid-term science assessment", termId: "T1" },
            { id: "EX5", name: "Quiz 2", subject: "Mathematics", class: "Primary 3A", date: "2026-07-05",
                maxScore: 50, type: "Class Test", description: "Math quiz", termId: "T1" },
            { id: "EX6", name: "Group Project", subject: "Science", class: "Primary 3A", date: "2026-06-28",
                maxScore: 50, type: "Project", description: "Group science project", termId: "T1" }
        ];
        examGrades = [
            { id: "EG1", examId: "EX1", studentId: "S1001", score: 85 },
            { id: "EG2", examId: "EX1", studentId: "S1002", score: 72 },
            { id: "EG3", examId: "EX1", studentId: "S1005", score: 90 },
            { id: "EG4", examId: "EX2", studentId: "S1003", score: 78 },
            { id: "EG5", examId: "EX2", studentId: "S1007", score: 65 },
            { id: "EG6", examId: "EX2", studentId: "S1010", score: 92 },
            { id: "EG7", examId: "EX3", studentId: "S1001", score: 42 },
            { id: "EG8", examId: "EX3", studentId: "S1002", score: 35 },
            { id: "EG9", examId: "EX3", studentId: "S1005", score: 48 },
            { id: "EG10", examId: "EX1", studentId: "S1008", score: 45 },
            { id: "EG11", examId: "EX1", studentId: "S1009", score: 88 },
            { id: "EG12", examId: "EX4", studentId: "S1004", score: 76 },
            { id: "EG13", examId: "EX4", studentId: "S1009", score: 82 },
            { id: "EG14", examId: "EX5", studentId: "S1001", score: 38 },
            { id: "EG15", examId: "EX5", studentId: "S1002", score: 44 },
            { id: "EG16", examId: "EX5", studentId: "S1005", score: 47 },
            { id: "EG17", examId: "EX6", studentId: "S1001", score: 45 },
            { id: "EG18", examId: "EX6", studentId: "S1002", score: 48 },
            { id: "EG19", examId: "EX6", studentId: "S1005", score: 50 }
        ];
        terms = [
            { id: "T1", name: "Term 1" },
            { id: "T2", name: "Term 2" },
            { id: "T3", name: "Term 3" }
        ];
        attendance = [];
        staffAttendance = [];
        accountants = [
            { id: 'ACC1', name: 'Accountant', username: 'accountant', password: 'account123',
              canLogin: true, email: '', phone: '', dateJoined: getLocalDateString() }
        ];
        academicYears = [
            { id: 'AY1', name: '2024/2025' },
            { id: 'AY2', name: '2025/2026' },
            { id: 'AY3', name: '2026/2027' }
        ];
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
        feeStructure = [];
        saveToLocal();
    } else {
        const parsed = JSON.parse(raw);
        students = parsed.students || [];
        teachers = parsed.teachers || [];
        courses = parsed.courses || [];
        payments = parsed.payments || [];
        staff = parsed.staff || [];
        budgets = parsed.budgets || [];
        expenses = parsed.expenses || [];
        timetable = parsed.timetable || [];
        classes = parsed.classes || [];
        subjects = parsed.subjects || [];
        exams = parsed.exams || [];
        examGrades = parsed.examGrades || [];
        terms = parsed.terms || [];
        attendance = parsed.attendance || [];
        staffAttendance = parsed.staffAttendance || [];
        payments.forEach(p => {
            if (!p.status) p.status = 'Pending';
            if (!p.paymentClass) p.paymentClass = '';
            if (p.yearId === undefined) p.yearId = '';
            if (p.termId === undefined) p.termId = '';
            if (p.feeCategoryId === undefined) p.feeCategoryId = '';
            if (p.reference === undefined) p.reference = '';
        });
        expenses.forEach(e => {
            if (!e.studentName) e.studentName = '';
            if (!e.class) e.class = '';
        });
        students.forEach(s => {
            if (s.attendance === undefined) s.attendance = 0;
        });
        exams.forEach(e => {
            if (!e.termId) e.termId = '';
        });
        teachers.forEach(t => {
            if (!t.username) {
                t.username = (t.name || 'teacher').toLowerCase().replace(/\s+/g, '.');
            }
            if (!t.password) {
                t.password = 'teacher123';
            }
            if (t.canLogin === undefined) t.canLogin = true;
        });
        accountants = parsed.accountants || [];
        if (!accountants.length) {
            accountants = [
                { id: 'ACC1', name: 'Accountant', username: 'accountant', password: 'account123',
                  canLogin: true, email: '', phone: '', dateJoined: getLocalDateString() }
            ];
        } else {
            accountants.forEach(a => {
                if (!a.username) a.username = (a.name || 'accountant').toLowerCase().replace(/\s+/g, '.');
                if (!a.password) a.password = 'account123';
                if (a.canLogin === undefined) a.canLogin = true;
            });
        }
        academicYears = parsed.academicYears || [];
        feeCategories = parsed.feeCategories || [];
        feeStructure = parsed.feeStructure || [];
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
        saveToLocal();
    }
}

// ─── BIND EVENTS ───
function bindEvents() {
    document.getElementById('hamburgerToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSidebar();
            closePerformanceModal();
            closeStudentDetails();
        }
    });

    document.querySelectorAll('.sidebar-nav .nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
    });

    document.getElementById('addStudentBtn').onclick = openAddStudent;
    document.getElementById('addTeacherBtn').onclick = openAddTeacher;
    document.getElementById('addPaymentBtn').onclick = openAddPayment;
    document.getElementById('addBudgetBtn').onclick = openAddBudget;
    document.getElementById('addExpenseBtn').onclick = openAddExpense;
    document.getElementById('addTimetableBtn').onclick = openAddTimetable;
    document.getElementById('addExamBtn').onclick = openAddExam;
    document.getElementById('refreshExamsBtn').onclick = function() {
        renderExams();
        renderExamAnalytics();
        renderSubjectPerformanceChart();
        renderSubjectPerformanceDetailedChart();
        showToast('Exams refreshed!');
    };
    document.getElementById('refreshAnalyticsBtn').onclick = function() {
        renderRevenueExpenseChart();
        renderSubjectPerformanceChart();
        renderBudgetUtilizationChart();
        renderRevenueByCategoryChart();
        renderTermRevenueChart();
        renderArrearsByClassChart();
        renderFeeCollectionProgressChart();
        renderSubjectPerformanceDetailedChart();
        updateAnalyticsInsights();
        renderExamAnalytics();
        renderAttendanceAnalytics();
        showToast('✅ Analytics refreshed!');
    };

    document.getElementById('addClassBtn').onclick = openAddClass;
    document.getElementById('addSubjectBtn').onclick = openAddSubject;
    document.getElementById('addTermBtn').onclick = addTerm;

    document.getElementById('refreshExamAnalytics').onclick = function() {
        renderExamAnalytics();
        showToast('Exam analytics refreshed!');
    };

    const refreshAttBtn = document.getElementById('refreshAttendanceAnalytics');
    if (refreshAttBtn) {
        refreshAttBtn.onclick = function() {
            renderAttendanceAnalytics();
            showToast('Attendance analytics refreshed!');
        };
    }

    document.querySelectorAll('.class-view-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchViewTab(this.dataset.viewtab);
        });
    });

    document.getElementById('closePromoteModal').onclick = () => document.getElementById('promoteModal').classList.remove('active');
    document.getElementById('savePromoteBtn').onclick = promoteStudents;

    document.getElementById('closeStudentModal').onclick = () => document.getElementById('studentModal').classList.remove('active');
    document.getElementById('closeTeacherModal').onclick = () => document.getElementById('teacherModal').classList.remove('active');
    document.getElementById('closePaymentModal').onclick = () => document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('closeClassModal').onclick = () => document.getElementById('classModal').classList.remove('active');
    document.getElementById('closeSubjectModal').onclick = () => document.getElementById('subjectModal').classList.remove('active');
    document.getElementById('closeExamModal').onclick = () => document.getElementById('examModal').classList.remove('active');
    document.getElementById('closeBudgetModal').onclick = () => document.getElementById('budgetModal').classList.remove('active');
    document.getElementById('closeExpenseModal').onclick = () => document.getElementById('expenseModal').classList.remove('active');
    document.getElementById('closeTimetableModal').onclick = () => document.getElementById('timetableModal').classList.remove('active');

    document.getElementById('deleteTimetableBtn').addEventListener('click', function() {
        const id = document.getElementById('timetableId').value;
        if (id) {
            deleteTimetable(id);
            document.getElementById('timetableModal').classList.remove('active');
        } else {
            showToast('No schedule selected to delete.', true);
        }
    });

    document.getElementById('saveStudentBtn').onclick = saveStudent;
    document.getElementById('saveTeacherBtn').onclick = saveTeacher;
    document.getElementById('savePaymentBtn').onclick = savePayment;
    document.getElementById('saveClassBtn').onclick = saveClass;
    document.getElementById('saveSubjectBtn').onclick = saveSubject;
    document.getElementById('saveExamBtn').onclick = saveExam;
    document.getElementById('saveBudgetBtn').onclick = saveBudget;
    document.getElementById('saveExpenseBtn').onclick = saveExpense;
    document.getElementById('saveTimetableBtn').onclick = saveTimetable;

    document.getElementById('saveSettingsBtn').onclick = saveSettingsHandler;
    document.getElementById('resetSettingsBtn').onclick = resetSettings;

    document.getElementById('logoUploadInput').addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            handleLogoUpload(this.files[0]);
        }
    });

    document.getElementById('downloadBackupBtn').onclick = downloadBackup;
    document.getElementById('restoreBackupBtn').onclick = () => document.getElementById('restoreFileInput').click();
    document.getElementById('restoreFileInput').addEventListener('change', handleRestoreFile);
    document.getElementById('confirmRestoreBtn').onclick = confirmRestore;
    document.getElementById('cancelRestoreBtn').onclick = cancelRestore;

    document.getElementById('changePasswordBtn').onclick = openChangePasswordModal;
    document.getElementById('closeChangePassModal').onclick = closeChangePasswordModal;
    document.getElementById('saveNewPasswordBtn').onclick = saveNewPassword;

    const saveTABtn = document.getElementById('saveTeacherAccountBtn');
    if (saveTABtn) saveTABtn.onclick = saveTeacherAccount;
    const closeTABtn = document.getElementById('closeTeacherAccountModal');
    if (closeTABtn) closeTABtn.onclick = closeTeacherAccountModal;

    const addAccBtn = document.getElementById('addAccountantBtn');
    if (addAccBtn) addAccBtn.onclick = openAddAccountant;
    const saveAccBtn = document.getElementById('saveAccountantBtn');
    if (saveAccBtn) saveAccBtn.onclick = saveAccountant;
    const closeAccBtn = document.getElementById('closeAccountantModal');
    if (closeAccBtn) closeAccBtn.onclick = closeAccountantModal;
    const delAccBtn = document.getElementById('deleteAccountantBtn');
    if (delAccBtn) delAccBtn.onclick = deleteAccountantById;

    const addYearBtn = document.getElementById('addAcademicYearBtn');
    if (addYearBtn) addYearBtn.onclick = addAcademicYear;
    const addFeeCatBtn = document.getElementById('addFeeCategoryBtn');
    if (addFeeCatBtn) addFeeCatBtn.onclick = addFeeCategory;
    const addFeeStructBtn = document.getElementById('addFeeStructureBtn');
    if (addFeeStructBtn) addFeeStructBtn.onclick = openAddFeeStructure;
    const closeFeeStructBtn = document.getElementById('closeFeeStructureModal');
    if (closeFeeStructBtn) closeFeeStructBtn.onclick = closeFeeStructureModal;
    const saveFeeStructBtn = document.getElementById('saveFeeStructureBtn');
    if (saveFeeStructBtn) saveFeeStructBtn.onclick = saveFeeStructure;
    const searchFeeStruct = document.getElementById('searchFeeStructure');
    if (searchFeeStruct) {
        searchFeeStruct.addEventListener('input', e => {
            feeStructureSearch = e.target.value;
            renderFeeStructure();
        });
    }

    const regYear = document.getElementById('registerYearFilter');
    if (regYear) regYear.addEventListener('change', () => renderPaymentRegister());
    const regTerm = document.getElementById('registerTermFilter');
    if (regTerm) regTerm.addEventListener('change', () => renderPaymentRegister());
    const regClass = document.getElementById('registerClassFilter');
    if (regClass) regClass.addEventListener('change', () => renderPaymentRegister());

    const arrYear = document.getElementById('arrearsYearFilter');
    if (arrYear) arrYear.addEventListener('change', () => renderArrearsView());
    const arrTerm = document.getElementById('arrearsTermFilter');
    if (arrTerm) arrTerm.addEventListener('change', () => renderArrearsView());
    const arrClass = document.getElementById('arrearsClassFilter');
    if (arrClass) arrClass.addEventListener('change', () => renderArrearsView());

    document.getElementById('attendanceDate').addEventListener('change', renderAttendanceGrid);
    document.getElementById('attendanceClassSelect').addEventListener('change', renderAttendanceGrid);
    document.getElementById('markAllPresentBtn').onclick = markAllPresent;
    document.getElementById('clearAttendanceBtn').onclick = clearAttendanceForDay;
    document.getElementById('applyAttendanceFilter').onclick = renderAttendanceSummary;
    document.querySelectorAll('#tabAttendance .sub-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAttendanceSubTab(tab.getAttribute('data-attendsubtab')));
    });

    const staffDateEl = document.getElementById('staffAttendanceDate');
    if (staffDateEl) staffDateEl.addEventListener('change', renderStaffAttendanceGrid);
    const staffMarkAllBtn = document.getElementById('staffMarkAllPresentBtn');
    if (staffMarkAllBtn) staffMarkAllBtn.onclick = markAllStaffPresent;
    const staffClearBtn = document.getElementById('staffClearBtn');
    if (staffClearBtn) staffClearBtn.onclick = clearStaffAttendanceForDay;
    const staffFilterBtn = document.getElementById('staffApplyFilter');
    if (staffFilterBtn) staffFilterBtn.onclick = renderStaffAttendanceSummary;
    document.querySelectorAll('#tabStaffattendance .sub-tab').forEach(tab => {
        tab.addEventListener('click', () => switchStaffSubTab(tab.getAttribute('data-staffsubtab')));
    });

    document.getElementById('settingsPrimaryColor').addEventListener('input', function() {
        const hex = this.value;
        document.getElementById('colorHexDisplay').textContent = hex;
        document.getElementById('previewBadge').style.background = hex;
        document.getElementById('previewGradient').style.background =
            `linear-gradient(135deg, ${hex} 0%, ${adjustColor(hex, 30)} 100%)`;
        const name = document.getElementById('settingsSchoolName').value.trim() || 'Dar Al-Wafaa';
        const initial = name.charAt(0).toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="${hex}"/>
            <text x="32" y="42" font-size="36" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="700">${initial}</text>
        </svg>`;
        const faviconLink = document.getElementById('dynamicFavicon');
        if (faviconLink) faviconLink.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    });

    document.getElementById('settingsSchoolName').addEventListener('input', function() {
        document.getElementById('previewSchoolName').textContent = this.value || 'Dar Al-Wafaa';
        const name = this.value.trim() || 'Dar Al-Wafaa';
        const initial = name.charAt(0).toUpperCase();
        const color = document.getElementById('settingsPrimaryColor').value || '#6c3a9d';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="${color}"/>
            <text x="32" y="42" font-size="36" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="700">${initial}</text>
        </svg>`;
        const faviconLink = document.getElementById('dynamicFavicon');
        if (faviconLink) faviconLink.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    });

    document.getElementById('searchStudents').addEventListener('input', (e) => { studentSearch = e.target.value; renderStudents(); });
    document.getElementById('studentClassFilter').addEventListener('change', (e) => { studentClassFilter = e.target.value; renderStudents(); });
    document.getElementById('searchTeachers').addEventListener('input', (e) => { teacherSearch = e.target.value; renderTeachers(); });
    document.getElementById('searchPayments').addEventListener('input', (e) => { paymentSearch = e.target.value; renderPayments(); });
    document.getElementById('searchBudget').addEventListener('input', (e) => { budgetSearch = e.target.value; renderBudgets(); });
    document.getElementById('searchExpenses').addEventListener('input', (e) => { expenseSearch = e.target.value; renderExpenses(); });

    document.getElementById('searchClasses').addEventListener('input', (e) => { classSearch = e.target.value; renderClassCards(); });
    document.getElementById('classLevelFilter').addEventListener('change', (e) => { classLevelFilter = e.target.value; renderClassCards(); });

    document.getElementById('searchSubjects').addEventListener('input', (e) => { subjectSearch = e.target.value; renderSubjects(); });

    document.getElementById('timetableClassFilter').addEventListener('change', function() {
        timetableClassFilter = this.value;
        renderTimetableGrid();
    });
    document.getElementById('timetableTeacherFilter').addEventListener('change', function() {
        timetableTeacherFilter = this.value;
        renderTimetableGrid();
    });
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDay = this.dataset.day;
            renderTimetableGrid();
        });
    });

    document.querySelectorAll('#tabPayments .sub-tab').forEach(tab => {
        tab.addEventListener('click', () => switchPaySubTab(tab.getAttribute('data-subtab')));
    });

    document.getElementById('paymentStatusFilter').addEventListener('change', renderPayments);

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    window.onclick = (e) => {
        if (e.target.classList.contains('modal-overlay') && e.target.id !== 'performanceModal' && e.target.id !== 'studentDetailsModal') {
            e.target.classList.remove('active');
        }
        if (e.target.id === 'performanceModal') closePerformanceModal();
        if (e.target.id === 'studentDetailsModal') closeStudentDetails();
    };
}

// ─── EXPOSE GLOBAL FUNCTIONS ───
window.switchTab = switchTab;
window.openEditStudent = openEditStudent;
window.deleteStudentById = deleteStudentById;
window.openEditTeacher = openEditTeacher;
window.deleteTeacherById = deleteTeacherById;
window.openEditPayment = openEditPayment;
window.deletePaymentById = deletePaymentById;
window.openEditBudget = openEditBudget;
window.deleteBudgetById = deleteBudgetById;
window.openEditExpense = openEditExpense;
window.deleteExpenseById = deleteExpenseById;
window.editTimetable = editTimetable;
window.deleteTimetable = deleteTimetable;
window.switchPaySubTab = switchPaySubTab;
window.openEditClass = openEditClass;
window.deleteClassById = deleteClassById;
window.openAddClass = openAddClass;
window.showClassRegister = showClassRegister;
window.backToClasses = backToClasses;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openEditSubject = openEditSubject;
window.deleteSubjectById = deleteSubjectById;
window.openGradeEntry = openGradeEntry;
window.closeGradeEntry = closeGradeEntry;
window.openExamReport = openExamReport;
window.closeExamReport = closeExamReport;
window.openEditExam = openEditExam;
window.deleteExamById = deleteExamById;
window.openAddExamForClass = openAddExamForClass;
window.openClassGradeEntry = openClassGradeEntry;
window.closeClassGradeEntry = closeClassGradeEntry;
window.openClassExamReport = openClassExamReport;
window.closeClassExamReport = closeClassExamReport;
window.deleteClassExam = deleteClassExam;
window.openPromoteModal = openPromoteModal;
window.promoteStudents = promoteStudents;
window.exportStudentsCSV = exportStudentsCSV;
window.exportTeachersCSV = exportTeachersCSV;
window.exportPaymentsCSV = exportPaymentsCSV;
window.exportBudgetsCSV = exportBudgetsCSV;
window.exportExpensesCSV = exportExpensesCSV;
window.exportExamsCSV = exportExamsCSV;
window.exportClassesCSV = exportClassesCSV;
window.exportSubjectsCSV = exportSubjectsCSV;
window.openPerformanceModal = openPerformanceModal;
window.closePerformanceModal = closePerformanceModal;
window.downloadPerformancePDF = downloadPerformancePDF;
window.openStudentDetails = openStudentDetails;
window.closeStudentDetails = closeStudentDetails;
window.editTerm = editTerm;
window.deleteTerm = deleteTerm;
window.getAdminPassword = getAdminPassword;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.saveNewPassword = saveNewPassword;
window.openTeacherAccountModal = openTeacherAccountModal;
window.closeTeacherAccountModal = closeTeacherAccountModal;
window.saveTeacherAccount = saveTeacherAccount;
window.renderTeacherAccounts = renderTeacherAccounts;
window.openAddAccountant = openAddAccountant;
window.openEditAccountant = openEditAccountant;
window.closeAccountantModal = closeAccountantModal;
window.saveAccountant = saveAccountant;
window.deleteAccountantById = deleteAccountantById;
window.renderAccountantAccounts = renderAccountantAccounts;
window.switchStaffSubTab = switchStaffSubTab;
window.editAcademicYear = editAcademicYear;
window.deleteAcademicYear = deleteAcademicYear;
window.editFeeCategory = editFeeCategory;
window.deleteFeeCategory = deleteFeeCategory;
window.openEditFeeStructure = openEditFeeStructure;
window.deleteFeeStructure = deleteFeeStructure;
window.exportFeeStructureCSV = exportFeeStructureCSV;
window.openRegisterStudentView = openRegisterStudentView;
window.exportRegisterCSV = exportRegisterCSV;
window.exportArrearsCSV = exportArrearsCSV;
window.renderArrearsView = renderArrearsView;
window.populateArrearsFilters = populateArrearsFilters;
window.renderRevenueByCategoryChart = renderRevenueByCategoryChart;
window.renderTermRevenueChart = renderTermRevenueChart;
window.renderArrearsByClassChart = renderArrearsByClassChart;
window.renderFeeCollectionProgressChart = renderFeeCollectionProgressChart;
window.renderSubjectPerformanceDetailedChart = renderSubjectPerformanceDetailedChart;
window.updateAnalyticsInsights = updateAnalyticsInsights;
window.updateAcademicInsights = updateAcademicInsights;
window.updateDecisionInsights = updateDecisionInsights;
window.toggleFeeLevelGroup = toggleFeeLevelGroup;
window.openAddFeeStructureForClass = openAddFeeStructureForClass;
window.openClassRegister = openClassRegister;
window.backToRegisterGroups = backToRegisterGroups;
window.toggleRegisterLevelGroup = toggleRegisterLevelGroup;
window.toggleExamLevelGroup = toggleExamLevelGroup;

// ─── LOGIN FORM HANDLER ───
document.getElementById('loginForm').addEventListener('submit', handleLogin);

// ─── START ───
function init() {
    loadSettings();
    loadFromLocal();

    if (isLoggedIn()) {
        hideLogin();
        applyRoleUI();
        bindEvents();
        populateExpenseCategoryDropdown('');
        populateExamDropdowns();
        populateTermDropdowns();
        populateAttendanceClassDropdowns();
        populateFeeStructureDropdowns();
        populateRegisterFilters();
        populateArrearsFilters();
        populatePaymentFeeTypeDropdown('');
        renderExamAnalytics();
        renderAttendanceAnalytics();
        renderSubjectPerformanceChart();
        renderSubjectPerformanceDetailedChart();
        renderRevenueByCategoryChart();
        renderTermRevenueChart();
        renderArrearsByClassChart();
        renderFeeCollectionProgressChart();
        updateAnalyticsInsights();
        renderTerms();
        renderAcademicYears();
        renderFeeCategories();
        renderFeeStructure();
        renderTeacherAccounts();
        renderAccountantAccounts();
        switchTab('dashboard');
        updateAllUI();
        updateFavicon();
    } else {
        showLogin();
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        bindEvents();
        updateFavicon();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
