const ITEMS = [
  { key: 'pen', label: 'Ручка' },
  { key: 'pen_holders', label: 'Тримачі для ручок' },
  { key: 'tshirt_white_male', label: 'Футболка біла чоловіча', sizes: ['XS','S','M','L','XL','XXL'] },
  { key: 'tshirt_white_female', label: 'Футболка біла жіноча', sizes: ['XS','S','M','L','XL','XXL'] },
  { key: 'tshirt_black_male', label: 'Футболка чорна чоловіча', sizes: ['XS','S','M','L','XL','XXL'] },
  { key: 'tshirt_black_female', label: 'Футболка чорна жіноча', sizes: ['XS','S','M','L','XL','XXL'] },
  { key: 'notebook', label: 'Блокнот' },
  { key: 'box', label: 'Бокс' },
  { key: 'stickers', label: 'Наліпки' },
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
    const res = await fetch('/.netlify/functions/notify-slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook, text }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function checkThresholdsAndNotify() {
  const { userId, notified } = loadSlackConfig();
  const threshold = 10;

  for (const item of ITEMS) {
    let current = 0;
    if (item.sizes) {
      current = Object.values(state[item.key]).reduce((a, b) => a + b, 0);
    } else {
      current = state[item.key];
    }

    const notifKey = `${item.key}:lte:${threshold}`;
    const alreadyNotified = Boolean(notified[notifKey]);
    if (current <= threshold && !alreadyNotified) {
      const mention = userId ? `<@${userId}> ` : '';
      const text = `${mention}${item.label}: ${current} шт, потрібно замовити`;
      const ok = await sendSlackNotification(text);
      if (ok) {
        notified[notifKey] = true;
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
  $all('.item').forEach((el) => {
    const key = el.dataset.key;
    const item = ITEMS.find((i) => i.key === key);
    if (!item) return;

    if (item.sizes) {
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
      });
    } else {
      const inputEl = $('.counter__input', el);
      if (inputEl) inputEl.value = String(state[key]);
    }
  });

  $('#boxesCount').textContent = String(composedBoxes);
  checkThresholdsAndNotify();
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
  const messageEl = $('#message');
  const countInput = $('#composeCount');
  const requested = Math.max(1, Number.parseInt((countInput?.value || '1').trim(), 10) || 1);

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

  let successful = 0;
  for (let n = 0; n < requested; n += 1) {
    if (!canComposeBox()) break;

    // White tee: prefer selected size
    const whiteOrder = ['tshirt_white_male', 'tshirt_white_female'];
    let decrementedWhite = false;
    for (const k of whiteOrder) {
      const sectionEl = document.querySelector(`.item[data-key="${k}"]`);
      const selectedChk = sectionEl ? $('.size__check:checked', sectionEl) : null;
      if (selectedChk) {
        const sizeEl = selectedChk.closest('.size');
        const size = sizeEl?.getAttribute('data-size');
        if (size && state[k][size] > 0) { state[k][size] -= 1; decrementedWhite = true; break; }
      }
    }
    if (!decrementedWhite) {
      for (const k of whiteOrder) {
        const sizes = ITEMS.find((i) => i.key === k).sizes;
        for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
          const size = sizes[idx];
          if (state[k][size] > 0) { state[k][size] -= 1; decrementedWhite = true; break; }
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
        if (size && state[k][size] > 0) { state[k][size] -= 1; decrementedBlack = true; break; }
      }
    }
    if (!decrementedBlack) {
      for (const k of blackOrder) {
        const sizes = ITEMS.find((i) => i.key === k).sizes;
        for (let idx = sizes.length - 1; idx >= 0; idx -= 1) {
          const size = sizes[idx];
          if (state[k][size] > 0) { state[k][size] -= 1; decrementedBlack = true; break; }
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
          if (state[item.key][size] > 0) { state[item.key][size] -= 1; break; }
        }
      } else {
        state[item.key] -= 1;
      }
    });

    successful += 1;
  }

  composedBoxes += successful;
  if (successful === requested) {
    messageEl.textContent = successful === 1 ? 'Бокс складено!' : `Складено боксів: ${successful}`;
  } else if (successful > 0) {
    messageEl.textContent = `Складено боксів: ${successful}. Далі не вистачає компонентів.`;
  } else {
    messageEl.textContent = 'Недостатньо компонентів.';
  }
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

function init() {
  attachHandlers();
  updateUI();
}

document.addEventListener('DOMContentLoaded', init);


