// Global state
let teamMembers = [];
let roadmapItems = [];
let optimizationResults = null;

// API helpers
const API = {
    async get(endpoint) {
        try {
            const response = await fetch(`/api${endpoint}`);
            
            // Check if response is HTML (authentication page)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                // This is likely a Vercel authentication page
                throw new Error('Authentication required - please disable deployment protection in Vercel dashboard');
            }
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        } catch (error) {
            // Handle network errors or JSON parsing errors
            if (error.message.includes('Authentication required')) {
                throw error;
            }
            throw new Error(`Failed to connect to server: ${error.message}`);
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(`/api${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            // Check if response is HTML (authentication page)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('Authentication required - please disable deployment protection in Vercel dashboard');
            }
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            if (error.message.includes('Authentication required')) {
                throw error;
            }
            throw new Error(`Failed to connect to server: ${error.message}`);
        }
    },

    async delete(endpoint) {
        try {
            const response = await fetch(`/api${endpoint}`, { method: 'DELETE' });
            
            // Check if response is HTML (authentication page)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('Authentication required - please disable deployment protection in Vercel dashboard');
            }
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            if (error.message.includes('Authentication required')) {
                throw error;
            }
            throw new Error(`Failed to connect to server: ${error.message}`);
        }
    }
};

// Utility functions
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showError(message) {
    alert(`❌ Error: ${message}`);
}

function showSuccess(message) {
    alert(`✅ ${message}`);
}

function showOptimizationOverlay() {
    if (!optimizationResults) return;
    
    const overlay = document.getElementById('optimization-overlay');
    const content = document.getElementById('overlay-results-content');
    const { summary, recommendations, itemsByStatus } = optimizationResults;
    
    // Get counts for different item statuses
    const unstaffedCount = itemsByStatus ? itemsByStatus['not-staffed']?.length || 0 : 0;
    const underStaffedCount = itemsByStatus ? itemsByStatus['under-staffed']?.length || 0 : 0;
    const fullyStaffedCount = itemsByStatus ? itemsByStatus['fully-staffed']?.length || 0 : 0;
    
    content.innerHTML = `
        <div class="results-summary-overlay">
            <div class="summary-stat-overlay">
                <div class="number">${summary.totalAssignments}</div>
                <div class="label">Assignments</div>
            </div>
            <div class="summary-stat-overlay">
                <div class="number">${fullyStaffedCount}</div>
                <div class="label">Fully Staffed</div>
            </div>
            <div class="summary-stat-overlay">
                <div class="number">${Math.round((summary.totalAllocatedCapacity / summary.totalTeamCapacity) * 100)}%</div>
                <div class="label">Utilization</div>
            </div>
            <div class="summary-stat-overlay">
                <div class="number">${unstaffedCount}</div>
                <div class="label">Unstaffed Items</div>
            </div>
        </div>
        
        <div class="optimization-highlights">
            <h3>📋 Key Results</h3>
            <ul>
                ${recommendations.slice(0, 3).map(rec => `<li>${rec}</li>`).join('')}
                ${recommendations.length > 3 ? `<li><em>+${recommendations.length - 3} more insights...</em></li>` : ''}
            </ul>
        </div>
    `;
    
    overlay.style.display = 'flex';
}

function closeOptimizationOverlay() {
    document.getElementById('optimization-overlay').style.display = 'none';
}

function parseCommaSeparated(str) {
    return str ? str.split(',').map(s => s.trim()).filter(s => s) : [];
}

// Team color utility
function getTeamColor(teamName) {
    if (!teamName) return '#4c9aff';
    
    const colors = [
        '#4c9aff', // Blue
        '#00c851', // Green  
        '#ff4444', // Red
        '#ffbb33', // Orange
        '#aa66cc', // Purple
        '#00c0ef', // Cyan
        '#ff851b', // Bright Orange
        '#2ecc71', // Emerald
        '#e74c3c', // Crimson
        '#9b59b6', // Amethyst
        '#1abc9c', // Turquoise
        '#f39c12'  // Yellow-Orange
    ];
    
    // Create a simple hash from team name
    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
        hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// View toggle functionality
function toggleTeamView(view) {
    const cardsContainer = document.getElementById('team-members-cards');
    const tableContainer = document.getElementById('team-members-table');
    const cardBtn = document.querySelector('[data-view="cards"]');
    const tableBtn = document.querySelector('[data-view="table"]');
    
    if (view === 'cards') {
        cardsContainer.style.display = 'block';
        tableContainer.style.display = 'none';
        cardBtn.classList.add('active');
        tableBtn.classList.remove('active');
    } else {
        cardsContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        cardBtn.classList.remove('active');
        tableBtn.classList.add('active');
    }
}

function toggleRoadmapView(view) {
    const cardsContainer = document.getElementById('roadmap-items-cards');
    const tableContainer = document.getElementById('roadmap-items-table');
    const cardBtns = document.querySelectorAll('#roadmap-items .view-btn[data-view="cards"]');
    const tableBtns = document.querySelectorAll('#roadmap-items .view-btn[data-view="table"]');
    
    if (view === 'cards') {
        cardsContainer.style.display = 'block';
        tableContainer.style.display = 'none';
        cardBtns.forEach(btn => btn.classList.add('active'));
        tableBtns.forEach(btn => btn.classList.remove('active'));
    } else {
        cardsContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        cardBtns.forEach(btn => btn.classList.remove('active'));
        tableBtns.forEach(btn => btn.classList.add('active'));
    }
}

// Tab functionality
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Load data for the active tab
            if (tabId === 'team-members') loadTeamMembers();
            if (tabId === 'roadmap-items') loadRoadmapItems();
            if (tabId === 'dashboard') updateDashboard();
        });
    });
}

// Dashboard functions
async function updateDashboard() {
    try {
        await Promise.all([loadTeamMembers(), loadRoadmapItems()]);
        
        document.getElementById('total-members').textContent = teamMembers.length;
        document.getElementById('total-items').textContent = roadmapItems.length;
        
        // Calculate unique teams
        const uniqueTeams = new Set(teamMembers.filter(member => member.teamName).map(member => member.teamName));
        document.getElementById('total-teams').textContent = uniqueTeams.size;
        
        const totalCapacity = teamMembers.reduce((sum, member) => sum + (member.capacity || 0), 0);
        document.getElementById('total-capacity').textContent = `${totalCapacity.toFixed(1)} FTE`;
        
        const statusElement = document.getElementById('optimization-status');
        if (optimizationResults) {
            statusElement.textContent = 'Complete';
            statusElement.style.color = '#28a745';
        } else {
            statusElement.textContent = 'Not Run';
            statusElement.style.color = '#6c757d';
        }
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Team Members functions
async function loadTeamMembers() {
    try {
        teamMembers = await API.get('/team-members');
        console.log(`Loaded ${teamMembers.length} team members`);
        renderTeamMembers();
    } catch (error) {
        console.error('Failed to load team members:', error);
        // Set empty array and render to show placeholder message
        teamMembers = [];
        renderTeamMembers();
        
        // Only show error alert if there are no members at all and it's not the initial load
        if (document.querySelector('.tab-btn[data-tab="team-members"]').classList.contains('active')) {
            showError('Failed to load team members from server');
        }
    }
}

function renderTeamMembers() {
    renderTeamMemberCards();
    renderTeamMemberTable();
}

function renderTeamMemberCards() {
    const container = document.getElementById('team-members-cards');
    
    if (teamMembers.length === 0) {
        container.innerHTML = '<p class="placeholder">No team members added yet. Click "Add Member" to get started!</p>';
        return;
    }

    container.innerHTML = teamMembers.map(member => {
        const teamColor = getTeamColor(member.teamName);
        return `
            <div class="member-card" style="border-left: 4px solid ${teamColor}">
                <div class="member-header">
                    <div class="member-name">
                        <h4>${member.name}</h4>
                        ${member.teamName ? `<span class="team-badge" style="background-color: ${teamColor}">${member.teamName}</span>` : ''}
                    </div>
                    <button class="delete-btn" onclick="deleteTeamMember('${member.id}')" title="Delete member">×</button>
                </div>
                <div class="member-info">
                    <span class="member-level">${member.level}</span>
                    ${member.location ? `<span class="member-location">📍 ${member.location}</span>` : ''}
                    <span class="member-capacity">${member.capacity || 1.0} FTE</span>
                </div>
                ${member.careerGoals.length > 0 ? `
                    <div class="member-goals">
                        <strong>Goals:</strong> ${member.careerGoals.join(', ')}
                    </div>
                ` : ''}
                ${member.notes ? `
                    <div class="member-notes">
                        ${member.notes}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderTeamMemberTable() {
    const tbody = document.getElementById('team-members-table-body');
    
    if (teamMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No team members added yet</td></tr>';
        return;
    }

    tbody.innerHTML = teamMembers.map(member => `
        <tr>
            <td><strong>${member.name}</strong></td>
            <td><span class="team-cell" style="background-color: ${getTeamColor(member.teamName)}">${member.teamName || 'Unassigned'}</span></td>
            <td>${member.level}</td>
            <td>${member.location || 'N/A'}</td>
            <td class="skills-cell">${member.skills ? member.skills.join(', ') : 'N/A'}</td>
            <td class="capacity-cell">${member.capacity || 1.0} FTE</td>
            <td class="interests-cell">${member.interests ? member.interests.join(', ') : 'N/A'}</td>
            <td class="goals-cell">${member.careerGoals ? member.careerGoals.join(', ') : 'N/A'}</td>
            <td class="actions-cell">
                <button class="table-delete-btn" onclick="deleteTeamMember('${member.id}')" title="Delete member">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function addTeamMember(formData) {
    try {
        showLoading();
        const newMember = await API.post('/team-members', formData);
        teamMembers.push(newMember);
        renderTeamMembers();
        updateDashboard();
        showSuccess(`Added ${newMember.name} to the team!`);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function deleteTeamMember(id) {
    if (!confirm('Are you sure you want to delete this team member?')) return;
    
    try {
        await API.delete(`/team-members/${id}`);
        teamMembers = teamMembers.filter(member => member.id !== id);
        renderTeamMembers();
        updateDashboard();
        showSuccess('Team member deleted successfully');
    } catch (error) {
        showError(error.message);
    }
}

// Roadmap Items functions
async function loadRoadmapItems() {
    try {
        roadmapItems = await API.get('/roadmap-items');
        console.log(`Loaded ${roadmapItems.length} roadmap items`);
        renderRoadmapItems();
    } catch (error) {
        console.error('Failed to load roadmap items:', error);
        // Set empty array and render to show placeholder message
        roadmapItems = [];
        renderRoadmapItems();
        
        // Only show error alert if there are no items at all and it's not the initial load
        if (document.querySelector('.tab-btn[data-tab="roadmap-items"]').classList.contains('active')) {
            showError('Failed to load roadmap items from server');
        }
    }
}

function renderRoadmapItems() {
    renderRoadmapItemCards();
    renderRoadmapItemTable();
}

function renderRoadmapItemCards() {
    const container = document.getElementById('roadmap-items-cards');
    
    if (roadmapItems.length === 0) {
        container.innerHTML = '<p class="placeholder">No roadmap items added yet. Click "Add Item" to get started!</p>';
        return;
    }

    container.innerHTML = roadmapItems.map(item => `
        <div class="card roadmap-card compact">
            <div class="roadmap-header">
                <h3>
                    ${item.name}
                    <button class="delete-btn" onclick="deleteRoadmapItem('${item.id}')" title="Delete item">×</button>
                </h3>
                ${item.assignedTeam ? `
                    <span class="team-badge compact" style="background-color: ${getTeamColor(item.assignedTeam)}">${item.assignedTeam}</span>
                ` : ''}
            </div>
            ${item.description ? `<p class="compact-description">${item.description}</p>` : ''}
            
            ${item.effortBreakdown ? `
                <div class="effort-breakdown compact">
                    <div class="effort-grid compact">
                        ${item.effortBreakdown.ios > 0 ? `
                            <div class="effort-item compact">
                                <span class="effort-platform">📱 ${item.effortBreakdown.ios}w</span>
                            </div>
                        ` : ''}
                        ${item.effortBreakdown.android > 0 ? `
                            <div class="effort-item compact">
                                <span class="effort-platform">🤖 ${item.effortBreakdown.android}w</span>
                            </div>
                        ` : ''}
                        ${item.effortBreakdown.web > 0 ? `
                            <div class="effort-item compact">
                                <span class="effort-platform">🌐 ${item.effortBreakdown.web}w</span>
                            </div>
                        ` : ''}
                        ${item.effortBreakdown.backend > 0 ? `
                            <div class="effort-item compact">
                                <span class="effort-platform">⚙️ ${item.effortBreakdown.backend}w</span>
                            </div>
                        ` : ''}
                        <div class="effort-total compact">
                            <strong>Total: ${item.effortBreakdown.total}w</strong>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function renderRoadmapItemTable() {
    const tbody = document.getElementById('roadmap-items-table-body');
    
    if (roadmapItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No roadmap items added yet</td></tr>';
        return;
    }

    tbody.innerHTML = roadmapItems.map(item => `
        <tr>
            <td><strong>${item.name}</strong></td>
            <td><span class="team-cell" style="background-color: ${getTeamColor(item.assignedTeam)}">${item.assignedTeam || 'Unassigned'}</span></td>
            <td class="description-cell">${item.description || 'N/A'}</td>
            <td class="effort-cell">${item.effortBreakdown ? item.effortBreakdown.ios || 0 : 0}</td>
            <td class="effort-cell">${item.effortBreakdown ? item.effortBreakdown.android || 0 : 0}</td>
            <td class="effort-cell">${item.effortBreakdown ? item.effortBreakdown.web || 0 : 0}</td>
            <td class="effort-cell">${item.effortBreakdown ? item.effortBreakdown.backend || 0 : 0}</td>
            <td class="effort-cell"><strong>${item.effortBreakdown ? item.effortBreakdown.total || 0 : 0}</strong></td>
            <td class="actions-cell">
                <button class="table-delete-btn" onclick="deleteRoadmapItem('${item.id}')" title="Delete item">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function addRoadmapItem(formData) {
    try {
        showLoading();
        const newItem = await API.post('/roadmap-items', formData);
        roadmapItems.push(newItem);
        renderRoadmapItems();
        updateDashboard();
        showSuccess(`Added "${newItem.name}" to the roadmap!`);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function deleteRoadmapItem(id) {
    if (!confirm('Are you sure you want to delete this roadmap item?')) return;
    
    try {
        await API.delete(`/roadmap-items/${id}`);
        roadmapItems = roadmapItems.filter(item => item.id !== id);
        renderRoadmapItems();
        updateDashboard();
        showSuccess('Roadmap item deleted successfully');
    } catch (error) {
        showError(error.message);
    }
}

// Optimization functions
async function runOptimization() {
    try {
        showLoading();
        optimizationResults = await API.post('/optimize', {});
        renderOptimizationResults();
        updateDashboard();
        
        // Switch to optimization tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector('[data-tab="optimization"]').classList.add('active');
        document.getElementById('optimization').classList.add('active');
        
        showOptimizationOverlay();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function renderOptimizationResults() {
    const container = document.getElementById('optimization-results');
    
    if (!optimizationResults) {
        container.innerHTML = '<p class="placeholder">Run people allocation to see quarterly results here</p>';
        return;
    }

    const { summary, allocations, teamMembers: resultMembers, roadmapItems: resultItems, recommendations, itemsByStatus } = optimizationResults;

    // Get unstaffed and under-staffed items
    const unstaffedItems = itemsByStatus ? itemsByStatus['not-staffed'] || [] : [];
    const underStaffedItems = itemsByStatus ? itemsByStatus['under-staffed'] || [] : [];

    container.innerHTML = `
        ${recommendations.length > 0 ? `
            <div class="section-header">
                <h3>💡 Recommendations & Issues</h3>
            </div>
            <div class="card recommendations-card">
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        ${unstaffedItems.length > 0 ? `
            <div class="section-header" style="margin-top: 1.5rem;">
                <h3>❌ Unstaffed Items (${unstaffedItems.length})</h3>
            </div>
            <div class="unstaffed-items">
                ${unstaffedItems.map(item => `
                    <div class="unstaffed-item-card">
                        <div class="item-header">
                            <h4>📋 ${item.name}</h4>
                            ${item.team ? `<span class="team-badge" style="background-color: ${getTeamColor(item.team)}">${item.team}</span>` : ''}
                        </div>
                        <div class="item-details">
                            ${item.effortBreakdown ? `
                                <div class="effort-summary">
                                    <div class="platform-requirements">
                                        ${item.effortBreakdown.ios > 0 ? `<span class="platform-req">📱 iOS: ${item.effortBreakdown.ios}w</span>` : ''}
                                        ${item.effortBreakdown.android > 0 ? `<span class="platform-req">🤖 Android: ${item.effortBreakdown.android}w</span>` : ''}
                                        ${item.effortBreakdown.web > 0 ? `<span class="platform-req">🌐 Web: ${item.effortBreakdown.web}w</span>` : ''}
                                        ${item.effortBreakdown.backend > 0 ? `<span class="platform-req">⚙️ Backend: ${item.effortBreakdown.backend}w</span>` : ''}
                                    </div>
                                    <div class="total-effort">Total: ${item.effortBreakdown.total} weeks</div>
                                </div>
                            ` : ''}
                            <div class="required-capacity">
                                <div class="capacity-breakdown">
                                    <span class="capacity-total">Required: ${item.requiredCapacity ? item.requiredCapacity.toFixed(2) : 'N/A'} FTE</span>
                                    ${item.effortBreakdown ? `
                                        <div class="fte-types">
                                            ${item.effortBreakdown.ios > 0 ? `<span class="fte-type ios">📱 iOS Dev: ${(item.effortBreakdown.ios / 12).toFixed(1)} FTE</span>` : ''}
                                            ${item.effortBreakdown.android > 0 ? `<span class="fte-type android">🤖 Android Dev: ${(item.effortBreakdown.android / 12).toFixed(1)} FTE</span>` : ''}
                                            ${item.effortBreakdown.web > 0 ? `<span class="fte-type web">🌐 Web Dev: ${(item.effortBreakdown.web / 12).toFixed(1)} FTE</span>` : ''}
                                            ${item.effortBreakdown.backend > 0 ? `<span class="fte-type backend">⚙️ Backend Dev: ${(item.effortBreakdown.backend / 12).toFixed(1)} FTE</span>` : ''}
                                        </div>
                                        <div class="missing-skills">
                                            <small style="color: #ff6b6b; font-weight: bold;">⚠️ Missing skills needed for this project</small>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${underStaffedItems.length > 0 ? `
            <div class="section-header" style="margin-top: 1.5rem;">
                <h3>⚠️ Under-staffed Items (${underStaffedItems.length})</h3>
            </div>
            <div class="under-staffed-items">
                ${underStaffedItems.map(item => `
                    <div class="under-staffed-item-card">
                        <div class="item-header">
                            <h4>📋 ${item.name}</h4>
                            ${item.team ? `<span class="team-badge" style="background-color: ${getTeamColor(item.team)}">${item.team}</span>` : ''}
                        </div>
                        <div class="allocation-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${item.requiredCapacity && item.totalAllocation ? (item.totalAllocation / item.requiredCapacity) * 100 : 0}%"></div>
                            </div>
                            <small>${item.totalAllocation ? item.totalAllocation.toFixed(2) : 0} / ${item.requiredCapacity ? item.requiredCapacity.toFixed(2) : 'N/A'} FTE (${item.requiredCapacity && item.totalAllocation ? Math.round((item.totalAllocation / item.requiredCapacity) * 100) : 0}%)</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="results-summary">
            <h3>📊 Allocation Summary</h3>
            <div class="results-grid">
                <div class="result-stat">
                    <div class="number">${summary.totalTeamCapacity.toFixed(1)}</div>
                    <div class="label">Total Capacity</div>
                </div>
                <div class="result-stat">
                    <div class="number">${summary.totalAllocatedCapacity.toFixed(1)}</div>
                    <div class="label">Allocated</div>
                </div>
                <div class="result-stat">
                    <div class="number">${summary.totalAssignments}</div>
                    <div class="label">Assignments</div>
                </div>
                <div class="result-stat">
                    <div class="number">${Math.round((summary.totalAllocatedCapacity / summary.totalTeamCapacity) * 100)}%</div>
                    <div class="label">Utilization</div>
                </div>
            </div>
        </div>

        <div class="section-header" style="margin-top: 2rem;">
            <h3>🎯 Assignments</h3>
        </div>
        
        <div class="assignments-grid">
            ${allocations.map(allocation => `
                <div class="assignment-card">
                    <div class="member-info">
                        <h4>👤 ${allocation.member}</h4>
                        <p>Allocation: ${Math.round(allocation.allocation * 100)}%</p>
                        <div class="allocation-bar">
                            <div class="allocation-fill" style="width: ${allocation.allocation * 100}%"></div>
                        </div>
                    </div>
                    <div class="project-info">
                        <h4>📋 ${allocation.item}</h4>
                        <p>Score: ${allocation.score.toFixed(1)}</p>
                        <small style="color: #6c757d;">Match quality: ${allocation.score > 70 ? 'Excellent' : allocation.score > 50 ? 'Good' : 'Fair'}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAddMemberModal() {
    document.getElementById('add-member-form').reset();
    showModal('add-member-modal');
}

function showAddItemModal() {
    document.getElementById('add-item-form').reset();
    showModal('add-item-modal');
}

async function showGoogleSheetsModal() {
    // Reset wizard to step 1
    goToSheetsStep(1);
    
    // Check authentication status
    try {
        const authStatus = await API.get('/sheets/auth-status');
        updateAuthUI(authStatus);
    } catch (error) {
        console.error('Failed to check auth status:', error);
    }
    
    showModal('google-sheets-modal');
}

function updateAuthUI(authStatus) {
    const container = document.getElementById('auth-notice-container');
    container.innerHTML = ''; // Clear previous content
    
    if (authStatus.serviceAccountAvailable) {
        // Service account is available - show success notice
        container.innerHTML = `
            <div class="auth-notice success">
                <h6>🔐 Service Account Authentication Active</h6>
                <p>Ready to import from Google Sheets! You can access both public and private sheets that are shared with the service account. Simply paste your sheet URL below.</p>
                <small><strong>Tip:</strong> Make sure your sheet is shared with the service account or is publicly accessible.</small>
            </div>
        `;
    } else {
        // No service account - show info notice
        container.innerHTML = `
            <div class="auth-notice info">
                <h6>ℹ️ Service Account Not Configured</h6>
                <p>Service account authentication is not set up. You'll need to make your Google Sheet publicly accessible for import to work.</p>
                <small><strong>Note:</strong> Contact your administrator to configure service account authentication for private sheet access.</small>
            </div>
        `;
    }
}

// Form handlers
function initializeForms() {
    // Team member form
    document.getElementById('add-member-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('member-name').value,
            level: document.getElementById('member-level').value,
            skills: parseCommaSeparated(document.getElementById('member-skills').value),
            capacity: parseFloat(document.getElementById('member-capacity').value),
            interests: parseCommaSeparated(document.getElementById('member-interests').value),
            careerGoals: parseCommaSeparated(document.getElementById('member-career-goals').value)
        };
        
        await addTeamMember(formData);
        closeModal('add-member-modal');
    });

    // Roadmap item form
    document.getElementById('add-item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('item-name').value,
            description: document.getElementById('item-description').value,
            size: parseInt(document.getElementById('item-size').value),
            complexity: parseInt(document.getElementById('item-complexity').value),
            requiredSkills: parseCommaSeparated(document.getElementById('item-skills').value),
            domain: document.getElementById('item-domain').value,
            minLevel: document.getElementById('item-min-level').value,
            careerOpportunities: parseCommaSeparated(document.getElementById('item-career-opportunities').value)
        };
        
        await addRoadmapItem(formData);
        closeModal('add-item-modal');
    });
}

// Modal close on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Google Sheets Integration Functions
let selectedSheet = null;

function goToSheetsStep(step) {
    // Hide all steps
    document.querySelectorAll('.sheets-step').forEach(s => s.classList.remove('active'));
    
    // Show selected step
    document.getElementById(`sheets-step-${step}`).classList.add('active');
}

// Connection method switching
function switchConnectionMethod(method) {
    // Update tabs
    document.querySelectorAll('.connection-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.method === method);
    });
    
    // Update content
    document.querySelectorAll('.connection-method').forEach(content => {
        content.classList.toggle('active', content.id === `${method}-method`);
    });
    
    // Reset selection and validation button
    selectedSheet = null;
    updateValidationButton();
    
    // If switching to URL method, add listener to URL input
    if (method === 'url') {
        const urlInput = document.getElementById('sheets-url');
        urlInput.addEventListener('input', () => {
            updateValidationButton();
        });
    }
}

function updateValidationButton() {
    const validateBtn = document.getElementById('validate-btn');
    const activeMethod = document.querySelector('.connection-method.active').id;
    
    let isValid = false;
    
    if (activeMethod === 'browse-method') {
        isValid = selectedSheet !== null;
    } else if (activeMethod === 'url-method') {
        const url = document.getElementById('sheets-url').value.trim();
        isValid = url.length > 0;
    }
    
    validateBtn.disabled = !isValid;
    validateBtn.textContent = isValid ? 'Validate & Preview' : 'Select a sheet first';
}

// Load available sheets
async function loadAvailableSheets() {
    const container = document.getElementById('sheets-list');
    
    try {
        container.innerHTML = '<div class="sheets-loading">🔄 Loading your Google Sheets...</div>';
        
        const response = await API.get('/sheets/list');
        displaySheetsList(response.sheets, 'Your Recent Sheets');
        
    } catch (error) {
        container.innerHTML = `<div class="sheets-error">❌ ${error.message}</div>`;
    }
}

// Load sheets from team folder
async function loadSheetsFromFolder() {
    const container = document.getElementById('sheets-list');
    
    try {
        container.innerHTML = '<div class="sheets-loading">🔄 Loading sheets from team folder...</div>';
        
        // Use the DRIVE_FOLDER_ID environment variable
        const response = await fetch('/api/env');
        const env = await response.json();
        
        if (!env.driveFolderId || env.driveFolderId === 'Not set') {
            throw new Error('Team folder not configured');
        }
        
        const sheetsResponse = await API.get(`/sheets/folder/${env.driveFolderId}`);
        displaySheetsList(sheetsResponse.sheets, 'Team Folder Sheets');
        
    } catch (error) {
        container.innerHTML = `<div class="sheets-error">❌ ${error.message}</div>`;
    }
}

// Search sheets
async function searchSheets(event) {
    // If called from keyup event, only proceed on Enter
    if (event && event.type === 'keyup' && event.key !== 'Enter') {
        return;
    }
    
    const searchTerm = document.getElementById('sheet-search').value.trim();
    const container = document.getElementById('sheets-list');
    
    if (searchTerm.length < 2) {
        container.innerHTML = '<p class="placeholder">Enter at least 2 characters to search</p>';
        return;
    }
    
    try {
        container.innerHTML = '<div class="sheets-loading">🔍 Searching...</div>';
        
        const response = await API.post('/sheets/search', { searchTerm });
        displaySheetsList(response.sheets, `Search Results for "${searchTerm}"`);
        
    } catch (error) {
        container.innerHTML = `<div class="sheets-error">❌ ${error.message}</div>`;
    }
}

// Display sheets list
function displaySheetsList(sheets, title) {
    const container = document.getElementById('sheets-list');
    
    if (sheets.length === 0) {
        container.innerHTML = `<p class="placeholder">No sheets found. Try a different search or check your permissions.</p>`;
        return;
    }
    
    const sheetsHtml = sheets.map(sheet => {
        const modifiedDate = new Date(sheet.modifiedTime).toLocaleDateString();
        const owners = sheet.owners.length > 0 ? sheet.owners[0].displayName || sheet.owners[0].emailAddress : 'Unknown';
        
        return `
            <div class="sheet-item" data-sheet-id="${sheet.id}" data-sheet-url="${sheet.url}" onclick="selectSheet(this)">
                <div class="sheet-icon">📊</div>
                <div class="sheet-info">
                    <div class="sheet-name">${sheet.name}</div>
                    <div class="sheet-details">
                        Modified: ${modifiedDate} • Owner: ${owners}
                    </div>
                </div>
                <input type="radio" name="selected-sheet" class="sheet-select-radio" value="${sheet.id}">
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="padding: 0.5rem 1rem; background: #e9ecef; font-weight: 600; color: #495057;">
            ${title} (${sheets.length})
        </div>
        ${sheetsHtml}
    `;
}

// Select a sheet
function selectSheet(element) {
    // Remove previous selection
    document.querySelectorAll('.sheet-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('input[type="radio"]').checked = false;
    });
    
    // Select this item
    element.classList.add('selected');
    element.querySelector('input[type="radio"]').checked = true;
    
    // Store selected sheet info
    selectedSheet = {
        id: element.dataset.sheetId,
        url: element.dataset.sheetUrl,
        name: element.querySelector('.sheet-name').textContent
    };
    
    // Update validation button
    updateValidationButton();
}

async function validateGoogleSheet() {
    const activeMethod = document.querySelector('.connection-method.active').id;
    const range = document.getElementById('sheets-range').value.trim() || 'A1:G100';
    let sheetUrl = '';

    // Get sheet URL based on active method
    if (activeMethod === 'browse-method') {
        if (!selectedSheet) {
            showError('Please select a sheet from the list');
            return;
        }
        sheetUrl = selectedSheet.url;
    } else if (activeMethod === 'url-method') {
        sheetUrl = document.getElementById('sheets-url').value.trim();
        if (!sheetUrl) {
            showError('Please enter the Google Sheets URL');
            return;
        }
    }

    try {
        showLoading();
        
        const response = await API.post('/sheets/validate', {
            sheetUrl: sheetUrl,
            apiKey: null // Not needed with service account
        });

        hideLoading();
        displayValidationResults(response);
        goToSheetsStep(2);
        
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayValidationResults(validationData) {
    const container = document.getElementById('sheet-validation-results');
    const { valid, metadata, structure, message } = validationData;

    container.innerHTML = `
        <div class="sheet-info">
            <h6>📋 ${metadata.title}</h6>
            <p>Worksheets: ${metadata.worksheets.map(ws => ws.title).join(', ')}</p>
            <p>Status: <strong style="color: ${valid ? '#28a745' : '#dc3545'}">${message}</strong></p>
        </div>
        
        <h5>📊 Sheet Structure Analysis</h5>
        <ul>
            ${structure.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        
        <div style="margin-top: 1rem;">
            <strong>Found Headers:</strong><br>
            <code>${structure.headers.join(', ')}</code>
        </div>
    `;
}

async function importFromGoogleSheets() {
    const activeMethod = document.querySelector('.connection-method.active').id;
    const range = document.getElementById('sheets-range').value.trim() || 'A1:G100';
    const replaceExisting = document.getElementById('replace-existing').checked;
    let sheetUrl = '';

    // Get sheet URL based on active method
    if (activeMethod === 'browse-method') {
        if (!selectedSheet) {
            showError('Please select a sheet from the list');
            return;
        }
        sheetUrl = selectedSheet.url;
    } else if (activeMethod === 'url-method') {
        sheetUrl = document.getElementById('sheets-url').value.trim();
        if (!sheetUrl) {
            showError('Please enter the Google Sheets URL');
            return;
        }
    }

    try {
        showLoading();
        
        const response = await API.post('/sheets/import', {
            sheetUrl: sheetUrl,
            apiKey: null, // Not needed with service account
            range: range,
            replaceExisting: replaceExisting
        });

        hideLoading();
        displayImportResults(response);
        goToSheetsStep(3);
        
        // Refresh team members list
        await loadTeamMembers();
        updateDashboard();
        
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayImportResults(importData) {
    const container = document.getElementById('import-results');
    const { success, imported, total, members, message } = importData;

    container.className = `import-results ${success ? '' : 'error'}`;
    
    if (success) {
        container.innerHTML = `
            <h5>✅ ${message}</h5>
            <div class="import-stats">
                <div class="import-stat">
                    <div class="number">${imported}</div>
                    <div class="label">Imported</div>
                </div>
                <div class="import-stat">
                    <div class="number">${total}</div>
                    <div class="label">Total Members</div>
                </div>
            </div>
            
            <h6 style="margin-top: 1rem;">📝 Imported Members:</h6>
            <ul>
                ${members.map(member => `
                    <li><strong>${member.name}</strong> (${member.level})${member.teamName ? ` - ${member.teamName}` : ''}${member.location ? ` - ${member.location}` : ''}</li>
                `).join('')}
            </ul>
        `;
    } else {
        container.innerHTML = `
            <h5>❌ Import Failed</h5>
            <p>${importData.error}</p>
        `;
    }
}

async function showSampleTemplate() {
    try {
        showLoading();
        const response = await API.get('/sheets/template');
        hideLoading();
        
        displaySampleTemplate(response);
        showModal('sample-template-modal');
        
    } catch (error) {
        hideLoading();
        showError('Failed to load template: ' + error.message);
    }
}

function displaySampleTemplate(templateData) {
    const container = document.getElementById('template-content');
    const { headers, sampleData, instructions } = templateData;

    container.innerHTML = `
        <h5>📋 Sample Google Sheets Format</h5>
        <table class="template-table">
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${sampleData.map(row => `
                    <tr>
                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="template-instructions">
            <h6>📝 Instructions:</h6>
            <ol>
                ${instructions.map(instruction => `<li>${instruction}</li>`).join('')}
            </ol>
        </div>
    `;
}

// Roadmap Google Sheets Integration Functions
let selectedRoadmapSheet = null;

function showRoadmapSheetsModal() {
    // Reset wizard to step 1
    goToRoadmapSheetsStep(1);
    showModal('roadmap-sheets-modal');
}

function goToRoadmapSheetsStep(step) {
    // Hide all steps
    document.querySelectorAll('#roadmap-sheets-modal .sheets-step').forEach(s => s.classList.remove('active'));
    
    // Show selected step
    document.getElementById(`roadmap-sheets-step-${step}`).classList.add('active');
}

function switchRoadmapConnectionMethod(method) {
    // Update tabs
    document.querySelectorAll('#roadmap-sheets-modal .connection-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.method === method);
    });
    
    // Update content
    document.getElementById('roadmap-browse-method').classList.toggle('active', method === 'browse');
    document.getElementById('roadmap-url-method').classList.toggle('active', method === 'url');
    
    // Reset selection and validation button
    selectedRoadmapSheet = null;
    updateRoadmapValidationButton();
    
    // If switching to URL method, add listener to URL input
    if (method === 'url') {
        const urlInput = document.getElementById('roadmap-sheets-url');
        urlInput.addEventListener('input', () => {
            updateRoadmapValidationButton();
        });
    }
}

function updateRoadmapValidationButton() {
    const validateBtn = document.getElementById('roadmap-validate-btn');
    const activeMethod = document.querySelector('#roadmap-sheets-modal .connection-method.active').id;
    
    let isValid = false;
    
    if (activeMethod === 'roadmap-browse-method') {
        isValid = selectedRoadmapSheet !== null;
    } else if (activeMethod === 'roadmap-url-method') {
        const url = document.getElementById('roadmap-sheets-url').value.trim();
        isValid = url.length > 0;
    }
    
    validateBtn.disabled = !isValid;
    validateBtn.textContent = isValid ? 'Validate & Preview' : 'Select a sheet first';
}

async function loadRoadmapSheetsFromFolder() {
    const container = document.getElementById('roadmap-sheets-list');
    
    try {
        container.innerHTML = '<div class="sheets-loading">🔄 Loading sheets from team folder...</div>';
        
        const response = await fetch('/api/env');
        const env = await response.json();
        
        if (!env.driveFolderId || env.driveFolderId === 'Not set') {
            throw new Error('Team folder not configured');
        }
        
        const sheetsResponse = await API.get(`/sheets/folder/${env.driveFolderId}`);
        displayRoadmapSheetsList(sheetsResponse.sheets, 'Team Folder Sheets');
        
    } catch (error) {
        container.innerHTML = `<div class="sheets-error">❌ ${error.message}</div>`;
    }
}

async function searchRoadmapSheets(event) {
    // If called from keyup event, only proceed on Enter
    if (event && event.type === 'keyup' && event.key !== 'Enter') {
        return;
    }
    
    const searchTerm = document.getElementById('roadmap-sheet-search').value.trim();
    const container = document.getElementById('roadmap-sheets-list');
    
    if (searchTerm.length < 2) {
        container.innerHTML = '<p class="placeholder">Enter at least 2 characters to search</p>';
        return;
    }
    
    try {
        container.innerHTML = '<div class="sheets-loading">🔍 Searching...</div>';
        
        const response = await API.post('/sheets/search', { searchTerm });
        displayRoadmapSheetsList(response.sheets, `Search Results for "${searchTerm}"`);
        
    } catch (error) {
        container.innerHTML = `<div class="sheets-error">❌ ${error.message}</div>`;
    }
}

function displayRoadmapSheetsList(sheets, title) {
    const container = document.getElementById('roadmap-sheets-list');
    
    if (sheets.length === 0) {
        container.innerHTML = `<p class="placeholder">No sheets found. Try a different search or check your permissions.</p>`;
        return;
    }
    
    const sheetsHtml = sheets.map(sheet => {
        const modifiedDate = new Date(sheet.modifiedTime).toLocaleDateString();
        const owners = sheet.owners.length > 0 ? sheet.owners[0].displayName || sheet.owners[0].emailAddress : 'Unknown';
        
        return `
            <div class="sheet-item" data-sheet-id="${sheet.id}" data-sheet-url="${sheet.url}" onclick="selectRoadmapSheet(this)">
                <div class="sheet-icon">📊</div>
                <div class="sheet-info">
                    <div class="sheet-name">${sheet.name}</div>
                    <div class="sheet-details">
                        Modified: ${modifiedDate} • Owner: ${owners}
                    </div>
                </div>
                <input type="radio" name="selected-roadmap-sheet" class="sheet-select-radio" value="${sheet.id}">
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="padding: 0.5rem 1rem; background: #e9ecef; font-weight: 600; color: #495057;">
            ${title} (${sheets.length})
        </div>
        ${sheetsHtml}
    `;
}

function selectRoadmapSheet(element) {
    // Remove previous selection
    document.querySelectorAll('#roadmap-sheets-modal .sheet-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('input[type="radio"]').checked = false;
    });
    
    // Select this item
    element.classList.add('selected');
    element.querySelector('input[type="radio"]').checked = true;
    
    // Store selected sheet info
    selectedRoadmapSheet = {
        id: element.dataset.sheetId,
        url: element.dataset.sheetUrl,
        name: element.querySelector('.sheet-name').textContent
    };
    
    // Update validation button
    updateRoadmapValidationButton();
}

async function validateRoadmapGoogleSheet() {
    const activeMethod = document.querySelector('#roadmap-sheets-modal .connection-method.active').id;
    const range = document.getElementById('roadmap-sheets-range').value.trim() || 'A1:H100';
    let sheetUrl = '';

    // Get sheet URL based on active method
    if (activeMethod === 'roadmap-browse-method') {
        if (!selectedRoadmapSheet) {
            showError('Please select a sheet from the list');
            return;
        }
        sheetUrl = selectedRoadmapSheet.url;
    } else if (activeMethod === 'roadmap-url-method') {
        sheetUrl = document.getElementById('roadmap-sheets-url').value.trim();
        if (!sheetUrl) {
            showError('Please enter the Google Sheets URL');
            return;
        }
    }

    try {
        showLoading();
        
        const response = await API.post('/sheets/validate-roadmap', {
            sheetUrl: sheetUrl,
            apiKey: null // Not needed with service account
        });

        hideLoading();
        displayRoadmapValidationResults(response);
        goToRoadmapSheetsStep(2);
        
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayRoadmapValidationResults(validationData) {
    const container = document.getElementById('roadmap-sheet-validation-results');
    const { valid, metadata, structure, message } = validationData;

    container.innerHTML = `
        <div class="sheet-info">
            <h6>📋 ${metadata.title}</h6>
            <p>Worksheets: ${metadata.worksheets.map(ws => ws.title).join(', ')}</p>
            <p>Status: <strong style="color: ${valid ? '#28a745' : '#dc3545'}">${message}</strong></p>
        </div>
        
        <h5>📊 Sheet Structure Analysis</h5>
        <ul>
            ${structure.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        
        <div style="margin-top: 1rem;">
            <strong>Found Headers:</strong><br>
            <code>${structure.headers.join(', ')}</code>
        </div>
    `;
}

async function importRoadmapFromGoogleSheets() {
    const activeMethod = document.querySelector('#roadmap-sheets-modal .connection-method.active').id;
    const range = document.getElementById('roadmap-sheets-range').value.trim() || 'A1:H100';
    const replaceExisting = document.getElementById('replace-existing-roadmap').checked;
    let sheetUrl = '';

    // Get sheet URL based on active method
    if (activeMethod === 'roadmap-browse-method') {
        if (!selectedRoadmapSheet) {
            showError('Please select a sheet from the list');
            return;
        }
        sheetUrl = selectedRoadmapSheet.url;
    } else if (activeMethod === 'roadmap-url-method') {
        sheetUrl = document.getElementById('roadmap-sheets-url').value.trim();
        if (!sheetUrl) {
            showError('Please enter the Google Sheets URL');
            return;
        }
    }

    try {
        showLoading();
        
        const response = await API.post('/sheets/import-roadmap', {
            sheetUrl: sheetUrl,
            apiKey: null, // Not needed with service account
            range: range,
            replaceExisting: replaceExisting
        });

        hideLoading();
        displayRoadmapImportResults(response);
        goToRoadmapSheetsStep(3);
        
        // Refresh roadmap items list
        await loadRoadmapItems();
        updateDashboard();
        
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayRoadmapImportResults(importData) {
    const container = document.getElementById('roadmap-import-results');
    const { success, imported, total, items, message } = importData;

    container.className = `import-results ${success ? '' : 'error'}`;
    
    if (success) {
        container.innerHTML = `
            <h5>✅ ${message}</h5>
            <div class="import-stats">
                <div class="import-stat">
                    <div class="number">${imported}</div>
                    <div class="label">Imported</div>
                </div>
                <div class="import-stat">
                    <div class="number">${total}</div>
                    <div class="label">Total Items</div>
                </div>
            </div>
            
            <h6 style="margin-top: 1rem;">📝 Imported Items:</h6>
            <ul>
                ${items.map(item => `
                    <li><strong>${item.name}</strong> ${item.effortBreakdown ? `(${item.effortBreakdown.total} weeks total)` : `(Size: ${item.size}, Complexity: ${item.complexity})`}</li>
                `).join('')}
            </ul>
        `;
    } else {
        container.innerHTML = `
            <h5>❌ Import Failed</h5>
            <p>${importData.error}</p>
        `;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeForms();
    updateDashboard();
});