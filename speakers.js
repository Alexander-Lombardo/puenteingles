/* Dialogue speaker -> voice gender ("f"/"m") per language. Used by app.js to pick
   the neural voice slot for each speaker and by tools/dump-strings.js / gen-audio.py
   to synthesize the matching MP3s. Standalone English app. Unknown names alternate f/m by appearance. */
window.SPEAKERS = {
  "en": {
    "Tourist": "f",
    "Local": "m",
    "Visitor": "f",
    "Clerk": "m",
    "Emma": "f",
    "Liam": "m",
    "Sara": "f",
    "Tom": "m",
    "Noah": "m",
    "Mia": "f",
    "Ava": "f",
    "Leo": "m",
    "Sam": "m",
    "Ben": "m",
    "Seller": "f",
    "Jack": "m",
    "Lucy": "f",
    "Mark": "m",
    "Olivia": "f",
    "Daniel": "m",
    "Kate": "f",
    "Sophie": "f",
    "Adam": "m",
    "Nora": "f",
    "Ed": "m",
    "Waiter": "m",
    "Grace": "f",
    "Max": "m",
    "Holly": "f",
    "Ryan": "m",
    "Zoe": "f",
    "Man": "m",
    "Ana": "f",
    "Mum": "f",
    "Nina": "f",
    "Paul": "m",
    "Eva": "f",
    "Jess": "f",
    "Dan": "m",
    "Coach": "m",
    "Liz": "f",
    "Joe": "m",
    "Amy": "f",
    "Kim": "f",
    "Raj": "m",
    "Pia": "f",
    "Bea": "f",
    "Ian": "m",
    "Assistant": "f",
    "Mara": "f",
    "Shopper": "m",
    "Doctor": "f",
    "Customer": "f",
    "Pharmacist": "m",
    "Olga": "f",
    "Marco": "m",
    "Boss": "m",
    "Traveller": "f",
    "Anna": "f",
    "Pablo": "m",
    "Marta": "f",
    "Dad": "m",
    "Tina": "f",
    "Lena": "f",
    "Tara": "f",
    "Guide": "m",
    "Reporter": "f",
    "Cara": "f",
    "Host": "m",
    "Dana": "f",
    "Omar": "m",
    "Hana": "f",
    "Expert": "f",
    "Noor": "f",
    "Lia": "f",
    "Narrator": "m",
    "Informal (to a friend)": "f",
    "Formal (to a manager)": "m",
    "Manager": "f",
    "Employee": "m",
    "Caller": "f",
    "Officer": "m",
    "Editor": "f",
    "Theo": "m",
    "Ravi": "m",
    "Writer": "m",
    "Lina": "f",
    "Chair": "f",
    "Priya": "f",
    "Tutor": "m",
    "Léa": "f",
    "Sue": "f",
    "Prof": "m",
    "Iris": "f",
    "Teacher": "f",
    "Yuki": "f",
    "Cole": "m",
    "Bruno": "m",
    "Maya": "f",
    "Nadia": "f",
    "Naomi (London)": "f",
    "Brad (Chicago)": "m",
    "Megan (Bristol)": "f",
    "Dale (Denver)": "m",
    "Priya (project lead)": "f",
    "Marcus (engineering)": "m",
    "Lena (manager)": "f",
    "Tomas (analyst)": "m",
    "Mentor": "f",
    "Student": "m",
    "Speaker": "f",
    "Beth": "f",
    "Lucia": "f",
    "Owen": "m",
    "Elena": "f",
    "Sofia": "f"
  }
};

/* Shared by the browser apps and tools/dump-strings.js — keep identical in
   site/speakers.js and English/output/speakers.js. */
window.assignVoices = function (lines, genderMap) {
  // lines: [{sp, ...}] in dialogue order. Returns {speaker: "f1"|"m1"|"f2"|"m2"}.
  // Gender comes from genderMap[name] (base name before any " (…)"); unknown
  // speakers alternate f, m, f, m… by first appearance. Within a gender, the
  // first speaker gets slot 1, the second slot 2, further ones cycle 1, 2, …
  genderMap = genderMap || {};
  var out = {}, used = { f: 0, m: 0 }, unknownCount = 0;
  (lines || []).forEach(function (d) {
    var sp = d && d.sp;
    if (!sp || out[sp]) return;
    var base = String(sp).replace(/\s*\(.*\)\s*$/, "").trim();
    var g = genderMap[sp] || genderMap[base];
    if (g !== "f" && g !== "m") { g = unknownCount % 2 === 0 ? "f" : "m"; unknownCount++; }
    out[sp] = g + ((used[g] % 2) + 1);
    used[g]++;
  });
  return out;
};
