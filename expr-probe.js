(async () => {
  const out = {};
  const raw = [...document.querySelectorAll('script')].map(s => s.textContent || '').join('\n');
  out.scriptTotal = raw.length;
  let flight = '';
  const re = /self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\]\)/g;
  let m;
  while ((m = re.exec(raw))) { try { flight += JSON.parse(m[1]); } catch (e) {} }
  out.flightLen = flight.length;
  out.markers = ['@name', 'commentTable', '"code"', 'code:', '.twe-'].map(function (k) { return { k: k, idx: flight.indexOf(k) }; });
  const ci = flight.indexOf('"code"');
  if (ci >= 0) out.snippet = flight.slice(Math.max(0, ci - 150), ci + 250);
  const c2 = flight.indexOf('code:');
  if (c2 >= 0) out.snippet2 = flight.slice(Math.max(0, c2 - 150), c2 + 250);
  return JSON.stringify(out);
})()
