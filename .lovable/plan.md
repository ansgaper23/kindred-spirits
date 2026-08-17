# Plan Técnico: Auditoría y Optimización de CodeFlow (Gemini + GitHub)

Como Ingeniero de Software Senior, he realizado una auditoría del sistema actual. El flujo principal (Selección de Repo -> Chat -> Edición IA) está arquitectado sobre TanStack Start y Supabase, pero presenta riesgos en la gestión de tokens, concurrencia en el agente y resiliencia de la API de GitHub.

## Problemas Técnicos Identificados

1.  **SPOF en Agent Loop**: El bucle del agente en `processAgentMessage` es síncrono respecto a la petición HTTP. Si Gemini tarda o hay muchas iteraciones de herramientas, la función puede exceder los timeouts del Edge runtime (Cloudflare Workers).
2.  **Seguridad de Tokens**: El token de GitHub se almacena en `profiles.github_access_token`. Aunque hay RLS, un compromiso de la base de datos expondría tokens en texto plano.
3.  **Concurrencia en Ediciones**: Si dos usuarios (o el mismo en dos pestañas) proponen cambios al mismo archivo, no hay un mecanismo de bloqueo o verificación de SHA optimista antes de la propuesta, solo en la aplicación.
4.  **Límites de Rate Limit**: La búsqueda de código y lectura de archivos no tiene una capa de caché, lo que puede agotar rápidamente el rate limit de la API de GitHub en repositorios grandes.

## Solución Arquitectónica Recomendada

1.  **Cifrado en Reposo**: Implementar cifrado AES-256 para el `github_access_token` antes de guardarlo en Supabase.
2.  **Optimización del Agente**:
    *   Implementar un sistema de "Short-term Memory" para evitar re-leer archivos ya procesados en la misma iteración.
    *   Añadir validación de tamaño de repositorio antes de permitir la conexión.
3.  **Robustez en GitHub API**:
    *   Implementar una capa de `githubRequest` con reintentos exponenciales y manejo de `429 Too Many Requests`.
    *   Validar la existencia de la rama antes de intentar crearla en `approveAndApplyEdit`.

## Implementación Técnica

### 1. Cifrado de Tokens (Backend)
Crear un helper en `src/lib/crypto.server.ts` para cifrar/descifrar tokens usando una `ENCRYPTION_KEY` secreta.

### 2. Robustez en el Cliente GitHub
Actualizar `src/lib/github/client.server.ts` para manejar límites de tasa y errores transitorios de red.

### 3. Auditoría de Seguridad RLS
Verificar que las políticas de `messages` y `proposed_edits` no permitan fugas de datos entre `conversation_id`.

## Estructura Final del Sistema
*   `src/lib/github/client.server.ts`: Cliente resiliente con reintentos.
*   `src/lib/agent/gemini.functions.ts`: Lógica de agente con límites de iteración y telemetría básica.
*   `src/lib/crypto.server.ts`: (Nuevo) Capa de seguridad para tokens.
*   `supabase/migrations/...`: Índices para optimizar la búsqueda de conversaciones.

## Beneficios Esperados
*   **Seguridad**: Tokens protegidos incluso en caso de dump de DB.
*   **Confiabilidad**: El agente no fallará por errores temporales de la API de GitHub.
*   **Escalabilidad**: Reducción de carga en GitHub API mediante gestión inteligente de peticiones.
