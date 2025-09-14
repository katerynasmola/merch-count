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

// Персональні пороги для сповіщень
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
};

const TSHIRT_SIZE_THRESHOLD = 10; // мінімальна кількість для кожного розміру футболок

function getThresholdForKey(itemKey) {
  return ITEM_THRESHOLDS[itemKey] ?? null;
}

function applyLowStockVisual(itemEl, current, threshold) {
  if (typeof threshold !== 'number') {
    itemEl.style.backgroundColor = '';
    itemEl.style.borderColor = '';
    return;
  }
  const deficit = Math.max(0, threshold - current);
  if (deficit === 0) {
    itemEl.style.backgroundColor = '';
    itemEl.style.borderColor = '';
    return;
  }
  if (current === 0) {
    // Stronger signal when completely out of stock
    itemEl.style.backgroundColor = 'rgba(220, 38, 38, 0.6)';
    itemEl.style.borderColor = 'rgba(185, 28, 28, 0.9)';
    return;
  }
  const ratio = Math.min(1, deficit / threshold); // 0..1
  const baseAlpha = 0.08;
  const maxExtra = 0.32;
  const alpha = baseAlpha + ratio * maxExtra; // 0.08 .. 0.40
  itemEl.style.backgroundColor = `rgba(220, 38, 38, ${alpha})`;
  itemEl.style.borderColor = 'rgba(185, 28, 28, 0.6)';
}

const state = ITEMS.reduce((acc, item) => {
  if (item.sizes) {
    acc[item.key] = Object.fromEntries(item.sizes.map((s) => [s, 0]));
  } else {
    acc[item.key] = 0;
  }
  return acc;
}, {});
let composedBoxes = 0;

const SLACK_KEYS = {
  webhook: 'tracker_slack_webhook',
  userId: 'tracker_slack_user_id',
  notified: 'tracker_slack_notified_items',
};

function loadSlackConfig() {
  return {
    webhook: localStorage.getItem(SLACK_KEYS.webhook) || '',
    userId: localStorage.getItem(SLACK_KEYS.userId) || '',
    notified: JSON.parse(localStorage.getItem(SLACK_KEYS.notified) || '{}'),
  };
}

function saveSlackConfig({ webhook, userId, notified }) {
  if (typeof webhook === 'string') localStorage.setItem(SLACK_KEYS.webhook, webhook);
  if (typeof userId === 'string') localStorage.setItem(SLACK_KEYS.userId, userId);
  if (notified) localStorage.setItem(SLACK_KEYS.notified, JSON.stringify(notified));
}

async function sendSlackNotification(text) {
  const { webhook } = loadSlackConfig();
  if (!webhook) return false;
  try {
    // Перевіряємо, чи ми в локальному середовищі
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      console.log('Slack notification (local mode):', text);
      return true; // Симулюємо успішне відправлення в локальному режимі
    }
    
    const res = await fetch('/.netlify/functions/notify-slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook, text }),
    });
    return res.ok;
  } catch (error) {
    console.error('Slack notification error:', error);
    return false;
  }
}

async function checkThresholdsAndNotify() {
  const { userId, notified } = loadSlackConfig();

  const lowItems = [];

  for (const item of ITEMS) {
    if (item.sizes) {
      // handle per-size thresholds for shirts
      for (const size of item.sizes) {
        const current = state[item.key][size];
        const notifKey = `${item.key}:${size}:lte:${TSHIRT_SIZE_THRESHOLD}`;
        const alreadyNotified = Boolean(notified[notifKey]);
        if (current > TSHIRT_SIZE_THRESHOLD && alreadyNotified) {
          delete notified[notifKey];
          continue;
        }
        if (current <= TSHIRT_SIZE_THRESHOLD && !alreadyNotified) {
          lowItems.push(`${item.label} ${size}`);
        }
      }
      continue;
    }

    const threshold = ITEM_THRESHOLDS[item.key];
    if (typeof threshold !== 'number') continue;

    const current = state[item.key];
    const notifKey = `${item.key}:lte:${threshold}`;
    const alreadyNotified = Boolean(notified[notifKey]);

    if (current > threshold && alreadyNotified) {
      delete notified[notifKey];
      continue;
    }

    if (current <= threshold && !alreadyNotified) {
      lowItems.push(item.label);
    }
  }

  if (lowItems.length > 0) {
    const { userId: uid } = loadSlackConfig();
    const mention = uid ? `<@${uid}> ` : '';
    const list = lowItems.length === 1
      ? lowItems[0]
      : lowItems.slice(0, -1).join(', ') + ' та ' + lowItems.slice(-1);
    const text = `${mention}Потрібно дозамовити: ${list}`;

    const ok = await sendSlackNotification(text);
    if (ok) {
      // mark all as notified
      for (const item of ITEMS) {
        if (item.sizes) {
          for (const size of item.sizes) {
            const current = state[item.key][size];
            if (current <= TSHIRT_SIZE_THRESHOLD) {
              const notifKey = `${item.key}:${size}:lte:${TSHIRT_SIZE_THRESHOLD}`;
              notified[notifKey] = true;
            }
          }
          continue;
        }
        const threshold = ITEM_THRESHOLDS[item.key];
        if (typeof threshold !== 'number') continue;
        const current = state[item.key];
        if (current <= threshold) {
          const notifKey = `${item.key}:lte:${threshold}`;
          notified[notifKey] = true;
        }
      }
    }
  }

  saveSlackConfig({ notified });
}

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function updateUI() {
  try {
    $all('.item').forEach((el) => {
      const key = el.dataset.key;
      const item = ITEMS.find((i) => i.key === key);
      if (!item) {
        console.warn('Item not found for key:', key);
        return;
      }

    if (item.sizes) {
      const gridEl = $('.sizes-grid', el);
      $all('.size', el).forEach((sizeEl) => {
        const size = sizeEl.getAttribute('data-size');
        const inputEl = $('.counter__input', sizeEl);
        if (size && inputEl) inputEl.value = String(state[key][size]);
        // ensure checkbox exists
        let chk = $('.size__check', sizeEl);
        if (!chk) {
          chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.className = 'size__check';
          const labelEl = $('.size__label', sizeEl);
          sizeEl.insertBefore(chk, labelEl);
        }
        const isSelected = chk.checked;
        sizeEl.classList.toggle('selected', isSelected);
        if (!isSelected && size) {
          applyLowStockVisual(sizeEl, state[key][size], TSHIRT_SIZE_THRESHOLD);
        } else if (isSelected) {
          sizeEl.style.backgroundColor = '';
          sizeEl.style.borderColor = '';
        }
      });
      // no grid-level selected class
      if (gridEl) gridEl.classList.remove('selected');
      el.style.backgroundColor = '';
      el.style.borderColor = '';
    } else {
      const inputEl = $('.counter__input', el);
      if (inputEl) inputEl.value = String(state[key]);
      const threshold = getThresholdForKey(key);
      applyLowStockVisual(el, state[key], threshold);
    }
  });

  $('#boxesCount').textContent = String(composedBoxes);
  checkThresholdsAndNotify();
  } catch (error) {
    console.error('Error updating UI:', error);
  }
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
  console.log('Compose box clicked');
  const messageEl = $('#message');
  const requested = 1; // always compose one box per click

  if (!canComposeBox()) {
    console.log('Cannot compose box - insufficient items');
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

  let successful = 0;
  for (let n = 0; n < requested; n += 1) {
    if (!canComposeBox()) break;

    const entry = { whites: null, blacks: null, others: [] };

    // White tee: prefer selected size
    const whiteOrder = ['tshirt_white_male', 'tshirt_white_female'];
    let decrementedWhite = false;
    for (const k of whiteOrder) {
      const sectionEl = document.querySelector(`.item[data-key="${k}"]`);
      const selectedChk = sectionEl ? $('.size__check:checked', sectionEl) : null;
      if (selectedChk) {
        const sizeEl = selectedChk.closest('.size');
        const size = sizeEl?.getAttribute('data-size');
        if (size && state[k][size] > 0) { state[k][size] -= 1; entry.whites = { key: k, size }; decrementedWhite = true; break; }
      }
    }
    if (!decrementedWhite) {
      for (const k of whiteOrder) {
        const sizes = ITEMS.find((i) => i.key === k).sizes;
        for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
          const size = sizes[idx];
          if (state[k][size] > 0) { state[k][size] -= 1; entry.whites = { key: k, size }; decrementedWhite = true; break; }
        }
        if (decrementedWhite) break;
      }
    }

    // Black tee: prefer selected size
    const blackOrder = ['tshirt_black_male', 'tshirt_black_female'];
    let decrementedBlack = false;
    for (const k of blackOrder) {
      const sectionEl = document.querySelector(`.item[data-key="${k}"]`);
      const selectedChk = sectionEl ? $('.size__check:checked', sectionEl) : null;
      if (selectedChk) {
        const sizeEl = selectedChk.closest('.size');
        const size = sizeEl?.getAttribute('data-size');
        if (size && state[k][size] > 0) { state[k][size] -= 1; entry.blacks = { key: k, size }; decrementedBlack = true; break; }
      }
    }
    if (!decrementedBlack) {
      for (const k of blackOrder) {
        const sizes = ITEMS.find((i) => i.key === k).sizes;
        for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
          const size = sizes[idx];
          if (state[k][size] > 0) { state[k][size] -= 1; entry.blacks = { key: k, size }; decrementedBlack = true; break; }
        }
        if (decrementedBlack) break;
      }
    }

    // Other items
    ITEMS.forEach((item) => {
      if (item.key.startsWith('tshirt_')) return;
      if (item.sizes) {
        const sizesOrder = item.sizes;
        for (let idx = sizesOrder.length - 1; idx >= 0; idx -= 1) {
          const size = sizesOrder[idx];
          if (state[item.key][size] > 0) { state[item.key][size] -= 1; entry.others.push({ key: item.key, size }); break; }
        }
      } else {
        state[item.key] -= 1; entry.others.push({ key: item.key });
      }
    });

    successful += 1;
    pushUndoEntry(entry);
  }

  composedBoxes += successful;
  console.log(`Successfully composed ${successful} boxes`);
  
  if (successful === requested) {
    messageEl.textContent = successful === 1 ? 'Бокс складено!' : `Складено боксів: ${successful}`;
  } else if (successful > 0) {
    messageEl.textContent = `Складено боксів: ${successful}. Далі не вистачає компонентів.`;
  } else {
    messageEl.textContent = 'Недостатньо компонентів.';
  }

  // Clear selected sizes after composing
  if (successful > 0) {
    ['tshirt_white_male','tshirt_white_female','tshirt_black_male','tshirt_black_female'].forEach((k) => {
      const sectionEl = document.querySelector(`.item[data-key="${k}"]`);
      if (sectionEl) {
        $all('.size__check', sectionEl).forEach((c) => { c.checked = false; });
      }
    });
  }

  saveAppState();
  updateUI();
}

function undoLastCompose() {
  const entry = undoStack.pop();
  if (!entry) {
    console.log('No operations to undo');
    return;
  }
  console.log('Undoing:', entry);
  revertComposeEntry(entry);
  composedBoxes = Math.max(0, composedBoxes - 1);
  saveAppState();
  updateUI();
}

function attachHandlers() {
  console.log('Attaching event handlers...');
  const composeBtn = $('#composeBtn');
  if (composeBtn) {
    composeBtn.addEventListener('click', composeBox);
    console.log('Compose button handler attached');
  } else {
    console.error('Compose button not found!');
  }
  
  const undoBtn = $('#undoBtn');
  if (undoBtn) {
    undoBtn.addEventListener('click', undoLastCompose);
    console.log('Undo button handler attached');
  } else {
    console.warn('Undo button not found');
  }

  $all('.item').forEach((el) => {
    const key = el.dataset.key;
    const item = ITEMS.find((i) => i.key === key);
    el.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const action = target.getAttribute('data-action');
      if (!item?.sizes) {
        if (action === 'increment') increment(key);
        if (action === 'decrement') decrement(key);
      } else {
        // For sized items, detect the size container
        const sizeEl = target.closest('.size');
        if (!sizeEl) return;
        const size = sizeEl.getAttribute('data-size');
        if (!size) return;
        if (target.classList.contains('size__check')) {
          // exclusive selection inside the group
          $all('.size__check', el).forEach((c) => { if (c !== target) c.checked = false; });

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
              $all('.size__check', mirrorSection).forEach((c) => { if (c !== target) c.checked = false; });
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
        if (action === 'increment') {
          state[key][size] += 1;
          updateUI();
        }
        if (action === 'decrement') {
          if (state[key][size] > 0) {
            state[key][size] -= 1;
            updateUI();
          }
        }
      }
    });

    if (!item?.sizes) {
      const inputEl = $('.counter__input', el);
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          const raw = inputEl.value.trim();
          const parsed = Math.max(0, Number.parseInt(raw === '' ? '0' : raw, 10));
          state[key] = Number.isFinite(parsed) ? parsed : 0;
          updateUI();
        });

        inputEl.addEventListener('blur', () => {
          const normalized = Math.max(0, Number.parseInt(inputEl.value || '0', 10));
          state[key] = Number.isFinite(normalized) ? normalized : 0;
          updateUI();
        });
      }
    } else {
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
        inputEl.addEventListener('blur', () => {
          const normalized = Math.max(0, Number.parseInt(inputEl.value || '0', 10));
          state[key][size] = Number.isFinite(normalized) ? normalized : 0;
          updateUI();
        });
      });
    }
  });

  // Slack settings handlers
  const webhookInput = $('#slackWebhook');
  const userIdInput = $('#slackUserId');
  const saveBtn = $('#saveSlack');
  const savedMsg = $('#slackSavedMsg');
  const { webhook, userId } = loadSlackConfig();
  if (webhookInput) webhookInput.value = webhook;
  if (userIdInput) userIdInput.value = userId;
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveSlackConfig({ webhook: webhookInput.value.trim(), userId: userIdInput.value.trim() });
      savedMsg.textContent = 'Збережено.';
      setTimeout(() => (savedMsg.textContent = ''), 2000);
    });
  }
}

const STATE_KEYS = {
  inventory: 'tracker_inventory_state_v1',
  boxes: 'tracker_composed_boxes_v1',
  shirtsSeed: 'tracker_shirts_seed_v1',
};

function saveAppState() {
  try {
    localStorage.setItem(STATE_KEYS.inventory, JSON.stringify(state));
    localStorage.setItem(STATE_KEYS.boxes, String(composedBoxes));
  } catch (_) {}
}

// One-time seeding of shirt sizes as requested
function seedShirtSizesIfNotSeeded() {
  try {
    if (localStorage.getItem(STATE_KEYS.shirtsSeed)) return;
    const shirts = {
      // Жіночі
      tshirt_black_female: { XS: 19, S: 14, M: 7, L: 14, XL: 7, XXL: 11 },
      tshirt_white_female: { XS: 16, S: 16, M: 8, L: 15, XL: 10, XXL: 10 },
      // Чоловічі (без XS)
      tshirt_black_male: { S: 14, M: 12, L: 15, XL: 5, XXL: 11 },
      tshirt_white_male: { S: 15, M: 14, L: 9, XL: 9, XXL: 6 },
    };
    Object.entries(shirts).forEach(([key, sizes]) => {
      if (!state[key]) return;
      Object.entries(sizes).forEach(([size, qty]) => {
        if (typeof state[key][size] === 'number') state[key][size] = qty;
      });
    });
    saveAppState();
    localStorage.setItem(STATE_KEYS.shirtsSeed, '1');
  } catch (_) {}
}

function loadAppState() {
  try {
    const s = localStorage.getItem(STATE_KEYS.inventory);
    if (s) {
      const parsed = JSON.parse(s);
      // Merge only known keys to be safe
      ITEMS.forEach((item) => {
        if (item.sizes) {
          const src = parsed[item.key] || {};
          item.sizes.forEach((sz) => {
            const val = Number.parseInt(src[sz] ?? 0, 10);
            state[item.key][sz] = Number.isFinite(val) ? val : 0;
          });
        } else {
          const val = Number.parseInt(parsed[item.key] ?? 0, 10);
          state[item.key] = Number.isFinite(val) ? val : 0;
        }
      });
    }
    const b = localStorage.getItem(STATE_KEYS.boxes);
    if (b) composedBoxes = Number.parseInt(b, 10) || 0;
  } catch (_) {}
}

function seedInitialInventoryIfEmpty() {
  const exists = localStorage.getItem(STATE_KEYS.inventory);
  if (exists) return;
  const seed = {
    notebook: 88,
    water_bottle: 11,
    pen: 102,
    pen_pad: 43,
    box: 7,
    lanyard: 98,
    badge: 57,
    stickers: 100,
    postcards: 35,
  };
  Object.entries(seed).forEach(([k, v]) => {
    if (typeof state[k] === 'number') state[k] = v;
  });
  saveAppState();
}

// Stack for undo operations (each entry stores one compose application)
const undoStack = [];

function pushUndoEntry(entry) {
  undoStack.push(entry);
  if (undoStack.length > 100) undoStack.shift();
}

function applyComposeDecrement(entry) {
  // entry: { whites: {key,size}, blacks: {key,size}, others: [{key,size?}] }
  if (entry.whites) {
    const { key, size } = entry.whites;
    if (size) state[key][size] -= 1; else state[key] -= 1;
  }
  if (entry.blacks) {
    const { key, size } = entry.blacks;
    if (size) state[key][size] -= 1; else state[key] -= 1;
  }
  entry.others?.forEach((o) => {
    if (o.size) state[o.key][o.size] -= 1; else state[o.key] -= 1;
  });
}

function revertComposeEntry(entry) {
  if (entry.whites) {
    const { key, size } = entry.whites;
    if (size) state[key][size] += 1; else state[key] += 1;
  }
  if (entry.blacks) {
    const { key, size } = entry.blacks;
    if (size) state[key][size] += 1; else state[key] += 1;
  }
  entry.others?.forEach((o) => {
    if (o.size) state[o.key][o.size] += 1; else state[o.key] += 1;
  });
}

function init() {
  try {
    console.log('Initializing app...');
    loadAppState();
    seedInitialInventoryIfEmpty();
    seedShirtSizesIfNotSeeded();
    attachHandlers();
    updateUI();
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

document.addEventListener('DOMContentLoaded', init);


