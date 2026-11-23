# MainAgent

## Definición

MainAgent es la cadena de solicitudes principal de Codex en estado no agent team. Cada interacción del usuario con Codex produce una serie de solicitudes API, donde las solicitudes MainAgent constituyen la cadena de conversación central — llevan el system prompt completo, las definiciones de herramientas y el historial de mensajes.

## Método de identificación

En cc-viewer, MainAgent se identifica mediante `req.mainAgent === true`, marcado automáticamente por `interceptor.js` durante la captura de la solicitud.

Condiciones de determinación (deben cumplirse todas):
- El cuerpo de la solicitud contiene el campo `system` (system prompt)
- El cuerpo de la solicitud contiene el array `tools` (definiciones de herramientas)
- El system prompt contiene texto característico de "Codex"

## Diferencias con SubAgent

| Característica | MainAgent | SubAgent |
|----------------|-----------|----------|
| system prompt | Prompt principal completo de Codex | Prompt simplificado específico para la tarea |
| Array tools | Contiene todas las herramientas disponibles | Generalmente solo contiene las pocas herramientas necesarias para la tarea |
| Historial de mensajes | Acumula el contexto completo de la conversación | Solo contiene mensajes relacionados con la subtarea |
