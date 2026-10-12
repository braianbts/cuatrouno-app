// Convierte un plan viejo (HTML completo) al formato editable (JSON) que dibuja /plan.html.
// Corre en el navegador del admin: window.CuatrounoPlanImport.htmlToPlan(html, baseCss)
//
// Formato del plan (student_plans.data):
// {
//   v: 1,
//   athlete: 'carlos',                 // clave de exercise_logs (se respeta la del HTML viejo)
//   greet, greetSub,                   // saludo de arriba
//   hero: { label, title, text },
//   fruits: { a: { range, options: [] }, ... },
//   customCss: '',                     // estilos extra que el plan viejo traía y la plantilla no
//   tempWeek: {                        // semana temporal (opcional, se arma desde el admin)
//     title, sub, intro, start: 'AAAA-MM-DD', end: 'AAAA-MM-DD',
//     days: [ { date, base: 'LUN' | 'off', off: 'motivo', tag, focus, rir } ]
//   },
//   sections: {
//     resumen|dieta|rutina|compras|progreso|pago: { title, subtitle, lead, blocks: [ ...bloques ] }
//   }
// }
// Bloques: label, tip, coord, stats, macros, table, schedule, rules, banner, platecam,
//          meals, days, ex, group (superserie), rest, shop, pagos, html (contenido especial copiado tal cual).
// Los textos admiten solo <b> <strong> <em> <i> <small> <span> <br> sin atributos, y [fruta:a] para el botón de frutas.
(function(){
  const INLINE = new Set(['B','STRONG','EM','I','SMALL','SPAN','BR']);

  function inline(node){
    if(!node) return '';
    let out = '';
    node.childNodes.forEach(n => {
      if(n.nodeType === 3){ out += escText(n.textContent); return; }
      if(n.nodeType !== 1) return;
      if(n.classList.contains('fruit-btn')){ out += '[fruta:' + (n.dataset.tier || 'a') + ']'; return; }
      const tag = n.tagName;
      if(tag === 'BR'){ out += '<br>'; return; }
      if(INLINE.has(tag)){ const t = tag.toLowerCase(); out += `<${t}>${inline(n)}</${t}>`; return; }
      out += inline(n);
    });
    return out;
  }
  function escText(s){
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\s+/g, ' ');
  }
  // inline() devuelve HTML escapado; el plan guarda texto plano con tags permitidos.
  function txt(node){
    return inline(node).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
  }
  function normDay(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 3); }
  function plain(node){ return (node?.textContent || '').replace(/\s+/g, ' ').trim(); }

  function parseTip(el){
    const c = el.cloneNode(true);
    const b = c.querySelector(':scope > b');
    const title = b ? plain(b) : '';
    if(b) b.remove();
    return { type: 'tip', title, text: txt(c) };
  }

  function parseStats(el){
    return {
      type: 'stats',
      items: [...el.querySelectorAll('.stat')].map(s => {
        const val = s.querySelector('.stat-val').cloneNode(true);
        const small = val.querySelector('small');
        const unit = small ? plain(small) : '';
        if(small) small.remove();
        return { label: plain(s.querySelector('.stat-label')), value: txt(val), unit, hi: s.classList.contains('hi') };
      })
    };
  }

  function parseTable(table){
    const rows = [...table.querySelectorAll('tr')];
    const headers = rows.length && rows[0].querySelector('th') ? [...rows.shift().children].map(txt) : [];
    return { headers, rows: rows.map(r => [...r.children].map(txt)) };
  }

  function parseMeals(card){
    return {
      type: 'meals',
      items: [...card.querySelectorAll(':scope > .meal')].map((m, i) => {
        const nameEl = m.querySelector('.meal-name').cloneNode(true);
        const numEl = nameEl.querySelector('.meal-num');
        const num = plain(numEl);
        if(numEl) numEl.remove();
        const body = m.querySelector('.meal-body');
        const tabNames = [...body.querySelectorAll('.var-tab')].map(plain);
        const panes = [...body.querySelectorAll(':scope > .var-pane')];
        const variants = (panes.length ? panes : [body]).map((p, vi) => {
          const v = { name: tabNames[vi] || '' };
          p.querySelectorAll('.meal-tag').forEach(tag => {
            const n = plain(tag.querySelector('b')).replace(/[^\d.,]/g, '');
            const label = plain(tag).toLowerCase();
            if(label.includes('prot')) v.prot = n;
            else if(label.includes('carb')) v.carbs = n;
            else if(label.includes('gras')) v.fat = n;
            else if(label.includes('kcal')) v.kcal = n;
          });
          v.items = [...p.querySelectorAll('.items li')].map(li => {
            const spans = li.querySelectorAll(':scope > span');
            const fruit = li.querySelector('.fruit-btn');
            const it = { name: txt(spans[0]).replace(/\s*\[fruta:\w+\]/g, ''), qty: txt(li.querySelector('.qty')) };
            if(fruit) it.fruit = fruit.dataset.tier || 'a';
            return it;
          });
          const extra = [...p.children].filter(c => !c.matches('.meal-macros, .items, .var-tabs, .var-pane'));
          if(extra.length) v.extra = extra.map(c => c.outerHTML).join('');
          return v;
        });
        const meal = {
          key: (m.querySelector('.meal-kcal')?.id || '').replace(/^k-/, '') || ('meal' + i),
          num, name: txt(nameEl), time: plain(m.querySelector('.meal-time')),
          open: m.classList.contains('open'), variants
        };
        if(panes.length){
          const extra = [...body.children].filter(c => !c.matches('.var-tabs, .var-pane'));
          if(extra.length) meal.extra = extra.map(c => c.outerHTML).join('');
        }
        return meal;
      })
    };
  }

  function parsePagos(card){
    return {
      type: 'pagos',
      items: [...card.querySelectorAll('.pago-item')].map(p => {
        const badge = p.querySelector('.pago-badge');
        const detail = plain(p.querySelector('.pago-item-date'));
        let due = p.dataset.due || '';
        const status = badge ? (['paid','due-soon','pending'].find(s => badge.classList.contains(s)) || 'pending') : '';
        // "Vence el 17/10/2026" -> 2026-10-17 (para el recordatorio automático)
        const m = !due && status !== 'paid' && detail.match(/vence\D*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
        if(m) due = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        const item = { name: txt(p.querySelector('.pago-item-name')), detail, amount: plain(p.querySelector('.pago-item-amount')), status, badge: plain(badge) };
        if(due) item.due = due;
        return item;
      })
    };
  }

  function parseCard(card, warn){
    if(card.classList.contains('cam-card')){
      return { type: 'platecam', title: plain(card.querySelector('.cam-card-title')), sub: txt(card.querySelector('.cam-card-sub')), btn: plain(card.querySelector('.cam-card-btn')) };
    }
    if(card.querySelector(':scope > .meal')) return parseMeals(card);
    if(card.querySelector('.pago-item')) return parsePagos(card);
    const kids = [...card.children];
    if(kids.length && kids.every(k => k.classList.contains('macro-row'))){
      return {
        type: 'macros',
        items: kids.map(k => {
          const b = plain(k.querySelector('.macro-top b'));
          const pm = b.match(/·\s*([\d.]+)\s*%/);
          return { label: plain(k.querySelector('.macro-top span')), value: b.replace(/\s*·\s*[\d.]+\s*%\s*$/, ''), pct: pm ? pm[1] : (k.querySelector('.bar i')?.style.width || '').replace('%','') };
        })
      };
    }
    if(kids.length === 1 && kids[0].matches('table.schedule')){
      return { type: 'schedule', rows: parseTable(kids[0]).rows };
    }
    if(kids.length === 1 && kids[0].matches('table.t')){
      return { type: 'table', ...parseTable(kids[0]) };
    }
    if(kids.length && kids.every(k => k.classList.contains('rule'))){
      return { type: 'rules', items: kids.map(k => txt(k.querySelector(':scope > div:last-child'))) };
    }
    warn('Tarjeta especial copiada tal cual');
    return { type: 'html', html: card.outerHTML };
  }

  function parseEx(el){
    const nameEl = el.querySelector('.ex-name').cloneNode(true);
    const ex = { type: 'ex', nombre: '', cells: [] };
    const badges = [...nameEl.querySelectorAll('.badge')];
    if(badges.length) ex.badges = badges.map(b => ({ text: plain(b), dark: b.classList.contains('tech') }));
    badges.forEach(b => b.remove());
    if(el.dataset.video) ex.video = el.dataset.video;
    ex.nombre = plain(nameEl);
    if(el.classList.contains('star')) ex.star = true;
    ex.cells = [...el.querySelectorAll('.ex-cell')].map(c => ({ label: txt(c.querySelector('.ex-cell-label')), value: txt(c.querySelector('.ex-cell-val')) }));
    const note = el.querySelector('.ex-note');
    if(note){
      const n = note.cloneNode(true);
      n.querySelectorAll('.ex-video-btn').forEach(a => a.remove());
      ex.note = txt(n);
    }
    return ex;
  }

  function parseDayPane(pane, label, warn){
    const d = { day: label, kind: '', name: '', focus: '', blocks: [] };
    const header = pane.querySelector(':scope > .day-header');
    if(header){
      d.kind = txt(header.querySelector('.day-type'));
      d.name = txt(header.querySelector('.day-name'));
      d.focus = txt(header.querySelector('.day-focus'));
    }
    d.blocks = parseBlocks([...pane.children].filter(c => c !== header), warn).blocks;
    return d;
  }

  // Recorre los hijos de una sección (o de un día) y los convierte en bloques.
  function parseBlocks(children, warn, root){
    const out = { title: '', subtitle: '', lead: '', blocks: [] };
    const blocks = out.blocks;
    let pendingDays = null;
    children.forEach(el => {
      const c = el.classList;
      if(el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      if(c.contains('section-title')){
        const t = el.cloneNode(true);
        const span = t.querySelector('span');
        out.subtitle = span ? txt(span) : '';
        if(span) span.remove();
        out.title = txt(t);
        return;
      }
      if(c.contains('section-lead') && !blocks.length){ out.lead = txt(el); return; }
      if(c.contains('block-label')){ blocks.push({ type: 'label', text: txt(el) }); return; }
      if(c.contains('tip')){ blocks.push(parseTip(el)); return; }
      if(c.contains('coord-banner')){ blocks.push({ type: 'coord', text: txt(el) }); return; }
      if(c.contains('stats')){ blocks.push(parseStats(el)); return; }
      if(c.contains('card')){ blocks.push(parseCard(el, warn)); return; }
      if(c.contains('promo-banner')){
        const img = el.querySelector('img');
        blocks.push({ type: 'banner', href: el.getAttribute('href') || '', img: (img?.getAttribute('src') || '').replace('https://cuatrouno-trainingclub-app.vercel.app', ''), alt: img?.getAttribute('alt') || '' });
        return;
      }
      if(c.contains('day-nav')){
        // Las etiquetas de los días salen de los botones; los paneles vienen después.
        const labels = {};
        el.querySelectorAll('.day-btn').forEach(b => { labels['pane-' + b.dataset.day] = plain(b); });
        pendingDays = { type: 'days', items: [], labels };
        blocks.push(pendingDays);
        return;
      }
      if(c.contains('day-pane')){
        if(!pendingDays){ pendingDays = { type: 'days', items: [], labels: {} }; blocks.push(pendingDays); }
        pendingDays.items.push(parseDayPane(el, pendingDays.labels[el.id] || el.id.replace(/^pane-[a-z]+-/, '').toUpperCase(), warn));
        return;
      }
      if(c.contains('ex')){ blocks.push(parseEx(el)); return; }
      if(c.contains('ss-group')){
        const label = el.querySelector(':scope > .ss-label');
        blocks.push({ type: 'group', label: txt(label), blocks: parseBlocks([...el.children].filter(k => k !== label), warn).blocks });
        return;
      }
      if(c.contains('rest-card')){
        blocks.push({ type: 'rest', big: plain(el.querySelector('.big')), text: txt(el.querySelector('p')) });
        return;
      }
      if(c.contains('shop-section')){
        const sec = { title: txt(el.querySelector('.shop-title')), items: [...el.querySelectorAll('.shop-item')].map(i => ({ name: txt(i.querySelector('.shop-item-name')), qty: txt(i.querySelector('.shop-item-qty')) })) };
        const last = blocks[blocks.length - 1];
        if(last && last.type === 'shop') last.sections.push(sec);
        else blocks.push({ type: 'shop', sections: [sec] });
        return;
      }
      if(el.id === 'pago-alert') return;
      // Semana temporal armada a mano en planes viejos: ahora se carga desde el admin (plan.tempWeek).
      if(el.id === 'wk-chip' || el.id === 'rn-semana') return;
      if(c.contains('section-lead')){ blocks.push({ type: 'html', html: el.outerHTML }); return; }
      warn('Bloque especial copiado tal cual (' + (el.className || el.tagName.toLowerCase()) + ')');
      blocks.push({ type: 'html', html: el.outerHTML });
    });
    blocks.forEach(b => { if(b.type === 'days') delete b.labels; });
    return out;
  }

  function parseFruits(doc){
    const script = [...doc.querySelectorAll('script')].map(s => s.textContent).find(t => t.includes('FRUIT_TIERS'));
    if(!script) return null;
    const fruits = {};
    const re = /(\w+)\s*:\s*\{\s*range\s*:\s*'([^']*)'\s*,\s*options\s*:\s*\[([^\]]*)\]/g;
    let m;
    while((m = re.exec(script))){
      fruits[m[1]] = { range: m[2], options: [...m[3].matchAll(/'([^']*)'/g)].map(x => x[1]) };
    }
    return Object.keys(fruits).length ? fruits : null;
  }

  // Separa CSS en reglas de primer nivel (respeta llaves anidadas de @media / @keyframes).
  function splitCss(css){
    const rules = [];
    let depth = 0, start = 0;
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for(let i = 0; i < css.length; i++){
      if(css[i] === '{') depth++;
      else if(css[i] === '}'){ depth--; if(depth === 0){ rules.push(css.slice(start, i + 1).trim()); start = i + 1; } }
    }
    return rules.filter(Boolean);
  }
  const normCss = s => s.replace(/https:\/\/cuatrouno-trainingclub-app\.vercel\.app/g, '').replace(/\s+/g, '');

  function customCss(doc, baseCss){
    const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const base = new Set(splitCss(baseCss || '').map(normCss));
    return splitCss(css)
      .filter(r => !base.has(normCss(r)) && !r.startsWith('@font-face'))
      .map(r => r.replace(/https:\/\/cuatrouno-trainingclub-app\.vercel\.app/g, ''))
      .join('\n');
  }

  function htmlToPlan(html, baseCss){
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const warnings = [];
    const plan = { v: 1, sections: {} };

    const ath = html.match(/const\s+ATHLETE\s*=\s*['"]([^'"]+)['"]/);
    if(ath) plan.athlete = ath[1];
    plan.greet = txt(doc.querySelector('.greet-hi'));
    plan.greetSub = txt(doc.querySelector('.greet-sub'));
    const hero = doc.querySelector('.hero');
    if(hero){
      plan.hero = { label: txt(hero.querySelector('.hero-label')), title: txt(hero.querySelector('h1')), text: txt(hero.querySelector('p')) };
    }
    const fruits = parseFruits(doc);
    if(fruits) plan.fruits = fruits;

    const map = { resumen: 'dn-resumen', dieta: 'dn-dieta', rutina: 'dn-rutina', compras: 'dn-compras', progreso: 'dn-progreso', pago: 'dn-pago' };
    Object.entries(map).forEach(([key, id]) => {
      const sec = doc.getElementById(id);
      if(!sec){ warnings.push('No se encontró la sección ' + key); return; }
      if(key === 'progreso'){
        const s = parseBlocks([...sec.children].filter(c => c.matches('.section-title, .section-lead')), () => {});
        plan.sections.progreso = { title: s.title, subtitle: s.subtitle, lead: s.lead };
        return;
      }
      plan.sections[key] = parseBlocks([...sec.children], msg => warnings.push(key + ': ' + msg));
    });

    // Registro de cada ejercicio según lo que tenía Progreso: unidad (kg / seg / reps) y el nombre
    // con el que se guardan los pesos (a veces distinto, ej. "Hip Thrust (mié)"), para no perder historial.
    // Se busca por día; los ejercicios que no estaban en Progreso quedan sin registro.
    const logsByDay = {};
    const allLogs = [];
    doc.querySelectorAll('#dn-progreso .pday-pane').forEach(pane => {
      const key = normDay(pane.dataset.dayLabel || '');
      logsByDay[key] = [...pane.querySelectorAll('.log-ex')].map(l => {
        const entry = { name: l.dataset.exercise, unit: (l.querySelector('input')?.getAttribute('placeholder') || 'kg').trim() || 'kg', used: false };
        allLogs.push(entry);
        return entry;
      });
    });
    const hasProgreso = allLogs.length > 0;
    const findLog = (list, nombre) =>
      list.find(l => !l.used && l.name === nombre) ||
      list.find(l => !l.used && l.name.startsWith(nombre + ' ('));
    const assign = (ex, list) => {
      if(!hasProgreso){ ex.log = 'kg'; return; }
      const l = findLog(list, ex.nombre) || findLog(allLogs, ex.nombre);
      if(!l){ ex.log = 'none'; return; }
      l.used = true;
      ex.log = l.unit;
      if(l.name !== ex.nombre) ex.logName = l.name;
    };
    const visit = (blocks, list) => (blocks || []).forEach(b => {
      if(b.type === 'ex') assign(b, list);
      if(b.type === 'days') b.items.forEach(d => visit(d.blocks, logsByDay[normDay(d.day)] || []));
      if(b.type === 'group') visit(b.blocks, list);
    });
    visit(plan.sections.rutina?.blocks, []);

    const css = customCss(doc, baseCss);
    if(css) plan.customCss = css;

    return { plan, warnings };
  }

  window.CuatrounoPlanImport = { htmlToPlan };
})();
