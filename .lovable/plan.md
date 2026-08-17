# Persistencia de Conexión con GitHub

Este plan aborda el problema de la pérdida de la conexión con GitHub al recargar la página (F5) o actualizar el navegador. Actualmente, el dashboard depende de la respuesta de `ensureProfile` para determinar si el usuario está conectado, pero la lógica de obtención del token de GitHub puede ser inconsistente entre el flujo de login social y el flujo de OAuth App personalizado.

## Problema
Al recargar la página, el estado de "conectado" a GitHub se pierde visualmente o se reporta como "desconectado" a pesar de que el usuario ya ha realizado la conexión previamente. Esto ocurre porque el token de GitHub no se recupera correctamente de la base de datos o el estado del frontend no se sincroniza adecuadamente con la sesión persistida.

## Cambios propuestos

### Backend (Server Functions)
1.  **Refactorizar `ensureProfile` en `src/lib/profile/profile.functions.ts`**:
    *   Asegurar que al sincronizar el perfil, no se sobreescriba el `github_access_token` existente con un valor nulo si `provider_token` no está presente en los claims (que suele ocurrir en recargas de página cuando no es un callback de auth directo).
    *   Mejorar la lógica de retorno para incluir siempre el estado actual de la conexión almacenada en la base de datos.

### Frontend (Dashboard)
2.  **Actualizar `src/routes/dashboard.tsx`**:
    *   Asegurar que la llamada a `ensureProfile` al cargar el layout sea robusta y refresque el estado de la aplicación.
3.  **Refactorizar `DashboardHome` en `src/routes/dashboard/index.tsx`**:
    *   Cambiar la dependencia del estado de GitHub. En lugar de depender exclusivamente de `githubReposQuery.data?.connected` (que es una consulta a la API de GitHub), usar una consulta de perfil más ligera o el estado retornado por `ensureProfile` para mostrar el estado inicial.
    *   Asegurar que `githubReposQuery` se ejecute automáticamente si el perfil indica que hay un token guardado, permitiendo que la conexión se recupere sola tras un F5.

## Detalles Técnicos
*   Uso de `upsert` en Supabase con cuidado de no resetear columnas de tokens.
*   Uso de `useQuery` de TanStack Query para mantener el estado sincronizado globalmente.
*   Validación de tokens en el backend para evitar estados de "conectado" falsos con tokens expirados.

## Verificación
*   Realizar login con GitHub.
*   Verificar estado "Conectado" en el Dashboard.
*   Presionar F5 y verificar que el estado se mantiene como "Conectado" y los repositorios se cargan sin intervención del usuario.
