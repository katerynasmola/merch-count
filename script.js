const ITEMS = [
  { key: 'pen', label: 'Ручка' },
  { key: 'tshirt_white_male', label: 'Футболка біла чоловіча', sizes: ['S','M','L','XL','XXL'] },
  { key: 'tshirt_white_female', label: 'Футболка біла жіноча', sizes: ['XS','S','M','L','XL','XXL'] },
  { key: 'tshirt_black_male', label: 'Футболка чорна чоловіча', sizes: ['S','M','L','XL','XXL'] },
  { key: 'tshirt_black_female', label: 'Футболка чорна жіноча', sizes: ['XS','S','M','L','XL','XXL'] },
  { key: 'notebook', label: 'Блокнот' },
  { key: 'water_bottle', label: 'Пляшка для води' },
  { key: 'box', label: 'Бокс' },
  { key: 'stickers', label: 'Стікерпак' },
  { key: 'pen_pad', label: 'Підкладка під ручку' },
  { key: 'lanyard', label: 'Стрічка для пропуска' },
  { key: 'badge', label: 'Бейдж для пропуска' },
  { key: 'postcards', label: 'Листівки' }
];

const state = ITEMS.reduce((acc, item) => {
  if (item.sizes) {
    acc[item.key] = Object.fromEntries(item.sizes.map((s) => [s, 0]));
  } else {
    acc[item.key] = 0;
  }
  return acc;
}, {});
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
    const item = ITEMS.find((i) => i.key === key);
    if (!item) return;

    if (item.sizes) {
      // Handle items with sizes (t-shirts)
      $all('.size', el).forEach((sizeEl) => {
        const size = sizeEl.getAttribute('data-size');
        const inputEl = $('.counter__input', sizeEl);
        if (size && inputEl) inputEl.value = String(state[key][size]);
      });
    } else {
      // Handle simple items
      const inputEl = $('.counter__input', el);
      if (inputEl) inputEl.value = String(state[key]);
    }
  });

  $('#boxesCount').textContent = String(composedBoxes);
  
  // Auto-save to server
  scheduleSave();
}

function increment(key, size = null) {
  if (size) {
    state[key][size] += 1;
  } else {
    state[key] += 1;
  }
  updateUI();
}

function decrement(key, size = null) {
  if (size) {
    if (state[key][size] > 0) {
      state[key][size] -= 1;
    }
  } else {
    if (state[key] > 0) {
      state[key] -= 1;
    }
  }
  updateUI();
}

function sumSizesByKey(itemKey) {
  return Object.values(state[itemKey]).reduce((a, b) => a + b, 0);
}

function canComposeBox() {
  // Require at least one white tee (male or female) and one black tee (male or female)
  const whiteOk = sumSizesByKey('tshirt_white_male') + sumSizesByKey('tshirt_white_female') > 0;
  const blackOk = sumSizesByKey('tshirt_black_male') + sumSizesByKey('tshirt_black_female') > 0;

  const othersOk = ITEMS.every((item) => {
    if (item.key.startsWith('tshirt_')) return true; // handled above
    if (item.sizes) {
      return Object.values(state[item.key]).reduce((a, b) => a + b, 0) > 0;
    }
    return state[item.key] > 0;
  });

  return whiteOk && blackOk && othersOk;
}

function composeBox() {
  const messageEl = $('#message');
  if (!canComposeBox()) {
    const lacking = [];
    if (sumSizesByKey('tshirt_white_male') + sumSizesByKey('tshirt_white_female') <= 0) {
      lacking.push('Футболка біла (будь-яка)');
    }
    if (sumSizesByKey('tshirt_black_male') + sumSizesByKey('tshirt_black_female') <= 0) {
      lacking.push('Футболка чорна (будь-яка)');
    }
    ITEMS.forEach((item) => {
      if (item.key.startsWith('tshirt_')) return;
      if (item.sizes) {
        const sum = Object.values(state[item.key]).reduce((a, b) => a + b, 0);
        if (sum <= 0) lacking.push(item.label);
      } else if (state[item.key] <= 0) {
        lacking.push(item.label);
      }
    });
    messageEl.textContent = `Недостатньо: ${lacking.join(', ')}`;
    return;
  }

  // Decrement white tee (prefer XXL -> XS)
  const whiteOrder = ['tshirt_white_male', 'tshirt_white_female'];
  for (const k of whiteOrder) {
    const sizes = ITEMS.find((i) => i.key === k).sizes;
    for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
      const size = sizes[idx];
      if (state[k][size] > 0) { state[k][size] -= 1; break; }
    }
  }

  // Decrement black tee (prefer XXL -> XS)
  const blackOrder = ['tshirt_black_male', 'tshirt_black_female'];
  for (const k of blackOrder) {
    const sizes = ITEMS.find((i) => i.key === k).sizes;
    for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
      const size = sizes[idx];
      if (state[k][size] > 0) { state[k][size] -= 1; break; }
    }
  }

  // Decrement other items
  ITEMS.forEach((item) => {
    if (item.key.startsWith('tshirt_')) return;
    if (item.sizes) {
      const sizesOrder = item.sizes;
      for (let idx = sizesOrder.length - 1; idx >= 0; idx -= 1) {
        const size = sizesOrder[idx];
        if (state[item.key][size] > 0) { state[item.key][size] -= 1; break; }
      }
    } else {
      state[item.key] -= 1;
    }
  });

  composedBoxes += 1;
  messageEl.textContent = 'Бокс складено!';
  updateUI();
}

function attachHandlers() {
  $('#composeBtn').addEventListener('click', composeBox);

  $all('.item').forEach((el) => {
    const key = el.dataset.key;
    const item = ITEMS.find((i) => i.key === key);
    el.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const action = target.getAttribute('data-action');
      
      if (!item?.sizes) {
        // Simple items
        if (action === 'increment') increment(key);
        if (action === 'decrement') decrement(key);
      } else {
        // Items with sizes (t-shirts)
        const sizeEl = target.closest('.size');
        if (!sizeEl) return;
        const size = sizeEl.getAttribute('data-size');
        if (!size) return;
        
        if (action === 'increment') increment(key, size);
        if (action === 'decrement') decrement(key, size);
      }
    });

    // Handle manual input for simple items
    if (!item?.sizes) {
      const inputEl = $('.counter__input', el);
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          const raw = inputEl.value.trim();
          const parsed = Math.max(0, Number.parseInt(raw === '' ? '0' : raw, 10));
          state[key] = Number.isFinite(parsed) ? parsed : 0;
          updateUI();
        });
      }
    } else {
      // Handle manual input for sized items
      $all('.size', el).forEach((sizeEl) => {
        const size = sizeEl.getAttribute('data-size');
        const inputEl = $('.counter__input', sizeEl);
        if (!size || !inputEl) return;
        
        inputEl.addEventListener('input', () => {
          const raw = inputEl.value.trim();
          const parsed = Math.max(0, Number.parseInt(raw === '' ? '0' : raw, 10));
          state[key][size] = Number.isFinite(parsed) ? parsed : 0;
          updateUI();
        });
      });
    }
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


