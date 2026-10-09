const API_URL = 'http://localhost:8080/api/simulador';
let sessionId = null;

async function iniciarSimulador() {
    const tipo = document.getElementById('arquitecturaSelect').value;
    const modo = document.getElementById('modoSelect').value;
    const valA = document.getElementById('inputA').value || 0;
    const valB = document.getElementById('inputB').value || 0;
    
    try {
        const response = await fetch(`${API_URL}/iniciar?tipo=${tipo}&modo=${modo}&valorA=${valA}&valorB=${valB}`, { method: 'POST' });
        
        if (response.ok) {
            const resData = await response.json();
            sessionId = resData.sesionId; // Guardamos la sesión generada por el nuevo backend
            
            document.getElementById('btnPaso').disabled = false;
            resetearUI();
            document.getElementById('txtModo').innerText = resData.modo;
            agregarLog(`--- Simulador iniciado [${resData.tipo}] en modo [${resData.modo}] | Suma: ${valA} + ${valB} ---`);
            renderizarEstructuraMemoria(tipo);
            
            // Renderizamos los datos estáticos haciendo un fetch del estado actual
            const estadoRes = await fetch(`${API_URL}/estado?sesionId=${sessionId}`);
            const dto = await estadoRes.json();
            actualizarCuadriculasMemoria(dto);

        } else {
            const err = await response.json();
            alert(`Error al iniciar: ${err.mensaje}`);
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Asegúrate de que Spring Boot esté corriendo en el puerto 8080.");
    }
}

async function siguientePaso() {
    if(!sessionId) return;
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

function actualizarUI(dto) {
    // 1. Actualizar Registros CPU nuevos
    document.getElementById('valPc').innerText = dto.pc;
    document.getElementById('valIr').innerText = dto.ir;
    document.getElementById('valAcum').innerText = dto.acumulador;
    document.getElementById('valMar').innerText = dto.mar;
    document.getElementById('valMdr').innerText = dto.mdr;
    
    // Banderas (Flags)
    document.getElementById('flagZ').innerText = `Z:${dto.flags.z ? 1 : 0}`;
    document.getElementById('flagN').innerText = `N:${dto.flags.n ? 1 : 0}`;
    document.getElementById('flagC').innerText = `C:${dto.flags.c ? 1 : 0}`;
    document.getElementById('flagV').innerText = `V:${dto.flags.v ? 1 : 0}`;
    
    // Métricas
    document.getElementById('valCiclos').innerText = dto.ciclosReloj;
    document.getElementById('valCpi').innerText = dto.cpi;
    document.getElementById('valPerdida').innerText = dto.ciclosEsperaRecurso;

    // Caché (Si es Harvard Modificada)
    if(dto.arquitectura === "Harvard modificada") {
        document.getElementById('statsCache').style.display = 'block';
        document.getElementById('valL1iAc').innerText = dto.cache.aciertosL1I;
        document.getElementById('valL1iFa').innerText = dto.cache.fallosL1I;
        document.getElementById('valL1dAc').innerText = dto.cache.aciertosL1D;
        document.getElementById('valL1dFa').innerText = dto.cache.fallosL1D;
    } else {
        document.getElementById('statsCache').style.display = 'none';
    }

    // 2. Log de Operación detallado
    agregarLog(`[PC: ${dto.pc}] ${dto.logOperacion}`);

    // 3. Renderizado lógico
    actualizarCuadriculasMemoria(dto);

    // 4. Animación basada en Eventos de Pipeline (NUEVO BACKEND)
    if (dto.eventos && dto.eventos.length > 0) {
        animarFasesPipeline(dto);
    }
    
    if (dto.finalizado) {
         document.getElementById('btnPaso').disabled = true;
         if(dto.error) agregarLog(`❌ FALLO DETECTADO: ${dto.error}`);
    }
}

function actualizarCuadriculasMemoria(dto) {
    if (dto.arquitectura === "Von Neumann" || dto.arquitectura === "Harvard modificada") {
        actualizarCuadricula('memoria-principal', dto.memoriaPrincipal, dto.desensamblado, dto.pc);
    } else if (dto.arquitectura === "Harvard") {
        actualizarCuadricula('memoria-inst', dto.memoriaInstrucciones, dto.desensamblado, dto.pc);
        actualizarCuadricula('memoria-datos', dto.memoriaDatos, null, dto.mar); 
    }
}
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
                <h3>Memoria Principal (Instrucciones + Datos)</h3>
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
             <div class="diagrama-clasico" style="display:grid; grid-template-columns: 1fr 1fr; justify-items: center; align-items:center; gap: 10px;">
                <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b;">Caché L1 (Instrucciones)</div>
                <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b;">Caché L1 (Datos)</div>
                <div id="bus-inst" class="bus-vertical" style="grid-column: 1;"></div>
                <div id="bus-datos" class="bus-vertical" style="grid-column: 2;"></div>
                
                <div class="fila-diagrama" style="grid-column: 1 / span 2; width: 100%;">
                    <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b; padding: 10px; min-width: 100px;">Entrada</div>
                    <div id="bus-in" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="grid-column: 1 / span 2; border-color: #3b82f6; color: #3b82f6; border-width: 4px; flex-grow:1;">CPU</div>
                    <div id="bus-out" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #10b981; color: #10b981; padding: 10px; min-width: 100px;">Salida</div>
                </div>

                <div id="bus-ram" class="bus-vertical" style="grid-column: 1 / span 2; width: 60%; background-color: #94a3b8; height: 30px;"></div>
                <div class="componente-fisico" style="grid-column: 1 / span 2; border-color: #8b5cf6; color: #8b5cf6; width: 80%;">Memoria Unificada (RAM)</div>
            </div>
        `;
        lienzoGrid.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria Principal (Instrucciones + Datos)</h3>
                <div id="memoria-principal" class="grid-memoria"></div>
            </div>
        `;
    }
}

function animarFasesPipeline(dto) {
    const eventos = dto.eventos;
    const evtFetch = eventos.find(e => e.fase === "FETCH");
    const evtRead = eventos.find(e => e.fase === "MEM_LECTURA");
    const evtWrite = eventos.find(e => e.fase === "MEM_ESCRITURA");

    // Animaciones de I/O
    if (dto.instruccionesEjecutadas === 1) {
        dispararAnimacion('bus-in', 'horizontal', 'ida', '#f59e0b', 0); // Esfera Naranja al iniciar
    }
    if (dto.ir.startsWith("HALT")) {
        dispararAnimacion('bus-out', 'horizontal', 'ida', '#10b981', 0); // Esfera Verde al finalizar
    }

    let delayBasico = 0;

    if (dto.arquitectura === "Von Neumann") {
        if(evtFetch) {
            dispararAnimacion('bus-unico', 'vertical', 'abajo', '#8b5cf6', 0);
            delayBasico = 800;
        }
        if(evtRead) {
             dispararAnimacion('bus-unico', 'vertical', 'abajo', '#ec4899', delayBasico);
        } else if (evtWrite) {
             dispararAnimacion('bus-unico', 'vertical', 'arriba', '#ef4444', delayBasico);
        }
    } 
    else if (dto.arquitectura === "Harvard") {
         if(evtFetch) dispararAnimacion('bus-inst', 'vertical', 'abajo', '#8b5cf6', 0);
         let delayDatos = (dto.modo === 'SECUENCIAL') ? 800 : 0; 
         if(evtRead) {
             dispararAnimacion('bus-datos', 'vertical', 'arriba', '#ec4899', delayDatos);
         } else if (evtWrite) {
             dispararAnimacion('bus-datos', 'vertical', 'abajo', '#ef4444', delayDatos);
         }
    }
    else if (dto.arquitectura === "Harvard modificada") {
         if(evtFetch) {
             let color = evtFetch.detalle.includes("acierto") ? '#10b981' : '#8b5cf6';
             dispararAnimacion('bus-inst', 'vertical', 'abajo', color, 0);
             if(color === '#8b5cf6') dispararAnimacion('bus-ram', 'vertical', 'arriba', color, 0);
         }
         let delayDatos = (dto.modo === 'SECUENCIAL') ? 800 : 0;
         if(evtRead) {
             let color = evtRead.detalle.includes("acierto") ? '#10b981' : '#ec4899';
             dispararAnimacion('bus-datos', 'vertical', 'arriba', color, delayDatos);
             if(color === '#ec4899') dispararAnimacion('bus-ram', 'vertical', 'arriba', color, delayDatos);
         } else if (evtWrite) {
             dispararAnimacion('bus-datos', 'vertical', 'abajo', '#ef4444', delayDatos);
             dispararAnimacion('bus-ram', 'vertical', 'abajo', '#ef4444', delayDatos + 400); 
         }
    }
}

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
                ? [ { left: '0%' }, { left: 'calc(100% - 20px)' } ]
                : [ { left: 'calc(100% - 20px)' }, { left: '0%' } ];
        } else {
            trayecto = (direccion === 'abajo')
                ? [ { top: '0%' }, { top: 'calc(100% - 20px)' } ]
                : [ { top: 'calc(100% - 20px)' }, { top: '0%' } ];
        }

        const animacion = paquete.animate(trayecto, {
            duration: 800,
            easing: 'ease-in-out',
            fill: 'forwards'
        });

        animacion.onfinish = () => paquete.remove();
    }, delayMs);
}

function actualizarCuadricula(idContenedor, arrayDatos, desensamblado, resaltadoIndex) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor || !arrayDatos) return;
    
    contenedor.innerHTML = '';
    arrayDatos.forEach((dato, index) => {
        const celda = document.createElement('div');
        celda.className = 'celda';
        
        if(dato !== 0) celda.classList.add('celda-activa');
        if(index === resaltadoIndex) celda.classList.add('celda-pc'); 

        // Mostramos el texto decodificado (Ensamblador) si existe, sino el valor bruto en memoria
        let valorMostrar = (desensamblado && desensamblado[index]) ? desensamblado[index] : dato;

        celda.innerHTML = `<small>${index}</small><br><strong>${valorMostrar}</strong>`;
        contenedor.appendChild(celda);
    });
}

function agregarLog(mensaje) {
    const lista = document.getElementById('listaLogs');
    const item = document.createElement('li');
    item.innerHTML = mensaje.replace(/→/g, '<span style="color:#3b82f6; font-weight:bold;">→</span>'); // Resaltar flechas
    lista.prepend(item);
}

function resetearUI() {
    document.getElementById('valPc').innerText = "0";
    document.getElementById('valIr').innerText = "NOP";
    document.getElementById('valAcum').innerText = "0";
    document.getElementById('valMar').innerText = "0";
    document.getElementById('valMdr').innerText = "0";
    document.getElementById('valCiclos').innerText = "0";
    document.getElementById('valCpi').innerText = "0.0";
    document.getElementById('valPerdida').innerText = "0";
    document.getElementById('listaLogs').innerHTML = "";
    document.getElementById('lienzoMemoria').innerHTML = "";
    document.querySelectorAll('.flag').forEach(e => e.innerText = e.innerText[0] + ":0");
}