import { createFileRoute } from "@tanstack/react-router";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  const content = `# Prompt para construir "GitFlow" (versión con Gemini como motor de IA)

Copia y pega el siguiente prompt en tu asistente de código (Claude Code, Cursor, Windsurf, o el propio Gemini CLI) para que te ayude a construir el proyecto. Está escrito para que el asistente entienda el producto completo y empiece a generar la estructura del proyecto.

---

## PROMPT

Actúa como un ingeniero de software senior full-stack, especializado en productos SaaS con IA agéntica. Quiero que me ayudes a construir, paso a paso, una aplicación web llamada **"CodeFlow"** (o el nombre que definamos), con el siguiente objetivo:

**Producto:** una plataforma donde un usuario conecta un repositorio de GitHub, conversa en lenguaje natural con un agente de IA para pedir cambios en el código, revisa un diff de los cambios propuestos, y solo si aprueba, la plataforma aplica los cambios (commit en una rama nueva y, opcionalmente, abre un Pull Request). El agente **nunca** escribe directamente en la rama principal ni aplica cambios sin aprobación explícita del usuario.

### 1. Motor de IA

Usa la **API de Gemini de Google** (modelo \`gemini-2.5-pro\` o el más reciente disponible en Google AI Studio / Vertex AI) como motor del agente, aprovechando su capacidad de **function calling / tool use** para exponerle al modelo un set de herramientas controladas:

- \`read_file(path)\` — leer un archivo del repo clonado.
- \`list_files(path)\` — listar archivos/directorios.
- \`search_code(query)\` — buscar texto o símbolos en el repo.
- \`propose_edit(path, diff)\` — proponer un cambio (nunca lo aplica directamente, solo lo registra como propuesta pendiente de aprobación).
- \`run_command(cmd)\` — ejecutar comandos de solo lectura (tests, linters) dentro del sandbox, nunca comandos destructivos sin aprobación.

Implementa un bucle de agente (agent loop) en el backend: el modelo recibe el mensaje del usuario + el estado del repo, decide qué herramientas llamar, y termina generando un conjunto de cambios propuestos (diffs) en lugar de aplicarlos directamente. Usa como referencia arquitectónica el diseño de \`gemini-cli\` (github.com/google-gemini/gemini-cli), el agente de terminal open source de Google, para el patrón de bucle de herramientas.

### 2. Integración con GitHub

- Registra una **GitHub App** (no un OAuth App genérico) con permisos mínimos: lectura/escritura de contenido de repositorio y de pull requests, nada más.
- Al conectar, clona el repositorio dentro de un **sandbox aislado y efímero** (contenedor Docker por sesión, se destruye al terminar).
- Todo el trabajo del agente (lectura, escritura, ejecución de comandos) ocurre dentro de ese contenedor, nunca en la infraestructura compartida.
- Al aprobar los cambios, el backend hace commit en una rama nueva (\`codeflow/cambio-<id>\`) y opcionalmente abre un Pull Request vía la API de GitHub, dejando la rama principal intacta.

### 3. Flujo de usuario

1. Login con GitHub (OAuth) y selección del repositorio a conectar.
2. Pantalla de chat: el usuario describe el cambio que quiere ("agrega validación de email al formulario de registro").
3. El agente explora el código, piensa en voz alta (mostrar streaming de su razonamiento/pasos si es posible) y genera una propuesta de cambios.
4. Vista de revisión tipo diff (como la vista de "Files changed" de un PR de GitHub): el usuario ve línea por línea qué cambia, puede aprobar todo, aprobar parcialmente, pedir ajustes, o rechazar.
5. Al aprobar: commit + push a rama nova + (opcional) apertura automática de PR, con un resumen del cambio generado por el propio modelo como descripción del PR.

### 4. Stack técnico sugerido

- **Frontend:** Next.js (React) + Tailwind CSS, con streaming de respuestas del agente (Server-Sent Events o WebSockets).
- **Backend:** Node.js (TypeScript) o Python (FastAPI), orquestando las llamadas a la API de Gemini y el sandbox.
- **Sandbox de ejecución:** contenedores Docker efímeros (o un servicio gestionado tipo e2b.dev) por sesión de trabajo.
- **Base de datos:** PostgreSQL para usuarios, repos conectados, historial de conversaciones y cambios aplicados.
- **Autenticación:** OAuth de GitHub + GitHub App para permisos de repo.
- **Cola/orquestación de trabajos largos:** Redis + BullMQ (o Celery si es Python), ya que las tareas del agente pueden tardar.

### 5. Seguridad y cumplimiento (no negociable)

- Nunca almacenar tokens de GitHub en texto plano; cifrarlos en reposo.
- Aislar completamente cada sesión de trabajo (un contenedor por repo/sesión, sin persistencia entre usuarios).
- Publicar Términos de Uso y Política de Privacidad reales antes de lanzar, especialmente porque se accede a código privado de terceros.
- Registrar límites de uso por usuario (tokens de la API de Gemini consumidos) para controlar costos, incluso si el plan comercial se presenta como "acceso ilimitado por tiempo".
- Loguear todas las acciones del agente (qué archivos leyó, qué propuso, qué se aprobó) para auditoría.

### 6. Entregables que espero de ti (asistente de código)

1. Estructura inicial del monorepo (frontend + backend + infra).
2. Configuración de la GitHub App (manifest, permisos, webhook de instalación).
3. Cliente de la API de Gemini con function calling configurado con las herramientas del punto 1.
4. Endpoint de backend que orquesta el bucle del agente (recibe mensaje → llama a Gemini → ejecuta tools → devuelve propuesta de diff).
5. Componente de frontend para el chat y para la vista de revisión de diffs.
6. Script de despliegue básico (Docker Compose para desarrollo local).

Empieza generando la estructura de carpetas del proyecto y el esqueleto del backend con el cliente de Gemini y las tool definitions. Pregúntame si necesitas decisiones de mi parte antes de asumir algo importante (nombre del proyecto, proveedor de hosting, si el MVP es solo para repos públicos o también privados, etc.).

---

## Notas para ti (fuera del prompt)

- Necesitarás una **API key de Gemini** desde Google AI Studio (ai.google.dev) o una cuenta de Vertex AI si prefieres facturación empresarial.
- Necesitarás crear la **GitHub App** desde la configuración de desarrollador de tu cuenta u organización de GitHub (github.com/settings/apps).
- Te recomiendo empezar el MVP soportando solo repos donde tú mismo seas colaborador (para probar sin exponer datos de terceros) antes de abrir el registro público.`;

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <div className="mx-auto max-w-3xl whitespace-pre-wrap rounded-lg border bg-card p-8 shadow-sm">
        {content}
      </div>
    </div>
  );
}
