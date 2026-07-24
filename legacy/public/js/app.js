import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

import { firebaseConfig, PERFIL_DEFECTO } from './firebase-config.js';
import { DIETA, ENTRENO, HABITOS, OBJETIVOS, PLAN_VERSION } from './plan.js';

// ---------------------------------------------------------------- Firebase --
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
// Caché persistente: la app sigue funcionando sin cobertura y sincroniza al volver.
const db = initializeFirestore(fbApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const S = {
  uid: null,
  fecha: new Date(),
  plan: { dieta: DIETA, entreno: ENTRENO, habitos: HABITOS, objetivos: OBJETIVOS },
  perfil: { ...PERFIL_DEFECTO },
  pesos: [],
  dias: new Map(),
  vista: 'hoy',
  compraDias: new Set([0, 1, 2, 3, 4, 5, 6])
};

// ------------------------------------------------------------------ Utils --
const $ = (s) => document.querySelector(s);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const idxDia = (d) => (d.getDay() + 6) % 7;          // 0 = lunes
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtFecha = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const num = (v) => Math.round(v * 10) / 10;
const ORDEN = ['desayuno', 'tentempie', 'comida', 'merienda', 'cena'];
const NOMBRE_INGESTA = {
  desayuno: 'Desayuno', tentempie: 'Tentempié', comida: 'Comida',
  merienda: 'Merienda', cena: 'Cena'
};
const TICK = '<svg viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg>';

const refPerfil = () => doc(db, 'usuarios', S.uid, 'perfil', 'datos');
const refPlan = () => doc(db, 'usuarios', S.uid, 'plan', 'actual');
const refDia = (f) => doc(db, 'usuarios', S.uid, 'dias', f);
const refPesos = () => collection(db, 'usuarios', S.uid, 'pesos');

// ------------------------------------------------------------------- Auth --
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginErr').textContent = '';
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, $('#email').value.trim(), $('#pass').value);
  } catch (err) {
    const m = {
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/network-request-failed': 'Sin conexión con Firebase.'
    };
    $('#loginErr').textContent = m[err.code] || `No se ha podido entrar (${err.code}).`;
  }
});
$('#logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    S.uid = null;
    $('#login').classList.add('on');
    $('#app').classList.remove('on');
    return;
  }
  S.uid = user.uid;
  $('#login').classList.remove('on');
  $('#app').classList.add('on');
  await arrancar();
});

// ------------------------------------------------------------- Carga datos --
async function arrancar() {
  // Perfil: si no existe, se siembra con los valores del informe.
  try {
    const snap = await getDoc(refPerfil());
    if (snap.exists()) S.perfil = { ...PERFIL_DEFECTO, ...snap.data() };
    else await setDoc(refPerfil(), S.perfil);
  } catch (e) { console.warn('perfil', e); }

  // Plan: semilla en el primer arranque; después manda Firestore.
  try {
    const snap = await getDoc(refPlan());
    if (snap.exists() && snap.data().version === PLAN_VERSION) {
      const d = snap.data();
      S.plan = { dieta: d.dieta, entreno: d.entreno, habitos: d.habitos, objetivos: d.objetivos };
    } else {
      await setDoc(refPlan(), {
        version: PLAN_VERSION, actualizado: new Date().toISOString(),
        dieta: DIETA, entreno: ENTRENO, habitos: HABITOS, objetivos: OBJETIVOS
      });
    }
  } catch (e) { console.warn('plan', e); }

  onSnapshot(query(refPesos(), orderBy('fecha')), (qs) => {
    S.pesos = qs.docs.map((d) => d.data()).filter((p) => typeof p.peso === 'number');
    if (S.vista === 'peso') render();
  }, (e) => console.warn('pesos', e));

  await cargarDia(iso(S.fecha));
  render();
}

async function cargarDia(f) {
  if (S.dias.has(f)) return S.dias.get(f);
  let data = { hechas: {}, entreno: false };
  try {
    const snap = await getDoc(refDia(f));
    if (snap.exists()) data = { hechas: {}, entreno: false, ...snap.data() };
  } catch (e) { console.warn('dia', e); }
  S.dias.set(f, data);
  return data;
}

async function guardarDia(f) {
  const d = S.dias.get(f);
  try { await setDoc(refDia(f), { ...d, fecha: f }, { merge: true }); }
  catch (e) { console.warn('guardarDia', e); }
}

// ------------------------------------------------------------- Navegación --
$('#prev').addEventListener('click', () => mover(-1));
$('#next').addEventListener('click', () => mover(1));
document.querySelectorAll('nav.tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    S.vista = b.dataset.v;
    document.querySelectorAll('nav.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('section.view').forEach((s) => s.classList.toggle('on', s.id === `v-${S.vista}`));
    render();
    window.scrollTo(0, 0);
  });
});
async function mover(n) {
  const d = new Date(S.fecha);
  d.setDate(d.getDate() + n);
  S.fecha = d;
  await cargarDia(iso(d));
  render();
}
const setOffline = () => $('#offline').classList.toggle('on', !navigator.onLine);
window.addEventListener('online', setOffline);
window.addEventListener('offline', setOffline);
setOffline();

// ----------------------------------------------------------------- Render --
function render() {
  const d = S.fecha;
  $('#hDia').textContent = d.toLocaleDateString('es-ES', { weekday: 'long' });
  $('#hFecha').textContent = fmtFecha(d) + (iso(d) === iso(new Date()) ? ' · hoy' : '');
  if (S.vista === 'hoy') vistaHoy();
  if (S.vista === 'semana') vistaSemana();
  if (S.vista === 'peso') vistaPeso();
  if (S.vista === 'compra') vistaCompra();
}

function itemHTML(it) {
  if (it.receta) {
    const r = it.receta;
    return `<div class="item"><div class="n"><b>${esc(it.n)}</b>
      <details class="rec"><summary><span class="chev">›</span> Ver receta</summary>
        <div class="rec-body">
          <h4>Ingredientes (1 persona)</h4>
          <ul>${r.ing.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          <h4>Elaboración</h4>
          <ol>${r.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
          ${r.nota ? `<div class="nota">${esc(r.nota)}</div>` : ''}
        </div>
      </details></div></div>`;
  }
  return `<div class="item"><div class="n">${esc(it.n)}${it.nota ? `<span class="nota">${esc(it.nota)}</span>` : ''}</div>
    <div class="c">${esc(it.c || '')}</div></div>`;
}

function vistaHoy() {
  const f = iso(S.fecha);
  const i = idxDia(S.fecha);
  const dia = S.plan.dieta[i];
  const ent = S.plan.entreno[i];
  const est = S.dias.get(f) || { hechas: {}, entreno: false };
  const ingestas = ORDEN.filter((k) => dia.ingestas[k]);
  const hechas = ingestas.filter((k) => est.hechas[k]).length;

  let h = `<div class="card">
    <div class="card-h">
      <h3>${esc(ent.titulo)}</h3>
      <span class="tag ${ent.tipo === 'fuerza' ? '' : 'gris'}">${esc(ent.duracion)}</span>
      <button class="chk ${est.entreno ? 'on' : ''}" data-ent="1">${TICK}</button>
    </div>
    <div class="card-b">
      ${ent.bloques.map((b) => `<div class="bloque"><h4>${esc(b.t)}</h4>
        <ul>${b.e.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
      ${ent.claves?.length ? `<div class="claves"><ul>${ent.claves.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
    </div>
  </div>`;

  h += `<div class="card"><div class="card-h"><h3>Comidas</h3>
    <span class="tag gris">${hechas}/${ingestas.length}</span></div></div>`;

  for (const k of ingestas) {
    const ing = dia.ingestas[k];
    h += `<div class="card">
      <div class="card-h">
        <h3>${NOMBRE_INGESTA[k]}</h3>
        <span class="hora">${esc(ing.hora)}</span>
        <button class="chk ${est.hechas[k] ? 'on' : ''}" data-ing="${k}">${TICK}</button>
      </div>
      <div class="card-b">${ing.items.map(itemHTML).join('')}</div>
    </div>`;
  }

  h += `<div class="card"><div class="card-h"><h3>Hábitos diarios</h3></div><div class="card-b">
    ${S.plan.habitos.map((x) => `<div class="item"><div class="n"><b>${esc(x.t)}</b><span class="nota">${esc(x.d)}</span></div></div>`).join('')}
  </div></div>`;

  h += `<div class="aviso">El plan de comidas es la transcripción literal del plan de tu dietista-nutricionista.
    Las rutinas de ejercicio son una propuesta basada en el informe (osteopenia, tendinitis, hernia de hiato
    y mareos con la respiración en apnea): coméntalas con tu fisioterapeuta o entrenador antes de empezar.</div>`;

  $('#v-hoy').innerHTML = h;

  $('#v-hoy').querySelectorAll('[data-ing]').forEach((b) => b.addEventListener('click', async () => {
    const est2 = S.dias.get(f);
    est2.hechas[b.dataset.ing] = !est2.hechas[b.dataset.ing];
    await guardarDia(f);
    vistaHoy();
  }));
  const be = $('#v-hoy [data-ent]');
  be && be.addEventListener('click', async () => {
    const est2 = S.dias.get(f);
    est2.entreno = !est2.entreno;
    await guardarDia(f);
    vistaHoy();
  });
}

function resumenComida(dia) {
  const items = dia.ingestas.comida?.items || [];
  const platos = items.filter((x) => x.receta).map((x) => x.n);
  return platos.length ? platos.join(' · ') : items.map((x) => x.n).slice(0, 2).join(' · ');
}
function resumenCena(dia) {
  const items = (dia.ingestas.cena?.items || []).filter((x) => x.n !== 'Agua');
  const platos = items.filter((x) => x.receta).map((x) => x.n);
  return platos.length ? platos.join(' · ') : items.map((x) => x.n).slice(0, 3).join(' · ');
}

function vistaSemana() {
  const hoyI = idxDia(new Date());
  const h = `<div class="semana">${S.plan.dieta.map((d, i) => {
    const e = S.plan.entreno[i];
    return `<button class="dcard ${i === hoyI ? 'hoy' : ''}" data-i="${i}">
      <div class="top"><strong>${esc(d.dia)}</strong><span class="tag ${e.tipo === 'fuerza' ? '' : 'gris'}">${esc(e.titulo.split(' · ')[0])}</span></div>
      <p><b>Comida:</b> ${esc(resumenComida(d))}</p>
      <p><b>Cena:</b> ${esc(resumenCena(d))}</p>
    </button>`;
  }).join('')}</div>`;
  $('#v-semana').innerHTML = h;
  $('#v-semana').querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', async () => {
    const destino = Number(b.dataset.i);
    const d = new Date(S.fecha);
    d.setDate(d.getDate() + (destino - idxDia(d)));
    S.fecha = d;
    await cargarDia(iso(d));
    document.querySelector('nav.tabs button[data-v="hoy"]').click();
  }));
}

// ------------------------------------------------------------------- Peso --
function mediaMovil(pesos, ventana = 7) {
  return pesos.map((p, i) => {
    const t = new Date(p.fecha).getTime();
    const win = pesos.filter((q, j) => j <= i && (t - new Date(q.fecha).getTime()) < ventana * 864e5);
    return { fecha: p.fecha, peso: win.reduce((a, b) => a + b.peso, 0) / win.length };
  });
}

function chartSVG(pesos, objetivo) {
  const W = 700, H = 230, P = { t: 16, r: 14, b: 26, l: 38 };
  if (pesos.length < 2) return '<p class="empty">Registra al menos dos pesos para ver la tendencia.</p>';
  const mm = mediaMovil(pesos);
  const t0 = new Date(pesos[0].fecha).getTime();
  const t1 = new Date(pesos[pesos.length - 1].fecha).getTime();
  const spanT = Math.max(t1 - t0, 864e5);
  const vals = pesos.map((p) => p.peso).concat(objetivo ? [objetivo] : []);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.15, 0.4);
  min -= pad; max += pad;
  const x = (f) => P.l + ((new Date(f).getTime() - t0) / spanT) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const linea = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${x(p.fecha).toFixed(1)},${y(p.peso).toFixed(1)}`).join(' ');

  const ticks = 4;
  let grid = '';
  for (let i = 0; i <= ticks; i++) {
    const v = min + ((max - min) * i) / ticks;
    grid += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>
      <text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v.toFixed(1)}</text>`;
  }
  const fx = (f) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const ejeX = `<text x="${P.l}" y="${H - 6}" font-size="11" fill="var(--muted)">${fx(pesos[0].fecha)}</text>
    <text x="${W - P.r}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="end">${fx(pesos[pesos.length - 1].fecha)}</text>`;
  const obj = objetivo && objetivo > min && objetivo < max
    ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(objetivo)}" y2="${y(objetivo)}" stroke="var(--warn)"
        stroke-width="1.5" stroke-dasharray="5 4"/>` : '';
  const puntos = pesos.map((p) => `<circle cx="${x(p.fecha)}" cy="${y(p.peso)}" r="2.6" fill="var(--accent)" opacity=".45"/>`).join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${grid}${ejeX}${obj}
    <path d="${linea(pesos)}" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity=".4"/>
    ${puntos}
    <path d="${linea(mm)}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function vistaPeso() {
  const ps = S.pesos;
  const ultimo = ps.length ? ps[ps.length - 1] : null;
  const inicial = S.perfil.pesoInicial;
  const objetivo = S.perfil.objetivo;
  const mm = ps.length ? mediaMovil(ps) : [];
  const media = mm.length ? mm[mm.length - 1].peso : null;
  const delta = ultimo ? ultimo.peso - inicial : null;
  const falta = ultimo ? ultimo.peso - objetivo : null;

  // Ritmo de las últimas 4 semanas, sobre la media móvil (menos ruido).
  let ritmo = null;
  if (mm.length > 3) {
    const fin = mm[mm.length - 1];
    const ref = [...mm].reverse().find((p) => new Date(fin.fecha) - new Date(p.fecha) >= 21 * 864e5) || mm[0];
    const dias = (new Date(fin.fecha) - new Date(ref.fecha)) / 864e5;
    if (dias >= 7) ritmo = ((fin.peso - ref.peso) / dias) * 7;
  }

  const kpi = (t, v, cls = '') => `<div class="kpi"><span>${t}</span><strong class="${cls}">${v}</strong></div>`;
  let h = `<div class="kpis">
    ${kpi('Actual', ultimo ? `${num(ultimo.peso)} kg` : '—')}
    ${kpi('Media 7 d', media ? `${num(media)} kg` : '—')}
    ${kpi('Desde el inicio', delta === null ? '—' : `${delta > 0 ? '+' : ''}${num(delta)} kg`, delta === null ? '' : delta < 0 ? 'down' : 'up')}
    ${kpi('Hasta objetivo', falta === null ? '—' : `${num(falta)} kg`)}
    ${kpi('Ritmo semanal', ritmo === null ? '—' : `${ritmo > 0 ? '+' : ''}${num(ritmo)} kg`, ritmo === null ? '' : ritmo < 0 ? 'down' : 'up')}
  </div>`;

  h += `<div class="card"><div class="card-h"><h3>Registrar peso</h3></div><div class="card-b">
    <div class="form-row">
      <input type="date" id="pFecha" value="${iso(S.fecha)}">
      <input type="number" id="pPeso" step="0.1" min="30" max="200" placeholder="kg" inputmode="decimal">
      <button class="btn mini" id="pAdd">Guardar</button>
    </div>
    <div class="err" id="pErr"></div>
  </div></div>`;

  h += `<div class="card"><div class="card-h"><h3>Evolución</h3></div>
    ${chartSVG(ps, objetivo)}
    <div class="leyenda">
      <span><i style="border-color:var(--accent)"></i>Media de 7 días</span>
      <span><i style="border-color:var(--accent);opacity:.4"></i>Peso diario</span>
      <span><i style="border-color:var(--warn);border-top-style:dashed"></i>Objetivo ${num(objetivo)} kg</span>
    </div></div>`;

  h += `<div class="card"><div class="card-h"><h3>Registros</h3><span class="tag gris">${ps.length}</span></div>
    <div class="card-b">${ps.length ? `<table class="pesos">${[...ps].reverse().slice(0, 20).map((p, i, arr) => {
      const sig = arr[i + 1];
      const d = sig ? p.peso - sig.peso : null;
      return `<tr><td>${new Date(p.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        ${d === null ? '' : `<span class="c" style="color:var(--muted);font-size:12px">${d > 0 ? '+' : ''}${num(d)}</span>`}</td>
        <td>${num(p.peso)} kg</td>
        <td><button class="del" data-del="${p.fecha}" aria-label="Borrar">×</button></td></tr>`;
    }).join('')}</table>` : '<p class="empty">Todavía no hay registros.</p>'}</div></div>`;

  h += `<div class="card"><div class="card-h"><h3>Objetivos del informe</h3></div><div class="card-b">
    ${S.plan.objetivos.map((o) => `<div class="item"><div class="n"><b>${esc(o.t)}</b><span class="nota">${esc(o.d)}</span></div></div>`).join('')}
  </div></div>`;

  h += `<div class="aviso">El peso oscila a diario por líquidos, sal y ciclo digestivo. Mira la media de 7 días,
    no el dato suelto. Pésate siempre en las mismas condiciones: en ayunas, después de ir al baño y sin ropa.</div>`;

  $('#v-peso').innerHTML = h;

  $('#pAdd').addEventListener('click', async () => {
    const f = $('#pFecha').value;
    const v = parseFloat(String($('#pPeso').value).replace(',', '.'));
    if (!f || !Number.isFinite(v) || v < 30 || v > 200) {
      $('#pErr').textContent = 'Introduce una fecha y un peso válidos.';
      return;
    }
    $('#pErr').textContent = '';
    $('#pPeso').value = '';
    try { await setDoc(doc(refPesos(), f), { fecha: f, peso: v, ts: Date.now() }); }
    catch (e) { $('#pErr').textContent = 'No se ha podido guardar.'; console.warn(e); }
  });
  $('#v-peso').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Borrar este registro?')) return;
    try { await deleteDoc(doc(refPesos(), b.dataset.del)); } catch (e) { console.warn(e); }
  }));
}

// ----------------------------------------------------------------- Compra --
const CATS = [
  [/naranja|plátano|melón|ciruela|cereza|fresa|frambuesa|arándano|aguacate/i, 'Fruta'],
  [/judía|tomate|pimiento|cebolla|patata|coliflor|calabacín|espinaca|rúcula|pepino|alcachofa|champiñón|seta|guisante|ajo|laurel|perejil|aceituna/i, 'Verdura y hortaliza'],
  [/sardina|atún|rodaballo|sepia|berberecho|salmón|bacalao/i, 'Pescado y conservas'],
  [/pavo|jamón|pollo/i, 'Carne y fiambre'],
  [/huevo|clara|yogur|kéfir|queso/i, 'Huevos y lácteos'],
  [/almendra|avellana|sésamo/i, 'Frutos secos y semillas'],
  [/pan|macarrón|macarrones|garbanzo|aceite|vinagre|guacamole|vino|café|vichy|pimienta/i, 'Despensa']
];
const categoria = (n) => (CATS.find(([re]) => re.test(n)) || [null, 'Otros'])[1];
const IGNORA = /^(agua|sal común)$/i;

function vistaCompra() {
  const acc = new Map();
  const suma = (nombre, cant) => {
    const n = nombre.trim().replace(/\s+/g, ' ');
    if (IGNORA.test(n)) return;
    const m = /(\d+(?:[.,]\d+)?)\s*g\b/.exec(cant || '');
    const g = m ? parseFloat(m[1].replace(',', '.')) : 0;
    const clave = n.toLowerCase();
    const prev = acc.get(clave) || { n, g: 0, veces: 0, aproximado: false };
    prev.g += g;
    prev.veces += 1;
    if (!g) prev.aproximado = true;
    acc.set(clave, prev);
  };

  S.plan.dieta.forEach((dia, i) => {
    if (!S.compraDias.has(i)) return;
    for (const k of ORDEN) {
      const ing = dia.ingestas[k];
      if (!ing) continue;
      for (const it of ing.items) {
        if (it.receta) it.receta.ing.forEach((s) => {
          const p = s.split(':');
          suma(p[0], p.slice(1).join(':'));
        });
        else suma(it.n, it.c);
      }
    }
  });

  const porCat = new Map();
  [...acc.values()].forEach((v) => {
    const c = categoria(v.n);
    if (!porCat.has(c)) porCat.set(c, []);
    porCat.get(c).push(v);
  });
  const ordenCat = ['Fruta', 'Verdura y hortaliza', 'Pescado y conservas', 'Carne y fiambre',
    'Huevos y lácteos', 'Frutos secos y semillas', 'Despensa', 'Otros'];

  const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  let h = `<div class="card"><div class="card-h"><h3>Lista de la compra</h3>
      <button class="btn ghost mini" id="cAll">Todos</button></div>
    <div class="compra-dias">${dias.map((d, i) => `<button class="pill ${S.compraDias.has(i) ? 'on' : ''}" data-d="${i}">${d}</button>`).join('')}</div>
    <div class="card-b">`;

  if (!acc.size) h += '<p class="empty">Selecciona al menos un día.</p>';
  for (const c of ordenCat) {
    const lista = porCat.get(c);
    if (!lista) continue;
    h += `<div class="cat">${c}</div>`;
    h += lista.sort((a, b) => a.n.localeCompare(b.n, 'es')).map((v) => `<div class="item">
      <div class="n">${esc(v.n)}</div>
      <div class="c">${v.g ? `${num(v.g)} g` : ''}${v.aproximado && v.g ? ' +' : ''}${!v.g ? `${v.veces} ración${v.veces > 1 ? 'es' : ''}` : ''}</div>
    </div>`).join('');
  }
  h += `</div></div>
    <div class="aviso">Cantidades sumadas de las raciones del plan para los días marcados, incluyendo los
    ingredientes de cada receta. Añade un margen en fruta y verdura por mermas y en los formatos que solo
    se venden por envase (latas, tarrinas, barras de pan).</div>`;

  $('#v-compra').innerHTML = h;
  $('#v-compra').querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.d);
    S.compraDias.has(i) ? S.compraDias.delete(i) : S.compraDias.add(i);
    vistaCompra();
  }));
  $('#cAll').addEventListener('click', () => {
    S.compraDias = new Set(S.compraDias.size === 7 ? [] : [0, 1, 2, 3, 4, 5, 6]);
    vistaCompra();
  });
}
