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
let lastComposeActions = [];

const ITEM_THRESHOLDS = {
  notebook: 30,
  water_bottle: 30,
  pen: 20,
  pen_pad: 20,
  box: 40,
  lanyard: 20,
  badge: 30,
  stickers: 10,
  postcards: 20,
  // T-shirt thresholds (per size)
  tshirt_white_male: 10,
  tshirt_white_female: 10,
  tshirt_black_male: 10,
  tshirt_black_female: 10
};

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
        
        // Ensure checkbox exists
        let chk = $('.size__check', sizeEl);
        if (!chk) {
          chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.className = 'size__check';
          const labelEl = $('.size__label', sizeEl);
          sizeEl.insertBefore(chk, labelEl);
        }
        
        // Update visual state
        const isSelected = chk.checked;
        sizeEl.classList.toggle('selected', isSelected);
      });
    } else {
      // Handle simple items
      const inputEl = $('.counter__input', el);
      if (inputEl) inputEl.value = String(state[key]);
    }
  });

  $('#boxesCount').textContent = String(composedBoxes);
  
  // Auto-save to localStorage
  saveToLocalStorage();
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
    if (state[key][size] > 0) state[key][size] -= 1;
  } else {
    if (state[key] > 0) state[key] -= 1;
  }
  updateUI();
}

function sumSizesByKey(key) {
  const item = ITEMS.find((i) => i.key === key);
  if (!item?.sizes) return 0;
  return item.sizes.reduce((sum, size) => sum + (state[key][size] || 0), 0);
}

function canComposeBox() {
  const lacking = [];
  
  // Check t-shirts (at least one of each type)
  const tshirtKeys = ['tshirt_white_male', 'tshirt_white_female', 'tshirt_black_male', 'tshirt_black_female'];
  for (const key of tshirtKeys) {
    if (sumSizesByKey(key) === 0) lacking.push(ITEMS.find((i) => i.key === key).label);
  }
  
  // Check other items
  ITEMS.forEach((item) => {
    if (item.key.startsWith('tshirt_')) return;
    if (item.sizes) {
      const total = item.sizes.reduce((sum, size) => sum + (state[item.key][size] || 0), 0);
      if (total === 0) lacking.push(item.label);
    } else {
      if (state[item.key] === 0) lacking.push(item.label);
    }
  });
  
  return lacking;
}

function composeBox() {
  const lacking = canComposeBox();
  const messageEl = $('#message');
  
  if (lacking.length > 0) {
    messageEl.textContent = `Недостатньо: ${lacking.join(', ')}`;
    return;
  }

  // Store actions for undo
  lastComposeActions = [];

  // Decrement white tee: prefer selected size, then XXL -> XS
  const whiteOrder = ['tshirt_white_male', 'tshirt_white_female'];
  let decrementedWhite = false;
  for (const k of whiteOrder) {
    const sectionEl = document.querySelector(`.item[data-key="${k}"]`);
    const selectedChk = sectionEl ? $('.size__check:checked', sectionEl) : null;
    if (selectedChk) {
      const sizeEl = selectedChk.closest('.size');
      const size = sizeEl?.getAttribute('data-size');
      if (size && state[k][size] > 0) { 
        state[k][size] -= 1; 
        lastComposeActions.push({ type: 'increment', key: k, size });
        decrementedWhite = true; 
        break; 
      }
    }
  }
  if (!decrementedWhite) {
    for (const k of whiteOrder) {
      const sizes = ITEMS.find((i) => i.key === k).sizes;
      for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
        const size = sizes[idx];
        if (state[k][size] > 0) { 
          state[k][size] -= 1; 
          lastComposeActions.push({ type: 'increment', key: k, size });
          decrementedWhite = true; 
          break; 
        }
      }
      if (decrementedWhite) break;
    }
  }

  // Decrement black tee: prefer selected size, then XXL -> XS
  const blackOrder = ['tshirt_black_male', 'tshirt_black_female'];
  let decrementedBlack = false;
  for (const k of blackOrder) {
    const sectionEl = document.querySelector(`.item[data-key="${k}"]`);
    const selectedChk = sectionEl ? $('.size__check:checked', sectionEl) : null;
    if (selectedChk) {
      const sizeEl = selectedChk.closest('.size');
      const size = sizeEl?.getAttribute('data-size');
      if (size && state[k][size] > 0) { 
        state[k][size] -= 1; 
        lastComposeActions.push({ type: 'increment', key: k, size });
        decrementedBlack = true; 
        break; 
      }
    }
  }
  if (!decrementedBlack) {
    for (const k of blackOrder) {
      const sizes = ITEMS.find((i) => i.key === k).sizes;
      for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
        const size = sizes[idx];
        if (state[k][size] > 0) { 
          state[k][size] -= 1; 
          lastComposeActions.push({ type: 'increment', key: k, size });
          decrementedBlack = true; 
          break; 
        }
      }
      if (decrementedBlack) break;
    }
  }

  // Decrement other items
  ITEMS.forEach((item) => {
    if (item.key.startsWith('tshirt_')) return;
    if (item.sizes) {
      const sizes = item.sizes;
      for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
        const size = sizes[idx];
        if (state[item.key][size] > 0) { 
          state[item.key][size] -= 1; 
          lastComposeActions.push({ type: 'increment', key: item.key, size });
          break; 
        }
      }
    } else {
      state[item.key] -= 1;
      lastComposeActions.push({ type: 'increment', key: item.key });
    }
  });

  composedBoxes += 1;
  messageEl.textContent = 'Бокс складено!';
  
  // Clear selected sizes after composing
  ['tshirt_white_male','tshirt_white_female','tshirt_black_male','tshirt_black_female'].forEach((k) => {
    const sectionEl = document.querySelector(`.item[data-key="${k}"]`);
    if (sectionEl) {
      $all('.size__check', sectionEl).forEach((c) => { c.checked = false; });
    }
  });
  
  updateUI();
}

function undoLastCompose() {
  if (lastComposeActions.length === 0) {
    $('#message').textContent = 'Немає дій для скасування';
    return;
  }

  // Reverse all actions
  lastComposeActions.reverse().forEach((action) => {
    if (action.size) {
      state[action.key][action.size] += 1;
    } else {
      state[action.key] += 1;
    }
  });

  composedBoxes -= 1;
  lastComposeActions = [];
  $('#message').textContent = 'Останню дію скасовано';
  updateUI();
}

function attachHandlers() {
  $('#composeBtn').addEventListener('click', composeBox);
  $('#undoBtn').addEventListener('click', undoLastCompose);

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
        
        if (target.classList.contains('size__check')) {
          // Handle checkbox click
          // Exclusive selection inside the group
          $all('.size__check', el).forEach((c) => { 
            if (c !== target) c.checked = false; 
          });

          // Mirror selection from white -> black (same gender groups)
          const isChecked = target.checked === true;
          const sourceKey = key;
          let mirrorKey = null;
          if (sourceKey === 'tshirt_white_male') mirrorKey = 'tshirt_black_male';
          if (sourceKey === 'tshirt_white_female') mirrorKey = 'tshirt_black_female';

          if (mirrorKey) {
            const mirrorSection = document.querySelector(`.item[data-key="${mirrorKey}"]`);
            if (mirrorSection) {
              // uncheck all in mirror first
              $all('.size__check', mirrorSection).forEach((c) => { 
                if (c !== target) c.checked = false; 
              });
              if (isChecked) {
                // check same size in mirror
                const mirrorSizeEl = $(`.size[data-size="${size}"]`, mirrorSection);
                const mirrorChk = mirrorSizeEl ? $('.size__check', mirrorSizeEl) : null;
                if (mirrorChk) mirrorChk.checked = true;
              }
              // update mirror visuals
              $all('.size', mirrorSection).forEach((sEl) => {
                const chk = $('.size__check', sEl);
                const sel = chk && chk.checked;
                sEl.classList.toggle('selected', sel);
              });
            }
          }

          // update visual state on current section
          $all('.size', el).forEach((sEl) => {
            const chk = $('.size__check', sEl);
            const sel = chk && chk.checked;
            sEl.classList.toggle('selected', sel);
          });
          return;
        }
        
        if (action === 'increment') increment(key, size);
        if (action === 'decrement') decrement(key, size);
      }
    });

    // Handle manual input for simple items
    if (!item?.sizes) {
      const inputEl = $('.counter__input', el);
      if (inputEl) {
        inputEl.addEventListener('input', (e) => {
          const value = parseInt(e.target.value) || 0;
          if (value >= 0) {
            state[key] = value;
            updateUI();
          }
        });
      }
    } else {
      // Handle manual input for sized items
      $all('.counter__input', el).forEach((inputEl) => {
        inputEl.addEventListener('input', (e) => {
          const size = e.target.closest('.size').getAttribute('data-size');
          const value = parseInt(e.target.value) || 0;
          if (value >= 0 && size) {
            state[key][size] = value;
            updateUI();
          }
        });
      });
    }
  });
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
      composedBoxes = parseInt(savedBoxes) || 0;
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }
}

// Initialize with default values
const initialState = {
  notebook: 88,
  water_bottle: 11,
  pen: 102,
  pen_pad: 43,
  box: 7,
  lanyard: 98,
  badge: 57,
  stickers: 100,
  postcards: 35,
  tshirt_white_male: { S: 15, M: 14, L: 9, XL: 9, XXL: 6 },
  tshirt_white_female: { XS: 16, S: 16, M: 8, L: 15, XL: 10, XXL: 10 },
  tshirt_black_male: { S: 14, M: 12, L: 15, XL: 5, XXL: 11 },
  tshirt_black_female: { XS: 19, S: 14, M: 7, L: 14, XL: 7, XXL: 11 }
};

function seedInitialData() {
  let hasData = false;
  
  // Check if we have any data
  ITEMS.forEach((item) => {
    if (item.sizes) {
      item.sizes.forEach((size) => {
        if (state[item.key][size] > 0) hasData = true;
      });
    } else {
      if (state[item.key] > 0) hasData = true;
    }
  });
  
  if (!hasData) {
    Object.assign(state, initialState);
    saveToLocalStorage();
  }
}

function init() {
  loadFromLocalStorage();
  seedInitialData();
  attachHandlers();
  updateUI();
}

document.addEventListener('DOMContentLoaded', init);