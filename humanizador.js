// humanizador.js (Versión completa corregida y con depuración para el modal)

// === UTILIDADES BÁSICAS ===
const obtenerElemento = id => document.querySelector(`#${id}`);

const obtenerFraseAleatoria = (frases, usadas) => {
    if (!frases || frases.length === 0) return "";
    if (usadas.size === frases.length) {
        usadas.clear();
    }
    const disponibles = frases.filter(f => !usadas.has(f));
    const seleccion = disponibles.length > 0 ? disponibles[Math.floor(Math.random() * disponibles.length)] : frases[Math.floor(Math.random() * frases.length)];
    usadas.add(seleccion);
    return seleccion;
};

const mezclarPalabras = oracion => {
    const palabras = oracion.split(" ");
    if (palabras.length < 6) return oracion;
    const indice = Math.floor(Math.random() * (palabras.length - 3)) + 1;
    const parte1 = palabras.slice(0, indice).join(" ");
    const parte2 = palabras.slice(indice).join(" ");
    return `${parte2}, ${parte1}`;
};

const parafrasearLigeramente = (oracion, reemplazos) => {
    let resultado = oracion;
    if (!reemplazos) return oracion;
    reemplazos.forEach(({ original, nuevo }) => {
        const regex = new RegExp(`\\b${original}\\b`, "gi");
        resultado = resultado.replace(regex, nuevo);
    });
    return resultado;
};

// Función para contar palabras
const contarPalabras = (texto) => {
    if (!texto) return 0;
    const palabras = texto.trim().split(/\s+/);
    return palabras.filter(word => word.length > 0).length;
};


// === NUEVAS FUNCIONES PARA TONOS ===
const generarTonoConversacional = (oracion, adiciones, exclamacionChar) => {
    let resultado = oracion;
    if (adiciones && adiciones.length > 0) {
        const randomAdition = adiciones[Math.floor(Math.random() * adiciones.length)];
        if (Math.random() < 0.3) {
            resultado += randomAdition;
        }
    }

    if (Math.random() < 0.3) {
        if (!resultado.endsWith(exclamacionChar) && !resultado.endsWith('!') && !resultado.endsWith('?')) {
            resultado += exclamacionChar;
        }
    } else if (Math.random() < 0.3 && resultado.split(" ").length > 3) {
        const palabras = resultado.split(" ");
        const indice = Math.floor(Math.random() * (palabras.length - 1));
        palabras[indice] = palabras[indice].toLowerCase();
        resultado = palabras.join(" ");
    }
    return resultado;
};

const generarTonoFormal = (oracion, reemplazosFormales) => {
    let resultado = oracion;
    if (!reemplazosFormales) return oracion;
    reemplazosFormales.forEach(({ original, nuevo }) => {
        const regex = new RegExp(`\\b${original}\\b`, "gi");
        resultado = resultado.replace(regex, nuevo);
    });
    return resultado;
};

// --- GESTIÓN DE LÍMITE DE INTENTOS Y PALABRAS ---
const PLAN_LIMITS_CLIENT = {
    free: { attempts: 3, word_limit: 200, name: 'Básico (Gratis)' },
    standard: { attempts: 30, word_limit: 400, name: 'Estándar' },
    premium: { attempts: Infinity, word_limit: Infinity, name: 'Premium' }
};

let usuarioLogueado = null;
let jwtToken = null;
let userPlanInfo = null; // Almacenará plan_type, daily_attempts, word_count_today, etc.

const actualizarContadorIntentosUI = () => {
    const textos = contenidoIdioma[idiomaActual];
    const contadorElement = obtenerElemento('contadorIntentos');
    const limitePalabrasElement = obtenerElemento('limitePalabras'); // Asegúrate que este elemento exista en tu HTML
    const planActualElement = obtenerElemento('planActual'); // Asegúrate que este elemento exista en tu HTML

    if (contadorElement) {
        if (usuarioLogueado && userPlanInfo) {
            const plan = PLAN_LIMITS_CLIENT[userPlanInfo.plan_type];
            if (plan.attempts === Infinity) {
                contadorElement.innerText = textos.intentosIlimitados;
            } else {
                const intentosRestantes = plan.attempts - userPlanInfo.daily_attempts;
                contadorElement.innerText = `${textos.intentosRestantes}: ${intentosRestantes}`;
            }

            if (plan.word_limit === Infinity) {
                if (limitePalabrasElement) limitePalabrasElement.innerText = textos.palabrasIlimitadas;
            } else {
                const palabrasRestantes = plan.word_limit - userPlanInfo.word_count_today;
                if (limitePalabrasElement) limitePalabrasElement.innerText = `${textos.palabrasRestantes}: ${palabrasRestantes}`;
            }
            if (planActualElement) planActualElement.innerText = `${textos.tuPlanActual}: ${plan.name}`;
        } else {
            // Usuario no logueado, usar límites del plan free como referencia
            const planFree = PLAN_LIMITS_CLIENT.free;
            contadorElement.innerText = `${textos.intentosRestantes}: ${planFree.attempts}`;
            if (limitePalabrasElement) limitePalabrasElement.innerText = `${textos.palabrasRestantes}: ${planFree.word_limit}`;
            if (planActualElement) planActualElement.innerText = `${textos.tuPlanActual}: ${planFree.name}`;
        }
    }
};

// --- FIN GESTIÓN DE LÍMITE DE INTENTOS Y PALABRAS ---


// --- GESTIÓN DE CUENTAS (LOGIN/REGISTRO) ---
const API_BASE_URL = 'http://192.168.1.88:3000/api'; // Asegúrate de que esta URL sea correcta para tu backend

// Referencias a elementos del DOM para el modal (se obtienen en DOMContentLoaded)
let loginModal;
let cerrarModalButton; // Nueva referencia para el botón de cerrar
let modalTitulo;
let authForm;
let labelUsername;
let usernameInput;
let labelPassword;
let passwordInput;
let submitAuthButton;
let linkRegistro;
let modalMessage;
let upgradePlanModal;
let closeModalUpgradeBtn;
let upgradePlanOptions;
let upgradePlanMessage;
let upgradePlanButton;

let esModoRegistro = false;
let needsUpgradeAfterAction = false; // Bandera para indicar si el modal de mejora debe aparecer

const abrirModal = () => {
    if (loginModal) {
        loginModal.style.display = 'flex';
        loginModal.classList.add('fade-in');
        console.log('Modal abierto.'); // Debugging: Confirmar que el modal se abre
    }
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';

    esModoRegistro = false;
    actualizarModalUI();
    mostrarMensajeModal('', false, 'modalMessage'); // Usa el id del modal
};

const cerrarModal = () => {
    if (loginModal) {
        loginModal.classList.remove('fade-in');
        loginModal.style.display = 'none';
        console.log('Modal cerrado.'); // Debugging: Confirmar que el modal se cierra
    }
    mostrarMensajeModal('', false, 'modalMessage'); // Usa el id del modal
};

const abrirModalMejorarPlan = (message, reasonCode) => {
    const textos = contenidoIdioma[idiomaActual];
    if (upgradePlanModal) {
        upgradePlanModal.style.display = 'flex';
        upgradePlanModal.classList.add('fade-in');
        if (upgradePlanMessage) {
            upgradePlanMessage.innerHTML = `${message}<br><br>${textos.razonLimite}`; // Puedes personalizar el mensaje
        }
    }
};

const cerrarModalMejorarPlan = () => {
    if (upgradePlanModal) {
        upgradePlanModal.classList.remove('fade-in');
        upgradePlanModal.style.display = 'none';
    }
};

const actualizarBotonLoginUI = () => {
    const boton = obtenerElemento('botonLogin');
    if (!boton) return;

    const textos = contenidoIdioma[idiomaActual];
    if (usuarioLogueado && usuarioLogueado.email) {
        boton.innerText = `${textos.cerrarSesion} (${usuarioLogueado.email.split('@')[0]})`;
        boton.onclick = cerrarSesion;
    } else {
        boton.innerText = textos.iniciarSesion;
        boton.onclick = abrirModal;
    }
    actualizarContadorIntentosUI();
};

const actualizarModalUI = () => {
    const textos = contenidoIdioma[idiomaActual];

    if (modalTitulo) modalTitulo.innerText = esModoRegistro ? textos.registrarCuenta : textos.iniciarSesion;
    if (labelUsername) labelUsername.innerText = esModoRegistro ? textos.labelEmailRegistro : textos.labelEmailLogin;
    if (submitAuthButton) submitAuthButton.innerText = esModoRegistro ? textos.registrar : textos.entrar;
    if (linkRegistro) linkRegistro.innerText = esModoRegistro ? textos.tienesCuenta : textos.noTienesCuenta;
    if (labelPassword) labelPassword.innerText = textos.labelPassword;

    if (usernameInput) {
        usernameInput.type = 'email';
        usernameInput.autocomplete = esModoRegistro ? 'email' : 'username';
        usernameInput.placeholder = esModoRegistro ? textos.placeholderEmailRegistro : textos.placeholderEmailLogin;
    }
};

const alternarModoAuth = (event) => {
    event.preventDefault();
    esModoRegistro = !esModoRegistro;
    actualizarModalUI();
    mostrarMensajeModal('', false, 'modalMessage'); // Usa el id del modal
};

const mostrarMensajeModal = (message, isError, elementId = 'modalMessage') => {
    const targetElement = obtenerElemento(elementId);
    if (targetElement) {
        targetElement.textContent = message;
        targetElement.style.color = isError ? 'red' : 'green';
        targetElement.style.display = message ? 'block' : 'none';
    }
};

const manejarAutenticacion = async (event) => {
    event.preventDefault();

    if (!usernameInput || !passwordInput) {
        console.error("Inputs de email o contraseña no encontrados.");
        return;
    }

    const email = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const textos = contenidoIdioma[idiomaActual];

    if (!email || !password) {
        mostrarMensajeModal(textos.alertaCamposVacios, true, 'modalMessage');
        return;
    }

    try {
        let endpoint = esModoRegistro ? `${API_BASE_URL}/register` : `${API_BASE_URL}/login`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            mostrarMensajeModal(data.message || `${textos.errorOperacion} ${response.status}`, true, 'modalMessage');
            return;
        }

        jwtToken = data.token;
        localStorage.setItem('jwt_token', jwtToken);

        usuarioLogueado = data.user;
        localStorage.setItem('usuarioActualEmail', usuarioLogueado.email);
        localStorage.setItem('user_data', JSON.stringify(data.user)); // Guardar todos los datos del usuario

        // Actualizar la información del plan del usuario al loguearse/registrarse
        userPlanInfo = {
            plan_type: usuarioLogueado.plan_type,
            daily_attempts: usuarioLogueado.daily_attempts,
            word_count_today: usuarioLogueado.word_count_today
        };

        mostrarMensajeModal(`${textos.bienvenido} ${usuarioLogueado.email}!`, false, 'modalMessage');

        setTimeout(() => {
            cerrarModal();
            actualizarBotonLoginUI();
            actualizarContadorIntentosUI(); // Actualizar inmediatamente después del login
            if (needsUpgradeAfterAction && userPlanInfo.plan_type === 'free') {
                abrirModalMejorarPlan(textos.alertaLimiteIntentos, '');
                needsUpgradeAfterAction = false; // Resetear la bandera
            }
        }, 1500);


    } catch (error) {
        console.error('Error de autenticación:', error);
        mostrarMensajeModal(textos.errorConexion || 'Error de conexión con el servidor de autenticación.', true, 'modalMessage');
    }
};

const cerrarSesion = () => {
    const textos = contenidoIdioma[idiomaActual];
    if (confirm(textos.confirmarCerrarSesion)) {
        usuarioLogueado = null;
        jwtToken = null;
        userPlanInfo = null; // Limpiar info del plan
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('usuarioActualEmail');
        localStorage.removeItem('user_data'); // Eliminar también los datos del usuario
        alert(textos.sesionCerrada);
        actualizarBotonLoginUI();
        actualizarContadorIntentosUI(); // Resetear UI a valores de no logueado
    }
};

function decodeJwtToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decodificando JWT:", e);
        return null;
    }
}
// --- FIN GESTIÓN DE CUENTAS ---


// --- LÓGICA DE MEJORA DE PLAN ---
const manejarMejorarPlan = async () => {
    const textos = contenidoIdioma[idiomaActual];
    const selectedPlan = upgradePlanOptions.value;

    if (!selectedPlan || !usuarioLogueado || !jwtToken) {
        alert(textos.seleccionaPlan);
        return;
    }

    // Aquí iría la integración con una pasarela de pago real.
    // Por ahora, es una simulación de éxito.
    const confirmacion = confirm(`${textos.confirmarMejoraPlan} ${PLAN_LIMITS_CLIENT[selectedPlan].name}?`);
    if (!confirmacion) return;

    try {
        const response = await fetch(`${API_BASE_URL}/upgrade-plan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ newPlan: selectedPlan })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || `${textos.errorOperacion} ${response.status}`);
            if (upgradePlanMessage) {
                upgradePlanMessage.textContent = data.message || `${textos.errorOperacion} ${response.status}`;
                upgradePlanMessage.style.color = 'red';
                upgradePlanMessage.style.display = 'block';
            }
            return;
        }

        jwtToken = data.token; // Actualizar el token con el nuevo plan
        localStorage.setItem('jwt_token', jwtToken);

        // Actualizar userPlanInfo con los nuevos datos del token
        const decoded = decodeJwtToken(jwtToken);
        if (decoded) {
            // Actualizar usuarioLogueado y userPlanInfo con los nuevos datos del token
            usuarioLogueado = { ...usuarioLogueado, ...decoded }; // Combina los datos existentes con los del token
            userPlanInfo = {
                plan_type: decoded.plan_type,
                daily_attempts: decoded.daily_attempts,
                word_count_today: decoded.word_count_today
            };
            localStorage.setItem('user_data', JSON.stringify(usuarioLogueado)); // Guardar el usuario actualizado
        }

        alert(data.message);
        if (upgradePlanMessage) {
            upgradePlanMessage.textContent = data.message;
            upgradePlanMessage.style.color = 'green';
            upgradePlanMessage.style.display = 'block';
        }

        setTimeout(() => {
            cerrarModalMejorarPlan();
            actualizarContadorIntentosUI(); // Actualizar UI con el nuevo plan
            actualizarBotonLoginUI();
        }, 1500);

    } catch (error) {
        console.error('Error al mejorar el plan:', error);
        alert(textos.errorConexionServidor);
        if (upgradePlanMessage) {
            upgradePlanMessage.textContent = textos.errorConexionServidor;
            upgradePlanMessage.style.color = 'red';
            upgradePlanMessage.style.display = 'block';
        }
    }
};
// --- FIN LÓGICA DE MEJORA DE PLAN ---


// === CONTENIDO MULTI-IDIOMA ===
const contenidoIdioma = {
    es: {
        tituloApp: "Humanizador G",
        tituloPrincipal: "Humanizador G",
        textoPlaceholder: "Pega tu texto aquí...",
        labelTono: "Tono del texto:",
        opcionNeutral: "Neutral",
        opcionFormal: "Formal",
        opcionConversacional: "Conversacional",
        botonHumanizar: "Humanizar Texto",
        botonCopiar: "Copiar Texto",
        botonDescargar: "Descargar TXT",
        tituloResultado: "Texto Humanizado",
        originalStats: "Palabras originales:",
        humanizedStats: "Palabras humanizadas:",
        botonModoOscuro: "Alternar Modo Oscuro",
        iniciarSesion: "Iniciar Sesión",
        cerrarSesion: "Cerrar Sesión",
        registrarCuenta: "Registrar Cuenta",
        entrar: "Entrar",
        registrar: "Registrar",
        noTienesCuenta: "¿No tienes cuenta? Regístrate aquí.",
        tienesCuenta: "¿Ya tienes cuenta? Inicia sesión aquí.",
        alertaVacio: "Por favor, introduce un texto para humanizar.",
        alertaCopiar: "Texto copiado al portapapeles.",
        alertaErrorCopiar: "Error al copiar el texto.",
        alertaHumanizarVacio: "No hay texto humanizado para copiar/descargar.",
        alertaCamposVacios: "Por favor, completa todos los campos.",
        alertaLimiteIntentos: `Has alcanzado el límite de intentos diarios para tu plan.`,
        alertaLimitePalabras: `Excederías el límite de palabras diarias para tu plan.`,
        intentosRestantes: "Intentos restantes",
        intentosIlimitados: "Intentos disponibles: Ilimitados",
        palabrasRestantes: "Palabras restantes hoy",
        palabrasIlimitadas: "Palabras disponibles: Ilimitadas",
        tuPlanActual: "Tu plan actual",
        bienvenido: "¡Bienvenido/a",
        sesionCerrada: "¡Sesión cerrada!",
        confirmarCerrarSesion: "¿Estás seguro de que quieres cerrar la sesión?",
        labelEmailLogin: "Email:",
        labelEmailRegistro: "Email:",
        labelPassword: "Contraseña:",
        placeholderEmailLogin: "tu@email.com",
        placeholderEmailRegistro: "nuevo.usuario@email.com",
        errorCredenciales: "Email o contraseña incorrectos.",
        errorUsuarioExistente: "Este email ya está registrado.",
        errorOperacion: "Error en la operación:",
        errorConexion: "Error de conexión con el servidor de autenticación.",
        tituloModalMejorarPlan: "Mejora tu Plan",
        textoMejorarPlan: "¡Has alcanzado los límites de tu plan actual! Mejora tu plan para humanizar más texto sin restricciones.",
        razonLimite: "Razón: Has excedido el límite de intentos o palabras para tu plan actual. Para continuar usando Humanizador G sin límites, por favor, mejora tu plan.",
        opcionStandard: "Estándar (30 intentos / 400 palabras)",
        opcionPremium: "Premium (Ilimitado)",
        botonMejorarAhora: "Mejorar Ahora",
        seleccionaPlan: "Por favor, selecciona un plan.",
        confirmarMejoraPlan: "¿Estás seguro de que quieres mejorar a este plan?",
        errorConexionServidor: "Error de conexión con el servidor. Inténtalo de nuevo más tarde.",
        mejorarPlanLink: "Mejorar Plan",


        frasesRellenoNeutral: [
            "En este sentido", "Por otro lado", "Además", "Sin embargo", "No obstante",
            "Cabe destacar que", "Es importante señalar que", "De acuerdo con lo expuesto",
            "Asimismo", "Por consiguiente", "En primer lugar", "En segundo lugar",
            "Finalmente", "En definitiva", "Por lo tanto", "A modo de conclusión"
        ],
        reemplazosLigeros: [
            { original: "es decir", nuevo: "o sea" },
            { original: "por ende", nuevo: "por eso" },
            { original: "así pues", nuevo: "entonces" },
            { original: "no obstante", nuevo: "pero" },
            { original: "cabe recalcar", nuevo: "hay que decir" }
        ],
        conversacionalAdiciones: [" sabes?", " eh?", " entiendes?", " claro?", " o sea,"],
        conversacionalExclamacionChar: "¡",
        frasesRellenoConversacional: [
            "Y sabes qué?", "O sea,", "A ver,", "Pues mira,", "De verdad,", "En serio,",
            "Imagínate,", "Te cuento,", "La verdad es que,", "Vamos a ver,", "Así que,"
        ],
        reemplazosFormales: [
            { original: "por eso", nuevo: "por consiguiente" },
            { original: "o sea", nuevo: "es decir" },
            { original: "hay que decir", nuevo: "cabe recalcar" },
            { original: "pero", nuevo: "no obstante" },
            { original: "entonces", nuevo: "así pues" }
        ],
        frasesRellenoFormal: [
            "En relación con lo antedicho", "Con referencia a lo expuesto", "Es menester subrayar que",
            "A tenor de lo cual", "Por consiguiente", "Consecuentemente", "Aunado a lo anterior",
            "Resulta pertinente destacar que", "En este orden de ideas", "Por lo tanto",
            "En síntesis", "Para concluir"
        ]
    },
    en: {
        tituloApp: "Humanizer G",
        tituloPrincipal: "Humanizer G",
        textoPlaceholder: "Paste your text here...",
        labelTono: "Text tone:",
        opcionNeutral: "Neutral",
        opcionFormal: "Formal",
        opcionConversacional: "Conversational",
        botonHumanizar: "Humanize Text",
        botonCopiar: "Copy Text",
        botonDescargar: "Download TXT",
        tituloResultado: "Humanized Text",
        originalStats: "Original words:",
        humanizedStats: "Humanized words:",
        botonModoOscuro: "Toggle Dark Mode",
        iniciarSesion: "Log In",
        cerrarSesion: "Log Out",
        registrarCuenta: "Register Account",
        entrar: "Enter",
        registrar: "Register",
        noTienesCuenta: "Don't have an account? Register here.",
        tienesCuenta: "Already have an account? Log in here.",
        alertaVacio: "Please enter text to humanize.",
        alertaCopiar: "Text copied to clipboard.",
        alertaErrorCopiar: "Error copying text.",
        alertaHumanizarVacio: "No humanized text to copy/download.",
        alertaCamposVacios: "Please fill in all fields.",
        alertaLimiteIntentos: `You have reached the daily attempt limit for your plan.`,
        alertaLimitePalabras: `You would exceed the daily word limit for your plan.`,
        intentosRestantes: "Attempts remaining",
        intentosIlimitados: "Attempts available: Unlimited",
        palabrasRestantes: "Words remaining today",
        palabrasIlimitadas: "Words available: Unlimited",
        tuPlanActual: "Your current plan",
        bienvenido: "Welcome",
        sesionCerrada: "Session closed!",
        confirmarCerrarSesion: "Are you sure you want to log out?",
        labelEmailLogin: "Email:",
        labelEmailRegistro: "Email:",
        labelPassword: "Password:",
        placeholderEmailLogin: "your@email.com",
        placeholderEmailRegistro: "new.user@email.com",
        errorCredenciales: "Incorrect email or password.",
        errorUsuarioExistente: "This email is already registered.",
        errorOperacion: "Error in operation:",
        errorConexion: "Connection error with authentication server.",
        tituloModalMejorarPlan: "Upgrade Your Plan",
        textoMejorarPlan: "You have reached the limits of your current plan! Upgrade your plan to humanize more text without restrictions.",
        razonLimite: "Reason: You have exceeded the attempt or word limit for your current plan. To continue using Humanizer G without limits, please upgrade your plan.",
        opcionStandard: "Standard (30 attempts / 400 words)",
        opcionPremium: "Premium (Unlimited)",
        botonMejorarAhora: "Upgrade Now",
        seleccionaPlan: "Please select a plan.",
        confirmarMejoraPlan: "Are you sure you want to upgrade to this plan?",
        errorConexionServidor: "Server connection error. Please try again later.",
        mejorarPlanLink: "Upgrade Plan",

        frasesRellenoNeutral: [
            "In this regard", "On the other hand", "Additionally", "However", "Nevertheless",
            "It is worth noting that", "It is important to point out that", "According to the above",
            "Likewise", "Consequently", "Firstly", "Secondly",
            "Finally", "In short", "Therefore", "By way of conclusion"
        ],
        reemplazosLigeros: [
            { original: "that is to say", nuevo: "I mean" },
            { original: "therefore", nuevo: "so" },
            { original: "thus", nuevo: "then" },
            { original: "nevertheless", nuevo: "but" },
            { original: "it should be noted", nuevo: "it must be said" }
        ],
        conversacionalAdiciones: [" you know?", " huh?", " understand?", " right?", " I mean,"],
        conversacionalExclamacionChar: "!",
        frasesRellenoConversacional: [
            "And you know what?", "I mean,", "Let's see,", "Well, look,", "Seriously,", "Really,",
            "Imagine that,", "Let me tell you,", "The truth is,", "Let's find out,", "So,"
        ],
        reemplazosFormales: [
            { original: "so", nuevo: "consequently" },
            { original: "I mean", nuevo: "that is to say" },
            { original: "it must be said", nuevo: "it should be noted" },
            { original: "but", nuevo: "nevertheless" },
            { original: "then", nuevo: "thus" }
        ],
        frasesRellenoFormal: [
            "In relation to the foregoing", "With reference to the aforementioned", "It is necessary to emphasize that",
            "It is necessary to emphasize that", "Consequently", "Consequently", "In addition to the above",
            "It is pertinent to highlight that", "In this vein", "Therefore",
            "In summary", "To conclude"
        ]
    }
};

let idiomaActual = localStorage.getItem("idiomaPreferido") || "es";

const actualizarInterfaz = () => {
    const textos = contenidoIdioma[idiomaActual];

    const elementosPrincipales = [
        { id: "tituloApp", text: textos.tituloApp },
        { id: "tituloPrincipal", text: textos.tituloPrincipal },
        { id: "textoOriginal", placeholder: textos.textoPlaceholder },
        { id: "labelTono", text: textos.labelTono },
        { id: "opcionNeutral", text: textos.opcionNeutral },
        { id: "opcionFormal", text: textos.opcionFormal },
        { id: "opcionConversacional", text: textos.opcionConversacional },
        { id: "botonHumanizar", text: textos.botonHumanizar },
        { id: "botonCopiar", text: textos.botonCopiar },
        { id: "botonDescargar", text: textos.botonDescargar },
        { id: "tituloResultado", text: textos.tituloResultado },
        { id: "botonModoOscuro", text: textos.botonModoOscuro },
        { id: "mejorarPlanLink", text: textos.mejorarPlanLink, isLink: true }, // Nuevo elemento
    ];

    elementosPrincipales.forEach(item => {
        const el = obtenerElemento(item.id);
        if (el) {
            if (item.text !== undefined) {
                if (item.isLink) {
                    el.innerText = item.text;
                } else {
                    el.innerText = item.text;
                }
            }
            if (item.placeholder !== undefined) el.placeholder = item.placeholder;
        }
    });

    // Actualizar estadísticas de palabras (manteniendo el número actual si existe)
    const originalStatsEl = obtenerElemento("originalStats");
    if (originalStatsEl) {
        const currentOriginalWords = originalStatsEl.innerText.split(": ")[1] || "0";
        originalStatsEl.innerText = `${textos.originalStats} ${currentOriginalWords}`;
    }

    const humanizedStatsEl = obtenerElemento("humanizedStats");
    if (humanizedStatsEl) {
        const currentHumanizedWords = humanizedStatsEl.innerText.split(": ")[1] || "0";
        humanizedStatsEl.innerText = `${textos.humanizedStats} ${currentHumanizedWords}`;
    }

    // Actualizar elementos del modal solo si el modal está abierto o si es la carga inicial
    const loginModalElement = obtenerElemento('loginModal');
    if (loginModalElement && (loginModalElement.style.display === 'flex' || loginModalElement.style.display === 'block')) {
        actualizarModalUI();
    }

    // Actualizar el modal de mejora de plan
    const upgradeModalTitle = obtenerElemento('upgradeModalTitle');
    const upgradePlanOptionStandard = obtenerElemento('upgradePlanOptionStandard');
    const upgradePlanOptionPremium = obtenerElemento('upgradePlanOptionPremium');
    const upgradePlanButtonEl = obtenerElemento('upgradePlanButton');

    if (upgradeModalTitle) upgradeModalTitle.innerText = textos.tituloModalMejorarPlan;
    if (upgradePlanMessage) upgradePlanMessage.innerText = textos.textoMejorarPlan;
    if (upgradePlanOptionStandard) upgradePlanOptionStandard.innerText = textos.opcionStandard;
    if (upgradePlanOptionPremium) upgradePlanOptionPremium.innerText = textos.opcionPremium;
    if (upgradePlanButtonEl) upgradePlanButtonEl.innerText = textos.botonMejorarAhora;

    actualizarBotonLoginUI();
    actualizarContadorIntentosUI();
};


// === FUNCIÓN PRINCIPAL DE HUMANIZACIÓN ===
const humanizar = async () => {
    const entrada = obtenerElemento("textoOriginal");
    const salida = obtenerElemento("textoHumanizado");
    const contenedorResultado = obtenerElemento("resultado"); // Asegúrate de que este ID exista en tu HTML
    const estiloTono = obtenerElemento("estiloTono");

    if (!entrada || !salida || !estiloTono) {
        console.error("No se encontraron todos los elementos necesarios para humanizar.");
        return;
    }

    const textos = contenidoIdioma[idiomaActual];

    const texto = entrada.value.trim();
    if (!texto) {
        mostrarMensajeModal(textos.alertaVacio, true, 'mainMessage'); // Usar un nuevo elemento para mensajes principales
        return;
    }

    const palabrasOriginales = texto.split(/\s+/).filter(word => word.length > 0).length;
    let humanizedText = texto; // Inicializar con el texto original

    // Mostrar mensaje de "Humanizando..." en la interfaz principal si existe un elemento para ello
    mostrarMensajeModal('Humanizando texto...', false, 'mainMessage');


    if (!usuarioLogueado) {
        // Para usuarios no logueados, aplicar límites del plan 'free'
        const planFree = PLAN_LIMITS_CLIENT.free;
        if (planFree.attempts !== Infinity && (!userPlanInfo || userPlanInfo.daily_attempts >= planFree.attempts)) {
            needsUpgradeAfterAction = true;
            abrirModal(); // Pedir login/registro
            mostrarMensajeModal(`${textos.alertaLimiteIntentos} ${planFree.name} (Gratis). Por favor, inicia sesión o regístrate para continuar.`, true, 'modalMessage');
            mostrarMensajeModal('', false, 'mainMessage'); // Limpiar mensaje principal
            return;
        }
        if (planFree.word_limit !== Infinity && (palabrasOriginales > planFree.word_limit)) {
            needsUpgradeAfterAction = true;
            abrirModal(); // Pedir login/registro
            mostrarMensajeModal(`${textos.alertaLimitePalabras} ${planFree.name} (Gratis). Por favor, inicia sesión o regístrate para continuar.`, true, 'modalMessage');
            mostrarMensajeModal('', false, 'mainMessage'); // Limpiar mensaje principal
            return;
        }

        // Si no hay usuario logueado y pasa los checks de límite, humanizar en el cliente
        const frasesRellenoNeutral = textos.frasesRellenoNeutral || [];
        const frasesRellenoConversacional = textos.frasesRellenoConversacional || [];
        const frasesRellenoFormal = textos.frasesRellenoFormal || [];

        let frasesRelleno;
        let reemplazos;

        switch (estiloTono.value) {
            case "formal":
                frasesRelleno = frasesRellenoFormal;
                reemplazos = textos.reemplazosFormales;
                humanizedText = generarTonoFormal(humanizedText, reemplazos);
                humanizedText = humanizedText.split('. ').map(sent => {
                    if (sent.length > 0 && Math.random() < 0.2 && frasesRelleno.length > 0) {
                        return sent + ". " + frasesRelleno[Math.floor(Math.random() * frasesRelleno.length)] + ".";
                    }
                    return sent;
                }).join(' ').trim();
                break;
            case "conversacional":
                frasesRelleno = frasesRellenoConversacional;
                humanizedText = generarTonoConversacional(humanizedText, textos.conversacionalAdiciones, textos.conversacionalExclamacionChar);
                humanizedText = humanizedText.split('. ').map(sent => {
                    if (sent.length > 0 && Math.random() < 0.2 && frasesRelleno.length > 0) {
                        return sent + ". " + frasesRelleno[Math.floor(Math.random() * frasesRelleno.length)] + ".";
                    }
                    return sent;
                }).join(' ').trim();
                break;
            case "neutral":
            default:
                frasesRelleno = frasesRellenoNeutral;
                reemplazos = textos.reemplazosLigeros;
                humanizedText = parafrasearLigeramente(humanizedText, reemplazos);
                humanizedText = humanizedText.split('. ').map(sent => {
                    if (sent.length > 0 && Math.random() < 0.1 && frasesRelleno.length > 0) {
                        return sent + ". " + frasesRelleno[Math.floor(Math.random() * frasesRelleno.length)] + ".";
                    }
                    return sent;
                }).join(' ').trim();
                break;
        }

        salida.textContent = humanizedText;
        obtenerElemento('originalStats').textContent = `${textos.originalStats} ${palabrasOriginales}`;
        obtenerElemento('humanizedStats').textContent = `${textos.humanizedStats} ${contarPalabras(humanizedText)}`;
        mostrarMensajeModal('', false, 'mainMessage'); // Limpiar mensaje
        actualizarContadorIntentosUI(); // Actualizar contador de intentos para el plan free
        return; // Terminar la función aquí si se humaniza en el cliente
    }

    // Si el usuario está logueado, se humaniza en el servidor
    try {
        const response = await fetch(`${API_BASE_URL}/humanize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                originalText: texto,
                tone: estiloTono.value,
                wordCount: palabrasOriginales // Enviar el conteo de palabras para la validación del backend
            })
        });

        const data = await response.json();

        if (response.ok) {
            salida.textContent = data.humanizedText;
            obtenerElemento('originalStats').textContent = `${textos.originalStats} ${palabrasOriginales}`;
            obtenerElemento('humanizedStats').textContent = `${textos.humanizedStats} ${contarPalabras(data.humanizedText)}`;
            mostrarMensajeModal(data.message || 'Texto humanizado con éxito.', false, 'mainMessage');

            // Actualizar la información del usuario desde la respuesta del servidor
            if (data.user) {
                usuarioLogueado = data.user;
                userPlanInfo = {
                    plan_type: usuarioLogueado.plan_type,
                    daily_attempts: usuarioLogueado.daily_attempts,
                    word_count_today: usuarioLogueado.word_count_today
                };
                localStorage.setItem('user_data', JSON.stringify(usuarioLogueado));
                actualizarContadorIntentosUI();
            }

        } else {
            let errorMessage = data.message || textos.errorOperacion;
            if (response.status === 403) { // Prohibido, usualmente por límites
                mostrarMensajeModal(errorMessage, true, 'mainMessage');
                abrirModalMejorarPlan(errorMessage, data.reason_code); // Pasar la razón si el backend la envía
            } else if (response.status === 401) { // No autorizado, token inválido o expirado
                mostrarMensajeModal(errorMessage, true, 'mainMessage');
                cerrarSesion(); // Forzar cierre de sesión si el token es inválido
                abrirModal(); // Y pedir login
            } else {
                mostrarMensajeModal(errorMessage, true, 'mainMessage');
            }
        }
    } catch (error) {
        console.error('Error al humanizar el texto:', error);
        mostrarMensajeModal(textos.errorConexionServidor, true, 'mainMessage');
    } finally {
        setTimeout(() => {
            mostrarMensajeModal('', false, 'mainMessage'); // Limpiar mensaje
        }, 3000);
    }
};

// --- MODO OSCURO ---
const toggleModoOscuro = () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
};

const cargarModoOscuro = () => {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
};

// --- COPIAR Y DESCARGAR ---
const copiarTexto = () => {
    const salida = obtenerElemento("textoHumanizado");
    const textos = contenidoIdioma[idiomaActual];
    if (salida && salida.textContent.trim()) {
        navigator.clipboard.writeText(salida.textContent)
            .then(() => mostrarMensajeModal(textos.alertaCopiar, false, 'mainMessage'))
            .catch(err => {
                console.error('Error al copiar el texto:', err);
                mostrarMensajeModal(textos.alertaErrorCopiar, true, 'mainMessage');
            });
    } else {
        mostrarMensajeModal(textos.alertaHumanizarVacio, true, 'mainMessage');
    }
    setTimeout(() => { mostrarMensajeModal('', false, 'mainMessage'); }, 3000);
};

const descargarComoTxt = () => {
    const salida = obtenerElemento("textoHumanizado");
    const textos = contenidoIdioma[idiomaActual];
    if (salida && salida.textContent.trim()) {
        const nombreArchivo = "texto_humanizado.txt";
        const blob = new Blob([salida.textContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostrarMensajeModal(`"${nombreArchivo}" ${textos.alertaCopiar.replace('copiado', 'descargado')}`, false, 'mainMessage'); // Reutilizar mensaje
    } else {
        mostrarMensajeModal(textos.alertaHumanizarVacio, true, 'mainMessage');
    }
    setTimeout(() => { mostrarMensajeModal('', false, 'mainMessage'); }, 3000);
};

// === CARGA INICIAL DEL DOM ===
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referencias a elementos del DOM
    loginModal = obtenerElemento('loginModal');
    cerrarModalButton = obtenerElemento('cerrarModal'); // Obtener referencia aquí
    modalTitulo = obtenerElemento('modalTitulo');
    authForm = obtenerElemento('authForm');
    labelUsername = obtenerElemento('labelUsername');
    usernameInput = obtenerElemento('username');
    labelPassword = obtenerElemento('labelPassword');
    passwordInput = obtenerElemento('password');
    submitAuthButton = obtenerElemento('submitAuth');
    linkRegistro = obtenerElemento('linkRegistro');
    modalMessage = obtenerElemento('modalMessage');
    upgradePlanModal = obtenerElemento('upgradePlanModal');
    closeModalUpgradeBtn = obtenerElemento('closeModalUpgrade');
    upgradePlanOptions = obtenerElemento('upgradePlanOptions');
    upgradePlanMessage = obtenerElemento('upgradePlanMessage');
    upgradePlanButton = obtenerElemento('upgradePlanButton');


    cargarModoOscuro();

    // Asignar listeners al selector de idioma
    const idiomaSelect = obtenerElemento('idiomaSelect');
    if (idiomaSelect) {
        idiomaSelect.value = idiomaActual; // Establecer la selección inicial
        idiomaSelect.addEventListener('change', (event) => {
            idiomaActual = event.target.value;
            localStorage.setItem("idiomaPreferido", idiomaActual);
            actualizarInterfaz();
        });
    }

    // Cargar información del usuario desde localStorage
    jwtToken = localStorage.getItem('jwt_token');
    const storedUserData = localStorage.getItem('user_data');

    if (jwtToken && storedUserData) {
        try {
            const parsedUser = JSON.parse(storedUserData);
            usuarioLogueado = parsedUser;
            userPlanInfo = {
                plan_type: parsedUser.plan_type,
                daily_attempts: parsedUser.daily_attempts,
                word_count_today: parsedUser.word_count_today
            };
            // Verificar el token con el backend para asegurarse de que es válido
            fetch(`${API_BASE_URL}/check-token`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            })
            .then(response => response.json())
            .then(data => {
                if (data.user) {
                    usuarioLogueado = data.user;
                    userPlanInfo = {
                        plan_type: data.user.plan_type,
                        daily_attempts: data.user.daily_attempts,
                        word_count_today: data.user.word_count_today
                    };
                    localStorage.setItem('user_data', JSON.stringify(data.user)); // Actualizar por si hay cambios en el backend
                    actualizarInterfaz(); // Actualizar la interfaz con los datos del usuario
                    console.log('Token JWT válido y usuario cargado.');
                } else {
                    console.warn('Token JWT inválido o expirado. Sesión cerrada.');
                    cerrarSesion(); // Limpiar datos si el token no es válido
                }
            })
            .catch(error => {
                console.error('Error al verificar el token:', error);
                cerrarSesion(); // Limpiar datos en caso de error de red o servidor
            });
        } catch (e) {
            console.error("Error al parsear datos de usuario de localStorage:", e);
            cerrarSesion(); // Limpiar datos si hay un error en el formato
        }
    } else {
        actualizarInterfaz(); // Actualizar la interfaz para un usuario no logueado
    }


    // Asignar listeners a los botones principales.
    obtenerElemento('botonHumanizar')?.addEventListener('click', humanizar);
    obtenerElemento('botonCopiar')?.addEventListener('click', copiarTexto);
    obtenerElemento('botonDescargar')?.addEventListener('click', descargarComoTxt);
    obtenerElemento('botonModoOscuro')?.addEventListener('click', toggleModoOscuro);
    obtenerElemento('textoOriginal')?.addEventListener('input', () => {
        // La lógica de guardar texto y actualizar contadores debe estar aquí
        const textoOriginal = obtenerElemento('textoOriginal').value;
        localStorage.setItem('textoOriginal', textoOriginal);
        obtenerElemento('originalStats').textContent = `${contenidoIdioma[idiomaActual].originalStats} ${contarPalabras(textoOriginal)}`;
    });

    // Cargar texto guardado previamente
    const textoGuardado = localStorage.getItem('textoOriginal');
    if (textoGuardado) {
        obtenerElemento('textoOriginal').value = textoGuardado;
        obtenerElemento('originalStats').textContent = `${contenidoIdioma[idiomaActual].originalStats} ${contarPalabras(textoGuardado)}`;
    }


    // --- Listeners para la funcionalidad de Cuentas ---
    // El listener para 'botonLogin' se asigna/re-asigna en actualizarBotonLoginUI()
    if (cerrarModalButton) {
        cerrarModalButton.addEventListener('click', cerrarModal);
        console.log('Listener para #cerrarModal configurado.'); // Debugging: Confirmar la asignación
    } else {
        console.error('ERROR: El elemento con ID "cerrarModal" no fue encontrado en el DOM. El botón de cerrar no funcionará.'); // Debugging: Alertar si el elemento no existe
    }

    if (authForm) {
        authForm.addEventListener('submit', manejarAutenticacion);
    }
    if (linkRegistro) {
        linkRegistro.addEventListener('click', alternarModoAuth);
    }

    // Cerrar modal si se hace clic fuera de él
    window.addEventListener('click', (event) => {
        if (loginModal && (loginModal.style.display === 'flex' || loginModal.style.display === 'block') && event.target === loginModal) {
            cerrarModal();
        }
        if (upgradePlanModal && (upgradePlanModal.style.display === 'flex' || upgradePlanModal.style.display === 'block') && event.target === upgradePlanModal) {
            cerrarModalMejorarPlan();
        }
    });

    // Listeners para el modal de mejora de plan
    if (closeModalUpgradeBtn) {
        closeModalUpgradeBtn.addEventListener('click', cerrarModalMejorarPlan);
    }
    if (upgradePlanButton) {
        upgradePlanButton.addEventListener('click', manejarMejorarPlan);
    }
    const mejorarPlanLink = obtenerElemento('mejorarPlanLink');
    if (mejorarPlanLink) {
        mejorarPlanLink.addEventListener('click', (e) => {
            e.preventDefault();
            abrirModalMejorarPlan(contenidoIdioma[idiomaActual].textoMejorarPlan, 'manual_open');
        });
    }

    // Mensaje para la interfaz principal (no el modal de login)
    const mainMessageElement = document.createElement('div');
    mainMessageElement.id = 'mainMessage';
    mainMessageElement.className = 'modal-message'; // Reutiliza algunos estilos, ajusta en CSS
    mainMessageElement.style.display = 'none';
    mainMessageElement.style.position = 'fixed';
    mainMessageElement.style.bottom = '20px';
    mainMessageElement.style.left = '50%';
    mainMessageElement.style.transform = 'translateX(-50%)';
    mainMessageElement.style.zIndex = '1000';
    mainMessageElement.style.padding = '10px 20px';
    mainMessageElement.style.borderRadius = '5px';
    mainMessageElement.style.backgroundColor = 'var(--fondo-area)'; // Ajusta color
    mainMessageElement.style.color = 'var(--texto-principal)';
    mainMessageElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    document.body.appendChild(mainMessageElement);
});