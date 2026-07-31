FROM mysql:8.0

# Las variables de entorno se pasan al correr el container:
#   MYSQL_ROOT_PASSWORD  - contraseña del usuario root
#   MYSQL_DATABASE       - base de datos que se crea automáticamente
#   MYSQL_USER           - usuario adicional que se crea
#   MYSQL_PASSWORD       - contraseña del usuario adicional

# Exponer el puerto por defecto de MySQL
EXPOSE 3306
