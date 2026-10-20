// The demo page, as a guided flow in three steps: pick a report, watch
// Pointsman decide, see what happens next (and decide it yourself when a
// person is needed). The technical layer is behind "How it works".
// Report texts come from the API (anyone can send one): they are only ever set
// as text, never as HTML.
(function () {
  'use strict';

  var CENTER = [139.753, 35.688];
  var COLORS = { publish: '#2E9E6B', review: '#C98A1B', urgent: '#C8463A', reject: '#7A68B8', pending: '#8f8a82' };
  var STEPS = ['pick', 'decide', 'result'];

  var T = {
    en: {
      demo: 'demo', title: 'Heavy rain. Reports of closed roads are coming in.',
      lead: 'Send one, and watch Pointsman decide in seconds what happens to it. It reads the report, checks the place on public maps, and applies the city’s rules.',
      st1: 'Pick a report', st2: 'Pointsman decides', st3: 'What happens next',
      howTitle: 'How it works', close: 'Close',
      howLead: 'Pointsman is a small service that takes decisions for a city’s apps. The AI only answers questions. Public data gives facts about the place. The city’s own rules decide. People have the last word.',
      h1k: '1 · The report', h1t: 'A resident’s app saves it', h1d: 'in the city’s data platform. This demo uses GeonicDB, which follows the open FIWARE standard (NGSI-LD).',
      h2k: '2 · Passed on', h2t: 'The data platform tells Pointsman', h2d: 'A small connector (the bridge) sends each new report. The apps do not change.',
      h3k: '3 · Pointsman', h3t: 'Questions, facts, rules', h3d: 'An AI answers fixed questions. Public map data gives facts. The city’s rules turn both into one action.',
      h4k: '4 · The result', h4t: 'Saved back, open to every app', h4d: 'Unclear or urgent reports go to a person. Their answer tells Pointsman how often the AI was right.',
      forDevs: 'For developers', lProfile: 'The questions and rules (profile)', lBridge: 'The FIWARE bridge', lStory: 'Why it works this way', lSource: 'Source of this demo', lQueue: 'The review queue',
      recent: 'Recent reports', recentNote: 'Everyone sees the same reports. Demo data is deleted after a day.',
      waitingTitle: 'Waiting for a person',
      waitingNote: 'One search in the data platform finds them: every <code>Decision</code> entity whose <code>reviewStatus</code> is "pending". Any FIWARE app can do the same search.',
      waitingNone: 'Nothing is waiting right now.', showQuery: 'the query', more: function (n) { return n + ' more'; },
      waitingFailed: 'Could not load the list.', waitingStale: 'Could not update the list; it may be out of date.',
      pickTitle: 'Pick a report', pickNote: 'Each one is sent live to Pointsman. They show four different outcomes.',
      moreTitle: 'More examples', pickFoot: 'Invented events at real places in Tokyo. Everyone sees the same reports; they are deleted after a day.',
      usage: function (u, l) { return '(' + u + ' of ' + l + ' reports today)'; },
      limit: 'The demo reached its limit for today. Please come back tomorrow.', failed: 'Could not send the report: ',
      decideTitle: 'Pointsman decides', yourReport: 'Your report', aReport: 'A report', noRoad: '(no road name)',
      s1: 'Saved in the city’s data platform', s1d: 'The way any city app would save it.',
      s2: 'The AI answered four questions', s2d: 'It reads the text. It does not decide.',
      s3: 'Pointsman checked the place on maps', s3d: 'Flood zone and nearest evacuation site, from public map data.',
      s4: 'The city’s rule decided', s4d: 'Answers and facts in, one action out.',
      working: 'Working…',
      answersTitle: 'What the AI answered', factsTitle: 'Map checks · from public map data; the AI never sees them',
      ruleTitle: 'The city’s rule', next: 'What happens next →', showData: 'Show the data in the data platform (for developers)',
      showRequest: 'request', showEntity: 'RoadRestriction entity (NGSI-LD)', showDecision: 'Decision entity (NGSI-LD, full IRIs)', showTask: 'Task entity for a person (datamodels.jp)',
      showDecision2: 'Decision entity of the second check', showAlert: 'Alert entity (Smart Data Models)',
      q: { category: 'Why is the road closed?', status_matches: 'Does the status match the text?', danger: 'Is someone in danger?', clarity: 'How clear is the report?' },
      cat: {
        closedWeather: 'Weather or disaster', closedConstruction: 'Roadworks', closedHeavyVehicle: 'Closed to large vehicles', closedWinter: 'Closed for winter',
        laneRestriction: 'Some lanes closed', alternatingOneWay: 'One lane, taking turns', mobileRestriction: 'Moving restriction',
        chainRestriction: 'Snow chains required', chainGuidance: 'Snow chains recommended', other: 'Something else',
      },
      clarity: ['Unclear what or where', 'Place or cause unclear', 'Clear enough', 'Clear: what, where, since when'],
      yes: 'Yes', no: 'No',
      conf: { vsure: 'very sure', sure: 'sure', fair: 'fairly sure', unsure: 'unsure' },
      rules: {
        '0': 'If someone may be in danger, a person sees it first.',
        '1': 'In a deep flood zone (3 m or more), a report that may mean danger goes to a person first.',
        '2': 'The flood zone could not be checked, and someone may be in danger: a person looks.',
        '3': 'Clear, consistent reports with nobody in danger are published at once.',
        'default': 'No rule for publishing fits: a person checks it.',
      },
      act: { publish: 'publish', review: 'review', urgent: 'urgent', reject: 'rejected', pending: 'being checked', alert: 'alert', none: 'no alert' },
      resultTitle: 'What happens next',
      oPublish: 'Published: residents see it now', ePublish: 'No person was needed. The report is on the residents’ map, seconds after it was sent.',
      oReview: 'Waiting for a person', eReview: 'Headquarters sees it. Residents don’t, until someone checks it.',
      oUrgent: 'Urgent: a person sees it first', eUrgent: 'It is at the top of the list at headquarters. Residents see it once a person has checked it.',
      oFinalPublish: 'Published after a check', eFinalPublish: 'A person checked it. Residents see it now.',
      oFinalReject: 'Rejected after a check', eFinalReject: 'A person checked it. Residents never see it.',
      chainKicker: 'A second check, started by the first', chainTitle: 'Can people still walk to their evacuation site?',
      cAlert: 'Alert sent to the staff of the evacuation site.', cReview: 'The way around could not be checked: a person looks at it.',
      fQ: { flood: 'Is the place in a river flood zone?', shelter: 'Where is the nearest flood evacuation site?', walk: 'With this road closed, how much longer is the walk?' },
      fFlood: function (c) { return 'Yes: water depth ' + c; },
      fNoFlood: 'No, not in a published flood zone',
      fShelter: function (n, m) { return n + ', ' + m + ' m away'; },
      fNoShelter: 'None within 5 km',
      fWalk: function (m) { return m + ' m longer on foot'; },
      fNoWalk: 'No way around on foot',
      fMissing: function (r) { return 'Could not be checked (' + r + ')'; },
      fSource: 'Source: ',
      fShelterMap: function (n, m) { return 'Evacuation site: ' + n + ' · ' + m + ' m'; },
      floodClass: {},
      mapChecks: 'map checks:', ch: { flood: 'flood zone', shelter: 'evacuation site', walk: 'way around on foot' },
      fRouteMap: function (m) { return 'Way around on foot: +' + m + ' m'; },
      fShelterNote: 'No rule of this check uses it: it is context for the person who checks. The second check uses it.',
      dutyTitle: 'You are the person on duty',
      dutyText: 'In the city, a team member gets this as a task. Here, you decide: should residents see this report?',
      doPublish: 'Publish it', doReject: 'Reject it', deciding: 'Sending…',
      didPublish: 'Published. The residents’ map shows it now.', didReject: 'Rejected. Residents never see it.',
      learn: 'Pointsman keeps your answer. Over time it shows how often the AI was right, and where the city’s rules need a change.',
      decideFailed: 'Could not send your answer: ',
      otherTitle: 'A person decides',
      otherText: 'A team member checks this report in the review queue.',
      otherNoIssue: 'Only reports sent from this page go to the review queue.',
      otherOpening: 'It is being added to the review queue…',
      openIssue: 'Open it in the review queue',
      whyTitle: 'Why cities use it this way',
      why1: 'The AI only answers fixed questions. It never decides alone.',
      why2: 'Facts come from public data, so anyone can check them.',
      why3: 'The city writes the rules, and can read every decision later.',
      why4: 'A person has the last word whenever it matters.',
      again: 'Try another report',
      statsTitle: 'The last 7 days',
      stats1: function (n, pub, person, urgent) {
        return plural(n, 'report', 'reports') + ': ' + pub + ' published at once, ' + person + ' sent to a person' + (urgent ? ' (' + urgent + ' urgent).' : '.');
      },
      stats2: function (u, p, r, w) { return 'Of the ' + plural(u, 'unclear report', 'unclear reports') + ', people published ' + p + ' and rejected ' + r + '; ' + w + ' still waiting.'; },
      statsCorrected: function (c) { return 'In ' + plural(c, 'report', 'reports') + ', a person corrected at least one of the AI’s answers.'; },
      statsNone: 'No reports in the last 7 days. Yours will be the first.',
      statsSource: 'From Pointsman’s decision log: every decision is recorded.',
      mapTitle: 'The city map', hq: 'Headquarters', residents: 'Residents',
      capNone: 'Every report of the last day is on this map. Yours appears as soon as you send it.',
      capHq: 'Headquarters sees every report, also the ones waiting for a person.',
      capResYes: 'Residents see your report now.', capResNo: 'Residents only see published reports. Yours is not here (yet).',
      capRes: 'Residents only see published reports.',
      lgPublish: 'published', lgReview: 'waiting for a person', lgUrgent: 'urgent', lgReject: 'rejected', lgPending: 'being checked',
      floodLayer: 'river flood zone (maximum assumed rainfall)',
      ago: function (s) { return s < 60 ? s + ' s ago' : Math.round(s / 60) + ' min ago'; },
      aSteps: 'Steps', aWhose: 'Whose map', aMap: 'Map of the reports', aTheme: 'Switch theme',
      footer: 'Invented events at real places. Do not enter personal data. Map: <a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>.',
    },
    ja: {
      demo: 'デモ', title: '大雨。通行止めの報告が次々に届く。',
      lead: '報告を 1 件送ってみてください。その報告をどうするかを、Pointsman が数秒で決めます。報告を読み、場所を公開の地図で調べ、市の規則を当てはめます。',
      st1: '報告を選ぶ', st2: 'Pointsman が決める', st3: 'その後どうなるか',
      howTitle: '仕組み', close: '閉じる',
      howLead: 'Pointsman は、市のアプリに代わって判断する小さなサービスです。AI は質問に答えるだけです。場所の事実は公開データから調べます。行動を決めるのは市の規則です。最後に決めるのは人です。',
      h1k: '1・報告', h1t: '住民のアプリが保存する', h1d: '保存先は市のデータ基盤です。このデモでは、オープンな FIWARE の標準（NGSI-LD）に沿った GeonicDB を使います。',
      h2k: '2・受け渡し', h2t: 'データ基盤が Pointsman に知らせる', h2d: '小さな接続部品（ブリッジ）が、新しい報告を 1 件ずつ送ります。アプリは変えなくて済みます。',
      h3k: '3・Pointsman', h3t: '質問、事実、規則', h3d: 'AI が決まった質問に答えます。場所の事実は公開の地図データから調べます。市の規則が、答えと事実から行動を 1 つ決めます。',
      h4k: '4・結果', h4t: 'データ基盤に戻し、どのアプリでも使える', h4d: 'はっきりしない報告と緊急の報告は人に回ります。人の答えから、AI がどのくらい正しかったかが分かります。',
      forDevs: '開発者向け', lProfile: '質問と規則（プロファイル）', lBridge: 'FIWARE ブリッジ', lStory: 'この仕組みの理由', lSource: 'このデモのソース', lQueue: '確認待ちの一覧',
      recent: '最近の報告', recentNote: '全員が同じ報告を見ています。デモのデータは 1 日で消えます。',
      waitingTitle: '人の確認待ち',
      waitingNote: 'データ基盤での検索 1 回で見つけています。<code>reviewStatus</code> が "pending" の <code>Decision</code> エンティティを探します。ほかの FIWARE アプリも同じ検索ができます。',
      waitingNone: '今は確認待ちはありません。', showQuery: 'クエリ', more: function (n) { return 'ほか ' + n + ' 件'; },
      waitingFailed: '一覧を読み込めませんでした。', waitingStale: '一覧を更新できませんでした。古い可能性があります。',
      pickTitle: '報告を選ぶ', pickNote: 'どれもその場で Pointsman に送られます。4 つとも結果が違います。',
      moreTitle: 'ほかの例', pickFoot: '場所は東京に実在しますが、出来事は架空です。全員が同じ報告を見ています。報告は 1 日で消えます。',
      usage: function (u, l) { return '（本日 ' + u + ' / ' + l + ' 件）'; },
      limit: '本日のデモの上限に達しました。また明日お試しください。', failed: '報告を送れませんでした：',
      decideTitle: 'Pointsman が決める', yourReport: 'あなたの報告', aReport: '報告', noRoad: '（道路名なし）',
      s1: '市のデータ基盤に保存', s1d: '市のアプリが保存するのと同じ方法です。',
      s2: 'AI が 4 つの質問に答えた', s2d: 'AI は本文を読むだけで、決めはしません。',
      s3: 'Pointsman が地図で場所を調べた', s3d: '浸水想定区域と最寄りの避難場所を、公開の地図データから調べます。',
      s4: '市の規則が決めた', s4d: '答えと事実から、行動を 1 つ決めます。',
      working: '処理中…',
      answersTitle: 'AI の答え', factsTitle: '地図での確認・公開の地図データから。AI はこれを見ません',
      ruleTitle: '市の規則', next: 'その後どうなるか →', showData: 'データ基盤のデータを見る（開発者向け）',
      showRequest: 'リクエスト', showEntity: 'RoadRestriction エンティティ（NGSI-LD）', showDecision: 'Decision エンティティ（NGSI-LD、完全な IRI）', showTask: '担当者向けの Task エンティティ（datamodels.jp）',
      showDecision2: '2 つ目の確認の Decision エンティティ', showAlert: 'Alert エンティティ（Smart Data Models）',
      q: { category: 'なぜ通れないのか', status_matches: '状態と本文は合っているか', danger: '人に危険があるか', clarity: '報告はどのくらいはっきりしているか' },
      cat: {
        closedWeather: '天候・災害', closedConstruction: '工事', closedHeavyVehicle: '大型車のみ通行止め', closedWinter: '冬期通行止め',
        laneRestriction: '一部の車線を規制', alternatingOneWay: '片側交互通行', mobileRestriction: '移動規制',
        chainRestriction: 'チェーン規制', chainGuidance: 'チェーン指導', other: 'その他',
      },
      clarity: ['何がどこで起きたか不明', '場所か原因が不明', '少し足りないが分かる', '何が・どこで・いつからが明確'],
      yes: 'はい', no: 'いいえ',
      conf: { vsure: 'とても自信がある', sure: '自信がある', fair: 'やや自信がある', unsure: '自信がない' },
      rules: {
        '0': '人に危険がありそうなら、真っ先に人が確認する。',
        '1': '深い浸水想定区域（3 m 以上）で危険がありそうな報告は、真っ先に人が確認する。',
        '2': '浸水想定区域を調べられず、危険がありそうなら、人が確認する。',
        '3': 'はっきりしていて矛盾がなく、危険のない報告は、すぐに公開する。',
        'default': '公開の規則に当てはまらないので、人が確認する。',
      },
      act: { publish: '公開', review: '確認', urgent: '緊急', reject: '非公開', pending: '判定中', alert: '警報', none: '警報なし' },
      resultTitle: 'その後どうなるか',
      oPublish: '公開：住民がすぐに見られます', ePublish: '人の確認は不要でした。送ってから数秒で、住民向けの地図に載りました。',
      oReview: '人の確認待ち', eReview: '災害対策本部では見えます。住民には、誰かが確認するまで見えません。',
      oUrgent: '緊急：真っ先に人が確認します', eUrgent: '災害対策本部の一覧のいちばん上に出ます。住民には、人が確認してから見えます。',
      oFinalPublish: '確認のうえ公開', eFinalPublish: '人が確認しました。住民が見られます。',
      oFinalReject: '確認のうえ非公開', eFinalReject: '人が確認しました。住民には見えません。',
      chainKicker: '1 つ目の確認から始まった 2 つ目の確認', chainTitle: '歩いて避難場所まで行けるか',
      cAlert: '避難場所の担当者に警報を送りました。', cReview: '迂回路を確認できなかったので、人が確認します。',
      fQ: { flood: '洪水浸水想定区域の中か', shelter: '最寄りの指定緊急避難場所（洪水）はどこか', walk: 'この道を通れないと、歩く道のりはどれだけ長くなるか' },
      fFlood: function (c) { return 'はい：想定される深さ ' + c; },
      fNoFlood: 'いいえ（公開されている区域の外）',
      fShelter: function (n, m) { return n + '、' + m + ' m 先'; },
      fNoShelter: '5 km 以内にない',
      fWalk: function (m) { return '歩くと ' + m + ' m 長くなる'; },
      fNoWalk: '歩いて迂回できない',
      fMissing: function (r) { return '調べられなかった（' + r + '）'; },
      fSource: '出典：',
      fShelterMap: function (n, m) { return '避難場所：' + n + '・' + m + ' m'; },
      // Pointsman's depth classes (from the hazard map portal's legend).
      floodClass: {
        'below 0.3 m': '0.3 m 未満', 'below 0.5 m': '0.5 m 未満', '0.5 to 1 m': '0.5〜1 m', '0.5 to 3 m': '0.5〜3 m',
        '3 to 5 m': '3〜5 m', '5 to 10 m': '5〜10 m', '10 to 20 m': '10〜20 m', '20 m or more': '20 m 以上',
      },
      mapChecks: '地図で調べること：', ch: { flood: '浸水想定区域', shelter: '避難場所', walk: '歩いて迂回' },
      fRouteMap: function (m) { return '歩いて迂回：+' + m + ' m'; },
      fShelterNote: 'この確認の規則では使いません。確認する人のための参考情報です。2 つ目の確認で使います。',
      dutyTitle: 'あなたが担当者です',
      dutyText: '市では、チームのメンバーがこれを仕事として受け取ります。ここではあなたが決めてください。この報告を住民に見せますか。',
      doPublish: '公開する', doReject: '公開しない', deciding: '送信中…',
      didPublish: '公開しました。住民向けの地図に載っています。', didReject: '公開しませんでした。住民には見えません。',
      learn: 'Pointsman はあなたの答えを記録します。AI がどのくらい正しかったか、市の規則のどこを直すべきかが、だんだん分かります。',
      decideFailed: '答えを送れませんでした：',
      otherTitle: '人が決めます',
      otherText: 'チームのメンバーが確認待ちの一覧で確認します。',
      otherNoIssue: '確認待ちの一覧に回るのは、このページから送った報告だけです。',
      otherOpening: '確認待ちの一覧に追加しています…',
      openIssue: '確認待ちの一覧で開く',
      whyTitle: '市がこの仕組みを使う理由',
      why1: 'AI は決まった質問に答えるだけで、ひとりでは決めません。',
      why2: '事実は公開データから調べるので、誰でも確かめられます。',
      why3: '規則は市が書き、どの判断も後から読めます。',
      why4: '大事なところでは、最後に人が決めます。',
      again: 'ほかの報告を試す',
      statsTitle: 'この 7 日間の数字',
      stats1: function (n, pub, person, urgent) {
        return '報告は ' + n + ' 件です。' + pub + ' 件はすぐに公開され、' + person + ' 件は人の確認に回りました' + (urgent ? '（うち緊急 ' + urgent + ' 件）。' : '。');
      },
      stats2: function (u, p, r, w) { return 'はっきりしない報告 ' + u + ' 件のうち、人が公開したのは ' + p + ' 件、公開しなかったのは ' + r + ' 件です。' + w + ' 件はまだ確認待ちです。'; },
      statsCorrected: function (c) { return '人が AI の答えを 1 つ以上直した報告は ' + c + ' 件です。'; },
      statsNone: 'この 7 日間の報告はまだありません。あなたの報告が最初になります。',
      statsSource: 'Pointsman の判断記録から集計しています。判断はすべて記録されます。',
      mapTitle: '市の地図', hq: '災害対策本部', residents: '住民向け',
      capNone: 'この 1 日の報告がすべて地図に載っています。あなたの報告も、送るとすぐに載ります。',
      capHq: '災害対策本部では、人の確認待ちも含めてすべての報告が見えます。',
      capResYes: 'あなたの報告は住民に見えています。', capResNo: '住民に見えるのは公開された報告だけです。あなたの報告は（まだ）載っていません。',
      capRes: '住民に見えるのは公開された報告だけです。',
      lgPublish: '公開', lgReview: '人の確認待ち', lgUrgent: '緊急', lgReject: '非公開', lgPending: '判定中',
      floodLayer: '洪水浸水想定区域（想定最大規模）',
      ago: function (s) { return s < 60 ? s + ' 秒前' : Math.round(s / 60) + ' 分前'; },
      aSteps: '手順', aWhose: '誰の地図か', aMap: '報告の地図', aTheme: '表示テーマを切り替える',
      footer: '場所は実在、出来事は架空です。個人情報は入れないでください。地図：<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>。',
    },
  };

  var lang = pickLang();
  var config = null;
  var reports = [];
  var pending = null; // { request, total, decisions } from /api/decisions
  var pendingFailed = false; // the last update failed (the list, if any, is older)
  var current = null; // { id, key, sentAt, request, last, poll, shown, reveal }
  var step = 'pick';
  var view = 'hq';
  var map = null;
  var sending = false; // a report is being sent: its buttons stay disabled, also after a language switch

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'ja' || q === 'en') return q;
    try { var s = localStorage.getItem('lang'); if (s === 'ja' || s === 'en') return s; } catch (e) {}
    return (navigator.language || '').startsWith('ja') ? 'ja' : 'en';
  }
  function t(key) { return T[lang][key]; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function quote(text) { return lang === 'ja' ? '「' + text + '」' : '“' + text + '”'; }

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
  function $(id) { return document.getElementById(id); }

  // The key that lets this visitor decide their own report (sent with it).
  function keyOf(id) { try { return sessionStorage.getItem('key:' + id); } catch (e) { return null; } }
  function keepKey(id, key) { try { sessionStorage.setItem('key:' + id, key); } catch (e) {} }

  // Our own fixed texts may contain markup (links, code); data never goes here.
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (n) { var v = t(n.dataset.i18n); if (typeof v === 'string') n.innerHTML = v; });
    $('lang').textContent = lang === 'ja' ? 'English' : '日本語';
    $('lang').setAttribute('lang', lang === 'ja' ? 'en' : 'ja');
    $('stepper').setAttribute('aria-label', t('aSteps'));
    document.querySelector('.toggle').setAttribute('aria-label', t('aWhose'));
    $('map').setAttribute('aria-label', t('aMap'));
    $('theme').setAttribute('aria-label', t('aTheme'));
    renderPrepared();
    renderUsage();
    renderReports();
    renderPending();
    renderCaption();
    renderStats();
    renderShelterLabel();
    if (current) renderCurrent();
  }

  function outcomeOf(r) {
    if (!r.check) return 'pending';
    return r.check.finalAction || r.check.action;
  }

  // --- Steps -------------------------------------------------------------------

  function setStep(s, scroll) {
    step = s;
    STEPS.forEach(function (name, i) {
      $('step-' + name).hidden = name !== s;
      var li = document.querySelector('#stepper [data-step="' + name + '"]');
      li.className = name === s ? 'active' : i < STEPS.indexOf(s) ? 'done' : '';
      if (name === s) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (scroll) $('stepper').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setView(v) {
    view = v;
    $('view-hq').setAttribute('aria-pressed', String(v === 'hq'));
    $('view-res').setAttribute('aria-pressed', String(v === 'res'));
    $('legend-flood').hidden = v !== 'hq';
    if (map && map.demoReady) map.setLayoutProperty('flood', 'visibility', v === 'hq' ? 'visible' : 'none');
    setShelterVisible();
    updateMap();
    renderCaption();
  }

  function renderCaption() {
    var c;
    if (!current) c = view === 'hq' ? t('capNone') : t('capRes');
    else if (view === 'hq') c = t('capHq');
    else c = current.last && outcomeOf(current.last) === 'publish' ? t('capResYes') : t('capResNo');
    $('map-caption').textContent = c;
  }

  // --- API -------------------------------------------------------------------

  function api(path, init) {
    return fetch(path, init).then(function (res) {
      return res.json().then(function (body) { return { ok: res.ok, status: res.status, body: body }; });
    });
  }

  // Without the configuration there are no buttons: show the error and retry.
  function loadConfig() {
    var err = $('send-error');
    return api('/api/config').then(function (r) {
      if (!r.ok || !r.body || !Array.isArray(r.body.prepared)) throw new Error(r.body && r.body.error || String(r.status));
      config = r.body;
      err.hidden = true;
      renderUsage();
      renderPrepared();
    }).catch(function (e) {
      err.textContent = t('failed') + e.message;
      err.hidden = false;
      setTimeout(loadConfig, 5000);
    });
  }

  function renderUsage() {
    $('usage').textContent = config ? t('usage')(config.today.used, config.today.limit) : '';
  }

  function loadReports() {
    return api('/api/reports').then(function (r) {
      if (!r.ok) return;
      reports = r.body.reports;
      renderReports();
      updateMap();
    }).catch(function () {});
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

  // --- Step 1: pick ---------------------------------------------------------------

  function renderPrepared() {
    var featured = $('featured');
    var more = $('more');
    featured.textContent = '';
    more.textContent = '';
    if (!config) return;
    var others = 0;
    // One example per outcome, in the order of the story.
    var order = ['flooded-underpass', 'vague', 'car-trapped', 'bridge-blocked'];
    var rank = function (p) { var i = order.indexOf(p.id); return i < 0 ? order.length : i; };
    config.prepared.slice().sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (p) {
      if (p.featured) {
        featured.appendChild(el('li', null, [el('button', { type: 'button', class: 'card', onclick: function () { send(p); } }, [
          el('span', { class: 'label', text: p.featured[lang] }),
          el('strong', { class: 'road', text: titleOf(p) }),
          placeOf(p) ? el('span', { class: 'place', text: placeOf(p) }) : null,
          el('span', { class: 'text', text: quote(p.description[lang]) }),
          el('span', { class: 'checks-hint' }, [el('span', { text: t('mapChecks') })].concat(checksOf(p).map(function (c) {
            return el('span', { class: 'chip-map', text: t('ch')[c] });
          }))),
        ])]));
      } else {
        others += 1;
        more.appendChild(el('li', null, [el('button', { type: 'button', onclick: function () { send(p); } }, [
          el('strong', { text: titleOf(p) }), placeOf(p) ? ' · ' : '', el('span', { class: 'muted', text: placeOf(p) }),
        ])]));
      }
    });
    $('more-summary').textContent = t('moreTitle') + ' (' + others + ')';
    document.querySelectorAll('#step-pick button').forEach(function (b) { b.disabled = sending; });
  }

  // The map checks a prepared report gets: the profile's two facts, and the
  // walk around (step 2 of the chain) for a closed section that goes to a
  // person. An approximation of the server's routes: a Point gets no walk fact.
  function titleOf(p) { return (p.title && p.title[lang]) || p.roadName || t('noRoad'); }
  function placeOf(p) { return (p.place && p.place[lang]) || ''; }

  function checksOf(p) {
    return ['flood', 'shelter'].concat(p.location.type === 'LineString' && p.expected !== 'publish' ? ['walk'] : []);
  }

  function send(p) {
    var err = $('send-error');
    err.hidden = true;
    if (sending) return;
    sending = true;
    document.querySelectorAll('#step-pick button').forEach(function (b) { b.disabled = true; });
    var request = { prepared: p.id, lang: lang };
    var sentAt = Date.now();
    api('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })
      .then(function (r) {
        if (r.status === 429 && r.body.today) { err.textContent = t('limit'); err.hidden = false; return; }
        if (!r.ok) { err.textContent = t('failed') + (r.body.error || r.status); err.hidden = false; return; }
        if (config) { config.today.used += 1; renderUsage(); }
        if (r.body.key) keepKey(r.body.id, r.body.key);
        watch(r.body.id, { sentAt: sentAt, request: request, location: p.location, prepared: p });
      })
      .catch(function (e) { err.textContent = t('failed') + e.message; err.hidden = false; })
      .finally(function () {
        sending = false;
        document.querySelectorAll('#step-pick button').forEach(function (b) { b.disabled = false; });
      });
  }

  // --- Step 2 and 3: one report ------------------------------------------------------

  function watch(id, info) {
    if (current) { clearTimeout(current.poll); clearInterval(current.reveal); }
    clearShelter();
    current = Object.assign({ id: id, key: keyOf(id), last: null, shown: 0 }, info || {});
    setView('hq');
    if (current.location) focus(current.location);
    setStep('decide', true);
    renderCurrent();
    poll();
  }

  // A poll whose answer comes after a newer poll or a decision is dropped.
  function poll() {
    var me = current;
    var seq = me.seq = (me.seq || 0) + 1;
    api('/api/reports/' + encodeURIComponent(me.id)).then(function (r) {
      if (current !== me || seq !== me.seq) return;
      if (r.ok) {
        var first = !me.last;
        // The bridge writes the visitor's decision to the report a few seconds later.
        if (me.decision && r.body.check && !r.body.check.finalAction) {
          r.body.check.finalAction = me.decision;
          r.body.visitorDecision = me.decision;
          r.body.published = me.decision === 'publish';
        }
        me.last = r.body;
        if (first && r.body.location) focus(r.body.location);
        // The steps of a decision that was already there are shown at once.
        if (first && r.body.check && !me.sentAt) me.shown = 4;
        startReveal();
        // Redraw only when something changed: open details and focus stay.
        var b0 = r.body;
        var sig = JSON.stringify([b0.createdAt, b0.check && [b0.check.action, b0.check.finalAction, b0.check.policyRule], !!(b0.ngsi && b0.ngsi.decision), b0.evacuation && b0.evacuation.action, b0.visitorDecision, b0.issue]);
        if (sig !== me.sig) {
          me.sig = sig;
          renderCurrent();
          renderCaption();
          updateMap();
        }
      }
      var b = r.ok ? r.body : null;
      var chained = b && b.check && (b.check.action === 'urgent' || b.check.action === 'review');
      var decidedNow = b && b.check && b.ngsi && b.ngsi.decision;
      if (decidedNow && chained && !me.chainSince) me.chainSince = Date.now();
      // The second check comes a few seconds later; if it does not come within
      // a minute, poll slowly instead of fast forever.
      var done = decidedNow && (!chained || b.evacuation || Date.now() - me.chainSince > 60000);
      var resolved = done && (b.check.finalAction || b.check.action === 'publish');
      me.poll = setTimeout(poll, !done ? 1200 : resolved ? 30000 : 4000);
      if (decidedNow && !me.mapped) { me.mapped = true; loadReports(); }
    }).catch(function () { if (current === me && seq === me.seq) me.poll = setTimeout(poll, 3000); });
  }

  // Once the decision is there, its parts appear one after the other.
  function startReveal() {
    var me = current;
    var r = me.last;
    if (r && r.createdAt && me.shown < 1) me.shown = 1;
    if (!r || !r.check || me.reveal || me.shown >= 4) return;
    me.reveal = setInterval(function () {
      if (current !== me) return clearInterval(me.reveal);
      me.shown += 1;
      if (me.shown >= 4) clearInterval(me.reveal);
      renderCurrent();
    }, 450);
  }

  function seconds(from, to) {
    var a = Date.parse(from), b = Date.parse(to);
    return isFinite(a) && isFinite(b) ? ((b - a) / 1000).toFixed(1) + ' s' : '';
  }

  function json(label, value) {
    return el('details', null, [el('summary', { text: label }), el('pre', { text: JSON.stringify(value, null, 2) })]);
  }

  function renderCurrent() {
    var r = current.last;
    var p = current.prepared;
    var where = p ? [titleOf(p), placeOf(p)].filter(Boolean).join(' · ') : r ? r.roadName || t('noRoad') : '';
    $('cur-kicker').textContent = (current.sentAt ? t('yourReport') : t('aReport')) + (where ? ' · ' + where : '');
    $('cur-text').textContent = r ? quote(r.description) : '';
    renderTimeline(r);
    renderAnswers(r);
    renderDecisionFacts(r);
    renderRule(r);
    renderData(r);
    if (r && r.evacuation && current.shown >= 3) showRoute(r.evacuation.facts || []);
    if (step === 'result') renderResult(r);
  }

  function renderTimeline(r) {
    var tl = $('timeline');
    tl.textContent = '';
    var shown = current.shown;
    var times = [
      r && r.createdAt && current.sentAt ? seconds(new Date(current.sentAt).toISOString(), r.createdAt) : '',
      '', '',
      r && r.check ? seconds(current.sentAt ? new Date(current.sentAt).toISOString() : r.createdAt, r.check.decidedAt) : '',
    ];
    ['s1', 's2', 's3', 's4'].forEach(function (k, i) {
      var done = i < shown;
      var active = i === shown;
      tl.appendChild(el('li', { class: done ? 'done' : active ? 'active' : '' }, [
        el('span', { class: 'mark', 'aria-hidden': 'true' }),
        el('span', { class: 'what' }, [el('strong', { text: t(k) }), el('span', { text: done ? t(k + 'd') : active ? t('working') : '' })]),
        el('span', { class: 'time', text: done ? times[i] : '' }),
      ]));
    });
  }

  function confidence(p) {
    if (typeof p !== 'number') return null;
    return p >= 0.9 ? 'vsure' : p >= 0.75 ? 'sure' : p >= 0.6 ? 'fair' : 'unsure';
  }

  function answerText(name, value) {
    if (typeof value === 'boolean') return value ? t('yes') : t('no');
    if (name === 'category') return t('cat')[value] || String(value);
    if (name === 'clarity' && typeof value === 'number') return t('clarity')[value] || String(value);
    return String(value);
  }

  function renderAnswers(r) {
    var box = $('answers');
    box.textContent = '';
    if (!r || !r.check || current.shown < 2) return;
    var list = el('div', { class: 'qa' });
    Object.keys(r.check.answers).forEach(function (name) {
      var a = r.check.answers[name];
      var c = confidence(a.p);
      list.appendChild(el('div', { class: 'row' }, [
        el('span', { class: 'q', text: (t('q')[name] || name) }),
        el('strong', { text: answerText(name, a.value) }),
        c ? el('span', { class: 'conf ' + c, text: t('conf')[c] }) : null,
      ]));
    });
    box.appendChild(el('div', { class: 'box' }, [el('span', { class: 'kicker', text: t('answersTitle') }), list]));
  }

  function renderDecisionFacts(r) {
    var box = $('facts');
    box.textContent = '';
    if (!r || !r.check || current.shown < 3) return;
    var facts = renderFacts(r.facts || []);
    if (facts) box.appendChild(facts);
    showShelter(r.facts || []);
  }

  function renderRule(r) {
    var box = $('rule');
    box.textContent = '';
    if (!r || !r.check || current.shown < 4) return;
    var a = r.check.action;
    var text = t('rules')[r.check.policyRule === undefined ? 'default' : r.check.policyRule] || t('rules')['default'];
    box.appendChild(el('div', { class: 'box tint ' + a }, [
      el('span', { class: 'kicker', text: t('ruleTitle') }),
      el('span', { class: 'rule-text', text: text }),
      el('div', { class: 'rule-foot' }, [
        el('span', { class: 'badge ' + a, text: t('act')[a] || a }),
        el('button', { class: 'btn', type: 'button', text: t('next'), onclick: function () {
          setStep('result', true);
          renderResult(current.last);
          loadStats();
          // A published report: show it where residents see it.
          if (outcomeOf(current.last) === 'publish') setView('res');
        } }),
      ]),
    ]));
  }

  function renderData(r) {
    var box = $('data');
    box.textContent = '';
    if (!r || !r.ngsi || current.shown < 4) return;
    box.appendChild(el('details', { class: 'data' }, [
      el('summary', { text: t('showData') }),
      current.request ? json(t('showRequest'), { method: 'POST', path: '/api/reports', body: current.request }) : null,
      json(t('showEntity'), r.ngsi.entity),
      r.ngsi.decision ? json(t('showDecision'), r.ngsi.decision) : null,
      r.ngsi.task ? json(t('showTask'), r.ngsi.task) : null,
      r.evacuation ? json(t('showDecision2'), r.evacuation.ngsi.decision) : null,
      r.evacuation && r.evacuation.ngsi.alert ? json(t('showAlert'), r.evacuation.ngsi.alert) : null,
    ]));
  }

  // --- Step 3: what happens next -------------------------------------------------------

  function renderResult(r) {
    var out = $('outcome');
    var chain = $('chain');
    var person = $('person');
    out.textContent = '';
    chain.textContent = '';
    person.textContent = '';
    if (!r || !r.check) return;
    var a = r.check.action;
    var final = r.check.finalAction || r.visitorDecision;
    var o = final === 'publish' ? 'FinalPublish' : final === 'reject' ? 'FinalReject' : { publish: 'Publish', review: 'Review', urgent: 'Urgent' }[a] || 'Review';
    out.appendChild(el('div', { class: 'box tint ' + (final || a) }, [
      el('strong', { class: 'headline', text: t('o' + o) }),
      el('span', { text: t('e' + o) }),
    ]));

    // The second check runs for urgent and review reports, a few seconds
    // later; shown only when it found something.
    var ev = r.evacuation;
    if (ev && ev.action !== 'none') {
      var items = [el('span', { class: 'kicker', text: t('chainKicker') }), el('strong', { class: 'box-title', text: t('chainTitle') })];
      var facts = renderFactList(ev.facts || []);
      if (facts) items.push(facts);
      showShelter(ev.facts || []);
      var c = { alert: 'cAlert', review: 'cReview' }[ev.action];
      if (c) items.push(el('strong', { class: 'chain-result ' + ev.action, text: t(c) }));
      chain.appendChild(el('div', { class: 'box' }, items));
    }

    if (a === 'publish') return;
    if (final) {
      if (r.visitorDecision || current.decision) {
        person.appendChild(el('div', { class: 'box duty' }, [
          el('strong', { class: 'box-title', text: t(final === 'publish' ? 'didPublish' : 'didReject') }),
          el('span', { text: t('learn') }),
        ]));
      }
      return;
    }
    if (current.key) {
      var buttons = el('div', { class: 'actions' });
      ['publish', 'reject'].forEach(function (choice) {
        var b = el('button', {
          class: 'btn' + (choice === 'publish' ? ' go' : ' ghost'), type: 'button',
          text: current.sending === choice ? t('deciding') : t(choice === 'publish' ? 'doPublish' : 'doReject'),
          onclick: function () { decide(choice); },
        });
        b.disabled = !!current.sending;
        buttons.appendChild(b);
      });
      person.appendChild(el('div', { class: 'box duty' }, [
        el('strong', { class: 'box-title', text: t('dutyTitle') }),
        el('span', { text: t('dutyText') }),
        buttons,
        current.decideError ? el('p', { class: 'error', role: 'alert', text: t('decideFailed') + current.decideError }) : null,
      ]));
    } else {
      person.appendChild(el('div', { class: 'box' }, [
        el('strong', { class: 'box-title', text: t('otherTitle') }),
        el('span', { text: r.issue ? t('otherText') : r.prepared ? t('otherOpening') : t('otherNoIssue') }),
        r.issue ? el('a', { href: r.issue, target: '_blank', rel: 'noopener', text: t('openIssue') + ' (#' + r.issue.split('/').pop() + ')' }) : null,
      ]));
    }
  }

  // --- The week's numbers (step 3) -------------------------------------------------------

  var stats = null;
  function loadStats() {
    return api('/api/stats').then(function (r) {
      if (!r.ok || !r.body || typeof r.body.reports !== 'number' || !r.body.decided) return;
      stats = r.body;
      renderStats();
    }).catch(function () {});
  }

  // Numbers only; no box when they cannot be loaded.
  function renderStats() {
    var box = $('stats');
    box.textContent = '';
    if (!stats) return;
    var lines = stats.reports === 0 ? [t('statsNone')] : [t('stats1')(stats.reports, stats.published, stats.toPerson, stats.urgent)];
    if (stats.unclear > 0) lines.push(t('stats2')(stats.unclear, stats.decided.published, stats.decided.rejected, stats.decided.waiting));
    if (stats.corrected > 0) lines.push(t('statsCorrected')(stats.corrected));
    box.appendChild(el('div', { class: 'box' }, [
      el('strong', { class: 'box-title', text: t('statsTitle') }),
    ].concat(lines.map(function (l) { return el('span', { text: l }); }), [el('span', { class: 'muted small', text: t('statsSource') })])));
  }

  function decide(choice) {
    var me = current;
    if (me.sending || me.decision) return;
    me.sending = choice;
    me.decideError = null;
    // Answers of polls already on their way are dropped from now on.
    me.seq = (me.seq || 0) + 1;
    clearTimeout(me.poll);
    renderResult(me.last);
    api('/api/reports/' + encodeURIComponent(me.id) + '/resolve', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: choice, key: me.key }),
    }).then(function (r) {
      if (current !== me) return;
      me.sending = null;
      // 409 with finalAction: this visitor decided it already (another tab).
      // Without it, someone else did: show the report as it is now.
      if (r.status === 409 && !(r.body && r.body.finalAction)) { me.sig = null; poll(); return; }
      if (!r.ok && r.status !== 409) throw new Error(String(r.status));
      me.decision = r.body.finalAction || choice;
      me.last.visitorDecision = me.decision;
      me.last.check.finalAction = me.decision;
      me.last.published = me.decision === 'publish';
      var mine = reports.filter(function (x) { return x.id === me.id; })[0];
      if (mine && mine.check) { mine.check.finalAction = me.decision; mine.published = me.last.published; }
      renderResult(me.last);
      setView(me.decision === 'publish' ? 'res' : 'hq');
      me.poll = setTimeout(poll, 4000);
      // The numbers include this answer once Pointsman has it (cached for a minute).
      setTimeout(loadStats, 65000);
    }).catch(function (e) {
      if (current !== me) return;
      me.sending = null;
      me.decideError = e.message;
      renderResult(me.last);
      me.poll = setTimeout(poll, 4000);
    });
  }

  // Facts come from the broker: shown only as text.
  function factText(f) {
    if (f.missing) return t('fMissing')(f.reason);
    if (f.name === 'flood') return f.values.inside ? t('fFlood')(t('floodClass')[f.values.class] || String(f.values.class)) : t('fNoFlood');
    if (f.name === 'shelter') return f.values.found ? t('fShelter')(String(f.values.name), f.values.distance_m) : t('fNoShelter');
    if (f.name === 'walk') return typeof f.values.extra_m === 'number' ? t('fWalk')(f.values.extra_m) : t('fNoWalk');
    return JSON.stringify(f.values);
  }

  /** One row per map check: the question, the answer, and where the data comes from. */
  // `firstCheck`: the facts of step 1, where no rule uses the evacuation site.
  function renderFactList(facts, firstCheck) {
    if (!facts.length) return null;
    var list = el('ul', { class: 'facts' });
    facts.forEach(function (f) {
      list.appendChild(el('li', { class: 'fact ' + f.name }, [
        el('span', { class: 'fq', text: t('fQ')[f.name] || f.name }),
        el('strong', { class: 'fa', text: factText(f) }),
        f.missing ? null : el('span', { class: 'fs', text: t('fSource') + f.source }),
        firstCheck && f.name === 'shelter' && !f.missing ? el('span', { class: 'fn', text: t('fShelterNote') }) : null,
      ]));
    });
    return list;
  }

  function renderFacts(facts) {
    var list = renderFactList(facts, true);
    if (!list) return null;
    return el('div', { class: 'box map-checks' }, [el('span', { class: 'kicker', text: t('factsTitle') }), list]);
  }

  // --- How it works: the live lists ------------------------------------------------------

  function renderReports() {
    var list = $('reports');
    list.textContent = '';
    var now = Date.now();
    reports.slice(0, 20).forEach(function (r) {
      var o = outcomeOf(r);
      list.appendChild(el('li', null, [el('button', { type: 'button', onclick: function () { watch(r.id, { location: r.location }); } }, [
        el('span', { class: 'badge ' + o, text: t('act')[o] || o }),
        el('span', { class: 'text', text: (r.roadName ? r.roadName + ' — ' : '') + r.description }),
        el('span', { class: 'time', text: r.createdAt ? t('ago')(Math.max(0, Math.round((now - Date.parse(r.createdAt)) / 1000))) : '' }),
      ])]));
    });
  }

  function renderPending() {
    var list = $('pending');
    var info = $('pending-info');
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
        el('button', { type: 'button', onclick: function () { if (d.refersTo) watch(d.refersTo, r ? { location: r.location } : null); } }, [
          el('span', { class: 'badge ' + a, text: t('act')[a] || a }),
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

  function setHow(open) {
    $('how').hidden = !open;
    $('how-toggle').setAttribute('aria-expanded', String(open));
    $('how-open').setAttribute('aria-expanded', String(open));
    if (open) $('how').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- Map ---------------------------------------------------------------------------------

  // A grayscale base map (GSI pale map, without colour), so that only the
  // reports and the flood zones are in colour; the flood zones the facts come
  // from are for headquarters only.
  function style() {
    return {
      version: 8,
      sources: {
        gsi: { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], tileSize: 256, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>', maxzoom: 18 },
        flood: { type: 'raster', tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 2, maxzoom: 17, attribution: '<a href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html">「ハザードマップポータルサイト」</a>洪水浸水想定区域' },
      },
      layers: [
        { id: 'gsi', type: 'raster', source: 'gsi', paint: { 'raster-saturation': -1, 'raster-contrast': -0.1 } },
        { id: 'flood', type: 'raster', source: 'flood', paint: { 'raster-opacity': 0.3 } },
      ],
    };
  }

  function makeMap() {
    var m = new maplibregl.Map({ container: 'map', style: style(), center: CENTER, zoom: 13.4, attributionControl: { compact: true }, cooperativeGestures: true });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', function () {
      m.addSource('reports', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      var color = ['match', ['get', 'outcome'], 'publish', COLORS.publish, 'review', COLORS.review, 'urgent', COLORS.urgent, 'reject', COLORS.reject, COLORS.pending];
      var width = ['case', ['get', 'current'], 12, 7];
      m.addLayer({ id: 'halo', type: 'line', source: 'reports', filter: ['all', ['==', ['geometry-type'], 'LineString'], ['get', 'current']], paint: { 'line-color': '#171717', 'line-width': 18, 'line-opacity': 0.25 } });
      m.addLayer({ id: 'lines', type: 'line', source: 'reports', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': width } });
      m.addLayer({ id: 'points', type: 'circle', source: 'reports', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': color, 'circle-radius': ['case', ['get', 'current'], 12, 8], 'circle-stroke-width': ['case', ['get', 'current'], 4, 2], 'circle-stroke-color': '#fff' } });
      ['lines', 'points'].forEach(function (layer) {
        m.on('click', layer, function (e) { var p = e.features[0].properties; var r = reports.filter(function (x) { return x.id === p.id; })[0]; watch(p.id, r ? { location: r.location } : null); });
        m.on('mouseenter', layer, function () { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', layer, function () { m.getCanvas().style.cursor = ''; });
      });
      m.addSource('shelter', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1f5fa8', 'line-width': 4, 'line-dasharray': [2, 1.5] } }, 'halo');
      m.addLayer({ id: 'shelter-line', type: 'line', source: 'shelter', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#1E6B48', 'line-width': 3.5, 'line-dasharray': [0.5, 2] } });
      m.demoReady = true;
      if (current && current.last && current.shown >= 3) {
        showShelter((current.last.facts || []).concat(current.last.evacuation ? current.last.evacuation.facts || [] : []));
        if (current.last.evacuation) showRoute(current.last.evacuation.facts || []);
      }
      m.setLayoutProperty('flood', 'visibility', view === 'hq' ? 'visible' : 'none');
      updateMap();
    });
    return m;
  }

  function updateMap() {
    if (!map || !map.demoReady) return;
    var list = reports.slice();
    // The report being watched, even before the list has it.
    if (current && current.last && current.last.location && !list.some(function (r) { return r.id === current.id; })) list.push(current.last);
    var features = list.filter(function (r) { return r.location; }).map(function (r) {
      var mine = current && r.id === current.id;
      var src = mine && current.last ? current.last : r;
      return { type: 'Feature', geometry: r.location, properties: { id: r.id, outcome: outcomeOf(src), published: outcomeOf(src) === 'publish', current: !!mine } };
    }).filter(function (f) { return view === 'hq' || f.properties.published; });
    map.getSource('reports').setData({ type: 'FeatureCollection', features: features });
  }

  // The evacuation site of a shelter fact, on the headquarters map. Pointsman
  // gives its name and distance; the place comes from the same GSI data
  // (published only at zoom 10), so the page loads that tile once.
  var shelterTiles = {};
  var shelterMarker = null;

  function shelterTile(lonlat) {
    var z = 10;
    var x = Math.floor((lonlat[0] + 180) / 360 * Math.pow(2, z));
    var lat = lonlat[1] * Math.PI / 180;
    var y = Math.floor((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * Math.pow(2, z));
    var url = 'https://cyberjapandata.gsi.go.jp/xyz/skhb01/' + z + '/' + x + '/' + y + '.geojson';
    if (!shelterTiles[url]) {
      shelterTiles[url] = fetch(url).then(function (res) { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
        .catch(function (e) { delete shelterTiles[url]; throw e; });
    }
    return shelterTiles[url];
  }

  function clearShelter() {
    if (shelterMarker) { shelterMarker.remove(); shelterMarker = null; }
    if (routeMarker) { routeMarker.remove(); routeMarker = null; }
    if (map && map.demoReady) {
      map.getSource('shelter').setData({ type: 'FeatureCollection', features: [] });
      map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
    }
  }

  // The way around on foot (step 2 of the chain): Pointsman's detour fact
  // carries it as an encoded polyline (precision 6), from one end of the
  // closed section to the other.
  var routeMarker = null;

  /** Positions of an encoded polyline; null when the text is not one. */
  function decodePolyline(text, precision) {
    var factor = Math.pow(10, precision);
    var out = [];
    var i = 0, lat = 0, lon = 0;
    while (i < text.length) {
      var d = [0, 0];
      for (var k = 0; k < 2; k++) {
        var shift = 0, result = 0, b;
        do {
          if (i >= text.length) return null;
          b = text.charCodeAt(i++) - 63;
          if (b < 0 || b > 63) return null;
          result |= (b & 31) << shift;
          shift += 5;
        } while (b >= 32 && shift < 35);
        d[k] = result & 1 ? ~(result >> 1) : result >> 1;
      }
      lat += d[0];
      lon += d[1];
      out.push([lon / factor, lat / factor]);
    }
    return out.length >= 2 ? out : null;
  }

  function showRoute(facts) {
    var f = facts.filter(function (x) { return x.name === 'walk' && !x.missing && typeof x.values.route === 'string' && typeof x.values.extra_m === 'number'; })[0];
    if (!f || !map || !map.demoReady || !current) return;
    var key = current.id + '|' + f.values.route;
    if (current.routeShown === key) return;
    var line = decodePolyline(f.values.route, 6);
    // A route far from Tokyo is not this one: drawn only inside the demo area, with a margin.
    if (!line || !line.every(function (p) { return p[0] > 139.6 && p[0] < 139.9 && p[1] > 35.6 && p[1] < 35.8; })) return;
    current.routeShown = key;
    map.getSource('route').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: {} }] });
    if (routeMarker) routeMarker.remove();
    var node = el('div', { class: 'route-pin' }, [el('span', { class: 'name', text: t('fRouteMap')(f.values.extra_m) })]);
    routeMarker = new maplibregl.Marker({ element: node, anchor: 'center' }).setLngLat(line[Math.floor(line.length / 2)]).addTo(map);
    routeMarker.demoFact = f.values;
    setShelterVisible();
    if (view === 'hq') {
      var b = line.reduce(function (acc, p) { return [[Math.min(acc[0][0], p[0]), Math.min(acc[0][1], p[1])], [Math.max(acc[1][0], p[0]), Math.max(acc[1][1], p[1])]]; }, [line[0], line[0]]);
      map.fitBounds(b, { padding: { top: 90, bottom: 50, left: 70, right: 70 }, maxZoom: 16.5 });
    }
  }

  function showShelter(facts) {
    // A site without a name cannot be found in the tile.
    var f = facts.filter(function (x) { return x.name === 'shelter' && !x.missing && x.values.found && x.values.name; })[0];
    // Before the map is ready: shown from its load handler.
    if (!f || !map || !map.demoReady || !current || !current.last || !current.last.location) return;
    var me = current;
    var key = me.id + '|' + f.values.name;
    if (me.shelterShown === key) return;
    me.shelterShown = key;
    var g = me.last.location;
    var ps = g.type === 'Point' ? [g.coordinates] : g.coordinates;
    var near = function (a, b) { var dx = (a[0] - b[0]) * Math.cos(b[1] * Math.PI / 180); var dy = a[1] - b[1]; return dx * dx + dy * dy; };
    shelterTile(ps[0]).then(function (tile) {
      if (current !== me) return;
      var best = null;
      (tile.features || []).forEach(function (s) {
        if (!s.geometry || s.geometry.type !== 'Point' || !s.properties || s.properties.name !== f.values.name) return;
        var from = ps.reduce(function (a, p) { return near(p, s.geometry.coordinates) < near(a, s.geometry.coordinates) ? p : a; });
        var d = near(from, s.geometry.coordinates);
        if (!best || d < best.d) best = { d: d, at: s.geometry.coordinates, from: from };
      });
      if (!best) return;
      clearShelter();
      map.getSource('shelter').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [best.from, best.at] }, properties: {} }] });
      var node = el('div', { class: 'shelter-pin' }, [el('span', { class: 'mark', 'aria-hidden': 'true' }), el('span', { class: 'name', text: t('fShelterMap')(String(f.values.name), f.values.distance_m) })]);
      shelterMarker = new maplibregl.Marker({ element: node, anchor: 'bottom', offset: [0, 10] }).setLngLat(best.at).addTo(map);
      shelterMarker.demoFact = f.values;
      setShelterVisible();
      if (view === 'hq') map.fitBounds([[Math.min(best.from[0], best.at[0]), Math.min(best.from[1], best.at[1])], [Math.max(best.from[0], best.at[0]), Math.max(best.from[1], best.at[1])]], { padding: { top: 90, bottom: 50, left: 70, right: 70 }, maxZoom: 15.5 });
    }).catch(function () {
      // A failed tile load: the next render tries again.
      if (me.shelterShown === key) me.shelterShown = null;
    });
  }

  function renderShelterLabel() {
    if (shelterMarker) {
      var v = shelterMarker.demoFact;
      shelterMarker.getElement().querySelector('.name').textContent = t('fShelterMap')(String(v.name), v.distance_m);
    }
    if (routeMarker) routeMarker.getElement().querySelector('.name').textContent = t('fRouteMap')(routeMarker.demoFact.extra_m);
  }

  /** Like the flood zones, the evacuation site is for headquarters only. */
  function setShelterVisible() {
    if (shelterMarker) shelterMarker.getElement().hidden = view !== 'hq';
    if (routeMarker) routeMarker.getElement().hidden = view !== 'hq';
    if (map && map.demoReady) {
      map.setLayoutProperty('shelter-line', 'visibility', view === 'hq' ? 'visible' : 'none');
      map.setLayoutProperty('route-line', 'visibility', view === 'hq' ? 'visible' : 'none');
    }
  }

  function focus(location) {
    if (!map || !location) return;
    var c = location.type === 'Point' ? location.coordinates : location.coordinates[0];
    map.easeTo({ center: c, zoom: 15 });
  }

  // --- Start ------------------------------------------------------------------------------

  $('lang').addEventListener('click', function () {
    lang = lang === 'ja' ? 'en' : 'ja';
    try { localStorage.setItem('lang', lang); } catch (e) {}
    applyLang();
  });
  $('theme').addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#141414' : '#F5F2EC');
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
  $('how-toggle').addEventListener('click', function () { setHow($('how').hidden); });
  $('how-close').addEventListener('click', function () { setHow(false); });
  $('how-open').addEventListener('click', function () { setHow(true); });
  $('again').addEventListener('click', function () {
    if (current) { clearTimeout(current.poll); clearInterval(current.reveal); }
    current = null;
    clearShelter();
    setView('hq');
    setStep('pick', true);
    updateMap();
  });
  $('view-hq').addEventListener('click', function () { setView('hq'); });
  $('view-res').addEventListener('click', function () { setView('res'); });

  applyLang();
  setStep('pick');
  if (window.maplibregl) map = makeMap();
  loadConfig();
  loadReports();
  loadPending();
  setInterval(function () { loadReports(); loadPending(); }, 8000);
})();
