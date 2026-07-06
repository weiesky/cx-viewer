# UltraPlan — La Maquina de Deseos Definitiva

## Que es UltraPlan

UltraPlan es la **implementacion localizada** de cc-viewer del comando nativo `/ultraplan` de Claude Code. Te permite usar las capacidades completas de `/ultraplan` en tu entorno local **sin necesidad de iniciar el servicio remoto oficial de Claude**, guiando a Claude Code para lograr tareas complejas de planificacion e implementacion mediante **colaboracion multi-agente**.

En comparacion con el modo Plan regular o Agent Team, UltraPlan puede:
- Evaluar automaticamente la complejidad de la tarea y seleccionar la estrategia de planificacion optima
- Desplegar multiples agentes en paralelo para explorar la base de codigo desde diferentes dimensiones
- Incorporar investigacion externa (webSearch) sobre mejores practicas de la industria
- Ensamblar automaticamente un Code Review Team despues de la ejecucion del plan para revision de codigo
- Formar un ciclo cerrado completo de **Plan → Execute → Review → Fix**

---

## Notas Importantes

### 1. UltraPlan No Es Omnipotente
UltraPlan es una maquina de deseos mas poderosa, pero eso no significa que cada deseo pueda cumplirse. Es mas poderoso que Plan y Agent Team, pero no puede directamente "hacerte ganar dinero". Considera una granularidad de tareas razonable — divide los grandes objetivos en tareas medianas ejecutables en lugar de intentar lograrlo todo de una sola vez.

### 2. Actualmente Mas Efectivo para Proyectos de Programacion
Las plantillas y flujos de trabajo de UltraPlan estan profundamente optimizados para proyectos de programacion. Otros escenarios (documentacion, analisis de datos, etc.) pueden intentarse, pero es recomendable esperar las adaptaciones en versiones futuras.

### 3. Tiempo de Ejecucion y Requisitos de Ventana de Contexto
- Una ejecucion exitosa de UltraPlan normalmente toma **30 minutos o mas**
- Requiere que el MainAgent tenga una ventana de contexto grande (se recomienda el modelo Opus con 1M de contexto)
- Si solo tienes un modelo de 200K, **asegurate de ejecutar `/clear` en el contexto antes de comenzar**
- El `/compact` de Claude Code funciona mal cuando la ventana de contexto es insuficiente — evita quedarte sin espacio
- Mantener suficiente espacio de contexto es un prerequisito critico para la ejecucion exitosa de UltraPlan

Si tienes preguntas o sugerencias sobre el UltraPlan localizado, no dudes en abrir [Issues en GitHub](https://github.com/anthropics/claude-code/issues) para discutir y colaborar.

---

## Como Funciona

UltraPlan ofrece dos modos de operacion:

### Modo Automatico
Analiza automaticamente la complejidad de la tarea (puntuacion 4-12) y enruta a diferentes estrategias:

| Ruta | Puntuacion | Estrategia |
|------|------------|------------|
| Ruta A | 4-6 | Planificacion ligera con exploracion directa de codigo |
| Ruta B | 7-9 | Planificacion con diagramas estructurales (Mermaid / ASCII) |
| Ruta C | 10-12 | Exploracion multi-agente + ciclo cerrado de revision |

### Modo Forzado
Activa directamente el flujo de trabajo multi-agente completo de Ruta C:
1. Desplegar hasta 5 agentes en paralelo para explorar la base de codigo simultaneamente (arquitectura, identificacion de archivos, evaluacion de riesgos, etc.)
2. Opcionalmente desplegar un agente de investigacion para indagar soluciones de la industria mediante webSearch
3. Sintetizar todos los hallazgos de los agentes en un plan de implementacion detallado
4. Desplegar un agente de revision para examinar el plan desde multiples perspectivas
5. Ejecutar el plan una vez aprobado
6. Ensamblar automaticamente un Code Review Team para validar la calidad del codigo despues de la implementacion
