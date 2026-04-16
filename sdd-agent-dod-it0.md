# SDD Agent MVP — Definition of Done (IT-0)

## Criterio general de aceptación

El MVP está completo cuando un developer puede arrancar el agente con un único comando, describir una tarea en lenguaje natural, y obtener commits reales en su repo local con los archivos `.sdd/*.md` generados y código implementado — sin ninguna configuración adicional.

---

## 1. Infraestructura y arranque

- [ ] `docker compose up` arranca todos los servicios sin errores
- [ ] El único input requerido son dos variables de entorno: `ANTHROPIC_API_KEY` y `REPO_PATH`
- [ ] El chat es accesible en `http://localhost:8080` tras el arranque
- [ ] Si Postgres no tiene tablas, el init script las crea automáticamente al primer arranque
- [ ] Si se reinicia Docker, el agente retoma la conversación desde el último estado persistido
- [ ] Los servicios se comunican correctamente entre sí (gateway → agent → postgres)
- [ ] El repo del cliente está montado en `/repo` dentro del contenedor del agente
- [ ] Las credenciales de `git` y `gh` del host están disponibles dentro del contenedor

---

## 2. Chat UI

- [ ] El chat se carga correctamente en el navegador sin errores de consola
- [ ] El usuario puede escribir un mensaje y enviarlo con Enter o con el botón
- [ ] Shift+Enter añade una nueva línea sin enviar
- [ ] Los mensajes del usuario y del agente se distinguen visualmente
- [ ] La phase bar refleja la fase actual del pipeline en tiempo real
- [ ] El indicador de "typing" aparece mientras el agente procesa
- [ ] El panel lateral se abre automáticamente al generarse un archivo `.md`
- [ ] El git log muestra los commits realizados en orden cronológico
- [ ] El chat es usable en pantallas de al menos 1280px de ancho
- [ ] Si hay un error de API, el chat muestra un mensaje de error legible (no un stack trace)

---

## 3. Fase Intake

- [ ] El agente analiza el mensaje inicial del usuario
- [ ] Si la petición es ambigua, el agente hace como máximo 3 preguntas de clarificación
- [ ] Si la petición es suficientemente clara, el agente pasa directamente a Proposal sin preguntar
- [ ] El agente lee la estructura de ficheros del repo montado para inferir contexto
- [ ] El agente lee los últimos 20 commits del repo para entender el historial
- [ ] El agente no avanza a Proposal hasta tener suficiente contexto

---

## 4. Fase Proposal

- [ ] El agente genera un archivo `proposal.md` con la estructura SDD correcta:
  - Problema
  - Solución propuesta
  - Impacto estimado
  - Riesgos
  - Dudas (si las hay)
- [ ] El archivo se commitea en `.sdd/[slug]/proposal.md` en el repo local
- [ ] El commit tiene un mensaje descriptivo: `sdd: add proposal for [slug]`
- [ ] El agente muestra la proposal en el chat y espera aprobación explícita
- [ ] El indicador "awaiting approval" es visible en el chat
- [ ] Si el usuario sugiere cambios, el agente itera la proposal antes de avanzar
- [ ] El agente no avanza a Design sin aprobación explícita del usuario

---

## 5. Fase Design

- [ ] El agente genera un archivo `design.md` con la estructura SDD correcta:
  - Arquitectura
  - Cambios en modelos / DB
  - Interfaces y contratos
  - Consideraciones de seguridad
  - Dudas (si las hay)
- [ ] El archivo se commitea en `.sdd/[slug]/design.md`
- [ ] El commit tiene un mensaje descriptivo: `sdd: add design for [slug]`
- [ ] El agente muestra el design en el chat y espera aprobación explícita
- [ ] El agente no avanza a Tasks sin aprobación explícita del usuario

---

## 6. Fase Tasks

- [ ] El agente genera un archivo `tasks.md` con tareas atómicas e independientes
- [ ] Cada task incluye: nombre, archivos afectados, criterio de aceptación y tests requeridos
- [ ] El archivo se commitea en `.sdd/[slug]/tasks.md`
- [ ] El commit tiene un mensaje descriptivo: `sdd: add tasks for [slug]`
- [ ] El agente muestra las tasks en el chat y espera aprobación explícita
- [ ] El agente no avanza a Implement sin aprobación explícita del usuario

---

## 7. Fase Implement

- [ ] El agente ejecuta las tasks en orden, una a una
- [ ] Cada task genera al menos un commit en el repo con código real
- [ ] El mensaje de cada commit describe la task implementada
- [ ] El agente trabaja siempre en una rama nueva (`sdd/[slug]`), nunca en `main`
- [ ] Al finalizar todas las tasks, el agente abre un PR con `gh pr create`
- [ ] El PR incluye en la descripción los links a los archivos `.sdd/*.md`
- [ ] El agente notifica en el chat que el PR está abierto con el número y el link
- [ ] Si el agente tiene una duda bloqueante durante el implement, para y pregunta antes de continuar

---

## 8. Estructura de ficheros en el repo

- [ ] Los archivos `.sdd/` se crean correctamente en la raíz del repo del cliente
- [ ] La estructura es: `.sdd/[slug]/proposal.md`, `design.md`, `tasks.md`
- [ ] Los archivos son texto markdown válido y legible
- [ ] Los archivos persisten en el repo tras reiniciar Docker

---

## 9. Persistencia y estado

- [ ] El estado de la conversación se guarda en Postgres por `thread_id`
- [ ] La fase actual del pipeline se persiste correctamente
- [ ] Al reiniciar el contenedor del agente, la conversación puede retomarse desde el mismo punto
- [ ] Múltiples conversaciones (thread_ids distintos) no interfieren entre sí

---

## 10. Seguridad básica

- [ ] El agente nunca hace commit a `main` o `develop` directamente
- [ ] El agente no incluye el valor de `ANTHROPIC_API_KEY` en ningún commit ni log
- [ ] Los archivos `.env*` no son modificados por el agente bajo ninguna circunstancia

---

## 11. Calidad del output

- [ ] La proposal generada es coherente con la petición del usuario
- [ ] El design generado es coherente con la proposal aprobada
- [ ] Las tasks generadas son coherentes con el design aprobado
- [ ] El código generado en Implement referencia correctamente los ficheros del repo
- [ ] El agente no inventa dependencias, librerías o patrones que no existen en el repo

---

## 12. Casos límite

- [ ] Si el usuario envía un mensaje vacío, el agente no procesa ni responde
- [ ] Si la API de Claude está caída, el chat muestra un error claro y no se bloquea
- [ ] Si el repo montado en `/repo` no es un repositorio git válido, el agente lo notifica al arrancar
- [ ] Si `gh` no está autenticado en el host, el agente avisa antes de intentar crear el PR
- [ ] Si el agente no puede hacer commit (permisos, repo en estado inválido), notifica el error en el chat

---

## Entregables del MVP

| Entregable | Descripción |
|---|---|
| `docker-compose.yml` | Orquestación completa de todos los servicios |
| `apps/ui/index.html` | Chat UI estático sin dependencias de build |
| `apps/gateway/` | Node.js + Fastify — recibe mensajes y los enruta al agente |
| `apps/agent/` | Python + FastAPI — pipeline SDD completo |
| `apps/agent/pipeline.py` | Lógica de las fases intake → implement |
| `apps/agent/git_tools.py` | Wrapper de git y gh CLI |
| `postgres/init.sql` | Schema inicial de la base de datos |
| `.env.example` | Variables de entorno requeridas documentadas |
| `README.md` | Instrucciones de instalación y uso en menos de 5 minutos |

---

## 13. Estrategia de tests

### Principio general

No se testea el LLM, se testea el código alrededor del LLM. La mayoría de la lógica del pipeline es testeable sin gastar un solo token.

### Tres capas

**Capa 1 — Unit tests con mock (gratis, rápidos)**

Mockean la respuesta de Claude y validan la lógica propia del pipeline: parsing del JSON, transiciones de fase, lógica de commits, manejo de errores. Cubren el 80% de los casos.

```python
# Ejemplo
def test_proposal_commits_md_file():
    mock_response = """{
      "phase": "proposal",
      "message": "Proposal generada",
      "file": {"name": "proposal.md", "content": "# Proposal\\n..."},
      "gitCommit": "sdd: add proposal for auth-google",
      "awaitingApproval": true
    }"""

    with patch("pipeline.claude.messages.create") as mock:
        mock.return_value.content[0].text = mock_response
        result = pipeline.proposal("añadir login con Google")
        assert result["phase"] == "proposal"
        assert result["awaitingApproval"] == True
```

**Capa 2 — Integration tests con Claude Haiku**

Para los tests que sí necesitan una respuesta real del LLM: validar que el JSON sale bien formado, que el prompt produce la estructura SDD correcta, que las transiciones de fase funcionan end-to-end. Se usan con moderación.

**Capa 3 — E2E manuales con Claude Sonnet**

Solo para validar calidad real del output antes de un release. No se automatizan.

### Comparativa de opciones para integration tests

| Opción | Coste/test | Velocidad | JSON fiable | Recomendado |
|---|---|---|---|---|
| Claude Haiku | ~$0.001 | Rápido | ✅ Sí | ✅ MVP |
| GPT-4o mini (OpenRouter) | ~$0.001 | Rápido | ✅ Sí | Alternativa |
| Gemini Flash (OpenRouter) | ~$0.0003 | Muy rápido | ⚠️ Variable | No por ahora |
| Llama local (Ollama) | $0 | Lento en CPU | ❌ Inconsistente | No en MVP |

No usar modelos locales para el MVP. La calidad del JSON estructurado con modelos pequeños es inconsistente y el tiempo de debugging supera el ahorro en coste.

### Coste estimado de desarrollo IT-0

| Periodo | Llamadas estimadas | Coste (Haiku) |
|---|---|---|
| Día de desarrollo activo | ~50 llamadas | ~$0.05 |
| Semana | ~300 llamadas | ~$0.30 |
| IT-0 completo (6 semanas) | ~2.000 llamadas | ~$2 |

El coste real de tokens viene cuando haya clientes ejecutando tareas completas con Sonnet, no durante el desarrollo.

### DoD de tests

- [ ] Los unit tests corren sin conexión a internet y sin API key
- [ ] Los unit tests cubren las transiciones de fase del pipeline
- [ ] Los unit tests cubren el parsing del JSON de respuesta de Claude
- [ ] Los unit tests cubren los casos de error de `git_tools.py`
- [ ] Los integration tests con Haiku validan que el prompt genera JSON válido
- [ ] Los integration tests con Haiku validan que cada fase produce el archivo `.md` correcto
- [ ] `pytest` pasa en local y dentro del contenedor Docker sin configuración adicional

---

## README mínimo requerido

El README debe cubrir exactamente estos puntos para que el MVP sea instalable por otra persona:

1. Requisitos previos (Docker, git, gh autenticado, API key de Anthropic)
2. Clonar el repo
3. Copiar `.env.example` a `.env` y rellenar las variables
4. `docker compose up`
5. Abrir `http://localhost:8080`
6. Ejemplo de primera tarea para probar

---

*Definition of Done — SDD Agent IT-0*
