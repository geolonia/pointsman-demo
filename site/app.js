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
      lead: 'During heavy rain, residents report closed roads. Pointsman checks each report within seconds. Clear reports go straight to the residents’ map. Unclear reports go to a person, and urgent reports go to a person first. The reports are stored in a smart-city data platform (FIWARE).',
      hq: 'Headquarters', hqNote: 'every report', residents: 'Residents', residentsNote: 'only what is published',
      publish: 'publish', review: 'review', urgent: 'urgent', reject: 'rejected', pending: 'waiting for Pointsman',
      send: '1. Send a report', sendNote: 'Pick one. The page really sends it, and Pointsman checks it live.',
      freeOff: 'Free text is switched off in this demo: only prepared reports.',
      watch: '2. Watch', recent: 'Recent reports', recentNote: 'Everyone sees the same reports. Demo data is deleted after a day.',
      what: 'What just happened',
      w1: 'The page saved the report in the city’s data platform: GeonicDB, a FIWARE context broker. The report is stored as a <code>RoadRestriction</code> entity (a data model from <a href="https://datamodels.jp/models/transportation/RoadRestriction/">datamodels.jp</a>).',
      w2: 'The data platform told the bridge about the new report (a subscription). The bridge sent the report to Pointsman as it is. The profile picks the fields it needs, so no conversion code is needed.',
      w3: 'Pointsman asked an AI four questions about the report. It also looked up facts about the place in public data: the flood zone and the nearest evacuation site. Then the city’s rules turned the answers and the facts into an action. The AI does not see the facts; only the rules use them. The bridge saved the result in the data platform: on the report (<code>check</code>) and as a separate <code>Decision</code> entity, so other FIWARE apps can use it too.',
      w4: 'Reports that need a person became GitHub issues. A team member decides with <code>/publish</code> or <code>/reject</code>. The answer goes back to Pointsman, so we can see how often the AI was right.',
      lProfile: 'The profile', lBridge: 'The bridge', lStory: 'Why it works this way', lSource: 'Source of this demo', lQueue: 'The review queue',
      footer: 'Invented events at real places. Do not enter personal data. Map: <a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>.',
      s1: 'Saved in the data platform (context broker)', s2: 'The data platform told the bridge (subscription)', s3: 'Pointsman: an AI answered four questions, and facts about the place were looked up',
      s4: 'Result saved in the data platform (on the report and as a Decision entity)', waiting: 'waiting…',
      showEntity: 'RoadRestriction entity (NGSI-LD)', showDecision: 'Decision entity (NGSI-LD, full IRIs)', showTask: 'Task entity for a person (datamodels.jp Task)', showRequest: 'request',
      rule: 'rule', ruleDefault: 'no rule matched: default action',
      nPublish: 'Clear and consistent: published to the residents’ map without waiting for a person.',
      nReview: 'Not clear enough to publish on its own: a person checks it.',
      nUrgent: 'Someone may be in danger: a person looks at it first.',
      facts: 'Facts about the place (from public data, not from the AI)',
      fFlood: function (c) { return 'Inside a river flood zone (maximum assumed rainfall), expected depth ' + c; },
      fNoFlood: 'Not inside a published river flood zone',
      fShelter: function (n, m) { return 'Nearest evacuation site for floods: ' + n + ', ' + m + ' m'; },
      fNoShelter: 'No evacuation site for floods within 5 km',
      fMissing: function (n, r) { return n + ': could not be looked up (' + r + ')'; },
      fSource: 'Source: ',
      nDeep: 'Deep flood zone (3 m or more): a rule on the facts sends the report to a person first, even though the text alone was not clear enough.',
      floodLayer: 'river flood zone (maximum assumed rainfall)',
      s5: 'Step 2: a second check: can people still reach the evacuation site? (chained decision)',
      evacTitle: 'Step 2 · Evacuation access',
      eAlert: 'Alert for the evacuation site’s staff: people on foot cannot pass the closed section and need a longer way to the site.',
      eNone: 'No alert: the way to the evacuation site is not cut.',
      eReview: 'The way around could not be checked: a person looks at it.',
      fWalk: function (m) { return 'On foot, the way around the closed section is ' + m + ' m longer'; },
      showDecision2: 'Decision entity of step 2 (wasInformedBy: step 1)', showAlert: 'Alert entity (Smart Data Models)',
      alert: 'alert', none: 'no alert',
      nIssue: 'It waits in the review queue: ', nIssueCmd: 'members resolve it with /publish or /reject.',
      nResolved: 'Resolved by a person: ', nNoIssue: 'Only prepared reports go to the GitHub queue.', nOpening: 'Opening an issue in the review queue\u2026',
      q: { category: 'Category', status_matches: 'Status matches the text', danger: 'People in danger', clarity: 'Clear enough to publish' },
      yes: 'yes', no: 'no', usage: function (u, l) { return u + ' of ' + l + ' reports today'; },
      sent: 'sent', limit: 'The demo reached its limit for today.', failed: 'Could not send the report: ',
      ago: function (s) { return s < 60 ? s + ' s ago' : Math.round(s / 60) + ' min ago'; },
      waitingTitle: 'Waiting for a person',
      waitingNote: 'One search in the data platform finds them: every <code>Decision</code> entity whose <code>reviewStatus</code> is "pending". Any FIWARE app can do the same search.',
      waitingNone: 'Nothing is waiting right now.', showQuery: 'the query', more: function (n) { return n + ' more'; },
      waitingFailed: 'Could not load the list.', waitingStale: 'Could not update the list; it may be out of date.',
    },
    ja: {
      demo: 'FIWARE デモ', title: '大雨。通行止めの報告が次々に届く。',
      lead: '大雨の中、住民から通行止めの報告が届きます。Pointsman は報告を 1 件ずつ数秒で確認します。はっきりした報告は、そのまま住民向けの地図に載ります。はっきりしない報告は人が確認し、緊急の報告は真っ先に人が確認します。報告はスマートシティのデータ基盤（FIWARE）に保存されます。',
      hq: '災害対策本部', hqNote: 'すべての報告', residents: '住民向け', residentsNote: '公開されたものだけ',
      publish: '公開', review: '確認', urgent: '緊急', reject: '非公開', pending: 'Pointsman の判定待ち',
      send: '1. 報告を送る', sendNote: '1 つ選んでください。ページが実際に報告を送り、Pointsman がその場で確認します。',
      freeOff: 'このデモでは自由記述は無効です。用意した報告だけを送れます。',
      watch: '2. 見る', recent: '最近の報告', recentNote: '全員が同じ報告を見ています。デモのデータは 1 日で消えます。',
      what: '何が起きたか',
      w1: 'ページが報告を市のデータ基盤に保存しました。データ基盤は GeonicDB（FIWARE のコンテキストブローカー）です。報告は <code>RoadRestriction</code> エンティティ（<a href="https://datamodels.jp/models/transportation/RoadRestriction/">datamodels.jp</a> のデータモデル）として保存されます。',
      w2: 'データ基盤が新しい報告をブリッジに知らせました（サブスクリプション）。ブリッジは報告をそのまま Pointsman に送りました。必要な項目はプロファイルが選ぶので、変換のコードはいりません。',
      w3: 'Pointsman は報告について AI に 4 つの質問をしました。また、公開データから場所の事実（浸水想定区域と最寄りの避難場所）を調べました。そして、市の規則が答えと事実から行動を決めました。AI は事実を見ません。事実を使うのは規則だけです。ブリッジは結果をデータ基盤に保存しました。報告そのもの（<code>check</code>）と、別の <code>Decision</code> エンティティの 2 か所です。そのため、ほかの FIWARE アプリもこの結果を使えます。',
      w4: '人の確認が必要な報告は GitHub の Issue になりました。チームのメンバーが <code>/publish</code> か <code>/reject</code> で決めます。その答えは Pointsman に戻るので、AI がどのくらい正しかったかが分かります。',
      lProfile: 'プロファイル', lBridge: 'ブリッジ', lStory: 'この仕組みの理由', lSource: 'このデモのソース', lQueue: '確認待ちの一覧',
      footer: '場所は実在、出来事は架空です。個人情報は入れないでください。地図：<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>。',
      s1: 'データ基盤（コンテキストブローカー）に保存', s2: 'データ基盤がブリッジに通知（サブスクリプション）', s3: 'Pointsman: AI が 4 つの質問に答え、場所の事実を調査',
      s4: '結果をデータ基盤に保存（報告と Decision エンティティ）', waiting: '待機中…',
      showEntity: 'RoadRestriction エンティティ（NGSI-LD）', showDecision: 'Decision エンティティ（NGSI-LD、完全な IRI）', showTask: '担当者向けの Task エンティティ（datamodels.jp Task）', showRequest: 'リクエスト',
      rule: '規則', ruleDefault: 'どの規則にも当たらず既定の行動',
      nPublish: 'はっきりしていて矛盾もないので、人を待たずに住民向けの地図に公開しました。',
      nReview: 'そのまま公開するには不明な点があるので、人が確認します。',
      nUrgent: '人に危険が及んでいるかもしれないので、真っ先に人が確認します。',
      facts: '場所の事実（AI ではなく、公開データから調べた値）',
      fFlood: function (c) { return '洪水浸水想定区域（想定最大規模）の中、想定される深さ ' + c; },
      fNoFlood: '公開されている洪水浸水想定区域の外',
      fShelter: function (n, m) { return '最寄りの指定緊急避難場所（洪水）: ' + n + '、' + m + ' m'; },
      fNoShelter: '5 km 以内に指定緊急避難場所（洪水）はない',
      fMissing: function (n, r) { return n + ': 調べられなかった（' + r + '）'; },
      fSource: '出典: ',
      nDeep: '深い浸水想定区域（3 m 以上）: 本文だけでは判断がつかなくても、事実にもとづく規則で真っ先に人が確認します。',
      floodLayer: '洪水浸水想定区域（想定最大規模）',
      s5: '第 2 段階: 避難場所まで行けるかを確認（判定の連鎖）',
      evacTitle: '第 2 段階・避難経路',
      eAlert: '避難場所の担当者への警報：歩く人は閉鎖区間を通れず、避難場所へは遠回りが必要です。',
      eNone: '警報なし：避難場所への道は断たれていません。',
      eReview: '迂回路を確認できなかったので、人が確認します。',
      fWalk: function (m) { return '歩いて閉鎖区間を迂回すると ' + m + ' m 長くなる'; },
      showDecision2: '第 2 段階の Decision エンティティ（wasInformedBy：第 1 段階）', showAlert: 'Alert エンティティ（Smart Data Models）',
      alert: '警報', none: '警報なし',
      nIssue: '確認待ちの一覧にあります：', nIssueCmd: 'メンバーが /publish か /reject で決めます。',
      nResolved: '人が確認しました：', nNoIssue: 'GitHub の確認待ちに回るのは用意した報告だけです。', nOpening: '確認待ちの Issue を作成中…',
      q: { category: '規制区分', status_matches: '状態と本文が合っている', danger: '人に危険がある', clarity: '公開できるほど明確' },
      yes: 'はい', no: 'いいえ', usage: function (u, l) { return '本日 ' + u + ' / ' + l + ' 件'; },
      sent: '送信済み', limit: '本日のデモの上限に達しました。', failed: '報告を送れませんでした：',
      ago: function (s) { return s < 60 ? s + ' 秒前' : Math.round(s / 60) + ' 分前'; },
      waitingTitle: '人の確認待ち',
      waitingNote: 'データ基盤での検索 1 回で見つけています。<code>reviewStatus</code> が "pending" の <code>Decision</code> エンティティを探します。ほかの FIWARE アプリも同じ検索ができます。',
      waitingNone: '今は確認待ちはありません。', showQuery: 'クエリ', more: function (n) { return 'ほか ' + n + ' 件'; },
      waitingFailed: '一覧を読み込めませんでした。', waitingStale: '一覧を更新できませんでした。古い可能性があります。',
    },
  };

  var lang = pickLang();
  var config = null;
  var reports = [];
  var pending = null; // { request, total, decisions } from /api/decisions
  var pendingFailed = false; // the last update failed (the list, if any, is older)
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
    renderPending();
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

  function loadPending() {
    return api('/api/decisions').then(function (r) {
      if (!r.ok || !r.body || !Array.isArray(r.body.decisions)) throw new Error(String(r.status));
      pending = r.body;
      pendingFailed = false;
    }).catch(function () {
      pendingFailed = true;
    }).then(renderPending);
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
      var chained = r.ok && r.body.check && (r.body.check.action === 'urgent' || r.body.check.action === 'review');
      var decidedNow = r.ok && r.body.check && (r.body.ngsi && r.body.ngsi.decision);
      if (decidedNow && chained && !me.chainSince) me.chainSince = Date.now();
      // Step 2 comes a few seconds later; if it does not come within a
      // minute, poll slowly instead of fast forever.
      var done = decidedNow && (!chained || r.body.evacuation || Date.now() - me.chainSince > 60000);
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
      written ? el('div', null, [json(t('showEntity'), r.ngsi.entity), json(t('showDecision'), r.ngsi.decision), r.ngsi.task ? json(t('showTask'), r.ngsi.task) : null]) : null));
    // Step 2 of the chain runs only for urgent and review (pointsman#66).
    var chained = decided && (r.check.action === 'urgent' || r.check.action === 'review');
    if (chained) {
      var ev = r.evacuation;
      tl.appendChild(step(t('s5'), ev ? 'done' : 'wait', ev ? seconds(r.check.decidedAt, ev.decidedAt) : '',
        ev ? el('div', null, [json(t('showDecision2'), ev.ngsi.decision), ev.ngsi.alert ? json(t('showAlert'), ev.ngsi.alert) : null]) : null));
    }
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
    var facts = renderFacts(r.facts || []);
    if (facts) result.appendChild(facts);

    var noteText = r.check.finalAction ? t('nResolved') + t(r.check.finalAction) : t({ publish: 'nPublish', review: 'nReview', urgent: 'nUrgent' }[r.check.action] || 'nReview');
    var note = el('p', { class: 'note' + (outcome === 'publish' ? ' go' : ''), text: noteText });
    // The demo profile's rule on the flood fact (pointsman#70): not rule 0,
    // which is danger alone.
    var flood = (r.facts || []).filter(function (f) { return f.name === 'flood' && !f.missing; })[0];
    if (r.check.action === 'urgent' && rule !== '0' && flood && flood.values.rank >= 5) {
      note.appendChild(el('br'));
      note.appendChild(el('span', { text: t('nDeep') }));
    }
    if (!r.check.finalAction && r.check.action !== 'publish') {
      note.appendChild(el('br'));
      if (r.issue) note.appendChild(el('span', null, [t('nIssue'), el('a', { href: r.issue, target: '_blank', rel: 'noopener', text: r.issue.replace('https://github.com/', '') }), ' — ' + t('nIssueCmd')]));
      else note.appendChild(el('span', { class: 'muted', text: t(r.prepared ? 'nOpening' : 'nNoIssue') }));
    }
    result.appendChild(note);
    if (r.evacuation) result.appendChild(renderEvacuation(r.evacuation));
  }

  function renderEvacuation(ev) {
    var box = el('div', { class: 'chain-box' }, [
      el('h3', { text: t('evacTitle') }),
      el('div', { class: 'outcome' }, [el('span', { class: 'badge ' + ev.action, text: t(ev.action) || ev.action })]),
    ]);
    var facts = renderFacts(ev.facts || []);
    if (facts) box.appendChild(facts);
    var text = { alert: 'eAlert', none: 'eNone', review: 'eReview' }[ev.action];
    if (text) box.appendChild(el('p', { class: 'note' + (ev.action === 'none' ? ' go' : ''), text: t(text) }));
    return box;
  }

  // Facts come from the broker: shown only as text.
  function renderFacts(facts) {
    if (!facts.length) return null;
    var list = el('ul', { class: 'facts' });
    var sources = [];
    facts.forEach(function (f) {
      var text;
      if (f.missing) text = t('fMissing')(f.name, f.reason);
      else if (f.name === 'flood') text = f.values.inside ? t('fFlood')(String(f.values.class)) : t('fNoFlood');
      else if (f.name === 'shelter') text = f.values.found ? t('fShelter')(String(f.values.name), f.values.distance_m) : t('fNoShelter');
      else if (f.name === 'walk' && typeof f.values.extra_m === 'number') text = t('fWalk')(f.values.extra_m);
      else text = f.name + ': ' + JSON.stringify(f.values);
      list.appendChild(el('li', { text: text }));
      if (!f.missing && sources.indexOf(f.source) < 0) sources.push(f.source);
    });
    return el('div', { class: 'facts-box' }, [
      el('h3', { text: t('facts') }),
      list,
      sources.length ? el('p', { class: 'muted small', text: t('fSource') + sources.join(' / ') }) : null,
    ]);
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

  // --- Waiting for a person (Decision entities) ---------------------------------------

  function renderPending() {
    var list = document.getElementById('pending');
    var info = document.getElementById('pending-info');
    list.textContent = '';
    info.textContent = '';
    // Without a list, say so; with one, keep it and say it may be old.
    if (pendingFailed) info.appendChild(el('p', { class: 'error small', text: t(pending ? 'waitingStale' : 'waitingFailed') }));
    if (!pending) return;
    var now = Date.now();
    var byId = {};
    reports.forEach(function (r) { byId[r.id] = r; });
    pending.decisions.forEach(function (d) {
      var r = d.refersTo && byId[d.refersTo];
      var a = d.action || 'review';
      list.appendChild(el('li', null, [
        el('button', { type: 'button', onclick: function () { if (d.refersTo) { watch(d.refersTo, null); if (r) focus(r); } } }, [
          el('span', { class: 'badge ' + a, text: t(a) || a }),
          el('span', { class: 'text', text: r ? (r.roadName ? r.roadName + ' — ' : '') + r.description : d.id }),
          el('span', { class: 'time', text: d.decidedAt ? t('ago')(Math.max(0, Math.round((now - Date.parse(d.decidedAt)) / 1000))) : '' }),
        ]),
        d.issue ? el('a', { class: 'issue', href: d.issue, target: '_blank', rel: 'noopener', text: '#' + d.issue.split('/').pop() }) : el('span'),
      ]));
    });
    if (pending.total === 0) info.appendChild(el('p', { class: 'muted small', text: t('waitingNone') }));
    else if (pending.total > pending.decisions.length) info.appendChild(el('p', { class: 'muted small', text: t('more')(pending.total - pending.decisions.length) }));
    var q = pending.request;
    var url = q.url;
    try { url = decodeURIComponent(q.url); } catch (e) {}
    info.appendChild(el('details', null, [el('summary', { text: t('showQuery') }),
      el('pre', { text: q.method + ' ' + url + '\nNGSILD-Tenant: ' + q.tenant + '\nLink: <' + q.link + '>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' })]));
  }

  // --- Maps -----------------------------------------------------------------------------

  // The headquarters map also shows the river flood zones the facts come from.
  function style(withFlood) {
    var s = {
      version: 8,
      sources: { gsi: { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], tileSize: 256, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>', maxzoom: 18 } },
      layers: [{ id: 'gsi', type: 'raster', source: 'gsi' }],
    };
    if (withFlood) {
      s.sources.flood = { type: 'raster', tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 2, maxzoom: 17, attribution: '<a href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html">「ハザードマップポータルサイト」</a>洪水浸水想定区域' };
      s.layers.push({ id: 'flood', type: 'raster', source: 'flood', paint: { 'raster-opacity': 0.55 } });
    }
    return s;
  }

  function makeMap(id, withFlood) {
    var map = new maplibregl.Map({ container: id, style: style(withFlood), center: CENTER, zoom: 13.4, attributionControl: { compact: true } });
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
  if (window.maplibregl) { maps.hq = makeMap('map-hq', true); maps.pub = makeMap('map-public', false); }
  loadConfig();
  loadReports();
  loadPending();
  setInterval(function () { loadReports(); loadPending(); }, 8000);
})();
