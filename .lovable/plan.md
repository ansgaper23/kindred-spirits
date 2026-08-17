# Habilitar GitHub y Gemini (CodeFlow Agent)

Para activar las capacidades agénticas y la integración con GitHub, realizaremos los siguientes pasos:

## Configuración de IA (Gemini)
1. **Solicitar API Key**: Pediré la `GEMINI_API_KEY` mediante un formulario seguro.
2. **Validar Modelo**: Me aseguraré de que el código use un modelo válido (ej. `gemini-1.5-pro` o `gemini-2.0-flash`).
3. **Interfaz de Agente**: Verificaré que el chat esté listo para procesar mensajes una vez configurada la clave.

## Configuración de GitHub
1. **GitHub Auth**: Aseguraré que el inicio de sesión con GitHub esté habilitado en la plataforma.
2. **Gestión de Repositorios**: Mejoraré la lógica de conexión para que los usuarios puedan listar y seleccionar sus repositorios privados y públicos.
3. **Token de Acceso**: Garantizaré que el token de GitHub se capture correctamente y se use para las operaciones del agente (leer código, proponer cambios).

## Mejoras en la UI
1. **Indicador de Configuración**: Añadiré un aviso en el Dashboard si falta la API Key de Gemini.
2. **Flujo de Conexión**: Aseguraré que el botón "Continuar con GitHub" sea prominente para capturar los permisos necesarios (`repo`, `read:user`).

### Detalles Técnicos
- Usaremos `secrets--add_secret` para la clave de Gemini.
- Utilizaremos el cliente de GitHub ya implementado en `src/lib/github/client.server.ts`.
- El bucle del agente en `src/lib/agent/gemini.functions.ts` se activará al detectar la clave.
