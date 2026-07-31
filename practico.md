

**Práctico de ECS en AWS**

*Teracloud Internship Program 2.0*

# **Objetivo general**

El objetivo de este práctico es aplicar conceptos de redes, subnetting y despliegue de aplicaciones en contenedores sobre ECS con instancias EC2.

Al finalizar, deberás haber implementado una infraestructura en AWS con una VPC, que aloje una aplicación distribuida (frontend PHP \+ base de datos MySQL) desplegada en ECS, accesible desde Internet mediante HTTPS a través de un Application Load Balancer (ALB).

# **Descripción general de la arquitectura**

* VPC (vpc-lab): aloja el cluster de ECS, donde van a correr el frontend PHP y la DB MySQL  
* Load Balancer para la exposición de la aplicación por HTTPS.  
* No debe haber NAT Gateways desplegados en el VPC.  
* Tanto el cluster de ECS como el Load Balancer deben estar en subnets públicas con IPs publicas asignadas.

# **Requerimientos técnicos**

La arquitectura debe incluir:

* Una única VPC (vpc-lab-ecs) en una región de AWS.  
* 2 subnets públicas (para el ALB y cluster de ECS)  
* Un Application Load Balancer (ALB) con listener HTTPS.  
* Un Cluster ECS (EC2 mode) con las instancias EC2 que ejecutarán las tareas:  
  * Servicio 1: contenedor frontend PHP (aplicación web).  
  * Servicio 2: contenedor MySQL (base de datos).
* Imagen ECS optimized para instancias EC2: ami-0ae02ac5c05343975 DISPONIBLE EN US-EAST-1

El tráfico público llega al ALB (HTTPS), que reenvía las solicitudes al servicio de frontend, el cual se comunica internamente con la base de datos.

# **Despliegue de la aplicación**

### **🔹 Creación del cluster**

* Crear un **Cluster ECS** seleccionando el tipo **EC2 Linux \+ Networking**.  
* Durante la configuración:  
  * Seleccionar la **VPC** y las **subnets públicas**.  
  * Habilitar la **creación automática de instancias EC2** para el cluster (o lanzarlas manualmente con el agente ECS preinstalado).  
  * Asignar una **IAM Role** con permisos para ECS, EC2 y CloudWatch Logs.

    

### **🔹 Instancias EC2 del cluster**

* Las instancias EC2 deben:  
  * Estar en subnets públicas.  
  * Tener **IP pública** asignada automáticamente.  
  * Correr el **ECS Agent** registrado al cluster.

# **Despliegue de servicios ECS**

### Task Definitions

#### 1. Task Definition: mysql-task

| Campo | Valor |
|-------|-------|
| Imagen | `maurorosalestc/mysql-clase:latest` |
| Puerto | 3306 |
| CPU / Memoria | 256 / 512 |

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

Variables de entorno:

| Variable | Valor |
|----------|-------|
| `MYSQL_HOST` | (IP privada del servicio MySQL o DNS de Service Discovery/connect si te animas) |
| `MYSQL_DATABASE` | midb |
| `MYSQL_USER` | usuario |
| `MYSQL_PASSWORD` | clave123 |

### **🧠 ECS Services**

* Crear dos **servicios ECS** dentro del cluster:  
  * frontend-service → en subnets públicas, con acceso restringido por SG.  
  * mysql-service → también en subnets públicas, con acceso restringido por SG.  
* Asociar el **Load Balancer** creado previamente con el target group vacío (sin instancias asociadas, ECS se encarga de asociar las instancias creadas por el cluster) y los listeners correspondientes.

# **Seguridad y conectividad**

Aplicar el principio de mínimo privilegio mediante Security Groups (SG):

* Solo el Load Balancer debe recibir tráfico público (puerto 443).  
* El frontend acepta tráfico HTTP únicamente desde el Load Balancer.  
* La base de datos acepta tráfico en el puerto 3306 solo desde el frontend.  
* SSH debe ser a través de Systems Manager Session Manager (SSM).

# **Validaciones**

Verificar que:

* El ALB responde correctamente en **HTTPS**.

* El servicio frontend PHP funciona y se comunica con el servicio MySQL.

* Las tareas ECS están corriendo en las subnets públicas y son alcanzables internamente.

* No se usa NAT Gateway y las instancias ECS tienen IP pública funcional.

* El tráfico público fluye sólo a través del ALB.

# **Entregables**

Cada participante deberá entregar:

* Diagrama de red con VPCs, subnets, SGs, NACLs y Load Balancer.  
* Capturas de pantalla de:  
  * Subnets  
  * route tables  
  * listener HTTPS  
  * aplicación funcionando  
  * Cluster ECS  
  * Task definitions  
  * Servicios  
* Descripción breve del diseño y de las decisiones tomadas (ruteo, seguridad, estructura de subnets, etc.).  
* Dockerfiles en caso de corresponder (si armaron imágenes custom), y variables de entorno utilizadas en cada servicio.