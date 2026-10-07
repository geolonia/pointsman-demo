// The demo page: send a prepared report, watch Pointsman decide, see it on the maps.
// Report texts come from the API (anyone can send one): they are only ever set
// as text, never as HTML.
(function () {
  'use strict';

  var CENTER = [139.753, 35.688];
  var COLORS = { publish: '#2E9E6B', review: '#C98A1B', urgent: '#C8463A', reject: '#7A68B8', pending: '#8f8a82' };

  var T = {
    en: {
      demo: 'FIWARE demo', title: 'Heavy rain. Reports of closed roads are coming in.',
      lead: 'Each report becomes a <code>RoadRestriction</code> entity in an NGSI-LD context broker. Pointsman checks it within seconds: clear reports go straight to the residents’ map, unclear ones to a person, urgent ones first.',
      hq: 'Headquarters', hqNote: 'every report', residents: 'Residents', residentsNote: 'only what is published',
      publish: 'publish', review: 'review', urgent: 'urgent', reject: 'rejected', pending: 'waiting for Pointsman',
      send: '1. Send a report', sendNote: 'Pick one. Each is a real request to the broker; Pointsman answers it live.',
      freeOff: 'Free text is switched off in this demo: only prepared reports.',
      watch: '2. Watch', recent: 'Recent reports', recentNote: 'Everyone sees the same reports. Demo data is deleted after a day.',
      what: 'What just happened',
      w1: 'The page created a <code>RoadRestriction</code> entity (<a href="https://datamodels.jp/models/transportation/RoadRestriction/">datamodels.jp</a>) in GeonicDB, an NGSI-LD context broker.',
      w2: 'A subscription notified the bridge. It sent the entity, as it is, to Pointsman: the profile reads the attributes it needs, no mapping code.',
      w3: 'Pointsman asked the model four typed questions and turned the answers into an action with the city’s rules. The bridge wrote the result back to the entity (<code>check</code>) and as a <code>Decision</code> entity, so other FIWARE apps can subscribe to it.',
      w4: 'Reports that need a person became GitHub issues. A member resolves one with <code>/publish</code> or <code>/reject</code>; the answer goes back to Pointsman as feedback.',
      lProfile: 'The profile', lBridge: 'The bridge', lStory: 'Why it works this way', lSource: 'Source of this demo', lQueue: 'The review queue',
      footer: 'Invented events at real places. Do not enter personal data. Map: <a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>.',
      s1: 'Stored in the context broker', s2: 'Broker notified the bridge (subscription)', s3: 'Pointsman answered the four questions',
      s4: 'Result written back to the entity and as a Decision entity', waiting: 'waiting…',
      showEntity: 'RoadRestriction entity (NGSI-LD)', showDecision: 'Decision entity (NGSI-LD, full IRIs)', showRequest: 'request',
      rule: 'rule', ruleDefault: 'no rule matched: default action',
      nPublish: 'Clear and consistent: published to the residents’ map without waiting for a person.',
      nReview: 'Not clear enough to publish on its own: a person checks it.',
      nUrgent: 'Someone may be in danger: a person looks at it first.',
      nIssue: 'It waits in the review queue: ', nIssueCmd: 'members resolve it with /publish or /reject.',
      nResolved: 'Resolved by a person: ', nNoIssue: 'Only prepared reports go to the GitHub queue.', nOpening: 'Opening an issue in the review queue\u2026',
      q: { category: 'Category', status_matches: 'Status matches the text', danger: 'People in danger', clarity: 'Clear enough to publish' },
      yes: 'yes', no: 'no', usage: function (u, l) { return u + ' of ' + l + ' reports today'; },
      sent: 'sent', limit: 'The demo reached its limit for today.', failed: 'Could not send the report: ',
      ago: function (s) { return s < 60 ? s + ' s ago' : Math.round(s / 60) + ' min ago'; },
    },
    ja: {
      demo: 'FIWARE デモ', title: '大雨。通行止めの報告が次々に届く。',
      lead: '報告は 1 件ずつ NGSI-LD のコンテキストブローカーに <code>RoadRestriction</code> エンティティとして入ります。Pointsman が数秒で確認し、はっきりした報告はそのまま住民向けの地図へ、はっきりしないものは人の確認へ、緊急のものは真っ先に人へ回します。',
      hq: '災害対策本部', hqNote: 'すべての報告', residents: '住民向け', residentsNote: '公開されたものだけ',
      publish: '公開', review: '確認', urgent: '緊急', reject: '非公開', pending: 'Pointsman の判定待ち',
      send: '1. 報告を送る', sendNote: '1 つ選んでください。ブローカーへの実際のリクエストで、Pointsman がその場で判定します。',
      freeOff: 'このデモでは自由記述は無効です。用意した報告だけを送れます。',
      watch: '2. 見る', recent: '最近の報告', recentNote: '全員が同じ報告を見ています。デモのデータは 1 日で消えます。',
      what: '何が起きたか',
      w1: 'ページが GeonicDB（NGSI-LD のコンテキストブローカー）に <code>RoadRestriction</code> エンティティ（<a href="https://datamodels.jp/models/transportation/RoadRestriction/">datamodels.jp</a>）を作りました。',
      w2: 'サブスクリプションがブリッジに通知し、ブリッジはエンティティをそのまま Pointsman に送りました。プロファイルが必要な属性を読むので、変換のコードはいりません。',
      w3: 'Pointsman がモデルに型のある 4 つの問いを出し、答えを市の規則で行動に変えました。ブリッジは結果をエンティティ（<code>check</code>）と <code>Decision</code> エンティティに書き戻したので、ほかの FIWARE アプリもサブスクライブできます。',
      w4: '人の確認が必要な報告は GitHub の Issue になりました。メンバーが <code>/publish</code> か <code>/reject</code> で決めると、その答えはフィードバックとして Pointsman に戻ります。',
      lProfile: 'プロファイル', lBridge: 'ブリッジ', lStory: 'この仕組みの理由', lSource: 'このデモのソース', lQueue: '確認待ちの一覧',
      footer: '場所は実在、出来事は架空です。個人情報は入れないでください。地図：<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>。',
      s1: 'コンテキストブローカーに保存', s2: 'ブローカーがブリッジに通知（サブスクリプション）', s3: 'Pointsman が 4 つの問いに回答',
      s4: '結果をエンティティと Decision エンティティに書き戻し', waiting: '待機中…',
      showEntity: 'RoadRestriction エンティティ（NGSI-LD）', showDecision: 'Decision エンティティ（NGSI-LD、完全な IRI）', showRequest: 'リクエスト',
      rule: '規則', ruleDefault: 'どの規則にも当たらず既定の行動',
      nPublish: 'はっきりしていて矛盾もないので、人を待たずに住民向けの地図に公開しました。',
      nReview: 'そのまま公開するには不明な点があるので、人が確認します。',
      nUrgent: '人に危険が及んでいるかもしれないので、真っ先に人が確認します。',
      nIssue: '確認待ちの一覧にあります：', nIssueCmd: 'メンバーが /publish か /reject で決めます。',
      nResolved: '人が確認しました：', nNoIssue: 'GitHub の確認待ちに回るのは用意した報告だけです。', nOpening: '確認待ちの Issue を作成中…',
      q: { category: '規制区分', status_matches: '状態と本文が合っている', danger: '人に危険がある', clarity: '公開できるほど明確' },
      yes: 'はい', no: 'いいえ', usage: function (u, l) { return '本日 ' + u + ' / ' + l + ' 件'; },
      sent: '送信済み', limit: '本日のデモの上限に達しました。', failed: '報告を送れませんでした：',
      ago: function (s) { return s < 60 ? s + ' 秒前' : Math.round(s / 60) + ' 分前'; },
    },
  };

  var lang = pickLang();
  var config = null;
  var reports = [];
  var current = null; // { id, sentAt, request, poll }
  var maps = {};

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'ja' || q === 'en') return q;
    try { var s = localStorage.getItem('lang'); if (s === 'ja' || s === 'en') return s; } catch (e) {}
    return (navigator.language || '').startsWith('ja') ? 'ja' : 'en';
  }
  function t(key) { return T[lang][key]; }

  function el(tag, props, children) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === 'text') e.textContent = props[k];
      else if (k === 'class') e.className = props[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  // Our own fixed texts may contain markup (links, code); data never goes here.
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.innerHTML = t(n.dataset.i18n); });
    document.getElementById('lang').textContent = lang === 'ja' ? 'English' : '日本語';
    renderPrepared();
    renderReports();
    if (current) renderCurrent(current.last);
  }

  function outcomeOf(r) {
    if (!r.check) return 'pending';
    return r.check.finalAction || r.check.action;
  }

  // --- API -------------------------------------------------------------------

  function api(path, init) {
    return fetch(path, init).then(function (res) {
      return res.json().then(function (body) { return { ok: res.ok, status: res.status, body: body }; });
    });
  }

  // Without the configuration there are no buttons: show the error and retry.
  function loadConfig() {
    var err = document.getElementById('send-error');
    return api('/api/config').then(function (r) {
      if (!r.ok || !r.body || !Array.isArray(r.body.prepared)) throw new Error(r.body && r.body.error || String(r.status));
      config = r.body;
      err.hidden = true;
      document.getElementById('free-note').hidden = config.freeText;
      renderUsage();
      renderPrepared();
    }).catch(function (e) {
      err.textContent = t('failed') + e.message;
      err.hidden = false;
      setTimeout(loadConfig, 5000);
    });
  }

  function renderUsage() {
    if (config) document.getElementById('usage').textContent = t('usage')(config.today.used, config.today.limit);
  }

  function loadReports() {
    return api('/api/reports').then(function (r) {
      if (!r.ok) return;
      reports = r.body.reports;
      renderReports();
      updateMaps();
    });
  }

  // --- Sending ----------------------------------------------------------------

  function renderPrepared() {
    var list = document.getElementById('prepared');
    list.textContent = '';
    if (!config) return;
    config.prepared.forEach(function (p) {
      list.appendChild(el('li', null, [el('button', {
        type: 'button',
        onclick: function (ev) { send(p, ev.currentTarget); },
      }, [
        el('span', { class: 'road', text: p.roadName || '—' }),
        el('span', { class: 'text', text: p.description[lang] }),
      ])]));
    });
  }

  function send(p, button) {
    var err = document.getElementById('send-error');
    err.hidden = true;
    document.querySelectorAll('.prepared button').forEach(function (b) { b.disabled = true; });
    var request = { prepared: p.id, lang: lang };
    var sentAt = Date.now();
    api('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })
      .then(function (r) {
        if (r.status === 429 && r.body.today) { err.textContent = t('limit'); err.hidden = false; return; }
        if (!r.ok) { err.textContent = t('failed') + (r.body.error || r.status); err.hidden = false; return; }
        if (config) { config.today.used += 1; renderUsage(); }
        watch(r.body.id, { sentAt: sentAt, request: request, prepared: p });
      })
      .catch(function (e) { err.textContent = t('failed') + e.message; err.hidden = false; })
      .finally(function () {
        setTimeout(function () { document.querySelectorAll('.prepared button').forEach(function (b) { b.disabled = false; }); }, 1500);
      });
  }

  // --- Watching one report ---------------------------------------------------------

  function watch(id, info) {
    if (current && current.poll) clearTimeout(current.poll);
    current = Object.assign({ id: id, last: null }, info || {});
    document.getElementById('current').hidden = false;
    renderCurrent(null);
    document.getElementById('current').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    poll();
  }

  function poll() {
    var me = current;
    api('/api/reports/' + encodeURIComponent(me.id)).then(function (r) {
      if (current !== me) return;
      if (r.ok) { me.last = r.body; renderCurrent(r.body); }
      var done = r.ok && r.body.check && (r.body.ngsi && r.body.ngsi.decision);
      var resolved = done && (r.body.check.finalAction || r.body.check.action === 'publish');
      // Fast until the decision is there, then slowly, waiting for a person.
      me.poll = setTimeout(poll, !done ? 1200 : resolved ? 30000 : 5000);
      if (done && !me.mapped) { me.mapped = true; loadReports(); }
    }).catch(function () { if (current === me) me.poll = setTimeout(poll, 3000); });
  }

  function seconds(from, to) {
    var a = Date.parse(from), b = Date.parse(to);
    return isFinite(a) && isFinite(b) ? ((b - a) / 1000).toFixed(1) + ' s' : '';
  }

  function step(label, state, time, details) {
    return el('li', { class: state }, [
      el('div', { class: 'head' }, [el('span', { class: 'state', text: label }), el('span', { class: 'time', text: time || (state === 'wait' ? t('waiting') : '') })]),
      details,
    ]);
  }

  function json(label, value) {
    return el('details', null, [el('summary', { text: label }), el('pre', { text: JSON.stringify(value, null, 2) })]);
  }

  function renderCurrent(r) {
    var tl = document.getElementById('timeline');
    var result = document.getElementById('result');
    tl.textContent = '';
    result.textContent = '';
    var stored = r && r.createdAt;
    var decided = r && r.check;
    var written = decided && r.ngsi && r.ngsi.decision;
    tl.appendChild(step(t('s1'), stored ? 'done' : 'wait', stored && current.sentAt ? seconds(new Date(current.sentAt).toISOString(), r.createdAt) : '',
      current.request ? json(t('showRequest'), { method: 'POST', path: '/api/reports', body: current.request }) : null));
    tl.appendChild(step(t('s2'), decided ? 'done' : stored ? 'wait' : 'wait', ''));
    tl.appendChild(step(t('s3'), decided ? 'done' : 'wait', decided ? seconds(r.createdAt, r.check.decidedAt) : ''));
    tl.appendChild(step(t('s4'), written ? 'done' : 'wait', '',
      written ? el('div', null, [json(t('showEntity'), r.ngsi.entity), json(t('showDecision'), r.ngsi.decision)]) : null));
    if (!decided) return;

    var outcome = outcomeOf(r);
    var rule = r.check.policyRule;
    result.appendChild(el('div', { class: 'outcome' }, [
      el('span', { class: 'badge ' + outcome, text: t(outcome) || outcome }),
      el('span', { class: 'muted small', text: rule === undefined ? '' : rule === 'default' ? t('ruleDefault') : t('rule') + ' ' + rule }),
    ]));
    var answers = el('div', { class: 'answers' });
    Object.keys(r.check.answers).forEach(function (name) {
      var a = r.check.answers[name];
      var value = typeof a.value === 'boolean' ? (a.value ? t('yes') : t('no')) : String(a.value);
      var p = typeof a.p === 'number' ? a.p : null;
      answers.appendChild(el('div', { class: 'answer' }, [
        el('div', { class: 'label' }, [el('span', { text: (t('q')[name] || name) }), el('span', null, [el('code', { text: value }), p === null ? null : ' ' + p.toFixed(2)])]),
        p === null ? null : el('div', { class: 'bar' }, [el('span', { style: 'width:' + Math.round(p * 100) + '%' })]),
      ]));
    });
    result.appendChild(answers);

    var noteText = r.check.finalAction ? t('nResolved') + t(r.check.finalAction) : t({ publish: 'nPublish', review: 'nReview', urgent: 'nUrgent' }[r.check.action] || 'nReview');
    var note = el('p', { class: 'note' + (outcome === 'publish' ? ' go' : ''), text: noteText });
    if (!r.check.finalAction && r.check.action !== 'publish') {
      note.appendChild(el('br'));
      if (r.issue) note.appendChild(el('span', null, [t('nIssue'), el('a', { href: r.issue, target: '_blank', rel: 'noopener', text: r.issue.replace('https://github.com/', '') }), ' — ' + t('nIssueCmd')]));
      else note.appendChild(el('span', { class: 'muted', text: t(r.prepared ? 'nOpening' : 'nNoIssue') }));
    }
    result.appendChild(note);
  }

  // --- Recent reports ------------------------------------------------------------------

  function renderReports() {
    var list = document.getElementById('reports');
    list.textContent = '';
    var now = Date.now();
    reports.slice(0, 20).forEach(function (r) {
      var o = outcomeOf(r);
      list.appendChild(el('li', null, [el('button', { type: 'button', onclick: function () { watch(r.id, null); focus(r); } }, [
        el('span', { class: 'badge ' + o, text: t(o) || o }),
        el('span', { class: 'text', text: (r.roadName ? r.roadName + ' — ' : '') + r.description }),
        el('span', { class: 'time', text: r.createdAt ? t('ago')(Math.max(0, Math.round((now - Date.parse(r.createdAt)) / 1000))) : '' }),
      ])]));
    });
  }

  // --- Maps -----------------------------------------------------------------------------

  function style() {
    return {
      version: 8,
      sources: { gsi: { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], tileSize: 256, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>', maxzoom: 18 } },
      layers: [{ id: 'gsi', type: 'raster', source: 'gsi' }],
    };
  }

  function makeMap(id) {
    var map = new maplibregl.Map({ container: id, style: style(), center: CENTER, zoom: 13.4, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', function () {
      map.addSource('reports', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      var color = ['match', ['get', 'outcome'], 'publish', COLORS.publish, 'review', COLORS.review, 'urgent', COLORS.urgent, 'reject', COLORS.reject, COLORS.pending];
      map.addLayer({ id: 'lines', type: 'line', source: 'reports', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': color, 'line-width': 7, 'line-opacity': 0.9 } });
      map.addLayer({ id: 'points', type: 'circle', source: 'reports', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': color, 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
      ['lines', 'points'].forEach(function (layer) {
        map.on('click', layer, function (e) { var id = e.features[0].properties.id; watch(id, null); });
        map.on('mouseenter', layer, function () { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, function () { map.getCanvas().style.cursor = ''; });
      });
      map.demoReady = true;
      updateMaps();
    });
    return map;
  }

  function updateMaps() {
    var all = reports.filter(function (r) { return r.location; }).map(function (r) {
      return { type: 'Feature', geometry: r.location, properties: { id: r.id, outcome: outcomeOf(r), published: r.published } };
    });
    var set = function (map, features) {
      if (map && map.demoReady) map.getSource('reports').setData({ type: 'FeatureCollection', features: features });
    };
    set(maps.hq, all);
    set(maps.pub, all.filter(function (f) { return f.properties.published; }));
  }

  function focus(r) {
    if (!r.location) return;
    var c = r.location.type === 'Point' ? r.location.coordinates : r.location.coordinates[0];
    [maps.hq, maps.pub].forEach(function (m) { if (m) m.easeTo({ center: c, zoom: 15 }); });
  }

  // --- Start ------------------------------------------------------------------------------

  document.getElementById('lang').addEventListener('click', function () {
    lang = lang === 'ja' ? 'en' : 'ja';
    try { localStorage.setItem('lang', lang); } catch (e) {}
    applyLang();
  });
  document.getElementById('theme').addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#141414' : '#F5F2EC');
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  applyLang();
  if (window.maplibregl) { maps.hq = makeMap('map-hq'); maps.pub = makeMap('map-public'); }
  loadConfig();
  loadReports();
  setInterval(loadReports, 8000);
})();
