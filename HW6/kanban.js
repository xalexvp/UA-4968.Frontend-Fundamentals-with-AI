/**
 * kanban.js
 * Kanban board logic: localStorage-backed ticket store, rendering,
 * drag & drop between the 3 panels, per-ticket 3-dot menu
 * (edit title, edit description, move, copy-with-confirmation, delete),
 * status icons & background colors, long-description collapse,
 * add-ticket modal, and a simple search filter.
 */

const STATUSES = ['todo', 'inProgress', 'done'];
const STATUS_LABELS = {
  todo: 'To Do',
  inProgress: 'In Progress',
  done: 'Done'
};
const STATUS_ICONS = {
  todo: 'assignment',
  inProgress: 'autorenew',
  done: 'check_circle'
};
const STORAGE_KEY = 'kanbanTickets';

const seedTickets = [
  {
    id: 't1',
    title: 'Set up project repository',
    description: 'Initialize the repo, add .gitignore, README, and base folder structure.',
    status: 'todo'
  },
  {
    id: 't2',
    title: 'Design database schema',
    description: 'Draft the tables for users, tickets, and boards. Decide on relationships, indexes, and which fields are nullable. Review with the backend team before implementation starts, and keep migration scripts versioned.',
    status: 'todo'
  },
  {
    id: 't3',
    title: 'Build authentication flow',
    description: 'Login, signup, and password reset screens.',
    status: 'inProgress'
  },
  {
    id: 't4',
    title: 'Write onboarding docs',
    description: 'Short guide for new contributors: how to run the project locally, coding conventions, and how to submit a pull request. Include a troubleshooting section for common setup issues.',
    status: 'inProgress'
  },
  {
    id: 't5',
    title: 'Ship v1.0',
    description: 'Tag the release and publish changelog.',
    status: 'done'
  }
];

let tickets = [];
let searchQuery = '';

/* Tracks what the "edit title" / "edit description" modals are currently acting on */
let activeEditTicketId = null;

/* ---------- Persistence ---------- */

function loadTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        tickets = parsed;
        return;
      }
    }
  } catch (e) {
    console.warn('Could not read tickets from localStorage, using defaults.', e);
  }
  tickets = seedTickets.map(function (t) { return Object.assign({}, t); });
}

function saveTickets() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.warn('Could not save tickets to localStorage.', e);
  }
}

function generateId() {
  return 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

function otherStatuses(currentStatus) {
  return STATUSES.filter(function (s) { return s !== currentStatus; });
}

function findTicket(id) {
  return tickets.find(function (t) { return t.id === id; });
}

/* ---------- Rendering ---------- */

function render() {
  STATUSES.forEach(function (status) {
    const container = document.getElementById('list-' + status);
    container.innerHTML = '';

    const ticketsInColumn = tickets.filter(function (t) {
      const matchesStatus = t.status === status;
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    document.getElementById('count-' + status).textContent =
      tickets.filter(function (t) { return t.status === status; }).length;

    if (ticketsInColumn.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'No tickets here.';
      container.appendChild(hint);
      return;
    }

    ticketsInColumn.forEach(function (ticket) {
      container.appendChild(buildTicketCard(ticket));
    });
  });

  initDropdowns();
  applyDescriptionCollapse();
}

function buildTicketCard(ticket) {
  const template = document.getElementById('ticketCardTemplate');
  const node = template.content.cloneNode(true);

  const cardEl = node.querySelector('.ticket-card');
  cardEl.dataset.id = ticket.id;
  cardEl.classList.add('status-' + ticket.status);

  node.querySelector('.ticket-status-icon').textContent = STATUS_ICONS[ticket.status];
  node.querySelector('.ticket-title').textContent = ticket.title;
  node.querySelector('.ticket-description').textContent = ticket.description || '';

  const dropdownId = 'dropdown-' + ticket.id;
  const trigger = node.querySelector('.ticket-menu-trigger');
  trigger.setAttribute('data-target', dropdownId);

  const dropdownEl = node.querySelector('.ticket-dropdown');
  dropdownEl.id = dropdownId;

  node.querySelector('.ticket-menu-edit-title').addEventListener('click', function (e) {
    e.preventDefault();
    openEditTitleModal(ticket.id);
  });

  node.querySelector('.ticket-menu-edit-description').addEventListener('click', function (e) {
    e.preventDefault();
    openEditDescriptionModal(ticket.id);
  });

  const others = otherStatuses(ticket.status);
  const move1 = node.querySelector('.ticket-menu-move-1');
  const move2 = node.querySelector('.ticket-menu-move-2');

  move1.querySelector('i').textContent = STATUS_ICONS[others[0]];
  move1.querySelector('span').textContent = 'Move to ' + STATUS_LABELS[others[0]];
  move1.addEventListener('click', function (e) {
    e.preventDefault();
    moveTicket(ticket.id, others[0]);
  });

  move2.querySelector('i').textContent = STATUS_ICONS[others[1]];
  move2.querySelector('span').textContent = 'Move to ' + STATUS_LABELS[others[1]];
  move2.addEventListener('click', function (e) {
    e.preventDefault();
    moveTicket(ticket.id, others[1]);
  });

  node.querySelector('.ticket-menu-copy').addEventListener('click', function (e) {
    e.preventDefault();
    openCopyModal(ticket.id);
  });

  node.querySelector('.ticket-menu-delete').addEventListener('click', function (e) {
    e.preventDefault();
    deleteTicket(ticket.id);
  });

  cardEl.addEventListener('dragstart', function (e) {
    e.dataTransfer.setData('text/plain', ticket.id);
    e.dataTransfer.effectAllowed = 'move';
    cardEl.classList.add('dragging');
  });
  cardEl.addEventListener('dragend', function () {
    cardEl.classList.remove('dragging');
  });

  return node;
}

function initDropdowns() {
  const triggers = document.querySelectorAll('.ticket-menu-trigger');
  M.Dropdown.init(triggers, {
    constrainWidth: false,
    coverTrigger: false,
    alignment: 'right'
  });
}

/* Collapse descriptions longer than 3 lines */
function applyDescriptionCollapse() {
  document.querySelectorAll('.ticket-description-wrapper').forEach(function (wrapper) {
    const desc = wrapper.querySelector('.ticket-description');
    const toggle = wrapper.querySelector('.ticket-toggle-desc');

    desc.classList.remove('collapsed');
    toggle.style.display = 'none';
    toggle.textContent = 'Show more';

    const lineHeight = parseFloat(getComputedStyle(desc).lineHeight);
    const maxCollapsedHeight = lineHeight * 3;

    if (desc.scrollHeight > maxCollapsedHeight + 1) {
      desc.classList.add('collapsed');
      toggle.style.display = 'inline-block';
    }

    toggle.onclick = function (e) {
      e.preventDefault();
      const isCollapsed = desc.classList.toggle('collapsed');
      toggle.textContent = isCollapsed ? 'Show more' : 'Show less';
    };
  });
}

/* ---------- Ticket actions ---------- */

function moveTicket(id, newStatus) {
  const ticket = findTicket(id);
  if (!ticket) return;
  ticket.status = newStatus;
  saveTickets();
  render();
  toast('Moved "' + ticket.title + '" to ' + STATUS_LABELS[newStatus]);
}

function deleteTicket(id) {
  const ticket = findTicket(id);
  if (!ticket) return;
  tickets = tickets.filter(function (t) { return t.id !== id; });
  saveTickets();
  render();
  toast('Deleted "' + ticket.title + '"');
}

function updateTicketTitle(id, newTitle) {
  const ticket = findTicket(id);
  if (!ticket) return;
  ticket.title = newTitle;
  saveTickets();
  render();
  toast('Title updated');
}

function updateTicketDescription(id, newDescription) {
  const ticket = findTicket(id);
  if (!ticket) return;
  ticket.description = newDescription;
  saveTickets();
  render();
  toast('Description updated');
}

function addTicket(title, description, status) {
  tickets.push({
    id: generateId(),
    title: title,
    description: description,
    status: status
  });
  saveTickets();
  render();
  toast('Added "' + title + '"');
}

function toast(message) {
  M.toast({ html: message, displayLength: 2200 });
}

/* ---------- Drag & drop on dropzones ---------- */

function initDropzones() {
  document.querySelectorAll('.board-dropzone').forEach(function (zone) {
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const ticketId = e.dataTransfer.getData('text/plain');
      const newStatus = zone.dataset.status;
      moveTicket(ticketId, newStatus);
    });
  });
}

/* ---------- Add / Copy ticket modal (shared) ---------- */

let ticketModalInstance = null;
let ticketModalMode = 'add'; // 'add' | 'copy'

function initTicketModal() {
  ticketModalInstance = M.Modal.init(document.getElementById('ticketModal'), {});

  function openModal(mode, prefill) {
    ticketModalMode = mode;
    document.getElementById('ticketForm').reset();

    const titleInput = document.getElementById('ticketTitle');
    const descriptionInput = document.getElementById('ticketDescription');
    const statusSelect = document.getElementById('ticketStatus');
    const heading = document.getElementById('ticketModalHeading');
    const saveBtn = document.getElementById('saveTicketBtn');

    if (mode === 'copy' && prefill) {
      titleInput.value = prefill.title;
      descriptionInput.value = prefill.description || '';
      statusSelect.value = prefill.status;
      heading.textContent = 'Copy Ticket';
      saveBtn.textContent = 'Add Copy';
    } else {
      titleInput.value = '';
      descriptionInput.value = '';
      statusSelect.value = 'todo';
      heading.textContent = 'New Ticket';
      saveBtn.textContent = 'Add Ticket';
    }

    M.updateTextFields();
    M.FormSelect.init(statusSelect);
    titleInput.classList.remove('invalid');
    ticketModalInstance.open();
  }

  document.getElementById('openAddModalBtn').addEventListener('click', function (e) {
    e.preventDefault();
    openModal('add', null);
  });
  document.getElementById('openAddModalBtnMobile').addEventListener('click', function (e) {
    e.preventDefault();
    openModal('add', null);
    const sidenavInstance = M.Sidenav.getInstance(document.getElementById('mobile-nav'));
    if (sidenavInstance) sidenavInstance.close();
  });

  document.getElementById('saveTicketBtn').addEventListener('click', function () {
    const titleInput = document.getElementById('ticketTitle');
    const descriptionInput = document.getElementById('ticketDescription');
    const statusSelect = document.getElementById('ticketStatus');

    const title = titleInput.value.trim();
    if (!title) {
      titleInput.classList.add('invalid');
      return;
    }

    addTicket(title, descriptionInput.value.trim(), statusSelect.value);
    ticketModalInstance.close();
  });

  window.openAddTicketModal = function () { openModal('add', null); };
  window.openCopyTicketModal = function (prefill) { openModal('copy', prefill); };
}

function openCopyModal(id) {
  const ticket = findTicket(id);
  if (!ticket) return;
  window.openCopyTicketModal({
    title: ticket.title + ' (copy)',
    description: ticket.description,
    status: ticket.status
  });
}

/* ---------- Edit title / description modals ---------- */

let editTitleModalInstance = null;
let editDescriptionModalInstance = null;

function initEditModals() {
  editTitleModalInstance = M.Modal.init(document.getElementById('editTitleModal'), {});
  editDescriptionModalInstance = M.Modal.init(document.getElementById('editDescriptionModal'), {});

  document.getElementById('saveTitleBtn').addEventListener('click', function () {
    const input = document.getElementById('editTitleInput');
    const value = input.value.trim();
    if (!value || !activeEditTicketId) return;
    updateTicketTitle(activeEditTicketId, value);
    editTitleModalInstance.close();
  });

  document.getElementById('saveDescriptionBtn').addEventListener('click', function () {
    const textarea = document.getElementById('editDescriptionInput');
    if (!activeEditTicketId) return;
    updateTicketDescription(activeEditTicketId, textarea.value.trim());
    editDescriptionModalInstance.close();
  });
}

function openEditTitleModal(id) {
  const ticket = findTicket(id);
  if (!ticket) return;
  activeEditTicketId = id;
  const input = document.getElementById('editTitleInput');
  input.value = ticket.title;
  M.updateTextFields();
  editTitleModalInstance.open();
}

function openEditDescriptionModal(id) {
  const ticket = findTicket(id);
  if (!ticket) return;
  activeEditTicketId = id;
  const textarea = document.getElementById('editDescriptionInput');
  textarea.value = ticket.description || '';
  M.updateTextFields();
  editDescriptionModalInstance.open();
}

/* ---------- Search ---------- */

function initSearch() {
  document.getElementById('searchInput').addEventListener('input', function (e) {
    searchQuery = e.target.value;
    render();
  });
}

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', function () {
  M.Sidenav.init(document.querySelectorAll('.sidenav-trigger'), {});
  M.FormSelect.init(document.querySelectorAll('select'));

  loadTickets();
  initDropzones();
  initTicketModal();
  initEditModals();
  initSearch();
  render();
});
