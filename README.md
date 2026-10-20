# GMockup

Visor 3D de tu polo, con color configurable y un estampado PNG en pecho o espalda. Funciona localmente y se puede publicar en DigitalOcean.

## Abrir

Con Node.js instalado, abre una terminal en esta carpeta y ejecuta:

```powershell
npm start
```

Visita http://127.0.0.1:4173. También puedes hacer doble clic en `Iniciar GMockup.cmd`. Mantén la terminal abierta mientras usas el visor. Para detenerlo, presiona Ctrl+C.

Requiere Node.js 22 o 24. Al clonar el repositorio, ejecuta `npm ci` una vez antes de iniciarlo. Después funciona sin conexión a Internet.

## Uso

- Arrastra sobre el polo para girarlo; usa la rueda para acercar o alejar. En pantallas táctiles, arrastra con un dedo y pellizca para hacer zoom.
- Selecciona un color de tela o usa el selector personalizado.
- Carga o arrastra un PNG de hasta 20 MB, preferentemente con fondo transparente.
- Elige pecho o espalda y ajusta ancho, posición y giro. Se muestra un estampado por vez.
- Usa Guardar imagen para descargar la vista actual como PNG con fondo transparente.

La posición y el diseño se conservan mientras la página está abierta. Recargar restablece el polo blanco. Los archivos cargados se procesan en el navegador y no se envían a un servidor ni se guardan en el proyecto.

## Archivos necesarios

El visor usa solamente estos archivos de tu modelo, además del código y Three.js:

| Archivo | Función |
| --- | --- |
| `public/assets/polo.glb` | Geometría, coordenadas UV y material base. 4,9 MB. |
| `public/assets/tela-normal.png` | Detalles visuales de tela y costuras. 2,6 MB. |

Los originales de `OBJ/`, `TEXTURE/` y `UVMAP/` se conservan como respaldo fuera de este repositorio. No se solicitan al abrir la página. Los dos archivos optimizados sí están incluidos en Git; no necesitas Git LFS.

El archivo MTL original no referencia texturas. Sus materiales se reemplazaron por un material de tela ajustable. No usamos el diffuse original porque el color se controla desde la aplicación; metalness, displacement, roughness y opacity no son necesarios para esta versión.

`public/assets/demo.png` es un estampado de prueba opcional. `model-info.json` contiene las métricas de conversión; tampoco es necesario para mostrar el polo.

## Regenerar el modelo

El repositorio incluye el modelo listo para usar: no ejecutes este paso al desplegar. Para regenerarlo, coloca los originales en `OBJ/` y `UVMAP/` dentro de la carpeta del proyecto (Git los ignora) y ejecuta:

```powershell
npm run prepare-model
```

El proceso convierte el OBJ a GLB y reduce de 831 114 a 182 638 triángulos, con tolerancia de simplificación de 0,001. No modifica el OBJ. El mapa de normales se reduce de 4096 a 2048 píxeles.

El estampado se proyecta sobre el modelo y conserva la transparencia y sus colores independientemente del color del polo. Es una previsualización: la proyección puede distorsionarse al acercarse a los costados o pliegues pronunciados; no produce moldes ni medidas de impresión. Los porcentajes de posición y ancho usan la altura del modelo como referencia.

## Validación

Verificado en el navegador: carga del modelo y mapa de normales, cambio de color, PNG transparente, pecho/espalda, ancho y giro, descarga PNG. Sin errores de consola durante estas pruebas. Dependencias instaladas sin vulnerabilidades reportadas por npm audit al preparar el proyecto.

Sin variables de entorno, el servidor escucha solo en `127.0.0.1:4173`. Al definir `PORT`, escucha en `0.0.0.0` para aceptar conexiones en el entorno de alojamiento; `HOST` permite cambiarlo explícitamente. Sirve `public/` y la biblioteca Three.js, sin exponer los originales ni permitir subir archivos al disco.

## Publicar en DigitalOcean App Platform

1. En DigitalOcean, selecciona **Create App**, conecta GitHub y elige `joserosales2015/GMockup`, rama `main`.
2. Usa el `Dockerfile` de la raíz como origen de compilación. La configuración de referencia está en `.do/app.yaml`.
3. Configura el puerto HTTP **8080** y el chequeo de salud en **/healthz**. El contenedor ya define `PORT=8080` y `HOST=0.0.0.0`.
4. Elige el tamaño de instancia y revisa el precio que muestre DigitalOcean antes de crear la aplicación.
5. Despliega. Si activas el despliegue automático, cada push a `main` actualizará la aplicación.

No requiere base de datos, almacenamiento adicional ni secretos. La publicación del visor permite descargar los recursos del polo que necesita el navegador. Los PNG de los visitantes se siguen procesando únicamente en su navegador.

Documentación oficial: https://docs.digitalocean.com/products/app-platform/how-to/create-apps/

## Comprobar el servidor

```powershell
npm test
```

Comprueba el puerto asignado por entorno, `/healthz`, los recursos del visor y el bloqueo de rutas privadas. Para probar el contenedor cuando tengas Docker instalado:

```powershell
docker build -t gmockup .
docker run --rm -p 4173:8080 gmockup
```
