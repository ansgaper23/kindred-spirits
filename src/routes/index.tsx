import { createFileRoute } from "@tanstack/react-router";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return (
    <div className="p-8 max-w-4xl mx-auto prose dark:prose-invert">
      <div className="bg-muted p-4 rounded-md mb-8 font-mono text-sm whitespace-pre-wrap">
        /skill:advanced-technical-skills-master
      </div>
      <h1 id="prompt-para-construir-gitflow-versión-con-gemini-como-motor-de-ia">Prompt para construir "GitFlow" (versión con Gemini como motor de IA)</h1>
      <p>Copia y pega el siguiente prompt en tu asistente de código (Claude Code, Cursor, Windsurf, o el propio Gemini CLI) para que te ayude a construir el proyecto. Está escrito para que el asistente entienda el producto completo y empiece a generar la estructura del proyecto.</p>
      <hr />
      <h2 id="prompt">PROMPT</h2>
      <p>Actúa como un ingeniero de software senior full-stack, especializado en productos SaaS con IA agéntica. Quiero que me ayudes a construir, paso a paso, una aplicación web llamada <strong>"CodeFlow"</strong> (o el nombre que definamos), con el siguiente objetivo:</p>
      <p><strong>Producto:</strong> una plataforma donde un usuario conecta un repositorio de GitHub, conversa en lenguaje natural con un agente de IA para pedir cambios en el código, revisa un diff de los cambios propuestos, y solo si aprueba, la plataforma aplica los cambios (commit en una rama nueva y, opcionalmente, abre un Pull Request). El agente <strong>nunca</strong> escribe directamente en la rama principal ni aplica cambios sin aprobación explícita del usuario.</p>
      <h3 id="1-motor-de-ia">1. Motor de IA</h3>
      <p>Usa la <strong>API de Gemini de Google</strong> (modelo <code>gemini-2.5-pro</code> o el más reciente disponible en Google AI Studio / Vertex AI) como motor del agente, aprovechando su capacidad de <strong>function calling / tool use</strong> para exponerle al modelo un set de herramientas controladas:</p>
      <ul>
        <li><code>read_file(path)</code> — leer un archivo del repo clonado.</li>
        <li><code>list_files(path)</code> — listar archivos/directorios.</li>
        <li><code>search_code(query)</code> — buscar texto o símbolos en el repo.</li>
        <li><code>propose_edit(path, diff)</code> — proponer un cambio (nunca lo aplica directamente, solo lo registra como propuesta pendiente de aprobación).</li>
        <li><code>run_command(cmd)</code> — ejecutar comandos de solo lectura (tests, linters) dentro del sandbox, nunca comandos destructivos sin aprobación.</li>
      </ul>
      <p>Implementa un bucle de agente (agent loop) en el backend: el modelo recibe el mensaje del usuario + el estado del repo, decide qué herramientas llamar, y termina generando un conjunto de cambios propuestos (diffs) en lugar de aplicarlos directamente. Usa como referencia arquitectónica el diseño de <code>gemini-cli</code> (github.com/google-gemini/gemini-cli), el agente de terminal open source de Google, para el patrón de bucle de herramientas.</p>
      <h3 id="2-integración-con-github">2. Integración con GitHub</h3>
      <ul>
        <li>Registra una <strong>GitHub App</strong> (no un OAuth App genérico) con permisos mínimos: lectura/escritura de contenido de repositorio y de pull requests, nada más.</li>
        <li>Al conectar, clona el repositorio dentro de un <strong>sandbox aislado y efímero</strong> (contenedor Docker por sesión, se destruye al terminar).</li>
        <li>Todo el trabajo del agente (lectura, escritura, ejecución de comandos) ocurre dentro de ese contenedor, nunca en la infraestructura compartida.</li>
        <li>Al aprobar los cambios, el backend hace commit en una rama nueva (<code>codeflow/cambio-&lt;id&gt;</code>) y opcionalmente abre un Pull Request vía la API de GitHub, dejando la rama principal intacta.</li>
      </ul>
      <h3 id="3-flujo-de-usuario">3. Flujo de usuario</h3>
      <ol>
        <li>Login con GitHub (OAuth) y selección del repositorio a conectar.</li>
        <li>Pantalla de chat: el usuario describe el cambio que quiere ("agrega validación de email al formulario de registro").</li>
        <li>El agente explora el código, piensa en voz alta (mostrar streaming de su razonamiento/pasos si es posible) y genera una propuesta de cambios.</li>
        <li>Vista de revisión tipo diff (como la vista de "Files changed" de un PR de GitHub): el usuario ve línea por línea qué cambia, puede aprobar todo, aprobar parcialmente, pedir ajustes, o recalcar.</li>
        <li>Al aprobar: commit + push a rama nueva + (opcional) apertura automática de PR, con un resumen del cambio generado por el propio modelo como descripción del PR.</li>
      </ol>
      <h3 id="4-stack-técnico-sugerido">4. Stack técnico sugerido</h3>
      <ul>
        <li><strong>Frontend:</strong> Next.js (React) + Tailwind CSS, con streaming de respuestas del agente (Server-Sent Events o WebSockets).</li>
        <li><strong>Backend:</strong> Node.js (TypeScript) o Python (FastAPI), orquestando las llamadas a la API de Gemini y el sandbox.</li>
        <li><strong>Sandbox de ejecución:</strong> contenedores Docker efímeros (o un servicio gestionado tipo e2b.dev) por sesión de trabalho.</li>
        <li><strong>Base de datos:</strong> PostgreSQL para usuarios, repos conectados, historial de conversaciones y cambios aplicados.</li>
        <li><strong>Autenticación:</strong> OAuth de GitHub + GitHub App para permisos de repo.</li>
        <li><strong>Cola/orquestación de trabalhos largos:</strong> Redis + BullMQ (o Celery si es Python), ya que las tareas del agente pueden tardar.</li>
      </ul>
      <h3 id="5-seguridad-y-cumplimiento-no-negociable">5. Seguridad y cumplimiento (no negociable)</h3>
      <ul>
        <li>Nunca almacenar tokens de GitHub en texto plano; cifrarlos en reposo.</li>
        <li>Aislar completamente cada sesión de trabalho (un contenedor por repo/sesión, sin persistencia entre usuarios).</li>
        <li>Publicar Términos de Uso y Política de Privacidad reales antes de lanzar, especialmente porque se accede a código privado de terceros.</li>
        <li>Registrar límites de uso por usuario (tokens de la API de Gemini consumidos) para controlar costos, incluso si el plan comercial se presenta como "acceso ilimitado por tiempo".</li>
        <li>Loguear todas las acciones del agente (qué archivos leyó, qué propuso, qué se aprobó) para auditoría.</li>
      </ul>
      <h3 id="6-entregables-que-espero-de-ti-asistente-de-código">6. Entregables que espero de ti (asistente de código)</h3>
      <ol>
        <li>Estructura inicial del monorepo (frontend + backend + infra).</li>
        <li>Configuración de la GitHub App (manifest, permisos, webhook de instalación).</li>
        <li>Cliente de la API de Gemini con function calling configurado con las herramientas del punto 1.</li>
        <li>Endpoint de backend que orquesta el bucle del agente (recibe mensaje → llama a Gemini → ejecuta tools → devuelve propuesta de diff).</li>
        <li>Componente de frontend para el chat y para la vista de revisión de diffs.</li>
        <li>Script de despliegue básico (Docker Compose para desarrollo local).</li>
      </ol>
      <p>Empieza generando la estructura de carpetas del proyecto y el esqueleto del backend con el cliente de Gemini y las tool definitions. Pregúntame si necesitas decisiones de mi parte antes de asumir algo importante (nombre del proyecto, proveedor de hosting, si el MVP es solo para repos públicos o también privados, etc.).</p>
      <hr />
      <h2 id="notas-para-ti-fuera-del-prompt">Notas para ti (fuera del prompt)</h2>
      <ul>
        <li>Necesitarás una <strong>API key de Gemini</strong> desde Google AI Studio (ai.google.dev) o una cuenta de Vertex AI si prefieres facturación empresarial.</li>
        <li>Necesitarás crear la <strong>GitHub App</strong> desde la configuración de desarrollador de tu cuenta u organización de GitHub (github.com/settings/apps).</li>
        <li>Te recomiendo empezar el MVP soportando solo repos donde tú mismo seas colaborador (para probar sin exponer datos de terceros) antes de abrir el registro público.</li>
      </ul>
    </div>
  );
}
