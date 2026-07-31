# Inter Lab - App Web + MySQL con Docker

Este proyecto contiene dos imágenes Docker:

1. **mysql-clase** — Base de datos MySQL que se autoconfigura con variables de entorno.
2. **app-clase** — App web (Node.js) que se conecta a la base de datos y permite crear y listar notas.

## Variables de entorno

Ambos containers comparten las mismas variables para conectarse entre sí:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `MYSQL_ROOT_PASSWORD` | Contraseña del usuario root (solo MySQL) | `rootpass` |
| `MYSQL_DATABASE` | Nombre de la base de datos a crear/usar | `midb` |
| `MYSQL_USER` | Usuario de la base de datos | `usuario` |
| `MYSQL_PASSWORD` | Contraseña del usuario | `clave123` |
| `MYSQL_HOST` | Host donde está MySQL (solo App) | `host.docker.internal` |

## Orden de ejecución

### Paso 1 — Levantar MySQL

```bash
docker run -d --name mysqldb \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=midb \
  -e MYSQL_USER=usuario \
  -e MYSQL_PASSWORD=clave123 \
  maurorosalestc/mysql-clase:latest
```

Esperar unos segundos a que MySQL termine de inicializar.

### Paso 2 — Levantar la App

```bash
docker run -d --name mywebapp \
  -p 3000:3000 \
  -e MYSQL_HOST=host.docker.internal \
  -e MYSQL_DATABASE=midb \
  -e MYSQL_USER=usuario \
  -e MYSQL_PASSWORD=clave123 \
  maurorosalestc/app-clase:latest
```

> **Importante:** Las variables `MYSQL_DATABASE`, `MYSQL_USER` y `MYSQL_PASSWORD` deben tener los mismos valores en ambos containers.

### Paso 3 — Usar la app

Abrir en el navegador: http://localhost:3000

Desde ahí se pueden crear notas que se almacenan en la base de datos MySQL.

## Verificar datos en MySQL

Para conectarse a la base de datos y ver las notas guardadas:

```bash
docker exec -it mysqldb mysql -u usuario -pclave123 midb -e "SELECT * FROM notas;"
```

Otros comandos útiles:

```bash
# Ver tablas
docker exec -it mysqldb mysql -u usuario -pclave123 midb -e "SHOW TABLES;"

# Ver estructura de la tabla notas
docker exec -it mysqldb mysql -u usuario -pclave123 midb -e "DESCRIBE notas;"
```

## Detener y eliminar los containers

```bash
docker rm -f mysqldb mywebapp
```

## Nota sobre MYSQL_HOST

La variable `MYSQL_HOST` en la app indica dónde encontrar MySQL:

- `host.docker.internal` — Cuando ambos containers se corren por separado con Docker Desktop (Mac/Windows).
- `mysql` — Cuando se usa `docker compose` (los containers se comunican por nombre de servicio).
- `localhost` — Solo funciona si la app corre con `--network host`.


---

## Despliegue en AWS ECS

### Arquitectura

```
Internet → ALB (puerto 80) → app-service (puerto 3000) → mysql-service (puerto 3306)
```

- **app-service** — Corre en subnets públicas, detrás de un Application Load Balancer.
- **mysql-service** — Corre en subnets públicas, accesible solo desde la app via Security Group.

### Prerequisitos

- Un cluster ECS creado (Fargate).
- Una VPC con al menos 2 subnets públicas.
- Un Application Load Balancer (ALB) con un Target Group vacío (puerto 3000, tipo IP).
- Dos Security Groups:
  - **sg-app**: permite tráfico entrante en puerto 3000 desde el ALB.
  - **sg-mysql**: permite tráfico entrante en puerto 3306 solo desde sg-app.

### Task Definitions

#### 1. Task Definition: mysql-task

| Campo | Valor |
|-------|-------|
| Imagen | `maurorosalestc/mysql-clase:latest` |
| Puerto | 3306 |
| CPU / Memoria | 256 / 512 |
| Compatibilidad | Fargate |

Variables de entorno:

| Variable | Valor |
|----------|-------|
| `MYSQL_ROOT_PASSWORD` | (elegir) |
| `MYSQL_DATABASE` | midb |
| `MYSQL_USER` | usuario |
| `MYSQL_PASSWORD` | clave123 |

#### 2. Task Definition: app-task

| Campo | Valor |
|-------|-------|
| Imagen | `maurorosalestc/app-clase:latest` |
| Puerto | 3000 |
| CPU / Memoria | 256 / 512 |
| Compatibilidad | Fargate |

Variables de entorno:

| Variable | Valor |
|----------|-------|
| `MYSQL_HOST` | (IP privada del servicio MySQL o DNS de Service Discovery) |
| `MYSQL_DATABASE` | midb |
| `MYSQL_USER` | usuario |
| `MYSQL_PASSWORD` | clave123 |

### ECS Services

#### 1. mysql-service

- Task Definition: `mysql-task`
- Desired count: 1
- Subnets: públicas
- Security Group: `sg-mysql`
- Service Discovery: habilitar con namespace privado (ej: `mysql-service.local`)

#### 2. app-service

- Task Definition: `app-task`
- Desired count: 1 (o más)
- Subnets: públicas
- Security Group: `sg-app`
- Load Balancer: asociar al ALB creado previamente con el Target Group (puerto 3000)

### Conexión entre servicios

Para que la app encuentre MySQL en ECS hay dos opciones:

**Opción A — Service Discovery (recomendado):**

Habilitar Cloud Map en el servicio MySQL. Esto crea un registro DNS privado (ej: `mysql-service.local`). En la Task Definition de la app, usar:

```
MYSQL_HOST = mysql-service.local
```

**Opción B — IP privada manual:**

Obtener la IP privada de la task MySQL desde la consola ECS y setearla como `MYSQL_HOST`. No recomendado porque la IP cambia si la task se reinicia.

### Orden de despliegue

1. Crear el cluster ECS.
2. Crear los Security Groups (sg-app y sg-mysql).
3. Crear el ALB + Target Group + Listener (puerto 80 → Target Group puerto 3000).
4. Crear y desplegar `mysql-service` (esperar que esté healthy).
5. Crear y desplegar `app-service` asociado al ALB.
6. Acceder a la app via el DNS del ALB.

### Verificación

Una vez desplegado, acceder al DNS del ALB en el navegador. Deberían ver la app de notas funcionando y guardando datos en la base MySQL del otro servicio.
