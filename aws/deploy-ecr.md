# Despliegue de Backend en AWS ECR + ECS

Esta guía documenta los comandos necesarios para construir la imagen Docker de tu backend en Node.js y subirla a Amazon Elastic Container Registry (ECR). Una vez en ECR, Amazon ECS la tomará automáticamente.

## Datos de tu Repositorio
* **Región:** `us-east-1`
* **URI del Repositorio:** `569345298753.dkr.ecr.us-east-1.amazonaws.com/scrum-backend`

## Prerrequisitos
1. Tener [Docker](https://www.docker.com/) instalado y ejecutándose en tu máquina.
2. Tener configuradas tus credenciales (Access Key y Secret Access Key que creaste en el Paso 1).
3. Haber instalado el AWS CLI.

---

## Comandos de Despliegue

Abre una terminal en la carpeta `scrum-backend` y ejecuta los siguientes comandos uno por uno:

### 1. Iniciar sesión en Docker a través de AWS (Login)
Este comando usa tus credenciales de AWS para decirle a Docker que tiene permiso de subir cosas a tu cuenta privada.

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 569345298753.dkr.ecr.us-east-1.amazonaws.com
```

### 2. Construir la Imagen (Build)
Esto lee tu archivo `Dockerfile` y empaqueta todo tu código backend. *(Nota: no olvides el punto `.` al final).*

```bash
docker build -t scrum-backend .
```

### 3. Etiquetar la Imagen (Tag)
Esto le pone una "etiqueta" a la imagen que acabas de crear para que coincida con la ruta de tu repositorio en la nube.

```bash
docker tag scrum-backend:latest 569345298753.dkr.ecr.us-east-1.amazonaws.com/scrum-backend:latest
```

### 4. Empujar la Imagen a AWS (Push)
Este es el paso final. Sube tu imagen empaquetada a los servidores de Amazon ECR. Dependiendo de tu internet, puede tardar un par de minutos.

```bash
docker push 569345298753.dkr.ecr.us-east-1.amazonaws.com/scrum-backend:latest
```

¡Listo! Una vez que termine de subir, tu nuevo código del backend estará seguro en la nube.
