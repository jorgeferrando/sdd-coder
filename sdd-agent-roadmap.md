# SDD Agent — Roadmap

## Visión general

El roadmap está ordenado por valor entregado vs. complejidad. Cada iteración tiene un criterio de éxito claro que determina si se puede avanzar a la siguiente.

```
IT-0  MVP local          → validar pipeline SDD
IT-1  Primer beta        → primer cliente real
IT-2  Slack intake       → stakeholders no técnicos
IT-3  Trazabilidad       → Jira + GitHub Issues
IT-4  CI/CD              → fiabilidad en producción
IT-5  Multi-dominio      → infra + código
──────────────────────────────────────────────
        PRODUCTO MONETIZABLE MÍNIMO
──────────────────────────────────────────────
IT-6  Memoria semántica  → moat defensible
IT-7  Observabilidad     → confianza del cliente
IT-8  Billing            → ingresos reales
──────────────────────────────────────────────
        PRODUCTO SOSTENIBLE
──────────────────────────────────────────────
IT-9  Multi-repo         → equipos medianos
IT-10 Enterprise         → sectores regulados
```

---

## IT-0 — MVP local

**Objetivo:** validar que el pipeline SDD funciona y genera valor real antes de añadir cualquier integración externa.

**Features**
- Chat UI local en Docker (HTML estático, sin framework)
- Pipeline SDD completo: intake → proposal → design → tasks → implement
- Commits reales al repo local con `git` / `gh`
- Archivos `.sdd/[issue-id]/*.md` versionados en el repo
- Estado de conversación persistido en Postgres
- `docker compose up` con `ANTHROPIC_API_KEY` + `REPO_PATH`

**Stack**
- UI: HTML + fetch (sin build step)
- Gateway: Node.js + Fastify
- Agent: Python + FastAPI
- DB: Postgres 16
- Infra: Docker Compose + Hetzner CAX21

**Criterio de éxito**
El propio equipo usa el agente en un proyecto real y completa al menos 5 tareas de principio a fin.

---

## IT-1 — Primer cliente beta

**Objetivo:** que otra persona instale y use el agente sin ayuda.

**Features**
- Instalación documentada en menos de 5 minutos
- GitHub App básica (lectura/escritura de repo remoto)
- Branch protection: el agente nunca pushea a `main`
- Secret scanning antes de cada commit
- Perímetro de archivos configurable (`protected_paths`)
- Audit log básico en Postgres

**Criterio de éxito**
2-3 devs de confianza instalan el agente y completan una tarea real en su propio repo.

---

## IT-2 — Slack como canal de entrada

**Objetivo:** que stakeholders no técnicos puedan lanzar tareas desde Slack en lenguaje natural.

**Features**
- Bolt.js para recibir mensajes en Slack
- Intake node con parsing de lenguaje natural
- Clarificación con máximo 3 preguntas por tarea
- Todas las respuestas del agente en el mismo hilo de origen
- Comandos básicos: `/sdd status`, `/sdd pause`, `/sdd cancel`
- Modelo de permisos por rol básico (`sdd-agent.config.yml`)

**Criterio de éxito**
Un product manager lanza una tarea desde Slack sin abrir GitHub ni hablar con ningún developer.

---

## IT-3 — Trazabilidad completa

**Objetivo:** que cada tarea sea un artefacto trazable y enlazado en todas las herramientas del equipo.

**Features**
- Creación automática de issue en GitHub con la proposal como descripción
- Sub-issues en GitHub por cada task
- Integración Jira opcional (configurable)
- Links en Slack con resumen completo al finalizar cada fase
- Cierre automático de issues al hacer merge

**Schema nuevo**
```sql
task_references (
  task_id,
  github_issue_number,
  github_pr_number,
  jira_ticket_key,
  jira_epic_key,
  slack_thread_ts
)
```

**Criterio de éxito**
Una tarea lanzada desde Slack genera épica en Jira, issues en GitHub y PR vinculados sin intervención humana.

---

## IT-4 — CI/CD y resiliencia

**Objetivo:** que el agente sea fiable en repos de producción y sepa gestionar fallos.

**Features**
- El agente espera los checks de CI antes de notificar al equipo
- Lee logs de error de CI e intenta autocorregir (límite de intentos configurable)
- Distinción entre errores del agente y errores del entorno (flaky tests, timeouts)
- Retry con backoff exponencial en llamadas a APIs externas
- Estado persistente: si el proceso muere, retoma desde el último checkpoint
- Dead letter queue para tareas irrecuperables
- Comandos nuevos: `/sdd rollback`, `/sdd resume`
- Límites configurables: `max_iterations_per_task`, `max_tokens_per_task`

**Criterio de éxito**
El agente gestiona un fallo de CI sin intervención humana en el 80% de los casos.

---

## IT-5 — Tasks multi-dominio (infra + código)

**Objetivo:** cubrir features que tocan más de una capa del sistema.

**Features**
- Clasificación automática de tasks por dominio: `infra` / `code`
- Grafo de dependencias entre tasks con detección de conflictos
- PR de infra separado con aviso para revisión del equipo de DevOps
- Nivel de autonomía configurable por dominio:
  - `propose` — genera PR, espera aprobación humana
  - `staging_auto` — aplica en staging automáticamente
  - `full_auto` — aplica con aprobación explícita en producción

**Criterio de éxito**
Una feature que toca Redis + backend + frontend se descompone y ejecuta en el orden correcto sin conflictos de merge.

---

> ## 🟢 Producto monetizable mínimo
> Con IT-0 a IT-5 completadas el producto es vendible. Un equipo real pagaría por esto.

---

## IT-6 — Memoria semántica

**Objetivo:** que el agente mejore con el tiempo en cada repo y construya el moat defensible del producto.

**Features**
- pgvector en Postgres para embeddings
- Embeddings con Voyage AI (recomendado por Anthropic)
- Retrieval semántico: el agente busca contexto relevante por similitud en lugar de volcar toda la memoria
- Extracción automática de learnings de cada PR aprobado con Claude
- Tres capas de memoria: repo → org → few-shot/fine-tuning
- Confidence decay semanal para memorias obsoletas
- Compresión periódica para consolidar entradas duplicadas o contradictorias
- Contexto por fase siempre acotado (~2.500 tokens)

**Criterio de éxito**
En el tercer mes de uso el agente hace un 40% menos de preguntas de clarificación y las proposals se ajustan al estilo del equipo sin intervención manual.

---

## IT-7 — Observabilidad y control de costes

**Objetivo:** que el cliente entienda qué está haciendo el agente y controle el gasto.

**Features**
- Dashboard web mínimo: tareas activas, historial, consumo de tokens por tarea y mes
- Audit log navegable en el dashboard
- Comandos Slack: `/sdd cost`, `/sdd history`
- Notificación proactiva al aproximarse al límite mensual
- El agente nunca aborta silenciosamente: siempre notifica antes de detenerse
- Resumen semanal automático en Slack: tareas completadas, tokens consumidos, coste estimado

**Criterio de éxito**
El cliente puede responder "¿cuánto he gastado este mes y qué ha hecho el agente?" en menos de 10 segundos.

---

## IT-8 — Billing y onboarding

**Objetivo:** cobrar por el producto de forma sostenible sin intervención manual.

**Features**
- Stripe integrado con metering por tarea completada
- Pricing por tarea: $8 simple / $45 feature / $70 epic
- Onboarding guiado: GitHub App → Slack bot → `sdd-agent.config.yml` → primera tarea en <10 min
- Panel web para conectar integraciones opcionales (Jira, Linear) vía OAuth
- Free trial: primeras 10 tareas sin coste
- Emails transaccionales con Resend: bienvenida, resumen mensual, alertas de límite

**Criterio de éxito**
Un cliente desconocido puede instalar el agente, completar una tarea y pagar sin hablar con ninguna persona del equipo.

---

> ## 🟢 Producto sostenible
> Con IT-0 a IT-8 el producto genera ingresos recurrentes de forma autónoma.

---

## IT-9 — Soporte monorepo y multi-repo

**Objetivo:** cubrir arquitecturas de equipos medianos y grandes.

**Features**
- Detección automática de workspaces en monorepos
- Épicas que generan PRs coordinados en múltiples repos
- Orden de merge según dependencias declaradas entre repos
- Configuración de repos en `sdd-agent.config.yml`

**Criterio de éxito**
Una épica que requiere cambios en `api-repo` y `frontend-repo` se ejecuta en el orden correcto con PRs enlazados.

---

## IT-10 — Compliance y tier enterprise

**Objetivo:** desbloquear clientes en sectores regulados (fintech, salud, legal).

**Features**
- Zero data retention con Anthropic API enterprise
- Opción on-premise con modelo local (Llama 3.x vía Ollama)
- Audit log exportable en formato estándar
- SSO (SAML / OIDC)
- SLA y soporte dedicado
- Configuración de compliance en `sdd-agent.config.yml`

**Criterio de éxito**
Un cliente fintech regulado puede instalar el agente cumpliendo sus requisitos de seguridad internos.

---

## Dependencias entre iteraciones

```
IT-0 ──► IT-1 ──► IT-2 ──► IT-3
                    │
                    ▼
                   IT-4 ──► IT-5
                              │
                              ▼
                   IT-6 ──► IT-7 ──► IT-8
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                             IT-9             IT-10
```

Cada iteración es prerequisito de la siguiente en la rama principal. IT-9 e IT-10 son paralelas y opcionales hasta alcanzar el tier enterprise.

---

*Roadmap — SDD Agent v1.0*
