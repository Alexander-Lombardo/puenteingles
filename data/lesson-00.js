window.COURSE.lessons.push({
  id: "00",
  slug: "alphabet-sounds",
  unit: "A1 · Unidad 1 — Primeros pasos",
  title: "The Alphabet, Sounds & Survival Phrases",
  level: "A1",
  time: "~45 min",
  objectives: [
    "Reconocer y deletrear con el alfabeto inglés (las 26 letras).",
    "Producir los sonidos del inglés que no existen en español (th, h, v, sh).",
    "Usar frases de supervivencia para pedir ayuda y ser cortés.",
    "Entender que la escritura y la pronunciación del inglés no siempre coinciden.",
    "Pedir que te repitan o te traduzcan algo."
  ],
  vocab: [
    { en: "hello", say: "JÉ-lou", es: "hola" },
    { en: "goodbye", say: "gud-BÁI", es: "adiós" },
    { en: "please", say: "plíis", es: "por favor" },
    { en: "thank you", say: "ZÉNK iu", es: "gracias" },
    { en: "yes / no", say: "yes / nóu", es: "sí / no" },
    { en: "excuse me", say: "eks-KIÚS mi", es: "disculpe / perdón" },
    { en: "sorry", say: "SÓ-ri", es: "lo siento" },
    { en: "I don't understand", say: "ai dóunt an-der-STÁND", es: "no entiendo" },
    { en: "Do you speak Spanish?", say: "du iu spíik SPÁ-nish", es: "¿Hablas español?" },
    { en: "How do you say…?", say: "jáo du iu séi", es: "¿Cómo se dice…?" },
    { en: "Can you repeat that?", say: "kan iu ri-PÍIT dat", es: "¿Puedes repetir eso?" },
    { en: "water", say: "UÓ-ter", es: "agua" },
    { en: "the bathroom", say: "de BÁZ-rum", es: "el baño" },
    { en: "help", say: "jelp", es: "ayuda / socorro" },
    { en: "My name is…", say: "mai néim is", es: "Me llamo…" }
  ],
  dialogue: [
    { sp: "Tourist", en: "Excuse me, do you speak Spanish?", es: "Disculpe, ¿habla español?" },
    { sp: "Local", en: "A little. How can I help you?", es: "Un poco. ¿Cómo puedo ayudarle?" },
    { sp: "Tourist", en: "Where is the bathroom, please?", es: "¿Dónde está el baño, por favor?" },
    { sp: "Local", en: "It's over there, on the right.", es: "Está allá, a la derecha." },
    { sp: "Tourist", en: "Sorry, can you repeat that?", es: "Perdón, ¿puede repetir eso?" },
    { sp: "Local", en: "On the right. Next to the door.", es: "A la derecha. Junto a la puerta." },
    { sp: "Tourist", en: "Thank you very much!", es: "¡Muchas gracias!" },
    { sp: "Local", en: "You're welcome. Goodbye!", es: "De nada. ¡Adiós!" }
  ],
  dialogueQuiz: [
    { q: "¿Qué pregunta el turista primero?", choices: ["Si el local habla español", "Dónde está la estación", "Cuánto cuesta el baño"], answer: "Si el local habla español" },
    { q: "¿Cuánto español habla el local?", choices: ["Nada", "Un poco", "Muy bien"], answer: "Un poco" },
    { q: "¿Qué busca el turista?", choices: ["El baño", "La salida", "Un restaurante"], answer: "El baño" },
    { q: "¿Dónde está?", choices: ["A la izquierda", "A la derecha, junto a la puerta", "Arriba, al fondo"], answer: "A la derecha, junto a la puerta" },
    { q: "¿Por qué pide el turista que repita?", choices: ["No entendió la respuesta", "No oyó por el ruido", "Quiere otra dirección"], answer: "No entendió la respuesta" }
  ],
  reading: null,
  grammarHTML:
    "<h3>El alfabeto inglés (26 letras)</h3>" +
    "<p>Antes de la forma, el <strong>significado</strong>: deletrear sirve para dar tu nombre, un correo o una dirección. Estas son las letras y cómo suena su <em>nombre</em> (no su sonido dentro de una palabra):</p>" +
    "<table><tr><th>Letra</th><th>Se dice</th><th>Letra</th><th>Se dice</th></tr>" +
    "<tr><td>A</td><td>ei</td><td>N</td><td>en</td></tr>" +
    "<tr><td>B</td><td>bi</td><td>O</td><td>ou</td></tr>" +
    "<tr><td>C</td><td>si</td><td>P</td><td>pi</td></tr>" +
    "<tr><td>D</td><td>di</td><td>Q</td><td>kiu</td></tr>" +
    "<tr><td>E</td><td>i</td><td>R</td><td>ar</td></tr>" +
    "<tr><td>F</td><td>ef</td><td>S</td><td>es</td></tr>" +
    "<tr><td>G</td><td>yi</td><td>T</td><td>ti</td></tr>" +
    "<tr><td>H</td><td>eich</td><td>U</td><td>iu</td></tr>" +
    "<tr><td>I</td><td>ai</td><td>V</td><td>vi</td></tr>" +
    "<tr><td>J</td><td>yei</td><td>W</td><td>dábliu</td></tr>" +
    "<tr><td>K</td><td>kei</td><td>X</td><td>eks</td></tr>" +
    "<tr><td>L</td><td>el</td><td>Y</td><td>uái</td></tr>" +
    "<tr><td>M</td><td>em</td><td>Z</td><td>zi (EE.UU.) / zed (R.U.)</td></tr></table>" +
    "<h3>La escritura no es la pronunciación</h3>" +
    "<p>En español lees casi como escribes; en inglés, no. La misma letra puede sonar de varias formas: <em>a</em> en <em>cat</em>, <em>name</em> y <em>car</em> suena distinta cada vez. Por eso este curso añade una columna <strong>“cómo se dice”</strong> con la pronunciación aproximada.</p>",
  pronTipHTML:
    "<h3>Sonidos nuevos para hispanohablantes</h3>" +
    "<p><strong>La “th”</strong> no existe en español. Hay dos: una suave como en <em>think</em> (saca un poco la lengua entre los dientes, sin voz) y una sonora como en <em>this</em> (igual, pero con voz). No la cambies por <em>s</em> ni por <em>d</em>.</p>" +
    "<p><strong>La “h” sí suena</strong> y es aspirada: <em>hello, help, house</em>. No es muda como en español.</p>" +
    "<p><strong>“v” vs “b”:</strong> en inglés se distinguen. La <em>v</em> se hace con los dientes sobre el labio inferior: <em>very</em>, no “bery”.</p>" +
    "<p><strong>La “sh”</strong> (<em>she, fish</em>) es un sonido suave, distinto de <em>ch</em>.</p>" +
    "<p><strong>Comprueba el concepto:</strong> ¿La “h” de <em>hello</em> es muda? (No, suena.) ¿Cuántos sonidos “th” hay? (Dos.)</p>",
  discussion: null,
  flashcards: null,
  exercises: [
    { type: "match", instructions: "Empareja la frase en inglés con su significado.", pairs: [
      { en: "thank you", es: "gracias" },
      { en: "please", es: "por favor" },
      { en: "sorry", es: "lo siento" },
      { en: "help", es: "ayuda" },
      { en: "goodbye", es: "adiós" }
    ] },
    { type: "listen", instructions: "Escribe la frase que oyes.", audio: "I don't understand", answers: ["i don't understand", "i dont understand"] },
    { type: "mc", instructions: "¿Cómo pides algo con cortesía?", prompt: "Quieres un vaso de agua. Dices: «Water, ___».", choices: ["please", "sorry", "goodbye"], answer: "please" },
    { type: "fill", instructions: "Completa la frase para pedir ayuda con el idioma.", before: "Do you", after: "Spanish?", cue: "hablar", answers: ["speak"] },
    { type: "translate", instructions: "Traduce al inglés: «Disculpe».", prompt: "Disculpe / perdón (para llamar la atención)", answers: ["excuse me"] },
    { type: "order", instructions: "Ordena las palabras: «Me llamo Ana».", tokens: ["My", "name", "is", "Ana."], answers: ["My name is Ana."] },
    { type: "listen-dialogue", instructions: "Escucha la conversación en una recepción y responde.",
      lines: [
        { sp: "Visitor", en: "Hello! Do you speak Spanish?", es: "¡Hola! ¿Habla español?" },
        { sp: "Clerk", en: "A little. How can I help you?", es: "Un poco. ¿Cómo puedo ayudarle?" },
        { sp: "Visitor", en: "Where is the bathroom, please?", es: "¿Dónde está el baño, por favor?" },
        { sp: "Clerk", en: "It's on the right, next to the door.", es: "Está a la derecha, junto a la puerta." },
        { sp: "Visitor", en: "Thank you very much!", es: "¡Muchas gracias!" }
      ],
      questions: [
        { q: "¿Qué busca el visitante?", choices: ["The bathroom", "The exit", "A taxi"], answer: "The bathroom" },
        { q: "¿Dónde está?", choices: ["On the left", "On the right", "Upstairs"], answer: "On the right" },
        { q: "¿Cuánto español habla el recepcionista?", choices: ["A little", "Nothing", "Perfectly"], answer: "A little" }
      ] }
  ],
  cultureHTML:
    "<p>En inglés, <strong>“please”</strong> y <strong>“thank you”</strong> se usan muchísimo, mucho más que «por favor» y «gracias» en muchos países hispanohablantes. Pedir algo sin <em>please</em> puede sonar brusco.</p>" +
    "<p><strong>“Sorry”</strong> y <strong>“excuse me”</strong> no son lo mismo: <em>excuse me</em> sirve para llamar la atención o pasar entre la gente; <em>sorry</em> es para disculparse por algo. Los británicos, en especial, dicen <em>sorry</em> con mucha frecuencia.</p>"
});
