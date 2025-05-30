// Library data
const books = [
    "Operating Systems",
    "Computer Networks",
    "Algorithms",
    "Database Systems",
    "Machine Learning",
    "Web Development"
];

// Simulation settings
const SHELF_CAPACITY = 3;
let shelf = [];
let pageTable = {};
let stats = { hits: 0, faults: 0 };
let lastUsed = {};

// DOM elements
const hitSound = document.getElementById('hitSound');
const faultSound = document.getElementById('faultSound');
const themeBtn = document.getElementById('theme-btn');
const helpBtn = document.getElementById('help-btn');
const modal = document.getElementById('help-modal');
const closeBtn = document.querySelector('.close');

// Initialize
function initialize() {
    loadState();
    
    // Set up event listeners
    themeBtn.addEventListener('click', toggleTheme);
    helpBtn.addEventListener('click', () => modal.style.display = "block");
    closeBtn.addEventListener('click', () => modal.style.display = "none");
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
    
    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
    
    renderBooks();
    setupDragAndDrop();
    updateStats();
}

// Load saved state from localStorage
function loadState() {
    const savedState = localStorage.getItem('pagingSimState');
    if (savedState) {
        const state = JSON.parse(savedState);
        shelf = state.shelf || [];
        stats = state.stats || { hits: 0, faults: 0 };
        lastUsed = state.lastUsed || {};
        
        // Rebuild pageTable
        pageTable = {};
        books.forEach(book => {
            const position = shelf.indexOf(book);
            pageTable[book] = {
                onShelf: position > -1,
                position: position
            };
            if (!lastUsed[book]) lastUsed[book] = 0;
        });
    } else {
        // Fresh start
        books.forEach(book => {
            pageTable[book] = { onShelf: false, position: -1 };
            lastUsed[book] = 0;
        });
    }
    
    // Load theme preference
    const savedTheme = localStorage.getItem('pagingSimTheme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.textContent = "☀️ Light Mode";
    }
}

// Save state to localStorage
function saveState() {
    const state = {
        shelf: shelf,
        stats: stats,
        lastUsed: lastUsed
    };
    localStorage.setItem('pagingSimState', JSON.stringify(state));
}

// Reset simulation to initial state
function resetSimulation() {
    // Clear all data
    shelf = [];
    stats = { hits: 0, faults: 0 };
    lastUsed = {};
    
    // Reset page table
    books.forEach(book => {
        pageTable[book] = { onShelf: false, position: -1 };
        lastUsed[book] = 0;
    });
    
    // Clear localStorage (optional)
    localStorage.removeItem('pagingSimState');
    
    // Re-render everything
    renderBooks();
    updateStats();
    
    // Show confirmation message
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = "Simulation reset to initial state!";
    messageDiv.style.background = "#e3f2fd";
    
    setTimeout(() => {
        messageDiv.textContent = "";
        messageDiv.style.background = "";
    }, 2000);
}

// Connect reset button (add this in your initialize function)
document.getElementById('reset-btn').addEventListener('click', resetSimulation);

// Toggle dark/light theme
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.hasAttribute('data-theme');
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('pagingSimTheme', 'light');
        themeBtn.textContent = "🌙 Dark Mode";
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('pagingSimTheme', 'dark');
        themeBtn.textContent = "☀️ Light Mode";
    }
    
    // Optional: Dispatch event for other components to react to theme changes
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark: !isDark } }));
}

// Set up drag-and-drop
function setupDragAndDrop() {
    new Sortable(document.getElementById('shelf'), {
        animation: 150,
        ghostClass: 'dragging',
        onEnd: function() {
            const shelfDiv = document.getElementById('shelf');
            const newShelf = [];
            shelfDiv.querySelectorAll('.book-on-shelf').forEach((el, index) => {
                const book = el.textContent.replace(`Slot ${index}: `, '');
                newShelf.push(book);
                pageTable[book].position = index;
                lastUsed[book] = Date.now();
            });
            shelf = newShelf;
            saveState();
        }
    });
}

// Render all components
function renderBooks() {
    const bookListDiv = document.getElementById('book-list');
    const shelfDiv = document.getElementById('shelf');
    const catalogDiv = document.getElementById('catalog');
    
    bookListDiv.innerHTML = '';
    shelfDiv.innerHTML = '';
    catalogDiv.innerHTML = '';
    
    // Virtual Memory
    books.forEach(book => {
        const bookElement = document.createElement('div');
        bookElement.className = 'book';
        bookElement.textContent = book;
        
        if (pageTable[book].onShelf) {
            bookElement.classList.add('on-shelf');
        }
        
        bookElement.addEventListener('click', () => requestBook(book));
        bookElement.addEventListener('touchstart', () => requestBook(book), { passive: true });
        bookListDiv.appendChild(bookElement);
    });
    
    // Physical Memory
    for (let i = 0; i < SHELF_CAPACITY; i++) {
        if (shelf[i]) {
            const bookElement = document.createElement('div');
            bookElement.className = 'book-on-shelf';
            bookElement.textContent = `Slot ${i}: ${shelf[i]}`;
            shelfDiv.appendChild(bookElement);
        } else {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'empty-slot';
            shelfDiv.appendChild(emptySlot);
        }
    }
    
    // Page Table
    books.forEach(book => {
        const entry = document.createElement('div');
        entry.className = 'book';
        entry.textContent = `${book}: ${
            pageTable[book].onShelf 
                ? `Shelf ${pageTable[book].position}` 
                : "In Storage"
        }`;
        catalogDiv.appendChild(entry);
    });
}

// Handle book requests with LRU
function requestBook(book) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = '';
    
    lastUsed[book] = Date.now();
    
    if (pageTable[book].onShelf) {
        // Page hit
        stats.hits++;
        hitSound.currentTime = 0;
        hitSound.play();
        messageDiv.textContent = `"${book}" is on shelf (Hit!)`;
        messageDiv.style.background = 'var(--on-shelf)';
    } else {
        // Page fault
        stats.faults++;
        faultSound.currentTime = 0;
        faultSound.play();
        messageDiv.style.background = 'var(--page-fault)';
        
        const bookElement = [...document.querySelectorAll('.book')].find(el => el.textContent === book);
        bookElement.classList.add('loading');
        
        setTimeout(() => {
            bookElement.classList.remove('loading');
            
            if (shelf.length >= SHELF_CAPACITY) {
                // LRU replacement
                let lruBook = shelf[0];
                let lruTime = lastUsed[lruBook];
                
                shelf.forEach(b => {
                    if (lastUsed[b] < lruTime) {
                        lruBook = b;
                        lruTime = lastUsed[b];
                    }
                });
                
                const index = shelf.indexOf(lruBook);
                shelf.splice(index, 1);
                pageTable[lruBook] = { onShelf: false, position: -1 };
                messageDiv.textContent = `Removed "${lruBook}" (LRU)`;
            }
            
            shelf.push(book);
            pageTable[book] = { onShelf: true, position: shelf.length - 1 };
            messageDiv.innerHTML += `<br>Fetched "${book}" (Fault)`;
            
            renderBooks();
            updateStats();
            saveState();
        }, 1000);
    }
    
    updateStats();
}

// Update statistics
function updateStats() {
    document.getElementById('hits').textContent = stats.hits;
    document.getElementById('faults').textContent = stats.faults;
    
    const total = stats.hits + stats.faults;
    const ratio = total > 0 ? Math.round((stats.hits / total) * 100) : 0;
    document.getElementById('ratio').textContent = `${ratio}%`;
}

// Start simulation
window.onload = initialize;