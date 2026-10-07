const API_URL = 'http://localhost:8080/api/simulador';

async function iniciarSimulador() {
    const tipo = document.getElementById('arquitecturaSelect').value;
    
    try {
        const response = await fetch(`${API_URL}/iniciar?tipo=${tipo}`, { method: 'POST' });
        
        if (response.ok) {
            document.getElementById('btnPaso').disabled = false;
            resetearUI();
            agregarLog(`--- Simulador inicializado en modo: ${tipo} ---`);
            renderizarEstructuraMemoria(tipo);
        } else {
            alert("Error al iniciar el simulador en el backend.");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Asegúrate de que Spring Boot esté corriendo en el puerto 8080.");
    }
}

async function siguientePaso() {
    try {
        const response = await fetch(`${API_URL}/paso`);
        if (response.ok) {
            const dto = await response.json();
            actualizarUI(dto);
        }
    } catch (error) {
        console.error("Error al obtener el siguiente paso:", error);
    }
}

function actualizarUI(dto) {
    document.getElementById('valPc').innerText = dto.pc;
    document.getElementById('valIr').innerText = dto.ir;
    document.getElementById('valAcum').innerText = dto.acumulador;
    document.getElementById('valCiclos').innerText = dto.ciclosReloj;

    agregarLog(`[PC: ${dto.pc}] ${dto.logOperacion}`);

    if (dto.arquitectura === "Von Neumann") {
        actualizarCuadricula('memoria-principal', dto.memoriaPrincipal, dto.pc);
    } else {
        actualizarCuadricula('memoria-inst', dto.memoriaInstrucciones, dto.pc);
        actualizarCuadricula('memoria-datos', dto.memoriaDatos, -1); 
    }

    // ¡NUEVO!: Ejecutar la animación física según la instrucción leída
    animarFlujoDeDatos(dto);
}

function renderizarEstructuraMemoria(tipo) {
    const lienzoGrid = document.getElementById('lienzoMemoria');
    const lienzoDiagrama = document.getElementById('diagrama-visual');
    lienzoGrid.innerHTML = ''; 

    if (tipo === 'VON_NEUMANN') {
        lienzoDiagrama.innerHTML = `
            <div class="diagrama-clasico">
                <div class="componente-fisico" style="border-color: #8b5cf6; color: #8b5cf6;">Memoria Principal</div>
                <div id="bus-unico" class="bus-vertical"></div>
                <div class="fila-diagrama">
                    <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b;">Dispositivo de Entrada</div>
                    <div id="bus-in" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #3b82f6; color: #3b82f6; border-width: 4px;">Unidad Central de Proceso (CPU)</div>
                    <div id="bus-out" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #10b981; color: #10b981;">Dispositivo de Salida</div>
                </div>
            </div>
        `;
        lienzoGrid.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria Principal (Instrucciones + Datos)</h3>
                <div id="memoria-principal" class="grid-memoria"></div>
            </div>
        `;
    } else {
        // En Harvard, la CPU está en el centro, rodeada por 4 componentes
        lienzoDiagrama.innerHTML = `
            <div class="diagrama-clasico">
                <div class="componente-fisico" style="border-color: #8b5cf6; color: #8b5cf6;">Memoria de Instrucciones</div>
                <div id="bus-inst" class="bus-vertical"></div>
                <div class="fila-diagrama">
                    <div class="componente-fisico" style="border-color: #f59e0b; color: #f59e0b;">Dispositivo de Entrada</div>
                    <div id="bus-in" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #3b82f6; color: #3b82f6; border-width: 4px;">Unidad Central de Proceso (CPU)</div>
                    <div id="bus-out" class="bus-horizontal"></div>
                    <div class="componente-fisico" style="border-color: #10b981; color: #10b981;">Dispositivo de Salida</div>
                </div>
                <div id="bus-datos" class="bus-vertical"></div>
                <div class="componente-fisico" style="border-color: #ec4899; color: #ec4899;">Memoria de Datos</div>
            </div>
        `;
        lienzoGrid.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria de Instrucciones</h3>
                <div id="memoria-inst" class="grid-memoria"></div>
            </div>
            <div class="bloque-memoria">
                <h3>Memoria de Datos</h3>
                <div id="memoria-datos" class="grid-memoria"></div>
            </div>
        `;
    }
}

function animarFlujoDeDatos(dto) {
    const opcode = dto.ir.split(" ")[0]; 
    if (opcode === "NOP") return;

    // Efecto visual: Al ejecutar la primera instrucción, simulamos que los datos entran por el Input
    if (dto.pc === 1 && dto.ciclosReloj <= 2) {
        dispararAnimacion('bus-in', 'horizontal', 'ida', '#f59e0b'); // Naranja
    }

    // Efecto visual: Al terminar el programa, simulamos que el resultado va al Output
    if (opcode === "HALT") {
        dispararAnimacion('bus-out', 'horizontal', 'ida', '#10b981'); // Verde
        return;
    }

    if (dto.arquitectura === "Von Neumann") {
        // Fetch: Memoria Principal (Arriba) -> CPU (Abajo)
        dispararAnimacion('bus-unico', 'vertical', 'abajo', '#8b5cf6'); // Morado

        // Execute: Esperamos 1 ciclo simulado
        setTimeout(() => {
            if (opcode === "LOAD" || opcode === "ADD") {
                dispararAnimacion('bus-unico', 'vertical', 'abajo', '#ec4899'); // Dato viajando (Mem -> CPU)
            } else if (opcode === "STORE") {
                dispararAnimacion('bus-unico', 'vertical', 'arriba', '#ec4899'); // Dato viajando (CPU -> Mem)
            }
        }, 900); 

    } else {
        // Fetch: Memoria Inst (Arriba) -> CPU (Abajo)
        dispararAnimacion('bus-inst', 'vertical', 'abajo', '#8b5cf6'); // Morado

        // Execute: Memoria Datos (Abajo) <-> CPU (Arriba) EN PARALELO
        if (opcode === "LOAD" || opcode === "ADD") {
            dispararAnimacion('bus-datos', 'vertical', 'arriba', '#ec4899'); // Mem Datos -> CPU
        } else if (opcode === "STORE") {
            dispararAnimacion('bus-datos', 'vertical', 'abajo', '#ec4899'); // CPU -> Mem Datos
        }
    }
}

function dispararAnimacion(idBus, orientacion, direccion, color) {
    const bus = document.getElementById(idBus);
    if (!bus) return;

    const paquete = document.createElement('div');
    paquete.className = orientacion === 'horizontal' ? 'paquete-h' : 'paquete-v';
    paquete.style.backgroundColor = color;
    paquete.style.color = color;
    bus.appendChild(paquete);

    let trayecto = [];
    if (orientacion === 'horizontal') {
        if (direccion === 'ida') { // De izquierda a derecha
            trayecto = [ { left: '0%' }, { left: 'calc(100% - 20px)' } ];
        } else { // De derecha a izquierda
            trayecto = [ { left: 'calc(100% - 20px)' }, { left: '0%' } ];
        }
    } else {
        if (direccion === 'abajo') { // De arriba hacia abajo
            trayecto = [ { top: '0%' }, { top: 'calc(100% - 20px)' } ];
        } else { // De abajo hacia arriba
            trayecto = [ { top: 'calc(100% - 20px)' }, { top: '0%' } ];
        }
    }

    const animacion = paquete.animate(trayecto, {
        duration: 800,
        easing: 'ease-in-out',
        fill: 'forwards'
    });

    animacion.onfinish = () => paquete.remove();
}

// Añadimos el parámetro pcActual
function actualizarCuadricula(idContenedor, arrayDatos, pcActual) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor || !arrayDatos) return;
    
    contenedor.innerHTML = '';
    arrayDatos.forEach((dato, index) => {
        const celda = document.createElement('div');
        celda.className = 'celda';
        
        // Resaltar celdas que contienen datos/instrucciones
        if(dato !== 0) celda.classList.add('celda-activa');
        
        // ¡NUEVO!: Resaltar intensamente la celda actual que lee la CPU
        if(index === pcActual) celda.classList.add('celda-pc'); 

        celda.innerHTML = `<small>${index}</small><br><strong>${dato}</strong>`;
        contenedor.appendChild(celda);
    });
}

function agregarLog(mensaje) {
    const lista = document.getElementById('listaLogs');
    const item = document.createElement('li');
    item.innerText = mensaje;
    lista.prepend(item); // Agrega al principio para ver lo más reciente
}

function resetearUI() {
    document.getElementById('valPc').innerText = "0";
    document.getElementById('valIr').innerText = "NOP";
    document.getElementById('valAcum').innerText = "0";
    document.getElementById('valCiclos').innerText = "0";
    document.getElementById('listaLogs').innerHTML = "";
    document.getElementById('lienzoMemoria').innerHTML = "";
}