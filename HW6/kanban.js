/**
 * kanban.js
 * Kanban board logic: in-memory ticket store, rendering, drag & drop
 * between the 3 panels, per-ticket 3-dot menu (move / copy / delete),
 * long-description collapse, add-ticket modal, and a simple search filter.
 */

const STATUSES = ['todo', 'inProgress', 'done'];
const STATUS_LABELS = {
  todo: 'To Do',
  inProgress: 'In Progress',
  done: 'Done'
};

let tickets = [
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

let searchQuery = '';
let idCounter = tickets.length + 1;

function generateId() {
  idCounter += 1;
  return 't' + idCounter + '-' + Date.now();
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

  node.querySelector('.ticket-title').textContent = ticket.title;
  node.querySelector('.ticket-description').textContent = ticket.description || '';

  const dropdownId = 'dropdown-' + ticket.id;
  const trigger = node.querySelector('.ticket-menu-trigger');
  trigger.setAttribute('data-target', dropdownId);

  const dropdownEl = node.querySelector('.ticket-dropdown');
  dropdownEl.id = dropdownId;

  const others = otherStatuses(ticket.status);
  const move1 = node.querySelector('.ticket-menu-move-1');
  const move2 = node.querySelector('.ticket-menu-move-2');
  move1.querySelector('span').textContent = 'Move to ' + STATUS_LABELS[others[0]];
  move1.addEventListener('click', function (e) {
    e.preventDefault();
    moveTicket(ticket.id, others[0]);
  });
  move2.querySelector('span').textContent = 'Move to ' + STATUS_LABELS[others[1]];
  move2.addEventListener('click', function (e) {
    e.preventDefault();
    moveTicket(ticket.id, others[1]);
  });

  node.querySelector('.ticket-menu-copy').addEventListener('click', function (e) {
    e.preventDefault();
    copyTicket(ticket.id);
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
  render();
  toast('Moved "' + ticket.title + '" to ' + STATUS_LABELS[newStatus]);
}

function copyTicket(id) {
  const ticket = findTicket(id);
  if (!ticket) return;
  tickets.push({
    id: generateId(),
    title: ticket.title + ' (copy)',
    description: ticket.description,
    status: ticket.status
  });
  render();
  toast('Copied "' + ticket.title + '"');
}

function deleteTicket(id) {
  const ticket = findTicket(id);
  if (!ticket) return;
  tickets = tickets.filter(function (t) { return t.id !== id; });
  render();
  toast('Deleted "' + ticket.title + '"');
}

function addTicket(title, description, status) {
  tickets.push({
    id: generateId(),
    title: title,
    description: description,
    status: status
  });
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

/* ---------- Add ticket modal ---------- */

function initAddModal() {
  const modalEl = document.getElementById('ticketModal');
  const modalInstance = M.Modal.init(modalEl, {});

  function openModal() {
    document.getElementById('ticketForm').reset();
    M.updateTextFields();
    M.FormSelect.init(document.getElementById('ticketStatus'));
    modalInstance.open();
  }

  document.getElementById('openAddModalBtn').addEventListener('click', function (e) {
    e.preventDefault();
    openModal();
  });
  document.getElementById('openAddModalBtnMobile').addEventListener('click', function (e) {
    e.preventDefault();
    openModal();
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
    modalInstance.close();
  });
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

  initDropzones();
  initAddModal();
  initSearch();
  render();
});
