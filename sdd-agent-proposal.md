# SDD Agent — Proposal v0.3

## Problema

Los equipos de desarrollo pierden tiempo y calidad en la gestión de tareas: issues mal definidos, decisiones de arquitectura no documentadas, reviews lentas y contexto que se pierde entre sprints. Los agentes de IA genéricos no resuelven esto porque no conocen el proyecto, no preguntan antes de actuar y no aprenden del feedback del equipo.

Además, las peticiones de producto llegan de forma informal — un mensaje en Slack, una conversación — y alguien tiene que traducirlo manualmente a un issue estructurado, una épica en Jira y tareas técnicas. Ese trabajo invisible consume tiempo de los mejores perfiles del equipo.

---

## Solución propuesta

**SDD Agent** es un agente de ingeniería autónomo que convierte cualquier petición — desde un mensaje informal en Slack hasta un issue técnico en GitHub — en una tarea completamente ejecutada, documentada y trazable, siguiendo el pipeline Spec-Driven Development (SDD).

El agente cubre el ciclo completo: intake, clarificación, proposal, diseño, creación de issues/tickets, implementación (código e infra), PR y aprendizaje continuo. Todo el razonamiento queda versionado en el propio repositorio del cliente como archivos `.md`.

---

## Triggers soportados

| Origen | Ejemplo | Notas |
|---|---|---|
| **Slack** | "queremos actualizaciones en tiempo real de acciones y ETFs" | Lenguaje natural, stakeholder de producto |
| **GitHub Issue** | Issue técnico estructurado | Trigger clásico de desarrollo |
| **GitLab Issue** | Igual que GitHub | Configurable por cliente |

El trigger por Slack es el más valioso: permite que cualquier stakeholder lance una tarea sin necesidad de conocer las herramientas del equipo de desarrollo.

---

## Flujo completo de una tarea

```
Slack / GitHub Issue / GitLab Issue
        │
        ▼
  [intake_node]
  ├── Parsea la intención (lenguaje natural → estructura)
  ├── Detecta ambigüedades bloqueantes
  ├── Busca contexto en memoria del repo
  └── Genera máximo 3 preguntas de clarificación
        │
        ▼
  Stakeholder responde en Slack (mismo hilo)
        │
        ▼
  [proposal_node]
  └── Genera proposal.md con contexto completo
        │
        ▼
  [create_tracking_node]
  ├── Crea issue en GitHub con proposal como descripción
  ├── Crea épica en Jira (si está configurado)
  ├── Enlaza ambos entre sí
  └── Responde en Slack con los links
        │
        ▼
  [design_node]
  └── Genera design.md → commit a .sdd/[issue-id]/
        │
        ▼
  [tasks_node]
  ├── Genera tasks.md clasificadas por dominio
  │   ├── INFRA: cambios de configuración, IaC, secrets
  │   └── CÓDIGO: implementación, tests
  ├── Calcula grafo de dependencias entre tasks
  └── Crea sub-issues en GitHub + subtareas en Jira
        │
        ▼
  [execute_node] — respeta el grafo de dependencias
  ├── Tasks INFRA → genera PR con cambios IaC
  │   └── Avisa al equipo de infra para revisión
  └── Tasks CÓDIGO → implementa con Claude API
        │
        ├── ¿Duda bloqueante? → pregunta en Slack → espera → retoma
        ├── Secret scan antes de cada commit
        ├── Límite de iteraciones por task
        │
        ▼
  PR abierto por cada task (rama propia, nunca main)
  ├── Referencia su issue/subtarea
  ├── Incluye link a .sdd/*.md
  ├── Espera resultado de CI/CD
  │   ├── CI falla → lee log → corrige → nuevo commit
  │   └── CI pasa → notifica en Slack para revisión
  └── Lee review comments → itera
        │
        ▼
  Merge → cierra issue/subtarea automáticamente
        │
        ▼
  Feedback persiste en memoria del repo
```

---

## Ejemplo real: petición desde Slack

**Petición inicial:**
```
👤 Ana (Product): queremos añadir actualizaciones en tiempo 
real de acciones y etfs a nuestro dashboard fintech
```

**Respuesta del agente (mismo hilo):**
```
🤖 SDD Agent:
Perfecto, lo proceso. Antes de generar la proposal 
necesito aclarar 3 puntos:

1. ¿"Tiempo real" significa WebSockets continuos o 
   refresco cada X segundos es suficiente?
2. ¿Tenéis ya contrato con algún proveedor de datos 
   financieros (Polygon, Alpha Vantage, Twelve Data)?
3. ¿Afecta solo al dashboard web o también a la app móvil?

El resto lo infiero del repo.
```

**Tras la respuesta de Ana:**
```
🤖 SDD Agent:

He procesado la petición. Aquí el resumen:

📋 Épica Jira:   FIN-234 — Real-time market data
🐙 Issue GitHub: #456 — feat: real-time stock & ETF updates
📄 Proposal:     .sdd/456-realtime-market/proposal.md

Sub-tareas creadas:
  FIN-235 / #457 — [infra] Redis cache setup
  FIN-236 / #458 — [infra] Load balancer sticky sessions
  FIN-237 / #459 — [infra] API key secret management
  FIN-238 / #460 — [code] Polygon.io client
  FIN-239 / #461 — [code] WebSocket server endpoint
  FIN-240 / #462 — [code] React dashboard component

Las tasks de infra esperan revisión del equipo.
Arranco con las de código. 🚀
```

Todo en el mismo hilo. Sin ruido, sin canales nuevos.

---

## Tasks multi-dominio

Una feature puede cruzar capas de código e infraestructura. El agente lo detecta en la fase de diseño y genera tasks clasificadas con sus dependencias explícitas.

```markdown
# Tasks: Real-time market data

## INFRA
[ ] Task 1: Configurar Redis para caché de precios
    - Archivos: docker-compose.yml, k8s/redis.yaml
    - Criterio: Redis disponible en todos los entornos

[ ] Task 2: Habilitar sticky sessions en load balancer
    - Archivos: nginx.conf / k8s/ingress.yaml
    - Criterio: WebSocket connections no se cortan al escalar

[ ] Task 3: Añadir secret MARKET_DATA_API_KEY
    - Archivos: .env.example, k8s/secrets.yaml
    - Criterio: secret disponible en staging y producción

## CÓDIGO
[ ] Task 4: Cliente Polygon.io          [depende de: Task 3]
[ ] Task 5: WebSocket server endpoint   [depende de: Task 2, 4]
[ ] Task 6: Componente React dashboard  [depende de: Task 5]
```

---

## Estructura de archivos en el repo del cliente

```
.sdd/
  456-realtime-market/
    proposal.md
    design.md
    tasks.md
  457-fix-auth-bug/
    proposal.md
    design.md
    tasks.md
```

---

## Seguridad

Es el requisito más crítico para que el agente sea instalable en repos de producción.

### Branch protection
El agente nunca pushea directamente a `main` o `develop`. Siempre trabaja en ramas propias con el patrón `sdd/[issue-id]-[slug]`.

### Secret scanning
Antes de cada commit, el agente escanea el diff en busca de patrones de secrets (API keys, tokens, contraseñas). Si detecta algo, aborta el commit y notifica en Slack.

### Perímetro de archivos
El cliente define qué archivos están fuera del alcance del agente:

```yaml
# sdd-agent.config.yml
security:
  protected_paths:
    - ".env*"
    - "k8s/secrets/*"
    - "*.pem"
    - "*.key"
  allowed_paths:
    - "src/**"
    - "k8s/*.yaml"  # excepto secrets
    - "docker-compose*.yml"
```

### Audit log
Registro inmutable de cada acción del agente: qué ficheros tocó, qué commits hizo, qué issues creó y quién aprobó cada fase.

```sql
audit_log (
  id,
  repo_id,
  task_id,
  action,        -- 'commit' | 'pr_open' | 'issue_create' | 'slack_message'
  actor,         -- 'agent' | user_id
  payload,       -- JSONB con detalles
  created_at
)
```

---

## Control humano

El agente es autónomo pero siempre controlable. Los stakeholders pueden intervenir en cualquier momento desde Slack:

```
/sdd status          → lista tareas activas con su fase actual
/sdd status #456     → detalle de una tarea concreta
/sdd pause #456      → pausa la tarea en el estado actual
/sdd resume #456     → retoma una tarea pausada
/sdd cancel #456     → cancela y cierra el issue
/sdd rollback #456   → revierte los commits de esa tarea
/sdd cost            → consumo de tokens este mes
```

El agente nunca aborta silenciosamente. Si alcanza un límite o encuentra un error irrecuperable, notifica en Slack con el estado exacto y espera instrucciones.

---

## Permisos por rol

No cualquiera puede disparar o aprobar acciones del agente.

```yaml
# sdd-agent.config.yml
permissions:
  trigger_from_slack:
    - role: product_manager
    - role: tech_lead
    - role: developer
  approve_proposal:
    - role: tech_lead
  approve_infra_tasks:
    - role: devops
    - role: tech_lead
  cancel_task:
    - role: tech_lead
  rollback:
    - role: tech_lead
```

Los roles se mapean a usuarios o grupos de Slack y GitHub.

---

## Integración con CI/CD

El agente no considera una task completa hasta que el CI pasa.

```
PR abierto
    │
    ▼
Espera webhook de GitHub Actions / GitLab CI
    │
    ├── CI pasa → notifica en Slack para revisión humana
    │
    └── CI falla
            │
            ▼
        Lee log de error
            │
            ▼
        Intenta corregir → nuevo commit
            │
            ▼
        Si falla N veces → pausa y notifica
```

Límite configurable de intentos de corrección automática para evitar loops infinitos.

---

## Control de costes

Un agente sin límites puede generar gastos inesperados.

```yaml
# sdd-agent.config.yml
agent:
  limits:
    max_iterations_per_task: 5
    max_tokens_per_task: 500000
    monthly_budget_usd: 200
    on_limit_reached: "pause_and_notify"   # nunca abortar silenciosamente
```

El agente reporta el consumo acumulado al inicio de cada semana en el canal de Slack configurado.

---

## Observabilidad

### Comandos Slack
```
/sdd status     → tareas activas, fases y progreso
/sdd cost       → consumo de tokens y coste estimado del mes
/sdd history    → últimas 10 tareas completadas
```

### Dashboard web (post-MVP)
Vista mínima con:
- Tareas activas y su fase actual
- Historial de tareas completadas
- Consumo de tokens por tarea y por mes
- Audit log navegable

---

## Recuperación de errores

El pipeline es resiliente a fallos externos.

- **Retry con backoff exponencial** en llamadas a Claude API, GitHub API, Jira y Slack
- **Estado persistente en Postgres**: si el proceso muere, retoma desde el último checkpoint
- **Timeouts explícitos** por fase para evitar tareas bloqueadas indefinidamente
- **Dead letter queue** en Redis para tareas que han fallado N veces — revisión manual

---

## Soporte multi-repo y monorepo

### Monorepo
El agente detecta los workspaces afectados por la tarea y genera tasks por workspace, manteniendo un único PR o PRs coordinados según la configuración.

### Multi-repo
Una épica puede generar PRs en repositorios distintos. El agente coordina el orden de merge según las dependencias declaradas en el design.

```yaml
# sdd-agent.config.yml
repos:
  - name: api
    url: github.com/org/api-repo
  - name: frontend
    url: github.com/org/frontend-repo
  - name: infra
    url: github.com/org/infra-repo
```

Esta feature se considera para v2. En el MVP el agente opera sobre un único repo.

---

## Privacidad y compliance

El código del cliente es procesado por Claude API (Anthropic). Para equipos en sectores regulados esto requiere respuestas explícitas:

- **Data retention**: Anthropic ofrece opción de zero data retention (ZDR) para API enterprise. Recomendado para clientes fintech, salud y legal.
- **GDPR**: los datos de usuarios (nombres en Slack, emails) no se envían al LLM. Solo se procesa código y contexto técnico.
- **On-premise**: considerado para tier enterprise en v2. Requiere modelo local (Llama 3.x) en lugar de Claude API.

```yaml
# sdd-agent.config.yml
compliance:
  zero_data_retention: true   # requiere plan Anthropic API enterprise
  exclude_from_context:
    - "*.test.ts"              # no enviar datos de test con PII
    - "fixtures/**"
```

---

## Onboarding

La fricción de instalación es parte del producto. El proceso debe completarse en menos de 10 minutos.

**Pasos:**
1. Instalar la GitHub App desde el marketplace → permisos automáticos
2. Añadir el bot a Slack con `/invite @sdd-agent`
3. Hacer commit del archivo `sdd-agent.config.yml` al repo
4. El agente detecta el archivo, valida la configuración y confirma en Slack

Jira y otros sistemas opcionales se conectan desde un panel web mínimo con OAuth.

---

## Arquitectura técnica

### Stack

| Capa | Tecnología |
|---|---|
| Webhook / Integraciones | Node.js + Fastify |
| Slack Bot | Node.js + Bolt.js |
| GitHub API | Node.js + Octokit |
| Jira / Linear API | Node.js (configurable) |
| Auth + Billing | Node.js + Fastify |
| Agent Orchestration | Python + FastAPI |
| Pipeline SDD | Python + LangGraph |
| LLM | Claude API (Anthropic) |
| Memoria | Postgres + pgvector |
| Queue | Redis (BullMQ / ARQ) |
| Infra | Hetzner VPS + Docker Compose |

### Comunicación entre servicios

```
Gateway (Node/Fastify)
    │
    ├── Recibe webhook GitHub/GitLab/Slack
    ├── Valida firma
    ├── Parsea entrada (issue o mensaje natural)
    └── Publica en Redis ──► Agent (Python/FastAPI)
                                  │
                                  ├── Consume job
                                  ├── Ejecuta pipeline SDD
                                  └── Responde via Redis ──► Gateway
                                                                │
                                                                ├── Commit .md al repo
                                                                ├── Crea issues/tickets
                                                                ├── Mensaje Slack (hilo)
                                                                └── Abre PR
```

### Schema principal

```sql
tasks (
  id,
  repo_id,
  source,                -- 'slack_message' | 'github_issue' | 'gitlab_issue'
  source_ref,
  raw_input,
  clarifications,        -- JSONB
  domain_breakdown,      -- JSONB { infra: [...], code: [...] }
  phase,
  status,                -- 'active' | 'paused' | 'cancelled' | 'completed'
  tokens_used,
  created_at
)

task_references (
  task_id,
  github_issue_number,
  github_pr_number,
  jira_ticket_key,
  jira_epic_key,
  slack_thread_ts
)

audit_log (
  id,
  repo_id,
  task_id,
  action,
  actor,
  payload,               -- JSONB
  created_at
)

repo_memory (
  repo_id,
  category,
  key,
  value,
  confidence,            -- 0.0 a 1.0
  embedding,             -- vector(1536) para pgvector
  source,
  reinforced_at
)

learning_events (
  repo_id,
  task_id,
  phase,
  original_output,
  edited_output,
  diff,
  created_at
)
```

---

## Memoria del agente

### Tres capas

**Capa 1 — Repo memory (corto/medio plazo)**
Convenciones de código, stack técnico, decisiones de arquitectura, preguntas ya resueltas. Se alimenta automáticamente de respuestas Slack, PRs aprobados y feedback explícito.

**Capa 2 — Org memory (medio plazo)**
Patrones que se repiten entre repos del mismo cliente: stack preferido, estilo de comunicación, quién aprueba qué tipo de decisión.

**Capa 3 — Few-shot / fine-tuning (largo plazo)**
Los pares `(output agente → output aprobado por humano)` forman un dataset de entrenamiento que se construye solo mientras el producto funciona.

### Retrieval semántico con pgvector
El contexto enviado al LLM queda siempre acotado (~2.500 tokens por fase) mediante búsqueda por similitud semántica, independientemente del volumen de memoria acumulada.

### Gestión del crecimiento

| Problema | Solución |
|---|---|
| Entradas duplicadas | Compresión periódica con Claude |
| Memorias obsoletas | Confidence decay semanal |
| Contexto demasiado grande | pgvector retrieval semántico |
| Ejemplos contradictorios | Consolidación automática |

---

## Configuración por cliente

```yaml
# sdd-agent.config.yml
integrations:
  github: true
  gitlab: false
  jira:
    enabled: true
    project_key: "FIN"
    epic_type: "Epic"
  linear:
    enabled: false
  slack:
    channel: "#producto"
    notify_on:
      - proposal_ready
      - pr_opened
      - pr_merged
      - infra_review_needed
      - ci_failed
      - limit_reached

agent:
  autonomy:
    infra_tasks: "propose"        # propose | staging_auto | full_auto
    code_tasks: "full_auto"
  max_clarification_questions: 3
  languages: ["typescript", "python"]
  limits:
    max_iterations_per_task: 5
    max_tokens_per_task: 500000
    monthly_budget_usd: 200
    on_limit_reached: "pause_and_notify"

permissions:
  trigger_from_slack: [product_manager, tech_lead, developer]
  approve_proposal: [tech_lead]
  approve_infra_tasks: [devops, tech_lead]
  cancel_task: [tech_lead]
  rollback: [tech_lead]

security:
  protected_paths: [".env*", "k8s/secrets/*", "*.pem", "*.key"]
  secret_scan_on_commit: true

compliance:
  zero_data_retention: false
  exclude_from_context: []
```

---

## Modelo de negocio

### Pricing por tarea completada

| Tipo | Precio | Coste API (Claude) | Margen |
|---|---|---|---|
| Bug / tarea simple | $8 | ~$0.15 | ~98% |
| Feature media | $45 | ~$0.35 | ~99% |
| Epic / multi-PR | $70 | ~$1.50 | ~98% |

### Proyección mensual

| Escenario | Equipos | Tareas/mes | Revenue | Coste infra+API | Beneficio |
|---|---|---|---|---|---|
| Beta (3 equipos) | 3 | 60 | $1.800 | ~$55 | ~$1.745 |
| Tracción (10 equipos) | 10 | 200 | $6.000 | ~$130 | ~$5.870 |
| Escala (30 equipos) | 30 | 600 | $18.000 | ~$320 | ~$17.680 |

### Infraestructura inicial

| Concepto | Coste/mes |
|---|---|
| Hetzner CAX21 (VPS) | ~€8 |
| Dominio | ~€1 |
| Claude API (beta, ~100 tareas) | ~$25 |
| Resend (email transaccional) | $0 |
| **Total** | **~€35–40** |

---

## MVP — Alcance mínimo para validar

**Fase 1 — Pipeline básico**
- Webhook GitHub → FastAPI → Redis
- Pipeline SDD: Proposal → Design → Tasks
- Commit automático de `.md` al repo (rama propia, nunca main)
- Secret scan antes de cada commit
- Notificación Slack básica (mismo hilo)

**Fase 2 — Intake por Slack + permisos**
- Bolt.js para recibir mensajes en Slack
- Intake node con clarificación (máx. 3 preguntas)
- Modelo de permisos por rol básico
- Creación automática de issue en GitHub

**Fase 3 — Trazabilidad + control**
- Sub-issues por task en GitHub
- Integración Jira opcional
- Comandos `/sdd status`, `/sdd pause`, `/sdd cancel`
- Audit log

**Fase 4 — Tasks multi-dominio + CI/CD**
- Clasificación infra / código
- Grafo de dependencias entre tasks
- Integración con CI/CD (espera checks, corrige fallos)

**Fase 5 — Implementación y aprendizaje**
- Nodo implement con Claude API
- Apertura automática de PR
- Lectura de review comments e iteración
- pgvector para retrieval semántico de memoria

---

## Diferencial competitivo

| | SDD Agent | Devin / Copilot Workspace |
|---|---|---|
| Trigger | Slack en lenguaje natural | Issue estructurado |
| Clarificación | Pregunta antes de ejecutar | Asume y actúa |
| Trazabilidad | Issue + Jira + .md versionados | Variable |
| Infra + código | Detecta y separa dominios | Solo código |
| Memoria | Acumula por repo y org | Sin memoria persistente |
| Transparencia | Todo en el repo, auditable | Caja negra |
| Control | Pause / cancel / rollback | Limitado |
| Seguridad | Branch protection + secret scan | Variable |
| CI/CD | Espera checks, autocorrige | No siempre |

---

## ⚠️ Dudas / decisiones pendientes

- ¿Instalación como GitHub App propia o via OAuth?
- ¿Soporte GitLab desde el MVP o en fase 2?
- ¿Dashboard web mínimo en el MVP o solo Slack?
- ¿Billing por tarea desde el inicio o modelo flat rate en beta?
- ¿Nivel de autonomía en infra por defecto: `propose` siempre o configurable desde el inicio?
- ¿Soportar Linear además de Jira en el MVP?
- ¿Soporte monorepo desde el MVP o en v2?
- ¿Ofrecer zero data retention desde el inicio o solo en tier enterprise?

---

## Riesgos y retos técnicos a valorar

Esta sección recoge los riesgos identificados en la fase de diseño para que sean considerados en la priorización de cada iteración.

### Riesgos por severidad

| Riesgo | Tipo | Severidad |
|---|---|---|
| El agente rompe código en producción | Negocio | 🔴 Crítico |
| Contexto del repo insuficiente o incorrecto | Técnico | 🔴 Crítico |
| Output no determinista del LLM | Técnico | 🔴 Crítico |
| Capacidad de ejecución (recursos limitados) | Ejecución | 🔴 Crítico |
| Grafo de dependencias entre tasks frágil | Técnico | 🟠 Alto |
| Degradación de la memoria | Técnico | 🟠 Alto |
| CI/CD más complejo de lo esperado | Técnico | 🟠 Alto |
| Slack multi-turno con estado persistente | Técnico | 🟠 Alto |
| Intake de lenguaje natural impreciso | Técnico | 🟠 Alto |
| Onboarding real vs. onboarding diseñado | Negocio | 🟡 Medio |

---

### Detalle de cada riesgo

**🔴 El agente rompe código en producción**
Un agente autónomo que escribe código puede introducir bugs sutiles que pasan los tests pero rompen comportamiento en producción. El problema no es solo técnico sino de responsabilidad: cuando algo sale mal, ¿quién es el responsable? Un fallo grave con un cliente importante puede matar el producto.
Mitigación: staging obligatorio, tests de regresión antes de cualquier PR, scope conservador en las primeras versiones.

**🔴 Contexto del repo insuficiente o incorrecto**
El agente toma decisiones basándose en lo que infiere del repo. Repos con deuda técnica tienen convenciones inconsistentes y decisiones de arquitectura nunca documentadas. El agente puede inferir un patrón incorrecto de código legacy y perpetuarlo. El balance entre asumir y preguntar es un problema no resuelto: un agente que asume demasiado genera código incorrecto; uno que pregunta demasiado es inutilizable.

**🔴 Output no determinista del LLM**
Claude puede generar código excelente en una tarea y mediocre en la siguiente tarea idéntica. No hay garantía de consistencia entre llamadas. Esto afecta a la calidad de proposals y designs, la coherencia del código entre tasks del mismo issue y la fiabilidad del sistema de aprendizaje.
Mitigación: diseño cuidadoso del sistema de prompts y pipeline de verificación del output.

**🔴 Capacidad de ejecución con recursos limitados**
El sistema diseñado en esta proposal es de alta complejidad. Con tiempo limitado y sin equipo, el riesgo real es tardar 18-24 meses en tener algo instalable en producción, perder el foco construyendo partes no prioritarias, o que el mercado se mueva mientras se construye.
Mitigación: el MVP debe ser brutalmente más pequeño que la proposal completa. La pregunta correcta en cada iteración es qué es lo mínimo que se puede poner delante de un cliente real en 4-6 semanas.

**🟠 Grafo de dependencias entre tasks frágil**
Una task puede modificar un archivo que otra task también necesita modificar generando conflictos de merge. El agente puede no detectar dependencias implícitas ejecutando tasks en orden incorrecto. En repos grandes la detección de conflictos potenciales es computacionalmente costosa. Es esencialmente un problema de control de concurrencia aplicado a código fuente.

**🟠 Degradación de la memoria**
La memoria es el moat del producto pero también su punto de fallo más complejo. Riesgos concretos: memorias contradictorias cuando el equipo cambia de tecnología, memorias incorrectas reforzadas durante meses, envenenamiento por PRs con patrones incorrectos, y drift de contexto cuando el repo evoluciona rápido. No hay solución estándar hoy para invalidar conocimiento previo cuando el contexto cambia.

**🟠 CI/CD más complejo de lo esperado**
Los logs de CI son enormes y ruidosos. Hay errores que no son del código del agente (flaky tests, timeouts de infraestructura, dependencias externas caídas). El agente puede entrar en un loop de correcciones que nunca converge. Distintos equipos tienen pipelines completamente distintos.
Mitigación: distinguir errores corregibles por el agente de errores del entorno, y tener límites explícitos de intentos.

**🟠 Slack multi-turno con estado persistente**
Gestionar estado de conversación multi-turno con múltiples usuarios concurrentes, persistiendo contexto entre mensajes que pueden llegar con horas o días de diferencia. Incluye distinguir mensajes dirigidos al agente de conversaciones del equipo en el mismo canal, y gestionar timeouts cuando un stakeholder tarda días en responder.

**🟠 Intake de lenguaje natural impreciso**
Los mensajes pueden ser ambiguos, incompletos o incorrectos. El stakeholder puede cambiar de opinión a mitad de la clarificación. El agente puede malinterpretar urgencia o prioridad, o ejecutar peticiones que no debería (demasiado arriesgadas, fuera de scope). Los falsos positivos (ejecutar lo que no se pidió) son más dañinos que los falsos negativos (pedir más clarificación).

**🟡 Onboarding real vs. onboarding diseñado**
Las GitHub Apps tienen un proceso de aprobación de permisos que asusta a los equipos de seguridad. La API de Jira es compleja con múltiples versiones. Los permisos de Slack en organizaciones grandes requieren aprobación del admin. Cada empresa tiene su propia estructura de branches y workflows de PR. El tiempo de onboarding real puede ser de días, no minutos, lo que impacta directamente en la conversión.

---

*Propuesta generada con SDD Agent — versión 0.3*
