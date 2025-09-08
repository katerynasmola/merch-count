const ITEMS = [
  { key: 'pen', label: 'Ручка' },
  { key: 'tshirt_white', label: 'Футболка біла' },
  { key: 'tshirt_black', label: 'Футболка чорна' },
  { key: 'notebook', label: 'Блокнот' },
  { key: 'box', label: 'Бокс' },
  { key: 'stickers', label: 'Наліпки' },
  { key: 'postcards', label: 'Листівки' }
];

const state = Object.fromEntries(ITEMS.map((i) => [i.key, 0]));
let composedBoxes = 0;

// Supabase configuration
const SUPABASE_URL = 'https://yhnikfjyxthkrmoqmpdy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobmlrZmp5eHRoa3Jtb3FtcGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNjc3MDAsImV4cCI6MjA3Mjk0MzcwMH0.2RnIxl2HMoL4bZPzeLzXSnV0fjUcZNWUHMIvkal2Ma4';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auto-sync functionality
let saveTimeout = null;

async function loadStateFromServer() {
  try {
    const { data, error } = await supabase
      .from('tracker_data')
      .select('data')
      .eq('id', 'main')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.warn('Failed to load state from Supabase:', error);
      return false;
    }
    
    if (data && data.data) {
      const serverState = data.data;
      // Merge server state with local state
      Object.assign(state, serverState);
      if (serverState.composedBoxes !== undefined) {
        composedBoxes = serverState.composedBoxes;
      }
      console.log('State loaded from Supabase:', serverState);
      return true;
    }
  } catch (error) {
    console.warn('Failed to load state from Supabase:', error);
  }
  return false;
}

async function saveStateToServer() {
  try {
    const stateToSave = {
      ...state,
      composedBoxes: composedBoxes
    };
    
    const { error } = await supabase
      .from('tracker_data')
      .upsert({
        id: 'main',
        data: stateToSave,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.warn('Failed to save state to Supabase:', error);
      return false;
    }
    
    console.log('State saved to Supabase');
    return true;
  } catch (error) {
    console.warn('Failed to save state to Supabase:', error);
    return false;
  }
}

function scheduleSave() {
  // Save to localStorage immediately
  saveToLocalStorage();
  
  // Also save to server with delay
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveStateToServer, 1000); // 1 second delay
}

function saveToLocalStorage() {
  try {
    localStorage.setItem('tracker_state', JSON.stringify(state));
    localStorage.setItem('tracker_boxes', String(composedBoxes));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadFromLocalStorage() {
  try {
    const savedState = localStorage.getItem('tracker_state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      Object.assign(state, parsed);
    }
    
    const savedBoxes = localStorage.getItem('tracker_boxes');
    if (savedBoxes) {
      composedBoxes = parseInt(savedBoxes, 10) || 0;
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }
}

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function updateUI() {
  $all('.item').forEach((el) => {
    const key = el.dataset.key;
    const valueEl = $('.counter__value', el);
    valueEl.textContent = String(state[key]);
  });

  $('#boxesCount').textContent = String(composedBoxes);
  
  // Auto-save to server
  scheduleSave();
}

function increment(key) {
  state[key] += 1;
  updateUI();
}

function decrement(key) {
  if (state[key] > 0) {
    state[key] -= 1;
    updateUI();
  }
}

function canComposeBox() {
  return ITEMS.every((item) => state[item.key] > 0);
}

function composeBox() {
  const messageEl = $('#message');
  if (!canComposeBox()) {
    const lacking = ITEMS.filter((i) => state[i.key] <= 0).map((i) => i.label);
    messageEl.textContent = `Недостатньо: ${lacking.join(', ')}`;
    return;
  }

  ITEMS.forEach((i) => (state[i.key] -= 1));
  composedBoxes += 1;
  messageEl.textContent = 'Бокс складено!';
  updateUI();
}

function attachHandlers() {
  $('#composeBtn').addEventListener('click', composeBox);

  $all('.item').forEach((el) => {
    const key = el.dataset.key;
    el.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const action = target.getAttribute('data-action');
      if (action === 'increment') increment(key);
      if (action === 'decrement') decrement(key);
    });
  });
}

async function init() {
  // Load from localStorage first
  loadFromLocalStorage();
  
  // Try to load from server and merge
  await loadStateFromServer();
  
  attachHandlers();
  updateUI();
}

document.addEventListener('DOMContentLoaded', init);


