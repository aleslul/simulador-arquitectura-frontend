// url base del servidor backend en spring boot y variable de sesion activa
const API_URL = 'http://localhost:8080/api/simulador';
let sessionId = null;

// recolecta los parametros de la interfaz para armar la solicitud de simulacion o comparacion
async function construirPayload(tipoForzado) {
    const tipo = tipoForzado || document.getElementById('arquitecturaSelect').value;
    const modo = document.getElementById('modoSelect').value;
    const progKey = document.getElementById('programaSelect').value;
    const valA = parseInt(document.getElementById('inputA').value) || 0;
    const valB = parseInt(document.getElementById('inputB').value) || 0;

    const lineasCache = parseInt(document.getElementById('cfgLineasCache').value) || 4;
    const latenciaCache = parseInt(document.getElementById('cfgLatenciaL1').value) || 1;
    const lineasCacheL2 = parseInt(document.getElementById('cfgLineasCacheL2').value) || 16;
    const latenciaCacheL2 = parseInt(document.getElementById('cfgLatenciaL2').value) || 2;
    const latenciaMemoria = parseInt(document.getElementById('cfgLatenciaRAM').value) || 6;
    const algoritmoReemplazo = document.getElementById('cfgReemplazo').value || 'LRU';

    let codigoPrograma = null;
    if (tipo) {
        const ejRes = await fetch(`${API_URL}/ejemplos?tipo=${tipo}&valorA=${valA}&valorB=${valB}`);
        if (ejRes.ok) {
            const ejemplos = await ejRes.json();
            codigoPrograma = ejemplos[progKey] || null;
        }
    }

    return {
        progKey: progKey,
        payload: {
            tipo: tipo,
            modo: modo,
            valorA: valA,
            valorB: valB,
            programa: codigoPrograma,
            lineasCache: lineasCache,
            latenciaCache: latenciaCache,
            lineasCacheL2: lineasCacheL2,
            latenciaCacheL2: latenciaCacheL2,
            latenciaMemoria: latenciaMemoria,
            algoritmoReemplazo: algoritmoReemplazo
        }
    };
}

// inicia una nueva sesion en el backend y dibuja la arquitectura seleccionada
async function iniciarSimulador() {
    const tipo = document.getElementById('arquitecturaSelect').value;
    try {
        const { progKey, payload } = await construirPayload(tipo);

        const response = await fetch(`${API_URL}/sesiones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resData = await response.json();
            sessionId = resData.sesionId;

            document.getElementById('btnPaso').disabled = false;
            document.getElementById('btnEjecutarTodo').disabled = false;
            document.getElementById('btnReset').disabled = false;

            resetearUI();
            document.getElementById('txtModo').innerText = resData.modo;
            document.getElementById('tituloMonitorCache').innerText =
                `Monitor de Caches L1 y L2 en Vivo (Rojo = Candidato ${payload.algoritmoReemplazo} a reemplazo)`;

            agregarLog(`--- Simulador iniciado [${resData.tipo}] | Programa: ${progKey} | L1: ${payload.lineasCache} lin (${payload.latenciaCache}c) | L2: ${payload.lineasCacheL2} lin (${payload.latenciaCacheL2}c) | RAM: ${payload.latenciaMemoria}c | Reemplazo: ${payload.algoritmoReemplazo} ---`);
            renderizarEstructuraMemoria(tipo);

            const estadoRes = await fetch(`${API_URL}/estado?sesionId=${sessionId}`);
            const dto = await estadoRes.json();
            actualizarCuadriculasMemoria(dto);
            actualizarPanelCache(dto);
        } else {
            const err = await response.json();
            alert(`Error al iniciar: ${err.mensaje}`);
        }
    } catch (error) {
        console.error("Error de conexion:", error);
        alert("Asegurate de que Spring Boot este corriendo en el puerto 8080");
    }
}

// muestra u oculta el panel de configuracion de caches segun la arquitectura elegida
function toggleConfigCache() {
    const tipo = document.getElementById('arquitecturaSelect').value;
    const panel = document.getElementById('panelJerarquia');
    panel.style.display = (tipo === 'HARVARD_MODIFICADA') ? 'block' : 'none';
}

// avanza un ciclo de instruccion y actualiza los registros memorias y animaciones
async function siguientePaso() {
    if (!sessionId) return;
    try {
        const response = await fetch(`${API_URL}/paso?sesionId=${sessionId}`, { method: 'POST' });
        if (response.ok) {
            const dto = await response.json();
            actualizarUI(dto);
        } else {
            const err = await response.json();
            alert(`Error: ${err.mensaje}`);
        }
    } catch (error) {
        console.error("Error al obtener el siguiente paso:", error);
    }
}

// ejecuta todas las instrucciones del programa hasta llegar a HALT o al limite de pasos
async function ejecutarTodo() {
    if (!sessionId) return;
    try {
        const response = await fetch(`${API_URL}/ejecutar-todo?sesionId=${sessionId}`, { method: 'POST' });
        if (response.ok) {
            const dto = await response.json();
            actualizarUI(dto);
        } else {
            const err = await response.json();
            alert(`Error al ejecutar todo: ${err.mensaje}`);
        }
    } catch (error) {
        console.error("Error en ejecutar todo:", error);
    }
}

// reinicia la sesion actual al estado inicial manteniendo el mismo programa y configuracion
async function reiniciarSimulador() {
    if (!sessionId) return;
    try {
        const response = await fetch(`${API_URL}/reset?sesionId=${sessionId}`, { method: 'POST' });
        if (response.ok) {
            const dto = await response.json();
            document.getElementById('btnPaso').disabled = false;
            document.getElementById('btnEjecutarTodo').disabled = false;
            document.getElementById('listaLogs').innerHTML = "";
            actualizarUI(dto);
            agregarLog("--- Simulador reiniciado al estado inicial (PC = 0) ---");
        } else {
            const err = await response.json();
            alert(`Error al reiniciar: ${err.mensaje}`);
        }
    } catch (error) {
        console.error("Error al reiniciar:", error);
    }
}

// consulta el endpoint de comparacion enviando exactamente el programa elegido en el selector
async function compararArquitecturas() {
    try {
        const progKey = document.getElementById('programaSelect').value;
        const { payload } = await construirPayload('HARVARD_MODIFICADA');
        payload.tipo = null;

        const response = await fetch(`${API_URL}/comparar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resultados = await response.json();
            renderizarTablaComparativa(resultados, progKey, payload);
        } else {
            const err = await response.json();
            alert(`Error al comparar: ${err.mensaje}`);
        }
    } catch (error) {
        console.error("Error al comparar arquitecturas:", error);
        alert("No se pudo conectar con el servidor para comparar");
    }
}

// pinta las filas de la tabla comparativa con ciclos CPI esperas hit rates de L1 L2 y speedup
function renderizarTablaComparativa(resultados, progKey, payload) {
    const seccion = document.getElementById('seccionComparativa');
    const cuerpo = document.getElementById('cuerpoTablaComparativa');
    const subtitulo = document.getElementById('subtituloComparativa');

    seccion.style.display = 'block';
    subtitulo.innerText = `Programa: ${progKey} (A=${payload.valorA}, B=${payload.valorB}) | L1: ${payload.lineasCache} lineas (${payload.latenciaCache}c) | L2: ${payload.lineasCacheL2} lineas (${payload.latenciaCacheL2}c) | RAM: ${payload.latenciaMemoria}c | Algoritmo: ${payload.algoritmoReemplazo}`;
    cuerpo.innerHTML = '';

    resultados.forEach(fila => {
        const tr = document.createElement('tr');
        if (fila.arquitectura === 'Harvard modificada') {
            tr.className = 'fila-destacada';
        }

        let txtL1I = 'N/A';
        let txtL1D = 'N/A';
        let txtL2 = 'N/A';

        if (fila.cache) {
            const hrL1I = calcularPorcentaje(fila.cache.aciertosL1I, fila.cache.fallosL1I);
            const hrL1D = calcularPorcentaje(fila.cache.aciertosL1D, fila.cache.fallosL1D);
            const hrL2 = calcularPorcentaje(fila.cache.aciertosL2, fila.cache.fallosL2);

            txtL1I = `${fila.cache.aciertosL1I} / ${fila.cache.fallosL1I} (${hrL1I})`;
            txtL1D = `${fila.cache.aciertosL1D} / ${fila.cache.fallosL1D} (${hrL1D})`;
            txtL2 = `${fila.cache.aciertosL2} / ${fila.cache.fallosL2} (${hrL2})`;
        }

        const speedup = fila.aceleracionVsVonNeumann != null ? `${fila.aceleracionVsVonNeumann}x` : 'N/A';

        tr.innerHTML = `
            <td>${fila.arquitectura}</td>
            <td>${fila.modo}</td>
            <td>${fila.instrucciones}</td>
            <td><strong>${fila.ciclosTotales}</strong></td>
            <td>${fila.cpi}</td>
            <td>${fila.ciclosEsperaRecurso}</td>
            <td>${txtL1I}</td>
            <td>${txtL1D}</td>
            <td>${txtL2}</td>
            <td><strong>${speedup}</strong></td>
        `;
        cuerpo.appendChild(tr);
    });

    seccion.scrollIntoView({ behavior: 'smooth' });
}

// calcula el porcentaje de aciertos (Hit Rate) sobre el total de accesos al nivel de cache
function calcularPorcentaje(aciertos, fallos) {
    const total = aciertos + fallos;
    if (total === 0) return '0.0%';
    return ((aciertos / total) * 100).toFixed(1) + '%';
}

// actualiza los contadores porcentajes de Hit Rate y bloques visuales de L1I L1D y L2
function actualizarPanelCache(dto) {
    if (dto.arquitectura === "Harvard modificada" && dto.cache) {
        document.getElementById('statsCache').style.display = 'block';

        document.getElementById('valL1iAc').innerText = dto.cache.aciertosL1I;
        document.getElementById('valL1iFa').innerText = dto.cache.fallosL1I;
        document.getElementById('valL1iHr').innerText = calcularPorcentaje(dto.cache.aciertosL1I, dto.cache.fallosL1I);

        document.getElementById('valL1dAc').innerText = dto.cache.aciertosL1D;
        document.getElementById('valL1dFa').innerText = dto.cache.fallosL1D;
        document.getElementById('valL1dHr').innerText = calcularPorcentaje(dto.cache.aciertosL1D, dto.cache.fallosL1D);

        document.getElementById('valL2Ac').innerText = dto.cache.aciertosL2;
        document.getElementById('valL2Fa').innerText = dto.cache.fallosL2;
        document.getElementById('valL2Hr').innerText = calcularPorcentaje(dto.cache.aciertosL2, dto.cache.fallosL2);

        renderizarMonitorCache('gridL1I', dto.cache.estadoL1I);
        renderizarMonitorCache('gridL1D', dto.cache.estadoL1D);
        renderizarMonitorCache('gridL2', dto.cache.estadoL2);
    } else {
        document.getElementById('statsCache').style.display = 'none';
    }
}

// refresca todos los indicadores de la interfaz tras recibir el estado desde el servidor
function actualizarUI(dto) {
    document.getElementById('valPc').innerText = dto.pc;
    document.getElementById('valIr').innerText = dto.ir;
    document.getElementById('valAcum').innerText = dto.acumulador;
    document.getElementById('valMar').innerText = dto.mar;
    document.getElementById('valMdr').innerText = dto.mdr;

    document.getElementById('flagZ').innerText = `Z:${dto.flags.z ? 1 : 0}`;
    document.getElementById('flagN').innerText = `N:${dto.flags.n ? 1 : 0}`;
    document.getElementById('flagC').innerText = `C:${dto.flags.c ? 1 : 0}`;
    document.getElementById('flagV').innerText = `V:${dto.flags.v ? 1 : 0}`;

    document.getElementById('valCiclos').innerText = dto.ciclosReloj;
    document.getElementById('valInst').innerText = dto.instruccionesEjecutadas;
    document.getElementById('valCpi').innerText = dto.cpi;
    document.getElementById('valPerdida').innerText = dto.ciclosEsperaRecurso;

    actualizarPanelCache(dto);

    agregarLog(`[PC: ${dto.pc}] ${dto.logOperacion}`);

    actualizarCuadriculasMemoria(dto);

    if (dto.eventos && dto.eventos.length > 0) {
        animarFasesPipeline(dto);
    }

    if (dto.finalizado) {
        document.getElementById('btnPaso').disabled = true;
        document.getElementById('btnEjecutarTodo').disabled = true;
        if (dto.error) {
            agregarLog(`FALLO DETECTADO: ${dto.error}`);
        }
    }
}

// decide que arreglos de memoria renderizar segun la arquitectura activa
function actualizarCuadriculasMemoria(dto) {
    if (dto.arquitectura === "Von Neumann" || dto.arquitectura === "Harvard modificada") {
        actualizarCuadricula('memoria-principal', dto.memoriaPrincipal, dto.desensamblado, dto.pc);
    } else if (dto.arquitectura === "Harvard") {
        actualizarCuadricula('memoria-inst', dto.memoriaInstrucciones, dto.desensamblado, dto.pc);
        actualizarCuadricula('memoria-datos', dto.memoriaDatos, null, dto.mar);
    }
}

// construye el diagrama fisico de componentes y buses incluyendo la cache L2 unificada
function renderizarEstructuraMemoria(tipo) {
    const lienzoGrid = document.getElementById('lienzoMemoria');
    const lienzoDiagrama = document.getElementById('diagrama-visual');
    lienzoGrid.innerHTML = '';

    if (tipo === 'VON_NEUMANN') {
        lienzoDiagrama.innerHTML = `
            <div class="diagrama-clasico">
                <div class="componente-fisico" style="border-color: #8b5cf6; color: #8b5cf6;">Memoria Unificada (RAM)</div>
                <div id="bus-unico" class="bus-vertical"></div>
                <div class="fila-diagrama">
                    <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b; padding: 10px; min-width: 100px;">Entrada</div>
                    <div id="bus-in" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #3b82f6; color: #3b82f6; border-width: 4px; flex-grow: 1;">CPU</div>
                    <div id="bus-out" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #10b981; color: #10b981; padding: 10px; min-width: 100px;">Salida</div>
                </div>
            </div>
        `;
        lienzoGrid.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria Principal Unificada (Instrucciones + Datos)</h3>
                <div id="memoria-principal" class="grid-memoria"></div>
            </div>
        `;
    } else if (tipo === 'HARVARD') {
        lienzoDiagrama.innerHTML = `
            <div class="diagrama-clasico">
                <div class="componente-fisico" style="border-color: #8b5cf6; color: #8b5cf6;">Memoria Instrucciones</div>
                <div id="bus-inst" class="bus-vertical"></div>
                <div class="fila-diagrama">
                    <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b; padding: 10px; min-width: 100px;">Entrada</div>
                    <div id="bus-in" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #3b82f6; color: #3b82f6; border-width: 4px; flex-grow: 1;">CPU</div>
                    <div id="bus-out" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #10b981; color: #10b981; padding: 10px; min-width: 100px;">Salida</div>
                </div>
                <div id="bus-datos" class="bus-vertical"></div>
                <div class="componente-fisico" style="border-color: #ec4899; color: #ec4899;">Memoria Datos</div>
            </div>
        `;
        lienzoGrid.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria Instrucciones</h3>
                <div id="memoria-inst" class="grid-memoria"></div>
            </div>
            <div class="bloque-memoria">
                <h3>Memoria Datos</h3>
                <div id="memoria-datos" class="grid-memoria"></div>
            </div>
        `;
    } else if (tipo === 'HARVARD_MODIFICADA') {
        lienzoDiagrama.innerHTML = `
             <div class="diagrama-clasico" style="display:grid; grid-template-columns: 1fr 1fr; justify-items: center; align-items:center; gap: 8px;">
                <div class="componente-fisico" style="border-color: #10b981; color: #059669;">Cache L1I (Instrucciones)</div>
                <div class="componente-fisico" style="border-color: #10b981; color: #059669;">Cache L1D (Datos)</div>
                <div id="bus-inst" class="bus-vertical" style="grid-column: 1;"></div>
                <div id="bus-datos" class="bus-vertical" style="grid-column: 2;"></div>
                
                <div class="fila-diagrama" style="grid-column: 1 / span 2; width: 100%;">
                    <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b; padding: 10px; min-width: 100px;">Entrada</div>
                    <div id="bus-in" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="grid-column: 1 / span 2; border-color: #3b82f6; color: #3b82f6; border-width: 4px; flex-grow:1;">CPU</div>
                    <div id="bus-out" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #10b981; color: #10b981; padding: 10px; min-width: 100px;">Salida</div>
                </div>

                <div id="bus-l2" class="bus-vertical" style="grid-column: 1 / span 2;"></div>
                <div class="componente-fisico" style="grid-column: 1 / span 2; border-color: #f59e0b; color: #d97706; width: 65%;">Cache L2 Unificada</div>

                <div id="bus-ram" class="bus-vertical" style="grid-column: 1 / span 2;"></div>
                <div class="componente-fisico" style="grid-column: 1 / span 2; border-color: #8b5cf6; color: #8b5cf6; width: 85%;">Memoria Principal Unificada (RAM)</div>
            </div>
        `;
        lienzoGrid.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria Principal RAM (Instrucciones + Datos)</h3>
                <div id="memoria-principal" class="grid-memoria"></div>
            </div>
        `;
    }
}

// anima el recorrido de los paquetes de datos por los buses L1 L2 y RAM segun donde ocurrio el acierto o fallo
function animarFasesPipeline(dto) {
    const eventos = dto.eventos;
    const evtFetch = eventos.find(e => e.fase === "FETCH");
    const evtRead = eventos.find(e => e.fase === "MEM_LECTURA");
    const evtWrite = eventos.find(e => e.fase === "MEM_ESCRITURA");

    if (dto.instruccionesEjecutadas === 1) {
        dispararAnimacion('bus-in', 'horizontal', 'ida', '#f59e0b', 0);
    }
    if (dto.ir.startsWith("HALT")) {
        dispararAnimacion('bus-out', 'horizontal', 'ida', '#10b981', 0);
    }

    let delayBasico = 0;

    if (dto.arquitectura === "Von Neumann") {
        if (evtFetch) {
            dispararAnimacion('bus-unico', 'vertical', 'abajo', '#8b5cf6', 0);
            delayBasico = 800;
        }
        if (evtRead) {
            dispararAnimacion('bus-unico', 'vertical', 'abajo', '#ec4899', delayBasico);
        } else if (evtWrite) {
            dispararAnimacion('bus-unico', 'vertical', 'arriba', '#ef4444', delayBasico);
        }
    } else if (dto.arquitectura === "Harvard") {
        if (evtFetch) dispararAnimacion('bus-inst', 'vertical', 'abajo', '#8b5cf6', 0);
        let delayDatos = (dto.modo === 'SECUENCIAL') ? 800 : 0;
        if (evtRead) {
            dispararAnimacion('bus-datos', 'vertical', 'arriba', '#ec4899', delayDatos);
        } else if (evtWrite) {
            dispararAnimacion('bus-datos', 'vertical', 'abajo', '#ef4444', delayDatos);
        }
    } else if (dto.arquitectura === "Harvard modificada") {
        // animacion para lectura de instrucciones a traves de L1I L2 y RAM
        if (evtFetch) {
            if (evtFetch.recurso === "L1I") {
                dispararAnimacion('bus-inst', 'vertical', 'abajo', '#10b981', 0);
            } else if (evtFetch.recurso === "L1I->L2") {
                dispararAnimacion('bus-l2', 'vertical', 'arriba', '#f59e0b', 0);
                dispararAnimacion('bus-inst', 'vertical', 'abajo', '#f59e0b', 300);
            } else {
                dispararAnimacion('bus-ram', 'vertical', 'arriba', '#8b5cf6', 0);
                dispararAnimacion('bus-l2', 'vertical', 'arriba', '#8b5cf6', 250);
                dispararAnimacion('bus-inst', 'vertical', 'abajo', '#8b5cf6', 500);
            }
        }

        let delayDatos = (dto.modo === 'SECUENCIAL') ? 700 : 0;
        // animacion para lectura de datos a traves de L1D L2 y RAM
        if (evtRead) {
            if (evtRead.recurso === "L1D") {
                dispararAnimacion('bus-datos', 'vertical', 'abajo', '#10b981', delayDatos);
            } else if (evtRead.recurso === "L1D->L2") {
                dispararAnimacion('bus-l2', 'vertical', 'arriba', '#f59e0b', delayDatos);
                dispararAnimacion('bus-datos', 'vertical', 'abajo', '#f59e0b', delayDatos + 300);
            } else {
                dispararAnimacion('bus-ram', 'vertical', 'arriba', '#ec4899', delayDatos);
                dispararAnimacion('bus-l2', 'vertical', 'arriba', '#ec4899', delayDatos + 250);
                dispararAnimacion('bus-datos', 'vertical', 'abajo', '#ec4899', delayDatos + 500);
            }
        } else if (evtWrite) {
            // animacion de escritura Write-Through atravesando L1D L2 y llegando a RAM
            dispararAnimacion('bus-datos', 'vertical', 'arriba', '#ef4444', delayDatos);
            dispararAnimacion('bus-l2', 'vertical', 'abajo', '#ef4444', delayDatos + 250);
            dispararAnimacion('bus-ram', 'vertical', 'abajo', '#ef4444', delayDatos + 500);
        }
    }
}

// ejecuta la animacion CSS de una esfera de datos moviendose por un bus fisico
function dispararAnimacion(idBus, orientacion, direccion, color, delayMs) {
    const bus = document.getElementById(idBus);
    if (!bus) return;

    setTimeout(() => {
        const paquete = document.createElement('div');
        paquete.className = orientacion === 'horizontal' ? 'paquete-h' : 'paquete-v';
        paquete.style.backgroundColor = color;
        paquete.style.color = color;
        bus.appendChild(paquete);

        let trayecto = [];
        if (orientacion === 'horizontal') {
            trayecto = (direccion === 'ida')
                ? [{ left: '0%' }, { left: 'calc(100% - 20px)' }]
                : [{ left: 'calc(100% - 20px)' }, { left: '0%' }];
        } else {
            trayecto = (direccion === 'abajo')
                ? [{ top: '0%' }, { top: 'calc(100% - 20px)' }]
                : [{ top: 'calc(100% - 20px)' }, { top: '0%' }];
        }

        const animacion = paquete.animate(trayecto, {
            duration: 650,
            easing: 'ease-in-out',
            fill: 'forwards'
        });

        animacion.onfinish = () => paquete.remove();
    }, delayMs);
}

// dibuja las celdas de memoria resaltando la posicion actual del PC o MAR
function actualizarCuadricula(idContenedor, arrayDatos, desensamblado, resaltadoIndex) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor || !arrayDatos) return;

    contenedor.innerHTML = '';
    arrayDatos.forEach((dato, index) => {
        const celda = document.createElement('div');
        celda.className = 'celda';

        if (dato !== 0) celda.classList.add('celda-activa');
        if (index === resaltadoIndex) celda.classList.add('celda-pc');

        let valorMostrar = (desensamblado && desensamblado[index]) ? desensamblado[index] : dato;

        celda.innerHTML = `<small>${index}</small><br><strong>${valorMostrar}</strong>`;
        contenedor.appendChild(celda);
    });
}

// inserta una nueva entrada al inicio del historial de operaciones
function agregarLog(mensaje) {
    const lista = document.getElementById('listaLogs');
    const item = document.createElement('li');
    item.innerHTML = mensaje.replace(/->/g, '<span style="color:#435cda; font-weight:bold;">-&gt;</span>');
    lista.prepend(item);
}

// limpia todos los valores visuales antes de comenzar una nueva simulacion
function resetearUI() {
    document.getElementById('valPc').innerText = "0";
    document.getElementById('valIr').innerText = "NOP";
    document.getElementById('valAcum').innerText = "0";
    document.getElementById('valMar').innerText = "0";
    document.getElementById('valMdr').innerText = "0";
    document.getElementById('valCiclos').innerText = "0";
    document.getElementById('valInst').innerText = "0";
    document.getElementById('valCpi').innerText = "0.0";
    document.getElementById('valPerdida').innerText = "0";
    document.getElementById('listaLogs').innerHTML = "";
    document.getElementById('lienzoMemoria').innerHTML = "";

    document.getElementById('flagZ').innerText = "Z:0";
    document.getElementById('flagN').innerText = "N:0";
    document.getElementById('flagC').innerText = "C:0";
    document.getElementById('flagV').innerText = "V:0";

    document.getElementById('valL1iAc').innerText = "0";
    document.getElementById('valL1iFa').innerText = "0";
    document.getElementById('valL1iHr').innerText = "0.0%";
    document.getElementById('valL1dAc').innerText = "0";
    document.getElementById('valL1dFa').innerText = "0";
    document.getElementById('valL1dHr').innerText = "0.0%";
    document.getElementById('valL2Ac').innerText = "0";
    document.getElementById('valL2Fa').innerText = "0";
    document.getElementById('valL2Hr').innerText = "0.0%";

    document.getElementById('gridL1I').innerHTML = "";
    document.getElementById('gridL1D').innerHTML = "";
    document.getElementById('gridL2').innerHTML = "";
}

// dibuja los bloques presentes en cada cache donde el primero en rojo es el candidato a reemplazo
function renderizarMonitorCache(idContenedor, lineas) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '';

    if (!lineas || lineas.length === 0) {
        contenedor.innerHTML = '<span style="font-size:0.85em; color:#2c3e75; opacity:0.6; padding: 4px;">[ Cache Vacia ]</span>';
        return;
    }

    lineas.forEach(dir => {
        const celda = document.createElement('div');
        celda.className = 'celda-cache';
        celda.innerText = `Dir: ${dir}`;
        contenedor.appendChild(celda);
    });
}