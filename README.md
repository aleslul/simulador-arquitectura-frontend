# Simulador de Arquitecturas de Computadoras (Frontend)

Este repositorio contiene la interfaz gráfica interactiva (Frontend) del simulador de arquitecturas clásicas de computadoras. Construido nativamente con HTML5, CSS3 y Vanilla JavaScript, actúa como cliente visual consumiendo la API REST basada en sesiones provista por el backend en Spring Boot.

Su objetivo principal es renderizar de manera interactiva las diferencias en el flujo de datos, manejo de recursos y ejecución de instrucciones entre arquitecturas computacionales, brindando herramientas de análisis de rendimiento precisas.

## Arquitecturas y Modos Soportados

El frontend interactúa dinámicamente con el motor del simulador para representar tres arquitecturas:
* **Von Neumann:** Un único bus de memoria. Representación visual de los cuellos de botella ("structural hazards").
* **Harvard Pura:** Buses paralelos para Memoria de Instrucciones y Memoria de Datos.

**Modos de Ejecución:**
* **Segmentado (Pipelining):** Solapamiento de las fases de Fetch y Execute.
* **Secuencial:** Finalización estricta de una instrucción antes del Fetch de la siguiente.

## Características Principales de la Interfaz

* **Animación Precisa de Pipeline:** Utiliza la Web Animations API para procesar el arreglo de `eventos` de fase (Fetch, Read, Write) devuelto por el backend. Los paquetes de datos se animan por los buses respetando los retrasos reales por colisión de recursos y tiempos de acceso a memoria.
* **Métricas de Rendimiento Avanzadas:** Monitor en tiempo real de los registros de la Unidad de Control (PC, IR, ACC, MAR, MDR), banderas de estado (Z, N, C, V), CPI (Ciclos por Instrucción) y ciclos perdidos esperando liberación del bus.
* **Cuadrícula de Memoria Desensamblada:** Renderizado visual de los arreglos de memoria que traduce automáticamente los códigos binarios de 16 bits a mnemónicos legibles en lenguaje ensamblador mediante el mapeo del motor.
* **Manejo de Sesiones Concurrente:** Soporte para múltiples simulaciones simultáneas en diferentes pestañas mediante el manejo de `sessionId` (UUID).

## Estructura de Archivos

* `index.html`: Define la estructura semántica de la interfaz, el panel de configuración de arquitecturas y variables (A y B), y los lienzos para los diagramas y métricas de CPU.
* `styles.css`: Hojas de estilo que definen el diseño responsivo (CSS Grid y Flexbox) y la geometría posicional de los componentes físicos (CPU, RAM, Cachés, Buses).
* `app.js`: Controlador principal del cliente. Gestiona las peticiones asíncronas (`fetch`) a la API, inyecta identificadores de sesión, mapea el DTO de estado y orquesta el motor visual de las esferas de datos según las fases temporales del hardware.

## Instrucciones de Ejecución

Esta interfaz opera enteramente del lado del cliente sin requerir procesos de compilación o empaquetado (sin Node.js/Webpack).

1. Asegúrese de que el servidor Backend (Spring Boot) se encuentre en ejecución y escuchando peticiones en `http://localhost:8080`.
2. Abra el archivo `index.html` en un navegador web moderno (se recomienda Google Chrome, Mozilla Firefox o Microsoft Edge).
3. Seleccione la arquitectura, el modo de ejecución (Segmentado o Secuencial) y asigne los valores de prueba para los operandos A y B.
4. Haga clic en **Iniciar** para instanciar una nueva sesión segura en el backend y poblar las memorias.
5. Utilice el botón **Siguiente Paso** para enviar la petición de ejecución del ciclo de reloj, visualizando las métricas y animaciones correspondientes en pantalla.