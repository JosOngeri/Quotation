// QMS Mock Application

// Page mapping
const pages = {
    'dashboard': 'pages/dashboard.html',
    'quotes': 'pages/quotes.html',
    'projects': 'pages/projects.html',
    'clients': 'pages/clients.html',
    'suppliers': 'pages/suppliers.html',
    'products': 'pages/products.html',
    'reports': 'pages/reports.html',
    'settings-users': 'pages/settings-users.html',
    'settings-templates': 'pages/settings-templates.html',
    'settings-audit': 'pages/settings-audit.html',
    'client-portal': 'pages/client-portal.html'
};

// Detail page mapping
const detailPages = {
    'quote-detail': 'pages/detail/quote-detail.html',
    'project-detail': 'pages/detail/project-detail.html'
};

// Modal mapping
const modals = {
    'new-quote-modal': 'modals/new-quote-modal.html',
    'item-detail-modal': 'modals/item-detail-modal.html',
    'send-quote-modal': 'modals/send-quote-modal.html',
    'cost-event-modal': 'modals/cost-event-modal.html'
};

// Current page state
let currentPage = 'dashboard';
let currentDetail = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadPage('dashboard');
});

// Setup navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            if (pageId) {
                navigateTo(pageId);
            }
        });
    });
}

// Navigate to page
function navigateTo(pageId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // Handle client portal styling
    const app = document.getElementById('app');
    if (pageId === 'client-portal') {
        app.classList.add('client-portal');
    } else {
        app.classList.remove('client-portal');
    }

    // Load page
    loadPage(pageId);
}

// Load page content
async function loadPage(pageId) {
    const contentArea = document.getElementById('content-area');
    const pageUrl = pages[pageId];

    if (!pageUrl) {
        console.error('Page not found:', pageId);
        return;
    }

    try {
        const response = await fetch(pageUrl);
        const html = await response.text();
        contentArea.innerHTML = html;
        currentPage = pageId;
        currentDetail = null;

        // Re-attach event listeners for the loaded page
        attachPageEventListeners(pageId);
    } catch (error) {
        console.error('Error loading page:', error);
        contentArea.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Error loading page</div></div>';
    }
}

// Load detail page
async function loadDetailPage(detailId, params = {}) {
    const contentArea = document.getElementById('content-area');
    const detailUrl = detailPages[detailId];

    if (!detailUrl) {
        console.error('Detail page not found:', detailId);
        return;
    }

    try {
        const response = await fetch(detailUrl);
        let html = await response.text();

        // Replace placeholders with params if provided
        if (params.id) {
            html = html.replace(/\{id\}/g, params.id);
        }

        contentArea.innerHTML = html;
        currentDetail = detailId;

        // Re-attach event listeners
        attachDetailEventListeners(detailId);
    } catch (error) {
        console.error('Error loading detail page:', error);
        contentArea.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Error loading detail page</div></div>';
    }
}

// Attach event listeners for pages
function attachPageEventListeners(pageId) {
    // Quote table rows
    const quoteRows = document.querySelectorAll('.quote-row');
    quoteRows.forEach(row => {
        row.addEventListener('click', () => {
            const quoteId = row.dataset.quoteId;
            loadDetailPage('quote-detail', { id: quoteId });
        });
    });

    // Project table rows
    const projectRows = document.querySelectorAll('.project-row');
    projectRows.forEach(row => {
        row.addEventListener('click', () => {
            const projectId = row.dataset.projectId;
            loadDetailPage('project-detail', { id: projectId });
        });
    });

    // Client portal quote rows
    const clientQuoteRows = document.querySelectorAll('.client-quote-row');
    clientQuoteRows.forEach(row => {
        row.addEventListener('click', () => {
            const quoteId = row.dataset.quoteId;
            loadDetailPage('quote-detail', { id: quoteId });
        });
    });

    // Client portal project rows
    const clientProjectRows = document.querySelectorAll('.client-project-row');
    clientProjectRows.forEach(row => {
        row.addEventListener('click', () => {
            const projectId = row.dataset.projectId;
            loadDetailPage('project-detail', { id: projectId });
        });
    });
}

// Attach event listeners for detail pages
function attachDetailEventListeners(detailId) {
    // Back to list button
    const backButtons = document.querySelectorAll('.back-to-list');
    backButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (detailId === 'quote-detail') {
                loadPage('quotes');
            } else if (detailId === 'project-detail') {
                loadPage('projects');
            }
        });
    });

    // Tree node clicks
    const treeNodes = document.querySelectorAll('.tree-node');
    treeNodes.forEach(node => {
        node.addEventListener('click', () => {
            openModal('item-detail-modal');
        });
    });
}

// Open modal
async function openModal(modalId) {
    const modalContainer = document.getElementById('modal-container');
    const modalUrl = modals[modalId];

    if (!modalUrl) {
        console.error('Modal not found:', modalId);
        return;
    }

    try {
        const response = await fetch(modalUrl);
        const html = await response.text();
        modalContainer.innerHTML = html;

        // Show modal
        const modalOverlay = modalContainer.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.add('active');
        }

        // Attach close button listeners
        const closeButtons = modalContainer.querySelectorAll('.modal-close, .btn-secondary');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal();
            });
        });

        // Prevent modal content click from closing
        const modal = modalContainer.querySelector('.modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Close on overlay click
        modalOverlay.addEventListener('click', () => {
            closeModal();
        });

    } catch (error) {
        console.error('Error loading modal:', error);
    }
}

// Close modal
function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    const modalOverlay = modalContainer.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    setTimeout(() => {
        modalContainer.innerHTML = '';
    }, 200);
}

// Make functions globally available
window.navigateTo = navigateTo;
window.loadDetailPage = loadDetailPage;
window.openModal = openModal;
window.closeModal = closeModal;
