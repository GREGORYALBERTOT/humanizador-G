// === UTILIDAD: Logger interno (opcional) ===
const logger = (mensaje, nivel = 'info') => {
    if (localStorage.getItem('modoDebug') === 'true') {
        console[nivel](mensaje);
    }
};

// === UTILIDAD: Reemplazo de sinónimos ===
const Sinonimos = (() => {
    const sinonimos = {
        "importante": ["crucial", "relevante", "significativo"],
        "personas": ["individuos", "seres humanos", "ciudadanos"],
        "problema": ["inconveniente", "obstáculo", "dificultad"],
        "decisión": ["resolución", "determinación", "elección"],
        "acción": ["medida", "intervención", "comportamiento"]
    };

    const reemplazar = texto => {
        Object.entries(sinonimos).forEach(([palabra, opciones]) => {
            const regex = new RegExp(`\b${palabra}\b`, 'gi');
            const opcion = opciones[Math.floor(Math.random() * opciones.length)];
            texto = texto.replace(regex, opcion);
        });
        return texto;
    };

    return { reemplazar };
})();

// === FUNCIONALIDAD: Detección de idioma básico ===
const detectarIdioma = texto => {
    const es = /\b(el|la|los|las|un|una|por|para|con)\b/i.test(texto);
    const en = /\b(the|and|or|with|for|is|this|that)\b/i.test(texto);
    if (es && !en) return 'es';
    if (en && !es) return 'en';
    return 'es'; // default
};

// === MEJORA: Revisión de fecha por día exacto ===
const esMismoDia = (d1, d2) => d1.toDateString() === d2.toDateString();

// === MODO OSCURO AUTOMÁTICO SEGÚN SISTEMA ===
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add("dark-mode");
}

// =====================================
//           humanizador.js
// =====================================

// === MÓDULO DE UTILIDADES BÁSICAS ===
// Proporciona funciones de utilidad generales como obtener elementos DOM,
// seleccionar frases aleatorias y realizar parafraseo ligero.
const Utils = (() => {
    // Retorna el elemento DOM con el ID especificado.
    const obtenerElemento = id => document.querySelector(`#${id}`);

    // Selecciona una frase aleatoria de un array, evitando repetir las usadas si es posible.
    const obtenerFraseAleatoria = (frases, usadas) => {
        const disponibles = frases.filter(f => !usadas.has(f));
        const fuente = disponibles.length > 0 ? disponibles : frases; // Si no hay disponibles, reusa todas
        const seleccion = fuente[Math.floor(Math.random() * fuente.length)];
        usadas.add(seleccion);
        return seleccion;
    };

    // Mezcla palabras dentro de una oración para cambiar su estructura.
    const mezclarPalabras = oracion => {
        const palabras = oracion.split(" ");
        if (palabras.length < 6) return oracion; // No mezclar frases muy cortas
        const indice = Math.floor(Math.random() * (palabras.length - 3)) + 1; // Asegura al menos 1 palabra antes y 2 después
        const parte1 = palabras.slice(0, indice).join(" ");
        const parte2 = palabras.slice(indice).join(" ");
        return `${parte2}, ${parte1}`; // Intercambia las partes
    };

    // Realiza un parafraseo ligero reemplazando palabras o frases según una lista.
    const parafrasearLigeramente = (oracion, reemplazos) => {
        let resultado = oracion;
        reemplazos.forEach(({ original, nuevo }) => {
            const regex = new RegExp(original, "gi"); // 'gi' para global e insensible a mayúsculas/minúsculas
            resultado = resultado.replace(regex, nuevo);
        });
        return resultado;
    };

    return {
        obtenerElemento,
        obtenerFraseAleatoria,
        mezclarPalabras,
        parafrasearLigeramente
    };
})();

// === MÓDULO DE MANEJO DE MENSAJES/NOTIFICACIONES ===
// Gestiona la visualización de mensajes no intrusivos al usuario.
const Notificaciones = (() => {
    let timeoutId; // Para limpiar timeouts de mensajes anteriores

    // Muestra un mensaje en la interfaz. Requiere CSS para `.notificacion`.
    const mostrarMensaje = (mensaje, tipo = "info", duracion = 3000) => {
        const contenedor = Utils.obtenerElemento('notificacionContainer');
        if (!contenedor) {
            console.error("Contenedor de notificaciones no encontrado.");
            return;
        }

        const mensajeElemento = document.createElement('div');
        mensajeElemento.className = `notificacion ${tipo}`;
        mensajeElemento.innerText = mensaje;

        // Limpiar mensaje anterior si existe
        if (contenedor.firstChild) {
            contenedor.removeChild(contenedor.firstChild);
        }
        contenedor.appendChild(mensajeElemento);

        // Forzar reflow para que la animación CSS se reinicie
        void mensajeElemento.offsetWidth;
        mensajeElemento.classList.add('show');

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            mensajeElemento.classList.remove('show');
            mensajeElemento.addEventListener('transitionend', () => {
                if (mensajeElemento.parentNode) { // Verificar si el elemento todavía tiene un padre
                    mensajeElemento.parentNode.removeChild(mensajeElemento);
                }
            }, { once: true }); // Eliminar listener después de la primera ejecución
        }, duracion);
    };

    return {
        mostrarMensaje
    };
})();

// === MÓDULO DE TONOS ===
// Contiene la lógica para aplicar diferentes tonos al texto.
const Tonos = (() => {
    // Genera un tono conversacional añadiendo adiciones, exclamaciones o cambiando mayúsculas.
    const generarTonoConversacional = (oracion, adiciones, exclamacionChar) => {
        let resultado = oracion;
        const rand = Math.random();
        if (rand < 0.3) { // 30% de probabilidad de añadir adición
            resultado += adiciones;
        } else if (rand < 0.6) { // 30% de probabilidad de exclamar (acumulado 0.3-0.6)
            resultado = exclamacionChar + resultado + exclamacionChar;
        } else if (rand < 0.9 && resultado.split(" ").length > 3) { // 30% de probabilidad de cambiar mayúsculas (acumulado 0.6-0.9)
            const palabras = resultado.split(" ");
            const indice = Math.floor(Math.random() * (palabras.length - 1));
            palabras[indice] = palabras[indice].toLowerCase(); // Una palabra en minúsculas
            resultado = palabras.join(" ");
        }
        return resultado;
    };

    // Aplica un tono formal reemplazando ciertas palabras por otras más formales.
    const generarTonoFormal = (oracion, reemplazosFormales) => {
        let resultado = oracion;
        reemplazosFormales.forEach(({ original, nuevo }) => {
            const regex = new RegExp(original, "gi");
            resultado = resultado.replace(regex, nuevo);
        });
        return resultado;
    };

    return {
        generarTonoConversacional,
        generarTonoFormal
    };
})();

// === MÓDULO DE LÍMITE DE INTENTOS ===
// Gestiona el número de humanizaciones restantes para usuarios no logueados.
const LimiteIntentos = (() => {
    const MAX_INTENTOS = 5;
    let intentosRestantes = MAX_INTENTOS;
    let fechaUltimoReinicio = null;

    // Guarda el estado actual de los intentos en localStorage.
    const guardarEstadoIntentos = () => {
        localStorage.setItem('intentosHumanizador', JSON.stringify({
            restantes: intentosRestantes,
            fechaReinicio: fechaUltimoReinicio ? fechaUltimoReinicio.toISOString() : null
        }));
    };

    // Carga el estado de los intentos desde localStorage y reinicia si ha pasado un día.
    const cargarEstadoIntentos = () => {
        const estadoGuardado = localStorage.getItem('intentosHumanizador');
        if (estadoGuardado) {
            const estado = JSON.parse(estadoGuardado);
            intentosRestantes = estado.restantes;
            fechaUltimoReinicio = estado.fechaReinicio ? new Date(estado.fechaReinicio) : null;

            const ahora = new Date();
            if (fechaUltimoReinicio && (ahora.getTime() - fechaUltimoReinicio.getTime()) >= (24 * 60 * 60 * 1000)) {
                resetIntentos(); // Reiniciar si ha pasado un día
            }
        }
    };

    // Resetea los intentos al máximo y limpia la fecha de reinicio.
    const resetIntentos = () => {
        intentosRestantes = MAX_INTENTOS;
        fechaUltimoReinicio = null;
        guardarEstadoIntentos();
        actualizarContadorIntentosUI();
    };

    // Devuelve true si el usuario puede humanizar (logueado o con intentos restantes).
    const puedeHumanizar = (isLoggedIn) => {
        if (isLoggedIn) return true; // Usuarios logueados no tienen límite
        return intentosRestantes > 0;
    };

    // Consume un intento si el usuario no está logueado.
    const consumirIntento = (isLoggedIn) => {
        if (!isLoggedIn) {
            intentosRestantes--;
            if (intentosRestantes < MAX_INTENTOS && !fechaUltimoReinicio) {
                fechaUltimoReinicio = new Date(); // Establecer la fecha de reinicio la primera vez que se gasta un intento
            }
            guardarEstadoIntentos();
        }
        actualizarContadorIntentosUI();
    };

    // Actualiza el texto del contador de intentos en la UI.
    const actualizarContadorIntentosUI = () => {
        // Necesitamos el módulo i18n para obtener los textos traducidos.
        // Esto se manejará en la inicialización o a través de una inyección de dependencia si fuera más complejo.
        // Por ahora, asumimos que i18n.getTextos() está disponible globalmente o se pasa.
        const textos = i18n.getTextos();
        Utils.obtenerElemento('contadorIntentos').innerText = `${textos.intentosRestantes}: ${intentosRestantes}`;
    };

    return {
        cargarEstadoIntentos,
        puedeHumanizar,
        consumirIntento,
        resetIntentos,
        actualizarContadorIntentosUI,
        MAX_INTENTOS // Exportar para mensajes de alerta
    };
})();

// === MÓDULO DE AUTENTICACIÓN ===
// Gestiona el login, registro y cierre de sesión de usuarios.
const Auth = (() => {
    let usuarioLogueado = localStorage.getItem('usuarioActual') || null;
    let esModoRegistro = false;

    // Abre el modal de login/registro.
    const abrirModal = () => {
        Utils.obtenerElemento('loginModal').style.display = 'block';
        Utils.obtenerElemento('username').value = '';
        Utils.obtenerElemento('password').value = '';
        esModoRegistro = false; // Siempre inicia en modo login por defecto
        actualizarModalUI();
    };

    // Cierra el modal de login/registro.
    const cerrarModal = () => {
        Utils.obtenerElemento('loginModal').style.display = 'none';
    };

    // Actualiza el texto del botón de login/logout en la UI.
    const actualizarBotonLoginUI = () => {
        const boton = Utils.obtenerElemento('botonLogin');
        const textos = i18n.getTextos();
        if (usuarioLogueado) {
            boton.innerText = `${textos.cerrarSesion} (${usuarioLogueado})`;
            boton.onclick = cerrarSesion;
        } else {
            boton.innerText = textos.iniciarSesion;
            boton.onclick = abrirModal;
        }
    };

    // Actualiza el contenido del modal de login/registro según el modo actual.
    const actualizarModalUI = () => {
        const textos = i18n.getTextos();
        Utils.obtenerElemento('modalTitulo').innerText = esModoRegistro ? textos.registrarCuenta : textos.iniciarSesion;
        Utils.obtenerElemento('submitAuth').innerText = esModoRegistro ? textos.registrar : textos.entrar;
        Utils.obtenerElemento('linkRegistro').innerText = esModoRegistro ? textos.tienesCuenta : textos.noTienesCuenta;
        // Mostrar planes solo en registro
        if (Utils.obtenerElemento('planesEnRegistro')) {
            Utils.obtenerElemento('planesEnRegistro').style.display = esModoRegistro ? 'block' : 'none';
        }
    };

    // Alterna entre el modo de registro y el modo de login.
    const alternarModoAuth = (event) => {
        event.preventDefault();
        esModoRegistro = !esModoRegistro;
        actualizarModalUI();
    };

    // Maneja el envío del formulario de autenticación (login o registro).
    const manejarAutenticacion = (event) => {
        event.preventDefault();

        const username = Utils.obtenerElemento('username').value.trim();
        const password = Utils.obtenerElemento('password').value.trim();
        const textos = i18n.getTextos();

        if (!username || !password) {
            Notificaciones.mostrarMensaje(textos.alertaCamposVacios, 'warning');
            return;
        }

        let cuentas = JSON.parse(localStorage.getItem('cuentasHumanizador')) || {};

        if (esModoRegistro) {
            if (cuentas[username]) {
                Notificaciones.mostrarMensaje(textos.alertaUsuarioExistente, 'error');
            } else {
                cuentas[username] = password; // En un entorno real, esto sería hasheado
                localStorage.setItem('cuentasHumanizador', JSON.stringify(cuentas));
                Notificaciones.mostrarMensaje(textos.registroExitoso, 'success');
                usuarioLogueado = username;
                localStorage.setItem('usuarioActual', username);
                cerrarModal();
                actualizarBotonLoginUI();
                LimiteIntentos.resetIntentos(); // Reiniciar intentos al registrarse
            }
        } else {
            if (cuentas[username] && cuentas[username] === password) {
                usuarioLogueado = username;
                localStorage.setItem('usuarioActual', username);
                Notificaciones.mostrarMensaje(`${textos.bienvenido} ${username}!`, 'success');
                cerrarModal();
                actualizarBotonLoginUI();
                LimiteIntentos.resetIntentos(); // Reiniciar intentos al iniciar sesión
            } else {
                Notificaciones.mostrarMensaje(textos.credencialesInvalidas, 'error');
            }
        }
    };

    // Cierra la sesión del usuario actual.
    const cerrarSesion = () => {
        const textos = i18n.getTextos();
        if (confirm(textos.confirmarCerrarSesion)) {
            usuarioLogueado = null;
            localStorage.removeItem('usuarioActual');
            actualizarBotonLoginUI();
            Notificaciones.mostrarMensaje(textos.sesionCerrada, 'info');
            LimiteIntentos.resetIntentos(); // Reiniciar intentos al cerrar sesión
        }
    };

    // Retorna el usuario actualmente logueado.
    const getUsuarioLogueado = () => usuarioLogueado;

    return {
        abrirModal,
        cerrarModal,
        actualizarBotonLoginUI,
        actualizarModalUI,
        alternarModoAuth,
        manejarAutenticacion,
        cerrarSesion,
        getUsuarioLogueado
    };
})();

// === MÓDULO DE INTERNACIONALIZACIÓN (i18n) ===
// Gestiona el contenido multi-idioma de la aplicación.
const i18n = (() => {
    const contenidoIdioma = {
        es: {
            tituloApp: "Humanizador G",
            placeholder: "Pega tu texto aquí...",
            labelTono: "Tono del texto:",
            opcionNeutral: "Neutral",
            opcionFormal: "Formal",
            opcionConversacional: "Conversacional",
            botonHumanizar: "Humanizar",
            botonCopiar: "Copiar",
            botonDescargar: "Descargar TXT",
            tituloResultado: "Texto Humanizado",
            botonModoOscuro: "Alternar Modo Oscuro",
            alertaVacio: "Por favor, ingresa un texto.",
            alertaCopiar: "Texto copiado al portapapeles.",
            alertaErrorCopiar: "Error al copiar el texto.",
            alertaHumanizarVacio: "Primero debes humanizar un texto.",
            originalStats: "Palabras originales:",
            humanizedStats: "Palabras humanizadas:",
            labelIdioma: "Idioma:",
            intentosRestantes: "Intentos restantes",
            alertaLimiteIntentos: `Has alcanzado el límite de ${LimiteIntentos.MAX_INTENTOS} humanizaciones diarias. Inicia sesión para más o intenta de nuevo mañana.`,

            iniciarSesion: "Iniciar Sesión",
            cerrarSesion: "Cerrar Sesión",
            modalTitulo: "Iniciar Sesión",
            labelUsername: "Usuario:",
            labelPassword: "Contraseña:",
            entrar: "Entrar",
            registrar: "Registrar",
            noTienesCuenta: "¿No tienes cuenta? Regístrate aquí.",
            tienesCuenta: "¿Ya tienes cuenta? Inicia sesión aquí.",
            registrarCuenta: "Registrar Cuenta",
            alertaCamposVacios: "Por favor, completa ambos campos.",
            alertaUsuarioExistente: "Este usuario ya existe. Intenta con otro o inicia sesión.",
            registroExitoso: "Cuenta creada exitosamente. ¡Bienvenido!",
            credencialesInvalidas: "Usuario o contraseña incorrectos.",
            bienvenido: "Bienvenido/a",
            confirmarCerrarSesion: "¿Estás seguro de que quieres cerrar sesión?",
            sesionCerrada: "Sesión cerrada.",

            frasesRellenoNeutral: ["A decir verdad", "Vale la pena considerar que", "Según lo que se sabe hasta ahora", "Desde un punto de vista práctico", "Si bien es cierto", "Parece relevante señalar que", "Aunque podría discutirse", "En algunos casos se cree que", "No obstante, cabe recordar que", "Con base en algunos datos", "Hay quienes sostienen que", "Desde otra perspectiva", "Según algunas fuentes", "Es debatible, pero", "Muchos piensan que", "A mi parecer", "En lo personal, creo que", "Curiosamente", "Y eso que no es todo", "Sin afán de sonar tajante", "Mucha gente no lo ve así, pero"],
            frasesRellenoConversacional: ["Mira tú por dónde", "Fíjate qué curioso", "Pues bien", "Oye", "¿Sabes qué te digo?", "A ver", "Bueno, bueno", "Anda mira", "Te digo una cosa", "Y es que...", "La verdad sea dicha", "Si me permites la expresión", "Para que te hagas una idea", "En plan...", "¿Me explico?", "No sé si me entiendes", "El caso es que...", "Al final del día", "Vaya tela", "Madre mía"],
            frasesRellenoFormal: ["En efecto", "Cabe señalar que", "Es menester indicar que", "Resulta pertinente destacar que", "Desde esta perspectiva", "En relación con lo anterior", "Por consiguiente", "De acuerdo con lo expuesto", "En virtud de ello", "Es preciso subrayar que", "A mayor abundamiento", "En este sentido", "Consecuentemente", "Así pues", "Por lo tanto", "Se infiere que", "De lo antedicho se desprende que", "En atención a lo cual", "Conviene recordar que", "Es de suma importancia mencionar que"],

            reemplazosLigeros: [
                { original: "\\b(es definida por)\\b", nuevo: "suele considerarse como" },
                { original: "\\b(como)\\b", nuevo: "tal como" },
                { original: "\\b(se reconoce como)\\b", nuevo: "también se ve como" },
                { original: "\\b(han estado presentes)\\b", nuevo: "han tenido presencia" },
                { original: "\\b(a lo largo de la historia)\\b", nuevo: "con el paso del tiempo" },
                { original: "\\b(es difícil de determinar)\\b", nuevo: "no es fácil de precisar" },
                { original: "\\b(de manera consistente)\\b", nuevo: "de forma continua" },
                { original: "\\b(más probabilidades de)\\b", nuevo: "mayor propensión a" },
                { original: "\\b(lo cual)\\b", nuevo: "lo que" },
                { original: "\\b(esto puede)\\b", nuevo: "es posible que esto" },
                { original: "\\b(por ejemplo)\\b", nuevo: "por decir algo" },
                { original: "\\b(en términos generales)\\b", nuevo: "si se mira de forma amplia" },
                { original: "\\b(se puede decir que)\\b", nuevo: "algunos sostienen que" },
                { original: "\\b(es importante destacar)\\b", nuevo: "vale la pena considerar" },
                { original: "\\b(implica)\\b", nuevo: "conlleva" },
                { original: "\\b(decisiones)\\b", nuevo: "resoluciones" },
                { original: "\\b(acciones)\\b", nuevo: "conductas" }
            ],

            reemplazosFormales: [
                { original: "\\b(creo)\\b", nuevo: "considero" },
                { original: "\\b(pienso)\\b", nuevo: "estimo" },
                { original: "\\b(mucha gente)\\b", nuevo: "numerosas personas" },
                { original: "\\b(cosa)\\b", nuevo: "elemento" },
                { original: "\\b(así)\\b", nuevo: "de esta manera" },
                { original: "\\b(pero)\\b", nuevo: "sin embargo" },
                { original: "\\b(y)\\b", nuevo: "además" }
            ],
            conversacionalAdiciones: "¿No crees?",
            conversacionalExclamacionChar: "¡",
        },
        en: {
            tituloApp: "Humanizer G",
            placeholder: "Paste your text here...",
            labelTono: "Text tone:",
            opcionNeutral: "Neutral",
            opcionFormal: "Formal",
            opcionConversacional: "Conversational",
            botonHumanizar: "Humanize",
            botonCopiar: "Copy",
            botonDescargar: "Download TXT",
            tituloResultado: "Humanized Text",
            botonModoOscuro: "Toggle Dark Mode",
            alertaVacio: "Please enter some text.",
            alertaCopiar: "Text copied to clipboard.",
            alertaErrorCopiar: "Error copying text.",
            alertaHumanizarVacio: "You must humanize text first.",
            originalStats: "Original words:",
            humanizedStats: "Humanized words:",
            labelIdioma: "Language:",
            intentosRestantes: "Attempts remaining",
            alertaLimiteIntentos: `You have reached the limit of ${LimiteIntentos.MAX_INTENTOS} daily humanizations. Log in for more or try again tomorrow.`,

            iniciarSesion: "Login",
            cerrarSesion: "Logout",
            modalTitulo: "Login",
            labelUsername: "Username:",
            labelPassword: "Password:",
            entrar: "Enter",
            registrar: "Register",
            noTienesCuenta: "Don't have an account? Register here.",
            tienesCuenta: "Already have an account? Login here.",
            registrarCuenta: "Register Account",
            alertaCamposVacios: "Please fill in both fields.",
            alertaUsuarioExistente: "This username already exists. Try another or log in.",
            registroExitoso: "Account created successfully. Welcome!",
            credencialesInvalidas: "Incorrect username or password.",
            bienvenido: "Welcome",
            confirmarCerrarSesion: "Are you sure you want to log out?",
            sesionCerrada: "Logged out.",

            frasesRellenoNeutral: ["To be honest", "It's worth considering that", "According to current knowledge", "From a practical standpoint", "While it is true", "It seems relevant to point out that", "Although it could be argued", "In some cases it is believed that", "Nevertheless, it's worth remembering that", "Based on some data", "Some people argue that", "From another perspective", "According to some sources", "It's debatable, but", "Many people think that", "In my opinion", "Personally, I believe that", "Curiously enough", "And that's not all", "Without wanting to sound blunt", "Many people don't see it that way, but"],
            frasesRellenoConversacional: ["Well, what do you know", "Isn't that interesting", "So then", "Hey", "You know what I mean?", "Let's see", "Well, well", "Oh, look", "I'll tell you something", "And it's just that...", "Truth be told", "If you'll allow me the expression", "To give you an idea", "Like...", "Am I making sense?", "I don't know if you understand me", "The thing is...", "At the end of the day", "What a mess", "Oh my goodness"],
            frasesRellenoFormal: ["Indeed", "It should be noted that", "It is necessary to indicate that", "It is pertinent to emphasize that", "From this perspective", "In relation to the foregoing", "Consequently", "In accordance with what has been stated", "By virtue thereof", "It is essential to underscore that", "For further clarification", "In this regard", "Accordingly", "Thus", "Therefore", "It can be inferred that", "From the foregoing it follows that", "In view of which", "It is advisable to remember that", "It is of utmost importance to mention that"],

            reemplazosLigeros: [
                { original: "\\b(is defined by)\\b", nuevo: "is often considered as" },
                { original: "\\b(as)\\b", nuevo: "such as" },
                { original: "\\b(is recognized as)\\b", nuevo: "is also seen as" },
                { original: "\\b(have been present)\\b", nuevo: "have had a presence" },
                { original: "\\b(throughout history)\\b", nuevo: "over time" },
                { original: "\\b(is difficult to determine)\\b", nuevo: "is not easy to ascertain" },
                { original: "\\b(consistently)\\b", nuevo: "continuously" },
                { original: "\\b(more likely to)\\b", nuevo: "more prone to" },
                { original: "\\b(which)\\b", nuevo: "what" },
                { original: "\\b(this may)\\b", nuevo: "it is possible that this" },
                { original: "\\b(for example)\\b", nuevo: "for instance" },
                { original: "\\b(in general terms)\\b", nuevo: "if viewed broadly" },
                { original: "\\b(it can be said that)\\b", nuevo: "some argue that" },
                { original: "\\b(it is important to highlight)\\b", nuevo: "it is worth considering" },
                { original: "\\b(implies)\\b", nuevo: "entails" },
                { original: "\\b(decisions)\\b", nuevo: "resolutions" },
                { original: "\\b(actions)\\b", nuevo: "behaviors" }
            ],

            reemplazosFormales: [
                { original: "\\b(I think)\\b", nuevo: "I consider" },
                { original: "\\b(I believe)\\b", nuevo: "I estimate" },
                { original: "\\b(many people)\\b", nuevo: "numerous individuals" },
                { original: "\\b(thing)\\b", nuevo: "element" },
                { original: "\\b(so)\\b", nuevo: "in this manner" },
                { original: "\\b(but)\\b", nuevo: "however" },
                { original: "\\b(and)\\b", nuevo: "additionally" }
            ],
            conversacionalAdiciones: "Don't you think?",
            conversacionalExclamacionChar: "!",
        }
    };

    let idiomaActual = localStorage.getItem("idiomaPreferido") || "es";

    // Retorna el idioma actual seleccionado.
    const getIdiomaActual = () => idiomaActual;
    // Retorna el objeto de textos para el idioma actual.
    const getTextos = () => contenidoIdioma[idiomaActual];

    // Establece un nuevo idioma y lo guarda en localStorage.
    const setIdioma = (idioma) => {
        idiomaActual = idioma;
        localStorage.setItem("idiomaPreferido", idiomaActual);
    };

    // Actualiza todos los elementos de la interfaz de usuario con los textos del idioma actual.
    const actualizarInterfaz = () => {
        const textos = getTextos();

        document.title = textos.tituloApp;
        Utils.obtenerElemento("tituloPrincipal").innerText = textos.tituloApp;
        Utils.obtenerElemento("textoOriginal").placeholder = textos.placeholder;
        Utils.obtenerElemento("labelTono").innerText = textos.labelTono;
        Utils.obtenerElemento("opcionNeutral").innerText = textos.opcionNeutral;
        Utils.obtenerElemento("opcionFormal").innerText = textos.opcionFormal;
        Utils.obtenerElemento("opcionConversacional").innerText = textos.opcionConversacional;
        Utils.obtenerElemento("botonHumanizar").innerText = textos.botonHumanizar;
        Utils.obtenerElemento("botonCopiar").innerText = textos.botonCopiar;
        Utils.obtenerElemento("botonDescargar").innerText = textos.botonDescargar;
        Utils.obtenerElemento("tituloResultado").innerText = textos.tituloResultado;
        Utils.obtenerElemento("botonModoOscuro").innerText = textos.botonModoOscuro;
        Utils.obtenerElemento("originalStats").innerText = textos.originalStats + " 0";
        Utils.obtenerElemento("humanizedStats").innerText = textos.humanizedStats + " 0";
        Utils.obtenerElemento("labelIdioma").innerText = textos.labelIdioma;

        LimiteIntentos.actualizarContadorIntentosUI();
        Auth.actualizarBotonLoginUI();
        if (Utils.obtenerElemento('loginModal').style.display === 'block') {
            Auth.actualizarModalUI();
        }
        Utils.obtenerElemento("selectorIdioma").value = idiomaActual;
    };

    return {
        getIdiomaActual,
        getTextos,
        setIdioma,
        actualizarInterfaz
    };
})();

// === FUNCIÓN PRINCIPAL DE HUMANIZACIÓN ===
// Contiene la lógica central para procesar y humanizar el texto.
const Humanizador = (() => {
    const humanizar = () => {
        const entrada = Utils.obtenerElemento("textoOriginal");
        const salida = Utils.obtenerElemento("textoHumanizado");
        const contenedorResultado = Utils.obtenerElemento("resultado");
        const estiloTono = Utils.obtenerElemento("estiloTono").value;

        const textos = i18n.getTextos();
        const texto = entrada.value.trim();

        if (!texto) {
            Notificaciones.mostrarMensaje(textos.alertaVacio, 'warning');
            return;
        }

        if (!LimiteIntentos.puedeHumanizar(Auth.getUsuarioLogueado())) {
            Notificaciones.mostrarMensaje(textos.alertaLimiteIntentos, 'info');
            return;
        }

        const palabrasOriginales = texto.split(/\s+/).length;
        // Usa directamente las frases de relleno del objeto de idioma actual
        const frasesRelleno = textos[`frasesRelleno${estiloTono.charAt(0).toUpperCase() + estiloTono.slice(1)}`] || textos.frasesRellenoNeutral;

        const oraciones = texto
            .replace(/\n/g, " ") // Reemplaza saltos de línea por espacios
            .split(/(?<=[.!?])\s+/) // Divide por puntos, signos de exclamación/interrogación seguidos de espacio
            .map(o => o.trim()) // Elimina espacios al inicio/final de cada oración
            .filter(o => o.length > 5); // Filtra oraciones muy cortas

        const usadas = new Set(); // Para no repetir frases de relleno en la misma humanización

        const textoHumanizado = oraciones.map(oracion => {
            oracion = Sinonimos.reemplazar(oracion);
            let parafraseada = Utils.parafrasearLigeramente(oracion, textos.reemplazosLigeros);

            if (Math.random() < 0.4) { // 40% de probabilidad de mezclar palabras
                parafraseada = Utils.mezclarPalabras(parafraseada);
            }

            if (estiloTono === "conversacional") {
                parafraseada = Tonos.generarTonoConversacional(parafraseada, textos.conversacionalAdiciones, textos.conversacionalExclamacionChar);
            } else if (estiloTono === "formal") {
                parafraseada = Tonos.generarTonoFormal(parafraseada, textos.reemplazosFormales);
            }

            const frase = Utils.obtenerFraseAleatoria(frasesRelleno, usadas);
            const contenido = parafraseada.charAt(0).toLowerCase() + parafraseada.slice(1); // La primera letra de la oración en minúscula

            // Inserta la frase de relleno al inicio o al final
            return Math.random() > 0.5
                ? `${frase}, ${contenido}`
                : `${contenido}, ${frase.toLowerCase()}`;
        }).join(" ");

        salida.innerText = textoHumanizado;
        contenedorResultado.style.display = "block";
        contenedorResultado.classList.add("fade-in");

        const palabrasHumanizadas = textoHumanizado.split(/\s+/).length;
        Utils.obtenerElemento("originalStats").innerText = `${textos.originalStats} ${palabrasOriginales}`;
        Utils.obtenerElemento("humanizedStats").innerText = `${textos.humanizedStats} ${palabrasHumanizadas}`;

        LimiteIntentos.consumirIntento(Auth.getUsuarioLogueado());
    };

    // Copia el texto humanizado al portapapeles.
    const copiarTexto = () => {
        const texto = Utils.obtenerElemento("textoHumanizado").innerText;
        const textos = i18n.getTextos();
        if (!texto) {
            Notificaciones.mostrarMensaje(textos.alertaHumanizarVacio, 'warning');
            return;
        }

        navigator.clipboard.writeText(texto)
            .then(() => Notificaciones.mostrarMensaje(textos.alertaCopiar, 'success'))
            .catch(() => Notificaciones.mostrarMensaje(textos.alertaErrorCopiar, 'error'));
    };

    // Descarga el texto humanizado como un archivo TXT.
    const descargarComoTxt = () => {
        const texto = Utils.obtenerElemento("textoHumanizado").innerText;
        const textos = i18n.getTextos();
        if (!texto) {
            Notificaciones.mostrarMensaje(textos.alertaHumanizarVacio, 'warning');
            return;
        }

        const blob = new Blob([texto], { type: "text/plain" });
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = `texto_humanizado_${i18n.getIdiomaActual()}.txt`;
        enlace.click();
    };

    return {
        humanizar,
        copiarTexto,
        descargarComoTxt
    };
})();

// === MÓDULO DE INTERFAZ DE USUARIO Y CONFIGURACIÓN ===
// Maneja la interacción con la UI y la carga de preferencias de usuario.
const UI = (() => {
    // Alterna entre modo claro y oscuro.
    const toggleModoOscuro = () => {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("modoOscuro", document.body.classList.contains("dark-mode"));
    };

    // Guarda el texto original en localStorage.
    const guardarTextoOriginal = () => {
        const texto = Utils.obtenerElemento("textoOriginal").value;
        localStorage.setItem("ultimoTexto", texto);
    };

    // Inicializa la aplicación: carga preferencias, asigna listeners, etc.
    const inicializar = () => {
        // Añadir contenedor de notificaciones dinámicamente si no existe
        if (!Utils.obtenerElemento('notificacionContainer')) {
            const container = document.createElement('div');
            container.id = 'notificacionContainer';
            document.body.appendChild(container);
        }

        // Cargar último texto guardado
        const ultimoTexto = localStorage.getItem("ultimoTexto");
        if (ultimoTexto) {
            Utils.obtenerElemento("textoOriginal").value = ultimoTexto;
        }

        // Aplicar modo oscuro si estaba activado
        if (localStorage.getItem("modoOscuro") === "true") {
            document.body.classList.add("dark-mode");
        }

        // Cargar el estado de los intentos
        LimiteIntentos.cargarEstadoIntentos();

        // Listener para el selector de idioma
        const selectorIdioma = Utils.obtenerElemento("selectorIdioma");
        if (selectorIdioma) {
            selectorIdioma.value = i18n.getIdiomaActual();
            selectorIdioma.addEventListener("change", (event) => {
                i18n.setIdioma(event.target.value);
                i18n.actualizarInterfaz();
            });
        }

        // Actualizar la interfaz con el idioma inicial o preferido
        i18n.actualizarInterfaz();

        // Asignar listeners a los botones y textarea
        Utils.obtenerElemento('botonHumanizar')?.addEventListener('click', Humanizador.humanizar);
        Utils.obtenerElemento('botonCopiar')?.addEventListener('click', Humanizador.copiarTexto);
        Utils.obtenerElemento('botonDescargar')?.addEventListener('click', Humanizador.descargarComoTxt);
        Utils.obtenerElemento('botonModoOscuro')?.addEventListener('click', toggleModoOscuro);
        Utils.obtenerElemento('textoOriginal')?.addEventListener('input', guardarTextoOriginal);

        // Listeners para la funcionalidad de Cuentas
        Utils.obtenerElemento('botonLogin').addEventListener('click', Auth.abrirModal);
        Utils.obtenerElemento('cerrarModal').addEventListener('click', Auth.cerrarModal);
        Utils.obtenerElemento('authForm').addEventListener('submit', Auth.manejarAutenticacion);
        Utils.obtenerElemento('linkRegistro').addEventListener('click', Auth.alternarModoAuth);

        // Cerrar modal si se hace clic fuera de él
        window.addEventListener('click', (event) => {
            if (event.target === Utils.obtenerElemento('loginModal')) {
                Auth.cerrarModal();
            }
        });
    };

    return {
        inicializar
    };
})();

// === MÓDULO DE PLANES ===
const Planes = (() => {
    const abrirModal = () => {
        Utils.obtenerElemento('planesModal').style.display = 'block';
    };
    const cerrarModal = () => {
        Utils.obtenerElemento('planesModal').style.display = 'none';
    };
    const inicializar = () => {
        Utils.obtenerElemento('botonPlanes').addEventListener('click', abrirModal);
        Utils.obtenerElemento('cerrarPlanesModal').addEventListener('click', cerrarModal);
        // Cerrar modal si se hace clic fuera de él
        window.addEventListener('click', (event) => {
            if (event.target === Utils.obtenerElemento('planesModal')) {
                cerrarModal();
            }
        });
    };
    return { inicializar };
})();

// === INICIO DE LA APLICACIÓN ===
document.addEventListener("DOMContentLoaded", () => {
    UI.inicializar();
    Planes.inicializar();
});
