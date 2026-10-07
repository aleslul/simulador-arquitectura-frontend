 Gemini
Chat
Sparkbeta
Nuevo chat
Buscar chats
Estudiantes
Imágenes
Videos
Biblioteca
Nuevo cuaderno
Aleslul's Rice
Proyecyo DB
Todos los cuadernos
BIOETICA SEMANA 5,6 Y 7
EngDis bot
Simulador Von Neumann y Harvard en Java
Calificación de examen parcial de Morfofisiología
Calificación de Examen Parcial
Evaluación de Morfofisiología y Casos Clínicos
Conversación con Gemini

entonces el backend va a ser una simulacion de los componentes de cada arquitectura verdad?

Exactamente. El backend en Java no va a dibujar absolutamente nada en pantalla; su única responsabilidad será actuar como el "cerebro" lógico y matemático del simulador.

Tu backend se encargará exclusivamente de:

    Mantener el Estado: Guardar en sus objetos de Java el valor actual de los registros (Program Counter, Acumulador, etc.) y los datos que están almacenados en los arreglos que representan las memorias.

    Aplicar las Reglas Físicas: Determinar cuántos ciclos de reloj se consumen por instrucción basándose en las restricciones de diseño de la clase VonNeumann o el paralelismo de la clase Harvard.   
    PDF

    Servir los Datos (API): Exponer un endpoint que, cada vez que sea consultado por el navegador, ejecute un ciclo del procesador y devuelva un archivo JSON con la "foto" exacta de cómo quedaron todos los componentes en ese instante.

El frontend web, por su parte, será completamente "tonto" a nivel lógico. Solo consumirá ese JSON y se dedicará a la presentación visual: actualizar el texto de los registros en pantalla, iluminar los buses de datos correctos y pintar la cuadrícula de memoria según lo que dictó el backend.

Esta separación del modelo y la vista te garantiza un código mucho más limpio y facilita el trabajo de tu tester. ¿Tienes pensado usar algún framework específico para levantar la API en Java, como Spring Boot, o prefieres algo más minimalista como Javalin para no sobrecargar la configuración del proyecto?   
PDF

lo puedo hacer en springboot, dame el codigo de cada clase que necesitare para el backend

Para levantar este backend en Spring Boot, estructuraremos el código en tres capas principales: Modelos (el hardware simulado), Servicio (la lógica de negocio) y Controlador (la API REST).

Asegúrate de tener la dependencia spring-boot-starter-web en tu pom.xml.
1. Capa de Modelos (Componentes de Hardware)

Estos componentes representan los bloques físicos. Creamos primero la CPU y la Memoria.
Java

// Archivo: src/main/java/com/uss/simulador/model/Memoria.java
package com.uss.simulador.model;

public class Memoria {
    private int[] celdas;

    public Memoria(int tamano) {
        this.celdas = new int[tamano];
    }

    public int leer(int direccion) {
        return celdas[direccion];
    }

    public void escribir(int direccion, int dato) {
        celdas[direccion] = dato;
    }

    public int[] getEstadoCeldas() {
        return celdas;
    }
}

Java

// Archivo: src/main/java/com/uss/simulador/model/CPU.java
package com.uss.simulador.model;

public class CPU {
    private int pc; // Program Counter
    private String ir; // Instruction Register
    private int acumulador;

    public CPU() {
        this.pc = 0;
        this.ir = "NOP";
        this.acumulador = 0;
    }

    public int getPc() { return pc; }
    public void incrementarPc() { this.pc++; }
    
    public String getIr() { return ir; }
    public void setIr(String ir) { this.ir = ir; }
    
    public int getAcumulador() { return acumulador; }
    public void setAcumulador(int acumulador) { this.acumulador = acumulador; }
}

2. Capa de Arquitecturas (El núcleo de la simulación)

Aquí aplicamos la herencia para cumplir con el análisis comparativo del rendimiento. Usaremos un DTO (Data Transfer Object) para empaquetar el estado.   
PDF+ 1
Java

// Archivo: src/main/java/com/uss/simulador/dto/EstadoSimulacionDTO.java
package com.uss.simulador.dto;

public class EstadoSimulacionDTO {
    public String arquitectura;
    public int pc;
    public String ir;
    public int acumulador;
    public int ciclosReloj;
    
    // Arrays para renderizar la cuadrícula en el frontend
    public int[] memoriaPrincipal; 
    public int[] memoriaInstrucciones; 
    public int[] memoriaDatos; 
    public String logOperacion;
}

Java

// Archivo: src/main/java/com/uss/simulador/model/ArquitecturaBase.java
package com.uss.simulador.model;
import com.uss.simulador.dto.EstadoSimulacionDTO;

public abstract class ArquitecturaBase {
    protected CPU cpu;
    protected int ciclosReloj;

    public ArquitecturaBase() {
        this.cpu = new CPU();
        this.ciclosReloj = 0;
    }

    public abstract EstadoSimulacionDTO ejecutarPaso();
}

La implementación de Von Neumann penaliza el ciclo de reloj al usar un bus único.
Java

// Archivo: src/main/java/com/uss/simulador/model/VonNeumann.java
package com.uss.simulador.model;
import com.uss.simulador.dto.EstadoSimulacionDTO;

public class VonNeumann extends ArquitecturaBase {
    private Memoria memoriaPrincipal;

    public VonNeumann(int tamano) {
        super();
        this.memoriaPrincipal = new Memoria(tamano);
        // Simulamos cargar una instrucción dummy para la prueba
        this.memoriaPrincipal.escribir(0, 101); // 101 podría ser código de máquina para "LOAD"
    }

    @Override
    public EstadoSimulacionDTO ejecutarPaso() {
        // Fetch (usa el bus)
        int instruccion = memoriaPrincipal.leer(cpu.getPc());
        cpu.setIr("INSTR_" + instruccion);
        
        // Execute (si requiere datos, usa el MISMO bus, generando cuello de botella)
        cpu.setAcumulador(cpu.getAcumulador() + 1); // Operación dummy
        cpu.incrementarPc();
        
        // Se consumen 2 ciclos por la colisión de acceso
        this.ciclosReloj += 2; 

        EstadoSimulacionDTO dto = new EstadoSimulacionDTO();
        dto.arquitectura = "Von Neumann";
        dto.pc = cpu.getPc();
        dto.ir = cpu.getIr();
        dto.acumulador = cpu.getAcumulador();
        dto.ciclosReloj = this.ciclosReloj;
        dto.memoriaPrincipal = memoriaPrincipal.getEstadoCeldas();
        dto.logOperacion = "Fetch de Memoria Principal -> Execute. (2 ciclos de reloj)";
        
        return dto;
    }
}

La implementación de Harvard permite el paralelismo lógico.
Java

// Archivo: src/main/java/com/uss/simulador/model/Harvard.java
package com.uss.simulador.model;
import com.uss.simulador.dto.EstadoSimulacionDTO;

public class Harvard extends ArquitecturaBase {
    private Memoria memoriaInstrucciones;
    private Memoria memoriaDatos;

    public Harvard(int tamanoInst, int tamanoDat) {
        super();
        this.memoriaInstrucciones = new Memoria(tamanoInst);
        this.memoriaDatos = new Memoria(tamanoDat);
        this.memoriaInstrucciones.escribir(0, 202); 
    }

    @Override
    public EstadoSimulacionDTO ejecutarPaso() {
        // Fetch (bus de instrucciones) y Execute (bus de datos) en paralelo
        int instruccion = memoriaInstrucciones.leer(cpu.getPc());
        cpu.setIr("INSTR_" + instruccion);
        
        // Acceso simultáneo a datos
        int dato = memoriaDatos.leer(0);
        cpu.setAcumulador(cpu.getAcumulador() + dato + 1);
        cpu.incrementarPc();
        
        // Se consume solo 1 ciclo gracias a los buses separados
        this.ciclosReloj += 1; 

        EstadoSimulacionDTO dto = new EstadoSimulacionDTO();
        dto.arquitectura = "Harvard";
        dto.pc = cpu.getPc();
        dto.ir = cpu.getIr();
        dto.acumulador = cpu.getAcumulador();
        dto.ciclosReloj = this.ciclosReloj;
        dto.memoriaInstrucciones = memoriaInstrucciones.getEstadoCeldas();
        dto.memoriaDatos = memoriaDatos.getEstadoCeldas();
        dto.logOperacion = "Fetch y Data Read en paralelo. (1 ciclo de reloj)";
        
        return dto;
    }
}

3. Capa de Servicio (Gestión de la Sesión)

El servicio mantendrá la instancia del simulador activa mientras el frontend interactúa con ella.
Java

// Archivo: src/main/java/com/uss/simulador/service/SimuladorService.java
package com.uss.simulador.service;

import com.uss.simulador.model.*;
import com.uss.simulador.dto.EstadoSimulacionDTO;
import org.springframework.stereotype.Service;

@Service
public class SimuladorService {
    private ArquitecturaBase simuladorActivo;

    public void iniciarSimulador(String tipo) {
        if ("HARVARD".equalsIgnoreCase(tipo)) {
            simuladorActivo = new Harvard(16, 16); // Memorias de 16 espacios
        } else {
            simuladorActivo = new VonNeumann(32); // Memoria única de 32 espacios
        }
    }

    public EstadoSimulacionDTO ejecutarPaso() {
        if (simuladorActivo == null) {
            throw new IllegalStateException("El simulador no ha sido inicializado");
        }
        return simuladorActivo.ejecutarPaso();
    }
}

4. Capa de Controlador (Endpoints de la API)

Aquí usamos @CrossOrigin("*") para evitar problemas de CORS cuando tu frontend web, trabajando de manera aislada, intente comunicarse con la API de Java. Esto facilita el desarrollo en paralelo del equipo.   
PDF
Java

// Archivo: src/main/java/com/uss/simulador/controller/SimuladorController.java
package com.uss.simulador.controller;

import com.uss.simulador.dto.EstadoSimulacionDTO;
import com.uss.simulador.service.SimuladorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulador")
@CrossOrigin("*") // Permite que el frontend web consuma la API
public class SimuladorController {

    @Autowired
    private SimuladorService simuladorService;

    // Endpoint para iniciar la arquitectura (GET /api/simulador/iniciar?tipo=HARVARD)
    @PostMapping("/iniciar")
    public ResponseEntity<String> iniciar(@RequestParam String tipo) {
        try {
            simuladorService.iniciarSimulador(tipo);
            return ResponseEntity.ok("Simulador " + tipo + " iniciado correctamente.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al iniciar: " + e.getMessage());
        }
    }

    // Endpoint para avanzar un ciclo de reloj (GET /api/simulador/paso)
    @GetMapping("/paso")
    public ResponseEntity<EstadoSimulacionDTO> siguientePaso() {
        try {
            return ResponseEntity.ok(simuladorService.ejecutarPaso());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }
}

Con este código, el Programador Principal del equipo ya tiene la infraestructura de procesamiento lista. Solo necesitan levantar la aplicación Spring Boot y el diseñador frontend podrá interactuar enviando una petición POST a /iniciar y luego consultando GET a /paso para ver cómo cambian los contadores.   
PDF

ahora quiero armar el frontend para probar mi backend

Para construir la interfaz web que consumirá la API de tu backend en Spring Boot, utilizaremos HTML, CSS y JavaScript puro (Vanilla JS). Esto mantendrá el proyecto ligero y te permitirá cumplir con el requisito de incluir funciones interactivas para alternar entre ambas arquitecturas y visualizar sus diferencias.   
PDF

A continuación, tienes la estructura completa separada en tres archivos. Se han integrado iconos vectoriales limpios (Heroicons) para los controles de la simulación, manteniendo una interfaz profesional para tu sustentación.
1. Estructura de la Interfaz (index.html)

Este archivo define la vista. Contiene un panel de control, un panel de estado de la CPU y un lienzo donde se renderizarán los bloques de memoria dinámicamente según la arquitectura elegida.
HTML

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador de Arquitecturas - RA1</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Simulador de Arquitecturas de Computadoras</h1>
    </header>

    <main>
        <section class="panel-control">
            <div class="selector">
                <label for="arquitecturaSelect">Arquitectura:</label>
                <select id="arquitecturaSelect">
                    <option value="VON_NEUMANN">Von Neumann</option>
                    <option value="HARVARD">Harvard</option>
                </select>
            </div>
            
            <div class="botones">
                <button id="btnIniciar" onclick="iniciarSimulador()">
                    <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" /></svg>
                    Iniciar
                </button>
                <button id="btnPaso" onclick="siguientePaso()" disabled>
                    <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z" /></svg>
                    Siguiente Paso
                </button>
            </div>
        </section>

        <div class="contenedor-simulador">
            <!-- Estado de la CPU -->
            <section class="modulo cpu-card">
                <h2>Unidad Central de Procesamiento (CPU)</h2>
                <div class="registros">
                    <div class="registro"><span>PC:</span> <span id="valPc">0</span></div>
                    <div class="registro"><span>IR:</span> <span id="valIr">NOP</span></div>
                    <div class="registro"><span>Acumulador:</span> <span id="valAcum">0</span></div>
                </div>
                <div class="metricas">
                    <h3>Métricas de Rendimiento</h3>
                    <p>Ciclos de Reloj: <strong id="valCiclos" class="highlight">0</strong></p>
                </div>
            </section>

            <!-- Lienzo de Memoria -->
            <section id="lienzoMemoria" class="modulo memoria-container">
                <!-- Se inyecta por JS -->
            </section>
        </div>

        <section class="log-operaciones">
            <h2>Registro de Flujo de Datos</h2>
            <ul id="listaLogs"></ul>
        </section>
    </main>

    <script src="app.js"></script>
</body>
</html>

2. Lógica de Integración (app.js)

Este script se encarga de hacer las peticiones fetch a tu API en Spring Boot y actualizar el DOM con el DTO recibido. Cumple con la función de visualizar el flujo de datos y las diferencias en el uso de memoria.   
PDF+ 1
JavaScript

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
    // 1. Actualizar Registros CPU
    document.getElementById('valPc').innerText = dto.pc;
    document.getElementById('valIr').innerText = dto.ir;
    document.getElementById('valAcum').innerText = dto.acumulador;
    document.getElementById('valCiclos').innerText = dto.ciclosReloj;

    // 2. Actualizar Log
    agregarLog(`[PC: ${dto.pc}] ${dto.logOperacion}`);

    // 3. Renderizar bloques de memoria
    if (dto.arquitectura === "Von Neumann") {
        actualizarCuadricula('memoria-principal', dto.memoriaPrincipal);
    } else {
        actualizarCuadricula('memoria-inst', dto.memoriaInstrucciones);
        actualizarCuadricula('memoria-datos', dto.memoriaDatos);
    }
}

function renderizarEstructuraMemoria(tipo) {
    const lienzo = document.getElementById('lienzoMemoria');
    lienzo.innerHTML = ''; // Limpiar lienzo

    if (tipo === 'VON_NEUMANN') {
        lienzo.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria Principal (Instrucciones + Datos)</h3>
                <div id="memoria-principal" class="grid-memoria"></div>
            </div>
        `;
    } else {
        lienzo.innerHTML = `
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

function actualizarCuadricula(idContenedor, arrayDatos) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor || !arrayDatos) return;
    
    contenedor.innerHTML = '';
    arrayDatos.forEach((dato, index) => {
        const celda = document.createElement('div');
        celda.className = 'celda';
        // Resaltar celdas que no están vacías (0)
        if(dato !== 0) celda.classList.add('celda-activa');
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

3. Diseño y Estilos (styles.css)

Se define un diseño responsivo utilizando CSS Grid y Flexbox. Las celdas de memoria se iluminarán cuando contengan información.
CSS

:root {
    --bg-color: #f4f4f9;
    --primary: #0f172a;
    --secondary: #3b82f6;
    --accent: #10b981;
    --text: #333;
    --border: #e2e8f0;
}

body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background-color: var(--bg-color);
    color: var(--text);
    margin: 0;
    padding: 20px;
}

header {
    text-align: center;
    margin-bottom: 30px;
}

.panel-control {
    display: flex;
    justify-content: space-between;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.botones {
    display: flex;
    gap: 10px;
}

button {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: var(--secondary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s;
}

button:hover:not(:disabled) {
    background-color: #2563eb;
}

button:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
}

.icon {
    width: 20px;
    height: 20px;
}

.contenedor-simulador {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
    margin-bottom: 20px;
}

.modulo {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.registros {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
}

.registro {
    background: var(--bg-color);
    padding: 10px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    font-family: monospace;
    font-size: 1.1em;
}

.highlight {
    color: var(--accent);
    font-size: 1.5em;
}

.memoria-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.grid-memoria {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 5px;
    margin-top: 10px;
}

.celda {
    background: var(--bg-color);
    border: 1px solid var(--border);
    text-align: center;
    padding: 8px;
    border-radius: 4px;
    font-family: monospace;
}

.celda-activa {
    background: #dbeafe;
    border-color: #93c5fd;
    color: #1e3a8a;
}

.log-operaciones {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    max-height: 250px;
    overflow-y: auto;
}

.log-operaciones ul {
    list-style-type: none;
    padding: 0;
}

.log-operaciones li {
    padding: 8px;
    border-bottom: 1px solid var(--border);
    font-family: monospace;
}

Con estos tres archivos, asegúrate de tener tu servidor de Spring Boot corriendo. Al abrir el index.html en el navegador, podrás hacer clic en "Iniciar", lo que renderizará gráficamente los arreglos de memoria. Al presionar "Siguiente Paso", verás cómo se actualizan los registros de la CPU, cómo las celdas de memoria se rellenan con datos reales provistos por el backend, y lo más importante: cómo el contador de "Ciclos de Reloj" avanza más rápido en la arquitectura Von Neumann que en la Harvard, permitiendo capturar evidencia cuantitativa clara para la sección de Resultados del informe final.   
PDF

como levanto el backend? se tiene que configurar el aplication.properties?

Para este simulador, no es estrictamente necesario configurar el application.properties, ya que al usar la dependencia spring-boot-starter-web, Spring Boot levanta automáticamente un servidor Tomcat en el puerto 8080 por defecto. Este es exactamente el puerto al que apunta la URL del fetch en el código de tu frontend (http://localhost:8080/api/simulador).

Si deseas dejar la configuración explícita por buenas prácticas, puedes abrir el archivo src/main/resources/application.properties y agregar lo siguiente:
Properties

# Puerto del servidor (opcional, 8080 es el valor por defecto)
server.port=8080

# Nombre de la aplicación (opcional)
spring.application.name=simulador-arquitecturas

Para levantar el backend, tienes dos métodos principales dependiendo de tu entorno de trabajo:

Opción 1: Desde tu IDE (IntelliJ IDEA, Eclipse o VS Code)
Busca la clase principal de tu proyecto (suele llamarse SimuladorApplication.java), la cual contiene la anotación @SpringBootApplication y el método public static void main(String[] args). Haz clic derecho sobre este archivo o sobre el ícono de reproducción verde en el editor y selecciona Run.

Opción 2: Desde la terminal usando Maven
Abre una terminal en la carpeta raíz de tu proyecto (donde se encuentra el archivo pom.xml) y ejecuta el siguiente comando:

    Si tienes Maven instalado globalmente: mvn spring-boot:run

    Si usas el wrapper de Maven incluido en el proyecto: ./mvnw spring-boot:run (en Linux/Mac) o mvnw.cmd spring-boot:run (en Windows).

Una vez que ejecutes cualquiera de las opciones, verás que la consola empieza a imprimir logs. Cuando aparezca un mensaje similar a Tomcat started on port(s): 8080 (http) o Started SimuladorApplication in X seconds, tu backend estará activo.

A partir de ese momento, solo necesitas abrir tu archivo index.html en cualquier navegador web. Al hacer clic en el botón "Iniciar", el frontend se conectará exitosamente a tu API en Spring Boot sin dar errores de conexión.

C:\Users\Alessandro\.jdks\openjdk-26\bin\java.exe -XX:TieredStopAtLevel=1 -Dspring.output.ansi.enabled=always "-javaagent:C:\Users\Alessandro\AppData\Local\Programs\IntelliJ IDEA\lib\idea_rt.jar=60982" -Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8 -classpath D:\Programación\Proyectos\WEB\simulador\target\classes;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-starter-webmvc\4.1.1\spring-boot-starter-webmvc-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-starter\4.1.1\spring-boot-starter-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-starter-logging\4.1.1\spring-boot-starter-logging-4.1.1.jar;C:\Users\Alessandro\.m2\repository\ch\qos\logback\logback-classic\1.5.38\logback-classic-1.5.38.jar;C:\Users\Alessandro\.m2\repository\ch\qos\logback\logback-core\1.5.38\logback-core-1.5.38.jar;C:\Users\Alessandro\.m2\repository\org\apache\logging\log4j\log4j-to-slf4j\2.25.5\log4j-to-slf4j-2.25.5.jar;C:\Users\Alessandro\.m2\repository\org\apache\logging\log4j\log4j-api\2.25.5\log4j-api-2.25.5.jar;C:\Users\Alessandro\.m2\repository\org\slf4j\jul-to-slf4j\2.0.18\jul-to-slf4j-2.0.18.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-autoconfigure\4.1.1\spring-boot-autoconfigure-4.1.1.jar;C:\Users\Alessandro\.m2\repository\jakarta\annotation\jakarta.annotation-api\3.0.0\jakarta.annotation-api-3.0.0.jar;C:\Users\Alessandro\.m2\repository\org\yaml\snakeyaml\2.6\snakeyaml-2.6.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-starter-jackson\4.1.1\spring-boot-starter-jackson-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-jackson\4.1.1\spring-boot-jackson-4.1.1.jar;C:\Users\Alessandro\.m2\repository\tools\jackson\core\jackson-databind\3.1.5\jackson-databind-3.1.5.jar;C:\Users\Alessandro\.m2\repository\com\fasterxml\jackson\core\jackson-annotations\2.21\jackson-annotations-2.21.jar;C:\Users\Alessandro\.m2\repository\tools\jackson\core\jackson-core\3.1.5\jackson-core-3.1.5.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-starter-tomcat\4.1.1\spring-boot-starter-tomcat-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-starter-tomcat-runtime\4.1.1\spring-boot-starter-tomcat-runtime-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\apache\tomcat\embed\tomcat-embed-core\11.0.24\tomcat-embed-core-11.0.24.jar;C:\Users\Alessandro\.m2\repository\org\apache\tomcat\embed\tomcat-embed-el\11.0.24\tomcat-embed-el-11.0.24.jar;C:\Users\Alessandro\.m2\repository\org\apache\tomcat\embed\tomcat-embed-websocket\11.0.24\tomcat-embed-websocket-11.0.24.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-tomcat\4.1.1\spring-boot-tomcat-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-http-converter\4.1.1\spring-boot-http-converter-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot\4.1.1\spring-boot-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\spring-context\7.0.9\spring-context-7.0.9.jar;C:\Users\Alessandro\.m2\repository\org\springframework\spring-web\7.0.9\spring-web-7.0.9.jar;C:\Users\Alessandro\.m2\repository\org\springframework\spring-beans\7.0.9\spring-beans-7.0.9.jar;C:\Users\Alessandro\.m2\repository\io\micrometer\micrometer-observation\1.17.1\micrometer-observation-1.17.1.jar;C:\Users\Alessandro\.m2\repository\io\micrometer\micrometer-commons\1.17.1\micrometer-commons-1.17.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-webmvc\4.1.1\spring-boot-webmvc-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-servlet\4.1.1\spring-boot-servlet-4.1.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\spring-webmvc\7.0.9\spring-webmvc-7.0.9.jar;C:\Users\Alessandro\.m2\repository\org\springframework\spring-aop\7.0.9\spring-aop-7.0.9.jar;C:\Users\Alessandro\.m2\repository\org\springframework\spring-expression\7.0.9\spring-expression-7.0.9.jar;C:\Users\Alessandro\.m2\repository\org\slf4j\slf4j-api\2.0.18\slf4j-api-2.0.18.jar;C:\Users\Alessandro\.m2\repository\org\springframework\spring-core\7.0.9\spring-core-7.0.9.jar;C:\Users\Alessandro\.m2\repository\commons-logging\commons-logging\1.3.6\commons-logging-1.3.6.jar;C:\Users\Alessandro\.m2\repository\org\jspecify\jspecify\1.0.1\jspecify-1.0.1.jar;C:\Users\Alessandro\.m2\repository\org\springframework\boot\spring-boot-web-server\4.1.1\spring-boot-web-server-4.1.1.jar com.becerra.uss.simulador.SimuladorApplication


  .   ____          _            __ _ _

 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \

( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \

 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )

  '  |____| .__|_| |_|_| |_\__, | / / / /

 =========|_|==============|___/=/_/_/_/


 :: Spring Boot ::                (v4.1.1)


2026-10-06T19:55:00.137-05:00  INFO 28960 --- [simulador] [           main] c.b.uss.simulador.SimuladorApplication   : Starting SimuladorApplication using Java 26 with PID 28960 (D:\Programación\Proyectos\WEB\simulador\target\classes started by Alessandro in D:\Programación\Proyectos\WEB\simulador)

2026-10-06T19:55:00.141-05:00  INFO 28960 --- [simulador] [           main] c.b.uss.simulador.SimuladorApplication   : No active profile set, falling back to 1 default profile: "default"

2026-10-06T19:55:00.932-05:00  INFO 28960 --- [simulador] [           main] o.s.boot.tomcat.TomcatWebServer          : Tomcat initialized with port 8080 (http)

2026-10-06T19:55:00.943-05:00  INFO 28960 --- [simulador] [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]

2026-10-06T19:55:00.943-05:00  INFO 28960 --- [simulador] [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/11.0.24]

2026-10-06T19:55:00.987-05:00  INFO 28960 --- [simulador] [           main] b.w.c.s.WebApplicationContextInitializer : Root WebApplicationContext: initialization completed in 794 ms

2026-10-06T19:55:01.053-05:00  WARN 28960 --- [simulador] [           main] ConfigServletWebServerApplicationContext : Exception encountered during context initialization - cancelling refresh attempt: org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'simuladorController': Unsatisfied dependency expressed through field 'simuladorService': No qualifying bean of type 'com.becerra.uss.simulador.service.SimuladorService' available: expected at least 1 bean which qualifies as autowire candidate. Dependency annotations: {@org.springframework.beans.factory.annotation.Autowired(required=true)}

2026-10-06T19:55:01.057-05:00  INFO 28960 --- [simulador] [           main] o.apache.catalina.core.StandardService   : Stopping service [Tomcat]

2026-10-06T19:55:01.069-05:00  INFO 28960 --- [simulador] [           main] .s.b.a.l.ConditionEvaluationReportLogger : 


Error starting ApplicationContext. To display the condition evaluation report re-run your application with 'debug' enabled.

2026-10-06T19:55:01.083-05:00 ERROR 28960 --- [simulador] [           main] o.s.b.d.LoggingFailureAnalysisReporter   : 


***************************

APPLICATION FAILED TO START

***************************


Description:


Field simuladorService in com.becerra.uss.simulador.controller.SimuladorController required a bean of type 'com.becerra.uss.simulador.service.SimuladorService' that could not be found.


The injection point has the following annotations:

    - @org.springframework.beans.factory.annotation.Autowired(required=true)



Action:


Consider defining a bean of type 'com.becerra.uss.simulador.service.SimuladorService' in your configuration.



Process finished with exit code 1

Este es un error clásico de inyección de dependencias en Spring Boot (UnsatisfiedDependencyException).

El error ocurre porque Spring no puede encontrar la clase SimuladorService para inyectarla en tu SimuladorController. Basado en los logs de tu consola, la causa exacta es una discrepancia en los nombres de los paquetes.

Tu aplicación principal se está ejecutando bajo el paquete com.becerra.uss.simulador, pero el código que te proporcioné anteriormente usaba el paquete com.uss.simulador. Por defecto, Spring Boot solo escanea en busca de componentes (@Service, @RestController, etc.) en el mismo paquete de la clase principal y en sus subpaquetes.

Para solucionarlo, debes ajustar la primera línea de código de los archivos que creaste.
Solución: Actualizar las declaraciones de paquete e importaciones

Abre tus archivos y asegúrate de que la primera línea coincida exactamente con la estructura de tu proyecto (com.becerra.uss.simulador...).

1. En SimuladorService.java:
Asegúrate de que tenga el paquete correcto y la anotación @Service.
Java

// Cambia esto:
// package com.uss.simulador.service;

// A esto:
package com.becerra.uss.simulador.service;

import com.becerra.uss.simulador.model.*;
import com.becerra.uss.simulador.dto.EstadoSimulacionDTO;
import org.springframework.stereotype.Service;

@Service // <-- Asegúrate de no haber borrado esta anotación
public class SimuladorService {
    // ... resto del código
}

2. En SimuladorController.java:
Java

package com.becerra.uss.simulador.controller;

import com.becerra.uss.simulador.dto.EstadoSimulacionDTO;
import com.becerra.uss.simulador.service.SimuladorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulador")
@CrossOrigin("*")
public class SimuladorController {
    // ... resto del código
}

3. Resto de archivos (Modelos y DTO):
Aplica el mismo cambio de paquete en la primera línea de todos los demás archivos que copiaste (Memoria.java, CPU.java, ArquitecturaBase.java, VonNeumann.java, Harvard.java, y EstadoSimulacionDTO.java):

    En la carpeta model: package com.becerra.uss.simulador.model;

    En la carpeta dto: package com.becerra.uss.simulador.dto;

Una vez que guardes los archivos con la declaración de paquete correcta, vuelve a ejecutar el proyecto. Spring Boot detectará la anotación @Service, creará el bean y levantará el servidor en el puerto 8080 correctamente.

el simulador me agrada, pero no me convence la forma de simular, que accion simula? no podriamos hacer un ejemplo mas practico?

Tienes toda la razón. El ejemplo anterior simulaba una operación genérica y abstracta que no dejaba ver la utilidad real de los registros ni de la memoria.

Para que este proyecto destaque a nivel de ingeniería de software y cumpla perfectamente con la demostración de flujos de datos, vamos a simular la ejecución de un programa real en ensamblador: Sumar dos números almacenados en memoria y guardar el resultado en una nueva dirección (C = A + B).

Para lograr esto de forma elegante en Java, utilizaremos números enteros para representar el código de máquina. Los dos primeros dígitos serán el código de la operación (Opcode) y los dos últimos serán la dirección de memoria.

    10XX: LOAD XX (Cargar a la CPU el dato en la dirección XX)

    20XX: ADD XX (Sumar al acumulador el dato en la dirección XX)

    30XX: STORE XX (Guardar el valor del acumulador en la dirección XX)

    0000: HALT (Terminar programa)

Aquí tienes la actualización exacta de las dos clases núcleo para ejecutar este programa práctico.
1. La Arquitectura Von Neumann (Memoria Única)

En Von Neumann, las instrucciones y los datos conviven en el mismo arreglo. Al hacer clic en "Siguiente Paso", la CPU leerá la instrucción, y luego tendrá que "viajar" a otra posición del mismo arreglo para buscar el dato, consumiendo 2 ciclos de reloj.
Java

package com.becerra.uss.simulador.model;
import com.becerra.uss.simulador.dto.EstadoSimulacionDTO;

public class VonNeumann extends ArquitecturaBase {
    private Memoria memoriaPrincipal;
    private boolean finalizado = false;

    public VonNeumann(int tamano) {
        super();
        this.memoriaPrincipal = new Memoria(tamano);
        
        // --- CARGAMOS EL PROGRAMA EN MEMORIA ---
        // Instrucciones (Espacios 0 al 3)
        this.memoriaPrincipal.escribir(0, 1010); // LOAD 10 (Cargar dato de celda 10)
        this.memoriaPrincipal.escribir(1, 2011); // ADD 11  (Sumar dato de celda 11)
        this.memoriaPrincipal.escribir(2, 3012); // STORE 12(Guardar resultado en celda 12)
        this.memoriaPrincipal.escribir(3, 0000); // HALT    (Fin)

        // Datos iniciales (Espacios 10 y 11)
        this.memoriaPrincipal.escribir(10, 5); // Valor A = 5
        this.memoriaPrincipal.escribir(11, 7); // Valor B = 7
        // La celda 12 está vacía (0) esperando el resultado
    }

    @Override
    public EstadoSimulacionDTO ejecutarPaso() {
        EstadoSimulacionDTO dto = new EstadoSimulacionDTO();
        dto.arquitectura = "Von Neumann";
        
        if (finalizado) {
            return empaquetarEstado(dto, "Programa finalizado. No hay más ciclos.");
        }

        // 1. Fetch de la instrucción
        int instruccion = memoriaPrincipal.leer(cpu.getPc());
        int opcode = instruccion / 100;     // Ej: 1010 / 100 = 10
        int direccion = instruccion % 100;  // Ej: 1010 % 100 = 10

        String log = "";

        // 2. Decode & Execute
        switch (opcode) {
            case 0: // HALT
                cpu.setIr("HALT");
                finalizado = true;
                log = "Fin de ejecución.";
                break;
            case 10: // LOAD
                cpu.setIr("LOAD " + direccion);
                cpu.setAcumulador(memoriaPrincipal.leer(direccion));
                this.ciclosReloj += 2; // 1 ciclo para instrucción + 1 para dato
                log = "Carga " + cpu.getAcumulador() + " al Acumulador. (Cuello de botella: 2 ciclos)";
                break;
            case 20: // ADD
                cpu.setIr("ADD " + direccion);
                int valorSumar = memoriaPrincipal.leer(direccion);
                cpu.setAcumulador(cpu.getAcumulador() + valorSumar);
                this.ciclosReloj += 2;
                log = "Suma " + valorSumar + " al Acumulador. (Cuello de botella: 2 ciclos)";
                break;
            case 30: // STORE
                cpu.setIr("STORE " + direccion);
                memoriaPrincipal.escribir(direccion, cpu.getAcumulador());
                this.ciclosReloj += 2;
                log = "Guarda " + cpu.getAcumulador() + " en memoria principal. (Cuello de botella: 2 ciclos)";
                break;
        }

        if (!finalizado) cpu.incrementarPc();
        return empaquetarEstado(dto, log);
    }

    private EstadoSimulacionDTO empaquetarEstado(EstadoSimulacionDTO dto, String log) {
        dto.pc = cpu.getPc();
        dto.ir = cpu.getIr();
        dto.acumulador = cpu.getAcumulador();
        dto.ciclosReloj = this.ciclosReloj;
        dto.memoriaPrincipal = memoriaPrincipal.getEstadoCeldas();
        dto.logOperacion = log;
        return dto;
    }
}

2. La Arquitectura Harvard (Memorias Separadas)

En Harvard, las instrucciones están en una memoria y los datos en otra. El código ensamblador es el mismo, pero cuando ejecuta la instrucción de buscar un dato, accede a la memoria de datos simultáneamente por su propio bus, consumiendo solo 1 ciclo de reloj por paso.
Java

package com.becerra.uss.simulador.model;
import com.becerra.uss.simulador.dto.EstadoSimulacionDTO;

public class Harvard extends ArquitecturaBase {
    private Memoria memoriaInstrucciones;
    private Memoria memoriaDatos;
    private boolean finalizado = false;

    public Harvard(int tamanoInst, int tamanoDat) {
        super();
        this.memoriaInstrucciones = new Memoria(tamanoInst);
        this.memoriaDatos = new Memoria(tamanoDat);

        // --- CARGAMOS EL PROGRAMA EN MEMORIA DE INSTRUCCIONES ---
        this.memoriaInstrucciones.escribir(0, 1000); // LOAD 0 (Dirección 0 de Mem. Datos)
        this.memoriaInstrucciones.escribir(1, 2001); // ADD 1  (Dirección 1 de Mem. Datos)
        this.memoriaInstrucciones.escribir(2, 3002); // STORE 2(Dirección 2 de Mem. Datos)
        this.memoriaInstrucciones.escribir(3, 0000); // HALT

        // --- CARGAMOS LOS DATOS EN MEMORIA DE DATOS ---
        this.memoriaDatos.escribir(0, 5); // Valor A = 5
        this.memoriaDatos.escribir(1, 7); // Valor B = 7
        // La celda 2 está vacía (0) esperando el resultado
    }

    @Override
    public EstadoSimulacionDTO ejecutarPaso() {
        EstadoSimulacionDTO dto = new EstadoSimulacionDTO();
        dto.arquitectura = "Harvard";

        if (finalizado) {
            return empaquetarEstado(dto, "Programa finalizado. No hay más ciclos.");
        }

        int instruccion = memoriaInstrucciones.leer(cpu.getPc());
        int opcode = instruccion / 100;
        int direccion = instruccion % 100; // Esta dirección ahora apunta a memoriaDatos

        String log = "";

        switch (opcode) {
            case 0: // HALT
                cpu.setIr("HALT");
                finalizado = true;
                log = "Fin de ejecución.";
                break;
            case 10: // LOAD
                cpu.setIr("LOAD " + direccion);
                cpu.setAcumulador(memoriaDatos.leer(direccion));
                this.ciclosReloj += 1; // Acceso en paralelo
                log = "Carga " + cpu.getAcumulador() + " al Acumulador. (Bus separado: 1 ciclo)";
                break;
            case 20: // ADD
                cpu.setIr("ADD " + direccion);
                int valorSumar = memoriaDatos.leer(direccion);
                cpu.setAcumulador(cpu.getAcumulador() + valorSumar);
                this.ciclosReloj += 1;
                log = "Suma " + valorSumar + " al Acumulador. (Bus separado: 1 ciclo)";
                break;
            case 30: // STORE
                cpu.setIr("STORE " + direccion);
                memoriaDatos.escribir(direccion, cpu.getAcumulador());
                this.ciclosReloj += 1;
                log = "Guarda " + cpu.getAcumulador() + " en memoria de datos. (Bus separado: 1 ciclo)";
                break;
        }

        if (!finalizado) cpu.incrementarPc();
        return empaquetarEstado(dto, log);
    }

    private EstadoSimulacionDTO empaquetarEstado(EstadoSimulacionDTO dto, String log) {
        dto.pc = cpu.getPc();
        dto.ir = cpu.getIr();
        dto.acumulador = cpu.getAcumulador();
        dto.ciclosReloj = this.ciclosReloj;
        dto.memoriaInstrucciones = memoriaInstrucciones.getEstadoCeldas();
        dto.memoriaDatos = memoriaDatos.getEstadoCeldas();
        dto.logOperacion = log;
        return dto;
    }
}

¿Qué verás ahora en el frontend?

Al levantar el proyecto y presionar "Siguiente Paso", la simulación cobrará vida de forma evidente:

    Paso 1: El Acumulador cambia a 5. El log dice "Carga 5 al Acumulador".

    Paso 2: El Acumulador cambia a 12. El log dice "Suma 7 al Acumulador".

    Paso 3: Una celda vacía en la cuadrícula visual de la Memoria (la celda 12 o la 2, dependiendo de la arquitectura) de repente se pinta y muestra el número 12. El Acumulador acaba de inyectar su valor allí.

    Diferencia Crítica: Al llegar a "HALT", el modo Von Neumann te mostrará 6 Ciclos de Reloj en pantalla, mientras que Harvard te mostrará solo 3 Ciclos de Reloj por hacer exactamente la misma suma.

Esta es una operación real de ALU y gestión de registros. Con esta actualización, el simulador pasa de ser un simple contador a un entorno interactivo donde se puede observar directamente cómo la computadora manipula las variables de software a nivel de hardware.

y no tengo que hacer cambios en el frontend?

Estrictamente, no tienes que hacer ningún cambio estructural ni en el HTML ni en el archivo CSS original. ¡Esa es la mayor ventaja de haber diseñado esto con una arquitectura Cliente-Servidor!

Como el contrato de comunicación (el EstadoSimulacionDTO) no cambió sus propiedades, tu frontend actual recibirá el JSON con los nuevos arreglos de memoria, los leerá y los pintará en la cuadrícula sin arrojar ningún error.

Sin embargo, para que este ejemplo práctico brille en tu sustentación y cumpla con el criterio de "visualizar y comparar sus flujos de datos" exigido en la evidencia, te recomiendo hacer un pequeño ajuste en tu app.js y styles.css.   
PDF

El objetivo de este cambio es resaltar visualmente dónde está el Program Counter (PC) en la memoria durante cada ciclo, para que el profesor vea exactamente qué instrucción está ejecutando la CPU.
1. Pequeño ajuste en app.js

Solo necesitas modificar dos funciones existentes para que reciban y procesen la posición actual del PC.

En la función actualizarUI, pásale el valor de dto.pc a las cuadrículas que contienen instrucciones:
JavaScript

function actualizarUI(dto) {
    // 1. Actualizar Registros CPU
    document.getElementById('valPc').innerText = dto.pc;
    document.getElementById('valIr').innerText = dto.ir;
    document.getElementById('valAcum').innerText = dto.acumulador;
    document.getElementById('valCiclos').innerText = dto.ciclosReloj;

    // 2. Actualizar Log
    agregarLog(`[PC: ${dto.pc}] ${dto.logOperacion}`);

    // 3. Renderizar bloques de memoria pasándole el PC actual
    if (dto.arquitectura === "Von Neumann") {
        // En Von Neumann, el PC apunta a la Memoria Principal
        actualizarCuadricula('memoria-principal', dto.memoriaPrincipal, dto.pc);
    } else {
        // En Harvard, el PC SÓLO apunta a la Memoria de Instrucciones
        actualizarCuadricula('memoria-inst', dto.memoriaInstrucciones, dto.pc);
        actualizarCuadricula('memoria-datos', dto.memoriaDatos, -1); // -1 porque el PC no lee datos aquí
    }
}

En la función actualizarCuadricula, añade la lógica para pintar de otro color la celda que coincide con el PC:
JavaScript

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

2. Pequeño ajuste en styles.css

Añade esta clase al final de tu archivo CSS para crear el indicador visual rojo:
CSS

/* Indicador visual de la posición del Program Counter (PC) */
.celda-pc {
    background-color: #fee2e2 !important; /* Fondo rojo claro */
    border: 2px solid #ef4444 !important; /* Borde rojo intenso */
    color: #991b1b !important;
    transform: scale(1.05); /* Efecto de zoom ligero */
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    transition: all 0.2s ease-in-out;
    z-index: 10;
}

¿Qué se logrará con esto en la presentación?

Cuando muestres tu pantalla y des clic en "Siguiente Paso", tu simulador ahora hará lo siguiente de manera automática:

    Habrá un cuadro rojo marcando la celda 0 (donde está el 1010).

    Verás cómo la CPU "jala" ese valor al registro IR como LOAD 10.

    Verás la celda 10 iluminada en azul (porque ahí está guardado tu dato de valor 5).

    Al avanzar, el cuadro rojo bajará a la celda 1, leyendo el 2011, y así sucesivamente.

Este nivel de retroalimentación gráfica justifica perfectamente la nota del Tester y Diseñador, demostrando con claridad didáctica el concepto de direcciones de memoria sin alterar la robustez lógica que construiste en el backend.   
PDF

me agrada, pero quiero que sea mas visual la simulacion, que se vean los componentes y los buses en cada paso y así

Me parece una idea brillante. De hecho, llevarlo a un nivel donde se vean los paquetes de datos "viajando" físicamente por los buses es exactamente lo que te garantizará la máxima nota en el criterio de "visualizar y comparar sus flujos de datos" que exige tu guía de aprendizaje.   
PDF+ 1

La mejor noticia, gracias a haber elegido la arquitectura Cliente-Servidor, es que tu código backend en Java (Spring Boot) no necesita ser tocado en absoluto. Toda la simulación gráfica la resolveremos manipulando el DOM y la API de Animaciones de JavaScript en tu frontend.

Aquí tienes los cambios necesarios para transformar tu vista estática en un diagrama animado.
1. Actualización del HTML (index.html)

Agrega el contenedor para el Diagrama Visual justo debajo del <header> y encima de tu <main>. Este será el lienzo donde dibujaremos la CPU, las memorias y los buses de conexión.
HTML

    <!-- Agrégalo justo después del </header> -->
    <section id="diagrama-visual" class="modulo diagrama-container">
        <!-- El diagrama físico se inyectará aquí con JavaScript -->
        <h3 style="text-align: center; margin: 0; color: #64748b;">Selecciona una arquitectura para ver el diagrama de hardware</h3>
    </section>

2. Actualización del CSS (styles.css)

Añade estas reglas al final de tu archivo para darle estilo a las cajas de los componentes, dibujar las líneas de los buses y definir cómo se verán los "paquetes" de datos (esferas de colores) que viajarán por ellos.
CSS

/* --- ESTILOS DEL DIAGRAMA FÍSICO Y BUSES --- */
.diagrama-container {
    margin-bottom: 20px;
    background-color: #f8fafc;
    border: 2px dashed #cbd5e1;
}

.diagrama {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px 10px;
    gap: 10px;
}

.componente-fisico {
    background: white;
    border: 3px solid var(--primary);
    padding: 20px;
    border-radius: 8px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    min-width: 150px;
    z-index: 2;
}

.bus-linea {
    flex-grow: 1;
    height: 10px;
    background-color: #cbd5e1;
    position: relative;
    border-radius: 5px;
    min-width: 100px;
}

/* El "paquete" de datos que viajará por el bus */
.paquete-datos {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    top: -5px; /* Centrado verticalmente respecto al bus de 10px */
    box-shadow: 0 0 10px currentColor;
    z-index: 3;
}

3. Actualización del JavaScript (app.js)

Aquí está la magia. Vamos a usar la Web Animations API (element.animate()).
Reemplaza tu función renderizarEstructuraMemoria existente y añade las nuevas funciones de animación al final de tu archivo app.js.
JavaScript

// --- 1. MODIFICA LA FUNCIÓN ACTUALIZAR UI PARA DISPARAR LA ANIMACIÓN ---
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

// --- 2. MODIFICA ESTA FUNCIÓN PARA DIBUJAR TAMBIÉN EL DIAGRAMA FÍSICO ---
function renderizarEstructuraMemoria(tipo) {
    const lienzoGrid = document.getElementById('lienzoMemoria');
    const lienzoDiagrama = document.getElementById('diagrama-visual');
    lienzoGrid.innerHTML = ''; 

    if (tipo === 'VON_NEUMANN') {
        // Diagrama Físico (CPU <---> Memoria)
        lienzoDiagrama.innerHTML = `
            <div class="diagrama">
                <div class="componente-fisico">Unidad de Control / CPU</div>
                <div id="bus-unico" class="bus-linea"></div>
                <div class="componente-fisico">Memoria Unificada</div>
            </div>
        `;
        // Grid Lógico
        lienzoGrid.innerHTML = `
            <div class="bloque-memoria">
                <h3>Memoria Principal (Instrucciones + Datos)</h3>
                <div id="memoria-principal" class="grid-memoria"></div>
            </div>
        `;
    } else {
        // Diagrama Físico (Mem Inst ---> CPU <---> Mem Datos)
        lienzoDiagrama.innerHTML = `
            <div class="diagrama">
                <div class="componente-fisico">Memoria de Instrucciones</div>
                <div id="bus-inst" class="bus-linea"></div>
                <div class="componente-fisico">Unidad de Control / CPU</div>
                <div id="bus-datos" class="bus-linea"></div>
                <div class="componente-fisico">Memoria de Datos</div>
            </div>
        `;
        // Grid Lógico
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

// --- 3. AÑADE ESTAS FUNCIONES AL FINAL DEL ARCHIVO ---

function animarFlujoDeDatos(dto) {
    // Extraemos la operación (ej. "LOAD", "ADD", "STORE", "HALT")
    const opcode = dto.ir.split(" ")[0]; 
    if (opcode === "HALT" || opcode === "NOP") return;

    if (dto.arquitectura === "Von Neumann") {
        // CUELLO DE BOTELLA: Todo pasa por el mismo bus de forma secuencial.
        // 1. Primero viaja la Instrucción (Memoria -> CPU)
        dispararAnimacion('bus-unico', 'derecha', '#3b82f6'); // Azul

        // 2. Esperamos que termine para pedir el Dato (si es necesario)
        setTimeout(() => {
            if (opcode === "LOAD" || opcode === "ADD") {
                dispararAnimacion('bus-unico', 'derecha', '#10b981'); // Verde (Memoria -> CPU)
            } else if (opcode === "STORE") {
                dispararAnimacion('bus-unico', 'izquierda', '#ef4444'); // Rojo (CPU -> Memoria)
            }
        }, 900); // Se lanza después de que llega la instrucción (1 ciclo perdido)

    } else {
        // PARALELISMO HARVARD: Ambos buses operan al mismo tiempo.
        // 1. Viaja la Instrucción (Memoria Inst -> CPU)
        dispararAnimacion('bus-inst', 'izquierda', '#3b82f6'); // Azul

        // 2. Simultáneamente se accede al Dato (Memoria Datos <-> CPU)
        if (opcode === "LOAD" || opcode === "ADD") {
            dispararAnimacion('bus-datos', 'derecha', '#10b981'); // Verde (Memoria -> CPU)
        } else if (opcode === "STORE") {
            dispararAnimacion('bus-datos', 'izquierda', '#ef4444'); // Rojo (CPU -> Memoria)
        }
    }
}

function dispararAnimacion(idBus, origen, color) {
    const bus = document.getElementById(idBus);
    if (!bus) return;

    const paquete = document.createElement('div');
    paquete.className = 'paquete-datos';
    paquete.style.backgroundColor = color;
    paquete.style.color = color; // Para el box-shadow en CSS
    bus.appendChild(paquete);

    // Definimos la trayectoria visual
    let trayecto = [];
    if (origen === 'izquierda') {
        trayecto = [ { left: '0%' }, { left: 'calc(100% - 20px)' } ];
    } else {
        trayecto = [ { left: 'calc(100% - 20px)' }, { left: '0%' } ];
    }

    // Ejecutamos la animación
    const animacion = paquete.animate(trayecto, {
        duration: 800, // 0.8 segundos de tiempo de viaje
        easing: 'ease-in-out',
        fill: 'forwards'
    });

    // Destruimos el elemento del DOM al terminar
    animacion.onfinish = () => paquete.remove();
}

El Impacto Visual en tu Sustentación

Cuando presentes esto, el efecto será evidente e innegable:

    En Von Neumann: Al dar "Siguiente Paso", todos verán una bolita azul (la instrucción ADD) salir de la Memoria y llegar a la CPU. La CPU esperará, y un segundo después, saldrá una bolita verde (el dato a sumar) por el mismo camino. Esto justifica visualmente por qué toma 2 ciclos de reloj.

    En Harvard: Al dar "Siguiente Paso", verán dos bolitas (una azul por el bus izquierdo y una verde por el bus derecho) viajando hacia la CPU al mismo tiempo, ejecutando la misma suma en un solo ciclo de reloj.

Esto transforma tu código de una simple calculadora matemática a un verdadero simulador interactivo de hardware, destacando la diferencia fundamental entre compartir un bus de datos/instrucciones versus tener buses paralelos.   
PDF+ 1

me guastaria agregarles los dispositivos de entrada y salida para que se parezca mas a los diagramas de arquitecturas que se encuentran en google

Es una excelente iniciativa. Añadir explícitamente los bloques de Entrada (Input) y Salida (Output) formando el clásico diseño en forma de cruz o "T" es exactamente lo que se ve en la bibliografía estándar y en Google. Esto le dará un aspecto mucho más académico a tu simulador para la presentación.   
PDF+ 1

Como diseñamos el backend para ser independiente de la vista, no necesitas cambiar ni una sola línea de Java. Todo lo resolveremos ajustando la cuadrícula en CSS y añadiendo una simulación visual en JavaScript donde la "Entrada" enviará un paquete de inicio y la "Salida" recibirá el resultado al hacer HALT.

Aquí tienes los reemplazos exactos para tu frontend:
1. Actualiza tu CSS (styles.css)

Reemplaza todo el bloque de /* --- ESTILOS DEL DIAGRAMA FÍSICO Y BUSES --- */ que agregamos en el paso anterior por este nuevo código. Ahora soporta buses tanto verticales como horizontales.
CSS

/* --- ESTILOS DEL DIAGRAMA FÍSICO (FORMA DE CRUZ) --- */
.diagrama-container {
    margin-bottom: 20px;
    background-color: #f8fafc;
    border: 2px dashed #cbd5e1;
}

.diagrama-clasico {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 30px;
}

.fila-diagrama {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
}

.componente-fisico {
    background: white;
    border: 3px solid var(--primary);
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    min-width: 150px;
    z-index: 2;
}

/* Buses con orientación específica */
.bus-vertical {
    width: 12px;
    height: 50px;
    background-color: #cbd5e1;
    position: relative;
    border-radius: 6px;
}

.bus-horizontal {
    height: 12px;
    width: 60px;
    background-color: #cbd5e1;
    position: relative;
    border-radius: 6px;
}

/* Paquetes adaptados a la orientación del bus */
.paquete-h {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    top: -4px; /* Centrado en bus horizontal */
    box-shadow: 0 0 12px currentColor;
    z-index: 3;
}

.paquete-v {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    left: -4px; /* Centrado en bus vertical */
    box-shadow: 0 0 12px currentColor;
    z-index: 3;
}

2. Actualiza tu JavaScript (app.js)

Reemplaza las tres funciones del final de tu archivo (renderizarEstructuraMemoria, animarFlujoDeDatos y dispararAnimacion) con estas versiones actualizadas.

Esta actualización dibuja el diseño clásico e inyecta la lógica para que los datos viajen de arriba hacia abajo, o de izquierda a derecha según corresponda.
JavaScript

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

¿Qué logramos con este diseño?

    Fidelidad Académica: Ahora la CPU está en el centro geométrico. En Von Neumann, tiene la memoria arriba y la I/O a los costados. En Harvard, está completamente rodeada: instrucciones arriba, datos abajo, entrada a la izquierda y salida a la derecha. Esto ilustra la separación física a primera vista.   
    PDF+ 1

    Ciclo de Vida Completo: Al dar tu primer paso, verás una esfera naranja cruzar desde el Dispositivo de Entrada hacia la CPU para simular la inyección de los datos iniciales. Al llegar a la instrucción HALT, una esfera verde saldrá hacia el Dispositivo de Salida simulando la impresión del resultado final por pantalla.

    Colores Semánticos: Los bordes de los dispositivos tienen colores específicos, y las esferas de datos que viajan por los buses ahora adoptan el mismo color del componente del que provienen, haciendo que el flujo de datos sea intuitivo sin necesidad de explicaciones.

este es mi backend hazle su readme, no uses emojis
En Linux/macOS
Bash

./mvnw spring-boot:run

El servidor Tomcat integrado se iniciará en el puerto 8080 y estará listo para recibir peticiones en http://localhost:8080.
"""

with open("README.md", "w", encoding="utf-8") as file:
file.write(readme_content)

print("README.md created successfully.")


```text?code_stdout&code_event_index=1
README.md created successfully.

Tu archivo Markdown está listo:
Ícono de MD
README
 MD 

He estructurado el README.md con un enfoque técnico y directo, ideal para repositorios de ingeniería de software. El documento incluye una descripción general, la arquitectura de clases (modelos, servicios, controladores y DTO), los detalles de los endpoints de la API REST y las instrucciones claras para levantar el entorno usando el Maven Wrapper que se encuentra en los archivos de tu proyecto. Toda la redacción mantiene un formato completamente profesional, sin emojis.

ahora hazle un readme a este frontend

Tu archivo Markdown (Frontend) está listo:
Ícono de MD
README-frontend
 MD 

El README.md ha sido redactado manteniendo el rigor técnico que usaste en tu código, sin emojis y detallando la integración de la Web Animations API, el uso del Fetch API para conectarse a tu Spring Boot, y la maquetación en CSS puro. Detalla explícitamente cómo tu frontend logra visualizar los flujos de datos para sustentar el éxito de tu simulación.


Gemini es una IA y puede cometer errores.
Analizando

# Simulador de Arquitecturas de Computadoras (Frontend)

Este repositorio contiene la interfaz gráfica (Frontend) del simulador de arquitecturas clásicas de computadoras (Von Neumann y Harvard). Desarrollado de manera nativa con tecnologías web estándar, actúa como el cliente visual que consume la API REST provista por el backend en Spring Boot.

Su objetivo principal es renderizar de manera interactiva y animada las diferencias en el flujo de datos y el consumo de ciclos de reloj entre ambas arquitecturas, cumpliendo con los estándares de diseño y análisis comparativo para sistemas de computación.

## Características Principales

* **Diagramas Físicos Animados:** Representación visual de los componentes (CPU, Memorias, Dispositivos de Entrada/Salida) en configuración de cruz. Utiliza la Web Animations API para simular el viaje físico de los paquetes de datos e instrucciones a través de los buses horizontales y verticales.
* **Cuadrícula de Memoria Dinámica:** Renderizado en tiempo real del estado de los arreglos de memoria. Incluye resaltado visual automático de la celda actualmente referenciada por el Program Counter (PC).
* **Monitor de CPU en Tiempo Real:** Visualización sincronizada de los registros internos de la Unidad de Control (PC, IR, Acumulador) y el contador global de Ciclos de Reloj.
* **Registro de Operaciones (Log):** Historial detallado paso a paso que documenta la instrucción ejecutada y la explicación del consumo de ciclos (ej. cuellos de botella vs. accesos en paralelo).

## Tecnologías Utilizadas

* **HTML5:** Estructura semántica del simulador.
* **CSS3:** Maquetación responsiva utilizando CSS Grid y Flexbox. Variables de entorno para temas de color consistentes y clases dinámicas para indicadores de estado.
* **JavaScript Puro (Vanilla JS):** Lógica del cliente, manipulación del DOM, peticiones asíncronas (`fetch`) a la API y orquestación de animaciones.
* **Heroicons:** Iconografía vectorial integrada mediante SVG para los controles de la interfaz.

## Estructura de Archivos

* `index.html`: Punto de entrada de la aplicación. Define el panel de control, los contenedores del diagrama físico, las métricas de la CPU y la estructura de la memoria.
* `styles.css`: Hojas de estilo que definen la presentación visual, las cajas de los componentes de hardware y la geometría de los buses de datos.
* `app.js`: Script principal que maneja los eventos del usuario, se comunica con `http://localhost:8080/api/simulador` y ejecuta la lógica de renderizado y animación condicional basada en el tipo de arquitectura.

## Instrucciones de Ejecución

Debido a que el frontend está construido enteramente en tecnologías del lado del cliente sin dependencias de Node.js, su ejecución es directa:

1. Asegúrese de que el servidor Backend (Spring Boot) se encuentre en ejecución y escuchando en el puerto `8080`.
2. Abra el archivo `index.html` directamente en cualquier navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge).
3. Seleccione la arquitectura deseada en el panel superior y haga clic en "Iniciar".
4. Utilice el botón "Siguiente Paso" para avanzar en los ciclos de reloj y observar las animaciones del flujo de datos.

README-frontend.md
Mostrando README-frontend.md.