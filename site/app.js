// The demo page, as a guided flow in four steps: pick a report, watch
// Pointsman decide, see what happens next (and decide it yourself when a
// person is needed). The technical layer is behind "How it works".
// Report texts come from the API (anyone can send one): they are only ever set
// as text, never as HTML.
(function () {
  'use strict';

  var CENTER = [139.753, 35.688];
  var COLORS = { publish: '#2E9E6B', review: '#C98A1B', urgent: '#C8463A', reject: '#7A68B8', pending: '#8f8a82' };
  var STEPS = ['pick', 'decide', 'check', 'result'];

  var T = {
    en: {
      demo: 'demo', title: 'Heavy rain. Reports of closed roads are coming in.',
      lead: 'Send one, and watch Pointsman decide in seconds what happens to it. It reads the report, checks the place on public maps, and applies the city’s rules.',
      st1: 'Pick a report', st2: 'First check', st3: 'Additional check', st4: 'Final result',
      howTitle: 'How it works', close: 'Close',
      resize: 'Drag to make the panel wider or narrower (arrow keys work too)',
      activityTitle: 'Reports', activityLead: 'What the demo has decided: every report of the last day, the ones waiting for a person, and the numbers of the last 7 days.',
      howLead: 'Pointsman is a small service that takes decisions for a city’s apps. The AI only answers questions. Public data gives facts about the place. The city’s own rules decide. People have the last word.',
      h1k: '1 · The report', h1t: 'A resident’s app saves it', h1d: 'in the city’s data platform. This demo uses GeonicDB, which follows the open FIWARE standard (NGSI-LD).',
      h2k: '2 · Passed on', h2t: 'The data platform tells Pointsman', h2d: 'A small connector passes each new report on. The apps do not change.',
      h3k: '3 · Pointsman', h3t: 'Questions, facts, rules', h3d: 'An AI answers fixed questions. Public map data gives facts. The city’s rules turn both into one action.',
      h4k: '4 · The result', h4t: 'Saved back, open to every app', h4d: 'Unclear or urgent reports go to a person. Their answer tells Pointsman how often the AI was right.',
      forDevs: 'For developers', lProfile: 'The questions and rules (profile)', lBridge: 'The connector (FIWARE bridge)', lStory: 'Why it works this way', lSource: 'Source of this demo', lQueue: 'The review queue',
      listsLabel: 'Lists of reports', recent: 'Recent reports', recentNote: 'Everyone sees the same reports. Demo data is deleted after a day.',
      waitingTitle: 'Waiting for a person',
      waitingNote: 'One search in the data platform finds them: every <code>Decision</code> entity whose <code>reviewStatus</code> is "pending". Any FIWARE app can do the same search.',
      waitingNone: 'Nothing is waiting right now.', showQuery: 'the query', more: function (n) { return n + ' more'; },
      waitingFailed: 'Could not load the list.', waitingStale: 'Could not update the list; it may be out of date.',
      pickTitle: 'Pick a report', pickNote: 'Each one is sent live to Pointsman. They show four different outcomes.',
      moreTitle: 'More examples', pickFoot: 'Invented events at real places in Tokyo. Everyone sees the same reports; they are deleted after a day.',
      usage: function (u, l) { return '(' + u + ' of ' + l + ' reports today)'; },
      limit: 'The demo reached its limit for today. Please come back tomorrow.', failed: 'Could not send the report: ',
      decideTitle: 'First check', yourReport: 'Your report', aReport: 'A report', noRoad: '(no road name)',
      s1: 'Saved in the city’s data platform', s1d: 'The way any city app would save it.',
      s2: 'The AI answered four questions', s2d: 'It reads the text. It does not decide.',
      s3: 'Pointsman checked the place on maps', s3d: 'Flood zone and nearest evacuation site, from public map data; for a closed section, also the way around by car (and on foot when a person checks it).',
      s4: 'The city’s rule decided', s4d: 'Answers and facts in, one action out.',
      working: 'Working…', together: 'Passed on to Pointsman; these two run at the same time', inAll: function (s) { return s + ' in all'; },
      useTag: 'rule', srcShow: 'Where the data comes from', usesMarked: 'The rule read the answers and map checks marked like this above.',
      lvl: { deep: 'deep (3 m or more)', shallow: 'under 3 m', noZone: 'no flood zone', near: 'within 1 km', far: 'over 1 km', long: '200 m or more', short: 'under 200 m', noWay: 'no way around', ctx: 'context' },
      answersTitle: 'What the AI answered', factsTitle: 'From public map data · the AI never sees it',
      ruleTitle: 'The city’s rule', next: 'Additional check →', next2: 'Final result →',
      checkTitle: 'Additional check', secondNotNeeded: 'Not needed: the report was published at once. This check runs only for reports that go to a person.',
      secondRunning: 'The additional check is running…', cNone: 'The rules found no reason for an alert.',
      fNotForPoint: 'Not checked: the report marks a point, not a road section, so there is no way around to work out.',
      showRequest: 'request', showEntity: 'RoadRestriction entity (NGSI-LD)', showDecision: 'Decision entity (NGSI-LD, full IRIs)', showTask: 'Task entity for a person (datamodels.jp)',
      showDecision2: 'Decision entity of the second check', showAlert: 'Alert entity (Smart Data Models)',
      showAnswers: 'answers', showFacts: 'map checks',
      devTitle: 'Developer view', devShort: 'Dev',
      devLead: 'What happens to the report, part by part, with the real data. Point at a step on the page to see its part here.',
      devEmpty: 'Send a report: every part it goes through shows up here.',
      devWaiting: 'waiting…',
      devData: function (what) { return 'the data: ' + what; },
      devPoll: 'Meanwhile this page reads the report from the demo’s server, a Cloudflare Worker (GET /api/reports/{id}), about once a second.',
      lane: { page: 'This page', platform: 'Data platform (GeonicDB)', bridge: 'Connector (FIWARE bridge, in the demo’s server)', pointsman: 'Pointsman', data: 'AI and map data' },
      ev: {
        save: ['POST /api/reports', 'The demo’s server saves the report as a RoadRestriction entity (NGSI-LD) in the data platform, as any city app would.'],
        notify: ['Notification: a new report', 'A subscription on RoadRestriction entities tells the demo’s server (NGSI-LD notification); it queues the message, and the connector handles it from the queue.'],
        decide: ['POST /v1/decide/road-restriction-check', 'The connector sends the entity’s attributes to Pointsman as the state.'],
        model: ['The model answers four questions', 'The model reads the report’s text fields (not the place) and gives typed answers, each with a probability.'],
        maps: ['Map checks: flood zone, evacuation site', 'Pointsman looks up the place in public GSI data. The model never sees these facts.'],
        decision: ['Decision: {action} (policy.{rule})', 'The profile’s rules turn the answers and map checks into one action.'],
        write: ['Create Decision (and Task); PATCH check', 'The connector writes the result back: a Decision entity, a Task when a person is needed, and last the check attribute on the report, which links to the Decision.'],
        publishEnd: ['No second check', 'The second subscription matches only reports that go to a person (urgent or review).'],
        secondLate: ['The second check did not come', 'No result within a minute: the queue may still retry, or the check failed. The first result stands.'],
        notify2: ['Notification: check is urgent or review', 'A second subscription, on the check attribute, starts the second check.'],
        decide2: ['POST /v1/decide/evacuation-access-check', 'The same connector, another profile. It sends the first check’s id; Pointsman checks it, and the Decision is linked to it (prov:wasInformedBy).'],
        maps2: ['Map checks: evacuation site, way around on foot', 'GSI evacuation sites, and Valhalla routing on OpenStreetMap with and without the closed section.'],
        write2: ['Create Decision; PATCH evacuation (and Alert)', 'The connector writes the second result back; for an alert, the demo’s server then creates an Alert entity (Smart Data Models) for the site’s staff.'],
        notify3: ['Notification: the earlier results are there', 'A third subscription, on check and evacuation, starts the final decision once the earlier checks it needs are there.'],
        decide3: ['POST /v1/decide/road-closure-final', 'The connector sends the report and the ids of the earlier decisions. Pointsman reads their results from its own log, so nobody can claim a result. Rules only: no model call.'],
        write3: ['Create Decision; PATCH final', 'The connector writes the final result back. Its Decision links both earlier ones (prov:wasInformedBy), and the one it replaces after a person’s answer (dcterms:replaces). The residents’ map reads this result.'],
        finalLate: ['The final decision did not come', 'No final result within a minute: the queue may still retry, or the step failed. The earlier results stand.'],
      },
      q: { category: 'Why is the road closed?', status_matches: 'Does the status match the text?', danger: 'Is someone in danger?', clarity: 'How clear is the report?', foot_passable: 'Can people pass on foot?' },
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
        '3': 'In a deep flood zone (3 m or more), a person looks before it is published.',
        '4': 'The flood zone could not be checked: a person looks before it is published.',
        '5': 'Clear, consistent reports with nobody in danger are published at once.',
        'default': 'No rule for publishing fits: a person checks it.',
      },
      // road-closure-final (pointsman-config): the final decision's rules, by index.
      rules3: {
        '0': 'A person rejected the report: it stays rejected.',
        '1': 'People on foot are cut off from their evacuation site (found by the check, or by the person who checked it): urgent.',
        '2': 'The first check found it urgent, and no person has answered otherwise.',
        '3': 'The first check, or the person who checked it, published it.',
        'default': 'A person has not checked the first result yet. When they do, the final result is decided again.',
      },
      finalKicker: 'Final result', stage1: 'The first check said',
      finalMissing: 'No final result', missingSecond: 'The additional check did not come, so there is no final result.',
      missingFinal: 'The final decision did not come.',
      standsFirst: function (a) { return 'The first result stands: ' + a + '.'; },
      standsPerson: function (a) { return 'The person’s answer stands: ' + a + '.'; },
      finalPending: 'The final result is being decided…', finalPendingText: 'Pointsman combines the first result and the additional check into one result.',
      fin: {
        publish: ['Published: residents see it now', 'The report is on the residents’ map.'],
        urgent: ['Urgent: people must be told', 'Headquarters acts on it first.'],
        reject: ['Rejected: residents never see it', 'A person decided the report is wrong.'],
        review: ['Waiting for a person', 'Residents see it only after someone checks the first result.'],
      },
      basedOn: 'Made from', bFirst: 'first result', bPerson: 'person’s answer', bSecond: 'additional check', bNoSecond: 'no additional check needed',
      showDecision3: 'Decision entity of the final result',
      graphKicker: 'How the city decides', graphText: 'A report goes from left to right. Each box is a profile with its own rules. A report published by the first check goes straight to the final result.',
      graphDmn: 'Download for DMN tools (.dmn)',
      // evacuation-access-check (pointsman-config): its rules, by index.
      rules2: {
        '0': 'An evacuation site within 1 km, people on foot cannot pass, and the way around is at least 200 m longer: the site’s staff get an alert.',
        '1': 'Near an evacuation site, but the way around could not be worked out: a person looks.',
      },
      ruleUnknown: function (n) { return 'Rule ' + n + ' of the profile (this page does not describe it yet).'; },
      act: { publish: 'publish', review: 'review', urgent: 'urgent', reject: 'rejected', pending: 'being checked', alert: 'alert', none: 'no alert' },
      resultTitle: 'Final result',
      oPublish: 'Published: residents see it now', ePublish: 'No person was needed. The report is on the residents’ map, seconds after it was sent.',
      oReview: 'Waiting for a person', eReview: 'Headquarters sees it. Residents don’t, until someone checks it.',
      oUrgent: 'Urgent: a person sees it first', eUrgent: 'It is at the top of the list at headquarters. Residents see it once a person has checked it.',
      oFinalPublish: 'Published after a check', eFinalPublish: 'A person checked it. Residents see it now.',
      oFinalReject: 'Rejected after a check', eFinalReject: 'A person checked it. Residents never see it.',
      chainKicker: 'Started by the first check', chainTitle: 'Can people still walk to their evacuation site?',
      cAlert: 'Alert sent to the staff of the evacuation site.', cReview: 'The way around could not be checked: a person looks at it.',
      fQ: { flood: 'Is the place in a river flood zone?', shelter: 'Where is the nearest flood evacuation site?', drive: 'For cars that drive past here, how much longer is the way around?', walk: 'For people who walk past here, how much longer is the way around?' },
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
      mapChecks: 'map checks:', ch: { flood: 'flood zone', shelter: 'evacuation site', drive: 'way around by car', walk: 'way around on foot' },
      fRouteMap: function (m) { return 'Way around on foot: +' + m + ' m'; },
      fCarMap: function (m) { return 'Way around by car: +' + m + ' m'; },
      fDrive: function (m) { return m + ' m longer by car'; },
      fDriveNote: 'Context for the person who checks; no rule uses it yet.', fNoDrive: 'No way around by car',
      fShelterNote: 'Context for the person who checks; the additional check uses it.',
      fSecond: 'second check',
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
      stats2: function (u, p, r, w) { return 'Of the ' + plural(u, 'report that went to a person', 'reports that went to a person') + ', people published ' + p + ' and rejected ' + r + '; ' + w + ' still waiting.'; },
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
      st1: '報告を選ぶ', st2: '最初の確認', st3: '追加の確認', st4: '最終結果',
      howTitle: '仕組み', close: '閉じる',
      resize: 'ドラッグでパネルの幅を変えられます（矢印キーでも変えられます）',
      activityTitle: '報告の一覧', activityLead: 'デモが判断したもの：この 1 日の報告すべて、人の確認待ちの報告、そして直近 7 日間の数字です。',
      howLead: 'Pointsman は、市のアプリに代わって判断する小さなサービスです。AI は質問に答えるだけです。場所の事実は公開データから調べます。行動を決めるのは市の規則です。最後に決めるのは人です。',
      h1k: '1・報告', h1t: '住民のアプリが保存する', h1d: '保存先は市のデータ基盤です。このデモでは、オープンな FIWARE の標準（NGSI-LD）に沿った GeonicDB を使います。',
      h2k: '2・受け渡し', h2t: 'データ基盤が Pointsman に知らせる', h2d: '小さなつなぎ役が、新しい報告を 1 件ずつ渡します。アプリは変えなくて済みます。',
      h3k: '3・Pointsman', h3t: '質問、事実、規則', h3d: 'AI が決まった質問に答えます。場所の事実は公開の地図データから調べます。市の規則が、答えと事実から行動を 1 つ決めます。',
      h4k: '4・結果', h4t: 'データ基盤に戻し、どのアプリでも使える', h4d: 'はっきりしない報告と緊急の報告は人に回ります。人の答えから、AI がどのくらい正しかったかが分かります。',
      forDevs: '開発者向け', lProfile: '質問と規則（プロファイル）', lBridge: 'つなぎ役（FIWARE ブリッジ）', lStory: 'この仕組みの理由', lSource: 'このデモのソース', lQueue: '確認待ちの一覧',
      listsLabel: '報告の一覧', recent: '最近の報告', recentNote: '全員が同じ報告を見ています。デモのデータは 1 日で消えます。',
      waitingTitle: '人の確認待ち',
      waitingNote: 'データ基盤での検索 1 回で見つけています。<code>reviewStatus</code> が "pending" の <code>Decision</code> エンティティを探します。ほかの FIWARE アプリも同じ検索ができます。',
      waitingNone: '今は確認待ちはありません。', showQuery: 'クエリ', more: function (n) { return 'ほか ' + n + ' 件'; },
      waitingFailed: '一覧を読み込めませんでした。', waitingStale: '一覧を更新できませんでした。古い可能性があります。',
      pickTitle: '報告を選ぶ', pickNote: 'どれもその場で Pointsman に送られます。4 つとも結果が違います。',
      moreTitle: 'ほかの例', pickFoot: '場所は東京に実在しますが、出来事は架空です。全員が同じ報告を見ています。報告は 1 日で消えます。',
      usage: function (u, l) { return '（本日 ' + u + ' / ' + l + ' 件）'; },
      limit: '本日のデモの上限に達しました。また明日お試しください。', failed: '報告を送れませんでした：',
      decideTitle: '最初の確認', yourReport: 'あなたの報告', aReport: '報告', noRoad: '（道路名なし）',
      s1: '市のデータ基盤に保存', s1d: '市のアプリが保存するのと同じ方法です。',
      s2: 'AI が 4 つの質問に答えた', s2d: 'AI は本文を読むだけで、決めはしません。',
      s3: 'Pointsman が地図で場所を調べた', s3d: '浸水想定区域と最寄りの避難場所を、公開の地図データから調べます。通行止め区間では、車で迂回する道のりも調べます（人に回る報告では、歩いて迂回する道のりも）。',
      s4: '市の規則が決めた', s4d: '答えと事実から、行動を 1 つ決めます。',
      working: '処理中…', together: 'Pointsman に渡され、この 2 つは同時に進みます', inAll: function (s) { return '合計 ' + s; },
      useTag: '規則', srcShow: 'データの出典', usesMarked: '規則は、上でこの印のついた答えと地図での確認を読みました。',
      lvl: { deep: '深い（3 m 以上）', shallow: '3 m 未満', noZone: '浸水想定区域の外', near: '1 km 以内', far: '1 km より遠い', long: '200 m 以上', short: '200 m 未満', noWay: '迂回路なし', ctx: '参考' },
      answersTitle: 'AI の答え', factsTitle: '公開の地図データから・AI はこれを見ません',
      ruleTitle: '市の規則', next: '追加の確認 →', next2: '最終結果 →',
      checkTitle: '追加の確認', secondNotNeeded: '不要です：報告はすぐに公開されました。この確認は、人に回る報告にだけ行います。',
      secondRunning: '追加の確認をしています…', cNone: '規則では、警報を出す理由はありませんでした。',
      fNotForPoint: '確認しません：報告は区間ではなく地点なので、迂回路は計算できません。',
      showRequest: 'リクエスト', showEntity: 'RoadRestriction エンティティ（NGSI-LD）', showDecision: 'Decision エンティティ（NGSI-LD、完全な IRI）', showTask: '担当者向けの Task エンティティ（datamodels.jp）',
      showDecision2: '2 つ目の確認の Decision エンティティ', showAlert: 'Alert エンティティ（Smart Data Models）',
      showAnswers: '答え', showFacts: '地図での確認',
      devTitle: '開発者向け表示', devShort: '開発',
      devLead: '報告がどこを通るかを、実際のデータとともに順に示します。ページの手順を指すと、対応する部分がここで強調されます。',
      devEmpty: '報告を送ると、通る部分がここに順に表示されます。',
      devWaiting: '待機中…',
      devData: function (what) { return 'データ：' + what; },
      devPoll: 'その間、このページはデモのサーバー（Cloudflare Worker）から報告を約 1 秒ごとに読みます（GET /api/reports/{id}）。',
      lane: { page: 'このページ', platform: 'データ基盤（GeonicDB）', bridge: 'つなぎ役（FIWARE ブリッジ、デモのサーバー内）', pointsman: 'Pointsman', data: 'AI と地図データ' },
      ev: {
        save: ['POST /api/reports', 'デモのサーバーが報告を RoadRestriction エンティティ（NGSI-LD）としてデータ基盤に保存します。市のアプリと同じ方法です。'],
        notify: ['通知：新しい報告', 'RoadRestriction エンティティのサブスクリプションがデモのサーバーに知らせます（NGSI-LD の通知）。サーバーはキューに入れ、つなぎ役がキューから処理します。'],
        decide: ['POST /v1/decide/road-restriction-check', 'つなぎ役がエンティティの属性を状態として Pointsman に送ります。'],
        model: ['モデルが 4 つの質問に答える', 'モデルは報告の文字の項目（場所ではなく）を読み、型の決まった答えを確率とともに返します。'],
        maps: ['地図での確認：浸水想定区域、避難場所', 'Pointsman が場所を国土地理院の公開データで調べます。モデルはこの事実を見ません。'],
        decision: ['判断：{action}（policy.{rule}）', 'プロファイルの規則が、答えと地図での確認から行動を 1 つ決めます。'],
        write: ['Decision（と Task）を作成、check を PATCH', 'つなぎ役が結果を書き戻します。Decision エンティティ、人が必要なときは Task、最後に Decision につながる報告の check 属性です。'],
        publishEnd: ['2 つ目の確認はなし', '2 つ目のサブスクリプションは、人に回る報告（緊急・確認）にだけ合います。'],
        secondLate: ['2 つ目の確認が届かない', '1 分以内に結果がありません。キューが再試行しているか、確認が失敗しました。1 つ目の結果はそのままです。'],
        notify2: ['通知：check が緊急または確認', 'check 属性の 2 つ目のサブスクリプションが、2 つ目の確認を始めます。'],
        decide2: ['POST /v1/decide/evacuation-access-check', '同じつなぎ役、別のプロファイルです。最初の確認の ID を送り、Pointsman がそれを確かめます。その Decision は最初の確認につながります（prov:wasInformedBy）。'],
        maps2: ['地図での確認：避難場所、歩いて迂回', '国土地理院の避難場所と、OpenStreetMap 上の Valhalla 経路（区間を閉じた場合と閉じない場合）。'],
        write2: ['Decision を作成、evacuation を PATCH（と Alert）', 'つなぎ役が 2 つ目の結果を書き戻します。警報のときは、デモのサーバーが避難場所の担当者向けの Alert エンティティ（Smart Data Models）を作ります。'],
        notify3: ['通知：前の結果がそろった', 'check と evacuation の 3 つ目のサブスクリプションが、必要な前の確認がそろったところで最終判断を始めます。'],
        decide3: ['POST /v1/decide/road-closure-final', 'つなぎ役は報告と前の判断の ID を送ります。Pointsman が自分の記録から結果を読むので、結果を偽ることはできません。規則だけで決め、モデルは呼びません。'],
        write3: ['Decision を作成、final を PATCH', 'つなぎ役が最終結果を書き戻します。その Decision は前の 2 つにつながり（prov:wasInformedBy）、人の答えの後に置き換えた判断にもつながります（dcterms:replaces）。住民向けの地図はこの結果を読みます。'],
        finalLate: ['最終判断が届かない', '1 分以内に最終結果がありません。キューが再試行しているか、処理が失敗しました。前の結果はそのままです。'],
      },
      q: { category: 'なぜ通れないのか', status_matches: '状態と本文は合っているか', danger: '人に危険があるか', clarity: '報告はどのくらいはっきりしているか', foot_passable: '歩いて通れるか' },
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
        '3': '深い浸水想定区域（3 m 以上）では、公開の前に人が確認する。',
        '4': '浸水想定区域を調べられなかったので、公開の前に人が確認する。',
        '5': 'はっきりしていて矛盾がなく、危険のない報告は、すぐに公開する。',
        'default': '公開の規則に当てはまらないので、人が確認する。',
      },
      rules3: {
        '0': '人が報告を非公開にした：非公開のまま。',
        '1': '歩いて避難場所まで行けない人がいる（確認の結果、または確認した人の答え）：緊急。',
        '2': '1 つ目の確認で緊急となり、人はそれと違う答えをしていない。',
        '3': '1 つ目の確認、またはそれを確認した人が公開とした。',
        'default': '1 つ目の結果を、まだ人が確認していない。確認すると、最終結果をもう一度決める。',
      },
      finalKicker: '最終結果', stage1: '最初の確認の結果',
      finalMissing: '最終結果はありません', missingSecond: '追加の確認が届かなかったため、最終結果はありません。',
      missingFinal: '最終判断が届きませんでした。',
      standsFirst: function (a) { return '最初の結果のままです：' + a + '。'; },
      standsPerson: function (a) { return '人の答えのままです：' + a + '。'; },
      finalPending: '最終結果を決めています…', finalPendingText: 'Pointsman が最初の結果と追加の確認を 1 つの結果にまとめます。',
      fin: {
        publish: ['公開：住民がすぐに見られます', '住民向けの地図に載りました。'],
        urgent: ['緊急：人に知らせる必要があります', '災害対策本部が真っ先に対応します。'],
        reject: ['非公開：住民には見えません', '人が、報告は正しくないと判断しました。'],
        review: ['人の確認待ち', '誰かが最初の結果を確認するまで、住民には見えません。'],
      },
      basedOn: 'もとにしたもの', bFirst: '最初の結果', bPerson: '人の答え', bSecond: '追加の確認', bNoSecond: '追加の確認は不要',
      showDecision3: '最終結果の Decision エンティティ',
      graphKicker: '市の判断の流れ', graphText: '報告は左から右へ進みます。箱 1 つが、それぞれの規則をもつ 1 つのプロファイルです。最初の確認で公開された報告は、そのまま最終結果に進みます。',
      graphDmn: 'DMN ツール用にダウンロード（.dmn）',
      rules2: {
        '0': '1 km 以内に避難場所があり、歩いて通れず、迂回すると 200 m 以上長くなる：避難場所の担当者に警報を送る。',
        '1': '避難場所の近くだが、迂回路を求められなかった：人が確認する。',
      },
      ruleUnknown: function (n) { return 'プロファイルの規則 ' + n + '（このページではまだ説明していません）。'; },
      act: { publish: '公開', review: '確認', urgent: '緊急', reject: '非公開', pending: '判定中', alert: '警報', none: '警報なし' },
      resultTitle: '最終結果',
      oPublish: '公開：住民がすぐに見られます', ePublish: '人の確認は不要でした。送ってから数秒で、住民向けの地図に載りました。',
      oReview: '人の確認待ち', eReview: '災害対策本部では見えます。住民には、誰かが確認するまで見えません。',
      oUrgent: '緊急：真っ先に人が確認します', eUrgent: '災害対策本部の一覧のいちばん上に出ます。住民には、人が確認してから見えます。',
      oFinalPublish: '確認のうえ公開', eFinalPublish: '人が確認しました。住民が見られます。',
      oFinalReject: '確認のうえ非公開', eFinalReject: '人が確認しました。住民には見えません。',
      chainKicker: '最初の確認から始まる確認', chainTitle: '歩いて避難場所まで行けるか',
      cAlert: '避難場所の担当者に警報を送りました。', cReview: '迂回路を確認できなかったので、人が確認します。',
      fQ: { flood: '洪水浸水想定区域の中か', shelter: '最寄りの指定緊急避難場所（洪水）はどこか', drive: 'ここを通る車は、迂回するとどれだけ長くなるか', walk: 'ここを通って歩く人は、迂回するとどれだけ長くなるか' },
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
      mapChecks: '地図で調べること：', ch: { flood: '浸水想定区域', shelter: '避難場所', drive: '車で迂回', walk: '歩いて迂回' },
      fRouteMap: function (m) { return '歩いて迂回：+' + m + ' m'; },
      fCarMap: function (m) { return '車で迂回：+' + m + ' m'; },
      fDrive: function (m) { return '車で ' + m + ' m 長くなる'; },
      fDriveNote: '確認する人のための参考情報です。まだどの規則も使いません。', fNoDrive: '車では迂回できない',
      fShelterNote: '確認する人のための参考情報です。追加の確認で使います。',
      fSecond: '2 つ目の確認',
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
      stats2: function (u, p, r, w) { return '人に回った報告 ' + u + ' 件のうち、人が公開したのは ' + p + ' 件、公開しなかったのは ' + r + ' 件です。' + w + ' 件はまだ確認待ちです。'; },
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

  // The page redraws parts of itself when new data comes (a poll, the second
  // check, the 8-second list update). A <details> the visitor opened stays
  // open across those redraws: its state is kept by key.
  var openDetails = {};
  function details(key, props, children) {
    var e = el('details', props, children);
    if (openDetails[key]) e.open = true;
    // At the click (a redraw may come before the toggle event), and at the toggle.
    var summary = e.querySelector('summary');
    if (summary) summary.addEventListener('click', function () { openDetails[key] = !e.open; });
    e.addEventListener('toggle', function () { openDetails[key] = e.open; });
    return e;
  }

  // The key that lets this visitor decide their own report (sent with it).
  function keyOf(id) { try { return sessionStorage.getItem('key:' + id); } catch (e) { return null; } }
  function keepKey(id, key) { try { sessionStorage.setItem('key:' + id, key); } catch (e) {} }

  // Our own fixed texts may contain markup (links, code); data never goes here.
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (n) { var v = t(n.dataset.i18n); if (typeof v === 'string') n.innerHTML = v; });
    document.querySelectorAll('[data-i18n-label]').forEach(function (n) { n.setAttribute('aria-label', t(n.dataset.i18nLabel)); });
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
    if (!$('how').hidden) renderHowGraph();
    renderShelterLabel();
    if (current) renderCurrent();
    else renderDev();
  }

  // The final result once it is there and made after a person's answer;
  // before, the person's answer or the first result. The residents' map
  // shows what the server says is published.
  function outcomeOf(r) {
    if (!r.check) return 'pending';
    if (r.final && finalFresh(r)) return r.final.action;
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
    renderMapReport();
  }

  // The source popovers: one open at a time; Escape or a click elsewhere closes it.
  function closeSources(except) {
    document.querySelectorAll('details.src[open]').forEach(function (d) { if (d !== except) { d.open = false; } });
  }
  document.addEventListener('toggle', function (e) { if (e.target.matches && e.target.matches('details.src') && e.target.open) closeSources(e.target); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSources(null); });
  document.addEventListener('click', function (e) { if (!e.target.closest('details.src')) closeSources(null); });

  /** Steps 3 and 4 no longer show the report: it stays above the map. */
  function renderMapReport() {
    var r = current && current.last;
    var keep = !!r && (step === 'check' || step === 'result');
    $('map-report').hidden = !keep;
    var p = current && current.prepared;
    $('map-report-kicker').textContent = keep ? (current.sentAt ? t('yourReport') : t('aReport')) : '';
    // Free text may have no road name: then only the report itself.
    $('map-report-title').textContent = keep ? (p ? titleOf(p) : r.roadName || '') : '';
    $('map-report-place').textContent = keep && p ? placeOf(p) : '';
    $('map-report-text').textContent = keep ? quote(r.description) : '';
  }

  function setView(v) {
    view = v;
    $('view-hq').setAttribute('aria-pressed', String(v === 'hq'));
    $('view-res').setAttribute('aria-pressed', String(v === 'res'));
    $('legend-flood').hidden = v !== 'hq';
    if (map && map.demoReady) map.setLayoutProperty('flood', 'visibility', v === 'hq' ? 'visible' : 'none');
    setShelterVisible();
    // Back at headquarters: the checks that came while residents looked.
    if (v === 'hq') fitMapChecks();
    updateMap();
    renderCaption();
  }

  function renderCaption() {
    var c;
    if (!current) c = view === 'hq' ? t('capNone') : t('capRes');
    else if (view === 'hq') c = t('capHq');
    else c = current.last && current.last.published ? t('capResYes') : t('capResNo');
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
    // A way around needs a closed section (a line): by car in the first check, on foot when the additional check runs.
    var line = p.location.type === 'LineString';
    return ['flood', 'shelter'].concat(line ? ['drive'] : [], line && p.expected !== 'publish' ? ['walk'] : []);
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

  // --- Steps 2 to 4: one report ------------------------------------------------------

  function watch(id, info) {
    if (current) { clearTimeout(current.poll); clearInterval(current.reveal); }
    clearMapChecks();
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
        // The Task and the Alert come a moment after their decisions; the second
        // check may not come at all (then the developer view says so after a minute).
        var late = !!(me.chainSince && !b0.evacuation && Date.now() - me.chainSince > 60000);
        var sig = JSON.stringify([b0.createdAt, b0.check && [b0.check.action, b0.check.finalAction, b0.check.policyRule], !!(b0.ngsi && b0.ngsi.decision), !!(b0.ngsi && b0.ngsi.task),
          b0.evacuation && b0.evacuation.action, !!(b0.evacuation && b0.evacuation.ngsi && b0.evacuation.ngsi.alert), b0.visitorDecision, b0.issue, late,
          b0.final && [b0.final.action, b0.final.policyRule, b0.final.decidedAt, !!(b0.final.ngsi && b0.final.ngsi.decision)], finalLate(b0)]);
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
      // Then the final result (step 4); it is made again after a person's answer.
      // It counts as late a minute after the earlier checks (or after a
      // person's answer, for the rerun), so the page never polls fast forever.
      if (done && !finalFresh(b) && !me.finalSince) me.finalSince = Date.now();
      if (finalFresh(b)) me.finalSince = null;
      done = done && (finalFresh(b) || finalLate(b));
      var resolved = done && b.final && b.final.action !== 'review';
      me.poll = setTimeout(poll, !done ? 1200 : resolved ? 30000 : 4000);
      if (decidedNow && !me.mapped) { me.mapped = true; loadReports(); }
    }).catch(function () { if (current === me && seq === me.seq) me.poll = setTimeout(poll, 3000); });
  }

  /**
   * The final result is there and made after a person's answer, if there was
   * one (the bridge writes reviewedAt with the answer; until then it is not).
   */
  function finalFresh(b) {
    if (!b || !b.final) return false;
    var answered = b.check && (b.check.finalAction || b.visitorDecision);
    if (!answered) return true;
    if (!b.check.reviewedAt || !b.final.decidedAt) return false;
    return Date.parse(b.final.decidedAt) >= Date.parse(b.check.reviewedAt);
  }

  /** The additional check did not come within a minute of the first check (as the developer view says). */
  function secondLate() {
    return !!(current && current.chainSince && Date.now() - current.chainSince > 60000);
  }

  /** No (new) final result within a minute of the earlier checks or of a person's answer. */
  function finalLate(b) {
    return !!(b && !finalFresh(b) && current && current.finalSince && Date.now() - current.finalSince > 60000);
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

  function renderCurrent() {
    var r = current.last;
    var p = current.prepared;
    var where = p ? [titleOf(p), placeOf(p)].filter(Boolean).join(' · ') : r ? r.roadName || t('noRoad') : '';
    $('cur-kicker').textContent = (current.sentAt ? t('yourReport') : t('aReport')) + (where ? ' · ' + where : '');
    $('cur-text').textContent = r ? quote(r.description) : '';
    renderMapReport();
    renderTimeline(r);
    renderAnswers(r);
    renderDecisionFacts(r);
    renderRule(r);
    // The way around on foot is step 3's: drawn from there on.
    if (r && r.evacuation && (step === 'check' || step === 'result')) showRoute(r.evacuation.facts || []);
    if (step === 'check') renderCheck(r);
    if (step === 'result') renderResult(r);
    renderDev();
    if (devTag) devHighlight(devTag);
  }

  /** A moving mark next to a text while something runs, so nobody mistakes it for a result. */
  function busy(text) {
    return el('span', { class: 'busy' }, [el('span', { class: 'spin', 'aria-hidden': 'true' }), el('span', { text: text })]);
  }

  /**
   * The first check's parts in order, each with its result inside it: saved,
   * then the AI and the map checks (at the same time, inside one Pointsman
   * call), then the rule. Times: saving, Pointsman's part, and all of it.
   */
  function renderTimeline(r) {
    var tl = $('timeline');
    tl.textContent = '';
    var shown = current.shown;
    var sent = current.sentAt ? new Date(current.sentAt).toISOString() : null;
    var tSave = r && r.createdAt && sent ? seconds(sent, r.createdAt) : '';
    var tPair = r && r.createdAt && r.check ? seconds(r.createdAt, r.check.decidedAt) : '';
    var tAll = r && r.check && sent ? t('inAll')(seconds(sent, r.check.decidedAt)) : '';
    var part = function (k, i, time) {
      var done = i < shown;
      var active = i === shown;
      return el('li', { class: done ? 'done' : active ? 'active' : '', 'data-dev': ['save', 'ai', 'maps', 'rule'][i] }, [
        el('span', { class: 'mark', 'aria-hidden': 'true' }),
        el('div', { class: 'what' }, [
          el('div', { class: 'head' }, [el('strong', { text: t(k) }), time && done ? el('span', { class: 'time', text: time }) : null]),
          done ? el('span', { class: 'sub', text: t(k + 'd') }) : active ? busy(t('working')) : null,
          // The result of this part, filled by renderAnswers, renderDecisionFacts and renderRule.
          i > 0 ? el('div', { class: 'body', id: ['', 'answers', 'facts', 'rule'][i] }) : null,
        ]),
      ]);
    };
    tl.appendChild(part('s1', 0, tSave));
    // The AI and the map checks run at the same time: one group, one time.
    var pairDone = shown > 2;
    tl.appendChild(el('li', { class: 'pair' + (pairDone ? ' done' : '') }, [
      el('div', { class: 'pair-head' }, [el('span', { class: 'kicker', text: t('together') }), pairDone && tPair ? el('span', { class: 'time', text: tPair }) : null]),
      el('ol', { class: 'pair-list' }, [part('s2', 1, ''), part('s3', 2, '')]),
    ]));
    tl.appendChild(part('s4', 3, tAll));
    // One short line for screen readers, only when it changes.
    var status = !r ? '' : shown < 4 ? t(['s1', 's2', 's3', 's4'][shown]) + ': ' + t('working')
      : r.check ? t('s4') + ': ' + (t('act')[r.check.action] || r.check.action) : '';
    if ($('decide-status').textContent !== status) $('decide-status').textContent = status;
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

  /** The answer and fact names the decision's rule read (RULE_USES), or none for a rule this page does not know. */
  function usedBy(profile, rule) {
    var uses = RULE_USES[profile];
    var key = rule === undefined ? 'default' : String(rule);
    return Object.prototype.hasOwnProperty.call(uses, key) ? uses[key] : [];
  }

  function usedTag() {
    return el('span', { class: 'use-tag', text: t('useTag') });
  }

  /** The AI's answers as rows: the question, the answer and how sure; the ones the rule read tagged. */
  function answerRows(answers, used) {
    var names = Object.keys(answers);
    if (!names.length) return null;
    var list = el('div', { class: 'qa' });
    names.forEach(function (name) {
      var a = answers[name];
      var c = confidence(a.p);
      var on = used.indexOf(name) >= 0;
      list.appendChild(el('div', { class: 'row' + (on ? ' used-row' : '') }, [
        el('span', { class: 'qcol' }, [el('span', { class: 'q', text: (t('q')[name] || name) }), on ? usedTag() : null]),
        el('span', { class: 'acol' }, [
          el('strong', { text: answerText(name, a.value) }),
          c ? el('span', { class: 'conf ' + c, text: t('conf')[c] }) : null,
        ]),
      ]));
    });
    return list;
  }

  function renderAnswers(r) {
    var box = $('answers');
    if (!box) return;
    box.textContent = '';
    if (!r || !r.check || current.shown < 2) return;
    var list = answerRows(r.check.answers, usedBy('check', r.check.policyRule));
    if (!list) return;
    box.appendChild(list);
  }

  function renderDecisionFacts(r) {
    var box = $('facts');
    if (!box) return;
    box.textContent = '';
    if (!r || !r.check || current.shown < 3) return;
    // Only this step's map checks; the way around on foot is step 3's.
    var facts = renderFacts(r.facts || [], usedBy('check', r.check.policyRule));
    if (facts) box.appendChild(facts);
    showShelter(r.facts || []);
    // The way around by car is step 2's; from step 3 on the one on foot takes its place.
    if (step === 'decide') showRoute(r.facts || [], 'drive');
  }

  function renderRule(r) {
    var box = $('rule');
    if (!box) return;
    box.textContent = '';
    if (!r || !r.check || current.shown < 4) return;
    var a = r.check.action;
    // A rule index this page does not know (a newer profile) is said so, not guessed.
    var key = r.check.policyRule === undefined ? 'default' : r.check.policyRule;
    var text = Object.prototype.hasOwnProperty.call(t('rules'), key) ? t('rules')[key] : t('ruleUnknown')(key);
    box.appendChild(el('div', { class: 'box tint ' + a }, [
      el('span', { class: 'kicker', text: t('ruleTitle') }),
      el('span', { class: 'rule-text', text: text }),
      usedBy('check', r.check.policyRule).length ? el('span', { class: 'uses-note' }, [usedTag(), ' ' + t('usesMarked')]) : null,
      el('div', { class: 'rule-foot' }, [
        el('span', { class: 'badge ' + a, text: t('act')[a] || a }),
        el('button', { class: 'btn', type: 'button', text: t('next'), onclick: function () {
          setStep('check', true);
          renderCheck(current.last);
        } }),
      ]),
    ]));
  }

  // --- Step 3: the additional check ---------------------------------------------------

  /**
   * The first result in one line, then the additional check (the way to the
   * evacuation site): what it found, or why it did not run.
   */
  function renderCheck(r) {
    var out = $('outcome');
    var chain = $('chain');
    out.textContent = '';
    chain.textContent = '';
    if (!r || !r.check) return;
    var a = r.check.action;
    var o = { publish: 'Publish', review: 'Review', urgent: 'Urgent' }[a] || 'Review';
    out.appendChild(el('div', { class: 'box tint ' + a }, [
      el('span', { class: 'kicker', text: t('stage1') }),
      el('strong', { class: 'headline', text: t('o' + o) }),
    ]));
    var ev = r.evacuation;
    var items = [a === 'publish' ? null : el('span', { class: 'kicker', text: t('chainKicker') }), el('strong', { class: 'box-title', text: t('chainTitle') })].filter(Boolean);
    if (a === 'publish') {
      items.push(el('span', { text: t('secondNotNeeded') }));
    } else if (!ev) {
      items.push(secondLate() ? el('span', { text: t('ev').secondLate[1] }) : busy(t('secondRunning')));
    } else {
      var used2 = usedBy('evacuation', ev.policyRule);
      var asked = answerRows(ev.answers || {}, used2);
      if (asked) items.push(asked);
      var facts = renderFactList(ev.facts || [], false, used2);
      if (facts) items.push(facts);
      showShelter(ev.facts || []);
      showRoute(ev.facts || []);
      var rules2 = t('rules2');
      var key2 = ev.policyRule === undefined ? 'default' : ev.policyRule;
      if (Object.prototype.hasOwnProperty.call(rules2, key2)) items.push(el('span', { class: 'rule-text', text: rules2[key2] }));
      if (used2.length) items.push(el('span', { class: 'uses-note' }, [usedTag(), ' ' + t('usesMarked')]));
      var c = { alert: 'cAlert', review: 'cReview', none: 'cNone' }[ev.action];
      if (c) items.push(el('strong', { class: 'chain-result ' + ev.action, text: t(c) }));
    }
    chain.appendChild(el('div', { class: 'box map-checks' }, items));
    // For screen readers: one short line when the state changes, not the whole box.
    var status = a === 'publish' ? t('secondNotNeeded') : !ev ? (secondLate() ? t('ev').secondLate[0] : t('secondRunning'))
      : t({ alert: 'cAlert', review: 'cReview', none: 'cNone' }[ev.action] || 'cNone');
    if ($('check-status').textContent !== status) $('check-status').textContent = status;
    // On to the final result once the additional check is there (or not needed, or late).
    if (a === 'publish' || ev || secondLate()) {
      chain.appendChild(el('div', { class: 'actions' }, [el('button', { class: 'btn', type: 'button', text: t('next2'), onclick: function () {
        setStep('result', true);
        renderResult(current.last);
        // A published report: show it where residents see it.
        if (current.last.published) setView('res');
      } })]));
    }
  }

  // --- Step 4: the final result ---------------------------------------------------------

  function renderResult(r) {
    var person = $('person');
    person.textContent = '';
    if (!r || !r.check) return;
    var a = r.check.action;
    var final = r.check.finalAction || r.visitorDecision;
    renderFinal(r);

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

  /**
   * The final result (step 3 of the chain) as the headline: what it is, the
   * rule that made it, and what it was made from. Before it comes, a short
   * "being decided" line.
   */
  function renderFinal(r) {
    var box = $('final');
    box.textContent = '';
    if (!r || !r.check) return;
    var f = r.final;
    // After a person's answer the final result is made again: until it is
    // there, "being decided" (not the old result next to the new answer).
    // No final result in the end (the additional check did not come): say so,
    // and that the first result stands.
    var chained = r.check.action !== 'publish';
    if (!f && (finalLate(r) || (chained && secondLate() && !r.evacuation))) {
      // Why: the additional check (when one was needed) or the final decision itself did not come.
      var why = chained && !r.evacuation ? t('missingSecond') : t('missingFinal');
      // What stands: a person's answer, if there is one, else the first result.
      var answer = r.check.finalAction || r.visitorDecision;
      var stands = answer ? t('standsPerson')(t('act')[answer] || answer) : t('standsFirst')(t('act')[r.check.action] || r.check.action);
      box.appendChild(el('div', { class: 'box tint ' + (answer || r.check.action) }, [
        el('strong', { class: 'box-title', text: t('finalMissing') }),
        el('span', { text: why + ' ' + stands }),
      ]));
      return;
    }
    if (!f || (!finalFresh(r) && !finalLate(r))) {
      box.appendChild(el('div', { class: 'box' }, [
        el('strong', { class: 'box-title' }, [busy(t('finalPending'))]),
        el('span', { text: t('finalPendingText') }),
      ]));
      return;
    }
    var words = t('fin')[f.action] || [t('act')[f.action] || f.action, ''];
    var rules = t('rules3');
    var rule = Object.prototype.hasOwnProperty.call(rules, f.policyRule === undefined ? 'default' : f.policyRule) ? rules[f.policyRule === undefined ? 'default' : f.policyRule] : null;
    var person = r.check.finalAction || r.visitorDecision;
    var ev = r.evacuation;
    // What it was made from, as the chain it went through: each earlier
    // result with its colour, in order, the person's answer last.
    var stage = function (label, action, text) {
      return el('span', { class: 'stage' }, [el('span', { class: 'stage-label', text: label }), el('span', { class: 'badge small ' + (action || 'none'), text: text || t('act')[action] || action })]);
    };
    var arrow = function () { return el('span', { class: 'stage-arrow', 'aria-hidden': 'true', text: '→' }); };
    // The person answers the first check, so their answer follows it; the
    // additional check ran on the first result, beside that answer.
    var from = [el('span', { class: 'kicker', text: t('basedOn') }), stage(t('bFirst'), r.check.action)];
    if (person) from.push(arrow(), stage(t('bPerson'), person));
    var second = ev ? stage(t('bSecond'), ev.action) : r.check.action === 'publish' ? stage(t('bSecond'), 'skip', t('bNoSecond')) : null;
    if (second) from.push(el('span', { class: 'stage-arrow', 'aria-hidden': 'true', text: '·' }), second);
    // The step's own heading says "Final result": no kicker here.
    box.appendChild(el('div', { class: 'box tint final ' + f.action }, [
      el('strong', { class: 'headline', text: words[0] }),
      words[1] ? el('span', { text: words[1] }) : null,
      rule ? el('span', { class: 'rule-text', text: rule }) : null,
      el('div', { class: 'stages' }, from),
    ]));
  }

  /** How it works: the chain as a diagram (once per language). */
  function renderHowGraph() {
    var spot = $('how-graph');
    spot.textContent = '';
    spot.appendChild(renderGraph());
  }

  // The chain as a diagram (Pointsman's GET /v1/profiles/{id}/graph, through
  // the demo's server), fetched once per language; a failed fetch is tried
  // again later (fetchGraph), and the box is left out until it works.
  var graphSvg = {};
  var graphAt = {};
  var GRAPH_TTL = 600000; // 10 minutes, as the server's cache
  function renderGraph() {
    var l = lang;
    var holder = el('div', { class: 'box graph', id: 'graph-box', 'data-lang': l }, [
      el('span', { class: 'kicker', text: t('graphKicker') }),
      el('span', { text: t('graphText') }),
    ]);
    // It may scroll sideways on narrow screens: focusable, so keyboards can scroll it too.
    var place = el('div', { class: 'graph-svg', tabindex: '0', role: 'region', 'aria-label': t('graphKicker') });
    holder.appendChild(place);
    holder.appendChild(el('a', { href: '/api/graph?format=dmn&lang=' + l, download: 'road-closure-final.dmn', text: t('graphDmn') }));
    if (graphSvg[l]) {
      place.appendChild(graphSvg[l].cloneNode(true));
      // Older than the server's cache: fetch the current one, keep this one meanwhile.
      if (Date.now() - graphAt[l] > GRAPH_TTL && !graphAt[l + ':fetching']) fetchGraph(l, 0);
      return holder;
    }
    holder.hidden = true;
    if (graphSvg[l] === undefined) fetchGraph(l, 0);
    return holder;
  }

  /** Fetches the diagram; after a failure it tries again by itself (20 s, 40 s, …; five tries). */
  function fetchGraph(l, tries) {
    var had = !!graphSvg[l];
    if (!had) graphSvg[l] = null; // fetching
    graphAt[l + ':fetching'] = true;
    fetch('/api/graph?format=svg&lang=' + l).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }).then(function (text) {
      graphAt[l + ':fetching'] = false;
      var svg = cleanSvg(text);
      if (!svg) {
        // A diagram shown already stays; it is tried again at the next redraw after the TTL.
        if (had) { graphAt[l] = Date.now(); return; }
        delete graphSvg[l];
        if (tries < 4) setTimeout(function () { if (graphSvg[l] === undefined) fetchGraph(l, tries + 1); }, 20000 * (tries + 1));
        return;
      }
      graphSvg[l] = svg;
      graphAt[l] = Date.now();
      // The page may have been redrawn meanwhile: put it in the box shown now, if it is in this language.
      var now = document.querySelector('#graph-box[data-lang="' + l + '"]');
      var spot = now && now.querySelector('.graph-svg');
      if (spot) { spot.textContent = ''; spot.appendChild(svg.cloneNode(true)); now.hidden = false; }
    });
  }

  // Only what Pointsman's diagram uses (src/graph.ts toSvg): SVG elements and
  // attributes on these lists; everything else is dropped, so nothing in it
  // can run or load anything.
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SVG_ELEMENTS = ['svg', 'style', 'defs', 'marker', 'path', 'line', 'rect', 'text', 'tspan', 'title', 'g'];
  var SVG_ATTRS = ['class', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'rx', 'd', 'viewBox', 'refX', 'refY', 'markerWidth',
    'markerHeight', 'orient', 'marker-end', 'textLength', 'lengthAdjust', 'id', 'role', 'aria-label'];
  function cleanSvg(text) {
    if (!text) return null;
    var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    var svg = doc.documentElement;
    if (!svg || svg.namespaceURI !== SVG_NS || svg.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
    var keep = function (n) { return n.namespaceURI === SVG_NS && SVG_ELEMENTS.indexOf(n.localName) >= 0; };
    Array.prototype.slice.call(svg.getElementsByTagName('*')).forEach(function (n) { if (!keep(n) && n.parentNode) n.parentNode.removeChild(n); });
    [svg].concat(Array.prototype.slice.call(svg.getElementsByTagName('*'))).forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        var ok = SVG_ATTRS.indexOf(a.localName) >= 0 && !a.namespaceURI
          // A marker is referenced only within the diagram.
          && !(a.localName === 'marker-end' && !/^url\(#[A-Za-z0-9_.-]+\)$/.test(a.value));
        if (!ok && !(n === svg && a.name === 'xmlns')) n.removeAttribute(a.name);
      });
    });
    // The style element: Pointsman's own rules, but no outside resources.
    Array.prototype.slice.call(svg.getElementsByTagName('style')).forEach(function (st) {
      if (/@import|url\(/i.test(st.textContent)) st.parentNode.removeChild(st);
    });
    return document.importNode(svg, true);
  }

  // --- The week's numbers (the Reports panel) ------------------------------------------

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
    // A way around needs a closed road section; a point has none.
    if (f.missing && (f.name === 'walk' || f.name === 'drive') && f.reason === 'no_location') return t('fNotForPoint');
    if (f.missing) return t('fMissing')(f.reason);
    if (f.name === 'flood') return f.values.inside ? t('fFlood')(t('floodClass')[f.values.class] || String(f.values.class)) : t('fNoFlood');
    if (f.name === 'shelter') return f.values.found ? t('fShelter')(String(f.values.name), f.values.distance_m) : t('fNoShelter');
    if (f.name === 'walk') return typeof f.values.extra_m === 'number' ? t('fWalk')(f.values.extra_m) : t('fNoWalk');
    if (f.name === 'drive') return typeof f.values.extra_m === 'number' ? t('fDrive')(f.values.extra_m) : t('fNoDrive');
    return JSON.stringify(f.values);
  }

  /** How much a map check matters, in the terms of the rules: a level word and its colour. */
  function factLevel(f) {
    if (f.missing) return null;
    var v = f.values;
    // rank 5 and more is 3 m or deeper: the first check's rules read the same rank.
    if (f.name === 'flood') return !v.inside ? ['low', t('lvl').noZone] : v.rank >= 5 ? ['high', t('lvl').deep] : ['mid', t('lvl').shallow];
    if (f.name === 'shelter') return !v.found ? ['low', t('lvl').far] : v.distance_m <= 1000 ? ['mid', t('lvl').near] : ['low', t('lvl').far];
    if (f.name === 'walk') return typeof v.extra_m !== 'number' ? ['high', t('lvl').noWay] : v.extra_m >= 200 ? ['high', t('lvl').long] : ['low', t('lvl').short];
    // No rule reads the way around by car (road-restriction-check v4): context only.
    if (f.name === 'drive') return ['ctx', t('lvl').ctx];
    return null;
  }

  /**
   * One row per map check, laid out like the AI's answers: the question, the
   * answer and its level; the rows the rule used are tagged. Where the data
   * comes from is behind an (i) at the end of the row.
   */
  // `firstCheck`: the facts of the first check, where no rule uses the evacuation site.
  function renderFactList(facts, firstCheck, used) {
    if (!facts.length) return null;
    used = used || [];
    var rows = el('div', { class: 'qa facts' });
    facts.forEach(function (f) {
      var on = used.indexOf(f.name) >= 0;
      var level = factLevel(f);
      // In the first check no rule reads the evacuation site: no colour for it there.
      if (level && firstCheck && !on && f.name === 'shelter') level = ['ctx', level[1]];
      // Where the data comes from: behind an (i), shown on hover (title) or a click.
      var src = !f.missing && f.source ? details(current.id + ':src-' + (firstCheck ? '1-' : '2-') + f.name, { class: 'src' }, [
        el('summary', { class: 'src-btn', title: t('fSource') + f.source, 'aria-label': t('srcShow') }, ['i']),
        el('span', { class: 'src-pop', text: t('fSource') + f.source }),
      ]) : null;
      rows.appendChild(el('div', { class: 'row fact ' + f.name + (on ? ' used-row' : '') }, [
        el('span', { class: 'qcol' }, [
          el('span', { class: 'q' }, [f.second ? el('span', { class: 'ftag', text: t('fSecond') }) : null, t('fQ')[f.name] || f.name]),
          on ? usedTag() : null,
        ]),
        el('span', { class: 'acol' }, [
          el('strong', { class: 'fa', text: factText(f) }),
          level ? el('span', { class: 'lvl ' + level[0], text: level[1] }) : null,
          src,
        ]),
        firstCheck && f.name === 'shelter' && !f.missing && !f.second && !on ? el('span', { class: 'fn', text: t('fShelterNote') }) : null,
        f.name === 'drive' && !f.missing && !on ? el('span', { class: 'fn', text: t('fDriveNote') }) : null,
      ]));
    });
    return rows;
  }

  function renderFacts(facts, used) {
    var list = renderFactList(facts, true, used);
    if (!list) return null;
    return el('div', { class: 'map-checks' }, [el('span', { class: 'kicker', text: t('factsTitle') }), list]);
  }

  // What each rule reads, by profile and rule index (the profiles'
  // policy.rules in pointsman-config; the rule texts above mirror them).
  // Answer names and fact names; a rule with no match uses its default.
  var RULE_USES = {
    check: {
      '0': ['danger'], '1': ['flood', 'danger'], '2': ['flood', 'danger'], '3': ['flood'], '4': ['flood'],
      '5': ['danger', 'category', 'status_matches', 'clarity'], 'default': ['danger', 'category', 'status_matches', 'clarity'],
    },
    // Its default (none) reads nothing: no 'Based on' line for it.
    evacuation: { '0': ['shelter', 'walk', 'foot_passable'], '1': ['shelter', 'walk'] },
  };

  // --- Developer view ------------------------------------------------------------------

  // A sequence diagram of the report's way: one column per part, one arrow
  // per event, each with a sentence and the real data. Events that have not
  // happened yet are greyed out. Each event has the tag of the page step it
  // belongs to (data-dev), so pointing at one shows the other.
  var devOn = false;
  try { devOn = localStorage.getItem('dev') === '1'; } catch (e) {}
  var LANES = ['page', 'platform', 'bridge', 'pointsman', 'data'];
  var DEV_TAGS = ['save', 'ai', 'maps', 'rule', 'second', 'final'];

  function devEvents(r) {
    // In step with the page, which shows the first check's parts one after the other.
    var shown = current.shown;
    var c = shown >= 2 && r && r.check;
    var c3 = shown >= 3 && c;
    var c4 = shown >= 4 && c;
    var data = function (label, value) { return value === undefined || value === null ? null : [label, value]; };
    var ev = [
      { key: 'save', tag: 'save', from: 0, to: 1, done: !!(r && r.createdAt) && shown >= 1, data: [
        current.request ? data(t('showRequest'), { method: 'POST', path: '/api/reports', body: current.request }) : null,
        data(t('showEntity'), r && r.ngsi && r.ngsi.entity),
      ] },
      { key: 'notify', tag: 'save', from: 1, to: 2, done: !!c },
      { key: 'decide', tag: 'ai', from: 2, to: 3, done: !!c },
      { key: 'model', tag: 'ai', from: 3, to: 4, done: !!c, data: [data(t('showAnswers'), c && c.answers)] },
      { key: 'maps', tag: 'maps', from: 3, to: 4, done: !!c3, data: [data(t('showFacts'), r && r.facts && r.facts.length ? r.facts : null)] },
      { key: 'decision', tag: 'rule', from: 3, to: 2, done: !!c4, vars: c4 ? { action: t('act')[c4.action] || c4.action, rule: c4.policyRule === undefined ? 'default' : 'rules[' + c4.policyRule + ']' } : null },
      // The bridge writes check last, so once check is there the entities are too.
      { key: 'write', tag: 'rule', from: 2, to: 1, done: !!c4, data: [
        data(t('showDecision'), r && r.ngsi && r.ngsi.decision),
        data(t('showTask'), r && r.ngsi && r.ngsi.task),
      ] },
    ];
    var f = c4 && r.final;
    var third = [
      { key: 'notify3', tag: 'final', from: 1, to: 2, done: !!f },
      { key: 'decide3', tag: 'final', from: 2, to: 3, done: !!f },
      { key: 'write3', tag: 'final', from: 2, to: 1, done: !!(f && f.ngsi && f.ngsi.decision), data: [data(t('showDecision3'), f && f.ngsi && f.ngsi.decision)] },
    ];
    if (c4 && !f && finalLate(r)) third = [{ key: 'finalLate', tag: 'final', done: true }];
    if (c4 && c4.action === 'publish') return ev.concat([{ key: 'publishEnd', tag: 'second', done: true }], third);
    var e2 = c4 && r.evacuation;
    // The page stops waiting for the second check after a minute; so does this view.
    if (c4 && !e2 && current.chainSince && Date.now() - current.chainSince > 60000) {
      return ev.concat([{ key: 'secondLate', tag: 'second', done: true }], third);
    }
    return ev.concat([
      { key: 'notify2', tag: 'second', from: 1, to: 2, done: !!e2 },
      { key: 'decide2', tag: 'second', from: 2, to: 3, done: !!e2, data: [data(t('showAnswers'), e2 && e2.answers)] },
      { key: 'maps2', tag: 'second', from: 3, to: 4, done: !!e2, data: [data(t('showFacts'), e2 && e2.facts && e2.facts.length ? e2.facts : null)] },
      { key: 'write2', tag: 'second', from: 2, to: 1, done: !!(e2 && e2.ngsi && e2.ngsi.decision), data: [
        data(t('showDecision2'), e2 && e2.ngsi && e2.ngsi.decision),
        data(t('showAlert'), e2 && e2.ngsi && e2.ngsi.alert),
      ] },
    ], third);
  }

  var devSig = null;
  var devTag = null; // the step marked now
  function renderDev() {
    var body = $('dev-body');
    var events = devOn && current ? devEvents(current.last) : null;
    // Rebuilt only when something changed: focus, selection and the marks stay.
    var sig = JSON.stringify([devOn, lang, current && current.id, events && events.map(function (e) { return [e.key, e.done, e.vars, (e.data || []).filter(Boolean).length]; })]);
    if (sig === devSig) return;
    devSig = sig;
    body.textContent = '';
    if (!devOn) return;
    if (!current) { body.appendChild(el('p', { class: 'muted small', text: t('devEmpty') })); return; }
    var seq = el('div', { class: 'seq' }, [el('div', { class: 'seq-lanes' }, LANES.map(function (l) { return el('span', { text: t('lane')[l] }); }))]);
    events.forEach(function (e) {
      var words = t('ev')[e.key];
      var title = words[0].replace(/\{(\w+)\}/g, function (_, k) { return e.vars && e.vars[k] !== undefined ? String(e.vars[k]) : ''; });
      var row = el('div', { class: 'ev' + (e.done ? '' : ' pending'), 'data-dev': e.tag });
      if (e.from !== undefined) {
        var a = Math.min(e.from, e.to);
        var b = Math.max(e.from, e.to);
        row.appendChild(el('div', { class: 'ev-line', 'aria-hidden': 'true' }, [
          el('span', { class: 'arrow ' + (e.to > e.from ? 'ltr' : 'rtl'), style: 'grid-column: ' + (a + 1) + ' / ' + (b + 2) + '; --k: ' + (b - a + 1) }),
        ]));
      }
      var parts = e.done ? (e.data || []).filter(Boolean) : [];
      row.appendChild(el('div', { class: 'ev-text' }, [
        el('div', null, [el('strong', { text: title }), e.done ? null : el('span', { class: 'muted', text: ' · ' + t('devWaiting') })]),
        el('p', { text: words[1] }),
        // The data, behind one click; it stays open when the page updates.
        parts.length ? details(current.id + ':dev:' + e.key, { class: 'ev-data' }, [el('summary', { text: t('devData')(parts.map(function (d) { return d[0]; }).join(', ')) })].concat(parts.map(function (d) {
          return el('div', null, [el('span', { class: 'kicker', text: d[0] }), el('pre', { text: JSON.stringify(d[1], null, 2) })]);
        }))) : null,
      ]));
      seq.appendChild(row);
    });
    body.appendChild(seq);
    body.appendChild(el('p', { class: 'muted small', text: t('devPoll') }));
    devHighlight(devTag);
  }

  function setDev(on, remember) {
    devOn = on;
    if (remember !== false) try { localStorage.setItem('dev', on ? '1' : '0'); } catch (e) {}
    $('dev').hidden = !on;
    // One side panel at a time: the developer view or the reports.
    if (on && !$('activity').hidden) setActivity(false);
    sideOpen();
    $('dev-toggle').setAttribute('aria-pressed', String(on));
    devTag = null;
    devHighlight(null);
    renderDev();
  }

  /** The page parts and the events of one step, marked together. */
  function devHighlight(tag) {
    devTag = tag;
    document.querySelectorAll('.dev-hl').forEach(function (n) { n.classList.remove('dev-hl'); });
    if (!devOn || DEV_TAGS.indexOf(tag) < 0) return;
    document.querySelectorAll('[data-dev="' + tag + '"]').forEach(function (n) { n.classList.add('dev-hl'); });
  }

  function devPoint(e) {
    if (!devOn) return;
    var n = e.target && e.target.closest ? e.target.closest('[data-dev]') : null;
    var tag = n ? n.getAttribute('data-dev') : null;
    if (tag !== devTag) devHighlight(tag);
  }

  // --- How it works: the live lists ------------------------------------------------------

  function renderReports() {
    var list = $('reports');
    list.textContent = '';
    // The list shows the newest 20: so does the count.
    $('count-recent').textContent = String(Math.min(20, reports.length));
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
    $('count-pending').textContent = pending ? String(pending.total != null ? pending.total : pending.decisions.length) : '';
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
    info.appendChild(details('pending-query', null, [el('summary', { text: t('showQuery') }),
      el('pre', { text: q.method + ' ' + url + '\nNGSILD-Tenant: ' + q.tenant + '\nLink: <' + q.link + '>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' })]));
  }

  function setHow(open) {
    $('how').hidden = !open;
    $('how-toggle').setAttribute('aria-expanded', String(open));
    $('how-open').setAttribute('aria-expanded', String(open));
    if (open) {
      renderHowGraph();
      $('how').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // The reports panel, beside the page like the developer view: recent
  // reports, the ones waiting for a person, the week's numbers.
  function setActivity(open) {
    $('activity').hidden = !open;
    $('activity-toggle').setAttribute('aria-expanded', String(open));
    if (open) {
      // The developer view closes, but stays the remembered choice.
      if (devOn) setDev(false, false);
      loadStats();
    }
    sideOpen();
    // Keyboards land in the panel when it opens (it comes after the page); its Close button puts focus back on the header button.
    if (open) $('activity-title').focus();
  }

  // The reports panel's two lists, as tabs (remembered in the browser).
  function setListTab(name, focus) {
    ['pending', 'recent'].forEach(function (n) {
      var on = n === name;
      $('tab-' + n).setAttribute('aria-selected', String(on));
      $('tab-' + n).tabIndex = on ? 0 : -1;
      $('panel-' + n).hidden = !on;
    });
    if (focus) $('tab-' + name).focus();
    try { localStorage.setItem('listTab', name); } catch (e) {}
  }
  (function () {
    var saved = null;
    try { saved = localStorage.getItem('listTab'); } catch (e) {}
    if (saved === 'recent') setListTab('recent');
    ['pending', 'recent'].forEach(function (n) {
      $('tab-' + n).addEventListener('click', function () { setListTab(n); });
      // Arrow keys move between the tabs.
      $('tab-' + n).addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        setListTab(n === 'pending' ? 'recent' : 'pending', true);
      });
    });
  })();

  /** The page makes room for the open side panel (body class, wide screens). */
  function sideOpen() {
    document.body.classList.toggle('dev-open', devOn || !$('activity').hidden);
  }

  // The side panels can be made wider or narrower by their left edge (wide
  // screens; on narrow ones they are a drawer at the bottom). Remembered.
  var SIDE_MIN = 320;
  function sideWidth() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--side-w'), 10) || 440;
  }
  var sideWanted = 440;
  function setSideWidth(w) {
    // At least 480 px left for the page, after its margins (16 px on each side, style.css).
    var max = Math.max(SIDE_MIN, Math.min(900, document.documentElement.clientWidth - 480 - 32));
    w = Math.round(Math.min(max, Math.max(SIDE_MIN, w)));
    document.documentElement.style.setProperty('--side-w', w + 'px');
    document.querySelectorAll('.side-grip').forEach(function (g) {
      g.setAttribute('aria-valuenow', String(w));
      g.setAttribute('aria-valuetext', w + ' px');
      g.setAttribute('aria-valuemin', String(SIDE_MIN));
      g.setAttribute('aria-valuemax', String(max));
    });
    return w;
  }
  (function () {
    var saved = 0;
    try { saved = Number(localStorage.getItem('sideW')) || 0; } catch (e) {}
    sideWanted = saved || 440;
    setSideWidth(sideWanted);
    var save = function (w) { sideWanted = w; try { localStorage.setItem('sideW', String(w)); } catch (e) {} };
    // A smaller window narrows the panel; a larger one gives back the chosen width.
    window.addEventListener('resize', function () { setSideWidth(sideWanted); });
    document.querySelectorAll('.side-grip').forEach(function (g) {
      g.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        g.setPointerCapture(e.pointerId);
        document.body.classList.add('resizing');
        var move = function (ev) { setSideWidth(document.documentElement.clientWidth - ev.clientX); };
        var up = function () {
          g.removeEventListener('pointermove', move);
          g.removeEventListener('pointerup', up);
          g.removeEventListener('pointercancel', up);
          document.body.classList.remove('resizing');
          save(sideWidth());
        };
        g.addEventListener('pointermove', move);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointercancel', up);
      });
      // Keyboard: the arrow keys move the edge.
      g.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        save(setSideWidth(sideWidth() + (e.key === 'ArrowLeft' ? 24 : -24)));
      });
    });
  })();

  // --- Map ---------------------------------------------------------------------------------

  // The base map: GSI's optimised vector tiles (国土地理院最適化ベクトルタイル,
  // optimal_bvmap), drawn in quiet colours of the page's theme, so that the
  // reports and the flood zones stand out. The flood zones exist only as
  // raster tiles. GSI keeps the current data in one PMTiles file; the older
  // z/x/y tiles (data of 2023-10) are only the fallback without pmtiles.js.
  var PALETTE = {
    light: { bg: '#F2EEE6', water: '#D9E1E6', minor: '#FFFFFF', major: '#E3DCCF', rail: '#C9C2B5', building: '#E7E1D6', label: '#7A756D', halo: '#F2EEE6', flood: 0.6,
      current: '#171717', route: '#1f5fa8', drive: '#8a5a00', shelter: '#1E6B48' },
    dark: { bg: '#171717', water: '#1E2830', minor: '#2A2A2A', major: '#383838', rail: '#444444', building: '#202020', label: '#9A958C', halo: '#171717', flood: 0.6,
      current: '#F5F2EC', route: '#7DB3EE', drive: '#E0B46A', shelter: '#8ED6B2' },
  };
  // The place names GSI's own style writes horizontally (its 注記 layer filter).
  var LABEL_FILTER = ["step", ["zoom"], ["all", ["==", ["geometry-type"], "Point"], ["in", ["get", "vt_code"], ["literal", [110, 120, 130, 140, 210, 220, 311, 312, 314, 315, 316, 321, 322, 323, 331, 332, 333, 334, 341, 342, 343, 344, 345, 346, 347, 348, 351, 352, 411, 412, 421, 422, 431, 432, 441, 511, 521, 531, 532, 634, 651, 800, 810, 820, 822, 830, 831, 832, 840, 841, 842, 843, 850, 880, 881, 885, 889, 2943, 2944]]], ["any", ["any", ["==", ["get", "vt_arrng"], 1], ["==", ["get", "vt_arrng"], 3]], ["!", ["has", "vt_arrng"]]]], 16, ["all", ["==", ["geometry-type"], "Point"], ["in", ["get", "vt_flag17"], ["literal", [0, 1]]], ["in", ["get", "vt_code"], ["literal", [110, 120, 130, 140, 210, 220, 311, 312, 314, 315, 316, 321, 322, 323, 331, 332, 333, 334, 341, 342, 343, 344, 345, 346, 347, 348, 351, 352, 411, 412, 421, 422, 431, 432, 441, 511, 521, 531, 532, 634, 651, 800, 810, 820, 822, 830, 831, 832, 840, 841, 842, 843, 850, 880, 881, 885, 889, 2943, 2944]]], ["any", ["any", ["==", ["get", "vt_arrng"], 1], ["==", ["get", "vt_arrng"], 3]], ["!", ["has", "vt_arrng"]]]], 17, ["all", ["==", ["geometry-type"], "Point"], ["in", ["get", "vt_flag17"], ["literal", [1, 2]]], ["in", ["get", "vt_code"], ["literal", [110, 120, 130, 140, 210, 220, 311, 312, 314, 315, 316, 321, 322, 323, 331, 332, 333, 334, 341, 342, 343, 344, 345, 346, 347, 348, 351, 352, 411, 412, 421, 422, 431, 432, 441, 511, 521, 531, 532, 634, 651, 800, 810, 820, 822, 830, 831, 832, 840, 841, 842, 843, 850, 880, 881, 885, 889, 2943, 2944]]], ["any", ["any", ["==", ["get", "vt_arrng"], 1], ["==", ["get", "vt_arrng"], 3]], ["!", ["has", "vt_arrng"]]]]];
  // index.html sets data-theme before the page is drawn (dark by default).
  function themeNow() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }
  var MAJOR = ['match', ['get', 'vt_rdctg'], ['国道', '都道府県道', '高速自動車国道等'], true, false];
  function basePaint(c) {
    return {
      bg: { 'background-color': c.bg },
      water: { 'fill-color': c.water },
      buildings: { 'fill-color': c.building },
      'roads-minor': { 'line-color': c.minor },
      'roads-major': { 'line-color': c.major },
      rail: { 'line-color': c.rail },
      flood: { 'raster-opacity': c.flood },
      labels: { 'text-color': c.label, 'text-halo-color': c.halo },
      // The app's own lines (added on load) against the base map.
      halo: { 'line-color': c.current },
      // The way around by car (first check) and on foot (additional check).
      'route-line': { 'line-color': ['match', ['get', 'mode'], 'drive', c.drive, c.route] },
      'shelter-line': { 'line-color': c.shelter },
    };
  }
  function style() {
    var c = PALETTE[themeNow()];
    var paint = basePaint(c);
    var width = function (minor, major) {
      return ['interpolate', ['exponential', 1.6], ['zoom'], 12, ['case', MAJOR, major[0], minor[0]], 18, ['case', MAJOR, major[1], minor[1]]];
    };
    return {
      version: 8,
      glyphs: 'https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf',
      sources: {
        gsi: {
          type: 'vector',
          tiles: [window.pmtiles
            ? 'pmtiles://https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/optimal_bvmap-v1.pmtiles/{z}/{x}/{y}'
            : 'https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf'],
          minzoom: 4, maxzoom: 16,
          attribution: '<a href="https://github.com/gsi-cyberjapan/optimal_bvmap">国土地理院最適化ベクトルタイル</a>',
        },
        flood: { type: 'raster', tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 2, maxzoom: 17, attribution: '<a href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html">「ハザードマップポータルサイト」</a>洪水浸水想定区域' },
      },
      layers: [
        { id: 'bg', type: 'background', paint: paint.bg },
        { id: 'water', type: 'fill', source: 'gsi', 'source-layer': 'WA', paint: paint.water },
        { id: 'buildings', type: 'fill', source: 'gsi', 'source-layer': 'BldA', minzoom: 14, paint: paint.buildings },
        // The flood zones under the streets, so the streets stay readable in them.
        { id: 'flood', type: 'raster', source: 'flood', paint: paint.flood },
        { id: 'roads-minor', type: 'line', source: 'gsi', 'source-layer': 'RdCL', filter: ['!', MAJOR], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: Object.assign({ 'line-width': width([0.5, 6], [1, 10]) }, paint['roads-minor']) },
        { id: 'roads-major', type: 'line', source: 'gsi', 'source-layer': 'RdCL', filter: MAJOR, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: Object.assign({ 'line-width': width([0.5, 6], [1.5, 14]) }, paint['roads-major']) },
        // Surface railways only: subways and tunnels are left out, as in GSI's own style.
        { id: 'rail', type: 'line', source: 'gsi', 'source-layer': 'RailCL', filter: ['!', ['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '地下', '雪覆い']]]], paint: Object.assign({ 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 18, 3] }, paint.rail) },
        { id: 'labels', type: 'symbol', source: 'gsi', 'source-layer': 'Anno', filter: LABEL_FILTER, layout: { 'text-field': ['get', 'vt_text'], 'text-font': ['NotoSansJP-Regular'], 'text-size': 11, 'text-max-width': 8 }, paint: Object.assign({ 'text-halo-width': 1.4 }, paint.labels) },
      ],
    };
  }
  // The base map and the app's lines follow the page's theme switch.
  function applyTheme(m) {
    if (!m) return;
    // Before the style is there (the first moments), once it is.
    if (!m.getLayer('bg')) { m.once('styledata', function () { applyTheme(m); }); return; }
    var paint = basePaint(PALETTE[themeNow()]);
    Object.keys(paint).forEach(function (id) {
      if (!m.getLayer(id)) return;
      Object.keys(paint[id]).forEach(function (k) { m.setPaintProperty(id, k, paint[id][k]); });
    });
  }

  if (window.pmtiles && window.maplibregl) maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);

  function makeMap() {
    var m = new maplibregl.Map({ container: 'map', style: style(), center: CENTER, zoom: 13.4, attributionControl: { compact: true }, cooperativeGestures: true });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', function () {
      // The attribution starts folded: the (i) button opens it.
      var attrib = m.getContainer().querySelector('.maplibregl-ctrl-attrib');
      if (attrib) { attrib.classList.remove('maplibregl-compact-show'); attrib.removeAttribute('open'); }
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
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 4, 'line-dasharray': [2, 1.5] } }, 'halo');
      m.addLayer({ id: 'shelter-line', type: 'line', source: 'shelter', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#1E6B48', 'line-width': 3.5, 'line-dasharray': [0.5, 2] } });
      // Their colours for the current theme.
      applyTheme(m);
      m.demoReady = true;
      if (current && current.last && current.shown >= 3) {
        showShelter((current.last.facts || []).concat(current.last.evacuation ? current.last.evacuation.facts || [] : []));
        // The route of the step on screen: by car in step 2, on foot from step 3 on.
        if (step === 'decide') showRoute(current.last.facts || [], 'drive');
        else if (current.last.evacuation && (step === 'check' || step === 'result')) showRoute(current.last.evacuation.facts || []);
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
      return { type: 'Feature', geometry: r.location, properties: { id: r.id, outcome: outcomeOf(src), published: src.published === true, current: !!mine } };
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
    if (map && map.demoReady) map.getSource('shelter').setData({ type: 'FeatureCollection', features: [] });
  }

  function clearRoute() {
    if (routeMarker) { routeMarker.remove(); routeMarker = null; }
    if (map && map.demoReady) map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
  }

  /** Headquarters sees the report, its evacuation site and the way around at once. */
  function fitMapChecks() {
    if (view !== 'hq') return;
    var ps = [];
    [shelterMarker, routeMarker].forEach(function (m) { if (m && m.demoLine) ps = ps.concat(m.demoLine); });
    if (!ps.length) return;
    var b = ps.reduce(function (acc, p) { return [[Math.min(acc[0][0], p[0]), Math.min(acc[0][1], p[1])], [Math.max(acc[1][0], p[0]), Math.max(acc[1][1], p[1])]]; }, [ps[0], ps[0]]);
    // Room at the sides for the labels (centred on their points); a small map keeps a third of its width for the checks.
    var side = Math.min(125, Math.round(map.getContainer().clientWidth / 3));
    map.fitBounds(b, { padding: { top: 60, bottom: 40, left: side, right: side }, maxZoom: 15.5 });
  }

  /** A new report, or none: its map checks go. */
  function clearMapChecks() {
    clearShelter();
    clearRoute();
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
        // A number that does not end is not an encoded polyline.
        if (b >= 32) return null;
        d[k] = result & 1 ? ~(result >> 1) : result >> 1;
      }
      lat += d[0];
      lon += d[1];
      out.push([lon / factor, lat / factor]);
    }
    return out.length >= 2 ? out : null;
  }

  /** The way around of a detour fact on the map: `walk` (the additional check, default) or `drive` (the first check). */
  function showRoute(facts, name) {
    name = name || 'walk';
    var f = facts.filter(function (x) { return x.name === name && !x.missing && typeof x.values.route === 'string' && typeof x.values.extra_m === 'number'; })[0];
    if (!map || !map.demoReady || !current) return;
    if (!f) {
      // The additional check came without a way around on foot: the car's way around (step 2's) goes too.
      if (name === 'walk' && current.routeShown && current.routeShown.indexOf('|drive|') > 0) {
        clearRoute();
        current.routeShown = null;
      }
      return;
    }
    var key = current.id + '|' + name + '|' + f.values.route;
    if (current.routeShown === key) return;
    // Decoded once per value, also when it is refused. Pointsman keeps at most
    // 6,000 characters; anything over 20,000 is not decoded at all.
    current.routeShown = key;
    var line = f.values.route.length <= 20000 ? decodePolyline(f.values.route, 6) : null;
    // A route far from Tokyo is not this one: drawn only inside the demo area, with a margin.
    if (!line || !line.every(function (p) { return p[0] > 139.6 && p[0] < 139.9 && p[1] > 35.6 && p[1] < 35.8; })) {
      clearRoute();
      return;
    }
    map.getSource('route').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: { mode: name } }] });
    if (routeMarker) routeMarker.remove();
    var label = name === 'drive' ? 'fCarMap' : 'fRouteMap';
    var node = el('div', { class: 'route-pin' + (name === 'drive' ? ' car' : '') }, [el('span', { class: 'name', text: t(label)(f.values.extra_m) })]);
    routeMarker = new maplibregl.Marker({ element: node, anchor: 'center' }).setLngLat(line[Math.floor(line.length / 2)]).addTo(map);
    routeMarker.demoFact = f.values;
    routeMarker.demoLabel = label;
    setShelterVisible();
    routeMarker.demoLine = line;
    fitMapChecks();
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
      shelterMarker.demoLine = [best.from, best.at];
      fitMapChecks();
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
    if (routeMarker) routeMarker.getElement().querySelector('.name').textContent = t(routeMarker.demoLabel || 'fRouteMap')(routeMarker.demoFact.extra_m);
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
    applyTheme(map);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
  $('how-toggle').addEventListener('click', function () { setHow($('how').hidden); });
  $('activity-toggle').addEventListener('click', function () { setActivity($('activity').hidden); });
  $('activity-close').addEventListener('click', function () { setActivity(false); $('activity-toggle').focus(); });
  $('how-close').addEventListener('click', function () { setHow(false); });
  $('how-open').addEventListener('click', function () { setHow(true); });
  $('again').addEventListener('click', function () {
    if (current) { clearTimeout(current.poll); clearInterval(current.reveal); }
    current = null;
    clearMapChecks();
    renderDev();
    setView('hq');
    setStep('pick', true);
    updateMap();
  });
  $('dev-toggle').addEventListener('click', function () { setDev(!devOn); });
  $('dev-close').addEventListener('click', function () { setDev(false); $('dev-toggle').focus(); });
  document.addEventListener('mouseover', devPoint);
  document.addEventListener('focusin', devPoint);
  // A click on a step on the page scrolls its first event into view.
  $('step-decide').addEventListener('click', devScroll);
  $('step-result').addEventListener('click', devScroll);
  $('step-check').addEventListener('click', devScroll);
  function devScroll(e) {
    if (!devOn) return;
    var n = e.target.closest('[data-dev]');
    var row = n && document.querySelector('#dev .ev[data-dev="' + n.getAttribute('data-dev') + '"]');
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('view-hq').addEventListener('click', function () { setView('hq'); });
  $('view-res').addEventListener('click', function () { setView('res'); });

  // The developer view starts below the sticky header, whatever its height.
  function headerHeight() { document.documentElement.style.setProperty('--top-h', document.querySelector('.top').offsetHeight + 'px'); }
  window.addEventListener('resize', headerHeight);
  // Also when the header wraps differently, for example after a language switch.
  if (window.ResizeObserver) new ResizeObserver(headerHeight).observe(document.querySelector('.top'));
  applyLang();
  headerHeight();
  // On narrow screens the drawer covers the page: it opens only when asked.
  setDev(devOn && window.matchMedia('(min-width: 1100px)').matches, false);
  setStep('pick');
  if (window.maplibregl) map = makeMap();

  loadConfig();
  loadReports();
  loadPending();
  setInterval(function () { loadReports(); loadPending(); }, 8000);
})();
