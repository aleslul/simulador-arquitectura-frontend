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