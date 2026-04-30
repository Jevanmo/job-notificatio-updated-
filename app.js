const appRoot = document.getElementById('app-root');

// --- Local Storage Helpers ---
const getSavedJobIds = () => JSON.parse(localStorage.getItem('savedJobs') || '[]');
const saveJobId = (id) => {
  const saved = getSavedJobIds();
  if (!saved.includes(id)) {
    saved.push(id);
    localStorage.setItem('savedJobs', JSON.stringify(saved));
  }
};
const removeJobId = (id) => {
  let saved = getSavedJobIds();
  saved = saved.filter(jobId => jobId !== id);
  localStorage.setItem('savedJobs', JSON.stringify(saved));
};

const getPrefs = () => JSON.parse(localStorage.getItem('jobTrackerPreferences') || 'null');
const setPrefs = (prefs) => localStorage.setItem('jobTrackerPreferences', JSON.stringify(prefs));

const getJobStatuses = () => JSON.parse(localStorage.getItem('jobTrackerStatus') || '{}');
const getStatusHistory = () => JSON.parse(localStorage.getItem('jobTrackerStatusHistory') || '[]');
const setJobStatus = (jobId, status, jobTitle, jobCompany) => {
  const statuses = getJobStatuses();
  statuses[jobId] = status;
  localStorage.setItem('jobTrackerStatus', JSON.stringify(statuses));

  // Add to history for digest page
  if (status !== 'Not Applied') {
    const history = getStatusHistory();
    history.unshift({
      jobId,
      jobTitle,
      jobCompany,
      status,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });
    // Keep last 20
    localStorage.setItem('jobTrackerStatusHistory', JSON.stringify(history.slice(0, 20)));
  }
};

const getTestStatus = () => JSON.parse(localStorage.getItem('jobTrackerTestStatus') || '{}');
const setTestStatus = (statusObj) => localStorage.setItem('jobTrackerTestStatus', JSON.stringify(statusObj));

// --- State ---
let jobs = [];
let filterState = {
  keyword: '',
  location: '',
  mode: '',
  experience: '',
  source: '',
  status: 'All',
  sort: 'Latest',
  showOnlyThreshold: false
};

const TEST_ITEMS = [
  { id: 'test-1', label: 'Preferences persist after refresh', desc: 'Save settings, reload the page, ensure fields are filled' },
  { id: 'test-2', label: 'Match score calculates correctly', desc: 'Check if job cards show accurate Match % badges' },
  { id: 'test-3', label: '"Show only matches" toggle works', desc: 'Toggle the threshold switch on the dashboard' },
  { id: 'test-4', label: 'Save job persists after refresh', desc: 'Save a job, reload, check if still saved' },
  { id: 'test-5', label: 'Apply opens in new tab', desc: 'Click Apply, ensure it targets _blank' },
  { id: 'test-6', label: 'Status update persists after refresh', desc: 'Change a job status to Applied, reload page' },
  { id: 'test-7', label: 'Status filter works correctly', desc: 'Use Dashboard filter bar to select a specific status' },
  { id: 'test-8', label: 'Digest generates top 10 by score', desc: 'Check if simulated digest orders jobs correctly' },
  { id: 'test-9', label: 'Digest persists for the day', desc: 'Reload the digest page to confirm it loads instantly' },
  { id: 'test-10', label: 'No console errors on main pages', desc: 'Open DevTools, click around, verify clean console' }
];

// --- Toast System ---
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// --- Math Score Engine ---
function calculateMatchScore(job, prefs) {
  if (!prefs) return null;
  let score = 0;
  
  const roleKeywords = prefs.roleKeywords ? prefs.roleKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];
  const skills = prefs.skills ? prefs.skills.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];
  
  if (roleKeywords.some(k => job.title.toLowerCase().includes(k))) score += 25;
  if (roleKeywords.some(k => job.description.toLowerCase().includes(k))) score += 15;
  if (prefs.preferredLocations && prefs.preferredLocations.includes(job.location)) score += 15;
  if (prefs.preferredMode && prefs.preferredMode.includes(job.mode)) score += 10;
  if (prefs.experienceLevel && job.experience === prefs.experienceLevel) score += 10;
  if (job.skills.some(js => skills.some(us => js.toLowerCase().includes(us) || us.includes(js.toLowerCase())))) score += 15;
  if (job.postedDaysAgo <= 2) score += 5;
  if (job.source === 'LinkedIn') score += 5;
  
  return Math.min(score, 100);
}

// --- UI Components ---
function renderJobCard(job, isSaved) {
  const saveBtnText = isSaved ? 'Saved' : 'Save';
  
  let badgeHTML = '';
  if (job.matchScore !== null && job.matchScore !== undefined) {
    let badgeClass = 'match-badge--grey';
    if (job.matchScore >= 80) badgeClass = 'match-badge--green';
    else if (job.matchScore >= 60) badgeClass = 'match-badge--amber';
    else if (job.matchScore >= 40) badgeClass = 'match-badge--neutral';
    
    badgeHTML = `<span class="match-badge ${badgeClass}">Match: ${job.matchScore}%</span>`;
  }

  const currentStatus = getJobStatuses()[job.id] || 'Not Applied';
  const statusClass = `status-${currentStatus.toLowerCase().replace(' ', '-')}`;

  return `
    <div class="job-card">
      <div class="job-card__header">
        <div>
          <h3 class="job-card__title">${job.title}</h3>
          <div class="job-card__company">${job.company}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: flex-start; flex-direction: column; align-items: flex-end;">
          ${badgeHTML}
          <div style="display: flex; gap: 4px;">
            <span class="badge badge-mini">${job.source}</span>
            <select class="job-status-select badge ${statusClass}" data-id="${job.id}">
              <option value="Not Applied" ${currentStatus === 'Not Applied' ? 'selected' : ''}>Not Applied</option>
              <option value="Applied" ${currentStatus === 'Applied' ? 'selected' : ''}>Applied</option>
              <option value="Rejected" ${currentStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
              <option value="Selected" ${currentStatus === 'Selected' ? 'selected' : ''}>Selected</option>
            </select>
          </div>
        </div>
      </div>
      <div class="job-card__meta">
        <div class="job-card__meta-item">📍 ${job.location} (${job.mode})</div>
        <div class="job-card__meta-item">💼 ${job.experience}</div>
        <div class="job-card__meta-item">💰 ${job.salaryRange}</div>
        <div class="job-card__meta-item">🕒 ${job.postedDaysAgo === 0 ? 'Today' : job.postedDaysAgo + ' days ago'}</div>
      </div>
      <div class="job-card__actions">
        <button class="btn btn-primary btn-apply" data-url="${job.applyUrl}">Apply</button>
        <button class="btn btn-secondary btn-save" data-id="${job.id}">${saveBtnText}</button>
        <button class="btn btn-secondary btn-view" data-id="${job.id}">View</button>
      </div>
    </div>
  `;
}

function renderFilterBar() {
  return `
    <div class="filter-bar">
      <input type="text" id="filter-keyword" placeholder="Search title or company" value="${filterState.keyword}">
      <select id="filter-location">
        <option value="">All Locations</option>
        ${['Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Gurugram', 'Noida', 'Mumbai'].map(loc => `<option value="${loc}" ${filterState.location === loc ? 'selected' : ''}>${loc}</option>`).join('')}
      </select>
      <select id="filter-mode">
        <option value="">All Modes</option>
        <option value="Remote" ${filterState.mode === 'Remote' ? 'selected' : ''}>Remote</option>
        <option value="Hybrid" ${filterState.mode === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
        <option value="Onsite" ${filterState.mode === 'Onsite' ? 'selected' : ''}>Onsite</option>
      </select>
      <select id="filter-exp">
        <option value="">All Experience</option>
        <option value="Fresher" ${filterState.experience === 'Fresher' ? 'selected' : ''}>Fresher</option>
        <option value="0-1" ${filterState.experience === '0-1' ? 'selected' : ''}>0-1 Years</option>
        <option value="1-3" ${filterState.experience === '1-3' ? 'selected' : ''}>1-3 Years</option>
        <option value="3-5" ${filterState.experience === '3-5' ? 'selected' : ''}>3-5 Years</option>
      </select>
      <select id="filter-source">
        <option value="">All Sources</option>
        <option value="LinkedIn" ${filterState.source === 'LinkedIn' ? 'selected' : ''}>LinkedIn</option>
        <option value="Naukri" ${filterState.source === 'Naukri' ? 'selected' : ''}>Naukri</option>
        <option value="Indeed" ${filterState.source === 'Indeed' ? 'selected' : ''}>Indeed</option>
      </select>
      <select id="filter-status">
        <option value="All" ${filterState.status === 'All' ? 'selected' : ''}>Status: All</option>
        <option value="Not Applied" ${filterState.status === 'Not Applied' ? 'selected' : ''}>Status: Not Applied</option>
        <option value="Applied" ${filterState.status === 'Applied' ? 'selected' : ''}>Status: Applied</option>
        <option value="Rejected" ${filterState.status === 'Rejected' ? 'selected' : ''}>Status: Rejected</option>
        <option value="Selected" ${filterState.status === 'Selected' ? 'selected' : ''}>Status: Selected</option>
      </select>
      <select id="filter-sort">
        <option value="Latest" ${filterState.sort === 'Latest' ? 'selected' : ''}>Sort: Latest</option>
        <option value="Match Score" ${filterState.sort === 'Match Score' ? 'selected' : ''}>Sort: Match Score</option>
        <option value="Salary" ${filterState.sort === 'Salary' ? 'selected' : ''}>Sort: Salary</option>
      </select>
    </div>
  `;
}

// --- Route rendering functions ---
function renderLanding() {
  return `
    <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <section class="placeholder-page" style="padding-top: 10vh;">
        <h1 class="placeholder-title" style="font-size: 4rem;">Stop Missing The Right Jobs.</h1>
        <p class="placeholder-subtext" style="font-size: 1.25rem; margin-bottom: var(--space-4);">Precision-matched job discovery delivered daily at 9AM.</p>
        <a href="/settings" class="btn btn-primary" data-link style="font-size: 1.125rem; padding: var(--space-3) var(--space-4);">Start Tracking</a>
      </section>
    </div>
  `;
}

function renderSettings() {
  const prefs = getPrefs() || {
    roleKeywords: '',
    preferredLocations: [],
    preferredMode: [],
    experienceLevel: '',
    skills: '',
    minMatchScore: 40
  };

  const isLocSelected = (loc) => prefs.preferredLocations.includes(loc) ? 'selected' : '';
  const isModeChecked = (mode) => prefs.preferredMode.includes(mode) ? 'checked' : '';

  return `
    <div style="width: 100%; display: flex; flex-direction: column;">
      <section class="context-header" style="margin-bottom: var(--space-4);">
        <h1>Settings</h1>
        <p>Configure your tracking preferences.</p>
      </section>
      <section class="primary-workspace" style="margin: 0 auto; max-width: 800px; width: 100%;">
        <form id="settings-form" class="card">
          <h2 class="card-title">Intelligent Matching Engine</h2>
          
          <div class="form-group">
            <label>Role Keywords (comma separated)</label>
            <input type="text" id="pref-roles" value="${prefs.roleKeywords}" placeholder="e.g. SDE, Product Manager, Intern">
          </div>
          
          <div class="form-group">
            <label>Preferred Locations (multi-select)</label>
            <select id="pref-locations" multiple style="height: 120px; width: 100%; padding: var(--space-2); border: var(--border-subtle); border-radius: var(--border-radius); font-family: var(--font-sans); font-size: 1rem; background-color: var(--color-bg); outline: none;">
              ${['Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Gurugram', 'Noida', 'Mumbai'].map(loc => `<option value="${loc}" ${isLocSelected(loc)}>${loc}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label>Preferred Mode</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="pref-mode" value="Remote" ${isModeChecked('Remote')}> Remote</label>
              <label><input type="checkbox" name="pref-mode" value="Hybrid" ${isModeChecked('Hybrid')}> Hybrid</label>
              <label><input type="checkbox" name="pref-mode" value="Onsite" ${isModeChecked('Onsite')}> Onsite</label>
            </div>
          </div>
          
          <div class="form-group">
            <label>Experience Level</label>
            <select id="pref-exp" style="width: 100%; padding: var(--space-2); border: var(--border-subtle); border-radius: var(--border-radius); font-family: var(--font-sans); font-size: 1rem; background-color: var(--color-bg); outline: none;">
              <option value="">Any</option>
              <option value="Fresher" ${prefs.experienceLevel === 'Fresher' ? 'selected' : ''}>Fresher</option>
              <option value="0-1" ${prefs.experienceLevel === '0-1' ? 'selected' : ''}>0-1 Years</option>
              <option value="1-3" ${prefs.experienceLevel === '1-3' ? 'selected' : ''}>1-3 Years</option>
              <option value="3-5" ${prefs.experienceLevel === '3-5' ? 'selected' : ''}>3-5 Years</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Your Skills (comma separated)</label>
            <input type="text" id="pref-skills" value="${prefs.skills}" placeholder="e.g. Java, Python, React">
          </div>
          
          <div class="form-group" style="margin-bottom: var(--space-4);">
            <label>Minimum Match Score Threshold: <span id="threshold-val">${prefs.minMatchScore}</span>%</label>
            <input type="range" id="pref-threshold" min="0" max="100" value="${prefs.minMatchScore}" style="width: 100%; accent-color: var(--color-accent);">
          </div>
          
          <div>
            <button type="submit" class="btn btn-primary">Save Preferences</button>
            <span id="save-msg" style="margin-left: var(--space-2); color: var(--color-success); display: none;">Saved!</span>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderDashboard() {
  jobs = window.JOB_DATA || [];
  const prefs = getPrefs();
  const statuses = getJobStatuses();

  jobs.forEach(job => {
    job.matchScore = calculateMatchScore(job, prefs);
  });

  let filtered = jobs.filter(job => {
    if (filterState.showOnlyThreshold && prefs) {
      if ((job.matchScore || 0) < prefs.minMatchScore) return false;
    }
    
    if (filterState.keyword && !job.title.toLowerCase().includes(filterState.keyword.toLowerCase()) && !job.company.toLowerCase().includes(filterState.keyword.toLowerCase())) return false;
    if (filterState.location && job.location !== filterState.location) return false;
    if (filterState.mode && job.mode !== filterState.mode) return false;
    if (filterState.experience && job.experience !== filterState.experience) return false;
    if (filterState.source && job.source !== filterState.source) return false;
    
    // Status Filter (AND logic)
    const currentStatus = statuses[job.id] || 'Not Applied';
    if (filterState.status !== 'All' && currentStatus !== filterState.status) return false;

    return true;
  });

  if (filterState.sort === 'Match Score') {
    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  } else if (filterState.sort === 'Latest') {
    filtered.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  } else if (filterState.sort === 'Salary') {
    const extractSal = (str) => {
      if(str.includes('k')) return 1; 
      const m = str.match(/\d+/);
      return m ? parseInt(m[0]) * 100000 : 0;
    };
    filtered.sort((a, b) => extractSal(b.salaryRange) - extractSal(a.salaryRange));
  }

  const savedIds = getSavedJobIds();
  
  let gridContent = '';
  if (filtered.length === 0) {
    gridContent = `
      <section class="empty-state" style="margin: 0 auto; max-width: 800px; width: 100%;">
        <h3 style="font-family: var(--font-sans); font-weight: 500;">No roles match your criteria.</h3>
        <p>Adjust filters or lower threshold.</p>
      </section>
    `;
  } else {
    gridContent = `
      <div class="job-grid">
        ${filtered.map(job => renderJobCard(job, savedIds.includes(job.id))).join('')}
      </div>
    `;
  }

  const banner = !prefs ? `
    <div style="background: var(--color-warning); color: #FFF; padding: var(--space-2); text-align: center; border-radius: var(--border-radius); margin-bottom: var(--space-3); font-weight: 500;">
      Set your preferences to activate intelligent matching. <a href="/settings" data-link style="color: #FFF; text-decoration: underline;">Go to Settings</a>
    </div>
  ` : '';

  return `
    <div style="width: 100%; display: flex; flex-direction: column;">
      <section class="context-header" style="margin-bottom: var(--space-4); padding-bottom: 0;">
        <h1>Dashboard</h1>
        <p>Your active tracking overview.</p>
      </section>
      <section class="primary-workspace" style="margin: 0 auto; max-width: 1000px; width: 100%;">
        ${banner}
        ${renderFilterBar()}
        ${prefs ? `
          <label class="threshold-toggle">
            <input type="checkbox" id="toggle-threshold" ${filterState.showOnlyThreshold ? 'checked' : ''}>
            Show only jobs above my threshold (${prefs.minMatchScore}%)
          </label>
        ` : ''}
        ${gridContent}
      </section>
    </div>
  `;
}

function renderSaved() {
  jobs = window.JOB_DATA || [];
  const prefs = getPrefs();
  jobs.forEach(job => { job.matchScore = calculateMatchScore(job, prefs); });

  const savedIds = getSavedJobIds();
  const savedJobs = jobs.filter(j => savedIds.includes(j.id));

  let content = '';
  if (savedJobs.length === 0) {
    content = `
      <section class="empty-state" style="margin: 0 auto; max-width: 800px; width: 100%;">
        <h3 style="font-family: var(--font-sans); font-weight: 500;">No saved jobs.</h3>
        <p>Opportunities you save will appear here.</p>
      </section>
    `;
  } else {
    content = `
      <section class="primary-workspace" style="margin: 0 auto; max-width: 1000px; width: 100%;">
        <div class="job-grid">
          ${savedJobs.map(job => renderJobCard(job, true)).join('')}
        </div>
      </section>
    `;
  }

  return `
    <div style="width: 100%; display: flex; flex-direction: column;">
      <section class="context-header" style="margin-bottom: var(--space-4);">
        <h1>Saved Opportunities</h1>
        <p>Review the roles you've shortlisted.</p>
      </section>
      ${content}
    </div>
  `;
}

function renderDigest() {
  const prefs = getPrefs();
  if (!prefs) {
    return `
      <div style="width: 100%; display: flex; flex-direction: column;">
        <section class="context-header" style="margin-bottom: var(--space-4);">
          <h1>Daily Digest</h1>
          <p>Your precision-matched job delivery.</p>
        </section>
        <section class="empty-state" style="margin: 0 auto; max-width: 800px; width: 100%;">
          <h3 style="font-family: var(--font-sans); font-weight: 500;">Set preferences to generate a personalized digest.</h3>
        </section>
      </div>
    `;
  }

  const today = new Date().toISOString().split('T')[0];
  const digestKey = `jobTrackerDigest_${today}`;
  const storedDigest = JSON.parse(localStorage.getItem(digestKey));

  const renderHistory = () => {
    const history = getStatusHistory();
    if (history.length === 0) return '';
    
    const items = history.map(h => `
      <div class="update-item">
        <div>
          <div style="font-family: var(--font-sans); font-weight: 500; color: var(--color-text);">${h.jobTitle}</div>
          <div class="update-item__meta">${h.jobCompany}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.875rem; font-weight: 500;">${h.status}</div>
          <div class="update-item__meta">${h.date}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="digest-card" style="margin-top: var(--space-4); max-width: 720px; width: 100%;">
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: var(--space-3); border-bottom: 1px solid #EAE9E4; padding-bottom: var(--space-2);">Recent Status Updates</h3>
        <div class="updates-list">
          ${items}
        </div>
      </div>
    `;
  };

  if (storedDigest) {
    let digestHtml = '';
    if (storedDigest.length === 0) {
      digestHtml = `
        <div style="text-align: center; padding: var(--space-4);">
          <h3 style="font-family: var(--font-sans); font-weight: 500; color: #555;">No matching roles today. Check again tomorrow.</h3>
        </div>
      `;
    } else {
      digestHtml = storedDigest.map(job => `
        <div class="digest-job">
          <div class="digest-job__info">
            <h4>${job.title}</h4>
            <div class="digest-job__details">${job.company} &bull; ${job.location} &bull; ${job.experience}</div>
            <div class="digest-job__details" style="color: var(--color-accent); font-weight: 500; margin-top: 4px;">Match: ${job.matchScore}%</div>
          </div>
          <a href="${job.applyUrl}" target="_blank" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.875rem;">Apply</a>
        </div>
      `).join('');
    }

    return `
      <div style="width: 100%; display: flex; flex-direction: column;">
        <div class="digest-actions">
          <button class="btn btn-secondary" id="btn-copy-digest">Copy Digest to Clipboard</button>
          <button class="btn btn-secondary" id="btn-email-digest">Create Email Draft</button>
        </div>
        <div class="digest-card">
          <div class="digest-header">
            <h2>Top 10 Jobs For You — 9AM Digest</h2>
            <p>${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          ${digestHtml}
          <div class="digest-footer">
            This digest was generated based on your preferences.
          </div>
        </div>
        ${renderHistory()}
      </div>
    `;
  }

  // Not generated yet
  return `
    <div style="width: 100%; display: flex; flex-direction: column;">
      <section class="context-header" style="margin-bottom: var(--space-4);">
        <h1>Daily Digest</h1>
        <p>Your precision-matched job delivery.</p>
      </section>
      <section class="empty-state" style="margin: 0 auto; max-width: 800px; width: 100%;">
        <h3 style="font-family: var(--font-sans); font-weight: 500;">Digest not generated for today.</h3>
        <p style="margin-bottom: var(--space-3); color: #777;">Demo Mode: Daily 9AM trigger simulated manually.</p>
        <button class="btn btn-primary" id="btn-generate-digest">Generate Today's 9AM Digest (Simulated)</button>
      </section>
      ${renderHistory()}
    </div>
  `;
}

function renderProof() {
  return `
    <div style="width: 100%; display: flex; flex-direction: column;">
      <section class="placeholder-page">
        <h1 class="placeholder-title">Proof</h1>
        <p class="placeholder-subtext">Artifact collection and verification steps go here.</p>
      </section>
    </div>
  `;
}

function renderTestChecklist() {
  const currentStatus = getTestStatus();
  const checkedCount = TEST_ITEMS.filter(item => currentStatus[item.id]).length;
  
  const checklistHtml = TEST_ITEMS.map(item => `
    <label class="test-item-row">
      <input type="checkbox" class="test-checkbox" data-id="${item.id}" ${currentStatus[item.id] ? 'checked' : ''}>
      <div class="test-item-content">
        <span class="test-item-label">${item.label}</span>
        <div class="test-tooltip">${item.desc}</div>
      </div>
    </label>
  `).join('');

  return `
    <div style="width: 100%; display: flex; flex-direction: column;">
      <section class="context-header" style="margin-bottom: var(--space-4);">
        <h1>Test Checklist</h1>
        <p>Verify all functionality before shipping.</p>
      </section>
      
      <section class="primary-workspace" style="margin: 0 auto; max-width: 600px; width: 100%;">
        <div class="test-summary">
          <h3>Tests Passed: <span id="test-count">${checkedCount}</span> / 10</h3>
          ${checkedCount < 10 ? '<div class="test-warning">Resolve all issues before shipping.</div>' : '<div style="color: var(--color-success); font-weight: 500;">All tests passed! Ready to ship.</div>'}
        </div>
        
        <div class="card">
          <div class="test-checklist">
            ${checklistHtml}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: var(--space-4);">
          <button class="btn btn-secondary" id="btn-reset-tests" style="font-size: 0.875rem;">Reset Test Status</button>
        </div>
      </section>
    </div>
  `;
}

function renderShipPage() {
  const currentStatus = getTestStatus();
  const checkedCount = TEST_ITEMS.filter(item => currentStatus[item.id]).length;

  if (checkedCount < 10) {
    return `
      <div style="width: 100%; display: flex; flex-direction: column;">
        <section class="context-header" style="margin-bottom: var(--space-4);">
          <h1>Ship Application</h1>
          <p>Production Deployment</p>
        </section>
        <section class="primary-workspace" style="margin: 0 auto; max-width: 600px; width: 100%;">
          <div class="ship-lock-container">
            <div class="ship-icon">🔒</div>
            <h2 style="font-family: var(--font-sans); color: var(--color-accent); margin-bottom: var(--space-2);">Complete all tests before shipping.</h2>
            <p style="color: #555; margin-bottom: var(--space-4);">You have passed ${checkedCount} out of 10 tests. Access to deployment is blocked.</p>
            <a href="/jt/07-test" class="btn btn-primary" data-link>Go to Checklist</a>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div style="width: 100%; display: flex; flex-direction: column;">
      <section class="context-header" style="margin-bottom: var(--space-4);">
        <h1>Ship Application</h1>
        <p>Production Deployment</p>
      </section>
      <section class="primary-workspace" style="margin: 0 auto; max-width: 600px; width: 100%;">
        <div class="ship-lock-container" style="border-color: var(--color-success);">
          <div class="ship-icon">🚀</div>
          <h2 style="font-family: var(--font-sans); color: var(--color-success); margin-bottom: var(--space-2);">Ready for Launch!</h2>
          <p style="color: #555; margin-bottom: var(--space-4);">All 10 functionality tests have passed successfully. The Job Notification Tracker is ready for production.</p>
          <button class="btn btn-primary" style="background-color: var(--color-success);">Deploy Application</button>
        </div>
      </section>
    </div>
  `;
}

const routes = {
  '/': renderLanding,
  '/dashboard': renderDashboard,
  '/settings': renderSettings,
  '/saved': renderSaved,
  '/digest': renderDigest,
  '/proof': renderProof,
  '/jt/07-test': renderTestChecklist,
  '/jt/08-ship': renderShipPage
};

// --- Handle navigation ---
const navigateTo = url => {
  history.pushState(null, null, url);
  router();
};

const router = async () => {
  const path = location.pathname;
  
  let renderer = routes[path];
  if (!renderer && (path.endsWith('index.html') || path === '/')) {
    renderer = routes['/'];
  }

  const activePath = (!routes[path] && (path.endsWith('index.html') || path === '/')) ? '/' : path;

  document.querySelectorAll('.nav-link').forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === activePath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (renderer) {
    appRoot.innerHTML = renderer();
    attachDynamicListeners(path);
  } else {
    appRoot.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column;">
        <section class="placeholder-page error-page">
          <h1 class="placeholder-title">Page Not Found</h1>
          <p class="placeholder-subtext">The page you are looking for does not exist.</p>
        </section>
      </div>
    `;
  }

  const mobileNavPanel = document.querySelector('.mobile-nav-panel');
  if (mobileNavPanel && mobileNavPanel.classList.contains('open')) {
    mobileNavPanel.classList.remove('open');
  }
};

function attachDynamicListeners(path) {
  if (path === '/settings' || (path === '/' && false)) { 
    const form = document.getElementById('settings-form');
    const range = document.getElementById('pref-threshold');
    const rangeVal = document.getElementById('threshold-val');

    if (range && rangeVal) {
      range.addEventListener('input', (e) => {
        rangeVal.textContent = e.target.value;
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const locationsSelect = document.getElementById('pref-locations');
        const selectedLocs = Array.from(locationsSelect.selectedOptions).map(opt => opt.value);
        
        const modeCheckboxes = document.querySelectorAll('input[name="pref-mode"]:checked');
        const selectedModes = Array.from(modeCheckboxes).map(cb => cb.value);

        const prefs = {
          roleKeywords: document.getElementById('pref-roles').value,
          preferredLocations: selectedLocs,
          preferredMode: selectedModes,
          experienceLevel: document.getElementById('pref-exp').value,
          skills: document.getElementById('pref-skills').value,
          minMatchScore: parseInt(document.getElementById('pref-threshold').value)
        };
        
        setPrefs(prefs);
        const msg = document.getElementById('save-msg');
        msg.style.display = 'inline';
        setTimeout(() => msg.style.display = 'none', 2000);
      });
    }
  }

  if (path === '/dashboard' || path.endsWith('index.html')) {
    const filterKeyword = document.getElementById('filter-keyword');
    const filterLocation = document.getElementById('filter-location');
    const filterMode = document.getElementById('filter-mode');
    const filterExp = document.getElementById('filter-exp');
    const filterSource = document.getElementById('filter-source');
    const filterStatus = document.getElementById('filter-status');
    const filterSort = document.getElementById('filter-sort');
    const toggleThreshold = document.getElementById('toggle-threshold');

    const updateFilters = () => {
      if(filterKeyword) filterState.keyword = filterKeyword.value;
      if(filterLocation) filterState.location = filterLocation.value;
      if(filterMode) filterState.mode = filterMode.value;
      if(filterExp) filterState.experience = filterExp.value;
      if(filterSource) filterState.source = filterSource.value;
      if(filterStatus) filterState.status = filterStatus.value;
      if(filterSort) filterState.sort = filterSort.value;
      if(toggleThreshold) filterState.showOnlyThreshold = toggleThreshold.checked;
      
      appRoot.innerHTML = renderDashboard();
      attachDynamicListeners('/dashboard');
    };

    if(filterKeyword) filterKeyword.addEventListener('input', updateFilters);
    if(filterLocation) filterLocation.addEventListener('change', updateFilters);
    if(filterMode) filterMode.addEventListener('change', updateFilters);
    if(filterExp) filterExp.addEventListener('change', updateFilters);
    if(filterSource) filterSource.addEventListener('change', updateFilters);
    if(filterStatus) filterStatus.addEventListener('change', updateFilters);
    if(filterSort) filterSort.addEventListener('change', updateFilters);
    if(toggleThreshold) toggleThreshold.addEventListener('change', updateFilters);
  }

  if (path === '/digest') {
    const btnGen = document.getElementById('btn-generate-digest');
    if (btnGen) {
      btnGen.addEventListener('click', () => {
        jobs = window.JOB_DATA || [];
        const prefs = getPrefs();
        if(!prefs) return;
        
        jobs.forEach(job => { job.matchScore = calculateMatchScore(job, prefs); });
        
        const matches = jobs.filter(j => j.matchScore >= prefs.minMatchScore);
        
        matches.sort((a, b) => {
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          return a.postedDaysAgo - b.postedDaysAgo;
        });

        const top10 = matches.slice(0, 10);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`jobTrackerDigest_${today}`, JSON.stringify(top10));
        
        appRoot.innerHTML = renderDigest();
        attachDynamicListeners('/digest');
      });
    }

    const btnCopy = document.getElementById('btn-copy-digest');
    const btnEmail = document.getElementById('btn-email-digest');

    const getPlainTextDigest = () => {
      const today = new Date().toISOString().split('T')[0];
      const storedDigest = JSON.parse(localStorage.getItem(`jobTrackerDigest_${today}`) || '[]');
      let text = `Top 10 Jobs For You — 9AM Digest\n${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
      storedDigest.forEach((job, index) => {
        text += `${index + 1}. ${job.title} at ${job.company}\n`;
        text += `Location: ${job.location} | Match: ${job.matchScore}%\n`;
        text += `Apply: ${job.applyUrl}\n\n`;
      });
      return text;
    };

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const text = getPlainTextDigest();
        navigator.clipboard.writeText(text).then(() => {
          btnCopy.textContent = "Copied!";
          setTimeout(() => { if (btnCopy) btnCopy.textContent = "Copy Digest to Clipboard"; }, 2000);
        });
      });
    }

    if (btnEmail) {
      btnEmail.addEventListener('click', () => {
        const text = getPlainTextDigest();
        const mailto = `mailto:?subject=${encodeURIComponent("My 9AM Job Digest")}&body=${encodeURIComponent(text)}`;
        window.location.href = mailto;
      });
    }
  }

  if (path === '/jt/07-test') {
    const checkboxes = document.querySelectorAll('.test-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const checked = e.target.checked;
        const status = getTestStatus();
        status[id] = checked;
        setTestStatus(status);
        
        // Live re-render
        appRoot.innerHTML = renderTestChecklist();
        attachDynamicListeners('/jt/07-test');
      });
    });

    const resetBtn = document.getElementById('btn-reset-tests');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        setTestStatus({});
        appRoot.innerHTML = renderTestChecklist();
        attachDynamicListeners('/jt/07-test');
      });
    }
  }
}

// --- Modal logic ---
function createModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close">&times;</button>
      <div class="modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.modal-close').addEventListener('click', () => {
    modal.classList.remove('active');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  return modal;
}
let activeModal = null;

function openJobModal(jobId) {
  if (!activeModal) activeModal = createModal();
  
  jobs = window.JOB_DATA || [];
  const job = jobs.find(j => j.id === jobId);
  if(!job) return;

  const body = activeModal.querySelector('.modal-body');
  body.innerHTML = `
    <h2>${job.title}</h2>
    <div class="company">${job.company} &bull; ${job.location} &bull; ${job.mode}</div>
    <div style="margin-bottom: var(--space-2); color: #555; font-size: 0.875rem;">
      Experience: ${job.experience} | Salary: ${job.salaryRange} | Source: ${job.source}
    </div>
    <div class="skills-list">
      ${job.skills.map(s => `<span class="badge badge-mini">${s}</span>`).join('')}
    </div>
    <div class="description">${job.description}</div>
    <div style="margin-top: var(--space-4);">
      <a href="${job.applyUrl}" target="_blank" class="btn btn-primary">Apply Now</a>
    </div>
  `;
  
  activeModal.classList.add('active');
}

// --- Event Delegation ---
window.addEventListener('popstate', router);

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', e => {
    // Navigation
    if (e.target.matches('[data-link]')) {
      e.preventDefault();
      navigateTo(e.target.getAttribute('href'));
      return;
    }

    // Job Actions
    if (e.target.classList.contains('btn-save')) {
      const id = e.target.getAttribute('data-id');
      const saved = getSavedJobIds();
      if (saved.includes(id)) {
        removeJobId(id);
        e.target.textContent = 'Save';
        if(location.pathname === '/saved') {
          appRoot.innerHTML = renderSaved();
        }
      } else {
        saveJobId(id);
        e.target.textContent = 'Saved';
      }
      return;
    }

    if (e.target.classList.contains('btn-view')) {
      const id = e.target.getAttribute('data-id');
      openJobModal(id);
      return;
    }

    if (e.target.classList.contains('btn-apply')) {
      const url = e.target.getAttribute('data-url');
      window.open(url, '_blank');
      return;
    }
  });

  document.body.addEventListener('change', e => {
    if (e.target.classList.contains('job-status-select')) {
      const id = e.target.getAttribute('data-id');
      const status = e.target.value;
      
      // Update styling
      e.target.className = `job-status-select badge status-${status.toLowerCase().replace(' ', '-')}`;
      
      // Get Job details for history
      jobs = window.JOB_DATA || [];
      const job = jobs.find(j => j.id === id);
      const title = job ? job.title : 'Unknown Role';
      const company = job ? job.company : 'Unknown Company';

      setJobStatus(id, status, title, company);
      
      if (status !== 'Not Applied') {
        showToast(`Status updated: ${status}`);
      }

      // If we are currently filtering by a specific status, re-render to remove it from view instantly
      if (location.pathname === '/dashboard' && filterState.status !== 'All' && filterState.status !== status) {
        appRoot.innerHTML = renderDashboard();
        attachDynamicListeners('/dashboard');
      }
    }
  });

  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const mobileNavPanel = document.querySelector('.mobile-nav-panel');
  if (toggleBtn && mobileNavPanel) {
    toggleBtn.addEventListener('click', () => {
      mobileNavPanel.classList.toggle('open');
    });
  }

  router();
});
