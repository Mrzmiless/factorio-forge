// Renderer process logic

// window controls
function setupWindowControls() {
  document.getElementById('min-btn')?.addEventListener('click', () => {
    (window as any).api.window.minimize();
  });
  document.getElementById('max-btn')?.addEventListener('click', () => {
    (window as any).api.window.maximize();
  });
  document.getElementById('close-btn')?.addEventListener('click', () => {
    (window as any).api.window.close();
  });
}

type ToastType = 'info' | 'success' | 'error';

function showToast(message: string, type: ToastType = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.classList.add('toast', `toast-${type}`);
  toast.textContent = message;

  container.appendChild(toast);

  // permitir que o browser aplique o layout antes da animação
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

async function ensureFactorioPath(forcePrompt = false): Promise<boolean> {
  try {
    const validate = await (window as any).api.invoke('validate-factorio-path');
    const pathInput = document.getElementById('factorio-path') as HTMLInputElement | null;

    if (!forcePrompt && validate && validate.exists) {
      if (pathInput && validate.path) {
        pathInput.value = validate.path;
      }
      updateFactorioStatus(validate.exists);
      return true;
    }

    // pedir ao utilizador para localizar o executável
    const res = await (window as any).api.invoke('choose-factorio-exe');
    if (res?.canceled) {
      updateFactorioStatus(false);
      return false;
    }
    if (res?.error) {
      showToast(res.error, 'error');
      updateFactorioStatus(false);
      return false;
    }

    if (pathInput && res?.path) {
      pathInput.value = res.path;
    }
    updateFactorioStatus(true);
    return true;
  } catch (e) {
    console.error('Erro ao validar/procurar Factorio', e);
    return false;
  }
}

async function launchInstance(name: string) {
  const ok = await ensureFactorioPath(false);
  if (!ok) {
    showToast('É necessário indicar o executável do Factorio antes de iniciar uma instância.', 'error');
    return;
  }

  const res = await (window as any).api.invoke('launch-instance', name);
  if (res && res.error) {
    showToast('Erro ao iniciar instância: ' + res.error, 'error');
  }
}

async function reloadInstances() {
  const listEl = document.getElementById('instance-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  const instances = await (window as any).api.invoke('list-instances');
  if (!instances || instances.length === 0) {
    const empty = document.createElement('div');
    empty.classList.add('empty-state');
    empty.innerHTML = '<h3>Sem instâncias ainda</h3><p>Crie uma nova instância para começar a jogar com um ambiente isolado.</p>';
    listEl.appendChild(empty);
    return;
  }

  instances.forEach((inst: any) => {
    const card = document.createElement('div');
    card.classList.add('instance-card');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = inst.name + (inst.version ? ' (' + inst.version + ')' : '');

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Iniciar';
    startBtn.addEventListener('click', () => {
      launchInstance(inst.name);
    });
    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Renomear';
    renameBtn.addEventListener('click', async () => {
      const newName = await promptModal('Novo nome para a instância', inst.name);
      if (newName && newName !== inst.name) {
        await (window as any).api.invoke('rename-instance', inst.name, newName);
        reloadInstances();
      }
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Remover';
    delBtn.addEventListener('click', async () => {
      if (await confirmModal('Deseja eliminar a instância ' + inst.name + '?')) {
        await (window as any).api.invoke('delete-instance', inst.name);
        reloadInstances();
      }
    });
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Abrir pasta';
    openBtn.addEventListener('click', () => {
      (window as any).api.invoke('open-instance-folder', inst.name);
    });

    actions.appendChild(startBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);
    actions.appendChild(openBtn);

    card.appendChild(nameSpan);
    card.appendChild(actions);
    listEl.appendChild(card);
  });
}



function setupNavigation() {
  // only wire top-level navigation links that have a data-page attribute
  const links = document.querySelectorAll('.sidebar a[data-page]');
  links.forEach(l => {
    l.addEventListener('click', e => {
      e.preventDefault();
      links.forEach(x => x.classList.remove('active'));
      (l as HTMLElement).classList.add('active');
      const page = (l as HTMLElement).getAttribute('data-page');
      showPage(page || 'instances');
    });
  });
}

function showPage(page: string) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => (p as HTMLElement).style.display = 'none');
  const target = document.getElementById('page-' + page);
  if (target) target.style.display = 'block';
}

function showModal(html: string) {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  if (body && modal) {
    body.innerHTML = html;
    modal.style.display = 'flex';
  }
}

function hideModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.style.display = 'none';
}

function confirmModal(message: string): Promise<boolean> {
  return new Promise(resolve => {
    const html = `<p>${message}</p><div style="text-align:right;"><button id='conf-yes'>Sim</button><button id='conf-no'>Não</button></div>`;
    showModal(html);
    const yes = document.getElementById('conf-yes');
    const no = document.getElementById('conf-no');
    yes?.addEventListener('click', () => { hideModal(); resolve(true); });
    no?.addEventListener('click', () => { hideModal(); resolve(false); });
  });
}

function promptModal(message: string, defaultVal = ''): Promise<string | null> {
  return new Promise(resolve => {
    const html = `<p>${message}</p><input id='prompt-input' value='${defaultVal}' style='width:100%;margin:8px 0;' /><div style="text-align:right;"><button id='prompt-ok'>OK</button><button id='prompt-cancel'>Cancelar</button></div>`;
    showModal(html);
    const ok = document.getElementById('prompt-ok');
    const cancel = document.getElementById('prompt-cancel');
    ok?.addEventListener('click', () => {
      const input = document.getElementById('prompt-input') as HTMLInputElement;
      hideModal();
      resolve(input?.value ?? null);
    });
    cancel?.addEventListener('click', () => {
      hideModal();
      resolve(null);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const close = document.getElementById('modal-close');
  close?.addEventListener('click', hideModal);
});

async function loadVersions() {
  const sel = document.getElementById('version-select') as HTMLSelectElement;
  if (!sel) return;
  const versions = await (window as any).api.invoke('list-versions');
  sel.innerHTML = '';
  versions.forEach((v: string) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupWindowControls();
  setupNavigation();
  showPage('instances');
  reloadInstances();
  loadVersions();
  loadFactorioPath();

  // sidebar submenu: open create instance modal
  const createSub = document.getElementById('create-submenu');
  createSub?.addEventListener('click', async (e) => {
    e.preventDefault();
    await showCreateInstanceModal();
  });

  const savePathBtn = document.getElementById('save-path');
  const pathInput = document.getElementById('factorio-path') as HTMLInputElement;
  savePathBtn?.addEventListener('click', async () => {
    if (pathInput && pathInput.value) {
      await (window as any).api.invoke('set-factorio-path', pathInput.value.trim());
      showToast('Caminho do Factorio guardado.', 'success');
    } else {
      showToast('Indique um caminho válido para o executável do Factorio.', 'error');
    }
  });

  const importBtn = document.getElementById('import-version');
  importBtn?.addEventListener('click', async () => {
    const res = await (window as any).api.invoke('import-version');
    if (res.success) {
      loadVersions();
      showToast('Versão importada com sucesso.', 'success');
    } else if (res.error) {
      showToast('Falha ao importar: ' + res.error, 'error');
    }
  });

  const browsePathBtn = document.getElementById('browse-path');
  browsePathBtn?.addEventListener('click', async () => {
    await ensureFactorioPath(true);
  });
});

async function loadFactorioPath() {
  const p = await (window as any).api.invoke('get-factorio-path');
  const input = document.getElementById('factorio-path') as HTMLInputElement;
  if (input && p) input.value = p;
  const validate = await (window as any).api.invoke('validate-factorio-path');
  updateFactorioStatus(!!validate?.exists);
}

function updateFactorioStatus(ok: boolean) {
  const badge = document.getElementById('factorio-status');
  if (!badge) return;
  if (ok) {
    badge.textContent = 'Factorio encontrado';
    badge.classList.remove('status-error');
    badge.classList.add('status-ok');
  } else {
    badge.textContent = 'Factorio não encontrado';
    badge.classList.remove('status-ok');
    badge.classList.add('status-error');
  }
}

async function showCreateInstanceModal() {
  // limit available version choices to vanilla and steam-default
  const versionOptions = ['vanilla', 'steam-default'];
  const html = `
    <div>
      <label>Nome da instância (obrigatório):<br/>
        <input id="ci-name" style="width:100%" required />
      </label>
      <div id="ci-name-error" style="color:#b00020;display:none;margin-top:6px;font-size:0.9em;"></div>
      <label style="margin-top:8px;display:block;">Localização (opcional):<br/>
        <input id="ci-path" style="width:100%" placeholder="Deixa em branco para usar pasta padrão" />
      </label>
      <label style="margin-top:8px;display:block;">Versão:<br/>
        <select id="ci-version" style="width:100%"></select>
      </label>
      <div style="text-align:right;margin-top:12px;"><button id="ci-create" disabled>Criar</button> <button id="ci-cancel">Cancelar</button></div>
    </div>
  `;
  showModal(html);

  const sel = document.getElementById('ci-version') as HTMLSelectElement | null;
  if (sel) {
    versionOptions.forEach((v: string) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
  }

  const nameEl = document.getElementById('ci-name') as HTMLInputElement | null;
  const pathEl = document.getElementById('ci-path') as HTMLInputElement | null;
  const createBtn = document.getElementById('ci-create') as HTMLButtonElement | null;
  const nameErr = document.getElementById('ci-name-error') as HTMLDivElement | null;

  // enable create only when name has content
  function validate() {
    const ok = !!(nameEl && nameEl.value && nameEl.value.trim());
    if (createBtn) createBtn.disabled = !ok;
    if (nameErr && ok) {
      nameErr.style.display = 'none';
      nameErr.textContent = '';
    }
  }

  nameEl?.addEventListener('input', () => validate());
  setTimeout(() => { nameEl?.focus(); }, 50);

  document.getElementById('ci-cancel')?.addEventListener('click', hideModal);
  createBtn?.addEventListener('click', async () => {
    const name = nameEl?.value?.trim();
    if (!name) {
      if (nameErr) {
        nameErr.textContent = 'O nome da instância é obrigatório.';
        nameErr.style.display = 'block';
      }
      return;
    }
    const opts: any = { name };
    if (pathEl && pathEl.value.trim()) opts.customPath = pathEl.value.trim();
    if (sel && sel.value) opts.version = sel.value;
    const res = await (window as any).api.invoke('create-instance-advanced', opts);
    if (res && res.error) {
      if (nameErr) {
        nameErr.textContent = 'Erro: ' + res.error;
        nameErr.style.display = 'block';
      } else {
        alert('Erro: ' + res.error);
      }
    } else {
      hideModal();
      reloadInstances();
    }
  });
}